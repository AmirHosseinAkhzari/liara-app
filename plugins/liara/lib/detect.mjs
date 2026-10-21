// Scans a project and reports: language, framework, Liara platform, port,
// and every external service it uses (database, S3, email, DNS, AI, other APIs),
// with where each one points today and what to do on Liara.
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import {
  PACKAGE_RULES, OTHER_API_PACKAGES, ENV_KEY_RULES, DOMAIN_KEY_RE, KEY_PROVIDERS, LIARA_EQUIVALENT,
  LIARA_DB_TYPES, providerFromHost, engineFromUrl, engineFromKey, engineFromName,
} from './providers.mjs';
import { findEnvFiles, isPlaceholder } from './envfiles.mjs';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output', 'dist', 'build', 'out', 'coverage',
  'vendor', '__pycache__', '.venv', 'venv', 'env', '.tox', '.mypy_cache', '.pytest_cache', 'bin', 'obj',
  'target', '.idea', '.vscode', '.turbo', '.cache', '.vercel', '.netlify', 'storage', 'public/build',
  '.liara', 'tmp', 'logs',
]);
const SOURCE_EXT = /\.(m?[jt]sx?|cjs|cts|mts|vue|svelte|astro|py|php|go|cs|rb|java|kt|rs|ex|exs|ya?ml|toml|json|prisma)$/i;
const MAX_FILES = 4000;
const MAX_FILE_BYTES = 400_000;

const DEFAULT_PORTS = {
  node: 3000, nextjs: 3000, python: 8000, go: 8080, docker: 80,
  react: 80, angular: 80, vue: 80, static: 80, laravel: 80, php: 80, django: 80, flask: 80, netcore: 80,
};
// On these platforms Liara runs its own web server, so the port is always 80.
const FIXED_PORT_PLATFORMS = new Set(['react', 'angular', 'vue', 'static', 'laravel', 'php', 'django', 'flask', 'netcore']);

const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};
const readJson = (file) => {
  const t = read(file);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
};
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

function walk(root) {
  const files = [];
  const stack = [''];
  while (stack.length && files.length < MAX_FILES) {
    const rel = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!IGNORED_DIRS.has(e.name) && !IGNORED_DIRS.has(r) && !e.name.startsWith('.')) stack.push(r);
      } else if (e.isFile() && SOURCE_EXT.test(e.name)) {
        files.push(r);
      }
    }
  }
  return files;
}

// ---------- dependency manifests ----------

