// Build location (Germany first, Iran when Germany is not available), more build time by
// upgrading the feature bundle, and the live progress page (local server, Server-Sent Events).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let mock; let work; let appServer; let raw; let resetConsent; let live;
const accept = async () => ({ action: 'accept' });
const call = (n, a, elicit = accept) => raw(n, a, { cwd: work, elicit });
const lastRelease = (app) => mock.state.releases[app][0];

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  appServer = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  await new Promise((r) => appServer.listen(0, '127.0.0.1', r));
  process.env.LIARA_APP_URL_TEMPLATE = `http://127.0.0.1:${appServer.address().port}`;
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-build-'));
  fs.cpSync(path.join(here, 'fixtures', 'express-plain'), work, { recursive: true });
  ({ callTool: raw } = await import('../lib/tools.mjs'));
  ({ resetConsent } = await import('../lib/consent.mjs'));
  live = await import('../lib/live.mjs');
  await call('create_app', { app: 'build-app', platform: 'node', planID: 'medium-g2', bundlePlanID: 'basic' });
});
after(async () => {
  await live.stopLive();
  await mock.close();
  appServer.close();
  fs.rmSync(work, { recursive: true, force: true });
});
beforeEach(() => {
  resetConsent();
  Object.assign(mock.state, { germanyDown: false, germanySilent: false, buildTimeout: false });
  fs.rmSync(path.join(work, 'liara.json'), { force: true });
});

test('builds in Germany by default', async () => {
  const r = await call('deploy', { path: work, app: 'build-app', wait: 5 });
  assert.equal(r.success, true);
  assert.equal(r.buildLocation, 'germany');
  assert.equal(r.buildLocationFallback, undefined);
  assert.deepEqual(lastRelease('build-app').body.build, { location: 'germany' });
  assert.ok(r.steps.some((s) => /build location germany/.test(s)));
});

test('Germany refused → builds in Iran by itself and says why', async () => {
  mock.state.germanyDown = true;
  const r = await call('deploy', { path: work, app: 'build-app', wait: 5 });
  assert.equal(r.success, true);
  assert.equal(r.buildLocation, 'iran');
  assert.match(r.buildLocationFallback, /release refused: .*germany is not available/);
  assert.deepEqual(lastRelease('build-app').body.build, { location: 'iran' });
});

test('Germany build ends with no output → rebuilt in Iran', async () => {
  mock.state.germanySilent = true;
  const before = mock.state.releases['build-app'].length;
  const r = await call('deploy', { path: work, app: 'build-app', wait: 5 });
  assert.equal(r.success, true);
  assert.equal(r.buildLocation, 'iran');
  assert.match(r.buildLocationFallback, /without any build output/);
  assert.equal(mock.state.releases['build-app'].length, before + 2, 'one German release, one Iranian');
  assert.equal(mock.state.releases['build-app'][1].body.build.location, 'germany');
});

test('liara.json build.location is respected, other build settings kept', async () => {
  fs.writeFileSync(path.join(work, 'liara.json'), JSON.stringify({ build: { location: 'iran', cache: false } }));
  const r = await call('deploy', { path: work, app: 'build-app', wait: 5, saveLiaraJson: false });
  assert.equal(r.buildLocation, 'iran');
  assert.deepEqual(lastRelease('build-app').body.build, { cache: false, location: 'iran' });
  await assert.rejects(call('deploy', { path: work, app: 'build-app', wait: 5, buildLocation: 'mars' }), /must be equal to one of|Unknown build location/);
});

test('build out of time → the next bundle up is suggested and, once approved in the plan, applied without asking', async () => {
  mock.state.buildTimeout = true;
  const r = await call('deploy', { path: work, app: 'build-app', wait: 5 });
  assert.equal(r.success, false);
  assert.equal(r.state, 'TIMEOUT');
  assert.equal(r.buildTimedOut, true);
  assert.deepEqual(
    { possible: r.upgradeForBuildTime.possible, from: r.upgradeForBuildTime.fromBundle, to: r.upgradeForBuildTime.bundlePlanID, minutes: r.upgradeForBuildTime.buildMinutes, extra: r.upgradeForBuildTime.extraMonthlyToman },
    { possible: true, from: 'basic', to: 'pro', minutes: 20, extra: 825000 - 275000 },
  );

  // The approval names the conditional upgrade in the same short question.
  const seen = [];
  const plan = await call('approve_plan', {
    title: 'Deploy build-app', operations: [
      { tool: 'create_app', target: 'build-app', kind: 'app', plan: 'medium-g2', bundle: 'basic', summary: 'Create the app' },
      { tool: 'change_app_plan', target: 'build-app', kind: 'app', plan: 'medium-g2', bundle: 'pro', ifNeeded: true, summary: 'More build time if needed' },
    ],
  }, async (p) => { seen.push(p.message); return { action: 'accept' }; });
  assert.equal(plan.approved, true);
  assert.equal(plan.totalMonthlyToman, 720000 + 275000, 'the conditional upgrade is not in the total');
  assert.equal(seen[0], "I'll add 1 service to your Liara account (personal account): about 33,167 Toman a day. If a build needs more time, I'll move build-app to the pro bundle (builds up to 20 minutes): about 18,333 Toman more a day.");

  const asked = [];
  const up = await call('change_app_plan', { app: 'build-app', bundlePlanID: 'pro' }, async (p) => { asked.push(p); return { action: 'decline' }; });
  assert.equal(up.changed, true, 'pre-approved: no question');
  assert.equal(asked.length, 0);
  assert.equal(mock.state.projects['build-app'].bundlePlanID, 'pro');
  assert.equal(up.buildMinutes, 20);
  const again = await call('deploy', { path: work, app: 'build-app', wait: 5 });
  assert.equal(again.success, true);
});

