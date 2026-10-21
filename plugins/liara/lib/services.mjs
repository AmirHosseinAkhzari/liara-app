// Provision Liara services and wire them into an app's env vars.
// Secrets are written straight to Liara; results only show masked values.
import path from 'node:path';
import dns from 'node:dns/promises';
import { parseEnvFile, maskValue } from './envfiles.mjs';
import { fillKeys, defaultKeys, databaseUrl, roleOf, SECRET_ROLES } from './envmap.mjs';
import { getApp } from './deploy.mjs';
import { S3_ENDPOINT } from './config.mjs';
import { LiaraError } from './api.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function masked(kind, vars) {
  return Object.fromEntries(Object.entries(vars).map(([k, v]) => {
    const role = kind ? roleOf(kind, k) : null;
    const secret = (role && SECRET_ROLES.has(role)) || /(PASSWORD|SECRET|TOKEN|_KEY|PASS)$/.test(k);
    return [k, secret ? maskValue(v) : v];
  }));
}

// ---------- env vars ----------

export async function getEnvs(api, app, { reveal = false } = {}) {
  const project = await getApp(api, app);
  if (!project) throw new LiaraError(`App "${app}" not found`, { status: 404 });
  const vars = Object.fromEntries((project.envs || []).map((e) => [e.key, e.value]));
  return reveal ? vars : masked(null, vars);
}

export async function setEnvs(api, { app, vars = {}, fromEnvFile, keys, path: root = process.cwd(), overwrite = true, kind = null }) {
  const project = await getApp(api, app);
  if (!project) throw new LiaraError(`App "${app}" not found. Deploy or create it first.`, { status: 404 });
  const current = Object.fromEntries((project.envs || []).map((e) => [e.key, e.value]));
  let incoming = { ...vars };
  if (fromEnvFile) {
    const fileVars = parseEnvFile(path.resolve(root, fromEnvFile));
    const pick = keys?.length ? keys : Object.keys(fileVars);
    for (const k of pick) if (fileVars[k] !== undefined && fileVars[k] !== '') incoming[k] = fileVars[k];
    incoming = { ...incoming, ...vars };
  }
  const changed = []; const skipped = [];
  const merged = { ...current };
  for (const [k, v] of Object.entries(incoming)) {
    if (k === 'LIARA_API_TOKEN' || k === 'LIARA_TOKEN') { skipped.push(`${k} (never copied)`); continue; }
    if (current[k] !== undefined && !overwrite) { skipped.push(`${k} (exists)`); continue; }
    if (current[k] !== v) { merged[k] = v; changed.push(k); }
  }
  if (changed.length) {
    await api.post('paas', '/v1/projects/update-envs', {
      project: app,
      variables: Object.entries(merged).map(([key, value]) => ({ key, value: String(value) })),
    });
  }
  return {
    app,
    changed: masked(kind, Object.fromEntries(changed.map((k) => [k, merged[k]]))),
    unchanged: Object.keys(incoming).filter((k) => !changed.includes(k) && !skipped.some((s) => s.startsWith(k))),
    skipped,
    note: changed.length ? 'Liara restarts the app to apply new env vars.' : 'Nothing changed.',
  };
}

// ---------- databases ----------

async function findDatabase(api, idOrName) {
  const byId = await api.maybe(async () => (await api.get('dbaas', `/v1/databases/${encodeURIComponent(idOrName)}`)).database);
  if (byId) return byId;
  const list = (await api.get('dbaas', '/v1/databases')).databases || [];
  const hit = list.find((d) => d.hostname === idOrName || d._id === idOrName || d.id === idOrName);
  return hit ? (await api.get('dbaas', `/v1/databases/${hit._id || hit.id}`)).database : null;
}

const DEFAULT_USER = { postgres: 'root', mysql: 'root', mariadb: 'root', mongodb: 'root', redis: 'default', mssql: 'sa', rabbitmq: 'root', elasticsearch: 'elastic' };
const DEFAULT_DBNAME = { postgres: 'postgres', mongodb: 'admin', redis: '0', mssql: 'master' };

