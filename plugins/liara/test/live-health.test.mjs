// The live page's health stage always ends (done, failed with a reason, or failed after a
// timeout), and the page gets the build log and the app's runtime logs, secrets masked.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';
import { liveModel, liveStages } from '../lib/livepage.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let mock; let work; let appServer; let raw; let resetConsent; let live;
const accept = async () => ({ action: 'accept' });
const call = (n, a, elicit = accept) => raw(n, a, { cwd: work, elicit });
const MIN = 60_000;

// What the page shows for an app, from the events the plugin sent so far.
function pageState(app, { after = 0, now = Date.now() } = {}) {
  const m = liveModel(live.liveEvents().filter((e) => e.id > after));
  const a = m.apps.find((x) => x.name === app);
  return { ...liveStages(a, m.steps, now), a };
}

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  appServer = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  await new Promise((r) => appServer.listen(0, '127.0.0.1', r));
  process.env.LIARA_APP_URL_TEMPLATE = `http://127.0.0.1:${appServer.address().port}`;
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-health-'));
  fs.cpSync(path.join(here, 'fixtures', 'express-plain'), work, { recursive: true });
  ({ callTool: raw } = await import('../lib/tools.mjs'));
  ({ resetConsent } = await import('../lib/consent.mjs'));
  live = await import('../lib/live.mjs');
  await call('create_app', { app: 'health-app', platform: 'node', planID: 'medium-g2', bundlePlanID: 'basic' });
  await call('live_progress', { title: 'health-app' });
});
after(async () => {
  await live.stopLive();
  await mock.close();
  appServer.close();
  fs.rmSync(work, { recursive: true, force: true });
});
beforeEach(() => {
  resetConsent();
  delete process.env.LIARA_VERIFY_TIMEOUT_SECONDS;
  Object.assign(mock.state, { slowBuild: null, germanyDown: false, germanySilent: false, buildTimeout: false });
  mock.state.logs = { ...mock.state.logs, 'health-app': ['listening on 3000'] };
});

// ---- health stage, end to end ----

test('health: passing checks end the stage as done', async () => {
  const mark = live.liveEvents().at(-1).id;
  await call('deploy', { path: work, app: 'health-app', wait: 5, saveLiaraJson: false });
  assert.equal(pageState('health-app', { after: mark }).st.health, 'active', 'waiting for verify_app right after the deploy');
  await call('verify_app', { app: 'health-app', attempts: 1 });
  const { st, why } = pageState('health-app', { after: mark });
  assert.deepEqual(st, { services: 'done', upload: 'done', build: 'done', run: 'done', health: 'done' });
  assert.equal(why.health, undefined);
});

test('health: failing checks end the stage as failed, with the failed check as the reason', async () => {
  const mark = live.liveEvents().at(-1).id;
  mock.state.logs['health-app'] = ['listening on 3000', "Error: Cannot find module 'express'"];
  await call('deploy', { path: work, app: 'health-app', wait: 5, saveLiaraJson: false });
  const r = await call('verify_app', { app: 'health-app', attempts: 1 });
  assert.equal(r.healthy, false);
  const { st, why } = pageState('health-app', { after: mark });
  assert.equal(st.health, 'failed');
  assert.match(why.health, /no errors in the last 15 min of logs: missing-dependency/);
});

test('health: verify_app that errors or runs out of time still ends the stage (failed, with why)', async () => {
  const mark = live.liveEvents().at(-1).id;
  await call('deploy', { path: work, app: 'health-app', wait: 5, saveLiaraJson: false });
  process.env.LIARA_VERIFY_TIMEOUT_SECONDS = '0.001';
  await assert.rejects(call('verify_app', { app: 'health-app', attempts: 1 }), /verify_app did not finish within/);
  const checks = live.liveEvents().filter((e) => e.type === 'checks' && e.id > mark);
  assert.equal(checks.length, 1, 'a final health result is sent even though verify_app threw');
  assert.equal(checks[0].healthy, false);
  const { st, why } = pageState('health-app', { after: mark });
  assert.equal(st.health, 'failed');
  assert.match(why.health, /did not finish within/);

  // An app that isn't there: the error is the reason.
  const mark2 = live.liveEvents().at(-1).id;
  await call('deploy', { path: work, app: 'health-app', wait: 5, saveLiaraJson: false });
  delete process.env.LIARA_VERIFY_TIMEOUT_SECONDS;
  const saved = mock.state.projects['health-app'];
  delete mock.state.projects['health-app'];
  try {
    await assert.rejects(call('verify_app', { app: 'health-app', attempts: 1 }), /not found/);
  } finally {
    mock.state.projects['health-app'] = saved;
  }
  const s2 = pageState('health-app', { after: mark2 });
  assert.equal(s2.st.health, 'failed');
  assert.match(s2.why.health, /not found/);
});

