// The deployment page: one Persian page made of cards and charts, and nothing else.
//   1. پلن‌هایی که خریدید — a card per paid resource: a picture of the product, plan, specs, price
//   2. هزینه‌ی هر سرویس در ماه — a bar chart of what each resource costs per month
//   3. موجودی و زمان باقی‌مانده — balance, daily spend, days left, a chart of the balance running
//      down and, only when the balance is low, a top-up picker: 10 days, 30 days or any number
//   4. اتصال سرویس‌ها — the app and its services drawn like an n8n workflow, with the env var
//      names on each connection
// Self-contained and offline: CSS, icons, logo and font are embedded. One small inline script
// only recalculates the "any number of days" top-up; everything else works without it.
// Facts come from the session journal and the live Liara API; values go through esc() (which
// also scrubs secrets), so no secret value can reach the page.
import { billingOverview, topUpQuote, CONSOLE_BILLING, TOP_UP_DOCS, TOP_UP_DAYS } from './billing.mjs';
import { priceOf, planSpecs } from './pricing.mjs';
import { esc, v, faDigits, faNum, fmtNum, faCompact, fmtTime, faDate, safeUrl, logoSvg, fontFaces } from './htmlkit.mjs';

const PRICE_KIND = { app: 'app', service: 'app', database: 'database', bucket: 'bucket', mail: 'mail', vps: 'vps' };
const KIND = { app: 'برنامه', service: 'سرویس داکر', database: 'دیتابیس', bucket: 'ذخیره‌سازی ابری', mail: 'سرور ایمیل', ai: 'هوش مصنوعی لیارا', vps: 'سرور مجازی', dns: 'دامنه', users: 'کاربران' };
const ENGINE = { postgres: 'PostgreSQL', mysql: 'MySQL', mariadb: 'MariaDB', mongodb: 'MongoDB', redis: 'Redis', mssql: 'SQL Server', elasticsearch: 'Elasticsearch', rabbitmq: 'RabbitMQ', clickhouse: 'ClickHouse' };
const kindName = (i) => (i.kind === 'database' && ENGINE[i.detail] ? `${KIND.database} ${ENGINE[i.detail]}` : KIND[i.kind] || i.kind);
const tman = (n) => `${fmtNum(n, 'fa')} تومان`;

// Line icons (24×24, stroked), used as the plan pictures and inside the service map.
const ICONS = {
  app: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/><path d="M10 12.5 8 14.5l2 2M14 12.5l2 2-2 2"/>',
  service: '<path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4z"/><path d="M4 7.4l8 4.6 8-4.6M12 12v9.2"/>',
  database: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  bucket: '<ellipse cx="12" cy="6.5" rx="8" ry="2.5"/><path d="M4 6.5l1.8 12a2 2 0 0 0 2 1.7h8.4a2 2 0 0 0 2-1.7l1.8-12"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  ai: '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  vps: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6"/>',
  dns: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-6 6.5-6s5.9 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .8 3.2 2.9 3.5 5.7"/>',
  wallet: '<path d="M4 7.5V18a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3"/><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v2.5"/><path d="M4 7.5h15a1 1 0 0 1 1 1V12h-4a2 2 0 0 0 0 4h4"/>',
  warn: '<path d="M12 3.5 21 19.5H3z"/><path d="M12 10v4M12 17h.01"/>',
};
const iconDefs = () => `<svg class="defs" aria-hidden="true" width="0" height="0"><defs>${Object.entries(ICONS).map(([k, d]) => `<symbol id="ic-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</symbol>`).join('')}</defs></svg>`;
const icon = (kind, cls = 'ic') => `<svg class="${cls}" aria-hidden="true" viewBox="0 0 24 24"><use href="#ic-${ICONS[kind] ? kind : 'service'}"/></svg>`;
const card = (title, iconKind, body) => `<section class="card"><h2>${icon(iconKind, 'ic h-ic')}${esc(title)}</h2>${body}</section>`;
const trunc = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));
const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };
const r1 = (n) => Math.round(n * 10) / 10;

// One entry per resource (a resource touched twice keeps "created" and every env var name).
function resources(infra) {
  const map = new Map();
  for (const i of infra) {
    const key = `${i.kind}:${i.name}`;
    const prev = map.get(key) || {};
    const defined = Object.fromEntries(Object.entries(i).filter(([, x]) => x !== undefined && x !== null));
    map.set(key, { ...prev, ...defined, how: prev.how === 'created' ? 'created' : i.how, envVars: [...new Set([...(prev.envVars || []), ...(i.envVars || [])])] });
  }
  return [...map.values()];
}

