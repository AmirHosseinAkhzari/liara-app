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

// Small summary of /v1/me plans for picking planID / bundlePlanID / versions.
export async function getPlans(api) {
  const me = await api.get('account', '/v1/me');
  const plans = me.plans || {};
  const compact = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    for (const [id, p] of Object.entries(obj)) {
      if (p && typeof p === 'object') {
        if (p.available === false || p.deprecated === true) continue;
        out[id] = Object.fromEntries(Object.entries(p).filter(([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v)).slice(0, 12));
      } else out[id] = p;
    }
    return out;
  };
  return {
    apps: compact(plans.projects),
    appBundles: compact(plans.projectBundlePlans),
    databases: compact(plans.databases),
    databaseBundles: compact(plans.databaseBundlePlans),
    databaseVersions: me.databaseVersions,
    defaultDatabaseVersions: me.defaultDatabaseVersions,
    objectStorage: compact(plans.objectStorage),
    mail: compact(plans.mail),
  };
}

export async function getApp(api, app) {
  return api.maybe(async () => (await api.get('paas', `/v1/projects/${encodeURIComponent(app)}`)).project);
}

export async function createApp(api, { app, platform, planID, bundlePlanID, network, readOnlyRootFilesystem = false }) {
  if (!planID) {
    const plans = await getPlans(api).catch(() => null);
    throw new LiaraError(`App "${app}" does not exist. Pass planID (and bundlePlanID if your account uses bundles) to create it. Available app plans: ${plans ? Object.keys(plans.apps || {}).join(', ') : 'see liara plans tool'}${plans?.appBundles ? `; bundle plans: ${Object.keys(plans.appBundles).join(', ')}` : ''}`);
  }
  const body = { name: app, platform, planID, readOnlyRootFilesystem };
  if (bundlePlanID) body.bundlePlanID = bundlePlanID;
  if (network) body.network = network;
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
    project = await createApp(api, { app, platform, planID: args.planID, bundlePlanID: args.bundlePlanID, network: args.network });
    steps.push(`created app ${app} (${platform}, plan ${args.planID})`);
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
