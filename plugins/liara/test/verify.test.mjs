// verify_app (real HTTP checks against a local stand-in app), diagnose (evidence from logs),
// log classification with secrets masked, and the status page reader.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let mock; let callTool; let classify; let scrubLine; let appServer; let statusServer;
let appBroken = false;

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  // Stand-in for https://<app>.liara.run
  appServer = http.createServer((req, res) => {
    if (appBroken) { res.writeHead(502); res.end('Bad Gateway'); return; }
    if (req.url === '/healthz') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); return; }
    res.writeHead(req.url === '/' ? 200 : 404); res.end('<h1>orders</h1>');
  });
  await new Promise((r) => appServer.listen(0, '127.0.0.1', r));
  process.env.LIARA_APP_URL_TEMPLATE = `http://127.0.0.1:${appServer.address().port}`;
  // Stand-in for the status page API (PocketBase collections).
  statusServer = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    if (req.url.startsWith('/api/collections/services/')) {
      res.end(JSON.stringify({ items: [{ id: 's1', name: 'PaaS', operational: true }, { id: 's2', name: 'DBaaS', operational: false }, { id: 's3', name: 'DNS', operational: true }] }));
    } else {
      const old = new Date(Date.now() - 20 * 86_400_000).toISOString().replace('T', ' ');
      const recent = new Date(Date.now() - 3_600_000).toISOString().replace('T', ' ');
      res.end(JSON.stringify({ items: [
        { title: 'Database slowdown', impact: 'major', status: 'investigating', services: ['s2'], started_at: recent, resolved_at: '' },
        { title: 'Old build issue', impact: 'minor', status: 'investigating', services: ['s1'], started_at: old, resolved_at: '' },
      ] }));
    }
  });
  await new Promise((r) => statusServer.listen(0, '127.0.0.1', r));
  process.env.LIARA_STATUS_API = `http://127.0.0.1:${statusServer.address().port}`;
  let raw;
  ({ callTool: raw } = await import('../lib/tools.mjs'));
  callTool = (n, a) => raw(n, a, { elicit: async () => ({ action: 'accept' }) });
  ({ classify, scrubLine } = await import('../lib/verify.mjs'));
  await callTool('create_app', { app: 'orders', platform: 'node', planID: 'small-g2' });
});
after(async () => {
  await mock.close();
  appServer.close();
  statusServer.close();
});

test('log lines are classified, and secrets in them are masked', () => {
  const found = classify([
    "Error: Cannot find module 'dotenv'",
    'npm ERR! missing script: start',
    'Error: connect ECONNREFUSED 10.10.0.5:5432 using postgres://app:Sup3rS3cret@db:5432/app',
    'Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)',
    'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory',
    "KeyError: 'STRIPE_SECRET_KEY'",
    'TypeError: Cannot read properties of undefined (reading \'id\')',
  ]);
  const cats = found.map((f) => f.category);
  for (const c of ['missing-dependency', 'missing-start-script', 'database', 'port', 'resources', 'missing-env', 'code-error']) assert.ok(cats.includes(c), `${c} in ${cats}`);
  assert.ok(!JSON.stringify(found).includes('Sup3rS3cret'));
  assert.match(found.find((f) => f.category === 'missing-dependency').explanation, /dotenv/);
  assert.equal(classify(['Server listening on http://localhost:3000']).length, 0, 'a printed localhost URL is not an error');
  assert.equal(scrubLine('auth Bearer abcdefghijklmnopqrstuvwxyz123 password=hunter2hunter sk-live-ABCDEFGHIJKLMNOP'), 'auth Bearer **** password=**** sk-****');
});

test('verify_app makes real requests and reports each check', async () => {
  const r = await callTool('verify_app', { app: 'orders', path: path.join(here, 'fixtures', 'node-full'), attempts: 1 });
  const byName = Object.fromEntries(r.checks.map((c) => [c.name, c]));
  assert.equal(byName['latest release succeeded'].ok, false, 'never deployed yet');
  assert.equal(byName['health /healthz'].ok, true);
  assert.match(byName['health /healthz'].detail, /^200 in \d+ ms/);
  assert.equal(r.healthy, false);
  assert.ok(r.notVerified.some((n) => /not contacted directly/.test(n)));
});

test('verify_app sees a down app and log errors', async () => {
  appBroken = true;
  mock.state.logs.orders = ['Error: connect ECONNREFUSED 10.10.0.5:5432'];
  try {
    const r = await callTool('verify_app', { app: 'orders', attempts: 1 });
    const home = r.checks.find((c) => c.name.startsWith('HTTP '));
    assert.equal(home.ok, false);
    assert.match(home.detail, /^502/);
    assert.equal(r.logFindings[0].category, 'database');
  } finally {
    appBroken = false;
    mock.state.logs.orders = undefined;
  }
});

test('diagnose says when there is no release at all', async () => {
  const d = await callTool('diagnose', { app: 'orders' });
  assert.ok([d, ...d.otherFindings].some((f) => /has no release yet/.test(f.explanation || '')));
});

test('diagnose names the cause from the build log, with the evidence', async () => {
  mock.state.releases.orders = [{ _id: 'relX', state: 'FAILED', port: 3000, type: 'node' }];
  mock.state.buildLogs.relX = ['> orders@1.0.0 build', 'npm ERR! missing script: start', 'Build failed'];
  const d = await callTool('diagnose', { app: 'orders', path: path.join(here, 'fixtures', 'node-full') });
  assert.equal(d.category, 'platform-incident', 'an open, fresh DBaaS incident is reported first');
  const start = d.otherFindings.find((f) => f.category === 'missing-start-script');
  assert.ok(start);
  assert.deepEqual(start.evidence, ['npm ERR! missing script: start']);
  assert.ok(d.otherFindings.some((f) => f.category === 'port' && /only listens on localhost/.test(f.explanation)));
  assert.equal(d.checked.buildLogLines, 3);
  assert.match(d.rule, /Do not retry blindly/);
});

test('service_status reads the official status data and flags stale incidents', async () => {
  const s = await callTool('service_status', {});
  assert.equal(s.allOperational, false);
  assert.deepEqual(s.notOperational, ['DBaaS']);
  assert.equal(s.openIncidents.length, 2);
  const old = s.openIncidents.find((i) => i.title === 'Old build issue');
  assert.match(old.note, /may simply not have been closed/);
  assert.deepEqual(s.openIncidents.find((i) => i.title === 'Database slowdown').services, ['DBaaS']);
  assert.equal(s.link, 'https://liara.online/');
});
