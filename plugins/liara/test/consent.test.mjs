// Consent before anything changes the account: dialog, chat fallback, plan approval,
// typed-name deletes, audit log without secrets, and the MCP server's dialog round trip.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let mock; let callTool; let resetConsent; let AUDIT_FILE;
before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  ({ callTool } = await import('../lib/tools.mjs'));
  ({ resetConsent } = await import('../lib/consent.mjs'));
  ({ AUDIT_FILE } = await import('../lib/audit.mjs'));
});
after(() => mock.close());
beforeEach(() => resetConsent());

// A fake user: answers every dialog with `action`, and remembers what it was shown.
function user(action = 'accept', content) {
  const seen = [];
  const elicit = async (params) => { seen.push(params); return { action, content }; };
  return { seen, elicit };
}

test('declining the dialog changes nothing', async () => {
  const u = user('decline');
  const before = mock.state.createdProjects.length;
  const r = await callTool('create_app', { app: 'nope', platform: 'node', planID: 'small-g2' }, { elicit: u.elicit });
  assert.equal(r.cancelled, true);
  assert.match(r.message, /did not approve.*Nothing was changed/);
  assert.equal(mock.state.createdProjects.length, before);
  assert.equal(u.seen.length, 1);
});

test('the dialog says what, where, and the live monthly cost', async () => {
  const u = user('accept');
  await callTool('create_app', { app: 'shown', platform: 'node', planID: 'small-g2' }, { elicit: u.elicit });
  const msg = u.seen[0].message;
  assert.match(msg, /^Create app «shown»/);
  assert.match(msg, /Account: personal account/);
  assert.match(msg, /Cost: about 475,000 Toman\/month, from live Liara prices/);
  assert.match(msg, /Risk: Creates a resource that costs money/);
  assert.deepEqual(u.seen[0].requestedSchema, { type: 'object', properties: {} });
});

test('without a dialog the tool asks Claude to confirm in chat, with a one-time token', async () => {
  const args = { app: 'chatty', platform: 'node', planID: 'small-g2' };
  const first = await callTool('create_app', args);
  assert.equal(first.confirmationRequired, true);
  assert.equal(first.nothingChangedYet, true);
  assert.equal(mock.state.projects.chatty, undefined);
  // the token is bound to these exact arguments
  const other = await callTool('create_app', { ...args, planID: 'medium-g2', bundlePlanID: 'basic', confirmToken: first.confirmToken });
  assert.equal(other.confirmationRequired, true, 'a token for small-g2 does not approve medium-g2');
  const ok = await callTool('create_app', { ...args, confirmToken: first.confirmToken });
  assert.equal(ok.created, true);
  const again = await callTool('set_envs', { app: 'chatty', vars: { A: '1' }, confirmToken: first.confirmToken });
  assert.equal(again.confirmationRequired, true, 'tokens work once');
});

test('one approved plan covers its steps and nothing else', async () => {
  const u = user('accept');
  const plan = await callTool('approve_plan', {
    title: 'Deploy planned', why: 'test',
    operations: [
      { tool: 'create_app', target: 'planned', kind: 'app', plan: 'medium-g2', bundle: 'basic', summary: 'Create the app' },
      { tool: 'connect_database', target: 'planned-db', kind: 'database', plan: 'db-small', summary: 'Create Postgres' },
      { tool: 'set_envs', target: 'planned', summary: 'Set env vars' },
    ],
  }, { elicit: u.elicit });
  assert.equal(plan.approved, true);
  assert.equal(plan.totalMonthlyToman, 720000 + 275000);
  assert.match(u.seen[0].message, /Cost: 995,000 Toman\/month in total/);
  assert.match(u.seen[0].message, /• Create the app — 995,000 Toman\/month/);

  const quiet = user('decline'); // would refuse if asked
  assert.equal((await callTool('create_app', { app: 'planned', platform: 'node', planID: 'medium-g2', bundlePlanID: 'basic' }, { elicit: quiet.elicit })).created, true);
  await callTool('connect_database', { app: 'planned', create: { type: 'postgres', hostname: 'planned-db', planID: 'db-small' } }, { elicit: quiet.elicit });
  await callTool('set_envs', { app: 'planned', vars: { NODE_ENV: 'production' } }, { elicit: quiet.elicit });
  assert.equal(quiet.seen.length, 0, 'no dialogs for approved steps');
  // not in the plan → asks (and is declined)
  const r = await callTool('app_action', { app: 'planned', action: 'stop' }, { elicit: quiet.elicit });
  assert.equal(r.cancelled, true);
  assert.equal(quiet.seen.length, 1);
});

