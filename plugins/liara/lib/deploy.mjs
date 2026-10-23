// Create app (if needed) → upload source → create release → wait for result.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createArchive } from './archive.mjs';
import { detectProject, normalizePlatform } from './detect.mjs';
import { detectRuntime, VERSION_KEY } from './analyze.mjs';
import { LiaraError } from './api.mjs';
import { liveEvent, liveActive } from './live.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DONE_OK = /^(READY|SUCCEEDED|SUCCESS|DEPLOYED|RUNNING)$/i;
const DONE_FAIL = /^(FAILED|FAIL|ERROR|CANCELED|CANCELLED|TIMEOUT|REJECTED)$/i;

// Where Liara builds the image (docs: paas/details/build-location). Germany downloads packages
// without limits, so it is the default; Iran is the fallback when Germany is not available.
export const BUILD_LOCATIONS = ['germany', 'iran'];
// The release was refused for a reason that is not about our input.
const locationRefused = (err) => (err?.status >= 500) || /location|germany|builder|not available|unavailable|capacity|maintenance/i.test(err?.message || '');
// The build failed before it ran: an empty build log, or one that blames the builder.
const buildNeverRan = (status) => status.buildLogTail === '' || /build location|germany|no (available )?builders?|builders? (is |are )?(not available|unavailable|offline|busy)|capacity/i.test(status.buildLogTail || '');

// LIARA_APP_URL_TEMPLATE exists for tests only (points apps at a local server).
export function appUrl(app) {
  return (process.env.LIARA_APP_URL_TEMPLATE || 'https://{app}.liara.run').replace('{app}', app);
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

// Plans Liara creates new apps on: g2 plans (and free), as the Liara CLI offers them. Older
// g1 plans (ir-*, standard-base, …) are still listed as available but creating an app on one
// fails with 400 "bundlePlanID" is required (seen live on 2026-10-22).
export const forNewApps = (planID) => planID === 'free' || needsNetwork(planID);

// Monthly price in Toman: displayPrice when given, else the hourly price × 720 (as the Liara CLI shows it).
export const monthly = (p) => (p?.displayPrice ?? p?.monthlyPrice ?? (typeof p?.price === 'number' ? Math.round(p.price * 720) : typeof p?.hourlyPrice === 'number' ? Math.round(p.hourlyPrice * 720) : null));

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
  const newOnly = (obj) => Object.fromEntries(Object.entries(obj).filter(([id]) => forNewApps(id)));
  return {
    apps: newOnly(describe(plans.projects, 'projectBundlePlans')),
    databases: describe(plans.databases, 'databaseBundlePlans'),
    databaseVersions: me.databaseVersions,
    defaultDatabaseVersions: me.defaultDatabaseVersions,
    objectStorage: describe(plans.objectStorage),
    mail: describe(plans.mail),
    notes: [
      'Prices are Toman per month. A plan with "bundles" also needs one bundle (bundlePlanID), which costs extra; show the total before creating.',
      'Plans with needsNetwork run in a private network; the app and its databases must share it. Accounts on private networking need one for every new resource.',
      'Only g2 (and free) app plans are listed: Liara creates new apps on those, like the Liara CLI.',
    ],
  };
}

// Accounts on Liara's private networking (privateNetworkFeature, no legacy networking) must
// put EVERY new app and database in a private network (Liara answers 400 network_is_required),
// not only g2 plans. Seen live on 2026-10-22.
export async function networkRequired(api, planID) {
  if (needsNetwork(planID)) return { required: true, why: `plan ${planID}` };
  const me = await api.get('account', '/v1/me').catch(() => null);
  const src = api.auth.teamID ? me?.team : me?.user;
  if (src?.privateNetworkFeature && !src?.legacyNetworkFeature) return { required: true, why: 'this account uses private networks for all new resources' };
  return { required: false };
}

