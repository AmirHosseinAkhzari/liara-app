// get_envs masking and connect_storage access keys, against the mock Liara API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startMock } from './mock-liara.mjs';

let mock; let callTool; let rawCall;
before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  ({ callTool: rawCall } = await import('../lib/tools.mjs'));
  // A user who accepts every confirmation dialog.
  callTool = (n, a, o = {}) => rawCall(n, a, { elicit: async () => ({ action: 'accept' }), ...o });
  await callTool('create_app', { app: 'cafe-crm', platform: 'node', planID: 'small-g2' });
});
after(() => mock.close());

test('get_envs hides credentials in URLs whatever the variable is called', async () => {
  const secrets = {
    DATABASE_URL: 'postgresql://root:Sup3rSecretPw@cafe-crm-db:5432/postgres',
    REDIS_URL: 'redis://:RedisPw99@cache:6379/0',
    MONGODB_URI: 'mongodb://admin:MongoPw77@mongo:27017/app?authSource=admin',
    SENTRY_DSN: 'https://abcdef0123456789key@o1.ingest.sentry.io/42',
    WEBHOOK: 'https://hooks.example.com/notify?token=TokInQuery55&channel=ops',
    SQLSERVER: 'Server=db;Database=app;User Id=sa;Password=MsSqlPw33;',
  };
  await callTool('set_envs', { app: 'cafe-crm', vars: { ...secrets, NODE_ENV: 'production', PUBLIC_SITE: 'https://cafe.example.com' } });
  const envs = await callTool('get_envs', { app: 'cafe-crm' });
  const out = JSON.stringify(envs);
  for (const leak of ['Sup3rSecretPw', 'RedisPw99', 'MongoPw77', 'abcdef0123456789key', 'TokInQuery55', 'MsSqlPw33']) {
    assert.ok(!out.includes(leak), `${leak} leaked: ${out}`);
  }
  assert.equal(envs.DATABASE_URL, 'postgresql://root:****@cafe-crm-db:5432/postgres');
  assert.equal(envs.SENTRY_DSN, 'https://****@o1.ingest.sentry.io/42');
  assert.match(envs.WEBHOOK, /token=\*\*\*\*&channel=ops/);
  // plain values stay readable
  assert.equal(envs.NODE_ENV, 'production');
  assert.equal(envs.PUBLIC_SITE, 'https://cafe.example.com');
});

const S3_KEYS = ['S3_BUCKET', 'S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'];

test('connect_storage asks for the key with plain bucket names', async () => {
  const r = await callTool('connect_storage', { app: 'cafe-crm', bucket: 'cafe-crm-photos', platform: 'node', envKeys: S3_KEYS, create: { plan: '20g-g2', permission: 'private' } });
  assert.equal(r.success, true);
  assert.deepEqual(mock.state.keys.at(-1).buckets, ['cafe-crm-photos']);
  assert.deepEqual(Object.keys(r.envVars).sort(), [...S3_KEYS].sort());
  assert.ok(!JSON.stringify(r).includes('liara-secret-123'), 'secret masked');
});

test('when no key can be made, the other S3 vars are still written', async () => {
  mock.state.failKeys = true;
  try {
    const r = await callTool('connect_storage', { app: 'cafe-crm', bucket: 'cafe-crm-docs', platform: 'node', envKeys: S3_KEYS, create: { plan: '20g-g2' } });
    assert.equal(r.success, false);
    assert.match(r.error, /access key quota reached/);
    assert.deepEqual(r.missingEnvKeys, ['S3_ACCESS_KEY', 'S3_SECRET_KEY']);
    assert.match(r.nextStep, /S3_ACCESS_KEY and S3_SECRET_KEY/);
    const app = Object.fromEntries(mock.state.projects['cafe-crm'].envs.map((e) => [e.key, e.value]));
    assert.equal(app.S3_BUCKET, 'cafe-crm-docs');
    assert.equal(app.S3_ENDPOINT, 'https://storage.c2.liara.space');
    assert.equal(app.S3_REGION, 'us-east-1');
  } finally {
    mock.state.failKeys = false;
  }
});

