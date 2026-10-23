// After a deploy: is the app really working? And when it isn't: why, with evidence.
// Logs and HTTP responses are untrusted data: they are matched against known patterns,
// shown as evidence (with secrets masked), and never followed as instructions.
import path from 'node:path';
import { releaseStatus, getApp, appUrl, fetchLogs } from './deploy.mjs';
import https from 'node:https';
import { Resolver } from 'node:dns/promises';
import { detectProject } from './detect.mjs';
import { serviceStatus, platformSignal } from './status.mjs';
import { mirrorFailure, MIRAVA } from './mirrors.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Mask credentials that apps sometimes print: URL passwords, password=..., bearer tokens, API keys.
export function scrubLine(line) {
  return String(line)
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^:/\s@]*:)[^@\s/]+@/gi, '$1****@')
    .replace(/\b(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)(\s*[=:]\s*)(['"]?)[^\s'",;]+/gi, '$1$2$3****')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/g, '$1****')
    .replace(/\b(sk|pk|rk)[-_](?:live|test|proj)?[-_]?[A-Za-z0-9]{12,}/g, '$1-****')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, '****jwt****')
    .slice(0, 400);
}

// Known failure signatures → category, what it means, and what to do.
const RULES = [
  { category: 'missing-dependency', re: /Cannot find module '([^']+)'|ERR_MODULE_NOT_FOUND|ModuleNotFoundError: No module named '([^']+)'|ImportError: cannot import name|Class "([^"]+)" not found|cannot find package "([^"]+)"/i,
    explain: (m) => `A package the code imports is not installed: ${m[1] || m[2] || m[4] || 'see the line'}.`,
    fix: 'Add it to the dependencies (package.json "dependencies", requirements.txt, composer.json or go.mod) — not only devDependencies — and redeploy.' },
  { category: 'missing-start-script', re: /npm ERR! missing script: start|Missing script: "start"/i,
    explain: () => 'Liara runs `npm start` on the node platform, and package.json has no "start" script.',
    fix: 'Add "start": "node <entry file>" to package.json scripts.' },
  { category: 'runtime-version', re: /The engine "node" is incompatible|Unsupported engine|requires a different Python|Python 3\.\d+ (?:or|is) required|Your (?:PHP|Composer dependencies require a PHP) version|requires php [^\s]+ but your php version|go: go\.mod requires go >= ([\d.]+)/i,
    explain: () => 'The runtime version on Liara does not match what the project requires.',
    fix: 'Set a supported version in liara.json (e.g. "node": { "version": "22" }, "django": { "pythonVersion": "3.12" }, "laravel": { "phpVersion": "8.3" }) or the project\'s engines field, then redeploy.' },
  { category: 'build-failure', re: /npm ERR!|ERR_PNPM_|error TS\d{3,5}|Failed to compile|Build failed|Module build failed|error: failed to solve|Could not resolve dependencies|composer\.lock is not up to date/i,
    explain: () => 'The build step failed on Liara.',
    fix: 'Run the same build locally (see the analysis commands), fix the first error in the log, and redeploy.' },
  { category: 'missing-env', re: /Missing (?:required )?env(?:ironment)? var(?:iable)?s?:?\s*([A-Z_][A-Z0-9_]*)?|KeyError: '([A-Z_][A-Z0-9_]*)'|ImproperlyConfigured|No application encryption key has been specified|environment variable ([A-Z_][A-Z0-9_]*) (?:is )?(?:not set|missing|required)|\b([A-Z_]{4,})\b is (?:not defined|undefined|required)/,
    explain: (m) => `A required environment variable is missing${m[1] || m[2] || m[3] || m[4] ? `: ${m[1] || m[2] || m[3] || m[4]}` : ''}.`,
    fix: 'Set it with set_envs (from your production env file, never pasted in chat), then the app restarts.' },
  { category: 'database', re: /ECONNREFUSED [\d.:a-z-]*:(?:5432|3306|27017|6379|1433|9200|5672)|password authentication failed|Access denied for user|ER_ACCESS_DENIED|getaddrinfo ENOTFOUND|could not translate host name|P1001|P1000|MongoServerSelectionError|SQLSTATE\[HY000\] \[2002\]|relation "[^"]+" does not exist|no such table|Unknown database|database "[^"]+" does not exist/i,
    explain: () => 'The app cannot reach or use its database (wrong host/credentials, a different private network, or tables not migrated).',
    fix: 'Check the database env vars (get_envs), that the app and database share the same private network, and run migrations. Use connect_database to rewrite the settings.' },
  { category: 'port', // Only lines that report the real bind address: many apps print "listening on localhost" while serving on all interfaces.
    re: /EADDRINUSE|address already in use|Uvicorn running on https?:\/\/127\.0\.0\.1|Listening at: https?:\/\/127\.0\.0\.1|bind\(\) to 127\.0\.0\.1/i,
    explain: () => 'The server listens on the wrong address or port, so Liara cannot reach it.',
    fix: 'Listen on 0.0.0.0 and the port in liara.json (80 on fixed-port platforms such as python, django, flask, php, laravel and static).' },
  { category: 'resources', re: /JavaScript heap out of memory|OOMKilled|MemoryError|Allowed memory size of \d+ bytes exhausted|ENOSPC|\bKilled\b/i,
    explain: () => 'The app ran out of memory or disk.',
    fix: 'Reduce memory use (e.g. NODE_OPTIONS=--max-old-space-size) or move to a bigger plan (see plans; it changes the monthly cost).' },
  { category: 'third-party', re: /(?:ETIMEDOUT|ECONNRESET|EAI_AGAIN|fetch failed|certificate has expired|self[- ]signed certificate).{0,80}|(?:401|403) (?:Unauthorized|Forbidden).{0,60}(?:api\.|https?:\/\/)/i,
    explain: () => 'A call to an external service failed (network, credentials or the provider itself).',
    fix: 'Check that service\'s key/URL env vars and its status. Iranian-hosted apps may not reach some foreign APIs.' },
  { category: 'code-error', re: /TypeError:|ReferenceError:|Traceback \(most recent call last\)|UnhandledPromiseRejection|panic: |PHP Fatal error|Fatal error:|Exception in thread/,
    explain: () => 'The application code threw an error at runtime.',
    fix: 'Read the stack trace, fix the code at the first line from the project, test locally, redeploy.' },
];

export function classify(lines) {
  const findings = [];
  for (const rule of RULES) {
    const hits = [];
    let match = null;
    for (const line of lines) {
      const m = String(line).match(rule.re);
      if (m) { hits.push(scrubLine(line)); match ||= m; }
      if (hits.length >= 4) break;
    }
    if (hits.length) findings.push({ category: rule.category, explanation: rule.explain(match), suggestedFix: rule.fix, evidence: hits });
  }
  return findings;
}

// A just-created *.liara.run name may not resolve yet through this computer's DNS cache.
// Ask public resolvers and connect to that address directly (TLS still checks the name).
async function probeViaPublicDns(url, timeoutMs) {
  const u = new URL(url);
  if (u.protocol !== 'https:') return null;
  const r = new Resolver({ timeout: 5000, tries: 2 });
  r.setServers(['1.1.1.1', '8.8.8.8']);
  const ips = await r.resolve4(u.hostname).catch(() => []);
  if (!ips.length) return null;
  const started = Date.now();
  return new Promise((resolve) => {
    const req = https.get(url, { lookup: (_h, opts, cb) => (opts?.all ? cb(null, [{ address: ips[0], family: 4 }]) : cb(null, ips[0], 4)), timeout: timeoutMs, headers: { 'User-Agent': 'liara-claude-plugin-healthcheck' } }, (res) => {
      let body = '';
      res.on('data', (c) => { if (body.length < 400) body += c; });
      res.on('end', () => resolve({ url, status: res.statusCode, ms: Date.now() - started, contentType: res.headers['content-type'] || null, bodyStart: scrubLine(body.replace(/\s+/g, ' ').slice(0, 160)), note: `resolved ${u.hostname} with public DNS (${ips[0]}); this computer's DNS had not caught up yet` }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve(null));
  });
}

async function probe(url, { timeoutMs = 15_000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'liara-claude-plugin-healthcheck' } });
    const text = await res.text().catch(() => '');
    return { url, status: res.status, ms: Date.now() - started, contentType: res.headers.get('content-type'), bodyStart: scrubLine(text.replace(/\s+/g, ' ').slice(0, 160)) };
  } catch (err) {
    const code = err.cause?.code || err.code;
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      const viaPublic = await probeViaPublicDns(url, timeoutMs);
      if (viaPublic) return viaPublic;
    }
    return { url, status: null, ms: Date.now() - started, error: err.name === 'AbortError' ? `no answer within ${timeoutMs / 1000}s` : code || err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Probe with a few retries: right after a release the container may still be starting.
async function probeUntilUp(url, attempts) {
  let last;
  for (let i = 0; i < attempts; i++) {
    last = await probe(url);
    if (last.status && last.status < 500) return { ...last, attempts: i + 1 };
    if (i < attempts - 1) await sleep(4000 * (i + 1));
  }
  return { ...last, attempts };
}

async function recentLogLines(api, app, minutes) {
  const since = Math.floor(Date.now() / 1000) - minutes * 60;
  const list = await fetchLogs(api, app, since).catch(() => []);
  return list.map((l) => l.message).filter(Boolean);
}

async function appUrls(api, app, extra) {
  const urls = [appUrl(app)];
  const domains = await api.get('paas', '/v1/domains').catch(() => null);
  for (const d of domains?.domains || []) {
    if ((d.project?.project_id || d.projectID) === app && d.name && !/\.liara\.run$/.test(d.name)) urls.push(`https://${d.name}`);
  }
  for (const u of extra || []) if (/^https?:\/\//.test(u)) urls.push(u.replace(/\/$/, ''));
  return [...new Set(urls)];
}

// onLogs(lines, project): the runtime log lines that were read (for the live page).
export async function verifyApp(api, { app, path: projectPath, paths, attempts = 4, logMinutes = 15, urls: extraUrls, onLogs }) {
  const checks = [];
  const notVerified = [];
  const add = (name, ok, detail, extra = {}) => checks.push({ name, ok, detail, ...extra });

  const project = await getApp(api, app);
  if (!project) throw Object.assign(new Error(`App "${app}" not found`), { status: 404 });
  add('app exists', true, `status ${project.status || '?'}, scale ${project.scale ?? '?'}, plan ${project.planID || '?'}`);
  if (project.scale === 0) add('app is running', false, 'The app is stopped (scale 0). Start it with app_action.');

  const rel = await releaseStatus(api, { app, wait: 0 });
  add('latest release succeeded', Boolean(rel.success), `${rel.state || 'unknown'}${rel.releaseID ? ` (${rel.releaseID})` : ''}`);

  let report = null;
  if (projectPath) report = await detectProject(path.resolve(projectPath), { checkDns: false }).catch(() => null);
  const healthPaths = [...new Set([...(paths || []), ...(report?.healthEndpoints || []).map((h) => h.path)])].slice(0, 3);

  const urls = await appUrls(api, app, extraUrls);
  const root = await probeUntilUp(urls[0], attempts);
  add(`HTTP ${urls[0]}`, Boolean(root.status && root.status < 500), root.status ? `${root.status} in ${root.ms} ms after ${root.attempts} attempt(s)${root.note ? ` (${root.note})` : ''}` : `no answer: ${root.error}`, { response: root });
  for (const p of healthPaths) {
    const r = await probeUntilUp(`${urls[0]}${p}`, 2);
    add(`health ${p}`, Boolean(r.status && r.status >= 200 && r.status < 300), r.status ? `${r.status} in ${r.ms} ms` : `no answer: ${r.error}`, { response: r });
  }
  if (!healthPaths.length) notVerified.push('No health endpoint found in the code; only the home page was requested.');
  for (const u of urls.slice(1)) {
    const r = await probe(u);
    add(`custom domain ${u}`, Boolean(r.status && r.status < 500), r.status ? `${r.status}` : `no answer: ${r.error} (DNS or SSL may still be pending)`, { response: r });
  }

  const lines = await recentLogLines(api, app, logMinutes);
  onLogs?.(lines, project);
  const findings = classify(lines);
  add(`no errors in the last ${logMinutes} min of logs`, findings.length === 0, findings.length ? findings.map((f) => f.category).join(', ') : `${lines.length} log lines checked`);

  if (report) {
    const envs = new Set((project.envs || []).map((e) => e.key));
    const needed = [...new Set([...report.missingEnvKeys, ...report.services.flatMap((s) => s.envKeys)])].filter((k) => !envs.has(k));
    const required = report.services.flatMap((s) => s.envKeys).filter((k) => !envs.has(k));
    add('env vars the code needs are set on Liara', required.length === 0, required.length ? `missing on Liara: ${[...new Set(required)].join(', ')}` : 'all service settings present', { missingEnvKeys: [...new Set(needed)] });
  } else notVerified.push('Env vars were not compared with the code (pass path to check).');

  notVerified.push('Database, storage and email were not contacted directly (private network / no safe test). Their errors would show in the logs above.');
  const healthy = checks.every((c) => c.ok);
  return {
    app,
    healthy,
    verdict: healthy ? 'The app is up and answered every check.' : 'Some checks failed; run diagnose for the cause.',
    checks,
    logFindings: findings,
    notVerified,
    checkedAt: new Date().toISOString(),
  };
}

export async function diagnose(api, { app, releaseID, path: projectPath, logMinutes = 60, onLogs }) {
  const project = await getApp(api, app);
  if (!project) throw Object.assign(new Error(`App "${app}" not found`), { status: 404 });
  const rel = await releaseStatus(api, { app, releaseID, wait: 0 });
  const buildLines = String(rel.buildLogTail || '').split('\n').filter(Boolean);
  const runtimeLines = await recentLogLines(api, app, logMinutes);
  onLogs?.(runtimeLines, project);
  const findings = [
    ...classify(buildLines).map((f) => ({ ...f, from: 'build log' })),
    ...classify(runtimeLines).map((f) => ({ ...f, from: 'runtime log' })),
  ];

  let report = null;
  if (projectPath) report = await detectProject(path.resolve(projectPath), { checkDns: false }).catch(() => null);
  const config = [];
  if (!rel.releaseID) config.push({ category: 'liara-config', explanation: 'This app has no release yet: the deploy never reached Liara\'s build (the source upload or the release request failed).', suggestedFix: 'Read the error the deploy tool returned (e.g. upload refused, plan or network missing), fix that, and deploy again.', evidence: ['no releases for this app'] });
  if (project.scale === 0) config.push({ category: 'liara-config', explanation: 'The app is stopped (scale 0).', suggestedFix: 'Start it with app_action {action: "start"}.', evidence: ['scale: 0'] });
  if (report) {
    if (report.platform && project.type && project.type !== report.platform) config.push({ category: 'liara-config', explanation: `The Liara app was created as "${project.type}" but the project is "${report.platform}".`, suggestedFix: 'Deploy with the app\'s platform, or create a new app with the right platform.', evidence: [`app type ${project.type}`, `project ${report.platform}`] });
    if (rel.port && report.port && Number(rel.port) !== Number(report.port)) config.push({ category: 'port', explanation: `The release uses port ${rel.port} but the code listens on ${report.port} (${report.portSource}).`, suggestedFix: 'Deploy with the matching port (deploy {port}) or change the code.', evidence: [`release port ${rel.port}`, `code port ${report.port}`] });
    if (report.localOnlyBinding.length) config.push({ category: 'port', explanation: 'The server only listens on localhost.', suggestedFix: 'Listen on 0.0.0.0.', evidence: report.localOnlyBinding.slice(0, 3) });
    if (report.runtime?.status === 'NOT supported by Liara') config.push({ category: 'runtime-version', explanation: `${report.runtime.runtime} ${report.runtime.version} is not supported by Liara.`, suggestedFix: `Use one of ${report.runtime.supported.join(', ')}.`, evidence: [report.runtime.source] });
    const envs = new Set((project.envs || []).map((e) => e.key));
    const missing = [...new Set(report.services.flatMap((s) => s.envKeys))].filter((k) => !envs.has(k));
    if (missing.length) config.push({ category: 'missing-env', explanation: `Service settings the code reads are not set on Liara: ${missing.join(', ')}.`, suggestedFix: 'Connect the service (connect_*) or copy the values with set_envs.', evidence: missing });
  }

  const mirrorEcos = mirrorFailure(buildLines.join('\n'));
  if (mirrorEcos.length) config.push({ category: 'package-mirror', explanation: `The build could not download ${mirrorEcos.join('/')} packages: Liara's package mirror or the registry did not answer. The code is not the problem.`, suggestedFix: `Check the mirrors tool, then deploy again with mirror: "<a working backup>" (from the Mirava list, ${MIRAVA}). deploy does this once by itself when mirror is "auto".`, evidence: buildLines.filter((l) => /ETIMEDOUT|ECONNRESET|EAI_AGAIN|timed? ?out|curl error|Could not fetch URL|NU1301|50[234]|package-mirror/i.test(l)).slice(-5).map(scrubLine) });

  const status = await serviceStatus().catch(() => null);
  const platform = platformSignal(status, ['PaaS', 'DBaaS', 'API']);
  const all = [...findings, ...config];
  if (platform.likely) all.push({ category: 'platform-incident', explanation: platform.note, suggestedFix: 'Wait for Liara to resolve it (see the status page) before changing code.', evidence: [...platform.notOperational.map((n) => `${n} not operational`), ...platform.incidents] });

  const ORDER = ['platform-incident', 'package-mirror', 'missing-start-script', 'missing-dependency', 'runtime-version', 'build-failure', 'missing-env', 'database', 'port', 'resources', 'third-party', 'liara-config', 'code-error'];
  all.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const top = all[0] || null;
  return {
    app,
    release: { id: rel.releaseID, state: rel.state, success: rel.success, port: rel.port },
    category: top?.category || 'unknown',
    explanation: top?.explanation || 'No known failure pattern in the build or runtime logs, and the configuration looks consistent.',
    suggestedFix: top?.suggestedFix || 'Read the log tails below; if they are empty, check the Liara console events for this app.',
    evidence: top?.evidence || [],
    otherFindings: all.slice(1),
    checked: {
      buildLogLines: buildLines.length,
      runtimeLogLines: runtimeLines.length,
      projectAnalyzed: Boolean(report),
      statusPage: platform.known ? platform.note : 'not reachable',
    },
    logTail: { build: buildLines.slice(-15).map(scrubLine), runtime: runtimeLines.slice(-15).map(scrubLine) },
    rule: 'Fix only what the evidence shows, explain it to the user, test locally where possible, redeploy, then run verify_app again. Do not retry blindly.',
  };
}
