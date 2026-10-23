// Liara product catalog and live prices, from the official API only:
//   GET api.liara.ir/v1/me             apps, databases, object storage, mail plans + feature bundles
//   GET iaas-api.liara.ir/plans         VPS plans;  GET iaas-api.liara.ir/oss  VPS operating systems
//   GET ai.liara.ir/v2/models (public)  AI models with per-token prices
// Prices are Toman (AI: per token, unit as the API lists it). Results are cached for
// 10 minutes per account and always say when they were fetched. Nothing is hardcoded.
import { bundlesOf, needsNetwork, monthly, forNewApps } from './deploy.mjs';

const TTL = 10 * 60_000;
const cache = new Map();
async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}
export const clearPriceCache = () => cache.clear();

const account = (api) => api.auth.teamID || 'personal';
const now = () => new Date().toISOString();

export const SOURCES = {
  me: 'Liara API GET https://api.liara.ir/v1/me (plans)',
  vps: 'Liara API GET https://iaas-api.liara.ir/plans',
  ai: 'Liara API GET https://ai.liara.ir/v2/models',
};

export const DOCS = {
  apps: 'https://docs.liara.ir/paas/details/plans/about/',
  databases: 'https://docs.liara.ir/dbaas/details/plans/about/',
  storage: 'https://docs.liara.ir/object-storage/about/',
  mail: 'https://docs.liara.ir/email-server/about/',
  vps: 'https://docs.liara.ir/iaas/about/',
  ai: 'https://docs.liara.ir/ai/about/',
  costEstimate: 'https://docs.liara.ir/references/console/cost-estimation/',
};

export function meCatalog(api) {
  return cached(`me:${account(api)}`, async () => {
    const me = await api.get('account', '/v1/me');
    return { fetchedAt: now(), source: SOURCES.me, plans: me.plans || {}, databaseVersions: me.databaseVersions || {} };
  });
}

export function vpsCatalog(api) {
  return cached(`vps:${account(api)}`, async () => {
    const [plans, oss] = await Promise.all([api.get('iaas', '/plans'), api.get('iaas', '/oss').catch(() => null)]);
    return { fetchedAt: now(), source: SOURCES.vps, plans: plans?.plans && !plans.free ? plans.plans : plans || {}, oss: oss || {} };
  });
}

export function aiCatalog(api) {
  return cached('ai', async () => {
    // 20 models per page; only "page" is accepted (no limit/perPage).
    const first = await api.get('ai', '/v2/models');
    const list = [...(first?.models || [])];
    const pages = Math.min(Math.ceil((first?.total || list.length) / (first?.limit || 20)), 30);
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => api.get('ai', '/v2/models', { query: { page: i + 2 } }).catch(() => null)));
    for (const r of rest) list.push(...(r?.models || []));
    return { fetchedAt: now(), source: SOURCES.ai, models: list, total: first?.total ?? list.length };
  });
}

const available = (obj) => Object.entries(obj || {}).filter(([, p]) => p && typeof p === 'object' && p.available !== false && p.deprecated !== true);

// One product's plans, cheapest first.
export async function productPlans(api, product) {
  if (product === 'vps') {
    const c = await vpsCatalog(api);
    const plans = available(c.plans).map(([id, p]) => ({
      id, ram: p.RAM?.amount, cpu: p.CPU?.amount, disk: p.volume, monthlyToman: monthly(p),
      hourlyToman: p.hourlyPrice ?? null, ipv4MonthlyToman: Array.isArray(p.IPv4MonthlyPrice) ? p.IPv4MonthlyPrice[0] : p.IPv4MonthlyPrice ?? null,
    }));
    const os = Object.entries(c.oss || {}).filter(([k]) => k !== 'one-click-apps').map(([name, versions]) => ({ name, versions }));
    return { product, fetchedAt: c.fetchedAt, source: c.source, plans: sortByPrice(plans), operatingSystems: os, oneClickApps: c.oss?.['one-click-apps'] || {}, docs: DOCS.vps };
  }
  if (product === 'ai') {
    const c = await aiCatalog(api);
    const models = c.models.map((m) => ({ id: m.id, name: m.name, modality: m.architecture?.modality, contextLength: m.context_length, pricePerToken: m.pricing || null }));
    return { product, fetchedAt: c.fetchedAt, source: c.source, total: c.total ?? models.length, models, unit: 'Prices per token, exactly as the API lists them (the API does not state the currency). Usage-based: you pay for what you use.', docs: DOCS.ai };
  }
  const c = await meCatalog(api);
  const group = { apps: 'projects', databases: 'databases', storage: 'objectStorage', mail: 'mail' }[product];
  if (!group) throw new Error(`Unknown product "${product}". Use apps, databases, storage, mail, vps or ai.`);
  const bundleGroup = { apps: 'projectBundlePlans', databases: 'databaseBundlePlans' }[product];
  const plans = available(c.plans[group]).map(([id, p]) => ({
    id,
    ...(p.RAM ? { ram: p.RAM.amount ?? p.RAM, cpu: p.CPU?.amount ?? p.CPU } : {}),
    ...(p.volume !== undefined ? { disk: p.volume } : {}),
    ...(p.space !== undefined ? { space: p.space } : {}),
    ...(p.maxAccount !== undefined ? { maxAccounts: p.maxAccount, freeMails: p.numberOfFreeMails } : {}),
    ...(p.supports ? { supports: p.supports } : {}),
    monthlyToman: monthly(p),
    ...(typeof p.price === 'number' ? { hourlyToman: p.price } : {}),
    ...(needsNetwork(id) ? { needsNetwork: true } : {}),
    ...(bundleGroup && bundlesOf(c.plans, bundleGroup, id) ? { bundles: bundlesOf(c.plans, bundleGroup, id) } : {}),
    ...(product === 'apps' && !forNewApps(id) ? { forNewApps: false } : {}),
  }));
  // New apps go on g2 plans; older plans are listed after them for existing resources.
  const sorted = sortByPrice(plans).sort((a, b) => (a.forNewApps === false) - (b.forNewApps === false));
  return { product, fetchedAt: c.fetchedAt, source: c.source, plans: sorted, docs: DOCS[product], ...(product === 'apps' ? { note: 'Plans with forNewApps: false are older plans that existing apps may still use; Liara creates new apps on g2 plans (with a bundle).' } : {}) };
}

