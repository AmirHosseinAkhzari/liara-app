// Data copy helpers: source detection from env files, and the ClickHouse copy script
// run for real (curl + sed) against two fake ClickHouse HTTP servers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { sourceInfo, clickhouseHttp, pipeline } from '../lib/migrate.mjs';
import { fillKeys, defaultKeys } from '../lib/envmap.mjs';

function envDir(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-migrate-'));
  fs.writeFileSync(path.join(dir, '.env.production'), content);
  return dir;
}

test('finds a ClickHouse Cloud source from separate env keys', () => {
  const root = envDir('CLICKHOUSE_HOST=https://abc.eu-central-1.aws.clickhouse.cloud:8443\nCLICKHOUSE_USER=default\nCLICKHOUSE_PASSWORD=p@ss:word\nCLICKHOUSE_DATABASE=analytics\n');
  const src = sourceInfo({ root, sourceEnvFile: '.env.production' });
  assert.equal(src.engine, 'clickhouse');
  const ch = clickhouseHttp(src.url);
  assert.deepEqual(ch, { base: 'https://abc.eu-central-1.aws.clickhouse.cloud:8443', auth: 'default:p@ss:word', db: 'analytics' });
});

test('native ClickHouse URLs map to the HTTP port', () => {
  assert.equal(clickhouseHttp('clickhouse://u:p@ch.example.com:9440/db').base, 'https://ch.example.com:8443');
  assert.equal(clickhouseHttp('clickhouse://u:p@ch.example.com:9000/db').base, 'http://ch.example.com:8123');
});

test('finds an Elasticsearch source and a Postgres one ahead of it', () => {
  const es = sourceInfo({ root: envDir('ELASTICSEARCH_NODE=https://es.example.com:9243\nELASTIC_PASSWORD=secret\n'), sourceEnvFile: '.env.production' });
  assert.equal(es.engine, 'elasticsearch');
  assert.equal(es.url, 'https://elastic:secret@es.example.com:9243/');
  const pg = sourceInfo({ root: envDir('DATABASE_URL=postgresql://u:p@db.example.com:5432/app\nELASTICSEARCH_URL=http://es:9200\n'), sourceEnvFile: '.env.production' });
  assert.equal(pg.engine, 'postgres');
});

test('Liara ClickHouse env vars follow the Liara docs', () => {
  const creds = { engine: 'clickhouse', host: 'rainier.liara.cloud', port: 33273, user: 'root', password: 'pw', name: 'default' };
  const keys = defaultKeys('database', { engine: 'clickhouse' });
  assert.deepEqual(fillKeys('database', keys, creds).vars, { CLICKHOUSE_HOST: 'http://rainier.liara.cloud:33273', CLICKHOUSE_USER: 'root', CLICKHOUSE_PASSWORD: 'pw' });
  // clickhouse-connect style apps keep host and port apart
  const split = fillKeys('database', ['CLICKHOUSE_HOST', 'CLICKHOUSE_PORT'], creds).vars;
  assert.deepEqual(split, { CLICKHOUSE_HOST: 'rainier.liara.cloud', CLICKHOUSE_PORT: '33273' });
});

// A tiny ClickHouse HTTP endpoint: answers the queries the copy script sends and records writes.
function fakeClickhouse({ auth, tables = {} }) {
  const seen = { ddl: [], inserts: {}, databases: [] };
  const server = http.createServer(async (req, res) => {
    const want = `Basic ${Buffer.from(auth).toString('base64')}`;
    if (req.headers.authorization !== want) { res.writeHead(401); res.end('auth failed'); return; }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const text = body.toString('latin1');
    const reply = (s) => { res.writeHead(200); res.end(s); };
    if (text.startsWith('CREATE DATABASE')) { seen.databases.push(text.trim()); return reply(''); }
    if (text.startsWith('SELECT name FROM system.tables')) return reply(Object.keys(tables).map((t) => `${t}\n`).join(''));
    let m = /^SHOW CREATE TABLE `[^`]+`\.`([^`]+)`/.exec(text);
    if (m) return reply(tables[m[1]].ddl);
    if (text.startsWith('CREATE TABLE')) { seen.ddl.push(text.trim()); return reply(''); }
    m = /^SELECT \* FROM `[^`]+`\.`([^`]+)` FORMAT Native/.exec(text);
    if (m) return reply(tables[m[1]].rows);
    m = /^INSERT INTO `([^`]+)`\.`([^`]+)` FORMAT Native\n/.exec(text);
    if (m) { seen.inserts[`${m[1]}.${m[2]}`] = body.subarray(m[0].length); return reply(''); }
    res.writeHead(400);
    res.end(`unexpected query: ${text.slice(0, 80)}`);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, seen, base: `http://127.0.0.1:${server.address().port}` })));
}

function runScript(script, env) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-o', 'pipefail', '-c', script], { env: { ...process.env, ...env } });
    let out = ''; let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

test('ClickHouse copy recreates tables with plain engines and streams the rows', async () => {
  const rows = Buffer.from([0, 1, 2, 255, 10, 13, 0x60]); // binary, incl. newline and backtick bytes
  const src = await fakeClickhouse({
    auth: 'default:p@ss:word',
    tables: {
      events: { ddl: "CREATE TABLE analytics.events\n(\n    `id` UInt64\n)\nENGINE = SharedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')\nORDER BY id\n", rows },
      users: { ddl: "CREATE TABLE analytics.users\n(\n    `id` UInt64,\n    `v` UInt32\n)\nENGINE = ReplicatedReplacingMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}', v)\nORDER BY id\n", rows: Buffer.from('u') },
    },
  });
  const dst = await fakeClickhouse({ auth: 'root:liara-pw' });
  try {
    const res = await runScript(pipeline('clickhouse').cmd, {
      SRC_HTTP: src.base, SRC_AUTH: 'default:p@ss:word', SRC_DB: 'analytics',
      DST_HTTP: dst.base, DST_AUTH: 'root:liara-pw', DST_DB: 'analytics',
    });
    assert.equal(res.code, 0, res.err);
    assert.match(res.out, /tables copied: 2/);
    assert.deepEqual(dst.seen.databases, ['CREATE DATABASE IF NOT EXISTS `analytics`']);
    assert.match(dst.seen.ddl[0], /^CREATE TABLE IF NOT EXISTS `analytics`\.`events`\n/);
    assert.match(dst.seen.ddl[0], /ENGINE = MergeTree\(\)\nORDER BY id/);
    assert.match(dst.seen.ddl[1], /ENGINE = ReplacingMergeTree\(v\)/);
    assert.deepEqual(dst.seen.inserts['analytics.events'], rows);
    assert.equal(dst.seen.inserts['analytics.users'].toString(), 'u');
  } finally {
    src.server.close();
    dst.server.close();
  }
});

test('ClickHouse copy fails loudly when the source rejects the login', async () => {
  const src = await fakeClickhouse({ auth: 'default:right' });
  const dst = await fakeClickhouse({ auth: 'root:pw' });
  try {
    const res = await runScript(pipeline('clickhouse').cmd, {
      SRC_HTTP: src.base, SRC_AUTH: 'default:wrong', SRC_DB: 'analytics',
      DST_HTTP: dst.base, DST_AUTH: 'root:pw', DST_DB: 'analytics',
    });
    assert.notEqual(res.code, 0);
    assert.match(res.err, /could not list tables/);
  } finally {
    src.server.close();
    dst.server.close();
  }
});