test('plans shows monthly prices, bundles and which plans need a network', async () => {
  const p = await callTool('plans');
  assert.equal(p.apps['small-g2'].monthlyToman, 475000);
  assert.equal(p.apps['medium-g2'].monthlyToman, 720000, 'hourly price × 720');
  assert.equal(p.apps['medium-g2'].needsNetwork, true);
  assert.deepEqual(p.apps['medium-g2'].bundles, [{ id: 'basic', monthlyToman: 275000 }, { id: 'pro', monthlyToman: 825000 }]);
  assert.equal(p.apps.old, undefined);
});

test('a plan that needs a bundle says which ones and what they cost, before calling Liara', async () => {
  const before = mock.state.createdProjects.length;
  await assert.rejects(callTool('create_app', { app: 'b1', platform: 'node', planID: 'medium-g2' }),
    /needs a feature bundle \(bundlePlanID\): basic \(275,000 Toman\/month\), pro \(825,000 Toman\/month\)/);
  await assert.rejects(callTool('create_app', { app: 'b1', platform: 'node', planID: 'medium-g2', bundlePlanID: 'free' }),
    /Bundle "free" isn't available for app plan "medium-g2"\. Available: basic/);
  assert.equal(mock.state.createdProjects.length, before, 'nothing sent to Liara');
  const ok = await callTool('create_app', { app: 'b1', platform: 'node', planID: 'medium-g2', bundlePlanID: 'basic' });
  assert.equal(ok.created, true);
  assert.equal(mock.state.createdProjects.at(-1).bundlePlanID, 'basic');
});

test('g2 plans reuse the only network, create one on request, or ask which', async () => {
  const saved = mock.state.networks;
  try {
    const one = await callTool('create_app', { app: 'g2-one', platform: 'node', planID: 'small-g2' });
    assert.equal(mock.state.createdProjects.at(-1).network, 'net1');
    assert.match(one.steps.join(), /using private network test-net/);

    mock.state.networks = [];
    await assert.rejects(callTool('create_app', { app: 'g2-none', platform: 'node', planID: 'small-g2' }), /has none\. Ask the user, then pass createNetwork/);
    const made = await callTool('create_app', { app: 'g2-new', platform: 'node', planID: 'small-g2', createNetwork: 'cafe-net' });
    assert.match(made.steps.join(), /created private network cafe-net/);
    assert.equal(mock.state.createdProjects.at(-1).network, mock.state.networks.find((n) => n.name === 'cafe-net')._id);

    // the database joins the same network by name
    await callTool('connect_database', { create: { type: 'postgres', hostname: 'g2-db', planID: 'small-g2', network: 'cafe-net' } });
    assert.equal(Object.values(mock.state.databases).at(-1).network, mock.state.networks.find((n) => n.name === 'cafe-net')._id);

    mock.state.networks.push({ _id: 'net9', name: 'other-net' });
    await assert.rejects(callTool('create_app', { app: 'g2-two', platform: 'node', planID: 'small-g2' }), /Pass network: "cafe-net" or "other-net"/);
  } finally {
    mock.state.networks = saved;
  }
});

test('accounts on private networking put every new app in the network, not only g2', async () => {
  mock.state.privateNetworkFeature = true;
  mock.state.projects['plain-plan'] = undefined;
  try {
    const r = await callTool('create_app', { app: 'plain-plan', platform: 'node', planID: 'free' });
    assert.equal(r.created, true);
    assert.equal(mock.state.createdProjects.at(-1).network, 'net1');
    assert.match(r.steps.join(), /using private network test-net \(this account uses private networks for all new resources\)/);
  } finally {
    mock.state.privateNetworkFeature = false;
  }
});

test('new apps go on g2 plans: older plans are refused early with a clear reason', async () => {
  mock.state.balance = 1_000_000;
  await assert.rejects(callTool('create_app', { app: 'old-plan', platform: 'node', planID: 'ir-small' }), /older plan that Liara no longer creates new apps on/);
  const p = await callTool('plans', {});
  assert.ok(Object.keys(p.apps).every((id) => /-g2$|^free$/.test(id)), Object.keys(p.apps).join(','));
});
