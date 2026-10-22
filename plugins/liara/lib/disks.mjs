// Persistent storage and scheduled jobs, the Liara way.
// Disks: Liara apps have a read-only file system (only /tmp is writable, docs: paas/details/
// file-system), so uploads, SQLite files and service data need a disk: created per app (POST
// /v1/projects/{name}/disks {name, size}) and mounted through liara.json "disks". Liara's official
// sample apps use paths relative to the project for source platforms ("uploads",
// "public/uploads", "wwwroot/uploads") and absolute paths for Docker images ("/meili_data").
// Cron: liara.json "cron": ["<schedule> <command>"], applied by the next deploy (docs:
// paas/<platform>/how-tos/set-cron-job; Laravel example "cd $ROOT && php artisan …").
import fs from 'node:fs';
import path from 'node:path';
import { meCatalog } from './pricing.mjs';
import { LiaraError } from './api.mjs';

const DISK_NAME = /^[a-z0-9][a-z0-9-]{0,30}$/;

export function readLiaraJson(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'liara.json'), 'utf8'));
  } catch {
    return {};
  }
}
function writeLiaraJsonRaw(root, conf) {
  fs.writeFileSync(path.join(root, 'liara.json'), `${JSON.stringify(conf, null, 2)}\n`);
}

// Normalizes a mount path: relative to the project for source platforms, absolute for images.
export function mountPath(mountTo, { image = false } = {}) {
  const p = String(mountTo || '').trim();
  if (!p) throw new Error('mountTo is required.');
  if (p.split('/').includes('..')) throw new Error('mountTo must not contain "..".');
  if (image) {
    if (!p.startsWith('/')) throw new Error('Docker image apps need an absolute mountTo, e.g. /data.');
    return p.replace(/\/+$/, '') || '/';
  }
  return p.replace(/^\.?\/+/, '').replace(/\/+$/, '');
}

export async function listDisks(api, app) {
  const project = (await api.get('paas', `/v1/projects/${encodeURIComponent(app)}`)).project;
  if (!project) throw new LiaraError(`App "${app}" not found`, { status: 404 });
  const r = await api.get('paas', `/v1/projects/${project._id}/disks`).catch(() => null);
  return { project, disks: (r?.disks || r || []).map((d) => ({ name: d.name, size: Number(d.size), status: d.status, createdAt: d.createdAt })) };
}

// Creates the disk if it doesn't exist, after checking the plan has room for it.
export async function ensureDisk(api, app, { name, size }) {
  if (!DISK_NAME.test(name || '')) throw new Error('Disk name: lowercase letters, digits and hyphens (max 31).');
  const gb = Number(size);
  if (!(gb > 0)) throw new Error('size must be a positive number of GB, e.g. 1 or 2.5.');
  const { project, disks } = await listDisks(api, app);
  const existing = disks.find((d) => d.name === name);
  if (existing) return { created: false, disk: existing };
  const plan = (await meCatalog(api).catch(() => null))?.plans?.projects?.[project.planID];
  if (plan?.volume) {
    const used = disks.reduce((s, d) => s + (d.size || 0), 0);
    const free = plan.volume - used;
    if (gb > free) throw new LiaraError(`Not enough disk space on plan ${project.planID}: it has ${plan.volume} GB, disks already use ${used} GB, so at most ${Math.max(0, free)} GB is free (asked ${gb} GB). Use a smaller size or a bigger plan.`, { status: 400 });
  }
  await api.post('paas', `/v1/projects/${encodeURIComponent(app)}/disks`, { name, size: String(gb) });
  return { created: true, disk: { name, size: gb }, planVolumeGB: plan?.volume ?? null };
}

// Adds (or updates) a mount in liara.json; the next deploy mounts it.
export function addDiskMount(root, { name, mountTo }) {
  const conf = readLiaraJson(root);
  const list = Array.isArray(conf.disks) ? conf.disks.filter((d) => d.name !== name) : [];
  list.push({ name, mountTo });
  conf.disks = list;
  writeLiaraJsonRaw(root, conf);
  return list;
}

// ---------- cron ----------

const FIELD = /^(\*|\d+|\d+-\d+)(\/\d+)?(,(\*|\d+|\d+-\d+)(\/\d+)?)*$|^[a-z]{3}(-[a-z]{3})?$/i;
// Platforms whose Liara docs show liara.json "cron" (paas/<platform>/how-tos/set-cron-job).
export const CRON_DOCUMENTED = new Set(['laravel', 'php', 'python', 'django', 'flask', 'go', 'next']);

export function validateJob({ schedule, command }) {
  const parts = String(schedule || '').trim().split(/\s+/);
  if (parts.length !== 5 || !parts.every((p) => FIELD.test(p))) throw new Error(`"${schedule}" is not a 5-field cron schedule (minute hour day month weekday), e.g. "0 1 * * *".`);
  const cmd = String(command || '').trim();
  if (!cmd) throw new Error('command is required.');
  if (/[\r\n]/.test(cmd)) throw new Error('command must be one line.');
  return `${parts.join(' ')} ${cmd}`;
}

