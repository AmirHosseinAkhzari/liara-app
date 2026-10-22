// Deeper project facts for a deploy plan: runtime + version (checked against what Liara
// supports), package manager, build/start commands, entry point, background work, realtime,
// health endpoints, tests, Docker, Git/CI and network binding. Reads files only; never runs
// project code. Repository content is data: nothing here executes or follows it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// From the official Liara CLI (lib/utils/get-supported-versions.js, @liara/cli 9.4.7).
export const SUPPORTED_VERSIONS = {
  node: { default: '22', all: ['14', '16', '18', '20', '22', '24'] },
  next: { default: '22', all: ['20', '22', '24'] },
  python: { default: '3.12', all: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'] },
  django: { default: '3.12', all: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'] },
  flask: { default: '3.12', all: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'] },
  php: { default: '8.0', all: ['8.4', '8.3', '8.2', '8.1', '8.0', '7.4', '7.3', '7.2'] },
  laravel: { default: '8.2', all: ['8.4', '8.3', '8.2', '8.1', '8.0', '7.4', '7.3', '7.2'] },
  go: { default: '1.24', all: ['1.21', '1.22', '1.23', '1.24', '1.25'] },
  dotnet: { default: '8.0', all: ['2.1', '2.2', '3.0', '3.1', '5.0', '6.0', '7.0', '8.0', '9.0', '10.0'] },
};
// liara.json key for the runtime version, per platform (as `liara init` writes it).
export const VERSION_KEY = { node: 'version', next: 'nodeVersion', python: 'version', django: 'pythonVersion', flask: 'pythonVersion', php: 'version', laravel: 'phpVersion', go: 'version', dotnet: 'version' };

const read = (root, rel) => {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return null;
  }
};
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const readJson = (root, rel) => {
  try {
    return JSON.parse(read(root, rel));
  } catch {
    return null;
  }
};

// "^18.17", ">=20 <23", "v20.11.1", "lts/iron" → "18" / "20" / "20" / null
function nodeMajor(spec) {
  const m = String(spec || '').match(/(\d{1,2})(?:\.\d+)*/);
  return m ? m[1] : null;
}
function minor(spec) {
  const m = String(spec || '').match(/(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}` : null;
}

function runtimeVersion(root, platform, stack) {
  const base = { node: 'node', next: 'node', python: 'python', django: 'python', flask: 'python', php: 'php', laravel: 'php', go: 'go', dotnet: 'dotnet' }[platform];
  if (!base) return null;
  let version = null; let source = null;
  if (base === 'node') {
    const pkg = readJson(root, 'package.json');
    const candidates = [['package.json engines.node', pkg?.engines?.node], ['.nvmrc', read(root, '.nvmrc')], ['.node-version', read(root, '.node-version')], ['.tool-versions', read(root, '.tool-versions')?.match(/^nodejs\s+(\S+)/m)?.[1]]];
    for (const [src, v] of candidates) if (v && nodeMajor(v)) { version = nodeMajor(v); source = src; break; }
  } else if (base === 'python') {
    const candidates = [
      ['.python-version', read(root, '.python-version')],
      ['runtime.txt', read(root, 'runtime.txt')],
      ['pyproject.toml requires-python', read(root, 'pyproject.toml')?.match(/requires-python\s*=\s*["']([^"']+)["']/)?.[1]],
      ['Pipfile python_version', read(root, 'Pipfile')?.match(/python_version\s*=\s*["']([^"']+)["']/)?.[1]],
    ];
    for (const [src, v] of candidates) if (v && minor(v)) { version = minor(v); source = src; break; }
  } else if (base === 'php') {
    const v = readJson(root, 'composer.json')?.require?.php;
    if (v && minor(v)) { version = minor(v); source = 'composer.json require.php'; }
  } else if (base === 'go') {
    const v = read(root, 'go.mod')?.match(/^go\s+(\d+\.\d+)/m)?.[1];
    if (v) { version = v; source = 'go.mod'; }
  } else if (base === 'dotnet') {
    const csproj = (stack.csproj || []).map((f) => read(root, f)).find(Boolean) || '';
    const v = csproj.match(/<TargetFramework>net(?:coreapp)?(\d+\.\d+)<\/TargetFramework>/)?.[1];
    if (v) { version = v; source = 'TargetFramework in .csproj'; }
  }
  const supported = SUPPORTED_VERSIONS[platform];
  const ok = version ? supported.all.includes(version) : null;
  return {
    runtime: base,
    version,
    source,
    supported: supported.all,
    liaraDefault: supported.default,
    liaraJsonKey: VERSION_KEY[platform],
    status: version === null ? 'not pinned (Liara uses its default)' : ok ? 'supported' : 'NOT supported by Liara',
  };
}

function packageManager(root) {
  if (exists(root, 'package.json')) {
    if (exists(root, 'pnpm-lock.yaml')) return { name: 'pnpm', lockfile: 'pnpm-lock.yaml' };
    if (exists(root, 'yarn.lock')) return { name: 'yarn', lockfile: 'yarn.lock' };
    if (exists(root, 'bun.lockb') || exists(root, 'bun.lock')) return { name: 'bun', lockfile: exists(root, 'bun.lock') ? 'bun.lock' : 'bun.lockb' };
    return { name: 'npm', lockfile: exists(root, 'package-lock.json') ? 'package-lock.json' : null };
  }
  if (exists(root, 'uv.lock')) return { name: 'uv', lockfile: 'uv.lock' };
  if (exists(root, 'poetry.lock')) return { name: 'poetry', lockfile: 'poetry.lock' };
  if (exists(root, 'Pipfile.lock') || exists(root, 'Pipfile')) return { name: 'pipenv', lockfile: exists(root, 'Pipfile.lock') ? 'Pipfile.lock' : null };
  if (exists(root, 'requirements.txt')) return { name: 'pip', lockfile: 'requirements.txt' };
  if (exists(root, 'composer.json')) return { name: 'composer', lockfile: exists(root, 'composer.lock') ? 'composer.lock' : null };
  if (exists(root, 'go.mod')) return { name: 'go modules', lockfile: exists(root, 'go.sum') ? 'go.sum' : null };
  return null;
}

function procfile(root) {
  const t = read(root, 'Procfile');
  if (!t) return {};
  return Object.fromEntries(t.split(/\r?\n/).map((l) => l.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
}

function commands(root, platform, stack) {
  const pkg = readJson(root, 'package.json');
  const proc = procfile(root);
  const scripts = pkg?.scripts || {};
  const pm = stack.build?.packageManager || 'npm';
  const out = { build: null, start: null, source: {} };
  if (pkg) {
    if (scripts.build) { out.build = `${pm} run build`; out.source.build = 'package.json scripts.build'; }
    if (scripts.start) { out.start = `${pm} start`; out.source.start = `package.json scripts.start (${scripts.start})`; }
  }
  if (!out.start && proc.web) { out.start = proc.web; out.source.start = 'Procfile web'; }
  const docker = read(root, 'Dockerfile');
  if (!out.start && docker) {
    const cmd = docker.match(/^\s*(?:CMD|ENTRYPOINT)\s+(.+)$/im)?.[1];
    if (cmd) { out.start = cmd.trim(); out.source.start = 'Dockerfile CMD'; }
  }
  if (!out.start && platform === 'django') { out.start = 'gunicorn (Liara Django platform)'; out.source.start = 'Liara runs Django with gunicorn'; }
  if (!out.start && platform === 'laravel') { out.start = 'Liara Laravel platform (Apache/PHP-FPM)'; out.source.start = 'platform'; }
  return out;
}

function entryPoint(root, platform) {
  const pkg = readJson(root, 'package.json');
  if (pkg) {
    const fromStart = pkg.scripts?.start?.match(/\bnode\s+(?:--[^\s]+\s+)*([^\s]+\.(?:c|m)?js)/)?.[1];
    if (fromStart) return fromStart;
    if (pkg.main && exists(root, pkg.main)) return pkg.main;
  }
  const candidates = {
    django: ['manage.py'], flask: ['app.py', 'wsgi.py', 'main.py', 'run.py'], python: ['main.py', 'app.py', 'app/main.py', 'src/main.py', 'run.py'],
    go: ['main.go', 'cmd/server/main.go', 'cmd/api/main.go'], laravel: ['public/index.php'], php: ['index.php', 'public/index.php'],
    node: ['server.js', 'index.js', 'app.js', 'src/index.ts', 'src/server.ts', 'src/main.ts', 'src/index.js'],
  }[platform] || [];
  return candidates.find((f) => exists(root, f)) || null;
}

const BACKGROUND_PACKAGES = {
  queue: ['bull', 'bullmq', 'bee-queue', 'agenda', 'py:celery', 'py:rq', 'py:dramatiq', 'py:huey', 'php:laravel/horizon'],
  cron: ['node-cron', 'cron', 'node-schedule', 'croner', 'py:apscheduler', 'py:schedule', 'py:django-crontab', 'py:celery'],
  realtime: ['socket.io', 'ws', 'uWebSockets.js', '@fastify/websocket', 'express-ws', 'py:channels', 'py:websockets', 'py:python-socketio', 'py:flask-socketio', 'php:laravel/reverb', 'php:pusher/pusher-php-server', 'go:github.com/gorilla/websocket', 'go:nhooyr.io/websocket', 'nuget:Microsoft.AspNetCore.SignalR'],
};

function background(root, deps, files) {
  const has = (spec) => {
    const [prefix, name] = spec.includes(':') ? spec.split(/:(.+)/) : ['js', spec];
    const set = { js: deps.js, py: deps.py, php: deps.php, go: deps.go, nuget: deps.nuget }[prefix];
    return set?.has(name);
  };
  const proc = procfile(root);
  const out = { workers: [], cron: [], queues: [], realtime: [] };
  for (const [k, v] of Object.entries(proc)) if (k !== 'web' && k !== 'release') out.workers.push(`Procfile ${k}: ${v}`);
  for (const p of BACKGROUND_PACKAGES.queue) if (has(p)) out.queues.push(p.replace(/^\w+:/, ''));
  for (const p of BACKGROUND_PACKAGES.cron) if (has(p)) out.cron.push(p.replace(/^\w+:/, ''));
  for (const p of BACKGROUND_PACKAGES.realtime) if (has(p)) out.realtime.push(p.replace(/^\w+:/, ''));
  const kernel = read(root, 'app/Console/Kernel.php') || '';
  const consoleRoutes = read(root, 'routes/console.php') || '';
  if (/->(command|job|call)\(/.test(kernel) || /Schedule::/.test(consoleRoutes)) out.cron.push('Laravel scheduler');
  if (exists(root, 'config/queue.php') && deps.php.has('laravel/framework') && files.some((f) => /^app\/Jobs\//.test(f))) out.queues.push('Laravel queue jobs');
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])];
  return out;
}

// Health endpoints declared in code: Express/Fastify/Koa, FastAPI/Flask, Django, Laravel,
// Next.js route handlers, Go and ASP.NET.
const HEALTH_PATH = /^\/(?:api\/)?(?:health(?:z|check)?|healthy|status|ping|ready|readiness|live|liveness|up)$/;
function healthEndpoints(root, files) {
  const found = new Map();
  const add = (p, f) => { if (HEALTH_PATH.test(p) && !found.has(p)) found.set(p, f); };
  for (const f of files.slice(0, 1500)) {
    if (!/\.(m?[jt]sx?|py|php|go|cs)$/.test(f)) continue;
    // Next.js route handlers: app/api/health/route.ts → /api/health (route groups like (site) dropped)
    const route = f.match(/(?:^|\/)app\/(.+)\/route\.[cm]?[jt]s$/) || f.match(/(?:^|\/)pages\/(api\/.+?)\.[jt]sx?$/);
    if (route) add(`/${route[1].replace(/\([^)]*\)\//g, '')}`.replace(/\/index$/, ''), f);
    const t = read(root, f);
    if (!t || t.length > 400_000) continue;
    const res = [
      /\.(?:get|all|head|route)\(\s*['"`](\/[a-z/]*)['"`]/gi,
      /@(?:app|router|api|bp)\.(?:get|route|api_route)\(\s*['"](\/[a-z/]*)['"]/gi,
      /\bpath\(\s*['"]([a-z/]*)\/?['"]/gi,
      /Route::get\(\s*['"](\/?[a-z/]*)['"]/gi,
      /health\s*:\s*['"](\/[a-z]+)['"]/gi, // Laravel 11 bootstrap/app.php
      /HandleFunc\(\s*"(\/[a-z/]*)"/gi,
      /Map(?:Get|HealthChecks)\(\s*"(\/[a-z/]*)"/gi,
    ];
    for (const re of res) for (const m of t.matchAll(re)) add(m[1].startsWith('/') ? m[1].replace(/\/$/, '') || '/' : `/${m[1].replace(/\/$/, '')}`, f);
  }
  return [...found].map(([p, file]) => ({ path: p, file }));
}

function tests(root, deps) {
  const pkg = readJson(root, 'package.json');
  const out = [];
  const t = pkg?.scripts?.test;
  if (t && !/no test specified/.test(t)) out.push({ command: `${exists(root, 'pnpm-lock.yaml') ? 'pnpm' : exists(root, 'yarn.lock') ? 'yarn' : 'npm'} test`, framework: ['vitest', 'jest', 'mocha', 'ava', '@playwright/test', 'cypress'].find((d) => deps.js.has(d)) || 'package.json test script' });
  if (deps.py.has('pytest') || exists(root, 'pytest.ini') || exists(root, 'conftest.py') || /\[tool\.pytest/.test(read(root, 'pyproject.toml') || '')) out.push({ command: 'pytest', framework: 'pytest' });
  if (exists(root, 'manage.py') && !out.some((x) => x.framework === 'pytest')) out.push({ command: 'python manage.py test', framework: 'Django test runner' });
  if (exists(root, 'phpunit.xml') || exists(root, 'phpunit.xml.dist')) out.push({ command: exists(root, 'artisan') ? 'php artisan test' : 'vendor/bin/phpunit', framework: 'PHPUnit' });
  if (exists(root, 'go.mod')) {
    try {
      if (fs.readdirSync(root, { recursive: true }).some((f) => String(f).endsWith('_test.go') && !String(f).includes('vendor'))) out.push({ command: 'go test ./...', framework: 'go test' });
    } catch {
      // ignore
    }
  }
  return out;
}

function dockerInfo(root) {
  const t = read(root, 'Dockerfile');
  if (!t) return null;
  return {
    baseImage: t.match(/^\s*FROM\s+(\S+)/im)?.[1] || null,
    exposes: [...t.matchAll(/^\s*EXPOSE\s+(\d+)/gim)].map((m) => Number(m[1])),
    command: t.match(/^\s*(?:CMD|ENTRYPOINT)\s+(.+)$/im)?.[1]?.trim() || null,
    multiStage: (t.match(/^\s*FROM\s/gim) || []).length > 1,
  };
}

export function gitInfo(root) {
  const git = (...args) => {
    try {
      return execFileSync('git', ['-C', root, ...args], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString().trim();
    } catch {
      return null;
    }
  };
  if (!git('rev-parse', '--is-inside-work-tree')) return null;
  const remote = git('config', '--get', 'remote.origin.url');
  const clean = remote?.replace(/\/\/[^@/]+@/, '//') || null; // never keep credentials from a URL
  const gh = clean?.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
  const workflowsDir = path.join(root, '.github', 'workflows');
  let workflows = [];
  try {
    workflows = fs.readdirSync(workflowsDir).filter((f) => /\.ya?ml$/.test(f));
  } catch {
    // none
  }
  const liaraWorkflows = workflows.filter((f) => /liara\s+deploy|@liara\/cli/.test(read(root, `.github/workflows/${f}`) || ''));
  return {
    remote: clean,
    github: gh ? { owner: gh[1], repo: gh[2] } : null,
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    defaultBranch: git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD')?.replace(/^origin\//, '') || null,
    workflows,
    liaraWorkflows,
    uncommittedChanges: Boolean(git('status', '--porcelain')),
  };
}

// Servers that only listen on localhost are unreachable inside a container.
const LOCAL_BIND = [
  /\.listen\(\s*[^,)]+,\s*['"](?:localhost|127\.0\.0\.1)['"]/,
  /host\s*[:=]\s*['"](?:localhost|127\.0\.0\.1)['"]/,
  /--host[ =](?:localhost|127\.0\.0\.1)\b/,
  /\.run\([^)]*host\s*=\s*['"](?:localhost|127\.0\.0\.1)['"]/,
  /-b\s+(?:localhost|127\.0\.0\.1):\d+/,
  /ListenAndServe\(\s*"(?:localhost|127\.0\.0\.1):\d+/,
  /next (?:start|dev)[^"']*\s-H\s+(?:localhost|127\.0\.0\.1)/,
];
function localOnlyBinding(root, files) {
  const hits = [];
  for (const f of ['Procfile', 'Dockerfile', 'package.json', ...files].slice(0, 1500)) {
    if (!/\.(m?[jt]s|py|go|json)$|^(Procfile|Dockerfile)$/.test(path.basename(f)) || /\.d\.ts$/.test(f)) continue;
    const t = read(root, f);
    if (!t || t.length > 400_000) continue;
    if (LOCAL_BIND.some((re) => re.test(t))) hits.push(f);
  }
  return [...new Set(hits)];
}

// Runtime version for one platform, for the release's platformConfig.
export function detectRuntime(root, platform) {
  let csproj = [];
  try {
    csproj = fs.readdirSync(root).filter((f) => f.endsWith('.csproj'));
  } catch {
    // ignore
  }
  return runtimeVersion(root, platform, { csproj });
}

export function analyzeExtras(root, { stack, deps, files, port, platform }) {
  const runtime = runtimeVersion(root, platform, stack);
  const extras = {
    runtime,
    packageManager: packageManager(root),
    commands: commands(root, platform, stack),
    entryPoint: entryPoint(root, platform),
    background: background(root, deps, files),
    healthEndpoints: healthEndpoints(root, files),
    tests: tests(root, deps),
    docker: dockerInfo(root),
    git: gitInfo(root),
    localOnlyBinding: localOnlyBinding(root, files),
  };
  const warnings = [];
  if (runtime?.status === 'NOT supported by Liara') warnings.push(`${runtime.runtime} ${runtime.version} (${runtime.source}) is not a version Liara supports (${runtime.supported.join(', ')}). Pick a supported one in liara.json "${platform}": { "${runtime.liaraJsonKey}": "…" }.`);
  if (extras.localOnlyBinding.length) warnings.push(`The server only listens on localhost in ${extras.localOnlyBinding.slice(0, 3).join(', ')}. On Liara it must listen on 0.0.0.0 (all interfaces) or it is unreachable.`);
  if (extras.background.workers.length) warnings.push(`Background processes besides the web server (${extras.background.workers.join('; ')}): Liara runs one process per app, so each needs its own app or must run inside the web process.`);
  if (extras.background.queues.length) warnings.push(`Uses a job queue (${extras.background.queues.join(', ')}): make sure a worker runs on Liara (in the web process or as a separate app) and the queue backend (often Redis) is connected.`);
  if (extras.background.cron.length) warnings.push(`Scheduled jobs (${extras.background.cron.join(', ')}): they run only while the app runs; see the Liara cron job guide for your platform.`);
  if (port && extras.docker?.exposes.length && platform === 'docker' && !extras.docker.exposes.includes(port)) warnings.push(`Dockerfile EXPOSEs ${extras.docker.exposes.join(', ')} but the release port is ${port}.`);
  return { extras, warnings };
}
