// Package mirrors for builds in Iran. Liara's own mirror comes first; when it fails, the
// backups come from the Mirava list of Iranian mirrors (https://github.com/MiravaOrg/Mirava).
// Mirava lists homepages only, so each address below is the registry endpoint the provider
// documents, checked with a real package request (checkMirrors does the same at deploy time).
// A mirror is applied to the uploaded copy of the project only, never to the user's files.

export const MIRAVA = 'https://github.com/MiravaOrg/Mirava/blob/main/README.fa.md';

// ecosystem → [{ id, name, url }], in order of preference. Liara first.
export const MIRRORS = {
  npm: [
    { id: 'liara', name: 'Liara', url: 'https://package-mirror.liara.ir/repository/npm/' },
    { id: 'runflare', name: 'Runflare', url: 'https://mirror-npm.runflare.com/' },
    { id: 'chabokan', name: 'Chabokan', url: 'https://mirror2.chabokan.net/npm/' },
    { id: 'kargadan', name: 'Kargadan', url: 'https://mirror.kargadan.ir/repository/npm-group/' },
  ],
  pypi: [
    { id: 'liara', name: 'Liara', url: 'https://package-mirror.liara.ir/repository/pypi/simple/' },
    { id: 'runflare', name: 'Runflare', url: 'https://mirror-pypi.runflare.com/simple/' },
    { id: 'chabokan', name: 'Chabokan', url: 'https://mirror2.chabokan.net/pypi/simple/' },
    { id: 'hamravesh', name: 'Hamravesh', url: 'https://repo.hmirror.ir/python/simple/' },
    { id: 'kargadan', name: 'Kargadan', url: 'https://mirror.kargadan.ir/repository/pypi-group/simple/' },
  ],
  composer: [
    { id: 'liara', name: 'Liara', url: 'https://package-mirror.liara.ir/repository/composer/' },
    { id: 'runflare', name: 'Runflare', url: 'https://mirror-composer.runflare.com/' },
    { id: 'chabokan', name: 'Chabokan', url: 'https://mirror2.chabokan.net/composer/' },
    { id: 'kargadan', name: 'Kargadan', url: 'https://mirror.kargadan.ir/repository/composer-jamko/' },
  ],
  go: [
    { id: 'liara', name: 'Liara', url: 'https://package-mirror.liara.ir/repository/go/' },
    { id: 'runflare', name: 'Runflare', url: 'https://mirror-go.runflare.com/' },
    { id: 'kargadan', name: 'Kargadan', url: 'https://mirror.kargadan.ir/repository/go-group/' },
  ],
  nuget: [
    { id: 'liara', name: 'Liara', url: 'https://package-mirror.liara.ir/repository/nuget/index.json' },
    { id: 'runflare', name: 'Runflare', url: 'https://mirror-nuget.runflare.com/v3/index.json' },
    { id: 'kargadan', name: 'Kargadan', url: 'https://mirror.kargadan.ir/repository/nuget-group/index.json' },
  ],
};

// A real request per ecosystem, and what the answer must contain.
const PROBE = {
  npm: { path: (u) => `${u}express`, ok: /"express"/ },
  pypi: { path: (u) => `${u}requests/`, ok: /requests-\d/ },
  composer: { path: (u) => `${u}packages.json`, ok: /"(packages|providers|metadata-url|providers-url)"/ },
  go: { path: (u) => `${u}github.com/gin-gonic/gin/@v/list`, ok: /^v\d/m },
  nuget: { path: (u) => u, ok: /"resources"/ },
};

// Tests point every mirror at a local server (LIARA_MIRROR_URL_TEMPLATE, {id} and {eco}).
export function mirrorsFor(eco) {
  const t = process.env.LIARA_MIRROR_URL_TEMPLATE;
  return (MIRRORS[eco] || []).map((m) => (t ? { ...m, url: t.replace('{id}', m.id).replace('{eco}', eco) } : m));
}

