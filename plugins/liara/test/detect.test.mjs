import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '../lib/detect.mjs';
import { listSourceFiles } from '../lib/archive.mjs';

const fx = (n) => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', n);
const scan = (n) => detectProject(fx(n), { checkDns: false });
const svc = (r, id) => r.services.find((s) => s.id === id);

test('FastAPI + Atlas + local redis + AI proxy', async () => {
  const r = await scan('fastapi-atlas');
  assert.equal(r.platform, 'python');
  assert.equal(r.port, 80, 'Liara python platform');
  assert.ok(r.warnings.some((w) => /listens on port 8000 \(main\.py\), but Liara's python platform needs port 80/.test(w)), r.warnings.join(' | '));
  assert.equal(svc(r, 'database:mongodb').recommendation, 'ask-to-migrate');
  assert.match(svc(r, 'database:mongodb').providers[0], /MongoDB Atlas/);
  assert.equal(svc(r, 'database:redis').recommendation, 'auto-connect');
  assert.match(svc(r, 'ai').providers[0], /Iranian OpenAI proxy/);
});

test('Django + SQLite asks about disk vs Postgres', async () => {
  const r = await scan('django-sqlite');
  assert.equal(r.platform, 'django');
  assert.equal(r.port, 80);
  assert.equal(svc(r, 'database:sqlite').recommendation, 'ask');
  assert.ok(r.warnings.some((w) => /MEDIA_ROOT/.test(w)));
});

test('Express reads port from code and needs Mongo + SMTP', async () => {
  const r = await scan('express-plain');
  assert.equal(r.platform, 'node');
  assert.equal(r.port, 4000);
  assert.equal(svc(r, 'database:mongodb').status, 'not-configured');
  assert.ok(svc(r, 'database:mongodb').envKeys.includes('MONGO_URL'));
  assert.equal(svc(r, 'email').recommendation, 'auto-connect');
});

test('Laravel local services are auto-connect, storage via flysystem', async () => {
  const r = await scan('laravel-local');
  assert.equal(r.platform, 'laravel');
  for (const id of ['database:mysql', 'database:redis', 'email', 'storage']) assert.equal(svc(r, id).recommendation, 'auto-connect', id);
});

test('archive skips real env files but keeps examples', () => {
  const { files } = listSourceFiles(fx('next-supabase'), { platform: 'next' });
  assert.ok(files.includes('.env.example'));
  assert.ok(files.includes('package.json'));
  assert.ok(!files.some((f) => /\.env\.production$/.test(f)));
});

test('ClickHouse Cloud and CloudAMQP in production are asked about, not switched', async () => {
  const r = await scan('node-clickhouse');
  assert.equal(r.port, 3000);
  const ch = svc(r, 'database:clickhouse');
  assert.equal(ch.recommendation, 'ask-to-migrate');
  assert.match(ch.providers[0], /ClickHouse Cloud/);
  assert.match(ch.liaraEquivalent, /clickhouse/);
  assert.match(svc(r, 'database:rabbitmq').providers[0], /CloudAMQP/);
});

test('Python ClickHouse, Elasticsearch and RabbitMQ clients are found', async () => {
  const r = await scan('py-analytics');
  for (const id of ['database:clickhouse', 'database:elasticsearch', 'database:rabbitmq']) {
    assert.ok(svc(r, id), `${id} missing; found ${r.services.map((s) => s.id).join(', ')}`);
    assert.equal(svc(r, id).recommendation, 'auto-connect', id);
  }
  assert.ok(svc(r, 'database:clickhouse').envKeys.includes('CLICKHOUSE_PORT'));
});

test('tests, fixtures and tool settings are not part of the app', async () => {
  const r = await scan('express-s3-memory');
  assert.equal(r.port, 3000, 'port from the app, not from a fixture');
  assert.ok(svc(r, 'database:postgres'));
  assert.ok(svc(r, 'storage'));
  assert.equal(svc(r, 'database:mongodb'), undefined, 'fixture app ignored');
  for (const k of ['FIXTURE_MONGO_URL', 'TEST_ONLY_SECRET', 'LIARA_API_TOKEN']) assert.ok(!r.missingEnvKeys.includes(k), k);
  assert.ok(!r.otherApis.some((o) => /liara/i.test(o.name)), 'Liara is not an "other API"');
  assert.ok(!r.warnings.some((w) => /local disk|SQLite/.test(w)), r.warnings.join(' | '));
});

test('a folder with several apps says so instead of guessing', async () => {
  const r = await scan('multi-project');
  assert.equal(r.rootIsProject, false);
  assert.deepEqual(r.subprojects, ['api', 'web']);
  assert.match(r.warnings[0], /No app at the top of this folder, but 2 separate projects inside: api, web/);
  assert.ok(!r.warnings.some((w) => /Dockerfile will be needed/.test(w)));
});

test('multer writing to disk is still flagged', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-multer-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'up', scripts: { start: 'node index.js' }, dependencies: { express: '4', multer: '1' } }));
  fs.writeFileSync(path.join(dir, 'index.js'), "const multer = require('multer');\nconst upload = multer({ dest: 'uploads/' });\nrequire('express')().listen(3000);\n");
  const r = await detectProject(dir, { checkDns: false });
  assert.ok(r.warnings.some((w) => /writes uploaded files to local disk \(index\.js\)/.test(w)), r.warnings.join(' | '));
});

test('deep analysis: runtime, package manager, commands, background work, health, tests, binding', async () => {
  const r = await scan('node-full');
  assert.equal(r.platform, 'node');
  assert.deepEqual([r.runtime.runtime, r.runtime.version, r.runtime.source, r.runtime.status], ['node', '20', 'package.json engines.node', 'supported']);
  assert.deepEqual(r.packageManager, { name: 'pnpm', lockfile: 'pnpm-lock.yaml' });
  assert.equal(r.commands.start, 'pnpm start');
  assert.equal(r.commands.build, 'pnpm run build');
  assert.equal(r.entryPoint, 'src/server.js');
  assert.deepEqual(r.healthEndpoints.map((h) => h.path), ['/healthz']);
  assert.deepEqual(r.tests, [{ command: 'pnpm test', framework: 'jest' }]);
  assert.deepEqual(r.background.queues, ['bullmq']);
  assert.deepEqual(r.background.cron, ['node-cron']);
  assert.deepEqual(r.background.realtime, ['socket.io']);
  assert.deepEqual(r.background.workers, ['Procfile worker: node src/worker.js']);
  assert.deepEqual(r.localOnlyBinding, ['src/server.js']);
  assert.ok(r.warnings.some((w) => /only listens on localhost in src\/server\.js/.test(w)));
  assert.ok(r.warnings.some((w) => /one process per app/.test(w)));
});

test('Next.js uses Liara\'s "next" platform and flags an unsupported Node version', async () => {
  const r = await scan('next-health');
  assert.equal(r.platform, 'next');
  assert.equal(r.port, 3000);
  assert.deepEqual(r.healthEndpoints.map((h) => h.path), ['/api/health']);
  assert.equal(r.runtime.status, 'NOT supported by Liara');
  assert.ok(r.warnings.some((w) => /node 12 \(package\.json engines\.node\) is not a version Liara supports \(20, 22, 24\)/.test(w)), r.warnings.join(' | '));
});
