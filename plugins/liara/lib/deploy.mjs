// Create app (if needed) → upload source → create release → wait for result.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createArchive } from './archive.mjs';
import { detectProject } from './detect.mjs';
import { LiaraError } from './api.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE_OK = /^(READY|SUCCEEDED|SUCCESS|DEPLOYED|RUNNING)$/i;
const DONE_FAIL = /^(FAILED|FAIL|ERROR|CANCELED|CANCELLED|TIMEOUT|REJECTED)$/i;

export function appUrl(app) {
  return `https://${app}.liara.run`;
}

function gitInfo(root) {
  const git = (...args) => {
    try {
      return execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' }).toString().trim();
    } catch {
      return undefined;
    }
  };
  const commit = git('rev-parse', 'HEAD');
  if (!commit) return undefined;
  return {
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    commit,
    message: git('log', '-1', '--pretty=%s'),
    committedAt: git('log', '-1', '--pretty=%cI'),
    remote: git('config', '--get', 'remote.origin.url')?.replace(/\/\/[^@/]+@/, '//'),
    author: { name: git('log', '-1', '--pretty=%an'), email: git('log', '-1', '--pretty=%ae') },
    tags: (git('tag', '--points-at', 'HEAD') || '').split('\n').filter(Boolean),
  };
}

// g2 plans run inside a private network (Liara answers 400 g2_plan_unavailable without one).
export const needsNetwork = (planID) => /(^|-)g2$/.test(String(planID || ''));

// Monthly price in Toman: displayPrice when given, else the hourly price × 720 (as the Liara CLI shows it).
const monthly = (p) => (p?.displayPrice ?? (typeof p?.price === 'number' ? Math.round(p.price * 720) : null));

// Feature bundles a plan can (or must) take: [{ id, monthlyToman }], or null when it has none.
export function bundlesOf(plans, group, planID) {
  const b = plans?.[group]?.[planID];
  if (!b || typeof b !== 'object') return null;
  const list = Object.entries(b).filter(([, v]) => v?.available).map(([id, v]) => ({ id, monthlyToman: monthly(v) }));
  return list.length ? list : null;
}

const fmt = (n) => (n === null || n === undefined ? '?' : Number(n).toLocaleString('en-US'));
const bundleList = (list) => list.map((x) => `${x.id} (${fmt(x.monthlyToman)} Toman/month)`).join(', ');

// Available plans with what they give and cost, so the cost can be shown before anything is created.
export async function getPlans(api) {
  const me = await api.get('account', '/v1/me');
  const plans = me.plans || {};
  const describe = (obj, bundleGroup) => {
    const out = {};
    for (const [id, p] of Object.entries(obj || {})) {
      if (!p || typeof p !== 'object' || p.available === false || p.deprecated === true) continue;
      out[id] = {
        ram: p.RAM?.amount ?? p.RAM, cpu: p.CPU?.amount ?? p.CPU, disk: p.volume, monthlyToman: monthly(p),
        ...(p.supports ? { supports: p.supports } : {}),
        ...(needsNetwork(id) ? { needsNetwork: true } : {}),
        ...(bundleGroup && bundlesOf(plans, bundleGroup, id) ? { bundles: bundlesOf(plans, bundleGroup, id) } : {}),
      };
    }
    return out;
  };
  return {
    apps: describe(plans.projects, 'projectBundlePlans'),
    databases: describe(plans.databases, 'databaseBundlePlans'),
    databaseVersions: me.databaseVersions,
    defaultDatabaseVersions: me.defaultDatabaseVersions,
    objectStorage: describe(plans.objectStorage),
    mail: describe(plans.mail),
    notes: [
      'Prices are Toman per month. A plan with "bundles" also needs one bundle (bundlePlanID), which costs extra; show the total before creating.',
      'Plans with needsNetwork run in a private network; the app and its databases must share it.',
    ],
  };
}