export function dbCreds(db, { publicAccess = false, dbName } = {}) {
  const engine = db.type === 'postgresql' ? 'postgres' : db.type;
  const host = publicAccess ? db.node?.host : db.hostname;
  const port = publicAccess ? db.port : db.internalPort || db.port;
  const creds = {
    engine,
    host,
    port,
    user: db.username || DEFAULT_USER[engine] || 'root',
    password: db.root_password,
    name: dbName || db.dbName || DEFAULT_DBNAME[engine] || '',
  };
  creds.url = databaseUrl(engine, creds);
  return creds;
}

export async function waitForDatabase(api, id, seconds = 180) {
  const deadline = Date.now() + seconds * 1000;
  let db;
  while (Date.now() < deadline) {
    db = await findDatabase(api, id);
    if (db && db.root_password && db.hostname && !/CREATING|PENDING|DEPLOYING|STARTING/i.test(db.status || '')) return db;
    await sleep(6000);
  }
  return db;
}

export async function connectDatabase(api, args) {
  const { app, platform, envKeys, publicAccess = false, dbName } = args;
  let db;
  const steps = [];
  if (args.databaseId) {
    db = await findDatabase(api, args.databaseId);
    if (!db) throw new LiaraError(`Database "${args.databaseId}" not found`, { status: 404 });
  } else if (args.create) {
    const c = args.create;
    if (!c.type || !c.hostname || !c.planID) throw new Error('create needs type, hostname and planID (see the plans tool for planID and versions).');
    const body = { hostname: c.hostname, type: c.type, planID: c.planID, publicNetwork: Boolean(c.publicNetwork) };
    if (c.version) body.version = c.version;
    if (c.bundlePlanID) body.bundlePlanID = c.bundlePlanID;
    if (c.network) body.network = c.network;
    if (c.type === 'mongodb') body.options = { standaloneReplicaSet: Boolean(c.replicaSet) };
    const res = await api.post('dbaas', '/v1/databases', body);
    steps.push(`created ${c.type} database "${c.hostname}"`);
    db = await waitForDatabase(api, res.databaseID || c.hostname);
    if (!db?.root_password) return { steps, databaseID: res.databaseID, status: db?.status, note: 'Database is still starting. Call connect_database again with databaseId in a minute.' };
  } else {
    throw new Error('Pass databaseId (existing) or create {type, hostname, planID, version}.');
  }

  const creds = dbCreds(db, { publicAccess, dbName });
  const keys = envKeys?.length ? envKeys : defaultKeys('database', { platform, engine: creds.engine });
  const { vars, unmapped } = fillKeys('database', keys, creds, { platform });
  let envResult = null;
  if (app && Object.keys(vars).length) envResult = await setEnvs(api, { app, vars, kind: 'database' });
  return {
    steps,
    database: { id: db._id || db.id, hostname: db.hostname, type: db.type, version: db.version, status: db.status, publicNetwork: db.publicNetwork },
    connection: { host: creds.host, port: creds.port, user: creds.user, database: creds.name, network: publicAccess ? 'public' : 'private (app and database must be in the same Liara network)' },
    envVars: masked('database', vars),
    unmappedKeys: unmapped,
    appEnvUpdate: envResult,
    notes: [
      creds.engine === 'mysql' || creds.engine === 'mariadb' ? `MySQL/MariaDB: make sure database "${creds.name || '(none set)'}" exists (create it once from the Liara console's control panel or with CREATE DATABASE).` : null,
      'Run migrations after the deploy (e.g. prisma migrate deploy / php artisan migrate / manage.py migrate) or use migrate_database to copy existing data.',
    ].filter(Boolean),
  };
}

// ---------- object storage ----------