const sortByPrice = (list) => list.sort((a, b) => (a.monthlyToman ?? Infinity) - (b.monthlyToman ?? Infinity));

// Monthly price of one resource. kind: app | database | bucket | mail | vps.
export async function priceOf(api, { kind, plan, bundle, ipv4 = false }) {
  const parts = [];
  let fetchedAt; let source;
  if (kind === 'vps') {
    const c = await vpsCatalog(api);
    ({ fetchedAt, source } = c);
    const p = c.plans[plan];
    if (!p) return { kind, plan, found: false, monthlyToman: null, fetchedAt, source, note: `No VPS plan "${plan}" in the live list.` };
    parts.push({ label: `VPS plan ${plan}`, monthlyToman: monthly(p) });
    if (ipv4) {
      const ip = Array.isArray(p.IPv4MonthlyPrice) ? p.IPv4MonthlyPrice[0] : p.IPv4MonthlyPrice;
      if (typeof ip === 'number') parts.push({ label: 'IPv4 address', monthlyToman: ip });
    }
  } else {
    const c = await meCatalog(api);
    ({ fetchedAt, source } = c);
    const group = { app: 'projects', database: 'databases', bucket: 'objectStorage', mail: 'mail' }[kind];
    const p = c.plans[group]?.[plan];
    if (!p) return { kind, plan, found: false, monthlyToman: null, fetchedAt, source, note: `No ${kind} plan "${plan}" in the live list.` };
    parts.push({ label: `${kind} plan ${plan}`, monthlyToman: monthly(p) });
    const bundleGroup = { app: 'projectBundlePlans', database: 'databaseBundlePlans' }[kind];
    if (bundle && bundleGroup) {
      const b = bundlesOf(c.plans, bundleGroup, plan)?.find((x) => x.id === bundle);
      parts.push({ label: `feature bundle ${bundle}`, monthlyToman: b ? b.monthlyToman : null });
    }
  }
  const unknown = parts.some((x) => x.monthlyToman === null || x.monthlyToman === undefined);
  return {
    kind, plan, bundle: bundle || undefined, found: true, parts,
    monthlyToman: unknown ? null : parts.reduce((s, x) => s + x.monthlyToman, 0),
    fetchedAt, source,
  };
}

// Several resources at once, with a total and what the number does and doesn't include.
export async function estimate(api, items) {
  const lines = [];
  for (const it of items) lines.push({ ...(await priceOf(api, it)), count: it.count || 1, name: it.name });
  const known = lines.filter((l) => typeof l.monthlyToman === 'number');
  const total = known.reduce((s, l) => s + l.monthlyToman * l.count, 0);
  return {
    estimate: true,
    lines,
    totalMonthlyToman: total,
    complete: known.length === lines.length,
    fetchedAt: lines.map((l) => l.fetchedAt).filter(Boolean).sort()[0] || now(),
    sources: [...new Set(lines.map((l) => l.source).filter(Boolean))],
    notes: [
      'Estimate from the current plan prices in the Liara API, not an invoice.',
      'Plans also have an hourly price in the API (monthly ≈ hourly × 720), so a resource that runs part of a month costs proportionally less.',
      'Not included: taxes or discounts (the API and plan docs do not state them), AI usage (per token), and any usage-based traffic. Your real charges are in the Liara console under cost estimation.',
      ...(known.length === lines.length ? [] : ['Some prices could not be found in the live list; the total leaves them out.']),
    ],
    docs: DOCS.costEstimate,
  };
}

// What a plan gives (CPU cores, RAM GB, disk GB, storage GB, mail accounts), from the live
// lists, for showing a plan to the user. Unknown fields are left out.
export async function planSpecs(api, { kind, plan }) {
  let p;
  if (kind === 'vps') p = (await vpsCatalog(api)).plans?.[plan];
  else {
    const group = { app: 'projects', database: 'databases', bucket: 'objectStorage', mail: 'mail' }[kind];
    p = group ? (await meCatalog(api)).plans?.[group]?.[plan] : null;
  }
  if (!p || typeof p !== 'object') return {};
  const n = (x) => (typeof x === 'number' ? x : typeof x?.amount === 'number' ? x.amount : undefined);
  const out = { cpu: n(p.CPU), ramGB: n(p.RAM), diskGB: n(p.volume), spaceGB: n(p.space), mailAccounts: n(p.maxAccount) };
  return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined));
}

export const formatToman = (n) => (typeof n === 'number' ? `${Math.round(n).toLocaleString('en-US')} Toman` : 'unknown');
