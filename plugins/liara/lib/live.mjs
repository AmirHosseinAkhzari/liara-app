// The live progress page: a small web server on 127.0.0.1 (random port, secret path) that
// the user opens in their browser to watch deploys as they happen. Every step the plugin
// takes is an event (tool calls, upload, build state and log, build location, health
// checks, diagnoses, Claude's notes); the page receives them over Server-Sent Events.
// The page can also answer questions (approvals, choices): a click POSTs the answer back,
// and whichever comes first, the page or Claude, wins. It can download the deploy report.
// Local only: this computer's address, a secret path, same-origin POSTs, secrets scrubbed.
import http from 'node:http';
import crypto from 'node:crypto';
import { scrubLine } from './verify.mjs';
import { openBrowser } from './login.mjs';
import { livePageHtml } from './livepage.mjs';

const MAX_EVENTS = 2000;
const events = [];
const clients = new Set();
const questions = new Map(); // id → { resolve, options }
let seq = 0;
let server = null;
let base = null;
let reportProvider = null;

// Values of the app's secret env vars (passwords, keys, URLs with credentials). Logs can print
// them in any shape, so besides scrubLine's patterns every known value is masked by itself.
const secrets = new Set();
const SECRET_KEY = /(PASSWORD|SECRET|TOKEN|_KEY|KEY_|PASS|PWD|DSN|CREDENTIALS?|AUTH|PRIVATE|SIGNATURE)/i;
export function rememberSecrets(envs) {
  const list = Array.isArray(envs) ? envs : Object.entries(envs || {}).map(([key, value]) => ({ key, value }));
  for (const { key, value } of list) {
    const v = String(value ?? '');
    let url = null;
    try { url = new URL(v); } catch { /* not a URL */ }
    const parts = [];
    if (url && (url.password || url.username)) parts.push(v, decodeURIComponent(url.password || ''), decodeURIComponent(url.username || ''));
    else if (SECRET_KEY.test(String(key))) parts.push(v);
    for (const p of parts) if (p.length >= 6) secrets.add(p);
  }
}
function maskSecrets(text) {
  let out = text;
  for (const v of secrets) if (out.includes(v)) out = out.split(v).join('****');
  return out;
}

function clean(x, depth = 0) {
  if (typeof x === 'string') return scrubLine(maskSecrets(x)).slice(0, 2000);
  if (depth > 4) return undefined;
  if (Array.isArray(x)) return x.slice(-400).map((v) => clean(v, depth + 1));
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined).map(([k, v]) => [k, clean(v, depth + 1)]));
  return x;
}
const frame = (ev) => `id: ${ev.id}\ndata: ${JSON.stringify(ev)}\n\n`;

// Record an event and push it to every open page. Cheap when no page is open.
export function liveEvent(e) {
  const ev = { id: ++seq, time: new Date().toISOString(), ...clean(e) };
  events.push(ev);
  if (events.length > MAX_EVENTS) events.shift();
  for (const res of clients) res.write(frame(ev));
  return ev.id;
}
export const liveEvents = () => events.slice();

// The app's runtime logs on the page (the latest lines; each event replaces the last one).
// envs: the app's env vars, so their secret values are masked even when printed raw.
export function liveRuntimeLogs(app, lines, envs) {
  if (!server || !app || !Array.isArray(lines)) return null;
  if (envs) rememberSecrets(envs);
  return liveEvent({ type: 'runtime', app, lines: lines.slice(-300).map((l) => String(l)) });
}
export const liveActive = () => Boolean(server);
export const liveUrl = () => base;
// Someone has the page open right now.
export const liveConnected = () => clients.size > 0;
export const setReportProvider = (fn) => { reportProvider = fn; };

// The browser opens unless LIARA_LIVE_PAGE=off, and never during tests.
export const liveBrowserAllowed = () => process.env.LIARA_LIVE_PAGE !== 'off' && !process.env.NODE_TEST_CONTEXT;
// How long a question waits on the page before Claude asks in chat instead.
export const pageAnswerMs = () => {
  const n = Number(process.env.LIARA_PAGE_ANSWER_SECONDS ?? 90);
  return (Number.isFinite(n) && n >= 0 ? n : 90) * 1000;
};

// Wait until a page connects (just after the browser opens), at most ms.
export async function waitForClient(ms) {
  const end = Date.now() + ms;
  while (!clients.size && Date.now() < end) await new Promise((r) => setTimeout(r, 200));
  return clients.size > 0;
}