test('health: never spins forever: no verify_app within 5 minutes → failed with a reason', async () => {
  const mark = live.liveEvents().at(-1).id;
  await call('deploy', { path: work, app: 'health-app', wait: 5, saveLiaraJson: false });
  assert.equal(pageState('health-app', { after: mark, now: Date.now() + 4 * MIN }).st.health, 'active');
  const late = pageState('health-app', { after: mark, now: Date.now() + 6 * MIN });
  assert.equal(late.st.health, 'failed');
  assert.match(late.why.health, /بررسی سلامت شروع نشد/);
  // verify_app coming later still decides.
  await call('verify_app', { app: 'health-app', attempts: 1 });
  assert.equal(pageState('health-app', { after: mark, now: Date.now() + 10 * MIN }).st.health, 'done');
});

// ---- health stage, page logic alone ----

const t0 = Date.parse('2026-10-23T10:00:00Z');
const at = (min) => new Date(t0 + min * MIN).toISOString();
const deployed = [
  { id: 1, time: at(0), type: 'step', step: 's1', tool: 'deploy', status: 'running', app: 'x' },
  { id: 2, time: at(0), type: 'deploy', phase: 'pack', app: 'x' },
  { id: 3, time: at(0), type: 'deploy', phase: 'uploaded', app: 'x' },
  { id: 4, time: at(1), type: 'deploy', phase: 'build', app: 'x', releaseID: 'r1', location: 'germany' },
  { id: 5, time: at(2), type: 'deploy', phase: 'finished', app: 'x', releaseID: 'r1', success: true, finished: true, state: 'READY' },
  { id: 6, time: at(2), type: 'step', step: 's1', tool: 'deploy', status: 'done', app: 'x' },
];
const stagesAt = (evs, min) => { const m = liveModel(evs); return liveStages(m.apps[0], m.steps, t0 + min * MIN); };

test('page logic: a verify_app still running after 6 minutes is shown as failed', () => {
  const evs = [...deployed, { id: 7, time: at(3), type: 'step', step: 's2', tool: 'verify_app', status: 'running', app: 'x' }];
  assert.equal(stagesAt(evs, 5).st.health, 'active');
  const r = stagesAt(evs, 10);
  assert.equal(r.st.health, 'failed');
  assert.match(r.why.health, /۶ دقیقه/);
});

test('page logic: a verify_app step that errored without results is failed, not spinning', () => {
  const evs = [...deployed,
    { id: 7, time: at(3), type: 'step', step: 's2', tool: 'verify_app', status: 'running', app: 'x' },
    { id: 8, time: at(3), type: 'step', step: 's2', tool: 'verify_app', status: 'error', error: 'fetch failed', app: 'x' }];
  const r = stagesAt(evs, 3);
  assert.equal(r.st.health, 'failed');
  assert.equal(r.why.health, 'fetch failed');
});

test('page logic: a deploy that stopped waiting keeps the build going, not failed', () => {
  const evs = [...deployed.slice(0, 4), { id: 5, time: at(5), type: 'deploy', phase: 'finished', app: 'x', releaseID: 'r1', success: false, finished: false, state: 'BUILDING' }];
  assert.equal(stagesAt(evs, 6).st.build, 'active');
  assert.equal(stagesAt(evs, 6).st.health, 'pending');
  const r = stagesAt(evs, 40);
  assert.equal(r.st.build, 'failed', 'and a build with no news for 30 minutes ends too');
  assert.ok(r.why.build);
});

