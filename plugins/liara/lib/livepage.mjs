// The live progress page (served by live.mjs). Persian, right-to-left, Liara branding.
//   - Questions (approvals, choices) with buttons; the first answer, here or in Claude, wins.
//   - One card per app, so several apps can deploy at once: a stage bar (services, upload,
//     build, run, health) and the app's tasks with technology logos, the build log under each
//     build, where it builds, fixes in progress, and, once live, the URL with a preview.
//   - Steps for the whole account (the plan approval, notes), a full event log, and a button
//     to download the deploy report at the end.
// Data arrives as JSON over Server-Sent Events and is written with textContent only.
import { fontFaces, logoSvg } from './htmlkit.mjs';
import { TECH_ICONS } from './techicons.mjs';

// Line icons (stroked) for steps without a technology logo.
const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  note: '<path d="M4 5h16v11H9l-5 4z"/>',
  warn: '<path d="M12 3.5 21 19.5H3z"/><path d="M12 10v4M12 17h.01"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  rocket: '<path d="M12 15l-3-3c1-4.5 4-8 9-8.5-.5 5-4 8-8.5 9"/><path d="M9 12l-3.5.5L4 15l3.5.8M12 15l-.5 3.5L9 20l-.8-3.5"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  stack: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  upload: '<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5"/><path d="M12 12v8M9 15l3-3 3 3"/>',
  hammer: '<path d="M14 6l4 4M13 7l-9 9 2 2 9-9M15 4l5 5-2 2-5-5z"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  heart: '<path d="M3 12h4l2-4 3 8 2-4h7"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>',
  bucket: '<ellipse cx="12" cy="6.5" rx="8" ry="2.5"/><path d="M4 6.5l1.8 12a2 2 0 0 0 2 1.7h8.4a2 2 0 0 0 2-1.7l1.8-12"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  ai: '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/>',
  disk: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 14h.01M11 14h6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  cli: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  app: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
};