// Paid resources with their live price and what the plan gives.
async function pricedPlans(api, items) {
  const out = [];
  for (const i of items) {
    if (!i.plan || i.how === 'configured') continue;
    const kind = PRICE_KIND[i.kind];
    const p = api && kind ? await priceOf(api, { kind, plan: i.plan, bundle: i.bundle }).catch(() => null) : null;
    const specs = api && kind ? await planSpecs(api, { kind, plan: i.plan }).catch(() => ({})) : {};
    out.push({ ...i, monthlyToman: typeof p?.monthlyToman === 'number' ? p.monthlyToman : null, usageBased: i.kind === 'ai', specs, fetchedAt: p?.fetchedAt });
  }
  return out;
}

// ---- 1. what was bought ----
function planCard(p) {
  const s = p.specs || {};
  const specs = [
    s.cpu !== undefined && `${faNum(s.cpu)} هسته‌ی پردازنده`,
    s.ramGB !== undefined && `${faNum(s.ramGB)} گیگابایت رم`,
    s.diskGB !== undefined && `${faNum(s.diskGB)} گیگابایت دیسک`,
    s.spaceGB !== undefined && `${faNum(s.spaceGB)} گیگابایت فضا`,
    s.mailAccounts !== undefined && `${faNum(s.mailAccounts)} صندوق ایمیل`,
  ].filter(Boolean);
  const price = p.usageBased ? '<span class="price-main">هزینه بر اساس مصرف</span>'
    : typeof p.monthlyToman === 'number' ? `<span class="price-main">${tman(p.monthlyToman)}</span><span class="price-sub">در ماه، حدود ${tman(p.monthlyToman / 30)} در روز</span>`
      : '<span class="price-main">قیمت این پلن در فهرست لیارا پیدا نشد</span>';
  const isNew = p.how === 'created';
  return `<article class="plan">
<div class="plan-img">${icon(p.kind, 'ic-lg')}</div>
<div class="plan-body">
<p class="plan-kind">${esc(kindName(p))}<span class="badge ${isNew ? 'badge-new' : 'badge-old'}">${isNew ? 'خرید جدید' : 'از قبل داشتید'}</span></p>
<h3>${v(p.name)}</h3>
<p class="plan-id">پلن ${v(p.plan)}${p.bundle ? `، بسته‌ی ${v(p.bundle)}` : ''}</p>
${specs.length ? `<ul class="specs">${specs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<p class="price">${price}</p>
</div>
</article>`;
}

function plansSection(plans) {
  if (!plans.length) return card('پلن‌هایی که خریدید', 'app', '<p class="note">در این جلسه منبع پولی ساخته یا استفاده نشد.</p>');
  return card('پلن‌هایی که خریدید', 'app', `<div class="plans">${plans.map(planCard).join('')}</div>`);
}

// ---- 2. cost per resource ----
function costSection(plans) {
  const rows = plans.filter((p) => typeof p.monthlyToman === 'number').sort((a, b) => b.monthlyToman - a.monthlyToman);
  if (!rows.length) return '';
  const max = rows[0].monthlyToman || 1;
  const total = rows.reduce((s, p) => s + p.monthlyToman, 0);
  const missing = plans.filter((p) => typeof p.monthlyToman !== 'number').length;
  const fetched = rows.map((p) => p.fetchedAt).filter(Boolean).sort()[0];
  const bars = rows.map((r) => {
    // The fill uses at most 76% of the track so the value always fits at its tip.
    const pct = Math.max(1.5, (r.monthlyToman / max) * 76).toFixed(1);
    return `<div class="bar-row" title="${esc(`${kindName(r)} ${r.name}: ${tman(r.monthlyToman)} در ماه`)}">
<span class="bar-label">${icon(r.kind)}<span><bdi>${esc(trunc(r.name, 28))}</bdi><small>${esc(kindName(r))}</small></span></span>
<span class="bar-track"><span class="bar-fill" style="inline-size:${pct}%"></span><span class="bar-val">${esc(fmtNum(r.monthlyToman, 'fa'))}</span></span>
</div>`;
  }).join('');
  return card('هزینه‌ی هر سرویس در ماه', 'wallet', `<p class="chart-sub">به تومان، از قیمت فعلی پلن‌ها</p>
<div class="bars" role="img" aria-label="${esc(`هزینه‌ی ماهانه‌ی هر سرویس. جمع: ${tman(total)}`)}">${bars}</div>
<p class="total">جمع: ${esc(tman(total))} در ماه، حدود ${esc(tman(total / 30))} در روز${missing ? ` (قیمت ${esc(faNum(missing))} مورد پیدا نشد)` : ''}</p>
<p class="note">این مبلغ برآوردی از قیمت فعلی پلن‌هاست و فاکتور نیست. مالیات، تخفیف، مصرف هوش مصنوعی و ترافیک در آن حساب نشده است.${fetched ? ` زمان دریافت قیمت‌ها: ${v(fmtTime(fetched, 'fa'))}` : ''}</p>`);
}

// ---- 3. balance, time left, top-up ----
function runwayChart({ balance, daily, now }) {
  const days = balance / daily;
  const maxDay = Math.max(1, Math.min(Math.ceil(days), 365));
  const W = 640; const H = 236; const m = { top: 20, right: 84, bottom: 44, left: 28 };
  const pw = W - m.left - m.right; const ph = H - m.top - m.bottom;
  const x = (d) => r1(W - m.right - (d / maxDay) * pw); // today on the right: time reads right to left
  const y = (b) => r1(m.top + (1 - b / balance) * ph);
  const endDay = Math.min(days, maxDay);
  const endBal = Math.max(0, balance - daily * endDay);
  const x0 = x(0); const y0 = y(balance); const x1 = x(endDay); const y1 = y(endBal); const yb = y(0);
  const date = (d) => faDate(new Date(now.getTime() + d * 86_400_000), { year: false });
  const grid = [0, 0.5, 1].map((t) => `<line class="grid" x1="${m.left}" x2="${W - m.right}" y1="${y(balance * t)}" y2="${y(balance * t)}"/><text class="tick" x="${W - 6}" y="${y(balance * t) + 4}" text-anchor="start">${esc(faCompact(balance * t))}</text>`).join('');
  const mid = maxDay / 2;
  const xt = (d, label, cls = 'tick') => {
    const px = x(d);
    // In right-to-left text, "start" is the right edge and "end" the left edge.
    const anchor = px < m.left + 50 ? 'end' : px > W - m.right - 30 ? 'start' : 'middle';
    const ax = anchor === 'end' ? m.left : anchor === 'start' ? W - m.right + 4 : px;
    return `<text class="${cls}" x="${ax}" y="${H - 10}" text-anchor="${anchor}">${esc(label)}</text>`;
  };
  const summary = `موجودی امروز ${tman(balance)}. با هزینه‌ی روزانه‌ی ${tman(daily)}، حدود ${faNum(Math.floor(days))} روز دیگر تمام می‌شود.`;
  return `<figure class="runway"><svg viewBox="0 0 ${W} ${H}" direction="rtl" role="img" aria-label="${esc(summary)}"><title>${esc(summary)}</title>
${grid}
<path class="r-area" d="M${x0} ${y0} L${x1} ${y1} L${x1} ${yb} L${x0} ${yb}Z"/>
<line class="baseline" x1="${m.left}" x2="${W - m.right}" y1="${yb}" y2="${yb}"/>
<path class="r-line" d="M${x0} ${y0} L${x1} ${y1}"/>
<circle class="r-dot" cx="${x0}" cy="${y0}" r="5"/><circle class="r-dot" cx="${x1}" cy="${y1}" r="5"/>
${xt(0, 'امروز')}${maxDay >= 8 ? xt(mid, date(mid)) : ''}${days <= 365 ? xt(days, `پایان اعتبار: ${date(days)}`, 'tick tick-end') : xt(maxDay, `${date(maxDay)}، بیش از یک سال`, 'tick tick-end')}
</svg><figcaption class="chart-sub">موجودی حساب در روزهای آینده، اگر هزینه‌ی روزانه همین بماند</figcaption></figure>`;
}

function quoteBlock(q, { id, custom, balance }) {
  const k = (key, val) => (custom ? `<span data-k="${key}">${val}</span>` : val);
  return `<div class="quote quote-${id}${q.balanceCovers ? ' covered' : ''}"${custom ? ' id="topup-custom"' : ''}>
${custom ? `<label class="days-field"><span>چند روز؟</span><input id="topup-days-input" type="text" inputmode="numeric" autocomplete="off" value="${esc(faDigits(q.days))}"></label>` : ''}
<dl class="quote-grid">
<div><dt>هزینه‌ی ${k('days', esc(faNum(q.days)))} روز</dt><dd><span>${k('cost', esc(fmtNum(q.costToman, 'fa')))} تومان</span></dd></div>
<div><dt>موجودی فعلی</dt><dd><span>${esc(tman(balance))}</span></dd></div>
<div class="pay"><dt>اعتباری که باید اضافه کنید</dt><dd><span>${k('add', esc(fmtNum(q.addToman, 'fa')))} تومان</span><small>${k('rial', esc(fmtNum(q.addRial, 'fa')))} ریال، مبلغی که در کنسول وارد می‌کنید</small></dd></div>
</dl>
<p class="covered-msg">موجودی فعلی برای این مدت کافی است.</p>
${custom ? '<p class="bad-msg">عددی بین ۱ تا ۳۶۵۰ وارد کنید.</p>' : ''}
</div>`;
}

function topUpPicker({ balance, daily }) {
  const presets = TOP_UP_DAYS.map((d) => topUpQuote({ balanceToman: balance, dailyToman: daily, days: d }));
  const custom = topUpQuote({ balanceToman: balance, dailyToman: daily, days: 60 });
  const chips = [...TOP_UP_DAYS.map((d, i) => `<input type="radio" name="topup-days" id="td-${d}"${i === 0 ? ' checked' : ''}><label for="td-${d}">${esc(faNum(d))} روز</label>`), '<input type="radio" name="topup-days" id="td-x"><label for="td-x">دلخواه</label>'].join('');
  const quotes = [...presets.map((q) => quoteBlock(q, { id: q.days, balance })), quoteBlock(custom, { id: 'x', custom: true, balance })].join('');
  return `<details class="topup" id="topup" data-daily="${daily}" data-balance="${balance}">
<summary class="btn">افزایش اعتبار</summary>
<div class="topup-panel">
<p class="topup-q">سرویس‌ها تا چند روز دیگر روشن بمانند؟</p>
<div class="choices">${chips}<div class="quotes">${quotes}</div></div>
<p class="pay-row"><a class="btn btn-pay" href="${esc(CONSOLE_BILLING)}" rel="noopener">رفتن به کنسول لیارا برای پرداخت</a></p>
<p class="note">در کنسول روی پروفایل بزنید، «افزایش اعتبار» را باز کنید و مبلغ را به ریال وارد کنید. <a href="${esc(TOP_UP_DOCS)}" rel="noopener">راهنمای افزایش اعتبار</a></p>
<p class="note">این مبلغ با هزینه‌ی روزانه‌ی فعلی حساب شده و مالیات، مصرف هوش مصنوعی و ترافیک در آن نیست. افزونه هیچ‌وقت خودش پرداخت نمی‌کند.</p>
</div>
</details>`;
}

function balanceSection(bill, now) {
  const title = 'موجودی و زمان باقی‌مانده';
  const balance = bill?.account?.balanceToman;
  if (typeof balance !== 'number') return card(title, 'wallet', '<p class="note">موجودی حساب از لیارا دریافت نشد.</p>');
  const monthly = bill.estimatedMonthlyToman || 0;
  const daily = monthly / 30;
  const days = daily > 0 ? Math.max(0, Math.floor(balance / daily)) : null;
  const who = bill.account.type === 'team' ? `تیم ${bill.account.name || ''}`.trim() : 'حساب شخصی';
  const tile = (k, val, sub, hero) => `<div class="tile${hero ? ' tile-hero' : ''}"><span class="k">${esc(k)}</span><span class="val">${val}</span>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;
  const tiles = [
    tile('موجودی فعلی', `${esc(fmtNum(balance, 'fa'))} <small>تومان</small>`, esc(who), true),
    tile('هزینه‌ی روزانه', daily > 0 ? `${esc(fmtNum(daily, 'fa'))} <small>تومان</small>` : 'صفر', daily > 0 ? `همه‌ی سرویس‌های حساب، حدود ${esc(tman(monthly))} در ماه` : 'سرویس پولی روشنی پیدا نشد'),
    tile('زمان باقی‌مانده', days === null ? 'نامحدود' : `حدود ${esc(faNum(days))} <small>روز</small>`, days === null ? 'موجودی با هزینه‌ی فعلی کم نمی‌شود' : ''),
    tile('پایان اعتبار', days === null ? '—' : esc(faDate(new Date(now.getTime() + (balance / daily) * 86_400_000))), days === null ? '' : 'اگر هزینه‌ی روزانه همین بماند'),
  ].join('');
  let alert = '';
  if (bill.lowBalance) {
    const reasons = [];
    if (balance <= 0) reasons.push('موجودی حساب تمام شده است.');
    else {
      if (days !== null) reasons.push(`با هزینه‌ی فعلی، موجودی حدود ${faNum(days)} روز دیگر تمام می‌شود.`);
      const min = bill.account.minCreditAmount;
      if (typeof min === 'number' && min > 0 && balance < min) reasons.push(`موجودی از حد هشدار حساب (${tman(min)}) کمتر است.`);
    }
    const why = `اعتبار حساب کم است. ${reasons.join(' ')}`;
    alert = `<div class="alert" role="status">${icon('warn')}<span>${esc(why)}</span></div>${topUpPicker({ balance, daily })}`;
  }
  const chart = balance > 0 && daily > 0 ? runwayChart({ balance, daily, now }) : '';
  return card(title, 'wallet', `<div class="tiles">${tiles}</div>${alert}${chart}`);
}

// ---- 4. how the services connect (n8n-style map) ----
function serviceMap({ appName, appUrl, items, healthy, deployOk }) {
  const title = 'اتصال سرویس‌ها به هم';
  if (!appName) return card(title, 'service', '<p class="note">در این جلسه برنامه‌ای ساخته یا مستقر نشد.</p>');
  const mine = (i) => !i.forApp || i.forApp === appName;
  const services = items.filter((i) => ['database', 'bucket', 'mail', 'ai', 'service'].includes(i.kind) && mine(i));
  const domains = items.filter((i) => i.kind === 'dns' && mine(i));
  const entries = domains.length ? domains.map((d) => ({ kind: 'dns', title: KIND.dns, name: d.name })) : [{ kind: 'users', title: KIND.users, name: hostOf(appUrl) || 'اینترنت' }];
  const W = 880; const NODE = 76; const HUB = 92; const ROW = 140; const TOP = 26;
  const rows = Math.max(services.length, entries.length, 1);
  const H = TOP + rows * ROW;
  const X = { entry: 770, app: 440, svc: 110 };
  const cy = (i, n) => r1(TOP + (rows * ROW * (i + 0.5)) / n - 20);
  const appY = cy(0, 1);
  const node = ({ x, y, size, kind, label, name, hub }) => `<g class="g-node${hub ? ' g-hub' : ''}"><title>${esc(`${label}: ${name}`)}</title>
<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="${hub ? 20 : 16}"/>
<use href="#ic-${ICONS[kind] ? kind : 'service'}" x="${x - (hub ? 21 : 17)}" y="${y - (hub ? 21 : 17)}" width="${hub ? 42 : 34}" height="${hub ? 42 : 34}"/>
<text class="g-kind" x="${x}" y="${y + size / 2 + 22}" text-anchor="middle">${esc(label)}</text>
<text class="g-name" x="${x}" y="${y + size / 2 + 41}" text-anchor="middle">${esc(trunc(name, 24))}</text></g>`;
  const edge = (sx, sy, tx, ty, label, more, tip) => {
    const dx = r1((sx - tx) / 2);
    const mx = r1((sx + tx) / 2); const my = r1((sy + ty) / 2);
    const text = trunc(label || '', 22);
    const w = r1(text.length * 8 + 26);
    const pillMarkup = text ? `<g class="g-pill"><title>${esc(tip || text)}</title><rect x="${r1(mx - w / 2)}" y="${my - 12}" width="${w}" height="24" rx="12"/><text x="${mx}" y="${my + 4}" text-anchor="middle" direction="ltr">${esc(text)}</text>${more ? `<g class="g-count"><circle cx="${r1(mx - w / 2 - 4)}" cy="${my - 10}" r="10"/><text x="${r1(mx - w / 2 - 4)}" y="${my - 6}" text-anchor="middle">${esc(`+${faNum(more)}`)}</text></g>` : ''}</g>` : '';
    return `<path class="g-edge" d="M${sx} ${sy} C${r1(sx - dx)} ${sy} ${r1(tx + dx)} ${ty} ${tx} ${ty}" marker-end="url(#g-arrow)"/><circle class="g-port" cx="${sx}" cy="${sy}" r="5"/>${pillMarkup}`;
  };
  const parts = [];
  entries.forEach((e, i) => {
    const y = cy(i, entries.length);
    parts.push(edge(X.entry - NODE / 2, y, X.app + HUB / 2 + 8, appY, 'HTTPS', 0, e.kind === 'dns' ? `${e.name} → ${appName}` : appUrl));
  });
  services.forEach((s, i) => {
    const y = cy(i, services.length);
    const vars = s.envVars || [];
    parts.push(edge(X.app - HUB / 2, appY, X.svc + NODE / 2 + 8, y, vars[0] || '', Math.max(0, vars.length - 1), vars.join(', ')));
  });
  entries.forEach((e, i) => parts.push(node({ x: X.entry, y: cy(i, entries.length), size: NODE, kind: e.kind, label: e.title, name: e.name })));
  services.forEach((s, i) => parts.push(node({ x: X.svc, y: cy(i, services.length), size: NODE, kind: s.kind, label: kindName(s), name: s.name })));
  parts.push(node({ x: X.app, y: appY, size: HUB, kind: 'app', label: KIND.app, name: appName, hub: true }));
  // The hub's state badge, like n8n's check mark on a node that ran.
  const state = deployOk === true && healthy !== false ? 'ok' : deployOk === false || healthy === false ? 'fail' : null;
  if (state) {
    const bx = X.app + HUB / 2 - 4; const by = appY - HUB / 2 + 4;
    parts.push(`<g class="g-state g-${state}"><title>${state === 'ok' ? 'استقرار موفق' : 'مشکل در استقرار یا سلامت'}</title><circle cx="${bx}" cy="${by}" r="11"/>${state === 'ok' ? `<path d="M${bx - 5} ${by} l3.5 3.5 6.5-7"/>` : `<path d="M${bx} ${by - 5} v6 M${bx} ${by + 4.5} v.5"/>`}</g>`);
  }
  const lines = [
    ...entries.map((e) => `${e.title} ${e.name} به برنامه‌ی ${appName} وصل است.`),
    ...services.map((s) => `برنامه‌ی ${appName} به ${kindName(s)} ${s.name} وصل است${s.envVars?.length ? ` (متغیرها: ${s.envVars.join('، ')})` : ''}.`),
  ];
  const svg = `<svg viewBox="0 0 ${W} ${H}" direction="rtl" role="img" aria-label="${esc(`نقشه‌ی اتصال سرویس‌های ${appName}`)}">
<defs><marker id="g-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="g-arrow" d="M0 0 10 5 0 10z"/></marker></defs>
${parts.join('\n')}
</svg>`;
  return card(title, 'service', `<p class="chart-sub">کاربران از سمت راست به برنامه می‌رسند و برنامه با متغیرهای محیطیِ روی هر خط به سرویس‌ها وصل می‌شود.</p>
<div class="map">${svg}</div>
<ul class="sr-only">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
${services.length ? '' : '<p class="note">در این جلسه سرویسی به این برنامه وصل نشد.</p>'}`);
}

// Recalculates the "any number of days" quote. Reads only data-* attributes, writes only text.
const SCRIPT = String.raw`(() => {
  const box = document.getElementById('topup');
  const input = document.getElementById('topup-days-input');
  const q = document.getElementById('topup-custom');
  if (!box || !input || !q) return;
  const daily = Number(box.dataset.daily);
  const balance = Number(box.dataset.balance);
  const fa = (n) => Math.round(n).toLocaleString('en-US').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]).replace(/,/g, '٬');
  const ascii = (s) => s.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const set = (k, t) => { for (const el of q.querySelectorAll('[data-k="' + k + '"]')) el.textContent = t; };
  const render = () => {
    const days = Math.round(Number(ascii(input.value.trim())));
    const ok = Number.isFinite(days) && days >= 1 && days <= 3650;
    q.classList.toggle('bad', !ok);
    if (!ok) return;
    const cost = Math.ceil(daily * days);
    const add = Math.max(0, cost - Math.max(0, balance));
    set('days', fa(days)); set('cost', fa(cost)); set('add', fa(add)); set('rial', fa(add * 10));
    q.classList.toggle('covered', add === 0);
  };
  input.addEventListener('input', render);
})();`;

const CSS = `
:root{--ink:#0d1117;--muted:#57606a;--line:#d8dee4;--bg:#f6f8fa;--card:#ffffff;--canvas:#f3f5f8;--dot:#d5dbe1;--brand-dark:#0d1117;--mint:#87fcc4;--blue:#28c1f5;
--series:#1a86cf;--wash:rgba(26,134,207,.12);--edge:#8c959f;--ok:#0b6b45;--ok-bg:#dcf7ea;--fail:#a4161a;--fail-bg:#fde4e2;--warn:#7a4f00;--warn-bg:#fff1cc;--chip:#eef1f4;--info:#075985;--info-bg:#e0f2fe;--btn-bg:#0d1117;--btn-ink:#ffffff;}
@media (prefers-color-scheme: dark){:root{--ink:#e6edf3;--muted:#9aa5b1;--line:#30363d;--bg:#0d1117;--card:#161b22;--canvas:#11161d;--dot:#262c34;
--series:#2f9fd8;--wash:rgba(47,159,216,.16);--edge:#6e7681;--ok:#7ee2b8;--ok-bg:#0f3d2a;--fail:#ffb3ad;--fail-bg:#4a1517;--warn:#ffd27a;--warn-bg:#3a2c06;--chip:#21262d;--info:#9bdcff;--info-bg:#0c3550;--btn-bg:#87fcc4;--btn-ink:#0d1117;}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.85 "Vazirmatn","Yekan","IRANYekan",system-ui,Tahoma,sans-serif}
.defs{position:absolute;width:0;height:0;overflow:hidden}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
header.top{background:var(--brand-dark);color:#fff;padding:28px 0 0}
.wrap{max-width:1000px;margin:0 auto;padding:0 16px}
header.top .wrap{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.logo{width:72px;height:auto;flex:none}
header.top h1{margin:0;font-size:1.6rem;line-height:1.4}
header.top .meta{color:#c9d1d9;font-size:.9rem;margin:2px 0 0}
.status{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:8px 0 0}
.status a{color:var(--mint)}
.bar{height:6px;margin-top:24px;background:linear-gradient(270deg,var(--blue),var(--mint))}
.pill{display:inline-block;padding:2px 12px;border-radius:999px;font-size:.85rem;font-weight:700}
.pill-ok{background:var(--ok-bg);color:var(--ok)}.pill-fail{background:var(--fail-bg);color:var(--fail)}.pill-info{background:var(--info-bg);color:var(--info)}.pill-muted{background:var(--chip);color:var(--muted)}
main{padding:24px 0 8px}
main,.wrap,section.card,.plan-body{min-width:0}
section.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;margin:0 0 18px}
section.card h2{margin:0 0 14px;font-size:1.2rem;line-height:1.5;display:flex;align-items:center;gap:10px}
.ic{width:22px;height:22px;flex:none}
.h-ic{color:var(--series)}
p{margin:.4em 0}
.note{color:var(--muted);font-size:.88rem}
.chart-sub{color:var(--muted);font-size:.88rem;margin:-6px 0 12px}
bdi,a{overflow-wrap:anywhere}
a{color:var(--series)}
.plans{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:14px}
.plan{display:flex;gap:14px;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--card)}
.plan-img{flex:none;width:76px;height:76px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg,var(--blue),var(--mint));color:#0d1117}
.ic-lg{width:40px;height:40px}
.plan-kind{display:flex;flex-wrap:wrap;align-items:center;gap:8px;color:var(--muted);font-size:.88rem;margin:0}
.badge{font-size:.75rem;font-weight:700;padding:1px 10px;border-radius:999px}
.badge-new{background:var(--ok-bg);color:var(--ok)}.badge-old{background:var(--chip);color:var(--muted)}
.plan h3{margin:2px 0;font-size:1.1rem}
.plan-id{font-size:.9rem;margin:0}
.specs{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:8px 0;padding:0}
.specs li{background:var(--chip);border-radius:8px;padding:0 10px;font-size:.85rem}
.price{margin:6px 0 0;display:flex;flex-direction:column}
.price-main{font-weight:700;font-size:1.05rem}
.price-sub{color:var(--muted);font-size:.85rem}
.bars{display:grid;gap:14px}
.bar-row{display:grid;grid-template-columns:minmax(0,13rem) minmax(0,1fr);gap:12px;align-items:center}
.bar-label{display:flex;gap:8px;align-items:center;min-width:0;line-height:1.4}
.bar-label .ic{color:var(--series)}
.bar-label small{display:block;color:var(--muted);font-size:.8rem}
.bar-track{display:flex;align-items:center;gap:8px;min-width:0;border-inline-start:1px solid var(--line);min-height:28px}
.bar-fill{display:block;height:20px;background:var(--series);border-start-end-radius:4px;border-end-end-radius:4px;flex:none}
.bar-val{font-size:.9rem;font-weight:700;white-space:nowrap}
.total{font-weight:700;margin-top:14px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:12px}
.tile{border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column}
.tile .k{color:var(--muted);font-size:.85rem}
.tile .val{font-size:1.45rem;font-weight:700;line-height:1.5}
.tile-hero .val{font-size:2.1rem}
.tile .val small{font-size:.9rem;font-weight:400;color:var(--muted)}
.tile .sub{color:var(--muted);font-size:.8rem}
.runway{margin:18px 0 0}
.runway svg{display:block;width:100%;height:auto}
.grid{stroke:var(--line);stroke-width:1}
.baseline{stroke:var(--edge);stroke-width:1}
.tick{fill:var(--muted);font-size:12px}
.r-area{fill:var(--wash)}
.r-line{stroke:var(--series);stroke-width:2;fill:none;stroke-linecap:round}
.r-dot{fill:var(--series);stroke:var(--card);stroke-width:2}
.tick-end{fill:var(--ink);font-weight:700}
.alert{display:flex;gap:10px;align-items:flex-start;background:var(--warn-bg);color:var(--warn);border-radius:12px;padding:12px 14px;font-weight:700;margin:16px 0 12px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:12px;background:var(--btn-bg);color:var(--btn-ink);font-weight:700;cursor:pointer;text-decoration:none;border:0;font-size:1rem}
.btn:focus-visible{outline:3px solid var(--series);outline-offset:2px}
summary.btn{list-style:none}
summary.btn::-webkit-details-marker{display:none}
.topup[open] summary.btn{background:var(--chip);color:var(--ink)}
.topup-panel{border:1px solid var(--line);border-radius:14px;padding:16px;margin-top:12px}
.topup-q{font-weight:700;margin:0}
.choices{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}
.choices>input{position:absolute;opacity:0;width:1px;height:1px}
.choices>label{padding:6px 18px;border:1px solid var(--line);border-radius:999px;cursor:pointer;font-weight:700}
.choices>input:checked+label{background:var(--btn-bg);color:var(--btn-ink);border-color:var(--btn-bg)}
.choices>input:focus-visible+label{outline:3px solid var(--series);outline-offset:2px}
.quotes{flex-basis:100%;margin-top:6px}
.quote{display:none}
#td-10:checked~.quotes .quote-10,#td-30:checked~.quotes .quote-30,#td-x:checked~.quotes .quote-x{display:block}
.days-field{display:flex;align-items:center;gap:10px;margin:8px 0}
.days-field input{font:inherit;width:7rem;padding:4px 10px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
.quote-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:10px;margin:10px 0}
.quote-grid div{border:1px solid var(--line);border-radius:12px;padding:8px 12px}
.quote-grid dt{color:var(--muted);font-size:.85rem}
.quote-grid dd{margin:0;font-weight:700;font-size:1.15rem;display:flex;flex-direction:column}
.quote-grid dd small{font-weight:400;font-size:.8rem;color:var(--muted)}
.quote-grid .pay{border-color:var(--series);border-width:2px}
.covered-msg,.bad-msg{display:none;font-weight:700}
.quote.covered .covered-msg{display:block;color:var(--ok)}
.quote.covered .pay{opacity:.55}
.quote.bad .bad-msg{display:block;color:var(--fail)}
.quote.bad .quote-grid{opacity:.4}
.pay-row{margin:14px 0 6px}
.map{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background-color:var(--canvas);background-image:radial-gradient(var(--dot) 1.2px,transparent 1.2px);background-size:22px 22px}
.map svg{display:block;width:100%;min-width:660px;height:auto}
.g-node rect{fill:var(--card);stroke:var(--line);stroke-width:1.5}
.g-hub rect{stroke:var(--series);stroke-width:2.5}
.g-node use{color:var(--series)}
.g-kind{fill:var(--muted);font-size:13px}
.g-name{fill:var(--ink);font-size:14px;font-weight:700}
.g-edge{fill:none;stroke:var(--edge);stroke-width:2}
.g-arrow{fill:var(--edge)}
.g-port{fill:var(--card);stroke:var(--edge);stroke-width:2}
.g-pill rect{fill:var(--card);stroke:var(--line);stroke-width:1}
.g-pill>text{fill:var(--ink);font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.g-count circle{fill:var(--series)}
.g-count text{fill:#fff;font-size:11px;font-weight:700}
.g-state circle{stroke:var(--card);stroke-width:2}
.g-ok circle{fill:var(--ok)}.g-fail circle{fill:var(--fail)}
.g-state path{stroke:var(--card);stroke-width:2.2;fill:none;stroke-linecap:round;stroke-linejoin:round}
footer{color:var(--muted);font-size:.85rem;padding:8px 0 32px}
@media (max-width:600px){header.top h1{font-size:1.3rem}.logo{width:56px}section.card{padding:16px}.bar-row{grid-template-columns:1fr;gap:4px}.tile-hero .val{font-size:1.7rem}.runway .tick{font-size:21px}}
@media print{body{background:#fff}header.top{background:#fff;color:#000}header.top .meta{color:#333}.topup-panel{display:block}}
`;

export async function buildDeployPage({ f, api = null, now = new Date(), appName = '' }) {
  const items = resources(f.infra);
  const plans = await pricedPlans(api, items);
  const bill = api ? await billingOverview(api).catch(() => null) : null;
  const d = f.deploy?.result || {};
  const deployOk = f.deploy ? d.success === true : null;
  const healthy = f.verify?.result?.healthy;
  const url = safeUrl(d.url) || (appName ? `https://${appName}.liara.run` : null);

  const status = !f.deploy ? ['muted', 'در این جلسه استقراری انجام نشد']
    : !deployOk ? ['fail', 'استقرار ناموفق بود']
      : healthy === true ? ['ok', 'برنامه مستقر شد و سالم است']
        : healthy === false ? ['fail', 'برنامه مستقر شد، اما بعضی بررسی‌های سلامت ناموفق بود']
          : ['info', 'برنامه مستقر شد؛ بررسی سلامت انجام نشد'];
  const title = 'گزارش استقرار در لیارا';

  const sections = [
    plansSection(plans),
    costSection(plans),
    balanceSection(bill, now),
    serviceMap({ appName, appUrl: url, items, healthy, deployOk }),
  ].filter(Boolean);

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="generator" content="Liara plugin for Claude">
<meta name="description" content="${esc(`${title}${appName ? `: ${appName}` : ''}`)}">
<title>${esc(`${title}${appName ? ` · ${appName}` : ''}`)}</title>
<style>${fontFaces('fa')}${CSS}</style>
</head>
<body>
${iconDefs()}
<header class="top"><div class="wrap">${logoSvg()}<div><h1>${esc(title)}${appName ? ` <bdi>${esc(appName)}</bdi>` : ''}</h1><p class="meta">زمان تهیه: ${v(fmtTime(now.toISOString(), 'fa'))} به وقت تهران</p>
<p class="status"><span class="pill pill-${status[0]}">${esc(status[1])}</span>${f.deploy && url ? `<a href="${esc(url)}" rel="noopener"><bdi>${esc(url)}</bdi></a>` : ''}</p></div></div><div class="bar"></div></header>
<main class="wrap">
${sections.join('\n')}
</main>
<footer class="wrap"><p>این صفحه را افزونه‌ی لیارا برای Claude از روی کارهای ثبت‌شده و اطلاعات زنده‌ی لیارا ساخته است. مقدار رمزها و کلیدها هرگز در آن نمی‌آید.</p></footer>
<script>${SCRIPT}</script>
</body>
</html>
`;
  return { html, title, appName, sections: sections.length, lang: 'fa' };
}
