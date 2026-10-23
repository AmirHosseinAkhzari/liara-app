// Billing as far as the Liara API allows: the balance (Toman), low-credit alert settings,
// free credit, and an ESTIMATE of what the current resources cost per month, priced from
// live plans. Invoices, payments and the console's cost breakdown have no public API, so
// this links to the console instead. Never returns contact details, never pays anything.
import { priceOf, DOCS } from './pricing.mjs';

export const CONSOLE_BILLING = 'https://console.liara.ir/';
export const TOP_UP_DOCS = 'https://docs.liara.ir/references/console/increase-credit/';
// Ready-made choices offered when the balance is low; any other number of days works too.
export const TOP_UP_DAYS = [10, 30];

// The balance is "low" when it is under the account's own low-credit alert amount, or
// lasts fewer days than this at the current spend.
export const lowBalanceDays = () => {
  const n = Number(process.env.LIARA_LOW_BALANCE_DAYS ?? 10);
  return Number.isFinite(n) && n >= 0 ? n : 10;
};

export function isLowBalance({ balanceToman, minCreditAmount, dailyToman }) {
  if (typeof balanceToman !== 'number') return false;
  if (balanceToman <= 0) return true;
  if (typeof minCreditAmount === 'number' && minCreditAmount > 0 && balanceToman < minCreditAmount) return true;
  return dailyToman > 0 && balanceToman / dailyToman < lowBalanceDays();
}

// How much credit keeps today's resources running for `days` more days. Liara charges by the
// hour, so a day costs monthly / 30. The console's top-up field takes Rial (1 Toman = 10 Rial).
export function topUpQuote({ balanceToman, dailyToman, days }) {
  const d = Math.round(Number(days));
  if (!Number.isFinite(d) || d < 1 || d > 3650) throw new Error('days must be a whole number from 1 to 3650.');
  const costToman = Math.ceil((dailyToman || 0) * d);
  const addToman = Math.max(0, costToman - Math.max(0, balanceToman || 0));
  return { days: d, costToman, addToman, addRial: addToman * 10, balanceCovers: addToman === 0 };
}

// Balance of the account calls go to (team balance from /v1/me, personal from /v1/billing).
export async function accountBalance(api) {
  if (api.auth.teamID) {
    const t = (await api.get('account', '/v1/me')).team || {};
    return { balanceToman: t.balance ?? null, minCreditAmount: t.minCreditAmount ?? null };
  }
  const u = (await api.get('billing', '/v1/billing')).user || {};
  return { balanceToman: u.balance ?? null, minCreditAmount: u.minCreditAmount ?? null };
}