async function probe(eco, m, timeoutMs) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(PROBE[eco].path(m.url), { signal: ctrl.signal, headers: { accept: 'application/json, text/html;q=0.9, */*;q=0.5' } });
    const text = (await res.text()).slice(0, 20_000);
    const ok = res.ok && PROBE[eco].ok.test(text);
    return { ...m, ok, status: res.status, ms: Date.now() - started, ...(ok ? {} : { error: res.ok ? 'unexpected answer' : `HTTP ${res.status}` }) };
  } catch (err) {
    return { ...m, ok: false, status: null, ms: Date.now() - started, error: err.name === 'AbortError' ? `no answer within ${timeoutMs / 1000}s` : err.cause?.code || err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Which mirrors answer right now, per ecosystem (all checked at the same time).
export async function checkMirrors(ecosystems = Object.keys(MIRRORS), { timeoutMs = 6000 } = {}) {
  const out = {};
  await Promise.all(ecosystems.filter((e) => MIRRORS[e]).map(async (eco) => {
    out[eco] = await Promise.all(mirrorsFor(eco).map((m) => probe(eco, m, timeoutMs)));
  }));
  return { checkedAt: new Date().toISOString(), source: MIRAVA, mirrors: out };
}

// The first working backup (not Liara) for an ecosystem, or null.
export async function pickBackup(eco, { exclude = ['liara'], timeoutMs } = {}) {
  const r = await checkMirrors([eco], { timeoutMs });
  return (r.mirrors[eco] || []).find((m) => m.ok && !exclude.includes(m.id)) || null;
}

// Package managers a project uses, from its files.
export function ecosystemsOf(files) {
  const has = (re) => files.some((f) => re.test(f));
  const out = [];
  if (has(/(^|\/)package\.json$/)) out.push('npm');
  if (has(/(^|\/)(requirements[^/]*\.txt|Pipfile|pyproject\.toml|setup\.py)$/)) out.push('pypi');
  if (has(/(^|\/)composer\.json$/)) out.push('composer');
  if (has(/(^|\/)go\.mod$/)) out.push('go');
  if (has(/\.(csproj|fsproj|vbproj|sln)$/)) out.push('nuget');
  return out;
}

// A build that failed because packages could not be downloaded (a mirror or registry down),
// not because of the code. Returns the ecosystems involved (best guess), or [].
const NET = /(ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|ENETUNREACH|socket hang up|network (?:error|timeout)|timed? ?out|Connection (?:reset|refused|aborted)|Could not resolve host|Temporary failure in name resolution|502 Bad Gateway|503 Service Unavailable|504 Gateway Time-?out|\b50[234]\b|SSL|certificate|i\/o timeout|dial tcp|proxyconnect|TLS handshake)/i;
const ECO_LINES = {
  npm: /npm (?:ERR!|error)|yarn (?:error|install)|ERR_PNPM_|pnpm |registry\.npmjs|\/repository\/npm|npm-group|mirror-npm|\/npm\//i,
  pypi: /pip(?:3)? |Could not fetch URL|ReadTimeoutError|NewConnectionError|No matching distribution found|Retrying \(Retry|\/simple\/|pypi/i,
  composer: /composer|packagist|packages\.json|curl error \d+ while downloading/i,
  go: /^go: |go mod download|GOPROXY|proxy\.golang\.org|@v\/list|\.mod: /im,
  nuget: /NU1301|NU1302|Unable to load the service index|nuget/i,
};
export function mirrorFailure(log) {
  const lines = String(log || '').split('\n');
  const found = new Set();
  for (const line of lines) {
    if (!NET.test(line) && !/package-mirror\.liara\.ir.*(fail|error|refused|timeout|unreachable)|NU1301|Could not fetch URL|Unable to load the service index|curl error \d+ while downloading|failed to open stream: HTTP request failed/i.test(line)) continue;
    for (const [eco, re] of Object.entries(ECO_LINES)) if (re.test(line)) found.add(eco);
    if (/package-mirror\.liara\.ir\/repository\/(\w+)/i.test(line)) found.add(line.match(/package-mirror\.liara\.ir\/repository\/(\w+)/i)[1].toLowerCase());
  }
  return [...found].filter((e) => MIRRORS[e]);
}

// Files to put in the uploaded copy so the build uses mirror m for eco.
// read(rel) returns the project's file text or null. Returns { files: {rel: text}, note } or null.
export function mirrorFiles(eco, m, read) {
  const url = m.url;
  if (eco === 'npm') {
    const keep = (read('.npmrc') || '').split('\n').filter((l) => l.trim() && !/^\s*registry\s*=/.test(l));
    const files = { '.npmrc': [...keep, `registry=${url}`, ''].join('\n') };
    const yarnrc = read('.yarnrc');
    files['.yarnrc'] = [...(yarnrc || '').split('\n').filter((l) => l.trim() && !/^\s*registry\s/.test(l)), `registry "${url}"`, ''].join('\n');
    const berry = read('.yarnrc.yml');
    if (berry !== null) files['.yarnrc.yml'] = [...berry.split('\n').filter((l) => l.trim() && !/^npmRegistryServer:/.test(l)), `npmRegistryServer: "${url}"`, ''].join('\n');
    return { files, note: `npm registry ${url} (.npmrc)` };
  }
  if (eco === 'pypi') {
    const files = {};
    for (const rel of ['requirements.txt', 'requirements/production.txt', 'requirements/prod.txt', 'requirements/base.txt']) {
      const txt = read(rel);
      if (txt === null) continue;
      const rest = txt.split('\n').filter((l) => !/^\s*(-i|--index-url)\b/.test(l));
      files[rel] = [`--index-url ${url}`, ...rest].join('\n');
    }
    const pipfile = read('Pipfile');
    if (pipfile !== null && /\[\[source\]\]/.test(pipfile)) files.Pipfile = pipfile.replace(/(\[\[source\]\][^[]*?\burl\s*=\s*)"[^"]*"/, `$1"${url}"`);
    if (!Object.keys(files).length) return null;
    return { files, note: `pip index ${url} (${Object.keys(files).join(', ')})` };
  }
  if (eco === 'composer') {
    const raw = read('composer.json');
    if (raw === null) return null;
    let json;
    try { json = JSON.parse(raw); } catch { return null; }
    const repos = Array.isArray(json.repositories) ? json.repositories.filter((r) => !(r && r.type === 'composer' && /mirror|repository\/composer/i.test(r.url || '')) && !(r && r['packagist.org'] === false)) : json.repositories && typeof json.repositories === 'object' ? Object.values(json.repositories) : [];
    json.repositories = [{ type: 'composer', url: url.replace(/\/$/, '') }, ...repos, { 'packagist.org': false }];
    return { files: { 'composer.json': `${JSON.stringify(json, null, 4)}\n` }, note: `Composer repository ${url} (composer.json)` };
  }
  if (eco === 'nuget') {
    return {
      files: { 'nuget.config': `<?xml version="1.0" encoding="utf-8"?>\n<configuration>\n  <packageSources>\n    <clear />\n    <add key="${m.name} mirror" value="${url}" />\n  </packageSources>\n</configuration>\n` },
      note: `NuGet source ${url} (nuget.config)`,
    };
  }
  return null; // go: GOPROXY is an environment setting, not a project file
}
