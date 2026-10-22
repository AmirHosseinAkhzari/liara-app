// Packs a project folder into a .tar.gz for Liara's source upload.
// Respects .gitignore (through git) and .liaraignore. Never includes real .env files.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ALWAYS_EXCLUDE = [
  /^\.git(\/|$)/, /(^|\/)node_modules(\/|$)/, /^\.liara(\/|$)/, /^liara-reports(\/|$)/, /(^|\/)\.DS_Store$/, /(^|\/)__pycache__(\/|$)/,
  /^\.venv(\/|$)/, /^venv(\/|$)/, /^\.next(\/|$)/, /^\.nuxt(\/|$)/, /^\.output(\/|$)/, /^\.svelte-kit(\/|$)/,
  /^\.vercel(\/|$)/, /^\.netlify(\/|$)/, /^\.turbo(\/|$)/, /^\.cache(\/|$)/, /^coverage(\/|$)/, /\.log$/,
  /^\.idea(\/|$)/, /^\.vscode(\/|$)/, /(^|\/)\.terraform(\/|$)/,
];
// Built on Liara, so not uploaded (unless the platform is static/docker).
const BUILD_DIRS = { laravel: [/^vendor(\/|$)/], php: [/^vendor(\/|$)/], dotnet: [/(^|\/)(bin|obj)(\/|$)/] };
const ENV_FILE = /(^|\/)\.env(\..+)?$/;
const ENV_KEEP = /(^|\/)\.env\.(example|sample|template|dist)$/;

function globToRegex(pattern) {
  let p = pattern.trim();
  if (!p || p.startsWith('#')) return null;
  const negate = p.startsWith('!');
  if (negate) p = p.slice(1);
  const anchored = p.startsWith('/') || p.slice(0, -1).includes('/');
  p = p.replace(/^\//, '');
  const dirOnly = p.endsWith('/');
  p = p.replace(/\/$/, '');
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*') {
      if (p[i + 1] === '*') { re += '.*'; i++; if (p[i + 1] === '/') i++; } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  const body = `${anchored ? '^' : '(^|/)'}${re}${dirOnly ? '/' : '(/|$)'}`;
  return { re: new RegExp(body), negate };
}

function loadIgnore(root) {
  const file = path.join(root, '.liaraignore');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map(globToRegex).filter(Boolean);
}

function isIgnored(rel, rules) {
  let ignored = false;
  for (const r of rules) if (r.re.test(rel)) ignored = !r.negate;
  return ignored;
}

function gitFiles(root) {
  try {
    execFileSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], { stdio: 'pipe' });
    const out = execFileSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z'], { stdio: 'pipe', maxBuffer: 256 * 1024 * 1024 });
    return out.toString('utf8').split('\0').filter(Boolean);
  } catch {
    return null;
  }
}

function walkAll(root) {
  const out = [];
  const stack = [''];
  while (stack.length) {
    const rel = stack.pop();
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (!ALWAYS_EXCLUDE.some((re) => re.test(`${r}/`))) stack.push(r);
      } else if (e.isFile() || e.isSymbolicLink()) out.push(r);
    }
  }
  return out;
}

export function listSourceFiles(root, { platform, includeEnvFiles = false } = {}) {
  const fromGit = gitFiles(root);
  let files = fromGit || walkAll(root);
  const rules = loadIgnore(root);
  const extra = BUILD_DIRS[platform] || [];
  const skippedEnv = [];
  files = files.filter((f) => {
    if (ALWAYS_EXCLUDE.some((re) => re.test(f)) || extra.some((re) => re.test(f))) return false;
    if (isIgnored(f, rules)) return false;
    if (ENV_FILE.test(f) && !ENV_KEEP.test(f) && !includeEnvFiles) { skippedEnv.push(f); return false; }
    try {
      return fs.lstatSync(path.join(root, f)).isFile() || fs.lstatSync(path.join(root, f)).isSymbolicLink();
    } catch {
      return false; // deleted but still tracked
    }
  });
  return { files, usedGit: Boolean(fromGit), skippedEnv };
}

export function createArchive(root, opts = {}) {
  const { files, usedGit, skippedEnv } = listSourceFiles(root, opts);
  if (!files.length) throw new Error(`No files to deploy in ${root}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liara-deploy-'));
  const list = path.join(dir, 'files.txt');
  const out = path.join(dir, 'source.tar.gz');
  fs.writeFileSync(list, `${files.join('\0')}\0`);
  execFileSync('tar', ['-czf', out, '-C', root, '--null', '-T', list], { stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 });
  const size = fs.statSync(out).size;
  return {
    file: out,
    size,
    filesCount: files.length,
    usedGit,
    skippedEnv,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}
