// Plans and prices, cost estimates, billing (personal and team), VPS lifecycle and app delete.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startMock } from './mock-liara.mjs';

let mock; let raw; let resetConsent; let clearPriceCache;
const accept = async () => ({ action: 'accept' });
const call = (n, a, elicit = accept) => raw(n, a, { elicit });

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  ({ callTool: raw } = await import('../lib/tools.mjs'));
  ({ resetConsent } = await import('../lib/consent.mjs'));
  ({ clearPriceCache } = await import('../lib/pricing.mjs'));
});
after(() => mock.close());
beforeEach(() => { resetConsent(); clearPriceCache(); });

test('plans per product, cheapest first, with source and time', async () => {
  const vps = await call('plans', { product: 'vps' });
  assert.deepEqual(vps.plans.map((p) => [p.id, p.monthlyToman, p.ipv4MonthlyToman]), [['standard-base-g2', 900000, 100000]]);
  assert.deepEqual(vps.operatingSystems, [{ name: 'ubuntu', versions: ['24.04', '22.04'] }, { name: 'debian', versions: ['12.9'] }]);
  assert.match(vps.source, /iaas-api\.liara\.ir\/plans/);
  assert.ok(Date.parse(vps.fetchedAt));
  const ai = await call('plans', { product: 'ai' });
  assert.deepEqual(ai.models[0].pricePerToken, { prompt: '0.000002', completion: '0.00001' });
  assert.equal(ai.models.length, 23, 'all pages read');
  assert.match(ai.unit, /does not state the currency/);
  const apps = await call('plans', { product: 'apps', compare: ['medium-g2'] });
  assert.deepEqual(apps.plans.map((p) => p.id), ['medium-g2']);
});

test('estimate_cost adds up live prices and says what is left out', async () => {
  const e = await call('estimate_cost', { items: [{ kind: 'app', plan: 'medium-g2', bundle: 'basic' }, { kind: 'vps', plan: 'standard-base-g2', ipv4: true }, { kind: 'database', plan: 'nope' }] });
  assert.equal(e.totalMonthlyToman, 720000 + 275000 + 900000 + 100000);
  assert.equal(e.complete, false);
  assert.ok(e.notes.some((n) => /taxes/.test(n)));
  assert.equal(e.estimate, true);
});

test('billing: personal balance, estimated spend, runway; never contact details', async () => {
  await call('create_app', { app: 'paid-app', platform: 'node', planID: 'small-g2' });
  mock.state.projects['paid-app'].scale = 0;
  const b = await call('billing', {});
  assert.equal(b.account.type, 'personal');
  assert.equal(b.account.balanceToman, 1_000_000);
  assert.ok(b.resources.some((r) => r.name === 'paid-app' && r.monthlyToman === 475000 && r.state === 'stopped'));
  assert.equal(b.balanceLastsAboutDays, Math.floor(1_000_000 / (b.estimatedMonthlyToman / 30)));
  assert.ok(b.worthChecking.some((c) => /paid-app is stopped/.test(c)));
  assert.ok(!JSON.stringify(b).includes('SHOULD-NOT-LEAK'));
  assert.ok(b.notAvailableViaApi.includes('invoices and payment history'));
});

test('billing in a team shows the team balance, not the personal one', async () => {
  const b = await call('billing', { team: 'تیم ۲' });
  assert.equal(b.account.type, 'team');
  assert.equal(b.account.balanceToman, 50000);
  assert.equal(b.account.name, 'تیم ۲');
});

test('VPS: checked first, priced in the dialog, created, no root password anywhere', async () => {
  const before = mock.state.vms.length;
  await assert.rejects(call('create_vm', { name: 'web-1', os: 'windows-xp', plan: 'standard-base-g2' }), /OS "windows-xp" is not offered\. Choose one of: ubuntu-24\.04, ubuntu-22\.04, debian-12\.9/);
  await assert.rejects(call('create_vm', { name: 'web-1', os: 'ubuntu-24.04', plan: 'old' }), /not available/);
  await assert.rejects(call('create_vm', { name: 'web-1', os: 'ubuntu-24.04', plan: 'standard-base-g2', sshKeys: ['-----BEGIN OPENSSH PRIVATE KEY-----'] }), /never private keys/);
  assert.equal(mock.state.vms.length, before, 'nothing created');

  const seen = [];
  const r = await call('create_vm', { name: 'web-1', os: 'ubuntu-24.04', plan: 'standard-base-g2', sshKeys: ['ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample user@laptop'], wait: 5 }, async (p) => { seen.push(p); return { action: 'accept' }; });
  assert.match(seen[0].message, /Create VPS «web-1»/);
  assert.match(seen[0].message, /about 900,000 Toman\/month/);
  assert.equal(r.created, true);
  assert.equal(r.ready, true);
  assert.deepEqual(r.vm.ips, ['185.1.2.3 (IPv4)']);
  assert.match(r.nextSteps[0], /ssh root@185\.1\.2\.3/);
  assert.ok(!JSON.stringify(r).includes('ROOT-PW-NEVER-SHOW'));
  const details = await call('vps_list', { vm: 'web-1' });
  assert.ok(!JSON.stringify(details).includes('ROOT-PW-NEVER-SHOW'));
  assert.equal((await call('create_vm', { name: 'web-1', os: 'ubuntu-24.04', plan: 'standard-base-g2', wait: 1 })).created, false, 'no duplicate');
});

test('VPS power and delete ask first; delete needs the typed name', async () => {
  const reboot = await call('vm_action', { vm: 'web-1', action: 'reboot' });
  assert.equal(reboot.requested, true);
  assert.equal(mock.state.vms[0].lastAction, 'reboot');
  const wrong = await call('vm_action', { vm: 'web-1', action: 'delete' }, async () => ({ action: 'accept', content: { confirm: 'web-2' } }));
  assert.equal(wrong.cancelled, true);
  assert.equal(mock.state.vms.length, 1);
  const ok = await call('vm_action', { vm: 'web-1', action: 'delete' }, async () => ({ action: 'accept', content: { confirm: 'web-1' } }));
  assert.equal(ok.deleted, true);
  assert.equal(mock.state.vms.length, 0);
});

test('delete_app needs the typed name and reports the real result', async () => {
  const no = await call('delete_app', { app: 'paid-app' }, async () => ({ action: 'decline' }));
  assert.equal(no.cancelled, true);
  assert.ok(mock.state.projects['paid-app']);
  const yes = await call('delete_app', { app: 'paid-app' }, async () => ({ action: 'accept', content: { confirm: 'paid-app' } }));
  assert.equal(yes.deleted, true);
  assert.equal(mock.state.projects['paid-app'], undefined);
});