export async function connectStorage(api, args) {
  const { app, bucket, platform, envKeys } = args;
  const endpoint = args.endpoint || S3_ENDPOINT;
  const steps = [];
  let b = await api.maybe(async () => (await api.get('storage', `/api/v1/buckets/${encodeURIComponent(bucket)}`)).bucket);
  if (!b) {
    if (!args.create) throw new LiaraError(`Bucket "${bucket}" not found. Pass create {plan, permission}.`, { status: 404 });
    try {
      await api.get('storage', `/api/v1/buckets/${encodeURIComponent(bucket)}/check-availability`);
    } catch (err) {
      if (err.status === 409) throw new LiaraError(`Bucket name "${bucket}" is taken. Pick another name.`, { status: 409 });
    }
    await api.post('storage', '/api/v1/buckets', { name: bucket, plan: args.create.plan, permission: args.create.permission || 'private' });
    steps.push(`created bucket ${bucket} (${args.create.plan}, ${args.create.permission || 'private'})`);
    b = await api.maybe(async () => (await api.get('storage', `/api/v1/buckets/${encodeURIComponent(bucket)}`)).bucket);
  }

  // Access key limited to this bucket. The spec doesn't document the bucket object, so try known shapes.
  let key = null; let lastErr = null;
  const description = `${app || bucket} via Claude Liara plugin`;
  const shapes = [
    [{ id: b?.id, name: bucket, permission: 'READ_WRITE' }],
    [{ id: b?.id, name: bucket }],
    [{ name: bucket }],
  ];
  for (const buckets of shapes) {
    try {
      const res = await api.post('storage', '/api/v1/keys', { buckets, description });
      key = res?.data || res;
      if (key?.accessKey) break;
    } catch (err) {
      lastErr = err;
      if (err.status !== 400) break;
    }
  }
  if (!key?.accessKey) throw new LiaraError(`Could not create a storage access key: ${lastErr?.message || 'no key returned'}. Create one in the Liara console and pass it with set_envs.`, { status: lastErr?.status });
  steps.push('created access key for the bucket');

  const host = new URL(endpoint).host;
  const creds = {
    accessKey: key.accessKey, secretKey: key.secretKey, bucket, endpoint, region: 'us-east-1',
    publicUrl: `https://${bucket}.${host}`,
  };
  const keys = envKeys?.length ? envKeys : defaultKeys('storage', { platform });
  const { vars, unmapped } = fillKeys('storage', keys, creds, { platform });
  let envResult = null;
  if (app && Object.keys(vars).length) envResult = await setEnvs(api, { app, vars, kind: 'storage' });
  return {
    steps,
    bucket: { name: bucket, plan: b?.plan, permission: b?.permission, endpoint },
    envVars: masked('storage', vars),
    unmappedKeys: unmapped,
    appEnvUpdate: envResult,
    notes: [
      'S3 clients must use the Liara endpoint with path-style addressing (forcePathStyle: true / AWS_USE_PATH_STYLE_ENDPOINT=true). Region can be any value, e.g. us-east-1.',
      `Endpoint used: ${endpoint}. If your bucket shows a different endpoint in the Liara console, rerun with endpoint set.`,
    ],
  };
}

// ---------- mail ----------

function mailDnsRecords(ms) {
  const d = ms?.dns_setup || {};
  const records = [];
  if (d.mx_record?.mx_record_value) records.push({ name: '@', type: 'MX', contents: [{ priority: 10, host: d.mx_record.mx_record_value }] });
  if (d.spf?.spf_record) records.push({ name: '@', type: 'TXT', contents: [{ text: d.spf.spf_record }] });
  if (d.dkim?.dkim_record && d.dkim?.dkim_record_name) records.push({ name: d.dkim.dkim_record_name.replace(new RegExp(`\\.?${(ms.domain || '').replace(/\./g, '\\.')}\\.?$`), ''), type: 'TXT', contents: [{ text: d.dkim.dkim_record }] });
  if (d.return_path?.return_path_domain && d.return_path?.return_path_value) records.push({ name: d.return_path.return_path_domain.replace(new RegExp(`\\.?${(ms.domain || '').replace(/\./g, '\\.')}\\.?$`), ''), type: 'CNAME', contents: [{ host: d.return_path.return_path_value }] });
  records.push({ name: '_dmarc', type: 'TXT', contents: [{ text: `v=DMARC1; p=none; rua=mailto:postmaster@${ms.domain}` }], optional: true });
  return records;
}