// Ask on the page. options: [{ id, label, primary? }]. Resolves to the chosen id, or null when
// nobody answered in time. closeQuestion() ends it early (answered in Claude).
export function askOnPage({ text, options, details, app, timeoutMs = pageAnswerMs() }) {
  const id = crypto.randomBytes(8).toString('hex');
  liveEvent({ type: 'question', qid: id, text, options, details, app });
  return {
    id,
    answer: new Promise((resolve) => {
      const timer = setTimeout(() => {
        questions.delete(id);
        liveEvent({ type: 'answer', qid: id, choice: null, by: 'timeout' });
        resolve(null);
      }, timeoutMs);
      timer.unref?.();
      questions.set(id, {
        options: new Set(options.map((o) => o.id)),
        resolve: (choice, by) => {
          clearTimeout(timer);
          questions.delete(id);
          liveEvent({ type: 'answer', qid: id, choice, by });
          resolve(choice);
        },
      });
    }),
  };
}
export function closeQuestion(id, choice, by = 'claude') {
  questions.get(id)?.resolve(choice, by);
}

// Start the server (once per session) and open the page. Returns { url, opened, started }.
export async function startLive({ open = true, openFn = openBrowser } = {}) {
  let started = false;
  if (!server) {
    const token = crypto.randomBytes(12).toString('base64url');
    const s = http.createServer((req, res) => handle(req, res, token, s));
    await new Promise((resolve, reject) => {
      s.once('error', reject);
      s.listen(0, '127.0.0.1', resolve);
    });
    s.unref(); // the page must never keep the plugin running
    server = s;
    base = `http://127.0.0.1:${s.address().port}/${token}/`;
    started = true;
  }
  const opened = open ? await openFn(base).catch(() => false) : false;
  return { url: base, opened, started };
}

export async function stopLive() {
  for (const res of clients) res.end();
  clients.clear();
  for (const q of questions.values()) q.resolve(null, 'closed');
  if (server) {
    const s = server;
    server = null;
    base = null;
    s.closeAllConnections?.();
    await new Promise((r) => s.close(r));
  }
}
export function clearLive() {
  events.splice(0);
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handle(req, res, token, s) {
  const port = s.address().port;
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  // Only this computer's own address: a page on another site can't reach it (DNS rebinding).
  if (!hosts.includes(req.headers.host)) {
    res.writeHead(403).end();
    return;
  }
  const { pathname } = new URL(req.url, `http://127.0.0.1:${port}`);
  const common = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };

  if (req.method === 'POST' && pathname === `/${token}/answer`) {
    // Same-origin only: another site can't answer for the user.
    if (!hosts.some((h) => req.headers.origin === `http://${h}`) || !/^application\/json\b/.test(req.headers['content-type'] || '')) {
      res.writeHead(403, common).end();
      return;
    }
    try {
      const { qid, choice } = JSON.parse(await readBody(req));
      const q = questions.get(String(qid));
      if (!q || !q.options.has(String(choice))) {
        res.writeHead(409, { ...common, 'content-type': 'application/json' }).end('{"ok":false,"why":"This question was already answered or has expired."}');
        return;
      }
      q.resolve(String(choice), 'page');
      res.writeHead(200, { ...common, 'content-type': 'application/json' }).end('{"ok":true}');
    } catch {
      res.writeHead(400, common).end();
    }
    return;
  }
  if (req.method !== 'GET') {
    res.writeHead(405, { allow: 'GET, POST' }).end();
    return;
  }
  if (pathname === `/${token}/`) {
    res.writeHead(200, {
      ...common,
      'content-type': 'text/html; charset=utf-8',
      // frame-src: the deployed app's own page is shown in a preview frame.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; font-src data:; img-src data:; frame-src https: http:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.end(livePageHtml());
    return;
  }
  if (pathname === `/${token}/report`) {
    if (!reportProvider) {
      res.writeHead(404, common).end();
      return;
    }
    try {
      const { html, appName } = await reportProvider();
      const name = `liara-deploy-report-${String(appName || 'app').replace(/[^a-z0-9-]/gi, '-')}.html`;
      res.writeHead(200, { ...common, 'content-type': 'text/html; charset=utf-8', 'content-disposition': `attachment; filename="${name}"` });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { ...common, 'content-type': 'text/plain; charset=utf-8' }).end(scrubLine(`Report failed: ${err.message}`));
    }
    return;
  }
  if (pathname === `/${token}/events`) {
    res.writeHead(200, { ...common, 'content-type': 'text/event-stream; charset=utf-8', connection: 'keep-alive' });
    const after = Number(req.headers['last-event-id'] || 0);
    res.write('retry: 2000\n\n');
    for (const ev of events) if (ev.id > after) res.write(frame(ev));
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 15_000);
    ping.unref();
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }
  res.writeHead(404, common).end();
}