let cached = null;
export function livePageHtml() {
  if (cached) return cached;
  const line = Object.entries(ICONS).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join('');
  const tech = Object.entries(TECH_ICONS).map(([k, v]) => `<symbol id="t-${k}" viewBox="0 0 24 24"><title>${v.title}</title><path fill="currentColor" d="${v.d}"/></symbol>`).join('');
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
<svg class="defs" aria-hidden="true" width="0" height="0"><defs>${line}${tech}</defs></svg>
<header class="top">
<div class="wrap head">
${logoSvg()}
<div class="head-text"><h1>استقرار زنده در لیارا</h1>
<p class="meta"><span id="conn" class="conn">در حال اتصال…</span><span id="elapsed"></span></p></div>
<span id="status" class="pill pill-muted">آماده برای شروع</span>
</div>
<div class="track"><div id="progress" class="track-fill"></div></div>
</header>
<main class="wrap">
<div id="questions"></div>
<div id="apps"></div>
<section class="card" id="general" hidden><h2>کارهای کلی</h2><ul class="tasks" id="general-tasks"></ul></section>
<section class="card report" id="report" hidden><div><h2>گزارش استقرار</h2><p class="muted">گزارش فارسی با پلن‌ها، هزینه‌ها، موجودی و نقشه‌ی اتصال سرویس‌ها.</p></div><a class="btn" href="report" download><svg class="ic"><use href="#i-doc"/></svg>دریافت گزارش</a></section>
<details class="card log-all"><summary>همه‌ی رویدادها</summary><ul class="timeline" id="timeline"></ul></details>
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
.wrap{max-width:1000px;margin:0 auto;padding:0 16px}
header.top{background:var(--brand);color:#fff;padding:20px 0 0;position:sticky;top:0;z-index:3}
.head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.logo{width:60px;height:auto;flex:none}
.head-text{flex:1;min-width:0}
h1{margin:0;font-size:1.35rem;line-height:1.4}
.meta{margin:2px 0 0;color:#c9d1d9;font-size:.85rem;display:flex;gap:12px;flex-wrap:wrap}
.conn::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#8b949e;margin-inline-end:6px;vertical-align:middle}
.conn.on::before{background:var(--mint);box-shadow:0 0 0 3px rgba(135,252,196,.25)}
.conn.off::before{background:#ff7b72}
.track{height:6px;margin-top:16px;background:#21262d}
.track-fill{height:100%;width:0;background:linear-gradient(270deg,var(--blue),var(--mint));transition:width .6s ease}
.pill{display:inline-flex;align-items:center;gap:8px;padding:3px 14px;border-radius:999px;font-weight:700;font-size:.88rem;white-space:nowrap}
.pill-ok{background:var(--ok-bg);color:var(--ok)}.pill-fail{background:var(--fail-bg);color:var(--fail)}.pill-info{background:var(--info-bg);color:var(--info)}.pill-warn{background:var(--warn-bg);color:var(--warn)}.pill-muted{background:var(--chip);color:var(--muted)}
header .pill-muted{background:#30363d;color:#c9d1d9}
.pill.busy::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.25}}
@keyframes spin{to{transform:rotate(360deg)}}
main{padding:20px 0 4px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;margin:0 0 16px}
.card h2{margin:0 0 10px;font-size:1.1rem}
.muted{color:var(--muted);font-size:.88rem;margin:0}
.ic{width:18px;height:18px;flex:none}
.btn{display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:12px;background:var(--btn-bg);color:var(--btn-ink);font:inherit;font-weight:700;text-decoration:none;border:0;cursor:pointer}
.btn.ghost{background:var(--chip);color:var(--ink)}
.btn:focus-visible{outline:3px solid var(--series);outline-offset:2px}
.btn[disabled]{opacity:.5;cursor:default}
.question{border:2px solid var(--series);background:var(--card);border-radius:16px;padding:16px 18px;margin:0 0 16px}
.question .q-head{display:flex;gap:10px;align-items:center;color:var(--series);font-weight:700;margin-bottom:6px}
.question .q-text{white-space:pre-wrap;margin:0 0 10px;font-size:1.05rem}
.question details{margin:0 0 10px;color:var(--muted);font-size:.9rem}
.question ul{margin:6px 0 0;padding-inline-start:1.2em}
.q-actions{display:flex;flex-wrap:wrap;gap:8px}
.app-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.logo-tile{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,var(--blue),var(--mint));color:#0d1117;flex:none}
.logo-tile svg{width:26px;height:26px}
.app-name{font-size:1.2rem;font-weight:700;margin:0;flex:1;min-width:0}
.app-name small{display:block;color:var(--muted);font-weight:400;font-size:.82rem}
.stages{list-style:none;margin:0 0 14px;padding:12px 0 4px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;border-bottom:1px solid var(--line)}
.stage{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;font-size:.82rem;color:var(--muted)}
.dot{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--chip);color:var(--muted);border:2px solid transparent;position:relative}
.dot svg{width:20px;height:20px}
.stage.active .dot{border-color:var(--series);color:var(--series);background:var(--card)}
.stage.active .dot::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--series);border-inline-end-color:transparent;animation:spin 1s linear infinite}
.stage.done .dot{background:var(--ok-bg);color:var(--ok)}
.stage.failed .dot{background:var(--fail-bg);color:var(--fail)}
.stage.active,.stage.done,.stage.failed{color:var(--ink);font-weight:700}
.tasks{list-style:none;margin:0;padding:0}
.task{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 0;border-bottom:1px solid var(--line)}
.task:last-child{border-bottom:0}
.t-ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--chip);color:var(--muted);position:relative}
.t-ic svg{width:19px;height:19px}
.t-ic .st{position:absolute;inset-inline-start:-4px;bottom:-4px;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;border:2px solid var(--card)}
.t-ic .st svg{width:9px;height:9px}
.s-done .t-ic{color:var(--ok)}.s-done .st{background:var(--ok);color:var(--card)}
.s-failed .t-ic{color:var(--fail)}.s-failed .st{background:var(--fail);color:var(--card)}
.s-running .t-ic{color:var(--series)}.s-running .st{background:var(--card)}
.s-running .st::after{content:"";width:10px;height:10px;border-radius:50%;border:2px solid var(--series);border-inline-end-color:transparent;animation:spin .9s linear infinite}
.s-warn .t-ic{background:var(--warn-bg);color:var(--warn)}
.s-note .t-ic{background:var(--info-bg);color:var(--info)}
.t-title{font-weight:700}
.t-title bdi{font-weight:400;color:var(--muted)}
.t-sub{color:var(--muted);font-size:.85rem;overflow-wrap:anywhere}
.t-time{color:var(--muted);font-size:.8rem;white-space:nowrap}
.build{grid-column:2 / 4;margin-top:6px}
.build summary{cursor:pointer;color:var(--muted);font-size:.88rem;list-style:none;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.build summary::-webkit-details-marker{display:none}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--chip);border-radius:999px;padding:1px 12px;font-size:.85rem;color:var(--ink)}
.chip.warn{background:var(--warn-bg);color:var(--warn);font-weight:700}
.term{background:var(--term);color:var(--term-ink);border-radius:12px;padding:10px 14px;margin:8px 0 0;max-height:280px;overflow:auto;font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;text-align:left}
.term .ph{color:#8b949e;font-family:"Vazirmatn",system-ui,sans-serif;direction:rtl;display:block;text-align:right}
.term .err{color:#ff7b72}
.live{margin-top:14px;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.live-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;background:var(--ok-bg);color:var(--ok)}
.live-bar strong{flex:none}
.live-bar a.url{flex:1;min-width:0;color:inherit;font-weight:700;overflow-wrap:anywhere}
.live-bar .btn{padding:6px 14px}
.live iframe{display:block;width:100%;height:420px;border:0;background:#fff}
.live .hint{margin:0;padding:6px 12px;font-size:.8rem;color:var(--muted);background:var(--soft)}
.report{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.report>div{flex:1;min-width:220px}
.log-all summary{cursor:pointer;font-weight:700}
.timeline{list-style:none;margin:10px 0 0;padding:0;font-size:.88rem}
.timeline li{display:flex;gap:10px;padding:4px 0;border-bottom:1px dashed var(--line)}
.timeline time{color:var(--muted);white-space:nowrap}
footer{color:var(--muted);font-size:.82rem;padding:4px 0 28px}
@media (max-width:640px){header.top{position:static}h1{font-size:1.15rem}.logo{width:46px}.card{padding:16px}.stages{grid-template-columns:repeat(5,minmax(0,1fr))}.dot{width:34px;height:34px}.stage{font-size:.72rem}.live iframe{height:300px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

const SCRIPT = String.raw`(() => {
const $ = (id) => document.getElementById(id);
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (n) => String(n).replace(/\d/g, (d) => FA[d]);
const dur = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? fa(s) + ' ثانیه' : fa(Math.floor(s / 60)) + ' دقیقه' + (s % 60 ? ' و ' + fa(s % 60) + ' ثانیه' : ''); };
const clock = (iso) => fa(new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
const NAMES = {
  approve_plan: 'تأیید برنامه‌ی کار', create_app: 'ساخت برنامه', deploy: 'استقرار', set_envs: 'تنظیم متغیرهای محیطی',
  connect_database: 'اتصال دیتابیس', connect_storage: 'اتصال فضای ذخیره‌سازی', connect_mail: 'راه‌اندازی ایمیل',
  connect_dns: 'تنظیم دامنه و DNS', connect_ai: 'اتصال هوش مصنوعی لیارا', migrate_database: 'انتقال داده‌های دیتابیس',
  migrate_storage: 'انتقال فایل‌ها', deploy_service: 'اجرای سرویس داکر', connect_disk: 'اتصال دیسک', set_cron: 'زمان‌بندی کارها',
  verify_app: 'بررسی سلامت', diagnose: 'عیب‌یابی خطا', app_action: 'تغییر وضعیت برنامه', github_autodeploy: 'استقرار خودکار از GitHub',
  scan_project: 'تحلیل پروژه', write_report: 'نوشتن گزارش', create_vm: 'ساخت سرور مجازی', vm_action: 'تغییر سرور مجازی',
  change_app_plan: 'ارتقای بسته برای بیلد طولانی‌تر',
};
const PLATFORM = { node: 'nodedotjs', nodejs: 'nodedotjs', next: 'nextdotjs', react: 'react', vue: 'vuedotjs', angular: 'angular', static: 'html5', laravel: 'laravel', php: 'php', wordpress: 'wordpress', django: 'django', flask: 'flask', python: 'python', go: 'go', dotnet: 'dotnet', netcore: 'dotnet', docker: 'docker' };
const ENGINE = { mongodb: 'mongodb', postgres: 'postgresql', postgresql: 'postgresql', mysql: 'mysql', mariadb: 'mariadb', redis: 'redis', elasticsearch: 'elasticsearch', rabbitmq: 'rabbitmq', clickhouse: 'clickhouse' };
const TECH = new Set(${JSON.stringify(Object.keys(TECH_ICONS))});
const LINE = { approve_plan: 'shield', set_envs: 'key', connect_storage: 'bucket', migrate_storage: 'bucket', connect_mail: 'mail', connect_dns: 'globe', connect_ai: 'ai', connect_disk: 'disk', set_cron: 'clock', verify_app: 'heart', diagnose: 'wrench', change_app_plan: 'up', scan_project: 'cli', write_report: 'doc', github_autodeploy: 'cli', connect_database: 'stack', migrate_database: 'stack', deploy_service: 'app', create_app: 'app', deploy: 'upload' };
function iconFor(tool, tech) {
  const t = String(tech || '').toLowerCase();
  if (tool === 'connect_database' || tool === 'migrate_database') { if (ENGINE[t]) return 't-' + ENGINE[t]; }
  else if (tool === 'deploy_service') { const k = t.replace(/[^a-z0-9]/g, ''); if (TECH.has(k)) return 't-' + k; return 't-docker'; }
  else if (tool === 'github_autodeploy') return 't-github';
  else if ((tool === 'create_app' || tool === 'deploy') && PLATFORM[t]) return 't-' + PLATFORM[t];
  return 'i-' + (LINE[tool] || 'app');
}
const STATES = { QUEUED: 'در صف', PENDING: 'در صف', BUILDING: 'در حال بیلد', DEPLOYING: 'در حال اجرا', READY: 'آماده', SUCCEEDED: 'آماده', SUCCESS: 'آماده', RUNNING: 'آماده', FAILED: 'ناموفق', ERROR: 'ناموفق', CANCELED: 'لغو شد', CANCELLED: 'لغو شد', TIMEOUT: 'زمانش تمام شد', UNKNOWN: 'نامعلوم' };
const LOC = { germany: 'آلمان', iran: 'ایران' };
const CAUSES = { 'missing-dependency': 'وابستگی جاافتاده', 'missing-start-script': 'دستور اجرای برنامه تعریف نشده', 'runtime-version': 'نسخه‌ی محیط اجرا', 'build-failure': 'خطای بیلد', 'missing-env': 'متغیر محیطی جاافتاده', database: 'اتصال دیتابیس', port: 'پورت اشتباه', resources: 'کمبود منابع', 'third-party': 'سرویس بیرونی', 'liara-config': 'تنظیمات لیارا', 'code-error': 'خطای کد', 'platform-incident': 'اختلال در خود لیارا' };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; };
const svg = (id, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); if (cls) s.setAttribute('class', cls); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#' + id); s.appendChild(u); return s; };
const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null; } catch { return null; } };

const events = [];
function onEvent(ev) { events.push(ev); schedule(); }
let pending = false;
function schedule() { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; render(); }); } }

// Everything per app, rebuilt from the events in order.
function model() {
  const apps = new Map(); const general = []; const steps = new Map(); const questions = new Map();
  const app = (name) => { if (!apps.has(name)) apps.set(name, { name, platform: null, items: [], attempts: [], checks: null, firstId: Infinity }); return apps.get(name); };
  const attemptOf = (a, releaseID) => a.attempts.find((t) => t.releaseID === releaseID) || a.attempts[a.attempts.length - 1];
  for (const ev of events) {
    if (ev.type === 'question') questions.set(ev.qid, ev);
    if (ev.type === 'answer') questions.delete(ev.qid);
    if (ev.type === 'step') {
      const prev = steps.get(ev.step);
      const s = Object.assign({}, prev, ev, { started: prev ? prev.started : ev.time, firstId: prev ? prev.firstId : ev.id });
      if (prev && prev.app && !ev.app) s.app = prev.app;
      steps.set(ev.step, s);
      if (!prev) { const holder = s.app ? app(s.app) : null; (holder ? holder.items : general).push({ kind: 'step', key: ev.step }); if (holder) holder.firstId = Math.min(holder.firstId, ev.id); }
      else if (!prev.app && s.app) { const i = general.findIndex((x) => x.key === ev.step); if (i >= 0) general.splice(i, 1); app(s.app).items.push({ kind: 'step', key: ev.step }); }
      if (s.app && s.tech && (s.tool === 'deploy' || s.tool === 'create_app')) app(s.app).platform = s.tech;
    }
    if (ev.type === 'deploy' && ev.app) {
      const a = app(ev.app);
      if (ev.platform) a.platform = ev.platform;
      if (ev.phase === 'pack' || (ev.phase === 'build' && ev.image && (!a.attempts.length || a.attempts[a.attempts.length - 1].finished))) {
        a.attempts.push({ startId: ev.id, upload: ev.image ? 'done' : 'active', build: 'pending', run: 'pending', logs: [], location: ev.image ? 'image' : null, state: null });
      }
      const t = attemptOf(a, ev.releaseID) || (a.attempts.push({ startId: ev.id, upload: 'pending', build: 'pending', run: 'pending', logs: [] }), a.attempts[a.attempts.length - 1]);
      if (ev.phase === 'uploaded') t.upload = 'done';
      if (ev.phase === 'build') { if (t.releaseID && ev.releaseID && t.releaseID !== ev.releaseID) t.logs.push({ sys: 'بیلد دوباره' }); t.upload = 'done'; t.build = 'active'; t.releaseID = ev.releaseID; if (ev.location) t.location = ev.location; t.logs.push({ sys: ev.location ? 'بیلد در ' + (LOC[ev.location] || ev.location) : 'اجرای ایمیج داکر' }); }
      if (ev.phase === 'state') t.state = ev.state;
      if (ev.phase === 'finished') { t.finished = true; t.success = ev.success; t.build = ev.success ? 'done' : 'failed'; t.run = ev.success ? 'done' : 'failed'; t.url = ev.url; t.state = ev.state; t.endId = ev.id; }
    }
    if (ev.type === 'log' && ev.app) { const a = app(ev.app); const t = attemptOf(a, ev.releaseID); if (t) for (const l of ev.lines || []) t.logs.push({ text: l }); }
    if (ev.type === 'location' && ev.app) { const a = app(ev.app); const t = a.attempts[a.attempts.length - 1]; if (t) t.fallback = ev; a.items.push({ kind: 'notice', ev }); }
    if (ev.type === 'buildTimeout' && ev.app) app(ev.app).items.push({ kind: 'notice', ev });
    if (ev.type === 'diagnosis' && ev.app) app(ev.app).items.push({ kind: 'notice', ev });
    if (ev.type === 'checks' && ev.app) { const a = app(ev.app); a.checks = ev; a.items.push({ kind: 'notice', ev }); }
    if (ev.type === 'note') (ev.app ? app(ev.app).items : general).push({ kind: 'notice', ev });
  }
  return { apps: [...apps.values()].sort((a, b) => a.firstId - b.firstId), general, steps, questions: [...questions.values()] };
}

// Stages of the app's latest attempt. Health counts only checks made after that attempt began.
function stages(a, steps) {
  const st = { services: 'pending', upload: 'pending', build: 'pending', run: 'pending', health: 'pending' };
  const own = a.items.filter((i) => i.kind === 'step').map((i) => steps.get(i.key));
  const svc = own.filter((s) => s.tool !== 'deploy' && s.tool !== 'verify_app' && s.tool !== 'diagnose');
  if (svc.length) st.services = svc.some((s) => s.status === 'running' || s.status === 'waiting') ? 'active' : svc.some((s) => s.status === 'failed' || s.status === 'error') ? 'failed' : 'done';
  const t = a.attempts[a.attempts.length - 1];
  if (t) {
    if (st.services !== 'failed') st.services = 'done';
    st.upload = t.upload; st.build = t.build; st.run = t.run;
    const verify = own.filter((s) => s.tool === 'verify_app' && s.firstId > t.startId).pop();
    if (verify && verify.status === 'running') st.health = 'active';
    else if (a.checks && a.checks.id > t.startId) st.health = a.checks.healthy ? 'done' : 'failed';
    else if (t.success) st.health = 'active';
  }
  return { st, t };
}

function stepRow(s, extra) {
  const cls = s.status === 'running' ? 's-running' : s.status === 'done' || s.status === 'reused' ? 's-done' : s.status === 'waiting' || s.status === 'declined' ? 's-warn' : 's-failed';
  const li = el('li', 'task ' + cls);
  const ic = el('span', 't-ic'); ic.appendChild(svg(iconFor(s.tool, s.tech)));
  const st = el('span', 'st'); if (cls === 's-done') st.appendChild(svg('i-check')); else if (cls === 's-failed') st.appendChild(svg('i-x')); else if (cls === 's-warn') st.appendChild(svg('i-clock'));
  ic.appendChild(st); li.appendChild(ic);
  const body = el('div'); const title = el('div', 't-title', NAMES[s.tool] || s.tool);
  if (s.target && s.target !== s.app) { title.append(' '); title.appendChild(el('bdi', '', s.target)); }
  body.appendChild(title);
  const sub = s.status === 'waiting' ? 'منتظر تأیید شما' : s.status === 'declined' ? 'تأیید نشد' : s.status === 'reused' ? 'از منبع موجود استفاده شد' : s.error || '';
  if (sub) { const d = el('div', 't-sub', sub); d.dir = 'auto'; body.appendChild(d); }
  li.appendChild(body);
  li.appendChild(el('span', 't-time', s.status === 'running' ? 'در حال انجام' : s.ms ? dur(s.ms) : clock(s.time)));
  if (extra) li.appendChild(extra);
  return li;
}
function noticeRow(ev) {
  let cls = 's-warn', ic = 'i-warn', title = '', sub = '';
  if (ev.type === 'note') { cls = 's-note'; ic = 'i-note'; title = ev.text; sub = 'پیام از Claude'; }
  if (ev.type === 'location') { ic = 'i-pin'; title = 'بیلد در آلمان در دسترس نبود؛ بیلد در ایران انجام می‌شود'; sub = ev.reason; }
  if (ev.type === 'buildTimeout') { ic = 'i-clock'; title = 'زمان مجاز بیلد تمام شد'; sub = ev.upgrade && ev.upgrade.possible ? 'می‌شود بسته را به ' + ev.upgrade.bundlePlanID + ' ارتقا داد' + (ev.upgrade.buildMinutes ? ' (بیلد تا ' + fa(ev.upgrade.buildMinutes) + ' دقیقه)' : '') + ' یا دوباره امتحان کرد.' : (ev.upgrade && ev.upgrade.why) || ''; }
  if (ev.type === 'diagnosis') { ic = 'i-wrench'; title = 'علت خطا: ' + (CAUSES[ev.category] || ev.category); sub = [ev.explanation, ev.fix].filter(Boolean).join(' · '); }
  if (ev.type === 'checks') { cls = ev.healthy ? 's-done' : 's-failed'; ic = 'i-heart'; title = ev.healthy ? 'همه‌ی بررسی‌های سلامت درست بود' : 'بعضی بررسی‌های سلامت ناموفق بود'; sub = (ev.checks || []).filter((c) => !c.ok).map((c) => c.name + (c.detail ? ': ' + c.detail : '')).join(' · '); }
  const li = el('li', 'task ' + cls); const box = el('span', 't-ic'); box.appendChild(svg(ic)); li.appendChild(box);
  const body = el('div'); body.appendChild(el('div', 't-title', title)); if (sub) { const d = el('div', 't-sub', sub); d.dir = 'auto'; body.appendChild(d); }
  li.appendChild(body); li.appendChild(el('span', 't-time', clock(ev.time)));
  return li;
}
const openLogs = new Map(); // remembered open/closed state of each build log
function buildPanel(a, t, idx) {
  const key = a.name + '#' + idx;
  const d = el('details', 'build');
  const running = t.build === 'active';
  d.open = openLogs.has(key) ? openLogs.get(key) : running || t.build === 'failed';
  d.addEventListener('toggle', () => openLogs.set(key, d.open));
  const sm = el('summary');
  const loc = el('span', 'chip' + (t.fallback ? ' warn' : '')); loc.appendChild(svg('i-pin', 'ic'));
  loc.append(t.location === 'image' ? 'بدون بیلد: ایمیج داکر' : t.fallback ? 'بیلد در ایران (آلمان در دسترس نبود)' : t.location ? 'بیلد در ' + (LOC[t.location] || t.location) : 'محل بیلد: هنوز شروع نشده');
  sm.appendChild(loc);
  sm.appendChild(el('span', 'chip', 'وضعیت: ' + (t.state ? (STATES[String(t.state).toUpperCase()] || t.state) : '—')));
  sm.appendChild(el('span', '', d.open ? 'بستن لاگ بیلد' : 'نمایش لاگ بیلد'));
  d.appendChild(sm);
  const pre = el('pre', 'term'); pre.dir = 'ltr';
  if (!t.logs.some((l) => l.text)) pre.appendChild(el('span', 'ph', t.build === 'pending' ? 'لاگ بیلد بعد از آپلود اینجا می‌آید.' : 'منتظر لاگ بیلد…'));
  for (const l of t.logs.slice(-800)) pre.appendChild(l.sys ? el('span', 'ph', '— ' + l.sys + ' —') : el('span', /\b(error|err!|failed|fatal)\b/i.test(l.text) ? 'err' : '', l.text + '\n'));
  d.appendChild(pre);
  requestAnimationFrame(() => { pre.scrollTop = pre.scrollHeight; });
  return d;
}

const cards = new Map(); // app name → its card, kept between renders
const frameFor = new Map();
function liveBox(a, url) {
  const box = el('div', 'live');
  const bar = el('div', 'live-bar'); bar.appendChild(svg('i-rocket', 'ic')); bar.appendChild(el('strong', '', 'برنامه آماده است:'));
  const link = el('a', 'url'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; link.dir = 'ltr'; link.textContent = url; bar.appendChild(link);
  const open = el('a', 'btn'); open.href = url; open.target = '_blank'; open.rel = 'noopener'; open.appendChild(svg('i-ext', 'ic')); open.append('باز کردن'); bar.appendChild(open);
  box.appendChild(bar);
  let f = frameFor.get(a.name);
  if (!f || f.dataset.src !== url) { f = el('iframe'); f.src = url; f.dataset.src = url; f.title = 'پیش‌نمایش ' + a.name; f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups'); f.loading = 'lazy'; frameFor.set(a.name, f); }
  box.appendChild(f);
  box.appendChild(el('p', 'hint', 'اگر پیش‌نمایش خالی ماند، برنامه اجازه‌ی نمایش در صفحه‌ی دیگر را نمی‌دهد؛ با «باز کردن» ببینیدش.'));
  return box;
}

function renderQuestions(qs) {
  const box = $('questions'); box.replaceChildren();
  for (const q of qs) {
    const card = el('section', 'question');
    const head = el('div', 'q-head'); head.appendChild(svg('i-shield', 'ic')); head.append('سؤال از شما' + (q.app ? ' درباره‌ی ' : '')); if (q.app) head.appendChild(el('bdi', '', q.app)); card.appendChild(head);
    const text = el('p', 'q-text', q.text); text.dir = 'auto'; card.appendChild(text);
    if (q.details && q.details.length) { const d = el('details'); d.appendChild(el('summary', '', 'جزئیات')); const ul = el('ul'); for (const x of q.details) { const li = el('li', '', x); li.dir = 'auto'; ul.appendChild(li); } d.appendChild(ul); card.appendChild(d); }
    const actions = el('div', 'q-actions');
    for (const o of q.options || []) {
      const b = el('button', 'btn' + (o.primary ? '' : ' ghost'), o.label); b.type = 'button';
      b.addEventListener('click', async () => {
        for (const x of actions.querySelectorAll('button')) x.disabled = true;
        try { const r = await fetch('answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qid: q.qid, choice: o.id }) }); if (!r.ok) throw new Error(); }
        catch { for (const x of actions.querySelectorAll('button')) x.disabled = false; }
      });
      actions.appendChild(b);
    }
    card.appendChild(actions); box.appendChild(card);
  }
  box.querySelector('.question .btn') && document.title.indexOf('●') < 0 && (document.title = '● ' + document.title);
  if (!qs.length) document.title = document.title.replace(/^● /, '');
}

function render() {
  const m = model();
  renderQuestions(m.questions);
  const appsBox = $('apps');
  let stagesDone = 0, stagesAll = 0, anyRunning = false, anyFailed = false, allLive = m.apps.length > 0, anyFinished = false;
  for (const a of m.apps) {
    const { st, t } = stages(a, m.steps);
    stagesAll += 5; stagesDone += Object.values(st).filter((x) => x === 'done').length;
    const running = Object.values(st).includes('active') || a.items.some((i) => i.kind === 'step' && m.steps.get(i.key).status === 'running');
    const failed = !running && Object.values(st).includes('failed');
    const live = t && t.success && st.health === 'done';
    anyRunning ||= running; anyFailed ||= failed; allLive &&= Boolean(live); anyFinished ||= Boolean(t && t.finished);
    // Each app keeps its card; only its parts are redrawn, so the preview frame never reloads.
    let card = cards.get(a.name);
    if (!card) { card = el('section', 'card app'); card.parts = { head: el('div', 'app-head'), stages: el('ol', 'stages'), tasks: el('ul', 'tasks'), live: el('div') }; card.append(card.parts.head, card.parts.stages, card.parts.tasks, card.parts.live); cards.set(a.name, card); appsBox.appendChild(card); }
    const head = card.parts.head; head.replaceChildren();
    const tile = el('span', 'logo-tile'); tile.appendChild(svg(a.platform && PLATFORM[String(a.platform).toLowerCase()] ? 't-' + PLATFORM[String(a.platform).toLowerCase()] : 'i-app')); head.appendChild(tile);
    const nm = el('p', 'app-name'); const b = el('bdi', '', a.name); nm.appendChild(b); nm.appendChild(el('small', '', a.platform ? 'پلتفرم ' + a.platform : 'برنامه')); head.appendChild(nm);
    const pill = el('span', 'pill ' + (live ? 'pill-ok' : failed ? 'pill-fail' : running ? 'pill-info busy' : 'pill-muted'), live ? 'آماده' : failed ? 'نیاز به رفع خطا' : running ? 'در حال انجام' : 'در انتظار');
    head.appendChild(pill);
    const ol = card.parts.stages; ol.replaceChildren();
    [['services', 'سرویس‌ها', 'i-stack'], ['upload', 'آپلود کد', 'i-upload'], ['build', 'بیلد', 'i-hammer'], ['run', 'اجرا', a.platform && PLATFORM[String(a.platform).toLowerCase()] ? 't-' + PLATFORM[String(a.platform).toLowerCase()] : 'i-play'], ['health', 'بررسی سلامت', 'i-heart']].forEach(([k, label, ic]) => {
      const li = el('li', 'stage ' + st[k]); const dot = el('span', 'dot');
      dot.appendChild(svg(st[k] === 'done' ? 'i-check' : st[k] === 'failed' ? 'i-x' : ic)); li.append(dot, el('span', '', label)); ol.appendChild(li);
    });
    const ul = card.parts.tasks; ul.replaceChildren(); let deployIdx = 0;
    const items = a.items.slice().sort((x, y) => (x.kind === 'step' ? m.steps.get(x.key).firstId : x.ev.id) - (y.kind === 'step' ? m.steps.get(y.key).firstId : y.ev.id));
    for (const it of items) {
      if (it.kind === 'notice') { ul.appendChild(noticeRow(it.ev)); continue; }
      const s = m.steps.get(it.key);
      let extra = null;
      if (s.tool === 'deploy') { const att = a.attempts[deployIdx]; deployIdx += 1; if (att) extra = buildPanel(a, att, deployIdx); }
      ul.appendChild(stepRow(s, extra));
    }
    const url = live && safeUrl(t.url);
    if (!url) card.parts.live.replaceChildren();
    else if (card.parts.live.dataset.url !== url) { card.parts.live.replaceChildren(liveBox(a, url)); card.parts.live.dataset.url = url; }
    if (!url) delete card.parts.live.dataset.url;
  }
  // Whole-account steps and notes
  const g = $('general'); const gl = $('general-tasks'); gl.replaceChildren();
  for (const it of m.general) gl.appendChild(it.kind === 'step' ? stepRow(m.steps.get(it.key)) : noticeRow(it.ev));
  g.hidden = !m.general.length;
  $('report').hidden = !anyFinished || anyRunning;
  // Overall
  const pill = $('status');
  const waitingQ = m.questions.length > 0;
  const generalRunning = m.general.some((i) => i.kind === 'step' && m.steps.get(i.key).status === 'running');
  let s = ['pill-muted', 'آماده برای شروع', false];
  if (waitingQ) s = ['pill-warn', 'منتظر پاسخ شما', true];
  else if (anyRunning || generalRunning) s = ['pill-info', m.apps.length > 1 ? 'در حال استقرار ' + fa(m.apps.length) + ' برنامه…' : 'در حال استقرار…', true];
  else if (m.apps.length && allLive) s = ['pill-ok', m.apps.length > 1 ? 'همه‌ی برنامه‌ها آماده‌اند' : 'برنامه آماده است', false];
  else if (anyFailed) s = ['pill-fail', 'نیاز به رفع خطا', false];
  else if (m.general.length || m.apps.length) s = ['pill-info', 'در حال آماده‌سازی…', true];
  pill.className = 'pill ' + s[0] + (s[2] ? ' busy' : ''); pill.textContent = s[1];
  $('progress').style.width = (stagesAll ? Math.round((stagesDone / stagesAll) * 100) : 0) + '%';
  // Full event log
  const tl = $('timeline'); tl.replaceChildren();
  for (const ev of events.slice(-300).reverse()) {
    let text = '';
    if (ev.type === 'step') text = (NAMES[ev.tool] || ev.tool) + (ev.target ? ' · ' + ev.target : '') + ' · ' + ev.status;
    else if (ev.type === 'deploy') text = 'استقرار ' + (ev.app || '') + ' · ' + ev.phase + (ev.state ? ' · ' + ev.state : '') + (ev.location ? ' · ' + ev.location : '');
    else if (ev.type === 'log') continue;
    else if (ev.type === 'question') text = 'سؤال: ' + ev.text;
    else if (ev.type === 'answer') text = 'پاسخ: ' + (ev.choice || 'بی‌پاسخ') + (ev.by === 'page' ? ' (از همین صفحه)' : ev.by === 'claude' ? ' (در Claude)' : '');
    else text = ev.type + (ev.text ? ': ' + ev.text : '');
    const li = el('li'); li.appendChild(el('time', '', clock(ev.time))); const sp = el('span', '', text); sp.dir = 'auto'; li.appendChild(sp); tl.appendChild(li);
  }
}

setInterval(() => {
  if (!events.length) return;
  const m = model();
  const done = m.apps.length && m.apps.every((a) => { const { st, t } = stages(a, m.steps); return t && t.success && st.health === 'done'; }) && !m.questions.length;
  const end = done ? new Date(events[events.length - 1].time).getTime() : Date.now();
  $('elapsed').textContent = 'زمان سپری‌شده: ' + dur(end - new Date(events[0].time).getTime());
}, 1000);

const conn = $('conn');
const src = new EventSource('events');
src.onopen = () => { conn.className = 'conn on'; conn.textContent = 'اتصال زنده'; };
src.onerror = () => { conn.className = 'conn off'; conn.textContent = 'اتصال قطع شد؛ دوباره وصل می‌شود…'; };
const seen = new Set();
src.onmessage = (msg) => { try { const ev = JSON.parse(msg.data); if (seen.has(ev.id)) return; seen.add(ev.id); onEvent(ev); } catch {} };
render();
})();`;