export async function connectMail(api, args) {
  const { app, domain, platform, envKeys } = args;
  const steps = [];
  const list = async () => {
    const r = await api.get('mail', '/api/v1/mails');
    return r?.data?.mailServers || r?.data || r?.mailServers || [];
  };
  let ms = (await list()).find((m) => m.domain === domain);
  if (!ms) {
    if (!args.plan) throw new Error('No mail server for this domain yet. Pass plan (see the plans tool → mail) and mode (LIVE or DEV).');
    await api.get('mail', `/api/v1/mails/${encodeURIComponent(domain)}/check-availability`).catch((err) => {
      if (err.status === 409) throw new LiaraError(`A mail server for ${domain} already exists on another account.`, { status: 409 });
    });
    await api.post('mail', '/api/v1/mails', { domain, plan: args.plan, mode: args.mode || 'LIVE' });
    steps.push(`created mail server for ${domain} (${args.mode || 'LIVE'})`);
    ms = (await list()).find((m) => m.domain === domain);
  }
  const id = ms?.id || ms?._id;
  const detail = (await api.get('mail', `/api/v1/mails/${id}`))?.data?.mailServer || ms;

  if (args.account) {
    await api.post('mail', `/api/v1/mails/${id}/accounts`, { name: args.account }).catch((err) => {
      if (err.status !== 409) throw err;
    });
    steps.push(`mailbox ${args.account}@${domain} ready`);
  }

  const cred = await api.post('mail', `/api/v1/mails/${id}/smtp-credentials`, { description: `${app || domain} via Claude Liara plugin` });
  const c = cred?.data || {};
  steps.push('created SMTP credentials');
  const port = detail.smtp_port || 587;
  const creds = {
    host: detail.smtp_server, port, user: c.username, password: c.password || c.passowrd,
    from: args.from || `${args.account || 'noreply'}@${domain}`,
  };
  const keys = envKeys?.length ? envKeys : defaultKeys('email', { platform });
  const { vars, unmapped } = fillKeys('email', keys, creds, { platform });
  let envResult = null;
  if (app && Object.keys(vars).length) envResult = await setEnvs(api, { app, vars, kind: 'email' });

  const records = mailDnsRecords({ ...detail, domain });
  let dnsResult = null;
  if (args.addDnsRecords) dnsResult = await addRecords(api, apexOf(domain), records.filter((r) => !r.optional || args.addDmarc));
  return {
    steps,
    mailServer: { id, domain, status: detail.status, mode: detail.mode, recordsStatus: detail.recordsStatus, smtp: `${creds.host}:${port}` },
    envVars: masked('email', vars),
    unmappedKeys: unmapped,
    appEnvUpdate: envResult,
    dnsRecordsNeeded: records,
    dnsResult,
    notes: ['Mail is only delivered after MX/SPF/DKIM/return-path records verify. Check with the api tool: GET mail /api/v1/mails/<id>/dns-check.'],
  };
}

// ---------- DNS + domains ----------

const SECOND_LEVEL = /\.(co|ac|org|gov|id|net|sch)\.ir$|\.(co|org|me|ltd|plc)\.uk$|\.(com|net|org)\.(au|tr|br)$/;
export function apexOf(host) {
  const parts = host.toLowerCase().replace(/\.$/, '').split('.');
  return SECOND_LEVEL.test(host) ? parts.slice(-3).join('.') : parts.slice(-2).join('.');
}

async function getZone(api, zone) {
  return api.maybe(async () => (await api.get('dns', `/api/v1/zones/${zone}`)).data);
}

async function existingRecords(api, zone) {
  const r = await api.get('dns', `/api/v1/zones/${zone}/dns-records`);
  return r?.data || [];
}

export async function addRecords(api, zone, records) {
  const have = await existingRecords(api, zone);
  const created = []; const skipped = []; const failed = [];
  for (const rec of records) {
    const { optional, ...body } = rec;
    void optional;
    if (have.some((h) => h.name === body.name && h.type === body.type)) { skipped.push(`${body.type} ${body.name} (exists)`); continue; }
    try {
      await api.post('dns', `/api/v1/zones/${zone}/dns-records`, { ttl: 3600, ...body });
      created.push(`${body.type} ${body.name}`);
    } catch (err) {
      failed.push(`${body.type} ${body.name}: ${err.message}`);
    }
  }
  return { zone, created, skipped, failed };
}

