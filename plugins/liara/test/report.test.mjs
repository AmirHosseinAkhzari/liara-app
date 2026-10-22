// The static HTML report: facts from the session, Persian RTL + English, no scripts or
// external resources, no secrets, escaped content.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { startMock } from './mock-liara.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let mock; let call; let work; let appServer;

before(async () => {
  mock = await startMock();
  process.env.LIARA_API_MOCK = mock.url;
  process.env.LIARA_API_TOKEN = 'test-token';
  appServer = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
  await new Promise((r) => appServer.listen(0, '127.0.0.1', r));
  process.env.LIARA_APP_URL_TEMPLATE = `http://127.0.0.1:${appServer.address().port}`;
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-report-'));
  fs.cpSync(path.join(here, 'fixtures', 'express-plain'), work, { recursive: true });
  const { callTool } = await import('../lib/tools.mjs');
  const { clearJournal } = await import('../lib/audit.mjs');
  clearJournal();
  call = (n, a) => callTool(n, a, { cwd: work, elicit: async () => ({ action: 'accept' }) });

  // A short real session against the mock.
  await call('create_app', { app: 'cafe-api', platform: 'node', planID: 'small-g2' });
  await call('connect_database', { app: 'cafe-api', platform: 'node', create: { type: 'mongodb', hostname: 'cafe-db', planID: 'db-small' } });
  await call('set_envs', { app: 'cafe-api', vars: { SESSION_SECRET: 'super-secret-session-value-123' } });
  await call('deploy', { path: work, app: 'cafe-api', wait: 5 });
  await call('verify_app', { app: 'cafe-api', attempts: 1 });
});
after(async () => {
  await mock.close();
  appServer.close();
  fs.rmSync(work, { recursive: true, force: true });
});

test('Persian report: RTL, facts from the session, live prices, Persian digits', async () => {
  const r = await call('write_report', {
    path: work, lang: 'fa', operation: 'deployment',
    request: 'برنامه‌ی Express را با دیتابیس MongoDB روی لیارا مستقر کن.',
    summary: 'برنامه ساخته و مستقر شد و بررسی سلامت اجرا شد.',
    remaining: ['دامنه‌ی اختصاصی هنوز وصل نشده است.'],
    docs: [{ title: 'استقرار برنامه‌های NodeJS', url: 'https://docs.liara.ir/paas/nodejs/getting-started/' }, { title: 'bad', url: 'javascript:alert(1)' }],
  });
  assert.equal(r.written, true);
  assert.match(r.file, /liara-reports\/liara-deployment-report-cafe-api-\d{8}-\d{6}-fa\.html$/);
  assert.deepEqual(r.checks.problems, []);
  const html = fs.readFileSync(r.file, 'utf8');
  assert.match(html, /^<!DOCTYPE html>\n<html lang="fa" dir="rtl">/);
  assert.match(html, /<title>گزارش استقرار در لیارا · cafe-api<\/title>/);
  assert.match(html, /@font-face\{font-family:"Vazirmatn"/);
  assert.match(html, /<svg role="img" aria-label="Liara" class="logo"/);
  for (const section of ['خلاصه', 'کارهای انجام‌شده', 'زیرساخت', 'نتیجه‌ی استقرار', 'بررسی سلامت', 'هزینه‌ها', 'کارهای باقی‌مانده', 'مستندات']) assert.ok(html.includes(`<h2>${section}</h2>`), section);
  assert.ok(html.includes('ساخت برنامه'));
  assert.ok(html.includes('<bdi class="code">SESSION_SECRET</bdi>'), 'env var name listed');
  assert.ok(!html.includes('super-secret-session-value-123'), 'never the value');
  assert.match(html, /۴۷۵٬۰۰۰ تومان/, 'app price in Persian digits');
  assert.ok(html.includes('https://docs.liara.ir/paas/nodejs/getting-started/'));
  assert.ok(!html.includes('javascript:'), 'unsafe links dropped');
  assert.ok(!/<script/i.test(html));
  assert.ok(!/<(link|img)\b/i.test(html), 'no external resources');
});

test('English report: smaller (no embedded font), escaped narrative, secrets masked', async () => {
  const r = await call('write_report', {
    path: work, lang: 'en',
    summary: 'Deployed. <img src=x onerror=alert(1)> Connected with postgres://admin:Pa55word@db:5432/app',
    issues: [{ problem: 'Missing start script', cause: 'package.json had none', fix: 'Added "start": "node index.js"', resolved: true }],
  });
  const html = fs.readFileSync(r.file, 'utf8');
  assert.match(html, /^<!DOCTYPE html>\n<html lang="en" dir="ltr">/);
  assert.ok(!html.includes('@font-face'));
  assert.ok(r.bytes < 60_000, `${r.bytes} bytes`);
  assert.ok(!html.includes('<img'), 'HTML in the narrative is escaped');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('Pa55word'));
  assert.ok(html.includes('postgres://admin:****@db:5432/app'));
  assert.ok(html.includes('Missing start script'));
  assert.match(html, /<h2>Health checks<\/h2>/);
  assert.match(html, /HTTP http:\/\/127\.0\.0\.1:\d+/);
});

test('two reports never overwrite each other', async () => {
  const a = await call('write_report', { path: work, lang: 'en', summary: 'one' });
  const b = await call('write_report', { path: work, lang: 'en', summary: 'two' });
  assert.notEqual(a.file, b.file);
  assert.ok(fs.readFileSync(a.file, 'utf8').includes('one'));
});

test('reports are never part of a deploy upload', async () => {
  await call('deploy', { path: work, app: 'cafe-api', wait: 5 });
  assert.ok(!mock.state.uploads.at(-1).names.some((n) => n.startsWith('liara-reports')));
});
