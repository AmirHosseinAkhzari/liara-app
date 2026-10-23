// Docker services (Neo4j, n8n, any image), disks and Liara cron, against the mock Liara API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let mock; let call; let work; let seen;

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-docker-'));
  fs.cpSync(path.join(here, 'fixtures', 'compose-stack'), work, { recursive: true });
  const { callTool } = await import('../lib/tools.mjs');
  seen = [];
  call = (n, a, elicit = async (p) => { seen.push(p); return { action: 'accept' }; }) => callTool(n, a, { cwd: work, elicit });
  await call('create_app', { app: 'graph-shop', platform: 'node', planID: 'small-g2' });
});
after(async () => {
  await mock.close();
  fs.rmSync(work, { recursive: true, force: true });
});

test('scan: compose services Liara does not manage become docker services; managed ones do not', async () => {
  const r = await call('scan_project', { path: work, checkDns: false });
  const byService = Object.fromEntries(r.dockerServices.map((d) => [d.service, d]));
  assert.deepEqual(Object.keys(byService).sort(), ['automation', 'cache', 'graph']);
  assert.equal(byService.graph.catalog, 'neo4j');
  assert.deepEqual(byService.graph.disks, [{ name: 'data', mountTo: '/data', size: '1' }]);
  assert.equal(byService.automation.catalog, 'n8n');
  assert.equal(byService.automation.tag, '1.70.0');
  assert.match(byService.automation.oneClick, /one-click-apps\/n8n/);
  assert.equal(byService.cache.catalog, null);
  assert.equal(byService.cache.port, 6379);
  assert.deepEqual(byService.cache.disks, [{ name: 'stackdata', mountTo: '/data', size: '1' }]);
  assert.ok(!r.dockerServices.some((d) => /postgres|minio/.test(d.image)), 'Liara DBaaS / object storage cover those');
  assert.deepEqual(r.diskSuggestions.map((d) => d.mountTo), ['uploads']);
  assert.equal(r.cronSuggestions[0].schedule, '0 3 * * *');
  assert.match(r.cronSuggestions[0].command, /fetch\('http:\/\/localhost:3000\/api\/cron\/cleanup'\)/);
  assert.match(r.summary, /Docker services \(own Liara apps\): neo4j:5\.24 \[neo4j\]/);
});

test('deploy_service runs Neo4j in the app\'s network and wires the connection, secrets never shown', async () => {
  seen.length = 0;
  const r = await call('deploy_service', { name: 'graph-shop-neo4j', service: 'neo4j', tag: '5.24', planID: 'small-g2', connectTo: 'graph-shop', wait: 5 });
  assert.match(seen[0].message, /^Run Neo4j as Liara app «graph-shop-neo4j»/);
  assert.match(seen[0].message, /about 475,000 Toman\/month/);
  assert.match(seen[0].message, /NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD on graph-shop/);
  assert.equal(r.success, true);
  assert.equal(r.image, 'neo4j:5.24');
  assert.deepEqual(r.ports, { http: 7474, bolt: 7687 });
  const svc = mock.state.projects['graph-shop-neo4j'];
  assert.equal(svc.type, 'docker');
  assert.equal(svc.network._id, 'net1', 'same network as graph-shop');
  assert.deepEqual(svc.disks, [{ name: 'data', size: 1, status: 'CREATED' }]);
  const rel = mock.state.releases['graph-shop-neo4j'][0].body;
  assert.equal(rel.image, 'neo4j:5.24');
  assert.deepEqual(rel.disks, [{ name: 'data', mountTo: '/data' }]);
  const svcEnv = Object.fromEntries(svc.envs.map((e) => [e.key, e.value]));
  const mainEnv = Object.fromEntries(mock.state.projects['graph-shop'].envs.map((e) => [e.key, e.value]));
  assert.equal(mainEnv.NEO4J_URI, 'bolt://graph-shop-neo4j:7687');
  assert.equal(svcEnv.NEO4J_AUTH, `neo4j/${mainEnv.NEO4J_PASSWORD}`, 'the app gets the password the service uses');
  assert.ok(mainEnv.NEO4J_PASSWORD.length >= 20);
  assert.ok(!JSON.stringify(r).includes(mainEnv.NEO4J_PASSWORD), 'password not in the result');
  // Running it again keeps the same password (no broken connection).
  await call('deploy_service', { name: 'graph-shop-neo4j', service: 'neo4j', tag: '5.24', planID: 'small-g2', connectTo: 'graph-shop', wait: 5 });
  const again = Object.fromEntries(mock.state.projects['graph-shop'].envs.map((e) => [e.key, e.value]));
  assert.equal(again.NEO4J_PASSWORD, mainEnv.NEO4J_PASSWORD);
  // The deployment page's service map gets the link: which app, which env var names (no values).
  const { sessionJournal } = await import('../lib/audit.mjs');
  const { collectFacts } = await import('../lib/report.mjs');
  const node = collectFacts(sessionJournal()).infra.find((i) => i.kind === 'service' && i.name === 'graph-shop-neo4j');
  assert.equal(node.forApp, 'graph-shop');
  assert.deepEqual(node.envVars, ['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD']);
  assert.equal(node.plan, 'small-g2');
  assert.ok(!JSON.stringify(sessionJournal()).includes(mainEnv.NEO4J_PASSWORD), 'no password in the journal');
});