// Picks the private network when one is required (or asked for). Reuses the only network,
// creates one when createNetwork names it, and otherwise says what to pass.
export async function resolveNetwork(api, { planID, network, createNetwork }, steps = []) {
  const need = network || createNetwork ? { required: true, why: 'requested' } : await networkRequired(api, planID);
  if (!need.required) return null;
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
    steps.push(`using private network ${networks[0].name} (${need.why})`);
    return networks[0]._id;
  }
  if (!networks.length) {
    throw new LiaraError(`A private network is required (${need.why}) and this account has none. Ask the user, then pass createNetwork: "<name>" (e.g. "<app>-net"); the app and its databases will share it.`, { status: 400 });
  }
  throw new LiaraError(`A private network is required (${need.why}). Pass network: ${networks.map((n) => `"${n.name}"`).join(' or ')} (the one its databases use).`, { status: 400 });
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
  if (!forNewApps(planID) && !bundlePlanID) {
    throw new LiaraError(`Plan "${planID}" is an older plan that Liara no longer creates new apps on (it asks for a bundle that the plan list does not offer). Pick a g2 plan such as small-g2 with a bundle (see the plans tool), like the Liara CLI does.`, { status: 400 });
  }
  const bundle = await checkBundle(api, { planID, bundlePlanID, group: 'projectBundlePlans' });
  const networkID = await resolveNetwork(api, { planID, network, createNetwork }, steps);
  const body = { name: app, platform: normalizePlatform(platform), planID, readOnlyRootFilesystem };
  if (bundle) body.bundlePlanID = bundle;
  if (networkID) body.network = networkID;
  await api.post('paas', '/v1/projects', body);
  return getApp(api, app);
}

async function buildLogLines(api, releaseID) {
  // Not in the public spec; the Liara CLI uses it. Best effort.
  try {
    const data = await api.get('paas', `/v2/releases/${releaseID}/build-logs`, { query: { since: 0 }, timeoutMs: 15_000 });
    const items = Array.isArray(data) ? data : data?.logs || data?.data || [];
    const text = items.map((l) => (typeof l === 'string' ? l : l.line ?? l.message ?? JSON.stringify(l))).join('');
    return text ? text.replace(/\n$/, '').split('\n') : [];
  } catch {
    return null;
  }
}
async function buildLogs(api, releaseID) {
  const lines = await buildLogLines(api, releaseID);
  return lines === null ? null : lines.slice(-60).join('\n');
}