test('page logic: a new deploy resets health to wait for its own checks', () => {
  const evs = [...deployed,
    { id: 7, time: at(3), type: 'checks', app: 'x', healthy: true, checks: [] },
    { id: 8, time: at(4), type: 'deploy', phase: 'pack', app: 'x' }];
  assert.equal(stagesAt(evs, 4).st.health, 'pending');
});

// ---- logs on the page ----

test('logs: the build log reaches the page from Liara\'s real build-logs answer', async () => {
  const mark = live.liveEvents().at(-1).id;
  mock.state.slowBuild = { ms: 1500, lines: ['Step 1/4 : FROM node:22', 'npm ci', 'added 57 packages'] };
  const r = await call('deploy', { path: work, app: 'health-app', wait: 15, saveLiaraJson: false });
  assert.equal(r.success, true);
  const lines = live.liveEvents().filter((e) => e.type === 'log' && e.id > mark).flatMap((e) => e.lines);
  assert.deepEqual(lines, ['Step 1/4 : FROM node:22', 'npm ci', 'added 57 packages']);
  const { a } = pageState('health-app', { after: mark });
  assert.deepEqual(a.attempts.at(-1).logs.filter((l) => l.text).map((l) => l.text), lines);
});

test('logs: runtime logs reach the page after the deploy and verify, secret values masked', async () => {
  await call('set_envs', { app: 'health-app', vars: { JWT_SECRET: 'superSecretValue123', DATABASE_URL: 'postgres://app:dbPa55wordX@db:5432/app', NODE_ENV: 'production' } });
  mock.state.logs['health-app'] = ['listening on 3000', 'booting with superSecretValue123 as signing key', 'db password is dbPa55wordX', 'mode production'];
  const mark = live.liveEvents().at(-1).id;
  await call('deploy', { path: work, app: 'health-app', wait: 5, saveLiaraJson: false });
  const afterDeploy = live.liveEvents().filter((e) => e.type === 'runtime' && e.id > mark);
  assert.equal(afterDeploy.length, 1, 'runtime logs pushed when the release ends');
  await call('verify_app', { app: 'health-app', attempts: 1 });
  await call('app_logs', { app: 'health-app' });
  const runtime = live.liveEvents().filter((e) => e.type === 'runtime' && e.id > mark);
  assert.equal(runtime.length, 3, 'after deploy, verify_app and app_logs');
  const text = JSON.stringify(live.liveEvents());
  assert.ok(!text.includes('superSecretValue123'), 'secret env value never on the page');
  assert.ok(!text.includes('dbPa55wordX'), 'database password never on the page');
  const last = runtime.at(-1).lines;
  assert.ok(last.some((l) => /listening on 3000$/.test(l)));
  assert.ok(last.some((l) => /booting with \*\*\*\* as signing key$/.test(l)));
  assert.ok(last.some((l) => /mode production$/.test(l)), 'ordinary values stay readable');
  assert.deepEqual(pageState('health-app', { after: mark }).a.runtime.lines, last);
});

// Like a Laravel build (composer + npm): longer than the deploy waits. Liara says READY a bit
// later, so the page must never call it a failure, and must end it as done by itself.
function waitFor(pred, ms = 10_000) {
  return new Promise((resolve, reject) => {
    const end = Date.now() + ms;
    const tick = () => { const v = pred(); if (v) resolve(v); else if (Date.now() > end) reject(new Error('timed out')); else setTimeout(tick, 25); };
    tick();
  });
}

