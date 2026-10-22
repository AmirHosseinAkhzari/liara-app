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

test('no balance: stops before the dialog; low balance: the dialog warns', async () => {
  mock.state.balance = 0;
  try {
    const u = user('accept');
    const r = await callTool('create_app', { app: 'broke', platform: 'node', planID: 'small-g2' }, { elicit: u.elicit });
    assert.equal(r.notEnoughBalance, true);
    assert.equal(u.seen.length, 0, 'no pointless dialog');
    assert.match(r.message, /balance of this account is 0 Toman/);
    assert.equal(mock.state.projects.broke, undefined);
    const plan = await callTool('approve_plan', { title: 'x', operations: [{ tool: 'create_app', target: 'broke', kind: 'app', plan: 'small-g2', summary: 'Create' }] }, { elicit: u.elicit });
    assert.equal(plan.notEnoughBalance, true);
    // If Liara refuses anyway (402), the error says why in plain words.
    await assert.rejects(callTool('api', { service: 'paas', method: 'POST', path: '/v1/projects', body: { name: 'x', platform: 'node', planID: 'small-g2', network: 'net1' } }, { elicit: u.elicit }), /not enough balance on this account/);
    mock.state.balance = 5000;
    const low = user('decline');
    await callTool('create_app', { app: 'lowbal', platform: 'node', planID: 'small-g2' }, { elicit: low.elicit });
    assert.match(low.seen[0].message, /Balance: 5,000 Toman on this account/);
    assert.match(low.seen[0].message, /Warning: Low balance/);
  } finally {
    mock.state.balance = 1_000_000;
  }
});

test('deleting something that does not exist asks nothing and says not found', async () => {
  const u = user('accept');
  await assert.rejects(callTool('delete_app', { app: 'never-existed' }, { elicit: u.elicit }), /not found/);
  await assert.rejects(callTool('vm_action', { vm: 'no-such-vm', action: 'delete' }, { elicit: u.elicit }), /not found/);
  assert.equal(u.seen.length, 0);
});

// A client that says it shows dialogs but answers them itself, at once (the Claude
// desktop app declines every MCP dialog this way, without showing it).
test('a dialog the app declines by itself falls back to chat, and later approvals skip dialogs', async () => {
  process.env.LIARA_DIALOG_MIN_MS = '400';
  try {
    const app = user('decline');
    const args = { app: 'desk', platform: 'node', planID: 'small-g2' };
    const first = await callTool('create_app', args, { elicit: app.elicit });
    assert.equal(first.cancelled, undefined, 'not reported as the user saying no');
    assert.equal(first.confirmationRequired, true);
    assert.match(first.dialogNotAnswered, /could not show the Liara confirmation dialog/);
    assert.equal(mock.state.projects.desk, undefined, 'nothing created yet');
    const last = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').at(-1));
    assert.equal(last.outcome, 'waiting for confirmation');
    assert.deepEqual({ action: last.dialog.action, shown: last.dialog.shown }, { action: 'decline', shown: false });

    // The user clicks Allow in chat.
    const ok = await callTool('create_app', { ...args, confirmToken: first.confirmToken }, { elicit: app.elicit });
    assert.equal(ok.created, true);

    // From now on this session asks in chat straight away.
    const next = await callTool('set_envs', { app: 'desk', vars: { NODE_ENV: 'production' } }, { elicit: app.elicit });
    assert.equal(next.confirmationRequired, true);
    assert.equal(app.seen.length, 1, 'only one dialog was ever sent');
  } finally {
    process.env.LIARA_DIALOG_MIN_MS = '0';
  }
});

test('a person who declines still stops everything; closing the dialog asks in chat', async () => {
  process.env.LIARA_DIALOG_MIN_MS = '100';
  const person = (action) => {
    const seen = [];
    return { seen, elicit: async (params) => { seen.push(params); await new Promise((r) => setTimeout(r, 150)); return { action }; } };
  };
  try {
    const no = person('decline');
    const r = await callTool('create_app', { app: 'said-no', platform: 'node', planID: 'small-g2' }, { elicit: no.elicit });
    assert.equal(r.cancelled, true);
    assert.match(r.message, /did not approve.*Nothing was changed/);
    assert.equal(r.confirmToken, undefined, 'no way around a real no');
    assert.equal(mock.state.projects['said-no'], undefined);

    const closed = person('cancel');
    const c = await callTool('create_app', { app: 'closed', platform: 'node', planID: 'small-g2' }, { elicit: closed.elicit });
    assert.equal(c.confirmationRequired, true);
    assert.match(c.dialogNotAnswered, /closed without a choice/);
    assert.equal(mock.state.projects.closed, undefined);

    // Dialogs keep working after a person closed one.
    const yes = person('accept');
    assert.equal((await callTool('create_app', { app: 'closed', platform: 'node', planID: 'small-g2' }, { elicit: yes.elicit })).created, true);
    assert.equal(yes.seen.length, 1);
  } finally {
    process.env.LIARA_DIALOG_MIN_MS = '0';
  }
});

test('LIARA_DIALOGS=off always asks in chat', async () => {
  process.env.LIARA_DIALOGS = 'off';
  try {
    resetConsent();
    const u = user('accept');
    const r = await callTool('create_app', { app: 'chat-only', platform: 'node', planID: 'small-g2' }, { elicit: u.elicit });
    assert.equal(r.confirmationRequired, true);
    assert.equal(u.seen.length, 0);
  } finally {
    delete process.env.LIARA_DIALOGS;
    resetConsent();
  }
});

// The real server, talking to a fake MCP client that supports dialogs.
function startServer(capabilities, env = {}) {
  const child = spawn(process.execPath, [path.join(here, '..', 'server', 'index.mjs')], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
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

test('MCP server: a client that declines dialogs without showing them gets chat confirmation', async () => {
  const s = startServer({ elicitation: {} }, { LIARA_DIALOG_MIN_MS: '1500' });
  const call = (id, args) => s.write({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'create_app', arguments: args } });
  const args = { app: 'from-desktop', platform: 'node', planID: 'small-g2' };
  try {
    await s.next();
    call(2, args);
    const ask = await s.next();
    assert.equal(ask.method, 'elicitation/create');
    s.write({ jsonrpc: '2.0', id: ask.id, result: { action: 'decline' } }); // what the desktop app sends, at once
    const first = JSON.parse((await s.next()).result.content[0].text);
    assert.equal(first.confirmationRequired, true);
    assert.match(first.dialogNotAnswered, /could not show/);
    assert.equal(mock.state.projects['from-desktop'], undefined);

    // The next approval goes straight to chat: the reply comes back with no dialog first.
    call(3, { ...args, app: 'from-desktop-2' });
    const second = await s.next();
    assert.equal(second.id, 3);
    assert.equal(JSON.parse(second.result.content[0].text).confirmationRequired, true);

    // The user clicked Allow in chat.
    call(4, { ...args, confirmToken: first.confirmToken });
    const done = await s.next();
    assert.equal(done.id, 4);
    assert.equal(JSON.parse(done.result.content[0].text).created, true);
    assert.equal(mock.state.projects['from-desktop'].planID, 'small-g2');
  } finally {
    s.child.kill();
  }
});