export async function billingOverview(api, { days } = {}) {
  const inTeam = Boolean(api.auth.teamID);
  // /v1/billing always answers for the user's own account (it ignores teamID); a team's
  // balance is in /v1/me?teamID=… → team.
  let account;
  if (inTeam) {
    const me = await api.get('account', '/v1/me');
    const t = me.team || {};
    account = { type: 'team', name: t.teamName, balanceToman: t.balance ?? null, minCreditAmount: t.minCreditAmount ?? null, isManualMinCredit: t.isManualMinCredit ?? null, accountType: t.accountType ?? null };
  } else {
    const b = await api.get('billing', '/v1/billing');
    const u = b.user || b;
    const free = await api.get('account', '/v1/me/free-credit').catch(() => null);
    account = {
      type: 'personal', balanceToman: u.balance ?? null, accountType: u.accountType ?? null,
      minCreditAmount: u.minCreditAmount ?? null, isManualMinCredit: u.isManualMinCredit ?? null,
      lowCreditLastNotifiedAt: u.minCreditLastNotifiedAt ?? null, remainingFreeCreditToman: free?.remainingFreeCredit ?? null,
    };
  }

  // What runs on the account now, priced from current plans.
  const [projects, databases, buckets, vms] = await Promise.all([
    api.get('paas', '/v1/projects').then((r) => r.projects || []).catch(() => null),
    api.get('dbaas', '/v1/databases').then((r) => r.databases || []).catch(() => null),
    api.get('storage', '/api/v1/buckets').then((r) => r.buckets || []).catch(() => null),
    api.get('iaas', '/vm').then((r) => r.vms || []).catch(() => null),
  ]);
  const lines = []; const unknown = []; const checks = [];
  const price = async (kind, name, plan, bundle, state) => {
    if (!plan) { unknown.push(`${kind} ${name}: plan not reported`); return; }
    const p = await priceOf(api, { kind, plan, bundle }).catch(() => null);
    if (p?.monthlyToman == null) unknown.push(`${kind} ${name} (${plan}${bundle ? ` + ${bundle}` : ''}): price not in the live list`);
    lines.push({ kind, name, plan, bundle: bundle || undefined, state, monthlyToman: p?.monthlyToman ?? null });
  };
  for (const p of projects || []) {
    await price('app', p.project_id, p.planID, p.bundlePlanID, p.scale === 0 ? 'stopped' : p.status);
    if (p.scale === 0) checks.push(`App ${p.project_id} is stopped (scale 0). The API does not say whether stopped apps are still charged; check the console, and delete it if you no longer need it.`);
    if (p.isDeployed === false) checks.push(`App ${p.project_id} has never been deployed.`);
  }
  for (const d of databases || []) {
    await price('database', d.hostname, d.planID, d.bundlePlanID, d.status);
    if (/stop/i.test(d.status || '')) checks.push(`Database ${d.hostname} is ${d.status}.`);
  }
  for (const b of buckets || []) await price('bucket', b.name, b.plan, null, b.status);
  for (const v of vms || []) {
    await price('vps', v.name, v.plan, null, v.power);
    if (v.power === 'POWERED_OFF') checks.push(`VPS ${v.name} is powered off. The API does not say whether it is still charged; check the console.`);
  }
  const total = lines.reduce((s, l) => s + (l.monthlyToman || 0), 0);
  const daily = total / 30;
  const balance = account.balanceToman;
  const lasts = typeof balance === 'number' && daily > 0 ? Math.max(0, Math.floor(balance / daily)) : null;
  const low = isLowBalance({ balanceToman: balance, minCreditAmount: account.minCreditAmount, dailyToman: daily });
  const custom = days !== undefined && days !== null;
  const wanted = custom ? [Number(days)] : low ? TOP_UP_DAYS : [];
  const topUp = typeof balance === 'number' && wanted.length ? {
    quotes: wanted.map((d) => topUpQuote({ balanceToman: balance, dailyToman: daily, days: d })),
    ...(custom ? {} : { customDays: 'Any other number of days: call billing again with days.' }),
    howToPay: `Liara console → profile → «افزایش اعتبار» (add credit): type the amount in Rial (addRial), then pay. ${CONSOLE_BILLING}`,
    docs: TOP_UP_DOCS,
    note: 'Estimate at the current daily spend (monthly plan prices / 30), without taxes, AI usage or traffic. The plugin never pays or adds credit.',
  } : null;
  return {
    account,
    resources: lines,
    estimatedMonthlyToman: total,
    estimatedDailyToman: Math.round(daily),
    estimateComplete: unknown.length === 0,
    priceGaps: unknown,
    ...(lasts !== null ? { balanceLastsAboutDays: lasts, balanceRunsOutAround: new Date(Date.now() + (Math.max(0, balance) / daily) * 86_400_000).toISOString().slice(0, 10) } : {}),
    lowBalance: low,
    ...(low ? { askUser: 'The balance is low. Ask the user with buttons how long the services should keep running: 10 days, 30 days, or a number of days they choose. Then show the amount to add in Toman and Rial (billing {days} for a custom number) and the console link.' } : {}),
    ...(topUp ? { topUp } : {}),
    worthChecking: checks,
    notAvailableViaApi: ['invoices and payment history', 'actual charges so far this month', 'adding credit or paying'],
    console: CONSOLE_BILLING,
    docs: [DOCS.costEstimate, 'https://docs.liara.ir/references/api/billing/', 'https://docs.liara.ir/references/console/receive-invoice/'],
    notes: [
      'Balance is what the Liara API reports now. The monthly figure is an ESTIMATE from current plan prices (excluding taxes, discounts, AI usage and traffic), not an invoice.',
      'Real charges and invoices: Liara console → profile → add credit → cost estimation / invoices.',
    ],
    fetchedAt: new Date().toISOString(),
  };
}