test('change_app_plan outside a plan asks with one short line', async () => {
  mock.state.projects['build-app'].bundlePlanID = 'basic';
  const seen = [];
  const r = await call('change_app_plan', { app: 'build-app', bundlePlanID: 'pro' }, async (p) => { seen.push(p.message); return { action: 'decline' }; });
  assert.equal(r.cancelled, true);
  assert.equal(seen[0].split('\n')[0], "I'll move build-app to the pro bundle so builds can run up to 20 minutes: about 18,333 Toman more a day.");
  assert.equal(mock.state.projects['build-app'].bundlePlanID, 'basic', 'nothing changed');
});

// ---- live page ----
const get = (url, headers = {}) => new Promise((resolve, reject) => {
  const req = http.get(url, { headers }, (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (c) => { body += c; if (res.headers['content-type']?.startsWith('text/event-stream') && body.includes('"type":"checks"')) { req.destroy(); resolve({ status: res.statusCode, headers: res.headers, body }); } });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
  });
  req.on('error', (e) => (e.code === 'ECONNRESET' ? null : reject(e)));
  req.setTimeout(5000, () => { req.destroy(); resolve({ status: 'timeout', body: '' }); });
});

test('live page: local only, secret path, Persian page, every step streamed without secrets', async () => {
  const r = await call('live_progress', { title: 'build-app', note: 'شروع استقرار' });
  assert.match(r.url, /^http:\/\/127\.0\.0\.1:\d+\/[\w-]{16}\/$/);
  assert.equal(r.opened, false, 'never opens a browser in tests');

  await call('set_envs', { app: 'build-app', vars: { API_URL: 'postgres://admin:Pa55word@db:5432/app' } });
  await call('deploy', { path: work, app: 'build-app', wait: 5 });
  await call('verify_app', { app: 'build-app', attempts: 1 });

  const page = await get(r.url);
  assert.equal(page.status, 200);
  assert.match(page.headers['content-security-policy'], /default-src 'none'.*connect-src 'self'/);
  assert.match(page.body, /^<!DOCTYPE html>\n<html lang="fa" dir="rtl">/);
  assert.ok(page.body.includes('استقرار زنده در لیارا'));
  assert.ok(!/<(link|img)\b[^>]*https?:/i.test(page.body), 'no external resources');

  const sse = await get(`${r.url}events`);
  assert.match(sse.headers['content-type'], /^text\/event-stream/);
  const evs = sse.body.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
  const types = new Set(evs.map((e) => e.type));
  for (const t of ['session', 'note', 'step', 'deploy', 'checks']) assert.ok(types.has(t), t);
  const phases = evs.filter((e) => e.type === 'deploy').map((e) => e.phase);
  for (const ph of ['pack', 'upload', 'uploaded', 'build', 'state', 'finished']) assert.ok(phases.includes(ph), ph);
  assert.ok(evs.some((e) => e.type === 'deploy' && e.phase === 'build' && e.location === 'germany'));
  const envStep = evs.filter((e) => e.type === 'step' && e.tool === 'set_envs');
  assert.deepEqual(envStep.map((e) => e.status), ['running', 'done'], 'one row: running then done');
  assert.equal(envStep[0].step, envStep[1].step);
  assert.ok(!sse.body.includes('Pa55word'), 'no secrets on the page');
  assert.ok(!evs.some((e) => e.type === 'step' && e.tool === 'whoami'), 'lookups stay off the page');

  // Only this computer's address, only the secret path, only GET.
  const port = new URL(r.url).port;
  assert.equal((await get(r.url, { host: `evil.example:${port}` })).status, 403);
  assert.equal((await get(`http://127.0.0.1:${port}/`)).status, 404);
  assert.equal((await get(`http://127.0.0.1:${port}/wrong-token/events`)).status, 404);
});

test('live page: a refused Germany build and a build timeout show up as events', async () => {
  mock.state.germanyDown = true;
  mock.state.buildTimeout = true;
  mock.state.projects['build-app'].bundlePlanID = 'basic';
  await call('deploy', { path: work, app: 'build-app', wait: 5 });
  const evs = live.liveEvents();
  const loc = evs.filter((e) => e.type === 'location').at(-1);
  assert.deepEqual({ from: loc.from, to: loc.to }, { from: 'germany', to: 'iran' });
  const t = evs.filter((e) => e.type === 'buildTimeout').at(-1);
  assert.equal(t.upgrade.bundlePlanID, 'pro');
  assert.ok(evs.some((e) => e.type === 'log' && e.lines.includes('Build timed out after 5 minutes')));
});