// Picks the private network for a g2 plan (or when one is asked for). Reuses the only
// network, creates one when createNetwork names it, and otherwise says what to pass.
export async function resolveNetwork(api, { planID, network, createNetwork }, steps = []) {
  if (!network && !createNetwork && !needsNetwork(planID)) return null;
  const list = async () => (await api.get('paas', '/v1/networks').catch(() => null))?.networks || [];
  const networks = await list();
  if (network) {
    const hit = networks.find((n) => n._id === network || n.name === network);
    if (!hit) throw new LiaraError(`Network "${network}" not found. Networks: ${networks.map((n) => n.name).join(', ') || 'none'}. Pass createNetwork: "<name>" to create one.`, { status: 404 });
    return hit._id;
  }
  if (createNetwork) {
    let made = networks.find((n) => n.name === createNetwork);
    if (!made) {
      await api.post('paas', '/v1/networks', { networkName: createNetwork });
      made = (await list()).find((n) => n.name === createNetwork);
      steps.push(`created private network ${createNetwork}`);
    }
    if (!made) throw new LiaraError(`Created network "${createNetwork}" but could not find it afterwards. Check the Liara console.`);
    return made._id;
  }
  if (networks.length === 1) {
    steps.push(`using private network ${networks[0].name} (required by plan ${planID})`);
    return networks[0]._id;
  }
  if (!networks.length) {
    throw new LiaraError(`Plan "${planID}" runs in a private network and this account has none. Ask the user, then pass createNetwork: "<name>" (e.g. "<app>-net"); the app and its databases will share it.`, { status: 400 });
  }
  throw new LiaraError(`Plan "${planID}" needs a private network. Pass network: ${networks.map((n) => `"${n.name}"`).join(' or ')} (the one its databases use).`, { status: 400 });
}

// Checks the bundle before Liara does, so the error lists the choices and prices.
export async function checkBundle(api, { planID, bundlePlanID, group }) {
  const me = await api.get('account', '/v1/me').catch(() => null);
  const list = bundlesOf(me?.plans, group, planID);
  if (!list || list.every((x) => x.id === 'default')) return bundlePlanID;
  const kind = group === 'databaseBundlePlans' ? 'database' : 'app';
  if (!bundlePlanID) {
    throw new LiaraError(`The ${kind} plan "${planID}" needs a feature bundle (bundlePlanID): ${bundleList(list)}. Ask the user which one; it is added to the plan's ${fmt(monthly(me.plans?.[group === 'databaseBundlePlans' ? 'databases' : 'projects']?.[planID]))} Toman/month.`, { status: 400 });
  }
  if (!list.some((x) => x.id === bundlePlanID)) {
    throw new LiaraError(`Bundle "${bundlePlanID}" isn't available for ${kind} plan "${planID}". Available: ${bundleList(list)}.`, { status: 400 });
  }
  return bundlePlanID;
}

export async function getApp(api, app) {
  return api.maybe(async () => (await api.get('paas', `/v1/projects/${encodeURIComponent(app)}`)).project);
}

export async function createApp(api, { app, platform, planID, bundlePlanID, network, createNetwork, readOnlyRootFilesystem = false }, steps = []) {
  if (!planID) {
    const plans = await getPlans(api).catch(() => null);
    throw new LiaraError(`App "${app}" does not exist. Pass planID to create it (see the plans tool for prices). Available app plans: ${plans ? Object.keys(plans.apps || {}).join(', ') : 'see liara plans tool'}`);
  }
  const bundle = await checkBundle(api, { planID, bundlePlanID, group: 'projectBundlePlans' });
  const networkID = await resolveNetwork(api, { planID, network, createNetwork }, steps);
  const body = { name: app, platform, planID, readOnlyRootFilesystem };
  if (bundle) body.bundlePlanID = bundle;
  if (networkID) body.network = networkID;
  await api.post('paas', '/v1/projects', body);
  return getApp(api, app);
}

async function buildLogs(api, releaseID) {
  // Not in the public spec; the Liara CLI uses it. Best effort.
  try {
    const data = await api.get('paas', `/v2/releases/${releaseID}/build-logs`, { query: { since: 0 }, timeoutMs: 15_000 });
    const items = Array.isArray(data) ? data : data?.logs || data?.data || [];
    return items.map((l) => (typeof l === 'string' ? l : l.line ?? l.message ?? JSON.stringify(l))).join('').split('\n').slice(-60).join('\n');
  } catch {
    return null;
  }
}

export async function releaseStatus(api, { app, releaseID, wait = 0 }) {
  const deadline = Date.now() + wait * 1000;
  let release; let current;
  for (;;) {
    const data = await api.get('paas', `/v1/projects/${encodeURIComponent(app)}/releases`, { query: { page: 1, count: 10 } });
    current = data.currentRelease;
    release = releaseID ? data.releases?.find((r) => r._id === releaseID) : data.releases?.[0];
    const state = release?.state || 'UNKNOWN';
    if (DONE_OK.test(state) || DONE_FAIL.test(state) || Date.now() >= deadline) break;
    await sleep(5000);
  }
  const state = release?.state || 'UNKNOWN';
  const failed = DONE_FAIL.test(state);
  const out = {
    app,
    releaseID: release?._id || releaseID,
    state,
    finished: DONE_OK.test(state) || failed,
    success: DONE_OK.test(state),
    isCurrentRelease: release ? release._id === current : undefined,
    createdAt: release?.createdAt,
    finishedAt: release?.finishedAt,
    url: appUrl(app),
  };
  if (failed || !out.finished) out.buildLogTail = await buildLogs(api, out.releaseID);
  if (failed) {
    out.hint = 'Build or start failed. Read buildLogTail, then check app_logs (runtime errors). Common causes: wrong port, missing start script, missing env vars, wrong platform.';
  }
  return out;
}