function pythonDeps(root) {
  const deps = new Set();
  const add = (n) => n && deps.add(n.toLowerCase().replace(/_/g, '-'));
  for (const f of ['requirements.txt', 'requirements/base.txt', 'requirements/production.txt', 'requirements/prod.txt', 'requirements-prod.txt']) {
    const t = read(path.join(root, f));
    if (!t) continue;
    for (const line of t.split(/\r?\n/)) {
      const m = line.trim().match(/^([A-Za-z0-9_.-]+)/);
      if (m && !line.trim().startsWith('#') && !line.trim().startsWith('-')) add(m[1]);
    }
  }
  const py = read(path.join(root, 'pyproject.toml'));
  if (py) {
    for (const m of py.matchAll(/^\s*"([A-Za-z0-9_.-]+)\s*(?:\[[^\]]*\])?\s*(?:[<>=~!;].*)?",?\s*$/gm)) add(m[1]);
    const poetry = py.split(/^\[tool\.poetry\.(?:group\.\w+\.)?dependencies\]/m).slice(1);
    for (const block of poetry) {
      for (const m of block.split(/^\[/m)[0].matchAll(/^([A-Za-z0-9_.-]+)\s*=/gm)) add(m[1]);
    }
  }
  const pipfile = read(path.join(root, 'Pipfile'));
  if (pipfile) {
    const block = pipfile.split(/^\[packages\]/m)[1]?.split(/^\[/m)[0] || '';
    for (const m of block.matchAll(/^([A-Za-z0-9_.-]+)\s*=/gm)) add(m[1]);
  }
  deps.delete('python');
  return deps;
}

function goDeps(root) {
  const t = read(path.join(root, 'go.mod'));
  const deps = new Set();
  if (!t) return deps;
  for (const m of t.matchAll(/^\s*(?:require\s+)?([a-z0-9.-]+\.[a-z]+\/[^\s]+)\s+v[\d.]+/gim)) deps.add(m[1]);
  return deps;
}

function nugetDeps(root) {
  const deps = new Set();
  const candidates = fs.readdirSync(root).filter((f) => f.endsWith('.csproj'));
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (dir.isDirectory() && !IGNORED_DIRS.has(dir.name) && !dir.name.startsWith('.')) {
      try {
        for (const f of fs.readdirSync(path.join(root, dir.name))) if (f.endsWith('.csproj')) candidates.push(`${dir.name}/${f}`);
      } catch {
        // ignore
      }
    }
  }
  for (const f of candidates) {
    const t = read(path.join(root, f)) || '';
    for (const m of t.matchAll(/PackageReference\s+Include="([^"]+)"/g)) deps.add(m[1]);
  }
  return { deps, csproj: candidates };
}

function matchRule(table, prefix, dep) {
  const key = prefix + dep;
  if (table[key]) return { key, rule: table[key] };
  // Go modules: rule "go:github.com/jackc/pgx" also matches ".../pgx/v5"
  if (prefix === 'go:') {
    for (const k of Object.keys(table)) {
      if (k.startsWith('go:') && (key.startsWith(`${k}/`) || k.startsWith(`${key}/`))) return { key: k, rule: table[k] };
    }
  }
  return null;
}

// ---------- platform / framework ----------

function detectStack(root) {
  const pkg = readJson(path.join(root, 'package.json'));
  const composer = readJson(path.join(root, 'composer.json'));
  const liaraJson = readJson(path.join(root, 'liara.json'));
  const pyDeps = pythonDeps(root);
  const goModDeps = goDeps(root);
  const { deps: nuget, csproj } = nugetDeps(root);
  const hasDockerfile = exists(root, 'Dockerfile');
  const deps = {
    js: new Set(pkg ? Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies }) : []),
    jsProd: new Set(pkg ? Object.keys({ ...pkg.dependencies }) : []),
    py: pyDeps,
    php: new Set(composer ? Object.keys({ ...composer.require, ...composer['require-dev'] }) : []),
    go: goModDeps,
    nuget,
  };

  const s = {
    language: null, framework: null, platform: null, alternatives: [], build: {}, notes: [],
    hasDockerfile, liaraJson, packageJson: Boolean(pkg),
  };
  const js = deps.js;
  const hasPy = pyDeps.size > 0 || exists(root, 'manage.py') || exists(root, 'requirements.txt') || exists(root, 'pyproject.toml');

  if (pkg) {
    s.language = js.has('typescript') || exists(root, 'tsconfig.json') ? 'TypeScript' : 'JavaScript';
    s.build.packageManager = exists(root, 'pnpm-lock.yaml') ? 'pnpm' : exists(root, 'yarn.lock') ? 'yarn'
      : exists(root, 'bun.lockb') || exists(root, 'bun.lock') ? 'bun' : 'npm';
    s.build.nodeVersion = pkg.engines?.node || read(path.join(root, '.nvmrc'))?.trim() || read(path.join(root, '.node-version'))?.trim() || null;
    s.build.scripts = Object.fromEntries(Object.entries(pkg.scripts || {}).filter(([k]) => ['build', 'start', 'dev', 'serve', 'preview'].includes(k)));
    const nextConfig = ['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.cjs'].map((f) => read(path.join(root, f))).find(Boolean) || '';
    const server = ['express', 'fastify', '@nestjs/core', 'koa', '@hapi/hapi', 'hono', '@hono/node-server', 'socket.io', 'restify', '@adonisjs/core', 'feathers', '@feathersjs/feathers', 'sails', 'loopback'].find((d) => js.has(d));
    if (js.has('next')) {
      s.framework = 'Next.js';
      if (/output\s*:\s*['"]export['"]/.test(nextConfig)) {
        s.platform = 'static';
        s.build.buildCommand = `${s.build.packageManager} run build`;
        s.build.outputDir = 'out';
        s.notes.push('next.config has output: "export" → deploy the built `out/` folder as a static site.');
      } else {
        s.platform = 'nextjs';
      }
    } else if (js.has('nuxt') || js.has('nuxt3')) {
      s.framework = 'Nuxt'; s.platform = 'node';
      s.notes.push('Nuxt runs as a Node server on Liara: start script should be `node .output/server/index.mjs` after `nuxt build`.');
    } else if (js.has('@remix-run/node') || js.has('@remix-run/serve') || js.has('@react-router/node')) {
      s.framework = 'Remix / React Router'; s.platform = 'node';
    } else if (js.has('@sveltejs/kit')) {
      s.framework = 'SvelteKit';
      if (js.has('@sveltejs/adapter-node')) s.platform = 'node';
      else if (js.has('@sveltejs/adapter-static')) { s.platform = 'static'; s.build.buildCommand = `${s.build.packageManager} run build`; s.build.outputDir = 'build'; }
      else { s.platform = 'node'; s.notes.push('SvelteKit needs @sveltejs/adapter-node (server) or adapter-static to run on Liara.'); }
    } else if (js.has('astro')) {
      s.framework = 'Astro';
      if (js.has('@astrojs/node')) s.platform = 'node';
      else { s.platform = 'static'; s.build.buildCommand = `${s.build.packageManager} run build`; s.build.outputDir = 'dist'; }
    } else if (server) {
      s.framework = { express: 'Express', fastify: 'Fastify', '@nestjs/core': 'NestJS', koa: 'Koa', '@hapi/hapi': 'hapi', hono: 'Hono', '@hono/node-server': 'Hono', 'socket.io': 'Socket.IO', '@adonisjs/core': 'AdonisJS' }[server] || server;
      s.platform = 'node';
    } else if (js.has('@angular/core')) {
      s.framework = 'Angular'; s.platform = 'angular';
    } else if (js.has('vue') && !hasPy && !composer) {
      s.framework = js.has('vite') ? 'Vue (Vite)' : 'Vue'; s.platform = 'vue';
    } else if (js.has('react-scripts')) {
      s.framework = 'React (Create React App)'; s.platform = 'react';
    } else if (js.has('react') && js.has('vite') && !composer && !hasPy) {
      s.framework = 'React (Vite)'; s.platform = 'react';
      s.alternatives.push('static');
    } else if ((js.has('svelte') || js.has('solid-js') || js.has('preact') || js.has('lit')) && js.has('vite')) {
      s.framework = js.has('svelte') ? 'Svelte (Vite)' : js.has('solid-js') ? 'Solid (Vite)' : js.has('preact') ? 'Preact (Vite)' : 'Lit (Vite)';
      s.platform = 'static'; s.build.buildCommand = `${s.build.packageManager} run build`; s.build.outputDir = 'dist';
    } else if (!composer && !hasPy && (pkg.scripts?.start || pkg.main)) {
      s.framework = 'Node.js'; s.platform = 'node';
    }
  }

  if (!s.platform && composer) {
    s.language = 'PHP';
    if (deps.php.has('laravel/framework')) { s.framework = 'Laravel'; s.platform = 'laravel'; }
    else if (deps.php.has('symfony/framework-bundle')) { s.framework = 'Symfony'; s.platform = 'php'; }
    else { s.framework = 'PHP'; s.platform = 'php'; }
    s.build.phpVersion = composer.require?.php || null;
    if (pkg) s.notes.push('package.json found too: Liara builds front-end assets (npm run build) during the Laravel build when a build script exists.');
  }

  if (!s.platform && hasPy) {
    s.language = 'Python';
    if (pyDeps.has('django') || exists(root, 'manage.py')) { s.framework = 'Django'; s.platform = 'django'; }
    else if (pyDeps.has('flask')) { s.framework = 'Flask'; s.platform = 'flask'; }
    else if (pyDeps.has('fastapi')) { s.framework = 'FastAPI'; s.platform = 'python'; s.alternatives.push('docker'); }
    else if (pyDeps.has('streamlit')) { s.framework = 'Streamlit'; s.platform = 'python'; s.alternatives.push('docker'); }
    else { s.framework = ['starlette', 'aiohttp', 'sanic', 'tornado', 'litestar'].find((d) => pyDeps.has(d)) || 'Python'; s.platform = 'python'; s.alternatives.push('docker'); }
    s.build.pythonVersion = read(path.join(root, 'runtime.txt'))?.trim() || read(path.join(root, '.python-version'))?.trim() || null;
  }

  if (!s.platform && exists(root, 'go.mod')) {
    s.language = 'Go';
    s.framework = ['github.com/gin-gonic/gin', 'github.com/labstack/echo/v4', 'github.com/gofiber/fiber/v2', 'github.com/go-chi/chi/v5'].find((d) => goModDeps.has(d))?.split('/')[2] || 'Go (net/http)';
    s.platform = 'go'; s.alternatives.push('docker');
  }

  if (!s.platform && csproj.length) {
    s.language = 'C#'; s.framework = 'ASP.NET Core'; s.platform = 'netcore';
  }

  if (!s.platform) {
    const other = [
      ['Gemfile', 'Ruby', 'Ruby on Rails / Rack'], ['Cargo.toml', 'Rust', 'Rust'], ['pom.xml', 'Java', 'Maven (Java)'],
      ['build.gradle', 'Java/Kotlin', 'Gradle (JVM)'], ['build.gradle.kts', 'Kotlin', 'Gradle (JVM)'], ['mix.exs', 'Elixir', 'Elixir / Phoenix'],
      ['deno.json', 'TypeScript', 'Deno'],
    ].find(([f]) => exists(root, f));
    if (other) {
      s.language = other[1]; s.framework = other[2]; s.platform = 'docker';
      if (!hasDockerfile) s.notes.push(`${other[1]} has no native Liara platform: a Dockerfile is needed (I can write one).`);
    } else if (hasDockerfile) {
      s.platform = 'docker'; s.framework = 'Dockerfile';
    } else if (exists(root, 'index.html')) {
      s.language = 'HTML/CSS/JS'; s.framework = 'Static site'; s.platform = 'static';
    }
  }

  if (hasDockerfile && s.platform && s.platform !== 'docker') s.alternatives.push('docker');
  if (liaraJson?.platform && liaraJson.platform !== s.platform) {
    s.notes.push(`liara.json says platform "${liaraJson.platform}" (detected "${s.platform}"). Using liara.json.`);
    if (s.platform) s.alternatives.unshift(s.platform);
    s.platform = liaraJson.platform;
  }
  s.alternatives = [...new Set(s.alternatives)].filter((p) => p !== s.platform);
  return { stack: s, deps };
}

