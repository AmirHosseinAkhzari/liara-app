// Browser login flow with a fake console, plus fallback from a stale .env token.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startMock } from './mock-liara.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-login-'));
process.env.LIARA_AUTH_FILE = path.join(dir, 'auth.json');
process.env.LIARA_CONSOLE_URL = 'https://console.liara.ir';
delete process.env.LIARA_API_TOKEN;
delete process.env.LIARA_TOKEN;

let mock; let login; let tools;
before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  login = await import('../lib/login.mjs');
  tools = await import('../lib/tools.mjs');
});
after(async () => {
  await mock.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

// Pretends to be the console: decode the callback from the login URL and POST the accounts.
function fakeConsole({ origin = 'https://console.liara.ir', delayMs = 50 } = {}) {
  return async (url) => {
    const query = Buffer.from(new URL(url).search.slice(1), 'base64').toString();
    const callback = new URLSearchParams(query).get('callbackURL');
    setTimeout(async () => {
      const pre = await fetch(`http://${callback}`, { method: 'OPTIONS' });
      assert.equal(pre.headers.get('access-control-allow-origin'), 'https://console.liara.ir');
      await fetch(`http://${callback}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify({ data: [
          { email: 'team@example.com', token: 'other-token', fullname: 'Team', current: false, region: 'iran' },
          { email: 't@example.com', token: 'test-token', fullname: 'Test User', current: true, region: 'iran' },
        ] }),
      }).catch(() => {});
    }, delayMs);
    return true;
  };
}

test('login URL matches the Liara CLI format', async () => {
  let seen;
  const res = await login.browserLogin({ wait: 5, openBrowserFn: async (url) => { seen = url; return fakeConsole()(url); } });
  const u = new URL(seen);
  assert.equal(u.origin + u.pathname, 'https://console.liara.ir/login');
  assert.match(Buffer.from(u.search.slice(1), 'base64').toString(), /^cli=v1&callbackURL=localhost:30\d\d\/callback&client=cli$/);
  assert.equal(res.loggedIn, true);
  assert.equal(res.current, 't');
});

test('saved file uses the Liara CLI layout', () => {
  const conf = JSON.parse(fs.readFileSync(process.env.LIARA_AUTH_FILE, 'utf8'));
  assert.equal(conf.version, '1');
  assert.equal(conf.accounts.t.api_token, 'test-token');
  assert.equal(conf.accounts.t.current, true);
  assert.equal(conf.accounts.team.current, false);
  assert.equal(fs.statSync(process.env.LIARA_AUTH_FILE).mode & 0o777, 0o600);
});

test('callbacks from other origins are refused', async () => {
  const res = await login.browserLogin({ wait: 1, openBrowserFn: fakeConsole({ origin: 'https://evil.example' }) });
  assert.equal(res.waiting, true);
  assert.ok(res.loginUrl.startsWith('https://console.liara.ir/login?'));
});

test('a stale project .env token falls through to the browser login', async () => {
  const project = fs.mkdtempSync(path.join(dir, 'proj-'));
  fs.writeFileSync(path.join(project, '.env'), 'LIARA_API_TOKEN=expired-token\n');
  const { createClient } = await import('../lib/api.mjs');
  const api = createClient({ cwd: project });
  const me = await api.get('account', '/v1/me');
  assert.equal(me.user.email, 't@example.com');
  assert.match(api.auth.source, /browser login \(t\)/);
});

test('login tool never returns the token', async () => {
  // a fresh login (the refused one above is still pending, so this continues it)
  const res = await tools.callTool('accounts');
  assert.ok(!JSON.stringify(res).includes('test-token'));
  assert.deepEqual(res.accounts.map((a) => a.name).sort(), ['t', 'team']);
});

test('switch and remove accounts', async () => {
  assert.equal(login.useAccount('team').current, 'team');
  const out = login.logout('team');
  assert.equal(out.removed, 'team');
  assert.equal(out.current, 't');
});

test('not logged in at all → message points to login', async () => {
  fs.rmSync(process.env.LIARA_AUTH_FILE);
  const { createClient } = await import('../lib/api.mjs');
  await assert.rejects(createClient({ cwd: dir }).get('account', '/v1/me'), /Not logged in to Liara\. Use the login tool/);
});
