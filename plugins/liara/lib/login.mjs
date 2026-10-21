// Browser login, same flow as `liara login` (Liara CLI 9.x):
// open console.liara.ir/login with a localhost callback, the console POSTs the
// account tokens back, and we save them to ~/.liara-auth.json (shared with the CLI).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

export const AUTH_FILE = process.env.LIARA_AUTH_FILE || path.join(os.homedir(), '.liara-auth.json');
const CONSOLE = process.env.LIARA_CONSOLE_URL || 'https://console.liara.ir';
const CORS = {
  'Access-Control-Allow-Origin': CONSOLE,
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Allow-Headers': '*',
  Connection: 'close',
};

let pending = null; // one login at a time; survives between tool calls

export function readAuthFile() {
  try {
    const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    return { version: '1', accounts: {}, ...data };
  } catch {
    return { version: '1', accounts: {} };
  }
}

function writeAuthFile(conf) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(conf), { mode: 0o600 });
}

export function saveAccounts(list) {
  const conf = readAuthFile();
  let current = null;
  for (const a of list) {
    if (!a?.email || !a?.token) continue;
    const name = a.email.split('@')[0];
    conf.accounts[name] = { email: a.email, avatar: a.avatar, api_token: a.token, fullname: a.fullname, region: a.region, current: false };
    if (a.current) current = name;
  }
  const names = Object.keys(conf.accounts);
  current ||= list.length ? list[0].email.split('@')[0] : null;
  for (const n of names) conf.accounts[n].current = n === current;
  writeAuthFile(conf);
  return { current, accounts: names };
}

export function logout(account) {
  const conf = readAuthFile();
  const name = account || Object.keys(conf.accounts).find((n) => conf.accounts[n].current);
  if (!name || !conf.accounts[name]) return { removed: null, accounts: Object.keys(conf.accounts) };
  delete conf.accounts[name];
  const rest = Object.keys(conf.accounts);
  if (rest.length && !rest.some((n) => conf.accounts[n].current)) conf.accounts[rest[0]].current = true;
  writeAuthFile(conf);
  return { removed: name, accounts: rest, current: rest.find((n) => conf.accounts[n].current) || null };
}

export function useAccount(name) {
  const conf = readAuthFile();
  if (!conf.accounts[name]) throw new Error(`No saved account "${name}". Saved: ${Object.keys(conf.accounts).join(', ') || 'none'}`);
  for (const n of Object.keys(conf.accounts)) conf.accounts[n].current = n === name;
  writeAuthFile(conf);
  return { current: name };
}

function openBrowser(url) {
  const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
      : ['xdg-open', [url]];
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
      child.on('error', () => resolve(false));
      child.on('spawn', () => { child.unref(); resolve(true); });
    } catch {
      resolve(false);
    }
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(port));
  });
}

async function startLogin({ timeoutSeconds, openBrowserFn = openBrowser }) {
  let resolveData; let rejectData;
  const result = new Promise((res, rej) => { resolveData = res; rejectData = rej; });
  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
    if (req.url !== '/callback' || req.method !== 'POST') { res.writeHead(404, CORS); res.end(); return; }
    // Only the Liara console may hand us tokens.
    if (req.headers.origin && req.headers.origin !== CONSOLE) { res.writeHead(403, CORS); res.end(); return; }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let data;
    try {
      data = JSON.parse(Buffer.concat(chunks).toString() || '{}').data;
    } catch {
      data = null;
    }
    res.writeHead(Array.isArray(data) ? 200 : 400, CORS);
    res.end();
    if (Array.isArray(data) && data.some((a) => a?.token)) resolveData(data);
  });

  let port = null;
  for (let p = 3001; p <= 3100 && !port; p++) {
    try {
      port = await listen(server, p);
    } catch {
      // port busy, try next
    }
  }
  if (!port) throw new Error('No free local port between 3001 and 3100 for the login callback.');

  const query = `cli=v1&callbackURL=localhost:${port}/callback&client=cli`;
  const url = `${CONSOLE}/login?${Buffer.from(query).toString('base64')}`;
  const timer = setTimeout(() => rejectData(new Error('Login timed out. Run login again.')), timeoutSeconds * 1000);
  // Don't keep the process alive just for a login nobody finished.
  timer.unref();
  server.unref();
  const done = result
    .then((data) => saveAccounts(data))
    .finally(() => { clearTimeout(timer); server.close(); server.closeAllConnections?.(); });
  const state = { url, port, done, finished: false, error: null, value: null };
  done.then((v) => { state.finished = true; state.value = v; }, (e) => { state.finished = true; state.error = e; });
  state.browserOpened = await openBrowserFn(url);
  return state;
}

// Opens the browser and waits up to `wait` seconds. If the user is still signing in,
// returns {waiting: true}; calling again keeps waiting on the same login.
export async function browserLogin({ wait = 120, timeoutSeconds = 600, openBrowserFn } = {}) {
  if (!pending || (pending.finished && (pending.error || pending.value))) {
    pending = await startLogin({ timeoutSeconds, openBrowserFn });
  }
  const state = pending;
  await Promise.race([state.done.catch(() => {}), new Promise((r) => setTimeout(r, wait * 1000))]);
  if (state.error) { pending = null; throw state.error; }
  if (!state.finished) {
    return {
      waiting: true,
      browserOpened: state.browserOpened,
      loginUrl: state.url,
      message: state.browserOpened
        ? 'Browser opened at the Liara login page. Waiting for the user to sign in; call login again to keep waiting.'
        : 'Could not open a browser. Ask the user to open loginUrl, sign in, then call login again.',
    };
  }
  pending = null;
  return { loggedIn: true, ...state.value, savedTo: AUTH_FILE };
}
