// Teams: list them, choose one, and check every call then goes to that team (teamID),
// that the choice is saved in liara.json like the Liara CLI, and that switching back works.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEAM2 = 'aaaaaaaaaaaaaaaaaaaaaaa2';
let mock; let callTool; let rawCall; let setChosenTeam; let workdir;
const liaraJson = () => JSON.parse(fs.readFileSync(path.join(workdir, 'liara.json'), 'utf8'));

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  ({ callTool: rawCall } = await import('../lib/tools.mjs'));
  // A user who accepts every confirmation dialog.
  callTool = (n, a, o = {}) => rawCall(n, a, { elicit: async () => ({ action: 'accept' }), ...o });
  ({ setChosenTeam } = await import('../lib/teams.mjs'));
  workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-teams-'));
  fs.cpSync(path.join(here, 'fixtures', 'express-plain'), workdir, { recursive: true });
});
after(async () => {
  await mock.close();
  fs.rmSync(workdir, { recursive: true, force: true });
});
// Each test starts like a new Claude session: nothing chosen yet.
beforeEach(() => setChosenTeam(undefined));

const call = (name, args = {}) => callTool(name, args, { cwd: workdir });
const callsSince = (mark) => mock.state.calls.slice(mark);

test('whoami lists the teams with roles and asks where to work', async () => {
  const r = await call('whoami');
  assert.equal(r.workingIn.type, 'personal');
  assert.equal(r.chooseAccount, true);
  assert.deepEqual(r.teams.map((t) => [t.name, t.role, t.canDeploy]), [['تیم ۲', 'مالک', true], ['Viewers', 'viewer', false]]);
});

test('a team where the user can only view is refused', async () => {
  await assert.rejects(call('teams', { use: 'Viewers' }), /can't deploy apps there/);
});

test('an unknown team name lists the real ones', async () => {
  await assert.rejects(call('teams', { use: 'team 9' }), /Your teams: "تیم ۲"/);
});

test('choosing a team sends every call there and saves team-id in liara.json', async () => {
  const chose = await call('teams', { use: 'تیم 2' }); // Latin digit still matches "تیم ۲"
  assert.deepEqual(chose.workingIn, { type: 'team', id: TEAM2, name: 'تیم ۲', source: 'chosen with the teams tool' });

  const mark = mock.state.calls.length;
  const app = await call('create_app', { app: 'team-app', platform: 'node', planID: 'small-g2' });
  assert.equal(app.account.type, 'team');
  await call('connect_database', { app: 'team-app', platform: 'node', create: { type: 'postgres', hostname: 'team-app-db', planID: 'db-small', version: '17' } });
  await call('set_envs', { app: 'team-app', vars: { NODE_ENV: 'production' } });
  const dep = await call('deploy', { path: workdir, app: 'team-app', wait: 5 });
  assert.equal(dep.success, true);
  assert.equal(dep.account.id, TEAM2);

  const calls = callsSince(mark);
  const elsewhere = calls.filter((c) => c.teamID !== TEAM2 && c.call !== 'GET paas/v2/teams');
  assert.deepEqual(elsewhere, [], 'every resource call carries the team');
  assert.equal(mock.state.projects['team-app'].team, TEAM2);
  assert.equal(Object.values(mock.state.databases).at(-1).team, TEAM2);
  assert.equal(liaraJson()['team-id'], TEAM2);
});

test('a new session picks the team up from liara.json', async () => {
  const r = await call('whoami');
  assert.equal(r.workingIn.type, 'team');
  assert.equal(r.workingIn.source, 'liara.json "team-id"');
  assert.equal(r.chooseAccount, false);
  const status = await call('release_status', { app: 'team-app' });
  assert.equal(status.state, 'READY');
  assert.equal(mock.state.calls.at(-1).teamID, TEAM2);
});

test('one call can target another account with the team argument', async () => {
  // The team app is not visible from the personal account.
  await assert.rejects(call('get_envs', { app: 'team-app', team: 'personal' }), /not found \(looked in the personal account\)\. If it belongs to a team/);
  assert.equal(mock.state.calls.at(-1).teamID, null);
});

test('switching back to personal deploys there and removes team-id', async () => {
  await call('teams', { use: 'personal' });
  await call('create_app', { app: 'solo-app', platform: 'node', planID: 'small-g2' });
  const dep = await call('deploy', { path: workdir, app: 'solo-app', wait: 5 });
  assert.equal(dep.success, true);
  assert.equal(dep.account.type, 'personal');
  assert.equal(mock.state.projects['solo-app'].team, null);
  assert.equal(liaraJson()['team-id'], undefined);
  assert.equal(liaraJson().app, 'solo-app');
});
