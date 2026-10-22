// Liara's official status page (https://liara.online). The page is a client-side app;
// its data comes from a public PocketBase API at api.liara.online with two collections:
// services (name, operational) and incidents (title, impact, status, services, started_at,
// resolved_at). Read-only, no login. Nothing is claimed beyond what this data says.
const BASE = process.env.LIARA_STATUS_API || 'https://api.liara.online';
export const STATUS_PAGE = 'https://liara.online/';
const STALE_DAYS = 3;

async function getJson(url, timeoutMs = 15_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function serviceStatus({ days = 30 } = {}) {
  const fetchedAt = new Date().toISOString();
  const [services, incidents] = await Promise.all([
    getJson(`${BASE}/api/collections/services/records?sort=position&perPage=200`),
    getJson(`${BASE}/api/collections/incidents/records?sort=-started_at&perPage=50`),
  ]);
  const byId = new Map((services.items || []).map((s) => [s.id, s.name]));
  const since = Date.now() - days * 86_400_000;
  const list = (incidents.items || []).map((i) => {
    const started = Date.parse(String(i.started_at).replace(' ', 'T'));
    const open = !i.resolved_at && i.status !== 'resolved';
    const ageDays = Number.isFinite(started) ? Math.round(((Date.now() - started) / 86_400_000) * 10) / 10 : null;
    return {
      title: i.title,
      impact: i.impact,
      status: i.status,
      open,
      startedAt: i.started_at,
      resolvedAt: i.resolved_at || null,
      services: (i.services || []).map((id) => byId.get(id) || id),
      ageDays,
      ...(open && ageDays > STALE_DAYS ? { note: `Still marked "${i.status}" after ${ageDays} days; it may simply not have been closed. Check the status page before blaming it.` } : {}),
      startedMs: started,
    };
  }).filter((i) => i.open || i.startedMs >= since);
  const svc = (services.items || []).map((s) => ({ name: s.name, operational: Boolean(s.operational) }));
  const clean = (i) => { const { startedMs, ...rest } = i; return rest; };
  return {
    fetchedAt,
    source: `${STATUS_PAGE} (data: ${BASE})`,
    allOperational: svc.every((s) => s.operational),
    services: svc,
    notOperational: svc.filter((s) => !s.operational).map((s) => s.name),
    openIncidents: list.filter((i) => i.open).map(clean),
    recentIncidents: list.filter((i) => !i.open).slice(0, 10).map(clean),
    link: STATUS_PAGE,
  };
}

// Is a platform problem a likely cause for this kind of resource right now?
export function platformSignal(status, products = ['PaaS']) {
  if (!status) return { known: false, note: 'Status page could not be read.' };
  const down = status.notOperational.filter((n) => products.includes(n));
  const fresh = status.openIncidents.filter((i) => i.services.some((s) => products.includes(s)) && (i.ageDays ?? 99) <= STALE_DAYS);
  return {
    known: true,
    likely: down.length > 0 || fresh.length > 0,
    notOperational: down,
    incidents: fresh.map((i) => `${i.title} (${i.impact}, ${i.status}, since ${i.startedAt})`),
    note: down.length || fresh.length
      ? 'Liara reports a problem with this service right now; it may be the cause.'
      : `${products.join(', ')} reported operational on the status page.`,
  };
}