const COMMON_NAMES = ['@', 'www', 'mail', 'api', 'app', 'admin', 'blog', 'shop', 'cdn', 'static', 'dev', 'staging', 'panel', 'webmail', 'ftp', 'autodiscover', '_dmarc', 'smtp', 'imap', 'pop', 'docs', 'status'];

// Copies what public DNS answers for common names. Not a full zone export.
export async function readPublicRecords(zone) {
  const resolver = new dns.Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  const records = [];
  const fq = (n) => (n === '@' ? zone : `${n}.${zone}`);
  const strip = (h) => h.replace(/\.$/, '');
  for (const name of COMMON_NAMES) {
    const host = fq(name);
    const cname = await resolver.resolveCname(host).catch(() => null);
    if (cname?.length && name !== '@') { records.push({ name, type: 'CNAME', contents: [{ host: strip(cname[0]) }] }); continue; }
    const a = await resolver.resolve4(host).catch(() => null);
    if (a?.length) records.push({ name, type: 'A', contents: a.map((ip) => ({ ip })) });
    const aaaa = await resolver.resolve6(host).catch(() => null);
    if (aaaa?.length) records.push({ name, type: 'AAAA', contents: aaaa.map((ip) => ({ ip })) });
    if (name === '@' || name === '_dmarc' || name === 'mail') {
      const txt = await resolver.resolveTxt(host).catch(() => null);
      if (txt?.length) records.push({ name, type: 'TXT', contents: txt.map((t) => ({ text: t.join('') })) });
    }
    if (name === '@') {
      const mx = await resolver.resolveMx(host).catch(() => null);
      if (mx?.length) records.push({ name, type: 'MX', contents: mx.map((m) => ({ priority: m.priority, host: strip(m.exchange) })) });
    }
  }
  return records;
}

export async function connectDns(api, args) {
  const { domain, app } = args;
  const zone = args.zone || apexOf(domain);
  const steps = [];
  let z = await getZone(api, zone);
  if (!z) {
    const res = await api.post('dns', '/api/v1/zones', { name: zone });
    z = res?.data || (await getZone(api, zone));
    steps.push(`created DNS zone ${zone}`);
  }

  const appHosts = app ? [domain, ...(args.includeWww && !domain.startsWith('www.') ? [`www.${domain}`] : [])] : [];
  const appNames = appHosts.map((h) => (h === zone ? '@' : h.slice(0, -(zone.length + 1))));

  let imported = null;
  if (args.importExisting !== false) {
    const current = await readPublicRecords(zone);
    const toCopy = current.filter((r) => !appNames.includes(r.name));
    imported = toCopy.length ? await addRecords(api, zone, toCopy) : { zone, created: [], skipped: [], failed: [] };
    imported.foundPublicly = current.length;
    steps.push(`copied ${imported.created.length} existing DNS records into Liara`);
  }

  const domainResults = [];
  if (app) {
    const project = await getApp(api, app);
    if (!project) throw new LiaraError(`App "${app}" not found`, { status: 404 });
    for (const [i, host] of appHosts.entries()) {
      let d = null;
      try {
        d = (await api.post('paas', '/v1/domains', { name: host, project: app, type: 'PROJECT' }))?.domain;
        steps.push(`added ${host} to app ${app}`);
      } catch (err) {
        if (err.status !== 409) throw err;
        const all = (await api.get('paas', '/v1/domains'))?.domains || [];
        d = all.find((x) => x.name === host);
        if (d && d.project?.project_id !== app && d.project?._id !== project._id) {
          await api.post('paas', '/v1/domains/set-project', { domainID: d._id, projectID: project._id });
          steps.push(`moved ${host} to app ${app}`);
        }
      }
      const check = d?._id ? await api.get('paas', `/v1/domains/${d._id}/check`).catch(() => null) : null;
      const target = check?.domain?.CNameRecord || `${app}.liara.run`;
      const name = appNames[i];
      const rec = name === '@' ? { name, type: 'ALIAS', contents: [{ host: target }] } : { name, type: 'CNAME', contents: [{ host: target }] };
      const added = await addRecords(api, zone, [rec]);
      domainResults.push({ host, domainID: d?._id, pointsTo: target, record: `${rec.type} ${name} → ${target}`, ...added });
    }
  }

  let ssl = null;
  if (app && args.enableSsl !== false) {
    ssl = [];
    for (const host of appHosts) {
      try {
        await api.post('paas', '/v1/domains/provision-ssl-certs', { domain: host });
        ssl.push(`${host}: SSL requested`);
      } catch (err) {
        ssl.push(`${host}: SSL not issued yet (${err.status || ''}) — it works once nameservers point to Liara; run this again later`);
      }
    }
  }

  const zoneNow = await getZone(api, zone);
  return {
    steps,
    zone: { name: zone, status: zoneNow?.status, liaraNameservers: zoneNow?.nameServers, currentNameservers: zoneNow?.currentNameServers },
    imported,
    domains: domainResults,
    ssl,
    nextStep: zoneNow?.status === 'ACTIVE'
      ? 'Zone is active on Liara.'
      : `At your domain registrar, replace the nameservers of ${zone} with: ${(zoneNow?.nameServers || []).join(', ')}. Then run the api tool: PUT dns /api/v1/zones/${zone}/check. Review the imported records first — only common names are copied (check for others in your current DNS panel).`,
  };
}