// live: also stream the release state and new build log lines to the live progress page.
export async function releaseStatus(api, { app, releaseID, wait = 0, live = false }) {
  const deadline = Date.now() + wait * 1000;
  let release; let current; let lastState = null; let sent = 0;
  const streamLogs = async (id) => {
    if (!live || !id || !liveActive()) return;
    const lines = await buildLogLines(api, id);
    if (lines && lines.length > sent) {
      liveEvent({ type: 'log', app, releaseID: id, lines: lines.slice(sent).slice(-400) });
      sent = lines.length;
    }
  };
  for (;;) {
    const data = await api.get('paas', `/v1/projects/${encodeURIComponent(app)}/releases`, { query: { page: 1, count: 10 } });
    current = data.currentRelease;
    release = releaseID ? data.releases?.find((r) => r._id === releaseID) : data.releases?.[0];
    const state = release?.state || 'UNKNOWN';
    if (live && state !== lastState) {
      liveEvent({ type: 'deploy', phase: 'state', app, releaseID: release?._id || releaseID, state });
      lastState = state;
    }
    await streamLogs(release?._id || releaseID);
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
    port: release?.port,
    type: release?.type,
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
  let { app, port } = args;
  let platform = normalizePlatform(args.platform);
  let report = null;
  if (!platform || !port || !app) {
    report = await detectProject(root, { checkDns: false });
    platform ||= normalizePlatform(report.platform);
    port ||= report.port;
    app ||= report.suggestedAppName;
  }
  if (!platform) throw new Error('Could not detect the platform. Pass platform (e.g. node, next, laravel, django, flask, python, go, dotnet, react, vue, angular, static, docker).');

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

  // liara.json "image": deploy that image instead of uploading the source (docs:
  // paas/docker/how-tos/deploy-image-from-dockerhub, e.g. Liara's n8n setup).
  const image = args.image || liaraJson.image;
  if (image) {
    const body = { image, port: Number(port), type: platform || 'docker' };
    for (const k of ['disks', 'cron', 'args', 'healthCheck']) if (liaraJson[k] !== undefined) body[k] = liaraJson[k];
    if (args.message) body.message = args.message;
    const rel = await api.post('paas', `/v2/projects/${encodeURIComponent(app)}/releases`, body);
    steps.push(`release ${rel?.releaseID} started from image ${image} (port ${port})`);
    liveEvent({ type: 'deploy', phase: 'build', app, releaseID: rel?.releaseID, image });
    const status = await releaseStatus(api, { app, releaseID: rel?.releaseID, wait: args.wait ?? 240, live: true });
    liveEvent({ type: 'deploy', phase: 'finished', app, releaseID: status.releaseID, success: status.success, finished: status.finished, state: status.state, url: status.url });
    return { app, platform: platform || 'docker', port: Number(port), image, steps, ...status };
  }

  liveEvent({ type: 'deploy', phase: 'pack', app, platform });
  const archive = createArchive(root, { platform, includeEnvFiles: Boolean(args.includeEnvFiles) });
  steps.push(`packed ${archive.filesCount} files (${(archive.size / 1024 / 1024).toFixed(1)} MB)${archive.usedGit ? ', respecting .gitignore' : ''}`);
  if (archive.skippedEnv.length) steps.push(`left out env files: ${archive.skippedEnv.join(', ')} (set their values as Liara env vars)`);
  if (archive.size > 250 * 1024 * 1024) steps.push('warning: archive is over 250 MB; add a .liaraignore for large assets');

  const upload = async () => {
    liveEvent({ type: 'deploy', phase: 'upload', app, files: archive.filesCount, sizeMB: Math.round((archive.size / 1024 / 1024) * 10) / 10 });
    // Liara checks the part's type ("Invalid file type. Allowed types: gzip, zip"); the CLI's
    // form-data sends application/gzip for .tar.gz. Without it the upload is refused (seen live).
    const type = 'application/gzip';
    const blob = fs.openAsBlob ? await fs.openAsBlob(archive.file, { type }) : new Blob([fs.readFileSync(archive.file)], { type });
    const form = new FormData();
    form.append('file', blob, 'source.tar.gz');
    const up = await api.request('paas', 'POST', `/v2/projects/${encodeURIComponent(app)}/sources`, { form, timeoutMs: 15 * 60_000 });
    if (!up?.sourceID) throw new Error('Upload succeeded but Liara returned no sourceID.');
    liveEvent({ type: 'deploy', phase: 'uploaded', app });
    return up.sourceID;
  };

  // The archive stays until the build is done: a fallback build in Iran may need it again.
  try {
    const sourceID = await upload();
    steps.push('uploaded source');

    const body = { sourceID, port: Number(port), type: platform };
    if (args.message) body.message = args.message;
    const gi = gitInfo(root);
    if (gi) body.gitInfo = gi;
    for (const k of ['cron', 'args', 'disks', 'healthCheck']) if (liaraJson[k] !== undefined) body[k] = liaraJson[k];
    // Runtime version: liara.json wins; otherwise the version the project pins, if Liara supports it (like `liara deploy`).
    const platformConfig = liaraJson[platform] && typeof liaraJson[platform] === 'object' ? { ...liaraJson[platform] } : {};
    const runtime = detectRuntime(root, platform);
    if (runtime) {
      const key = VERSION_KEY[platform];
      if (platformConfig[key]) steps.push(`runtime: ${runtime.runtime} ${platformConfig[key]} (liara.json)`);
      else if (runtime.version && runtime.status === 'supported') {
        platformConfig[key] = runtime.version;
        steps.push(`runtime: ${runtime.runtime} ${runtime.version} (from ${runtime.source})`);
      } else if (runtime.version) {
        steps.push(`warning: ${runtime.runtime} ${runtime.version} (${runtime.source}) is not supported by Liara; using Liara's default ${runtime.liaraDefault}`);
      } else steps.push(`runtime: ${runtime.runtime} not pinned, Liara uses its default ${runtime.liaraDefault}`);
    }
    if (Object.keys(platformConfig).length) body.platformConfig = platformConfig;

    // Build location: args, then liara.json "build.location", then Germany.
    const pinned = args.buildLocation || liaraJson.build?.location;
    if (pinned && !BUILD_LOCATIONS.includes(pinned)) throw new Error(`Unknown build location "${pinned}". Use germany or iran.`);
    let location = pinned || 'germany';
    const liaraBuild = liaraJson.build && typeof liaraJson.build === 'object' ? liaraJson.build : {};
    let fallback = null;
    const startRelease = async () => {
      body.build = { ...liaraBuild, location };
      const rel = await api.post('paas', `/v2/projects/${encodeURIComponent(app)}/releases`, body);
      return rel?.releaseID;
    };
    const toIran = (reason) => {
      fallback = reason;
      steps.push(`germany build not available (${reason}); building in iran instead`);
      liveEvent({ type: 'location', app, from: 'germany', to: 'iran', reason });
      location = 'iran';
    };

    let releaseID;
    try {
      releaseID = await startRelease();
    } catch (err) {
      if (location !== 'germany' || !locationRefused(err)) throw err;
      toIran(`release refused: ${err.message}`);
      releaseID = await startRelease();
    }
    steps.push(`release ${releaseID} started (type ${platform}, port ${port}, build location ${location})`);
    liveEvent({ type: 'deploy', phase: 'build', app, releaseID, location });
    let status = await releaseStatus(api, { app, releaseID, wait: args.wait ?? 240, live: true });

    if (!status.success && status.finished && location === 'germany' && buildNeverRan(status)) {
      toIran(status.buildLogTail ? 'the Germany builder failed before building' : 'the Germany build ended without any build output');
      try {
        releaseID = await startRelease();
      } catch {
        body.sourceID = await upload(); // the first upload may be tied to the failed release
        releaseID = await startRelease();
      }
      steps.push(`release ${releaseID} started (build location iran)`);
      liveEvent({ type: 'deploy', phase: 'build', app, releaseID, location });
      status = await releaseStatus(api, { app, releaseID, wait: args.wait ?? 240, live: true });
    }
    liveEvent({ type: 'deploy', phase: 'finished', app, releaseID: status.releaseID, success: status.success, finished: status.finished, state: status.state, url: status.url, location });
    return {
      app, platform, port: Number(port),
      runtime: runtime ? { runtime: runtime.runtime, version: platformConfig[VERSION_KEY[platform]] || runtime.liaraDefault } : undefined,
      buildLocation: location, ...(fallback ? { buildLocationFallback: fallback } : {}),
      steps, ...status,
    };
  } finally {
    archive.cleanup();
  }
}

// Runtime logs as [{time, type, message}]. Uses /v2/projects/{app}/logs like the current Liara CLI
// (the old /v1 endpoint now answers "Please upgrade your client"); falls back to v1.
export async function fetchLogs(api, app, sinceSeconds) {
  const v2 = await api.get('paas', `/v2/projects/${encodeURIComponent(app)}/logs`, { query: { start: sinceSeconds, direction: 'forward', last_lines: false }, timeoutMs: 20_000 }).catch(() => null);
  if (v2 && Array.isArray(v2.data)) {
    const out = [];
    for (const group of v2.data) {
      for (const [ts, raw] of group.values || []) {
        let type = null; let message = raw;
        try {
          const j = JSON.parse(raw);
          if (j && typeof j === 'object') { type = j.type || null; message = j._entry ?? j.message ?? raw; }
        } catch {
          // plain text line
        }
        const ms = Number(BigInt(ts) / 1_000_000n);
        out.push({ time: new Date(ms).toISOString(), type, message: String(message), release: group.metaData?.releaseId });
      }
    }
    return out.sort((a, b) => (a.time < b.time ? -1 : 1));
  }
  const v1 = await api.get('paas', `/v1/projects/${encodeURIComponent(app)}/logs`, { query: { since: sinceSeconds } });
  const list = Array.isArray(v1) ? v1 : v1?.logs || [];
  return list.map((l) => ({ time: l.datetime || null, type: l.type || null, message: String(l.message ?? '') }));
}

export async function appLogs(api, { app, since, lines = 100 }) {
  const ts = since ?? Math.floor(Date.now() / 1000) - 3600;
  const list = (await fetchLogs(api, app, ts)).filter((l) => l.message !== '');
  return list.slice(-lines).map((l) => `${l.time || ''} ${l.type ? `[${l.type}] ` : ''}${l.message}`.trim()).join('\n') || '(no logs in this period)';
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