test('build state: a build longer than the deploy wait is "still building", never failed, and ends as done by itself', async () => {
  process.env.LIARA_POLL_SECONDS = '0.2';
  try {
    const mark = live.liveEvents().at(-1).id;
    mock.state.slowBuild = { ms: 2500, lines: ['composer install --no-dev', 'npm ci', 'npm run build', 'php artisan config:cache'] };
    const r = await call('deploy', { path: work, app: 'health-app', wait: 1, saveLiaraJson: false });
    assert.equal(r.finished, false);
    assert.equal(r.state, 'BUILDING');
    assert.equal(r.stillBuilding, true);
    assert.match(r.next, /not a failure.*release_status/);
    assert.equal(r.buildTimedOut, undefined, 'still building is not a build timeout');

    // Nobody calls release_status: the plugin follows the release state itself.
    await waitFor(() => live.liveEvents().some((e) => e.id > mark && e.type === 'deploy' && e.phase === 'finished' && e.finished === true));
    await waitFor(() => live.liveEvents().some((e) => e.id > mark && e.type === 'step' && e.tool === 'deploy' && e.status === 'done'));
    const evs = live.liveEvents().filter((e) => e.id > mark);

    // At no moment did the page show the build (or the deploy row) as failed.
    for (let i = 1; i <= evs.length; i += 1) {
      const m = liveModel(evs.slice(0, i));
      const a = m.apps.find((x) => x.name === 'health-app');
      if (!a) continue;
      assert.notEqual(liveStages(a, m.steps, Date.now()).st.build, 'failed', `build shown as failed after event ${evs[i - 1].type}/${evs[i - 1].phase || evs[i - 1].status}`);
    }
    assert.ok(!evs.some((e) => e.type === 'step' && e.tool === 'deploy' && e.status === 'failed'));
    assert.deepEqual(evs.filter((e) => e.type === 'deploy' && e.phase === 'state').map((e) => e.state), ['BUILDING', 'READY'], 'the real release states');
    assert.deepEqual(evs.filter((e) => e.type === 'log').flatMap((e) => e.lines), ['composer install --no-dev', 'npm ci', 'npm run build', 'php artisan config:cache'], 'every build line once');
    assert.ok(evs.some((e) => e.type === 'runtime'), 'runtime logs once it runs');
    const { st } = pageState('health-app', { after: mark });
    assert.equal(st.build, 'done');
    assert.equal(st.run, 'done');
    assert.equal(st.health, 'active', 'now waiting for verify_app');

    // Claude asking afterwards gets the same answer: READY.
    const s2 = await call('release_status', { app: 'health-app', releaseID: r.releaseID });
    assert.equal(s2.state, 'READY');
  } finally {
    delete process.env.LIARA_POLL_SECONDS;
  }
});

test('build state: a release Liara fails after the deploy stopped waiting ends as failed, with the state', async () => {
  process.env.LIARA_POLL_SECONDS = '0.2';
  try {
    const mark = live.liveEvents().at(-1).id;
    mock.state.buildTimeout = 'health-app';
    mock.state.slowBuild = { ms: 1500, lines: ['npm ci'] };
    const r = await call('deploy', { path: work, app: 'health-app', wait: 0, saveLiaraJson: false });
    assert.equal(r.stillBuilding, true);
    const end = await waitFor(() => live.liveEvents().find((e) => e.id > mark && e.type === 'step' && e.tool === 'deploy' && ['done', 'failed'].includes(e.status)));
    assert.equal(end.status, 'failed');
    assert.equal(end.error, 'Release TIMEOUT');
    assert.equal(pageState('health-app', { after: mark }).st.build, 'failed');
  } finally {
    delete process.env.LIARA_POLL_SECONDS;
  }
});

test('logs: Liara\'s TIMEDOUT and UNHEALTHY release states end the wait', async () => {
  const { releaseStatus } = await import('../lib/deploy.mjs');
  const { createClient } = await import('../lib/api.mjs');
  const api = createClient({ cwd: work, teamID: null });
  for (const state of ['TIMEDOUT', 'UNHEALTHY']) {
    const rel = { _id: `rel-${state}`, state, body: {} };
    mock.state.releases['health-app'] = [rel, ...mock.state.releases['health-app']];
    const started = Date.now();
    const s = await releaseStatus(api, { app: 'health-app', releaseID: rel._id, wait: 30 });
    assert.equal(s.finished, true, state);
    assert.equal(s.success, false);
    assert.ok(Date.now() - started < 5000, `${state} did not wait for the deadline`);
  }
  mock.state.releases['health-app'] = mock.state.releases['health-app'].filter((r) => !/^rel-T|^rel-U/.test(r._id));
});
