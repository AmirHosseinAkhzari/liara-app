// The HTML reports: the Persian deployment page (cards, charts, top-up, service map) and the
// full report for other operations (Persian RTL + English). Facts from the session, no
// external resources, at most one inline script, no secrets, escaped content.
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

const fa = (n) => Math.round(n).toLocaleString('en-US').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]).replace(/,/g, '٬');

test('deployment page: Persian only, made of cards and charts, nothing else', async () => {
  const r = await call('write_report', {
    path: work, lang: 'en', operation: 'deployment',
    summary: 'NARRATIVE-NOT-ON-THE-DEPLOY-PAGE',
    remaining: ['REMAINING-NOT-ON-THE-DEPLOY-PAGE'],
  });
  assert.equal(r.written, true);
  assert.equal(r.language, 'fa', 'always Persian, whatever lang says');
  assert.match(r.file, /liara-reports\/liara-deployment-report-cafe-api-\d{8}-\d{6}-fa\.html$/);
  assert.deepEqual(r.checks.problems, []);
  assert.equal(r.checks.inlineScripts, 1);
  const html = fs.readFileSync(r.file, 'utf8');
  assert.match(html, /^<!DOCTYPE html>\n<html lang="fa" dir="rtl">/);
  assert.match(html, /<title>گزارش استقرار در لیارا · cafe-api<\/title>/);
  assert.match(html, /@font-face\{font-family:"Vazirmatn"/);
  assert.match(html, /<svg role="img" aria-label="Liara" class="logo"/);
  // Just these cards, in this order.
  const headings = [...html.matchAll(/<h2>[\s\S]*?<\/svg>([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.deepEqual(headings, ['پلن‌هایی که خریدید', 'هزینه‌ی هر سرویس در ماه', 'موجودی و زمان باقی‌مانده', 'اتصال سرویس‌ها به هم']);
  assert.ok(!html.includes('NARRATIVE-NOT-ON-THE-DEPLOY-PAGE') && !html.includes('REMAINING-NOT-ON-THE-DEPLOY-PAGE'));
  assert.ok(html.includes('برنامه مستقر شد و سالم است'), 'status from the recorded facts');
  // Plan card: picture, plan, specs from the live plan list, price.
  assert.ok(html.includes('<use href="#ic-app"/>'));
  assert.ok(html.includes('پلن <bdi>small-g2</bdi>'));
  for (const spec of ['۰٫۵ هسته‌ی پردازنده', '۰٫۵ گیگابایت رم', '۵ گیگابایت دیسک']) assert.ok(html.includes(spec), spec);
  assert.ok(html.includes('۴۷۵٬۰۰۰ تومان'), 'app price in Persian digits');
  assert.ok(html.includes('خرید جدید'));
  // Cost chart and balance.
  assert.match(html, /<div class="bars" role="img"/);
  assert.match(html, /<span class="bar-val">۴۷۵٬۰۰۰<\/span>/);
  assert.ok(html.includes('۱٬۰۰۰٬۰۰۰ <small>تومان</small>'), 'balance tile');
  assert.match(html, /<figure class="runway"><svg/);
  assert.ok(html.includes('پایان اعتبار: '));
  assert.ok(!html.includes('id="topup"'), 'no top-up button while the balance lasts');
  // Service map: the database node and the env var NAME on its link, never the value.
  const { sessionJournal } = await import('../lib/audit.mjs');
  const dbVars = sessionJournal().find((e) => e.tool === 'connect_database').result.envVarNames;
  assert.ok(dbVars.length > 0);
  assert.match(html, /<text class="g-name"[^>]*>cafe-db<\/text>/);
  assert.ok(html.includes(`>${dbVars[0]}</text>`), 'env var name on the link');
  assert.ok(html.includes('class="g-state g-ok"'), 'app marked healthy');
  assert.ok(!html.includes('super-secret-session-value-123'), 'never a secret value');
  assert.ok(!/<(link|img)\b/i.test(html), 'no external resources');
});

test('deployment page: low balance shows a top-up button for 10 days, 30 days or any number', async () => {
  const before = mock.state.balance;
  mock.state.balance = 100_000;
  try {
    const bill = await call('billing', {});
    assert.equal(bill.lowBalance, true);
    const r = await call('write_report', { path: work, operation: 'deployment' });
    const html = fs.readFileSync(r.file, 'utf8');
    assert.deepEqual(r.checks.problems, []);
    assert.ok(html.includes('<div class="alert" role="status">'));
    assert.ok(html.includes('<summary class="btn">افزایش اعتبار</summary>'));
    for (const id of ['td-10', 'td-30', 'td-x']) assert.ok(html.includes(`id="${id}"`), id);
    for (const q of bill.topUp.quotes) {
      assert.ok(html.includes(`${fa(q.costToman)} تومان`), `cost of ${q.days} days`);
      assert.ok(html.includes(`${fa(q.addRial)} ریال`), `rial for ${q.days} days`);
    }
    assert.ok(html.includes('id="topup-days-input"'), 'any number of days');
    assert.ok(html.includes('href="https://console.liara.ir/"'));
    assert.ok(html.includes('https://docs.liara.ir/references/console/increase-credit/'));
  } finally {
    mock.state.balance = before;
  }
});

test('report checks: one inline script at most, never external or networked', async () => {
  const { checkReport } = await import('../lib/report.mjs');
  const page = (body) => `<!DOCTYPE html><html><head></head><body><main></main>${body}</body></html>`;
  assert.deepEqual(checkReport(page('<script>document.title = "x";</script>')).problems, []);
  assert.ok(checkReport(page('<script src="https://x.example/a.js"></script>')).problems.includes('loads an external script'));
  assert.ok(checkReport(page('<script>1</script><script>2</script>')).problems.includes('contains more than one script'));
  assert.ok(checkReport(page('<script>fetch("https://x.example")</script>')).problems.includes('script uses the network or storage'));
  assert.ok(checkReport(page('<script>import("https://x.example/m.js")</script>')).problems.includes('script uses the network or storage'));
  assert.ok(checkReport(page('<button onclick="go()">x</button>')).problems.includes('contains an inline event handler'));
});

test('English report (other operations): smaller (no embedded font), escaped narrative, secrets masked', async () => {
  const r = await call('write_report', {
    path: work, lang: 'en', operation: 'troubleshooting',
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

test('the facts line cannot be hidden by an optimistic narrative', async () => {
  const { buildReport } = await import('../lib/report.mjs');
  const journal = [{ time: new Date().toISOString(), tool: 'create_app', risk: 'billable', outcome: 'error', target: 'x', error: 'POST /v1/projects → 402: Not enough balance.', result: {} }];
  const { html } = await buildReport({ lang: 'en', operation: 'troubleshooting', summary: 'Everything was deployed perfectly.', journal });
  assert.match(html, /<p class="facts facts-fail">Recorded facts: no successful deployment is recorded, no health check was run, 1 action ended with an error\.<\/p>/);
  assert.match(html, /<bdi>POST \/v1\/projects → 402: Not enough balance\.<\/bdi>/);
  // The deployment page shows no narrative at all; its status comes from the facts.
  const page = (await buildReport({ operation: 'deployment', summary: 'Everything was deployed perfectly.', journal })).html;
  assert.ok(page.includes('در این جلسه استقراری انجام نشد'));
  assert.ok(!page.includes('Everything was deployed perfectly'));
});

test('two reports never overwrite each other', async () => {
  const a = await call('write_report', { path: work, lang: 'en', operation: 'other', summary: 'one' });
  const b = await call('write_report', { path: work, lang: 'en', operation: 'other', summary: 'two' });
  assert.notEqual(a.file, b.file);
  assert.ok(fs.readFileSync(a.file, 'utf8').includes('one'));
});

test('reports are never part of a deploy upload', async () => {
  await call('deploy', { path: work, app: 'cafe-api', wait: 5 });
  assert.ok(!mock.state.uploads.at(-1).names.some((n) => n.startsWith('liara-reports')));
});