// ---------- AI ----------

export async function connectAi(api, args) {
  const { app, workspace, envKeys } = args;
  const steps = [];
  const list = (await api.get('ai', '/v1/workspaces'))?.workspaces || [];
  let ws = list.find((w) => w.name === workspace);
  if (!ws) {
    const res = await api.post('ai', '/v1/workspaces', { name: workspace, plan: args.plan || 'base' });
    ws = res?.workspace || (await api.get('ai', '/v1/workspaces')).workspaces.find((w) => w.name === workspace);
    steps.push(`created AI workspace ${workspace} (${args.plan || 'base'})`);
  }
  const keyName = (args.keyName || (app || workspace)).replace(/[^a-z0-9-]/gi, '').slice(0, 15).padEnd(3, 'x');
  let key;
  try {
    key = await api.post('ai', '/v1/keys', { name: keyName, workspaces: [workspace] });
  } catch (err) {
    if (err.status !== 409) throw err;
    key = await api.post('ai', '/v1/keys', { name: `${keyName.slice(0, 10)}${Date.now().toString(36).slice(-4)}`, workspaces: [workspace] });
  }
  steps.push('created AI API key');
  const baseUrl = `https://ai.liara.ir/api/${ws._id}/v1`;
  const creds = { apiKey: key.key, baseUrl };
  let keys = envKeys?.length ? envKeys : defaultKeys('ai');
  // An app that only had OPENAI_API_KEY needs OPENAI_BASE_URL too.
  if (!keys.some((k) => roleOf('ai', k) === 'baseUrl')) {
    const prefix = (keys.find((k) => roleOf('ai', k) === 'apiKey') || 'OPENAI_API_KEY').replace(/_API_KEY$|_KEY$|_TOKEN$/, '');
    keys = [...keys, `${prefix}_BASE_URL`];
  }
  const { vars, unmapped } = fillKeys('ai', keys, creds);
  let envResult = null;
  if (app && Object.keys(vars).length) envResult = await setEnvs(api, { app, vars, kind: 'ai' });
  return {
    steps,
    workspace: { id: ws._id, name: ws.name, plan: ws.plan, baseUrl },
    envVars: masked('ai', vars),
    unmappedKeys: unmapped,
    appEnvUpdate: envResult,
    notes: [
      'Liara AI is OpenAI-compatible. Model IDs need the provider prefix, e.g. "openai/gpt-4o-mini", "anthropic/claude-sonnet-4", "google/gemini-2.5-flash". Update model names in the code; list models with the api tool: GET ai /v2/models.',
      'If the code builds the OpenAI client with a hard-coded baseURL, change it to read the base URL env var.',
    ],
  };
}
