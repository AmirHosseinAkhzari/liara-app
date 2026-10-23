// Package mirrors: Liara's first, a backup from the Mirava list when a build cannot download
// packages, set only in the uploaded copy (the project files never change).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';
import { mirrorFailure, mirrorFiles, checkMirrors, pickBackup, ecosystemsOf, MIRRORS } from '../lib/mirrors.mjs';
import { createArchive } from '../lib/archive.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let mock; let work; let appServer; let mirrorServer; let raw; let resetConsent;
const down = new Set(); // mirror ids that do not answer
const call = (n, a) => raw(n, a, { cwd: work, elicit: async () => ({ action: 'accept' }) });

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  appServer = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  await new Promise((r) => appServer.listen(0, '127.0.0.1', r));
  process.env.LIARA_APP_URL_TEMPLATE = `http://127.0.0.1:${appServer.address().port}`;
  // Every mirror is this local server: /<id>/<ecosystem>/... answers like a registry.
  mirrorServer = http.createServer((req, res) => {
    const [, id, eco] = req.url.split('/');
    if (down.has(id)) { res.writeHead(503); res.end('down'); return; }
    const body = { npm: '{"name":"express","_id":"express"}', pypi: '<a href="requests-2.32.3.tar.gz">requests-2.32.3.tar.gz</a>', composer: '{"packages":[],"metadata-url":"/p2/%package%.json"}', go: 'v1.9.0\nv1.10.0\n', nuget: '{"version":"3.0.0","resources":[]}' }[eco];
    res.writeHead(body ? 200 : 404); res.end(body || '');
  });
  await new Promise((r) => mirrorServer.listen(0, '127.0.0.1', r));
  process.env.LIARA_MIRROR_URL_TEMPLATE = `http://127.0.0.1:${mirrorServer.address().port}/{id}/{eco}/`;
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-mirror-'));
  fs.cpSync(path.join(here, 'fixtures', 'express-plain'), work, { recursive: true });
  ({ callTool: raw } = await import('../lib/tools.mjs'));
  ({ resetConsent } = await import('../lib/consent.mjs'));
  await call('create_app', { app: 'mirror-app', platform: 'node', planID: 'medium-g2', bundlePlanID: 'basic' });
});
after(async () => {
  await mock.close();
  appServer.close();
  mirrorServer.close();
  fs.rmSync(work, { recursive: true, force: true });
});
beforeEach(() => {
  resetConsent();
  down.clear();
  mock.state.mirrorDown = false;
});

test('mirror failures are told apart from code errors', () => {
  assert.deepEqual(mirrorFailure('npm error code ETIMEDOUT\nnpm error network request to https://package-mirror.liara.ir/repository/npm/express failed'), ['npm']);
  assert.deepEqual(mirrorFailure('Failed to download laravel/framework from dist: curl error 28 while downloading https://package-mirror.liara.ir/repository/composer/x: Operation timed out'), ['composer']);
  assert.deepEqual(mirrorFailure("WARNING: Retrying (Retry(total=4)) after connection broken by 'ReadTimeoutError(...)': /simple/django/\nERROR: Could not fetch URL https://package-mirror.liara.ir/repository/pypi/simple/django/"), ['pypi']);
  assert.deepEqual(mirrorFailure('error NU1301: Unable to load the service index for source https://package-mirror.liara.ir/repository/nuget/index.json.'), ['nuget']);
  assert.deepEqual(mirrorFailure('go: github.com/gin-gonic/gin@v1.10.0: Get "https://package-mirror.liara.ir/repository/go/github.com/gin-gonic/gin/@v/v1.10.0.mod": dial tcp: i/o timeout'), ['go']);
  for (const log of ["Error: Cannot find module 'express'", 'npm ERR! missing script: start', 'error TS2304: Cannot find name', 'Your requirements could not be resolved to an installable set of packages.']) {
    assert.deepEqual(mirrorFailure(log), [], log);
  }
});

test('mirror settings for each package manager keep the rest of the file', () => {
  const m = { id: 'runflare', name: 'Runflare', url: 'https://mirror-npm.runflare.com/' };
  const files = { '.npmrc': 'registry=https://package-mirror.liara.ir/repository/npm/\nlegacy-peer-deps=true\n', 'requirements.txt': '-i https://old/simple\nDjango==5.0\n', 'composer.json': '{"require":{"laravel/framework":"^11.0"},"repositories":[{"type":"vcs","url":"https://github.com/x/y"}]}' };
  const read = (rel) => files[rel] ?? null;
  assert.equal(mirrorFiles('npm', m, read).files['.npmrc'], 'legacy-peer-deps=true\nregistry=https://mirror-npm.runflare.com/\n');
  assert.equal(mirrorFiles('pypi', { ...m, url: 'https://mirror-pypi.runflare.com/simple/' }, read).files['requirements.txt'], '--index-url https://mirror-pypi.runflare.com/simple/\nDjango==5.0\n');
  const composer = JSON.parse(mirrorFiles('composer', { ...m, url: 'https://mirror-composer.runflare.com/' }, read).files['composer.json']);
  assert.deepEqual(composer.repositories, [{ type: 'composer', url: 'https://mirror-composer.runflare.com' }, { type: 'vcs', url: 'https://github.com/x/y' }, { 'packagist.org': false }]);
  assert.deepEqual(composer.require, { 'laravel/framework': '^11.0' });
  assert.match(mirrorFiles('nuget', { ...m, url: 'https://mirror-nuget.runflare.com/v3/index.json' }, read).files['nuget.config'], /<clear \/>[\s\S]*value="https:\/\/mirror-nuget\.runflare\.com\/v3\/index\.json"/);
  assert.equal(mirrorFiles('go', m, read), null, 'Go has no project file for its proxy');
  assert.deepEqual(ecosystemsOf(['package.json', 'composer.json', 'api/requirements.txt', 'go.mod', 'App.csproj']), ['npm', 'pypi', 'composer', 'go', 'nuget']);
});

