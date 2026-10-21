// Small HTTP client for every Liara API (see docs/api in this repo).
import { resolveAuth } from './config.mjs';

export const BASE_URLS = {
  paas: 'https://api.liara.ir',
  dbaas: 'https://api.liara.ir',
  account: 'https://api.liara.ir',
  billing: 'https://api.liara.ir',
  storage: 'https://storage-service.liara.ir',
  dns: 'https://dns-service.liara.ir',
  mail: 'https://mail-service.liara.ir',
  iaas: 'https://iaas-api.liara.ir',
  ai: 'https://ai.liara.ir',
};

export class LiaraError extends Error {
  constructor(message, { status, body, method, url } = {}) {
    super(message);
    this.status = status;
    this.body = body;
    this.method = method;
    this.url = url;
  }
}

export function createClient({ cwd = process.cwd(), token, teamID } = {}) {
  const auth = token ? { token, teamID, source: 'argument' } : resolveAuth(cwd);

  async function request(service, method, path, { body, query, form, raw, timeoutMs = 120_000 } = {}) {
    if (!auth.token) {
      throw new LiaraError(
        'No Liara API token found. Set LIARA_API_TOKEN (Liara Console → Account → API), put it in the project .env, or run `liara login`.',
        { status: 0 },
      );
    }
    if (!BASE_URLS[service]) throw new LiaraError(`Unknown Liara service "${service}". Use one of: ${Object.keys(BASE_URLS).join(', ')}`);
    // LIARA_API_MOCK points every service at one local server (tests only).
    const base = process.env.LIARA_API_MOCK ? `${process.env.LIARA_API_MOCK}/${service}` : BASE_URLS[service];
    const url = new URL(path.startsWith('http') ? path : base + path);
    for (const [k, v] of Object.entries(query || {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    if (auth.teamID && !url.searchParams.has('teamID')) url.searchParams.set('teamID', auth.teamID);

    const headers = { Authorization: `Bearer ${auth.token}`, Accept: 'application/json' };
    let payload;
    if (form) {
      payload = form;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
    } catch (err) {
      throw new LiaraError(`Network error calling ${method} ${url.pathname}: ${err.message}`, { method, url: url.pathname });
    } finally {
      clearTimeout(timer);
    }
    if (raw) return res;
    const text = await res.text();
    let data = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // keep text
    }
    if (!res.ok) {
      if (res.status === 401) {
        throw new LiaraError(
          `Liara rejected the API token (401) from ${auth.source}. It is expired, revoked or mistyped. Create a new one in Liara Console → Account → API and set LIARA_API_TOKEN (or run \`liara login\`).`,
          { status: 401, body: data, method, url: url.pathname },
        );
      }
      const detail = typeof data === 'object' && data ? data.message || data.error || JSON.stringify(data) : text;
      throw new LiaraError(`${method} ${url.pathname} → ${res.status}: ${String(detail).slice(0, 500)}`, {
        status: res.status,
        body: data,
        method,
        url: url.pathname,
      });
    }
    return data;
  }

  const api = {
    auth: { source: auth.source, teamID: auth.teamID, hasToken: Boolean(auth.token) },
    request,
    get: (s, p, o) => request(s, 'GET', p, o),
    post: (s, p, body, o) => request(s, 'POST', p, { ...o, body }),
    patch: (s, p, body, o) => request(s, 'PATCH', p, { ...o, body }),
    put: (s, p, body, o) => request(s, 'PUT', p, { ...o, body }),
    del: (s, p, o) => request(s, 'DELETE', p, o),
  };

  // Returns null on 404 instead of throwing.
  api.maybe = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof LiaraError && err.status === 404) return null;
      throw err;
    }
  };

  return api;
}