function detectPort(root, stack, files) {
  if (stack.liaraJson?.port) return { port: Number(stack.liaraJson.port), source: 'liara.json' };
  const p = stack.platform;
  if (FIXED_PORT_PLATFORMS.has(p)) return { port: 80, source: `Liara ${p} platform always serves on port 80` };
  if (p === 'docker') {
    const m = (read(path.join(root, 'Dockerfile')) || '').match(/^\s*EXPOSE\s+(\d+)/im);
    if (m) return { port: Number(m[1]), source: 'Dockerfile EXPOSE' };
  }
  const scripts = Object.values(stack.build.scripts || {}).join(' ');
  const scriptPort = scripts.match(/(?:--port[ =]|-p\s+|PORT=)(\d{2,5})/);
  if (scriptPort && p !== 'nextjs') return { port: Number(scriptPort[1]), source: 'package.json scripts' };
  if (p === 'nextjs') {
    const m = (stack.build.scripts?.start || '').match(/-p\s+(\d+)|--port[ =](\d+)/);
    return { port: m ? Number(m[1] || m[2]) : 3000, source: m ? 'next start script' : 'Next.js default' };
  }
  const extra = ['Procfile', 'Dockerfile', 'start.sh', 'main.py', 'app.py', 'run.py', 'main.go', 'server.js', 'index.js', 'app.js', 'src/index.ts', 'src/main.ts', 'src/server.ts', 'src/index.js', 'src/app.ts', 'src/server.js'];
  const candidates = [...new Set([...extra, ...files.filter((f) => /\.(m?[jt]s|py|go)$/.test(f))])].slice(0, 400);
  const patterns = [
    /PORT\s*(?:\|\||\?\?|or|,)\s*['"]?(\d{2,5})/, // process.env.PORT || 3000 / os.getenv("PORT", 8000)
    /\.listen\(\s*(\d{2,5})/,
    /getenv\(\s*["']PORT["']\s*,\s*["']?(\d{2,5})/,
    /port\s*=\s*(\d{4,5})\b/,
    /--port[ =](\d{2,5})/,
    /-b\s+[\d.]+:(\d{2,5})/,
    /ListenAndServe\(\s*["']:(\d{2,5})/,
    /Addr:\s*["']:(\d{2,5})/,
    /\.Run\(\s*["']:(\d{2,5})/,
  ];
  for (const f of candidates) {
    const t = read(path.join(root, f));
    if (!t || t.length > MAX_FILE_BYTES) continue;
    for (const re of patterns) {
      const m = t.match(re);
      if (m && Number(m[1]) > 0 && Number(m[1]) < 65536) return { port: Number(m[1]), source: `${f}` };
    }
  }
  return { port: DEFAULT_PORTS[p] ?? 3000, source: 'platform default (please confirm)' };
}

// ---------- code scan: env vars the code reads + hints ----------

const ENV_REF_PATTERNS = [
  /process\.env\.([A-Z_][A-Z0-9_]*)/g,
  /process\.env\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g,
  /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
  /Deno\.env\.get\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g,
  /os\.environ(?:\.get)?\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g,
  /os\.environ\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g,
  /os\.getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g,
  /\benv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g, // Laravel / django-environ
  /\bconfig\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g, // python-decouple
  /getenv\(\s*['"]([A-Z_][A-Z0-9_]*)['"]/g, // PHP
  /os\.Getenv\(\s*"([A-Z_][A-Z0-9_]*)"/g,
  /GetEnvironmentVariable\(\s*"([A-Z_][A-Z0-9_]*)"/g,
  /ENV\[\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*\]/g,
];
const IGNORED_ENV_REFS = new Set(['NODE_ENV', 'PORT', 'HOST', 'HOSTNAME', 'PWD', 'HOME', 'PATH', 'CI', 'TZ', 'DEBUG', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'npm_package_version', 'APP_ENV', 'ENV', 'ENVIRONMENT', 'LOG_LEVEL', 'NEXT_RUNTIME', 'DEV', 'PROD', 'MODE', 'SSR', 'BASE_URL']);

function scanCode(root, files) {
  const envRefs = new Map(); // key → first file
  const hints = { prismaProvider: null, drizzleDialect: null, djangoEngines: [], sqliteFiles: [], localUploads: [], openaiBaseUrlInCode: false, hardcodedHosts: [] };
  for (const f of files) {
    if (/\.(json|ya?ml|toml)$/i.test(f) && !/^(docker-compose|compose)/.test(path.basename(f))) continue;
    const full = path.join(root, f);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.size > MAX_FILE_BYTES) continue;
    const t = read(full);
    if (!t) continue;
    for (const re of ENV_REF_PATTERNS) {
      for (const m of t.matchAll(re)) if (!IGNORED_ENV_REFS.has(m[1]) && !envRefs.has(m[1])) envRefs.set(m[1], f);
    }
    if (f.endsWith('.prisma')) {
      const m = t.match(/datasource\s+\w+\s*\{[^}]*provider\s*=\s*"(\w+)"/s);
      if (m) hints.prismaProvider = m[1];
    }
    if (/drizzle\.config\.[jt]s$/.test(f)) {
      const m = t.match(/(?:dialect|driver)\s*:\s*['"](\w+)['"]/);
      if (m) hints.drizzleDialect = m[1];
    }
    if (/settings(\/\w+)?\.py$|settings\.py$/.test(f)) {
      for (const m of t.matchAll(/ENGINE['"]?\s*[:=]\s*['"]django\.db\.backends\.(\w+)['"]/g)) hints.djangoEngines.push(m[1]);
      if (/MEDIA_ROOT/.test(t) && !/storages\.backends\.s3/.test(t)) hints.localUploads.push(`${f} (MEDIA_ROOT)`);
    }
    if (/\.sqlite3?\b|\.db['"]|sqlite:\/\//.test(t) && /\.(py|[jt]s|mjs|php|go|prisma)$/.test(f)) hints.sqliteFiles.push(f);
    if (/multer\(\s*\{\s*dest|diskStorage\(|\.mv\(|fs\.writeFile\([^)]*uploads/.test(t)) hints.localUploads.push(f);
    if (/baseURL\s*:\s*['"]https?:\/\//.test(t) && /openai/i.test(t)) hints.openaiBaseUrlInCode = true;
  }
  return { envRefs, hints };
}

// ---------- docker-compose: local services ----------

function composeServices(root) {
  const t = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'].map((f) => read(path.join(root, f))).find(Boolean);
  if (!t) return [];
  const found = [];
  for (const m of t.matchAll(/^\s+image:\s*['"]?([a-z0-9./_-]+)(?::[\w.-]+)?/gim)) {
    const img = m[1].toLowerCase();
    const map = [
      [/postgres|postgis/, 'database', 'postgres'], [/mariadb/, 'database', 'mariadb'], [/mysql/, 'database', 'mysql'],
      [/mongo/, 'database', 'mongodb'], [/redis|valkey|keydb/, 'database', 'redis'], [/rabbitmq/, 'database', 'rabbitmq'],
      [/elasticsearch|opensearch/, 'database', 'elasticsearch'], [/mssql|sqlserver/, 'database', 'mssql'],
      [/minio/, 'storage', null], [/mailhog|mailpit|maildev/, 'email', null], [/ollama/, 'ai', null],
    ].find(([re]) => re.test(img));
    if (map) found.push({ image: img, kind: map[1], engine: map[2] });
  }
  return found;
}

// ---------- current hosting ----------

function currentHosting(root) {
  const marks = [
    ['liara.json', 'Liara'], ['vercel.json', 'Vercel'], ['.vercel', 'Vercel'], ['netlify.toml', 'Netlify'], ['fly.toml', 'Fly.io'],
    ['render.yaml', 'Render'], ['railway.json', 'Railway'], ['railway.toml', 'Railway'], ['app.yaml', 'Google App Engine'],
    ['Procfile', 'Heroku-style (Procfile)'], ['firebase.json', 'Firebase Hosting'], ['amplify.yml', 'AWS Amplify'],
    ['.platform.app.yaml', 'Platform.sh'], ['darkube.yml', 'Hamravesh'], ['.do/app.yaml', 'DigitalOcean App Platform'],
  ];
  return [...new Set(marks.filter(([f]) => exists(root, f)).map(([, n]) => n))];
}

// ---------- env analysis ----------

function kindOfKey(key) {
  for (const r of ENV_KEY_RULES) if (r.re.test(key)) return { kind: r.kind, weak: Boolean(r.weak) };
  return null;
}

function keyProvider(key) {
  for (const r of KEY_PROVIDERS) if (r.re.test(key)) return { provider: r.provider, liara: Boolean(r.liara) };
  return null;
}

function hostOf(key, value) {
  const v = String(value).trim();
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) {
      const u = new URL(v.replace(/^([a-z0-9+]+):\/\/([^@/]*@)?([^/?#,]+),[^/?#]+/i, '$1://$2$3')); // first host of multi-host URIs
      return u.hostname || null;
    }
  } catch {
    // fall through
  }
  if (/(HOST|ENDPOINT|SERVER)$/i.test(key) && /^[a-z0-9.-]+(:\d+)?$/i.test(v) && !/^(true|false|yes|no|on|off|\d+)$/i.test(v)) {
    const h = v.replace(/:\d+$/, '');
    if (h.includes('.') || providerFromHost(h).local) return h;
  }
  if (/ENDPOINT/i.test(key) && /^https?:/.test(v)) return null;
  return null;
}

// Where one env value points.
function classifyValue(kind, key, value) {
  const host = hostOf(key, value);
  if (host) {
    const p = providerFromHost(host);
    return { ...p, host };
  }
  const kp = keyProvider(key);
  if (kp) return kp;
  return null;
}

const SECRET_KEY_RE = /(API_KEY|_SECRET|SECRET_KEY|_TOKEN|ACCESS_KEY|PRIVATE_KEY|_KEY|_PASSWORD|_PASS|_DSN|WEBHOOK)$/;
const APP_SECRET_RE = /^(APP_KEY|SECRET_KEY|DJANGO_SECRET_KEY|NEXTAUTH_SECRET|AUTH_SECRET|JWT_SECRET|JWT_.*|SESSION_SECRET|COOKIE_SECRET|ENCRYPTION_KEY|BETTER_AUTH_SECRET|PAYLOAD_SECRET)$/;

// ---------- main ----------

export async function detectProject(root, { liaraEnvs = null, checkDns = true } = {}) {
  root = path.resolve(root);
  if (!fs.existsSync(root)) throw new Error(`Path not found: ${root}`);
  const files = walk(root);
  const { stack, deps } = detectStack(root);
  const { port, source: portSource } = detectPort(root, stack, files);
  const { envRefs, hints } = scanCode(root, files);
  const envFiles = findEnvFiles(root);
  if (liaraEnvs) envFiles.push({ file: '(Liara app env vars)', kind: 'liara', vars: liaraEnvs });
  const compose = composeServices(root);
  const hosting = currentHosting(root);
  const warnings = [...stack.notes];

  // 1) Evidence from packages
  const evidence = []; // {kind, engine?, provider?, sdk?, source, needsCodeChange?, note?, maybe?}
  const otherApis = new Map();
  const scan = (set, prefix) => {
    for (const d of set) {
      const hit = matchRule(PACKAGE_RULES, prefix, d);
      if (hit) evidence.push({ ...hit.rule, source: `package ${d}` });
      const other = OTHER_API_PACKAGES[prefix + d];
      if (other) otherApis.set(other, { name: other, source: `package ${d}`, envKeys: [] });
    }
  };
  scan(deps.jsProd.size ? new Set([...deps.jsProd, ...[...deps.js].filter((d) => d === 'prisma')]) : deps.js, '');
  scan(deps.py, 'py:');
  scan(deps.php, 'php:');
  scan(deps.go, 'go:');
  scan(deps.nuget, 'nuget:');

  // ORM / framework hints → engine
  const ormEngine = engineFromName(hints.prismaProvider) || engineFromName(hints.drizzleDialect)
    || hints.djangoEngines.map(engineFromName).find(Boolean) || null;
  if (ormEngine) evidence.push({ kind: 'database', engine: ormEngine, source: hints.prismaProvider ? 'prisma/schema.prisma' : hints.drizzleDialect ? 'drizzle config' : 'Django settings' });
  for (const c of compose) evidence.push({ kind: c.kind, engine: c.engine, source: `docker-compose image ${c.image}`, local: true });

  // 2) Every env key we know about: env files + code references
  const allKeys = new Set([...envRefs.keys()]);
  for (const f of envFiles) for (const k of Object.keys(f.vars)) allKeys.add(k);

  // Laravel/Django generic DB_* engine
  const dbConnection = envFiles.map((f) => f.vars.DB_CONNECTION || f.vars.DB_ENGINE).find((v) => v && !isPlaceholder(v));
  const genericEngine = engineFromName(dbConnection) || ormEngine;
  if (stack.platform === 'laravel' && !dbConnection && allKeys.has('DB_HOST')) evidence.push({ kind: 'database', engine: 'mysql', source: 'Laravel default DB_CONNECTION (mysql)', maybe: true });
  const pkgEngines = [...new Set(evidence.filter((e) => e.kind === 'database' && e.engine && e.engine !== 'redis').map((e) => e.engine))];

  const engineForKey = (key) => {
    const fromKey = engineFromKey(key);
    if (fromKey) return fromKey;
    for (const f of envFiles) {
      const e = engineFromUrl(f.vars[key] || '');
      if (e) return e;
    }
    if (/^(DB_|DATABASE_|DIRECT_URL|SHADOW_DATABASE_URL|SQL_)/.test(key)) return genericEngine || pkgEngines[0] || null;
    return null;
  };

  // 3) Build services
  const services = new Map(); // id → service
  const getService = (kind, engine) => {
    const id = kind === 'database' ? `database:${engine || 'unknown'}` : kind;
    if (!services.has(id)) {
      services.set(id, {
        id, kind, engine: kind === 'database' ? engine || 'unknown' : undefined,
        liaraEquivalent: kind === 'database' ? (LIARA_DB_TYPES[engine] ? `${LIARA_EQUIVALENT.database} — ${engine}` : engine === 'sqlite' ? LIARA_EQUIVALENT.disk : LIARA_EQUIVALENT.database) : LIARA_EQUIVALENT[kind] || null,
        evidence: [], envKeys: [], configs: [], sdk: [], codeChangeNeeded: [],
      });
    }
    return services.get(id);
  };

  for (const e of evidence) {
    if (e.kind === 'external' || e.kind === 'dns') {
      otherApis.set(e.provider, { name: e.provider, source: e.source, envKeys: [], note: e.note });
      continue;
    }
    if (e.kind === 'disk') {
      warnings.push(`${e.note} → uploaded files need a Liara disk or Object Storage.`);
      continue;
    }
    if (e.kind === 'database' && !e.engine && e.orm) continue; // engine decided by env/config
    if (e.kind === 'database' && e.maybe && !e.engine) continue;
    const svc = getService(e.kind, e.engine);
    svc.evidence.push(e.source + (e.provider ? ` (${e.provider})` : ''));
    if (e.sdk) svc.sdk.push(e.sdk);
    if (e.needsCodeChange) svc.codeChangeNeeded.push(`${e.provider || e.source}: ${e.note || 'uses its own SDK/API; switching to Liara needs a small code change'}`);
  }

  const domainHosts = new Map();
  for (const key of allKeys) {
    if (DOMAIN_KEY_RE.test(key)) {
      for (const f of envFiles) {
        const v = f.vars[key];
        if (!v || isPlaceholder(v)) continue;
        for (const part of String(v).split(/[,\s]+/)) {
          let h = part.trim().replace(/^\*?\./, '');
          if (!h) continue;
          try {
            if (/^https?:\/\//.test(h)) h = new URL(h).hostname;
          } catch {
            continue;
          }
          h = h.replace(/:\d+$/, '').toLowerCase();
          if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h)) continue;
          const p = providerFromHost(h);
          if (p.local) continue;
          if (!domainHosts.has(h)) domainHosts.set(h, { host: h, keys: new Set(), files: new Set() });
          domainHosts.get(h).keys.add(key);
          domainHosts.get(h).files.add(f.file);
        }
      }
    }
    const k = kindOfKey(key);
    if (!k) continue;
    if (k.weak && !evidence.some((e) => e.kind === 'storage') && !allKeys.has('AWS_BUCKET') && ![...allKeys].some((x) => /BUCKET/.test(x))) continue;
    let svc;
    if (k.kind === 'database') {
      const eng = engineForKey(key);
      if (/^SUPABASE_/.test(key) && !eng) svc = getService('database', 'postgres');
      else if (/^(DB_CONNECTION|DB_ENGINE)$/.test(key)) { if (genericEngine) svc = getService('database', genericEngine); else continue; }
      else svc = getService('database', eng || 'unknown');
    } else {
      svc = getService(k.kind);
    }
    if (!svc.envKeys.includes(key)) svc.envKeys.push(key);
    if (envRefs.has(key) && !svc.evidence.includes(`code reads ${key}`) && svc.evidence.length < 12) svc.evidence.push(`code reads ${key} (${envRefs.get(key)})`);
  }

  // 4) Where each service points, per env file
  for (const svc of services.values()) {
    for (const f of envFiles) {
      const providers = new Map();
      for (const key of svc.envKeys) {
        const v = f.vars[key];
        if (v === undefined) continue;
        if (isPlaceholder(v)) continue;
        if (/^(SMTP_|MAIL_|EMAIL_)(PORT|FROM|FROM_ADDRESS|FROM_NAME|ENCRYPTION|SECURE|MAILER|USE_TLS|USE_SSL|BACKEND)/.test(key)) {
          if (/^(MAIL_MAILER|EMAIL_BACKEND)$/.test(key) && /log|array|console|locmem|dummy/i.test(v)) providers.set('Log only (no real email)', { provider: 'Log only (no real email)', local: true, keys: [key] });
          continue;
        }
        const c = classifyValue(svc.kind, key, v);
        if (!c) continue;
        const name = c.provider;
        if (!providers.has(name)) providers.set(name, { ...c, keys: [] });
        providers.get(name).keys.push(key);
      }
      // AWS keys with no custom endpoint → AWS S3
      if (svc.kind === 'storage' && providers.size === 0 && svc.envKeys.some((k) => /ACCESS_KEY/.test(k) && f.vars[k] && !isPlaceholder(f.vars[k]))) {
        const endpointKey = svc.envKeys.find((k) => /ENDPOINT/.test(k) && f.vars[k] && !isPlaceholder(f.vars[k]));
        if (!endpointKey) providers.set('AWS S3', { provider: 'AWS S3', keys: svc.envKeys.filter((k) => f.vars[k]) });
      }
      // OpenAI key with no base URL → OpenAI itself
      if (svc.kind === 'ai' && providers.has('OpenAI')) {
        const base = svc.envKeys.find((k) => /(BASE_URL|API_BASE|BASE_PATH|ENDPOINT)$/.test(k) && f.vars[k] && !isPlaceholder(f.vars[k]));
        if (base) {
          const c = classifyValue('ai', base, f.vars[base]);
          if (c && c.provider !== 'OpenAI') {
            const keys = providers.get('OpenAI').keys;
            providers.delete('OpenAI');
            providers.set(c.provider, { ...c, keys });
          }
        }
      }
      for (const p of providers.values()) {
        svc.configs.push({
          file: f.file, environment: f.kind, provider: p.provider, host: p.host,
          liara: Boolean(p.liara), local: Boolean(p.local), devOnly: Boolean(p.dev), keys: [...new Set(p.keys)],
        });
      }
    }
    // Prisma DATABASE_URL for sqlite: file:./dev.db
    if (svc.kind === 'database' && svc.engine === 'unknown' && hints.sqliteFiles.length) svc.engine = 'sqlite';
  }

  // Drop database:unknown when it has nothing useful and a real engine exists.
  const dbReal = [...services.values()].filter((s) => s.kind === 'database' && s.engine !== 'unknown');
  const unknown = services.get('database:unknown');
  if (unknown && dbReal.length === 1) {
    for (const k of unknown.envKeys) if (!dbReal[0].envKeys.includes(k)) dbReal[0].envKeys.push(k);
    dbReal[0].evidence.push(...unknown.evidence);
    dbReal[0].configs.push(...unknown.configs);
    services.delete('database:unknown');
  }

  // 5) Status + recommendation per service
  const result = [];
  for (const svc of services.values()) {
    if (!svc.evidence.length && !svc.envKeys.length) continue;
    const prod = svc.configs.filter((c) => ['production', 'default', 'liara'].includes(c.environment));
    const external = prod.filter((c) => !c.liara && !c.local && !c.devOnly);
    const onLiara = prod.filter((c) => c.liara);
    let status; let recommendation; let question = null;
    if (svc.kind === 'database' && svc.engine === 'sqlite') {
      status = 'file-based';
      recommendation = 'ask';
      question = 'This app uses SQLite (a file). On Liara the file is lost on every deploy unless it lives on a disk. Attach a Liara disk, or move to Liara PostgreSQL and migrate the data?';
    } else if (external.length) {
      status = 'external-production';
      recommendation = 'ask-to-migrate';
      const names = [...new Set(external.map((c) => c.provider))].join(', ');
      question = svc.kind === 'dns' ? null
        : `Production uses ${names} for ${svc.kind === 'database' ? `${svc.engine} database` : svc.kind}. Switch to ${svc.liaraEquivalent} and transfer all data/settings to Liara?`;
    } else if (onLiara.length) {
      status = 'liara';
      recommendation = 'already-on-liara';
    } else {
      const localOnly = svc.configs.some((c) => c.local);
      status = localOnly ? 'local-only' : svc.configs.length ? 'dev-only' : 'not-configured';
      recommendation = svc.kind === 'database' && svc.engine === 'unknown' ? 'ask' : 'auto-connect';
      if (svc.kind === 'database' && svc.engine === 'unknown') question = 'The app uses a database but I could not tell which engine. Which one should I create on Liara?';
    }
    if (svc.kind === 'ai' && svc.sdk.some((s) => ['anthropic', 'gemini', 'groq', 'mistral', 'cohere'].includes(s))) {
      svc.codeChangeNeeded.push('Liara AI is OpenAI-compatible. Code using the Anthropic/Gemini/other native SDK must switch to the OpenAI SDK (or an OpenAI-compatible provider) to use Liara AI; the same models are available via model IDs like "anthropic/claude-…" or "google/gemini-…".');
    }
    if (svc.kind === 'email' && svc.sdk.includes('api') && !svc.sdk.includes('smtp')) {
      svc.codeChangeNeeded.push('Email is sent through a provider HTTP SDK. Liara Mail works over SMTP or its own HTTP API, so the send function needs a small change (e.g. nodemailer SMTP).');
    }
    result.push({
      ...svc,
      sdk: [...new Set(svc.sdk)],
      codeChangeNeeded: [...new Set(svc.codeChangeNeeded)],
      status, recommendation, question,
      providers: [...new Set(svc.configs.map((c) => `${c.provider} [${c.environment}: ${c.file}]`))],
    });
  }

  // 6) DNS / domains
  const domains = [...domainHosts.values()].map((d) => ({ host: d.host, keys: [...d.keys], files: [...d.files] }));
  const platformSubdomain = /\.(liara\.run|vercel\.app|netlify\.app|herokuapp\.com|onrender\.com|fly\.dev|railway\.app|up\.railway\.app|pages\.dev|workers\.dev|github\.io|web\.app|firebaseapp\.com|darkube\.app|azurewebsites\.net)$/;
  const customDomains = domains.filter((d) => !platformSubdomain.test(d.host));
  const cname = read(path.join(root, 'CNAME'))?.trim();
  if (cname && !customDomains.some((d) => d.host === cname)) customDomains.push({ host: cname, keys: [], files: ['CNAME'] });
  if (customDomains.length) {
    const apex = [...new Set(customDomains.map((d) => d.host.split('.').slice(-2).join('.')))];
    const zones = [];
    for (const z of apex) {
      let nameservers = null; let dnsProvider = null;
      if (checkDns) {
        try {
          nameservers = await Promise.race([dns.resolveNs(z), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
          const ns = nameservers.join(' ').toLowerCase();
          dnsProvider = /liara/.test(ns) ? 'Liara' : /cloudflare/.test(ns) ? 'Cloudflare' : /arvancdn|arvancloud/.test(ns) ? 'ArvanCloud'
            : /awsdns/.test(ns) ? 'AWS Route 53' : /googledomains|google/.test(ns) ? 'Google' : /digitalocean/.test(ns) ? 'DigitalOcean'
              : /vercel-dns/.test(ns) ? 'Vercel' : /netlify/.test(ns) ? 'Netlify' : /nic\.ir|irnic/.test(ns) ? 'IRNIC default' : /domaincontrol/.test(ns) ? 'GoDaddy'
                : /registrar-servers|namecheap/.test(ns) ? 'Namecheap' : 'other';
        } catch {
          // offline or no NS
        }
      }
      zones.push({ zone: z, nameservers, dnsProvider, hosts: customDomains.filter((d) => d.host.endsWith(z)).map((d) => d.host) });
    }
    const external = zones.filter((z) => z.dnsProvider && z.dnsProvider !== 'Liara');
    result.push({
      id: 'dns', kind: 'dns', liaraEquivalent: LIARA_EQUIVALENT.dns,
      evidence: customDomains.map((d) => `${d.host} (${[...d.keys, ...d.files].join(', ')})`),
      envKeys: [...new Set(customDomains.flatMap((d) => d.keys))], configs: [], sdk: [], codeChangeNeeded: [],
      zones,
      status: zones.every((z) => z.dnsProvider === 'Liara') ? 'liara' : external.length ? 'external-production' : 'not-configured',
      recommendation: zones.every((z) => z.dnsProvider === 'Liara') ? 'already-on-liara' : 'ask-to-migrate',
      question: `Custom domain${zones.length > 1 ? 's' : ''} ${zones.map((z) => z.zone).join(', ')} ${external.length ? `use ${[...new Set(external.map((z) => z.dnsProvider))].join(', ')} DNS` : 'found'}. Move DNS to Liara (copy existing records, then you switch nameservers at the registrar) and connect the domain to the app with SSL?`,
      providers: zones.map((z) => `${z.dnsProvider || 'unknown'} DNS for ${z.zone}`),
    });
  }

  // 7) Other APIs / secrets with no Liara equivalent → copied as env vars
  const claimed = new Set(result.flatMap((s) => s.envKeys));
  const appSecrets = [];
  for (const key of allKeys) {
    if (claimed.has(key)) continue;
    if (APP_SECRET_RE.test(key)) { appSecrets.push(key); continue; }
    if (SECRET_KEY_RE.test(key) || /^(STRIPE|TWILIO|KAVENEGAR|ZARINPAL|IDPAY|PAYIR|NEXTPAY|SENTRY|CLERK|PUSHER|ALGOLIA|POSTHOG|GITHUB|GOOGLE|FACEBOOK|TELEGRAM|SLACK|DISCORD|MAPBOX|NESHAN|SMS|PAYMENT|MELIPAYAMAK|GHASEDAK)/.test(key)) {
      const name = key.split('_')[0];
      const label = name.charAt(0) + name.slice(1).toLowerCase();
      const existing = [...otherApis.values()].find((o) => o.name.toLowerCase().startsWith(label.toLowerCase()));
      if (existing) existing.envKeys.push(key);
      else otherApis.set(`env:${name}`, { name: label, source: `env ${key}`, envKeys: [key] });
    }
  }

  // 8) Env keys the code reads but no env file defines
  const defined = new Set(envFiles.filter((f) => f.kind !== 'example').flatMap((f) => Object.keys(f.vars)));
  const missingEnvKeys = [...envRefs.keys()].filter((k) => !defined.has(k) && !/^(NEXT_PUBLIC_VERCEL|VERCEL_|npm_)/.test(k)).sort();

  if (hints.sqliteFiles.length && !result.some((s) => s.engine === 'sqlite')) warnings.push(`SQLite references found in ${hints.sqliteFiles.slice(0, 3).join(', ')}.`);
  if (hints.localUploads.length) warnings.push(`App writes uploaded files to local disk (${[...new Set(hints.localUploads)].slice(0, 3).join(', ')}). On Liara use a disk (liara.json "disks") or Object Storage, or files vanish on redeploy.`);
  if (stack.platform === 'node' && stack.packageJson && !stack.build.scripts?.start) warnings.push('package.json has no "start" script. Liara runs `npm start` for the node platform.');
  if (exists(root, 'pnpm-workspace.yaml') || exists(root, 'turbo.json') || exists(root, 'nx.json') || exists(root, 'lerna.json')) warnings.push('This looks like a monorepo. Deploy each app folder separately (pass its folder as path).');
  if (!stack.platform) warnings.push('Could not detect the platform. A Dockerfile will be needed (platform "docker").');
  if (envFiles.some((f) => f.kind !== 'example')) warnings.push('.env files are NOT uploaded with the source; their values must be set as Liara env vars (set_envs with fromEnvFile).');

  const name = (readJson(path.join(root, 'package.json'))?.name || path.basename(root))
    .toLowerCase().replace(/^@[^/]+\//, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'my-app';

  return {
    root,
    suggestedAppName: stack.liaraJson?.app || name,
    language: stack.language,
    framework: stack.framework,
    platform: stack.platform,
    platformAlternatives: stack.alternatives,
    port,
    portSource,
    build: stack.build,
    hasDockerfile: stack.hasDockerfile,
    liaraJson: stack.liaraJson || null,
    currentHosting: hosting,
    envFiles: envFiles.map((f) => ({ file: f.file, environment: f.kind, keys: Object.keys(f.vars).length })),
    services: result,
    otherApis: [...otherApis.values()].map((o) => ({ ...o, envKeys: [...new Set(o.envKeys)], liaraEquivalent: null, action: 'copy values to Liara env vars' })),
    appSecrets,
    missingEnvKeys,
    warnings: [...new Set(warnings)],
  };
}

// Short human summary for chat.
export function summarize(report) {
  const lines = [];
  lines.push(`Project: ${report.framework || 'unknown'} (${report.language || '?'}) → Liara platform "${report.platform || '?'}", port ${report.port} (${report.portSource})`);
  if (report.currentHosting.length) lines.push(`Currently set up for: ${report.currentHosting.join(', ')}`);
  for (const s of report.services) {
    const label = s.kind === 'database' ? `database (${s.engine})` : s.kind;
    lines.push(`- ${label}: ${s.status} → ${s.recommendation}${s.providers.length ? ` | ${s.providers.join('; ')}` : ''}`);
  }
  if (report.otherApis.length) lines.push(`Other APIs (no Liara equivalent, copied as env vars): ${report.otherApis.map((o) => o.name).join(', ')}`);
  if (report.missingEnvKeys.length) lines.push(`Env vars the code reads but no env file defines: ${report.missingEnvKeys.join(', ')}`);
  for (const w of report.warnings) lines.push(`! ${w}`);
  return lines.join('\n');
}
