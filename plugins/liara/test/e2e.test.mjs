// Full flow against the mock Liara API: node --test test/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (n) => path.join(here, 'fixtures', n);
let mock; let callTool; let workdir;

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  process.env.LIARA_AUTH_FILE = path.join(os.tmpdir(), 'liara-e2e-no-auth.json');
  ({ callTool } = await import('../lib/tools.mjs'));
  // copy the fixture so liara.json writes don't touch the repo
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-e2e-'));
  fs.cpSync(fixture('next-supabase'), workdir, { recursive: true });
});
after(async () => {
  await mock.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});

test('whoami does not leak storage secrets', async () => {
  const r = await callTool('whoami');
  assert.equal(r.user.email, 't@example.com');
  assert.ok(!JSON.stringify(r).includes('should-not-leak'));
});

test('plans hides unavailable plans', async () => {
  const r = await callTool('plans');
  assert.ok(r.apps['small-g2']);
  assert.ok(!r.apps.old);
});

test('scan finds every service and never returns secret values', async () => {
  const r = await callTool('scan_project', { path: workdir, checkDns: false });
  const kinds = r.services.map((s) => s.id).sort();
  assert.deepEqual(kinds, ['ai', 'database:postgres', 'dns', 'email', 'storage']);
  for (const s of r.services) assert.equal(s.recommendation, 'ask-to-migrate', s.id);
  assert.equal(r.platform, 'nextjs');
  const text = JSON.stringify(r);
  for (const secret of ['secretpw', 'sk-proj-realkeyvalue123', 'supersecret', 'sk_live_abc', 're_123456']) assert.ok(!text.includes(secret), secret);
  assert.ok(r.otherApis.some((o) => o.name === 'Stripe'));
});