test('deploy_service takes any image (from compose) and checks the reference', async () => {
  await assert.rejects(call('deploy_service', { name: 'x', image: 'bad image; rm -rf /', port: 80, planID: 'small-g2' }), /not a valid image reference/);
  const r = await call('deploy_service', { name: 'graph-shop-cache', image: 'redis/redis-stack-server:7.4.0-v1', port: 6379, disks: [{ name: 'stackdata', mountTo: '/data', size: '1' }], planID: 'small-g2', connectTo: 'graph-shop', wait: 5 });
  assert.equal(r.success, true);
  assert.equal(mock.state.releases['graph-shop-cache'][0].body.image, 'redis/redis-stack-server:7.4.0-v1');
  assert.match(r.notes.join(' '), /check the image docs/);
});

test('connect_disk checks plan space, creates the disk and mounts it via liara.json', async () => {
  const r = await call('connect_disk', { app: 'graph-shop', name: 'uploads', size: '2', mountTo: './uploads/', path: work });
  assert.equal(r.created, true);
  assert.equal(r.mountTo, 'uploads');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(work, 'liara.json'), 'utf8')).disks, [{ name: 'uploads', mountTo: 'uploads' }]);
  await assert.rejects(call('connect_disk', { app: 'graph-shop', name: 'more', size: '4', mountTo: 'more', path: work }), /Not enough disk space on plan small-g2: it has 5 GB, disks already use 2 GB, so at most 3 GB is free/);
  await assert.rejects(call('connect_disk', { app: 'graph-shop', name: 'evil', size: '1', mountTo: '../../etc', path: work }), /must not contain/);
  const d = await call('disks', { app: 'graph-shop' });
  assert.deepEqual([d.planVolumeGB, d.usedGB, d.freeGB], [5, 2, 3]);
});

test('set_cron validates and writes Liara cron; deploy sends cron and disks', async () => {
  await assert.rejects(call('set_cron', { path: work, jobs: [{ schedule: 'every day', command: 'x' }] }), /not a 5-field cron schedule/);
  const r = await call('set_cron', { path: work, jobs: [{ schedule: '0 3 * * *', command: 'node scripts/cleanup.js >> /dev/null 2>&1' }] });
  assert.deepEqual(r.cron, ['0 3 * * * node scripts/cleanup.js >> /dev/null 2>&1']);
  assert.equal(r.documented, false, 'Liara docs show in-app schedulers for node');
  const again = await call('set_cron', { path: work, jobs: [{ schedule: '0 3 * * *', command: 'node scripts/cleanup.js >> /dev/null 2>&1' }] });
  assert.equal(again.cron.length, 1, 'no duplicates');
  const dep = await call('deploy', { path: work, app: 'graph-shop', wait: 5 });
  assert.equal(dep.success, true);
  const body = mock.state.releases['graph-shop'][0].body;
  assert.deepEqual(body.cron, ['0 3 * * * node scripts/cleanup.js >> /dev/null 2>&1']);
  assert.deepEqual(body.disks, [{ name: 'uploads', mountTo: 'uploads' }]);
});

test('a liara.json with "image" deploys the image instead of uploading files', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-n8n-'));
  fs.writeFileSync(path.join(dir, 'liara.json'), JSON.stringify({ app: 'graph-shop-n8n', image: 'n8nio/n8n:1.70.0', port: 5678, platform: 'docker', disks: [{ name: 'data', mountTo: '/home/node/.n8n' }] }));
  await call('create_app', { app: 'graph-shop-n8n', platform: 'docker', planID: 'small-g2' });
  const uploads = mock.state.uploads.length;
  const dep = await call('deploy', { path: dir, wait: 5 });
  assert.equal(dep.success, true);
  assert.equal(mock.state.uploads.length, uploads, 'nothing uploaded');
  assert.equal(mock.state.releases['graph-shop-n8n'][0].body.image, 'n8nio/n8n:1.70.0');
});