export async function deploy(api, args) {
  const root = path.resolve(args.path || process.cwd());
  let { app, platform, port } = args;
  let report = null;
  if (!platform || !port || !app) {
    report = await detectProject(root, { checkDns: false });
    platform ||= report.platform;
    port ||= report.port;
    app ||= report.suggestedAppName;
  }
  if (!platform) throw new Error('Could not detect the platform. Pass platform (e.g. node, nextjs, laravel, django, flask, python, go, netcore, react, vue, angular, static, docker).');

  const steps = [];
  let project = await getApp(api, app);
  if (!project) {
    if (args.create === false) throw new Error(`App "${app}" not found on Liara and create=false.`);
    project = await createApp(api, { app, platform, planID: args.planID, bundlePlanID: args.bundlePlanID, network: args.network, createNetwork: args.createNetwork }, steps);
    steps.push(`created app ${app} (${platform}, plan ${args.planID}${args.bundlePlanID ? ` + ${args.bundlePlanID}` : ''})`);
  } else if (project.type && project.type !== platform) {
    steps.push(`note: Liara app type is "${project.type}" but deploying as "${platform}"`);
  }

  const liaraJson = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, 'liara.json'), 'utf8'));
    } catch {
      return {};
    }
  })();

  const archive = createArchive(root, { platform, includeEnvFiles: Boolean(args.includeEnvFiles) });
  steps.push(`packed ${archive.filesCount} files (${(archive.size / 1024 / 1024).toFixed(1)} MB)${archive.usedGit ? ', respecting .gitignore' : ''}`);
  if (archive.skippedEnv.length) steps.push(`left out env files: ${archive.skippedEnv.join(', ')} (set their values as Liara env vars)`);
  if (archive.size > 250 * 1024 * 1024) steps.push('warning: archive is over 250 MB; add a .liaraignore for large assets');

  let sourceID;
  try {
    const blob = fs.openAsBlob ? await fs.openAsBlob(archive.file) : new Blob([fs.readFileSync(archive.file)]);
    const form = new FormData();
    form.append('file', blob, 'source.tar.gz');
    const up = await api.request('paas', 'POST', `/v2/projects/${encodeURIComponent(app)}/sources`, { form, timeoutMs: 15 * 60_000 });
    sourceID = up?.sourceID;
  } finally {
    archive.cleanup();
  }
  if (!sourceID) throw new Error('Upload succeeded but Liara returned no sourceID.');
  steps.push('uploaded source');

  const body = { sourceID, port: Number(port), type: platform };
  if (args.message) body.message = args.message;
  const gi = gitInfo(root);
  if (gi) body.gitInfo = gi;
  for (const k of ['build', 'cron', 'args', 'disks', 'healthCheck']) if (liaraJson[k] !== undefined) body[k] = liaraJson[k];
  if (liaraJson[platform] && typeof liaraJson[platform] === 'object') body.platformConfig = liaraJson[platform];

  const rel = await api.post('paas', `/v2/projects/${encodeURIComponent(app)}/releases`, body);
  const releaseID = rel?.releaseID;
  steps.push(`release ${releaseID} started (type ${platform}, port ${port})`);

  const status = await releaseStatus(api, { app, releaseID, wait: args.wait ?? 240 });
  return { app, platform, port: Number(port), steps, ...status };
}

export async function appLogs(api, { app, since, lines = 100 }) {
  const ts = since ?? Math.floor(Date.now() / 1000) - 3600;
  const data = await api.get('paas', `/v1/projects/${encodeURIComponent(app)}/logs`, { query: { since: ts } });
  const list = Array.isArray(data) ? data : data?.logs || [];
  return list.slice(-lines).map((l) => `${l.datetime || ''} ${l.type ? `[${l.type}] ` : ''}${l.message ?? ''}`.trim()).join('\n') || '(no logs in this period)';
}

// Writes/updates liara.json so `liara deploy` and this plugin redeploy the same way.
export function writeLiaraJson(root, { app, platform, port, extra = {} }) {
  const file = path.join(root, 'liara.json');
  let current = {};
  try {
    current = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // new file
  }
  const next = { ...current, app, platform, port: Number(port), ...extra };
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