test('create app, connect services, copy secrets, deploy', async () => {
  const app = 'shop-web';
  const created = await callTool('create_app', { app, platform: 'nextjs', planID: 'small-g2' });
  assert.equal(created.created, true);

  const scan = await callTool('scan_project', { path: workdir, checkDns: false });
  const keysOf = (id) => scan.services.find((s) => s.id === id).envKeys;

  const db = await callTool('connect_database', { app, platform: 'nextjs', create: { type: 'postgres', hostname: 'shop-db', planID: 'db-small', version: '17' }, envKeys: keysOf('database:postgres') });
  assert.deepEqual(Object.keys(db.envVars).sort(), ['DATABASE_URL', 'DIRECT_URL']);
  assert.ok(!JSON.stringify(db).includes('p@ss/word'), 'db password masked');

  const st = await callTool('connect_storage', { app, bucket: 'shop-media', create: { plan: 'storage-20', permission: 'private' }, envKeys: keysOf('storage') });
  assert.deepEqual(Object.keys(st.envVars).sort(), ['S3_ACCESS_KEY_ID', 'S3_BUCKET', 'S3_ENDPOINT', 'S3_SECRET_ACCESS_KEY']);

  const ai = await callTool('connect_ai', { app, workspace: 'shop', envKeys: keysOf('ai') });
  assert.ok(ai.envVars.OPENAI_BASE_URL.startsWith('https://ai.liara.ir/api/ws'));

  const mail = await callTool('connect_mail', { app, domain: 'example.com', plan: 'mail-free', mode: 'LIVE', account: 'noreply', addDnsRecords: false });
  assert.equal(mail.envVars.SMTP_HOST, 'smtp.c1.liara.email');
  assert.ok(mail.dnsRecordsNeeded.some((r) => r.type === 'MX'));
  const dkim = mail.dnsRecordsNeeded.find((r) => r.type === 'TXT' && r.name.includes('domainkey'));
  assert.equal(dkim.name, 'liara._domainkey');

  const sec = await callTool('set_envs', { app, path: workdir, fromEnvFile: '.env.production', keys: ['STRIPE_SECRET_KEY', 'NEXTAUTH_SECRET', 'NEXT_PUBLIC_SITE_URL'] });
  assert.deepEqual(Object.keys(sec.changed).sort(), ['NEXTAUTH_SECRET', 'NEXT_PUBLIC_SITE_URL', 'STRIPE_SECRET_KEY']);
  assert.ok(!JSON.stringify(sec).includes('sk_live_abc'));

  // Real values reached Liara, earlier services were kept (merge, not replace).
  const envs = Object.fromEntries(mock.state.projects[app].envs.map((e) => [e.key, e.value]));
  assert.equal(envs.DATABASE_URL, 'postgresql://root:p%40ss%2Fword@shop-db:5432/postgres');
  assert.equal(envs.S3_SECRET_ACCESS_KEY, 'liara-secret-123');
  assert.equal(envs.OPENAI_API_KEY, 'liara-ai-key-abcdef');
  assert.equal(envs.SMTP_PASSWORD, 'smtp-pass-xyz');
  assert.equal(envs.STRIPE_SECRET_KEY, 'sk_live_abc');

  const masked = await callTool('get_envs', { app });
  assert.ok(!JSON.stringify(masked).includes('liara-secret-123'));

  const dns = await callTool('connect_dns', { domain: 'shop.example.com', app, importExisting: false });
  assert.deepEqual(dns.zone.liaraNameservers, ['ns1.liara.ir', 'ns2.liara.ir']);
  assert.equal(dns.domains[0].record, 'CNAME shop → shop-web.liara.run');
  assert.match(dns.ssl[0], /not issued yet/);

  const dep = await callTool('deploy', { path: workdir, app, wait: 5 });
  assert.equal(dep.state, 'READY');
  assert.equal(dep.success, true);
  assert.equal(dep.port, 3000);
  const upload = mock.state.uploads.at(-1).names;
  assert.ok(upload.includes('package.json'));
  assert.ok(upload.includes('.env.example'), 'example env kept');
  assert.ok(!upload.some((n) => n.endsWith('.env.production')), 'real env file not uploaded');
  const saved = JSON.parse(fs.readFileSync(path.join(workdir, 'liara.json'), 'utf8'));
  assert.deepEqual(saved, { app, platform: 'nextjs', port: 3000 });

  const logs = await callTool('app_logs', { app });
  assert.match(logs, /listening on 3000/);
});

test('laravel gets DB_* style variables', async () => {
  await callTool('create_app', { app: 'lara', platform: 'laravel', planID: 'small-g2' });
  const scan = await callTool('scan_project', { path: fixture('laravel-local'), checkDns: false });
  const mysql = scan.services.find((s) => s.id === 'database:mysql');
  const r = await callTool('connect_database', { app: 'lara', platform: 'laravel', create: { type: 'mysql', hostname: 'lara-db', planID: 'db-small' }, envKeys: mysql.envKeys, dbName: 'laravel' });
  assert.equal(r.envVars.DB_CONNECTION, 'mysql');
  assert.equal(r.envVars.DB_HOST, 'lara-db');
  assert.equal(r.envVars.DB_DATABASE, 'laravel');
  assert.equal(r.envVars.DB_USERNAME, 'root');
  const storage = scan.services.find((s) => s.id === 'storage');
  const s = await callTool('connect_storage', { app: 'lara', platform: 'laravel', bucket: 'lara-files', create: { plan: 'storage-20' }, envKeys: storage.envKeys });
  assert.equal(s.envVars.FILESYSTEM_DISK, 's3');
  assert.equal(s.envVars.AWS_USE_PATH_STYLE_ENDPOINT, 'true');
  assert.equal(s.envVars.AWS_BUCKET, 'lara-files');
});

test('bad token gives a clear message', async () => {
  const { createClient } = await import('../lib/api.mjs');
  const api = createClient({ token: 'wrong' });
  await assert.rejects(api.get('account', '/v1/me'), /rejected every saved token \(argument\)/);
});