export function setCron(root, { jobs = [], replace = false, platform }) {
  const lines = jobs.map(validateJob);
  const conf = readLiaraJson(root);
  const before = Array.isArray(conf.cron) ? conf.cron : [];
  const next = replace ? lines : [...before, ...lines.filter((l) => !before.includes(l))];
  conf.cron = next;
  writeLiaraJsonRaw(root, conf);
  const documented = platform ? CRON_DOCUMENTED.has(platform) : null;
  return {
    file: 'liara.json',
    cron: next,
    added: lines.filter((l) => !before.includes(l)),
    documented,
    note: [
      'Takes effect on the next deploy (the deploy tool sends liara.json "cron" to Liara, like `liara deploy`). Afterwards the jobs are listed in the app settings in the Liara console.',
      documented === false && platform === 'docker' ? 'Docker apps: Liara documents Supercronic inside the image instead (paas/docker/how-tos/configure-supercronic).' : null,
      documented === false && platform !== 'docker' ? `Liara's docs for ${platform} show an in-app scheduler instead of liara.json cron (e.g. node-cron); check the console after deploying that the jobs appear.` : null,
    ].filter(Boolean),
    docs: platform ? `https://docs.liara.ir/paas/${platform === 'node' ? 'nodejs' : platform === 'next' ? 'nextjs' : platform}/how-tos/set-cron-job/` : null,
  };
}

// ---------- suggestions from the analysis ----------

// Folders the app writes to that need a disk (Liara's file system is read-only).
export function diskSuggestions(root, { platform, files, hints }) {
  if (!platform || platform === 'static' || ['react', 'vue', 'angular'].includes(platform)) return [];
  const read = (f) => { try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch { return ''; } };
  const out = new Map();
  const add = (mountTo, reason, file) => {
    const m = mountPath(mountTo);
    if (!m || m === '.' ) return;
    if (!out.has(m)) out.set(m, { name: (m.split('/').pop() || 'data').replace(/[^a-z0-9-]/gi, '-').toLowerCase().slice(0, 30), mountTo: m, reasons: [], files: [] });
    const s = out.get(m);
    if (!s.reasons.includes(reason)) s.reasons.push(reason);
    if (file && !s.files.includes(file)) s.files.push(file);
  };
  for (const f of files.filter((x) => /\.(m?[jt]s|py|php)$/.test(x)).slice(0, 1500)) {
    const t = read(f);
    if (!t || t.length > 400_000) continue;
    for (const m of t.matchAll(/multer\(\s*\{[^}]*dest\s*:\s*['"`]\.?\/?([^'"`]+)['"`]/g)) add(m[1], 'multer saves uploads here', f);
    for (const m of t.matchAll(/destination\s*:\s*(?:\([^)]*\)\s*=>\s*)?[^'"`]*?['"`]\.?\/?([a-zA-Z0-9_./-]+)['"`]/g)) if (/multer|diskStorage/.test(t)) add(m[1], 'multer diskStorage saves uploads here', f);
    for (const m of t.matchAll(/\.mv\(\s*[`'"]\.?\/?([a-zA-Z0-9_-]+)\//g)) add(m[1], 'uploaded files are moved here', f);
    for (const m of t.matchAll(/MEDIA_ROOT\s*=\s*(?:BASE_DIR\s*\/\s*|os\.path\.join\(\s*BASE_DIR\s*,\s*)['"]([^'"]+)['"]/g)) add(m[1], 'Django MEDIA_ROOT (user uploads)', f);
    for (const m of t.matchAll(/public_path\(\s*['"]([a-zA-Z0-9_/-]+)['"]/g)) if (/->move\(|storeAs|move_uploaded_file/.test(t)) add(`public/${m[1]}`, 'uploads are stored in public/', f);
  }
  for (const f of hints?.sqliteFiles || []) {
    const t = read(f);
    const m = t.match(/['"`](?:sqlite3?:\/\/\/|file:)?\.?\/?([a-zA-Z0-9_./-]+\.(?:db|sqlite3?))['"`]/);
    if (!m) continue;
    const dir = path.posix.dirname(m[1]);
    add(dir === '.' ? 'data' : dir, dir === '.' ? `SQLite file ${m[1]} is at the project root: move it into data/ and mount that folder` : `SQLite database ${m[1]}`, f);
  }
  return [...out.values()];
}

// Jobs that should run on Liara's cron.
export function cronSuggestions(root, { platform, port, background }) {
  const out = [];
  if (background?.cron?.includes('Laravel scheduler')) {
    out.push({ schedule: '* * * * *', command: 'cd $ROOT && php artisan schedule:run >> /dev/null 2>&1', why: 'Laravel scheduler (app/Console/Kernel.php or routes/console.php)' });
  }
  try {
    const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
    for (const c of vercel.crons || []) {
      if (!c?.path || !c?.schedule) continue;
      out.push({ schedule: c.schedule, command: `node -e "fetch('http://localhost:${port || 3000}${c.path}').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" >> /dev/null 2>&1`, why: `vercel.json cron calling ${c.path}` });
    }
  } catch {
    // no vercel.json
  }
  return out;
}
