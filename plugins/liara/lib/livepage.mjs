// The live progress page (served by live.mjs). Persian, right-to-left, Liara branding.
// It shows the deploy as it happens: a stage bar (plan, services, upload, build, run, health),
// where it builds and the build log, health checks, fixes in progress, Claude's notes and a
// timeline of every step. Data arrives as JSON over Server-Sent Events and is written into
// the page with textContent only, never as HTML.
import { fontFaces, logoSvg } from './htmlkit.mjs';

const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  note: '<path d="M4 5h16v11H9l-5 4z"/>',
  warn: '<path d="M12 3.5 21 19.5H3z"/><path d="M12 10v4M12 17h.01"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  rocket: '<path d="M12 15l-3-3c1-4.5 4-8 9-8.5-.5 5-4 8-8.5 9"/><path d="M9 12l-3.5.5L4 15l3.5.8M12 15l-.5 3.5L9 20l-.8-3.5"/>',
};

let cached = null;
export function livePageHtml() {
  if (cached) return cached;
  const defs = `<svg class="defs" aria-hidden="true" width="0" height="0"><defs>${Object.entries(ICONS).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join('')}</defs></svg>`;
  cached = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>استقرار زنده در لیارا</title>
<style>${fontFaces('fa')}${CSS}</style>
</head>
<body>
${defs}
<header class="top">
<div class="wrap head">
${logoSvg()}
<div class="head-text"><h1>استقرار زنده در لیارا <bdi id="app"></bdi></h1>
<p class="meta"><span id="conn" class="conn">در حال اتصال…</span><span id="elapsed"></span></p></div>
<span id="status" class="pill pill-muted">آماده برای شروع</span>
</div>
<div class="track"><div id="progress" class="track-fill"></div></div>
</header>
<main class="wrap">
<section class="banner" id="banner" hidden><svg class="ic-xl"><use id="banner-icon" href="#i-rocket"/></svg><div><p class="banner-title" id="banner-title"></p><p class="banner-text" id="banner-text"></p></div><a class="btn" id="open-app" hidden rel="noopener" target="_blank">باز کردن برنامه</a></section>
<section class="card"><h2>مراحل استقرار</h2><ol class="stages" id="stages"></ol></section>
<section class="card"><h2>بیلد</h2><div class="chips"><span class="chip" id="loc"><svg class="ic"><use href="#i-pin"/></svg><span id="loc-text">محل بیلد: هنوز شروع نشده</span></span><span class="chip" id="rstate">وضعیت: —</span></div><pre class="term" id="log" dir="ltr"></pre></section>
<section class="card" id="checks-card" hidden><h2>بررسی سلامت</h2><ul class="checks" id="checks"></ul></section>
<section class="card"><h2>کارهای انجام‌شده</h2><ul class="timeline" id="timeline"></ul></section>
</main>
<footer class="wrap"><p>این صفحه فقط روی همین کامپیوتر باز می‌شود و مقدار رمزها و کلیدها هرگز در آن نمی‌آید. با بستنش استقرار متوقف نمی‌شود.</p></footer>
<script>${SCRIPT}</script>
</body>
</html>
`;
  return cached;
}

const CSS = `
:root{--ink:#0d1117;--muted:#57606a;--line:#d8dee4;--bg:#f6f8fa;--card:#fff;--soft:#f0f3f6;--brand:#0d1117;--mint:#87fcc4;--blue:#28c1f5;--series:#1a86cf;
--ok:#0b6b45;--ok-bg:#dcf7ea;--fail:#a4161a;--fail-bg:#fde4e2;--warn:#7a4f00;--warn-bg:#fff1cc;--info:#075985;--info-bg:#e0f2fe;--chip:#eef1f4;--term:#0d1117;--term-ink:#d1d9e0;--btn-bg:#0d1117;--btn-ink:#fff}
@media (prefers-color-scheme: dark){:root{--ink:#e6edf3;--muted:#9aa5b1;--line:#30363d;--bg:#0d1117;--card:#161b22;--soft:#1c2128;--series:#2f9fd8;
--ok:#7ee2b8;--ok-bg:#0f3d2a;--fail:#ffb3ad;--fail-bg:#4a1517;--warn:#ffd27a;--warn-bg:#3a2c06;--info:#9bdcff;--info-bg:#0c3550;--chip:#21262d;--term:#010409;--btn-bg:#87fcc4;--btn-ink:#0d1117}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.8 "Vazirmatn","Yekan",system-ui,Tahoma,sans-serif}
.defs{position:absolute;width:0;height:0;overflow:hidden}
.wrap{max-width:980px;margin:0 auto;padding:0 16px}
header.top{background:var(--brand);color:#fff;padding:22px 0 0;position:sticky;top:0;z-index:2}
.head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.logo{width:60px;height:auto;flex:none}
.head-text{flex:1;min-width:0}
h1{margin:0;font-size:1.4rem;line-height:1.4}
.meta{margin:2px 0 0;color:#c9d1d9;font-size:.85rem;display:flex;gap:12px;flex-wrap:wrap}
.conn::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#8b949e;margin-inline-end:6px;vertical-align:middle}
.conn.on::before{background:var(--mint);box-shadow:0 0 0 3px rgba(135,252,196,.25)}
.conn.off::before{background:#ff7b72}
.track{height:6px;margin-top:18px;background:#21262d}
.track-fill{height:100%;width:0;background:linear-gradient(270deg,var(--blue),var(--mint));transition:width .6s ease;margin-inline-start:0}
.pill{display:inline-flex;align-items:center;gap:8px;padding:4px 14px;border-radius:999px;font-weight:700;font-size:.9rem;white-space:nowrap}
.pill-ok{background:var(--ok-bg);color:var(--ok)}.pill-fail{background:var(--fail-bg);color:var(--fail)}.pill-info{background:var(--info-bg);color:var(--info)}.pill-warn{background:var(--warn-bg);color:var(--warn)}.pill-muted{background:#30363d;color:#c9d1d9}
.pill.busy::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.25}}
main{padding:20px 0 4px}
.card,.banner{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:0 0 16px}
.card h2{margin:0 0 12px;font-size:1.1rem}
.banner{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.banner>div{flex:1;min-width:200px}
.banner.ok{background:var(--ok-bg);border-color:transparent;color:var(--ok)}
.banner.fix{background:var(--warn-bg);border-color:transparent;color:var(--warn)}
.banner.fail{background:var(--fail-bg);border-color:transparent;color:var(--fail)}
.banner-title{margin:0;font-weight:700;font-size:1.2rem}
.banner-text{margin:2px 0 0}
.ic{width:18px;height:18px;flex:none}
.ic-xl{width:40px;height:40px;flex:none}
.btn{display:inline-flex;align-items:center;padding:10px 20px;border-radius:12px;background:var(--btn-bg);color:var(--btn-ink);font-weight:700;text-decoration:none}
.btn:focus-visible{outline:3px solid var(--series);outline-offset:2px}
.stages{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;counter-reset:st}
.stage{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;font-size:.85rem;color:var(--muted)}
.dot{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--chip);color:var(--muted);font-weight:700;border:2px solid transparent}
.stage.active .dot{border-color:var(--series);color:var(--series);background:var(--card)}
.stage.active .dot::after{content:"";width:16px;height:16px;border-radius:50%;border:2.5px solid currentColor;border-inline-end-color:transparent;animation:spin .9s linear infinite}
.stage.done .dot{background:var(--ok-bg);color:var(--ok)}
.stage.failed .dot{background:var(--fail-bg);color:var(--fail)}
.stage.active,.stage.done,.stage.failed{color:var(--ink);font-weight:700}
.stage .dot svg{width:18px;height:18px}
@keyframes spin{to{transform:rotate(360deg)}}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 10px}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--chip);border-radius:999px;padding:2px 12px;font-size:.88rem}
.chip.warn{background:var(--warn-bg);color:var(--warn);font-weight:700}
.term{background:var(--term);color:var(--term-ink);border-radius:12px;padding:12px 14px;margin:0;height:300px;overflow:auto;font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;text-align:left}
.term .ph{color:#8b949e;font-family:"Vazirmatn",system-ui,sans-serif;direction:rtl;display:block;text-align:right}
.term .err{color:#ff7b72}
.checks{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.checks li{display:flex;gap:8px;align-items:flex-start}
.checks .ok{color:var(--ok)}.checks .bad{color:var(--fail)}
.checks small{color:var(--muted);display:block}
.timeline{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.timeline li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:10px;align-items:start;padding:8px 0;border-bottom:1px solid var(--line)}
.timeline li:last-child{border-bottom:0}
.t-ic{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--chip);color:var(--muted)}
.t-ic svg{width:16px;height:16px}
.t-running .t-ic{color:var(--series)}
.t-running .t-ic::after{content:"";width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-inline-end-color:transparent;animation:spin .9s linear infinite}
.t-done .t-ic{background:var(--ok-bg);color:var(--ok)}
.t-failed .t-ic{background:var(--fail-bg);color:var(--fail)}
.t-note .t-ic{background:var(--info-bg);color:var(--info)}
.t-warn .t-ic{background:var(--warn-bg);color:var(--warn)}
.t-title{font-weight:700}
.t-sub{color:var(--muted);font-size:.85rem;overflow-wrap:anywhere}
.t-time{color:var(--muted);font-size:.8rem;white-space:nowrap}
.t-note .t-title{font-weight:400}
footer{color:var(--muted);font-size:.82rem;padding:4px 0 28px}
@media (max-width:640px){header.top{position:static}h1{font-size:1.15rem}.logo{width:46px}.stages{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:14px}.card{padding:16px}.term{height:240px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

// Client: rebuilds the page from the event list on every event. textContent only.
const SCRIPT = String.raw`(() => {
const $ = (id) => document.getElementById(id);
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (n) => String(n).replace(/\d/g, (d) => FA[d]);
const faNum = (n) => fa(Math.round(n).toLocaleString('en-US')).replace(/,/g, '٬');
const dur = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? fa(s) + ' ثانیه' : fa(Math.floor(s / 60)) + ' دقیقه' + (s % 60 ? ' و ' + fa(s % 60) + ' ثانیه' : ''); };
const clock = (iso) => fa(new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
const NAMES = {
  scan_project: 'تحلیل پروژه', approve_plan: 'تأیید برنامه‌ی کار', create_app: 'ساخت برنامه', deploy: 'استقرار',
  set_envs: 'تنظیم متغیرهای محیطی', connect_database: 'اتصال دیتابیس', connect_storage: 'اتصال فضای ذخیره‌سازی',
  connect_mail: 'راه‌اندازی ایمیل', connect_dns: 'تنظیم دامنه و DNS', connect_ai: 'اتصال هوش مصنوعی لیارا',
  migrate_database: 'انتقال داده‌های دیتابیس', migrate_storage: 'انتقال فایل‌ها', deploy_service: 'اجرای سرویس داکر',
  connect_disk: 'اتصال دیسک', set_cron: 'زمان‌بندی کارها', verify_app: 'بررسی سلامت برنامه', diagnose: 'عیب‌یابی خطا',
  app_action: 'تغییر وضعیت برنامه', github_autodeploy: 'استقرار خودکار از GitHub', estimate_cost: 'برآورد هزینه',
  billing: 'بررسی موجودی', write_report: 'نوشتن گزارش', teams: 'انتخاب حساب', create_vm: 'ساخت سرور مجازی', vm_action: 'تغییر سرور مجازی',
  change_app_plan: 'ارتقای بسته‌ی برنامه برای بیلد طولانی‌تر',
};
const SERVICES = new Set(['create_app', 'set_envs', 'connect_database', 'connect_storage', 'connect_mail', 'connect_dns', 'connect_ai', 'migrate_database', 'migrate_storage', 'deploy_service', 'connect_disk']);
const STATES = { QUEUED: 'در صف', PENDING: 'در صف', BUILDING: 'در حال بیلد', DEPLOYING: 'در حال اجرا', READY: 'آماده', SUCCEEDED: 'آماده', SUCCESS: 'آماده', RUNNING: 'آماده', FAILED: 'ناموفق', ERROR: 'ناموفق', CANCELED: 'لغو شد', CANCELLED: 'لغو شد', TIMEOUT: 'زمانش تمام شد', UNKNOWN: 'نامعلوم' };
const LOC = { germany: 'آلمان', iran: 'ایران' };
const CAUSES = { 'missing-dependency': 'وابستگی جاافتاده', 'missing-start-script': 'دستور اجرای برنامه تعریف نشده', 'runtime-version': 'نسخه‌ی محیط اجرا', 'build-failure': 'خطای بیلد', 'missing-env': 'متغیر محیطی جاافتاده', database: 'اتصال دیتابیس', port: 'پورت اشتباه', resources: 'کمبود منابع', 'third-party': 'سرویس بیرونی', 'liara-config': 'تنظیمات لیارا', 'code-error': 'خطای کد', 'platform-incident': 'اختلال در خود لیارا' };
const CHECKS = [
  [/^app exists$/, () => 'برنامه در لیارا وجود دارد'], [/^app is running$/, () => 'برنامه روشن است'],
  [/^latest release succeeded$/, () => 'آخرین استقرار موفق بود'], [/^HTTP (.+)$/, (m) => 'درخواست به ' + m[1]],
  [/^health (.+)$/, (m) => 'مسیر سلامت ' + m[1]], [/^custom domain (.+)$/, (m) => 'دامنه‌ی ' + m[1]],
  [/^no errors in the last (\d+) min of logs$/, (m) => 'خطایی در ' + fa(m[1]) + ' دقیقه‌ی اخیر لاگ‌ها نیست'],
  [/^env vars the code needs are set on Liara$/, () => 'متغیرهای محیطی لازم تنظیم شده‌اند'],
];
const checkName = (n) => { for (const [re, f] of CHECKS) { const m = String(n).match(re); if (m) return f(m); } return n; };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; };
const icon = (name, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); if (cls) s.setAttribute('class', cls); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + name); s.appendChild(u); return s; };
const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null; } catch { return null; } };

const events = [];
let logLines = [];
function onEvent(ev) {
  events.push(ev);
  if (ev.type === 'deploy' && ev.phase === 'pack') logLines = [];
  if (ev.type === 'deploy' && ev.phase === 'build') logLines.push({ text: '— ' + (ev.location ? 'بیلد در ' + (LOC[ev.location] || ev.location) : 'اجرای ایمیج') + ' —', sys: true });
  if (ev.type === 'log') for (const l of ev.lines || []) logLines.push({ text: l });
  if (logLines.length > 1500) logLines = logLines.slice(-1500);
  schedule();
}
let pending = false;
function schedule() { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; render(); }); } }

function derive() {
  const steps = new Map();
  let app = null, attempt = 0, deploy = null, location = null, fallback = null, rstate = null, checks = null, checksAt = 0, diagnosis = null, timeout = null, lastActivity = 0, waiting = false;
  for (const ev of events) {
    if (ev.app && !app) app = ev.app;
    if (ev.type === 'session' && ev.title) app = ev.title;
    if (ev.type === 'step') {
      const prev = steps.get(ev.step) || {};
      steps.set(ev.step, Object.assign({}, prev, ev, { started: prev.started || ev.time }));
      lastActivity = ev.id;
    }
    if (ev.type === 'deploy') {
      if (ev.app) app = ev.app;
      if (ev.phase === 'pack' || (ev.phase === 'build' && ev.image && (!deploy || deploy.finished))) { attempt += 1; deploy = { upload: 'active', build: 'pending', run: 'pending', startId: ev.id }; location = null; fallback = null; rstate = null; if (ev.image) deploy.upload = 'skip'; }
      if (!deploy) deploy = { upload: 'pending', build: 'pending', run: 'pending', startId: ev.id };
      if (ev.phase === 'uploaded') deploy.upload = 'done';
      if (ev.phase === 'build') { if (deploy.upload !== 'skip') deploy.upload = 'done'; deploy.build = 'active'; if (ev.location) location = ev.location; if (ev.image) location = 'image'; }
      if (ev.phase === 'state') rstate = ev.state;
      if (ev.phase === 'finished') { deploy.finished = true; deploy.success = ev.success; deploy.build = ev.success ? 'done' : 'failed'; deploy.run = ev.success ? 'done' : (ev.finished ? 'failed' : 'pending'); deploy.url = ev.url; rstate = ev.state; deploy.endId = ev.id; }
      lastActivity = ev.id;
    }
    if (ev.type === 'location') { fallback = ev; location = ev.to; }
    if (ev.type === 'checks') { checks = ev; checksAt = ev.id; }
    if (ev.type === 'diagnosis') diagnosis = ev;
    if (ev.type === 'buildTimeout') timeout = ev;
  }
  const list = [...steps.values()];
  for (const s of list) if (s.status === 'waiting') waiting = true;
  const running = list.filter((s) => s.status === 'running');
  return { steps: list, running, app, attempt, deploy, location, fallback, rstate, checks, checksAt, diagnosis, timeout, waiting };
}

function stageStates(d) {
  const st = { plan: 'pending', services: 'pending', upload: 'pending', build: 'pending', run: 'pending', verify: 'pending' };
  const plan = d.steps.filter((s) => s.tool === 'approve_plan').pop();
  if (plan) st.plan = plan.status === 'running' || plan.status === 'waiting' ? 'active' : plan.status === 'done' ? 'done' : 'failed';
  const svc = d.steps.filter((s) => SERVICES.has(s.tool));
  if (svc.length) st.services = svc.some((s) => s.status === 'running') ? 'active' : svc.some((s) => s.status === 'failed' || s.status === 'error') && !svc.some((s) => s.status === 'done') ? 'failed' : 'done';
  if (d.deploy) {
    if (st.plan === 'pending') st.plan = 'done';
    if (st.services === 'pending') st.services = 'done';
    st.upload = d.deploy.upload === 'skip' ? 'done' : d.deploy.upload; st.build = d.deploy.build; st.run = d.deploy.run;
  }
  const verify = d.steps.filter((s) => s.tool === 'verify_app' && (!d.deploy || s.id > d.deploy.startId)).pop();
  if (verify && verify.status === 'running') st.verify = 'active';
  else if (d.checks && (!d.deploy || d.checksAt > (d.deploy.endId || 0))) st.verify = d.checks.healthy ? 'done' : 'failed';
  return st;
}

function render() {
  const d = derive();
  if (d.app) { $('app').textContent = d.app; document.title = 'استقرار زنده · ' + d.app; }
  const st = stageStates(d);
  const NAMES_ST = [['plan', 'تأیید'], ['services', 'سرویس‌ها'], ['upload', 'آپلود کد'], ['build', 'بیلد'], ['run', 'اجرا'], ['verify', 'بررسی سلامت']];
  const ol = $('stages'); ol.replaceChildren();
  NAMES_ST.forEach(([k, label], i) => {
    const li = el('li', 'stage ' + st[k]);
    const dot = el('span', 'dot');
    if (st[k] === 'done') dot.appendChild(icon('check')); else if (st[k] === 'failed') dot.appendChild(icon('x')); else if (st[k] !== 'active') dot.textContent = fa(i + 1);
    li.append(dot, el('span', '', label)); ol.appendChild(li);
  });
  const doneCount = Object.values(st).filter((x) => x === 'done').length;
  $('progress').style.width = Math.round((doneCount / 6) * 100) + '%';

  // Overall status and banner
  const failedDeploy = d.deploy && d.deploy.finished && !d.deploy.success;
  const unhealthy = st.verify === 'failed';
  const busy = d.running.length > 0 || (d.deploy && !d.deploy.finished);
  let status = ['muted', 'آماده برای شروع', false];
  let banner = null;
  if (d.waiting && !busy) status = ['warn', 'منتظر تأیید شما', false];
  else if (!d.deploy && d.steps.length && !busy) status = ['info', 'در حال آماده‌سازی سرویس‌ها…', true];
  else if (busy) status = d.attempt > 1 ? ['warn', 'در حال رفع خطا و استقرار دوباره (تلاش ' + fa(d.attempt) + ')', true] : ['info', 'در حال استقرار…', true];
  else if (st.run === 'done' && st.verify === 'done') { status = ['ok', 'برنامه آماده است', false]; banner = ['ok', 'rocket', 'برنامه آماده است', 'استقرار موفق بود و همه‌ی بررسی‌های سلامت درست بودند.']; }
  else if (st.run === 'done' && st.verify === 'pending') status = ['info', 'مستقر شد؛ بررسی سلامت در راه است', true];
  else if (failedDeploy && d.timeout && d.timeout.id > (d.deploy.endId || 0)) {
    const up = d.timeout.upgrade || {};
    status = ['warn', 'زمان مجاز بیلد تمام شد', false];
    banner = ['fix', 'clock', 'زمان مجاز بیلد تمام شد', up.possible ? 'بسته‌ی برنامه به ' + up.bundlePlanID + (up.buildMinutes ? ' (بیلد تا ' + fa(up.buildMinutes) + ' دقیقه)' : '') + ' ارتقا پیدا می‌کند و دوباره مستقر می‌شود.' : 'بیلد باید سریع‌تر شود: ' + (up.why || '')];
  }
  else if (failedDeploy || unhealthy) {
    const fixing = d.diagnosis && d.diagnosis.id > (d.deploy.endId || 0);
    status = fixing ? ['warn', 'در حال رفع خطا', true] : ['fail', failedDeploy ? 'استقرار ناموفق بود' : 'بعضی بررسی‌های سلامت ناموفق بود', false];
    banner = fixing ? ['fix', 'wrench', 'در حال رفع خطا', 'علت: ' + (CAUSES[d.diagnosis.category] || d.diagnosis.category) + '. پس از رفع، دوباره مستقر می‌شود.'] : ['fail', 'warn', status[1], 'علت از روی لاگ‌ها پیدا و رفع می‌شود، بدون نیاز به کاری از طرف شما.'];
  }
  const pill = $('status'); pill.className = 'pill pill-' + status[0] + (status[2] ? ' busy' : ''); pill.textContent = status[1];
  const b = $('banner');
  if (banner) {
    b.hidden = false; b.className = 'banner ' + banner[0]; $('banner-icon').setAttribute('href', '#i-' + banner[1]);
    $('banner-title').textContent = banner[2]; $('banner-text').textContent = banner[3];
    const url = banner[0] === 'ok' && d.deploy && safeUrl(d.deploy.url);
    const a = $('open-app'); a.hidden = !url; if (url) a.href = url;
  } else b.hidden = true;

  // Build card
  const loc = $('loc'); const locText = $('loc-text');
  if (d.location === 'image') { loc.className = 'chip'; locText.textContent = 'بدون بیلد: اجرای ایمیج داکر'; }
  else if (d.fallback) { loc.className = 'chip warn'; locText.textContent = 'محل بیلد: ایران (آلمان در دسترس نبود)'; }
  else if (d.location) { loc.className = 'chip'; locText.textContent = 'محل بیلد: ' + (LOC[d.location] || d.location); }
  else { loc.className = 'chip'; locText.textContent = 'محل بیلد: هنوز شروع نشده'; }
  $('rstate').textContent = 'وضعیت: ' + (d.rstate ? (STATES[String(d.rstate).toUpperCase()] || d.rstate) : '—');
  const log = $('log');
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.replaceChildren();
  if (!logLines.length) log.appendChild(el('span', 'ph', d.deploy ? 'منتظر لاگ بیلد…' : 'لاگ بیلد اینجا نمایش داده می‌شود.'));
  for (const l of logLines) log.appendChild(el('span', l.sys ? 'ph' : /\b(error|err!|failed|fatal)\b/i.test(l.text) ? 'err' : '', l.text + '\n'));
  if (nearBottom) log.scrollTop = log.scrollHeight;

  // Health checks
  if (d.checks) {
    $('checks-card').hidden = false; const ul = $('checks'); ul.replaceChildren();
    for (const c of d.checks.checks || []) {
      const li = el('li'); li.appendChild(icon(c.ok ? 'check' : 'x', 'ic ' + (c.ok ? 'ok' : 'bad')));
      const t = el('div', '', checkName(c.name)); if (!c.ok && c.detail) { const s = el('small', '', c.detail); s.dir = 'auto'; t.appendChild(s); }
      li.appendChild(t); ul.appendChild(li);
    }
  }

  // Timeline, newest first
  const items = [];
  for (const ev of events) {
    if (ev.type === 'note') items.push({ id: ev.id, cls: 't-note', ic: 'note', title: ev.text, sub: 'پیام از Claude', time: ev.time });
    if (ev.type === 'location') items.push({ id: ev.id, cls: 't-warn', ic: 'pin', title: 'بیلد در آلمان در دسترس نبود؛ بیلد در ایران انجام می‌شود', sub: ev.reason, time: ev.time });
    if (ev.type === 'buildTimeout') items.push({ id: ev.id, cls: 't-warn', ic: 'clock', title: 'زمان مجاز بیلد تمام شد', sub: ev.upgrade && ev.upgrade.possible ? 'ارتقا به بسته‌ی ' + ev.upgrade.bundlePlanID + ' برای بیلد طولانی‌تر' : (ev.upgrade && ev.upgrade.why) || '', time: ev.time });
    if (ev.type === 'diagnosis') items.push({ id: ev.id, cls: 't-warn', ic: 'wrench', title: 'علت خطا: ' + (CAUSES[ev.category] || ev.category), sub: [ev.explanation, ev.fix].filter(Boolean).join(' · '), time: ev.time });
  }
  for (const s of d.steps) {
    const cls = s.status === 'running' ? 't-running' : s.status === 'done' || s.status === 'reused' ? 't-done' : s.status === 'waiting' || s.status === 'declined' ? 't-warn' : 't-failed';
    const ic = s.status === 'done' || s.status === 'reused' ? 'check' : s.status === 'running' ? null : s.status === 'waiting' ? 'clock' : 'x';
    const extra = s.status === 'waiting' ? 'منتظر تأیید شما' : s.status === 'declined' ? 'تأیید نشد' : s.status === 'reused' ? 'از منبع موجود استفاده شد' : s.error || '';
    items.push({ id: s.id, cls, ic, title: NAMES[s.tool] || s.tool, target: s.target, sub: extra, time: s.time, ms: s.ms });
  }
  items.sort((a, b) => b.id - a.id);
  const tl = $('timeline'); tl.replaceChildren();
  if (!items.length) tl.appendChild(el('li', 't-note', 'هنوز کاری شروع نشده است.'));
  for (const it of items) {
    const li = el('li', it.cls);
    const ic = el('span', 't-ic'); if (it.ic) ic.appendChild(icon(it.ic)); li.appendChild(ic);
    const body = el('div'); const title = el('div', 't-title', it.title);
    if (it.target) { title.append(' '); const t = el('bdi', '', it.target); title.appendChild(t); }
    body.appendChild(title); if (it.sub) { const s = el('div', 't-sub', it.sub); s.dir = 'auto'; body.appendChild(s); }
    li.appendChild(body);
    li.appendChild(el('span', 't-time', it.ms ? dur(it.ms) : clock(it.time)));
    tl.appendChild(li);
  }
}

// Elapsed time since the first event, until the app is ready.
setInterval(() => {
  if (!events.length) return;
  const d = derive(); const st = stageStates(d);
  const end = st.verify === 'done' && st.run === 'done' ? new Date(events[events.length - 1].time).getTime() : Date.now();
  $('elapsed').textContent = 'زمان سپری‌شده: ' + dur(end - new Date(events[0].time).getTime());
}, 1000);

const conn = $('conn');
const src = new EventSource('events');
src.onopen = () => { conn.className = 'conn on'; conn.textContent = 'اتصال زنده'; };
src.onerror = () => { conn.className = 'conn off'; conn.textContent = 'اتصال قطع شد؛ دوباره وصل می‌شود…'; };
const seen = new Set();
src.onmessage = (m) => { try { const ev = JSON.parse(m.data); if (seen.has(ev.id)) return; seen.add(ev.id); onEvent(ev); } catch {} };
render();
})();`;
