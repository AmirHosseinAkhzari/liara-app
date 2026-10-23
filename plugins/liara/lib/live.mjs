// The live progress page: a small web server on 127.0.0.1 (random port, secret path) that
// the user opens in their browser to watch a deploy as it happens. Every step the plugin
// takes is an event (tool calls, upload, build state and log, build location, health
// checks, diagnoses, Claude's notes); the page receives them over Server-Sent Events.
// Read-only and local: only GET, only this computer's address, every text scrubbed of secrets.
import http from 'node:http';
import crypto from 'node:crypto';
import { scrubLine } from './verify.mjs';
import { openBrowser } from './login.mjs';
import { livePageHtml } from './livepage.mjs';

const MAX_EVENTS = 1000;
const events = [];
const clients = new Set();
let seq = 0;
let server = null;
let base = null;

function clean(x, depth = 0) {
  if (typeof x === 'string') return scrubLine(x).slice(0, 2000);
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
export const liveActive = () => Boolean(server);
export const liveUrl = () => base;

// The browser opens unless LIARA_LIVE_PAGE=off, and never during tests.
export const liveBrowserAllowed = () => process.env.LIARA_LIVE_PAGE !== 'off' && !process.env.NODE_TEST_CONTEXT;

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

function handle(req, res, token, s) {
  const port = s.address().port;
  // Only this computer's own address: a page on another site can't reach it (DNS rebinding).
  if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) {
    res.writeHead(403).end();
    return;
  }
  if (req.method !== 'GET') {
    res.writeHead(405, { allow: 'GET' }).end();
    return;
  }
  const { pathname } = new URL(req.url, `http://127.0.0.1:${port}`);
  const common = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
  if (pathname === `/${token}/`) {
    res.writeHead(200, {
      ...common,
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; font-src data:; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.end(livePageHtml());
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