test('the catalog starts with Liara and lists Mirava backups for every package manager', () => {
  for (const [eco, list] of Object.entries(MIRRORS)) {
    assert.equal(list[0].id, 'liara', eco);
    assert.ok(list.length >= 3, `${eco} has backups`);
    for (const m of list) assert.match(m.url, /^https:\/\//);
  }
});

test('checkMirrors makes a real request to each; the backup is the first one that answers', async () => {
  down.add('liara'); down.add('runflare');
  const r = await checkMirrors(['npm', 'composer']);
  assert.deepEqual(r.mirrors.npm.map((m) => [m.id, m.ok]), [['liara', false], ['runflare', false], ['chabokan', true], ['kargadan', true]]);
  assert.equal((await pickBackup('npm')).id, 'chabokan');
  down.add('chabokan'); down.add('kargadan');
  assert.equal(await pickBackup('npm'), null);
});

test('overrides go into the uploaded copy only', () => {
  const a = createArchive(work, { overrides: { '.npmrc': 'registry=https://x/\n' } });
  try {
    assert.equal(execFileSync('tar', ['-xOzf', a.file, '.npmrc']).toString(), 'registry=https://x/\n');
    assert.ok(!fs.existsSync(path.join(work, '.npmrc')), 'the project folder is unchanged');
  } finally {
    a.cleanup();
  }
});

test('deploy: Liara\'s npm mirror is down → one more build with a working backup, project unchanged', async () => {
  mock.state.mirrorDown = true;
  down.add('liara');
  const uploads = mock.state.uploads.length;
  const r = await call('deploy', { path: work, app: 'mirror-app', wait: 5, saveLiaraJson: false });
  assert.equal(r.success, true);
  assert.equal(r.packageMirror.used[0].mirror, 'runflare');
  assert.equal(r.packageMirror.used[0].ecosystem, 'npm');
  assert.match(r.packageMirror.reason, /could not download npm packages/);
  assert.ok(r.steps.some((s) => /package mirror: Runflare for npm/.test(s)));
  const ups = mock.state.uploads.slice(uploads);
  assert.equal(ups.length, 2, 'first build, then the build with the backup mirror');
  assert.equal(ups[0].contents['.npmrc'], undefined);
  assert.match(ups[1].contents['.npmrc'], /^registry=http:\/\/127\.0\.0\.1:\d+\/runflare\/npm\/$/m);
  assert.ok(!fs.existsSync(path.join(work, '.npmrc')), 'the user\'s project is not changed');
});

test('deploy: mirror "off" never switches, and diagnose names the mirror as the cause', async () => {
  mock.state.mirrorDown = true;
  const r = await call('deploy', { path: work, app: 'mirror-app', wait: 5, saveLiaraJson: false, mirror: 'off' });
  assert.equal(r.success, false);
  assert.equal(r.packageMirror, undefined);
  const d = await call('diagnose', { app: 'mirror-app' });
  assert.equal(d.category, 'package-mirror');
  assert.match(d.suggestedFix, /Mirava/);
});

test('deploy: mirror "<provider>" uses it from the first build', async () => {
  const uploads = mock.state.uploads.length;
  const r = await call('deploy', { path: work, app: 'mirror-app', wait: 5, saveLiaraJson: false, mirror: 'chabokan' });
  assert.equal(r.success, true);
  assert.equal(r.packageMirror.used[0].mirror, 'chabokan');
  assert.equal(mock.state.uploads.length, uploads + 1);
  assert.match(mock.state.uploads.at(-1).contents['.npmrc'], /chabokan\/npm/);
});

test('mirrors tool reports each mirror', async () => {
  down.add('kargadan');
  const r = await call('mirrors', { ecosystems: ['nuget'] });
  assert.deepEqual(r.mirrors.nuget.map((m) => [m.id, m.ok]), [['liara', true], ['runflare', true], ['kargadan', false]]);
  assert.match(r.source, /Mirava/);
});