test('deletes need the name typed, and cannot be pre-approved', async () => {
  await assert.rejects(callTool('approve_plan', { title: 'x', operations: [{ tool: 'api', target: 'paas:/v1/projects/x', summary: 'delete' }] }, { elicit: user().elicit }), /can't be pre-approved/);
  const wrong = user('accept', { confirm: 'something-else' });
  const r = await callTool('api', { service: 'paas', method: 'DELETE', path: '/v1/projects/shown' }, { elicit: wrong.elicit });
  assert.equal(r.cancelled, true);
  assert.match(r.message, /typed name did not match "shown"/);
  assert.match(wrong.seen[0].message, /To confirm, type: shown/);
  assert.deepEqual(wrong.seen[0].requestedSchema.required, ['confirm']);
  // chat fallback needs confirmName too
  const ask = await callTool('api', { service: 'paas', method: 'DELETE', path: '/v1/projects/shown' });
  const noName = await callTool('api', { service: 'paas', method: 'DELETE', path: '/v1/projects/shown', confirmToken: ask.confirmToken });
  assert.match(noName.message, /confirmName must be exactly "shown"/);
});

test('read-only tools never ask', async () => {
  const u = user('decline');
  await callTool('plans', {}, { elicit: u.elicit });
  await callTool('list_resources', {}, { elicit: u.elicit });
  await callTool('api', { service: 'paas', method: 'GET', path: '/v1/projects' }, { elicit: u.elicit });
  assert.equal(u.seen.length, 0);
});

test('the audit log records changes without secret values', async () => {
  const u = user('accept');
  await callTool('set_envs', { app: 'shown', vars: { STRIPE_SECRET_KEY: 'sk_live_TOPSECRET123' } }, { elicit: u.elicit });
  assert.match(u.seen.at(-1).message, /Sets STRIPE_SECRET_KEY/);
  assert.ok(!u.seen.at(-1).message.includes('TOPSECRET'), 'value not shown in the dialog');
  const log = fs.readFileSync(AUDIT_FILE, 'utf8');
  assert.ok(!log.includes('TOPSECRET'));
  const last = log.trim().split('\n').map((l) => JSON.parse(l)).filter((e) => e.tool === 'set_envs').at(-1);
  assert.equal(last.consent, 'approved in dialog');
  assert.equal(last.outcome, 'done');
  assert.deepEqual(last.result.changed, ['STRIPE_SECRET_KEY']);
  assert.equal((fs.statSync(AUDIT_FILE).mode & 0o777), 0o600);
});

// The real server, talking to a fake MCP client that supports dialogs.
function startServer(capabilities) {
  const child = spawn(process.execPath, [path.join(here, '..', 'server', 'index.mjs')], { env: { ...process.env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = readline.createInterface({ input: child.stdout });
  const queue = []; const waiters = [];
  lines.on('line', (l) => { const m = JSON.parse(l); const w = waiters.shift(); if (w) w(m); else queue.push(m); });
  const next = () => new Promise((r) => (queue.length ? r(queue.shift()) : waiters.push(r)));
  const write = (m) => child.stdin.write(`${JSON.stringify(m)}\n`);
  write({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities, clientInfo: { name: 'test', version: '1' } } });
  return { child, next, write };
}

test('MCP server: create_app shows a dialog and continues after Accept', async () => {
  const s = startServer({ elicitation: {} });
  try {
    await s.next(); // initialize result
    s.write({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'create_app', arguments: { app: 'via-mcp', platform: 'node', planID: 'small-g2' } } });
    const ask = await s.next();
    assert.equal(ask.method, 'elicitation/create');
    assert.match(ask.params.message, /Create app «via-mcp»/);
    s.write({ jsonrpc: '2.0', id: ask.id, result: { action: 'accept', content: {} } });
    const res = await s.next();
    assert.equal(res.id, 2);
    assert.equal(JSON.parse(res.result.content[0].text).created, true);
    assert.equal(mock.state.projects['via-mcp'].planID, 'small-g2');
  } finally {
    s.child.kill();
  }
});

test('MCP server: without dialog support it returns confirmationRequired', async () => {
  const s = startServer({});
  try {
    await s.next();
    s.write({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'create_app', arguments: { app: 'no-dialog', platform: 'node', planID: 'small-g2' } } });
    const res = await s.next();
    const body = JSON.parse(res.result.content[0].text);
    assert.equal(body.confirmationRequired, true);
    assert.equal(mock.state.projects['no-dialog'], undefined);
    s.write({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
    const list = await s.next();
    const plans = list.result.tools.find((t) => t.name === 'plans');
    assert.equal(plans.annotations.readOnlyHint, true);
    assert.ok(list.result.tools.find((t) => t.name === 'create_app').inputSchema.properties.confirmToken);
  } finally {
    s.child.kill();
  }
});
