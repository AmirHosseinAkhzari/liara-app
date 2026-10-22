// Services a project needs that Liara does not offer as a managed product (Neo4j, n8n, search
// engines, vector stores, anything in docker-compose): each runs as its own Liara docker app,
// deployed from its image, in the same private network as the main app. Liara documents this
// for images (paas/docker/how-tos/deploy-image-from-dockerhub) and for Compose ("one docker app
// per service", paas/docker/how-tos/deploy-docker-compose). Apps in one network reach each other
// by app name on any port (paas/details/private-network).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createApp, getApp, releaseStatus } from './deploy.mjs';
import { setEnvs, getEnvs } from './services.mjs';
import { ensureDisk, mountPath } from './disks.mjs';
import { LiaraError } from './api.mjs';

// Known services. Every value is from Liara's docs or the image's official docs (see source).
// secrets: env vars the plugin generates; connection(app, secrets): env vars for the main app.
export const SERVICE_CATALOG = {
  n8n: {
    title: 'n8n', image: 'n8nio/n8n', port: 5678,
    disks: [{ name: 'data', mountTo: '/home/node/.n8n', size: '1' }],
    env: (app) => ({ WEBHOOK_URL: `https://${app}.liara.run/`, N8N_PROTOCOL: 'https', N8N_PORT: '5678' }),
    secrets: [], connection: (app) => ({ N8N_URL: `http://${app}:5678` }),
    oneClick: 'https://docs.liara.ir/one-click-apps/n8n/quick-start/',
    source: 'Liara docs: one-click-apps/n8n/how-tos/choose-version (image, port 5678, disk at /home/node/.n8n)',
  },
  neo4j: {
    title: 'Neo4j', image: 'neo4j', port: 7474, privatePorts: { bolt: 7687 },
    disks: [{ name: 'data', mountTo: '/data', size: '1' }],
    env: () => ({}),
    secrets: ['NEO4J_PASSWORD'],
    serviceEnv: (s) => ({ NEO4J_AUTH: `neo4j/${s.NEO4J_PASSWORD}` }),
    connection: (app, s) => ({ NEO4J_URI: `bolt://${app}:7687`, NEO4J_USERNAME: 'neo4j', NEO4J_PASSWORD: s.NEO4J_PASSWORD }),
    oneClick: null,
    source: 'Neo4j official Docker image docs (HTTP 7474, Bolt 7687, data in /data, NEO4J_AUTH=neo4j/<password>)',
  },
  meilisearch: {
    title: 'Meilisearch', image: 'getmeili/meilisearch', port: 7700,
    disks: [{ name: 'data', mountTo: '/meili_data', size: '1' }],
    env: () => ({ MEILI_ENV: 'production' }),
    secrets: ['MEILI_MASTER_KEY'],
    serviceEnv: (s) => ({ MEILI_MASTER_KEY: s.MEILI_MASTER_KEY }),
    connection: (app, s) => ({ MEILI_HOST: `http://${app}:7700`, MEILI_MASTER_KEY: s.MEILI_MASTER_KEY }),
    oneClick: 'https://docs.liara.ir/one-click-apps/meilisearch/about/',
    source: 'Liara docs: paas/docker/how-tos/deploy-image-from-dockerhub (port 7700, disk at /meili_data)',
  },
  qdrant: {
    title: 'Qdrant', image: 'qdrant/qdrant', port: 6333,
    disks: [{ name: 'data', mountTo: '/qdrant/storage', size: '1' }],
    env: () => ({}),
    secrets: ['QDRANT_API_KEY'],
    serviceEnv: (s) => ({ QDRANT__SERVICE__API_KEY: s.QDRANT_API_KEY }),
    connection: (app, s) => ({ QDRANT_URL: `http://${app}:6333`, QDRANT_API_KEY: s.QDRANT_API_KEY }),
    oneClick: 'https://docs.liara.ir/one-click-apps/qdrant/about/',
    source: 'Qdrant official Docker docs (HTTP 6333, storage in /qdrant/storage, QDRANT__SERVICE__API_KEY)',
  },
  typesense: {
    title: 'Typesense', image: 'typesense/typesense', port: 8108,
    disks: [{ name: 'data', mountTo: '/data', size: '1' }],
    env: () => ({ TYPESENSE_DATA_DIR: '/data' }),
    secrets: ['TYPESENSE_API_KEY'],
    serviceEnv: (s) => ({ TYPESENSE_API_KEY: s.TYPESENSE_API_KEY }),
    connection: (app, s) => ({ TYPESENSE_HOST: app, TYPESENSE_PORT: '8108', TYPESENSE_PROTOCOL: 'http', TYPESENSE_API_KEY: s.TYPESENSE_API_KEY }),
    oneClick: 'https://docs.liara.ir/one-click-apps/typesense/about/',
    source: 'Typesense official docs (port 8108, TYPESENSE_DATA_DIR / TYPESENSE_API_KEY env vars)',
  },
};

// Liara one-click apps (docs.liara.ir/one-click-apps/*), for "there is also a ready-made app".
export const ONE_CLICK = new Set(['ackee', 'activepieces', 'actual', 'affine', 'apache-answer', 'appsmith', 'appwrite', 'automatisch', 'chatwoot', 'chroma', 'directus', 'discourse', 'docmost', 'docuseal', 'drupal', 'etherpad', 'flowise', 'focalboard', 'formbricks', 'freescout', 'ghost', 'gitea', 'gitlabce', 'grafana', 'grist', 'headless-chrome', 'imgproxy', 'infisical', 'jitsi', 'keila', 'kibana', 'kutt', 'linkstack', 'listmonk', 'matomo', 'mattermost', 'meilisearch', 'memos', 'metabase', 'mixpost', 'moodle', 'n8n', 'nextcloud', 'nocobase', 'nocodb', 'ntfy', 'odoo', 'onedev', 'openproject', 'openwebui', 'paperless', 'passbolt', 'pghero', 'pocketbase', 'postiz', 'prestashop', 'qdrant', 'rallly', 'rocketchat', 'sentry', 'soketi', 'strapi', 'supabase', 'supertokens', 'teable', 'typesense', 'umami', 'unleash', 'uptime-kuma', 'varnish', 'vikunja', 'vscode', 'wikijs', 'wordpress', 'zitadel']);

// Images Liara covers with its own products: they become connect_* calls, not docker apps.
const MANAGED = [
  [/(^|\/)(postgres|postgis\/postgis|pgvector\/pgvector)(:|$)/, 'database (PostgreSQL)'], [/(^|\/)(mysql|mariadb)(:|$)/, 'database'],
  [/(^|\/)mongo(:|$)/, 'database (MongoDB)'], [/(^|\/)(redis|valkey\/valkey|keydb)(:|$)/, 'database (Redis)'], [/(^|\/)rabbitmq(:|$)/, 'database (RabbitMQ)'],
  [/elasticsearch/, 'database (Elasticsearch)'], [/clickhouse/, 'database (ClickHouse)'], [/mssql/, 'database (SQL Server)'],
  [/minio/, 'object storage'], [/(mailhog|mailpit|maildev)/, 'email (dev only)'],
];

// Code-level hints: a client library for a service Liara has no managed product for.
export const SERVICE_PACKAGES = {
  'neo4j-driver': 'neo4j', 'py:neo4j': 'neo4j', 'py:neomodel': 'neo4j', 'go:github.com/neo4j/neo4j-go-driver/v5': 'neo4j',
  meilisearch: 'meilisearch', 'py:meilisearch': 'meilisearch', 'php:meilisearch/meilisearch-php': 'meilisearch',
  typesense: 'typesense', 'py:typesense': 'typesense', 'php:typesense/typesense-php': 'typesense',
  '@qdrant/js-client-rest': 'qdrant', 'py:qdrant-client': 'qdrant',
};

// Minimal docker-compose reader: services with image, build, ports, expose, volumes, environment keys.
export function readCompose(root) {
  const file = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'].map((f) => path.join(root, f)).find((f) => fs.existsSync(f));
  if (!file) return null;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const services = {};
  let inServices = false; let svcIndent = null; let current = null; let key = null; let keyIndent = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^ */)[0].length;
    const line = raw.trim();
    if (indent === 0) { inServices = /^services:\s*$/.test(line); current = null; continue; }
    if (!inServices) continue;
    if (svcIndent === null || indent === svcIndent) {
      const m = line.match(/^([A-Za-z0-9._-]+):\s*$/);
      if (m) { svcIndent = indent; current = services[m[1]] = { name: m[1], image: null, build: false, ports: [], expose: [], volumes: [], envKeys: [] }; key = null; continue; }
    }
    if (!current || indent <= svcIndent) continue;
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv && (keyIndent === null || indent <= keyIndent || !key)) {
      key = kv[1]; keyIndent = indent;
      const val = kv[2].replace(/^["']|["']$/g, '');
      if (key === 'image') current.image = val;
      if (key === 'build') current.build = true;
      if (key === 'environment' && val.startsWith('[')) current.envKeys.push(...val.slice(1, -1).split(',').map((x) => x.trim().split('=')[0]).filter(Boolean));
      continue;
    }
    if (indent > keyIndent) {
      const item = line.replace(/^-\s*/, '').replace(/^["']|["']$/g, '');
      if (key === 'ports') current.ports.push(item);
      else if (key === 'expose') current.expose.push(item);
      else if (key === 'volumes' && line.startsWith('-')) current.volumes.push(item);
      else if (key === 'environment') {
        const k = line.startsWith('-') ? item.split('=')[0] : item.split(':')[0];
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) current.envKeys.push(k);
      }
    }
  }
  return { file: path.basename(file), services: Object.values(services) };
}

const containerPort = (spec) => {
  const s = String(spec).split('/')[0];
  const parts = s.split(':');
  const n = Number(parts[parts.length - 1]);
  return Number.isInteger(n) ? n : null;
};

// Services from compose (and client libraries) that should become their own docker app.
export function dockerServicesFor(root, { deps = null, appServiceGuess = null } = {}) {
  const compose = readCompose(root);
  const out = [];
  for (const svc of compose?.services || []) {
    if (svc.build || !svc.image || svc.name === appServiceGuess) continue; // the app itself
    const img = svc.image.toLowerCase();
    const managed = MANAGED.find(([re]) => re.test(img));
    if (managed) continue; // covered by connect_*
    const repo = img.split(':')[0];
    const tag = img.includes(':') ? svc.image.split(':').pop() : null;
    const key = Object.keys(SERVICE_CATALOG).find((k) => repo === SERVICE_CATALOG[k].image || repo.endsWith(`/${k}`) || repo === k);
    const port = key ? SERVICE_CATALOG[key].port : containerPort(svc.expose[0] || svc.ports[0]);
    const disks = svc.volumes
      .map((v) => v.split(':'))
      .filter((p) => p.length >= 2 && p[1].startsWith('/'))
      .map((p, i) => ({ name: (p[0].replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || `data${i + 1}`).slice(0, 30), mountTo: p[1], size: '1' }));
    out.push({
      from: `${compose.file} service "${svc.name}"`, service: svc.name, image: svc.image, tag, catalog: key || null,
      port, disks: key ? SERVICE_CATALOG[key].disks : disks, envKeys: [...new Set(svc.envKeys)],
      oneClick: ONE_CLICK.has(key || repo.split('/').pop()) ? `https://docs.liara.ir/one-click-apps/${key || repo.split('/').pop()}/` : null,
      recommendation: 'docker-service',
    });
  }
  // Client libraries without a compose service: suggest the catalog service.
  for (const [pkg, key] of Object.entries(SERVICE_PACKAGES)) {
    const [prefix, name] = pkg.includes(':') ? pkg.split(/:(.+)/) : ['js', pkg];
    const set = deps && { js: deps.js, py: deps.py, php: deps.php, go: deps.go }[prefix];
    if (!set?.has(name) || out.some((o) => o.catalog === key)) continue;
    const c = SERVICE_CATALOG[key];
    out.push({ from: `package ${name}`, service: key, image: c.image, tag: null, catalog: key, port: c.port, disks: c.disks, envKeys: [], oneClick: c.oneClick, recommendation: 'docker-service' });
  }
  return out;
}

// ---------- deploying a service as its own docker app ----------


const secret = () => crypto.randomBytes(24).toString('base64url').replace(/[-_]/g, '').slice(0, 32);
const SAFE_IMAGE = /^[a-z0-9][a-z0-9._\/-]*(:[A-Za-z0-9._-]+)?(@sha256:[a-f0-9]{64})?$/;

// What will be deployed, before anything is created (used by the consent dialog too).
export function serviceSpec({ name, service, image, tag, port, disks }) {
  const c = service ? SERVICE_CATALOG[service] : null;
  if (service && !c) throw new Error(`Unknown service "${service}". Known: ${Object.keys(SERVICE_CATALOG).join(', ')}; or pass image and port.`);
  let img = image || c?.image;
  if (!img) throw new Error('Pass service (n8n, neo4j, meilisearch, qdrant, typesense) or image + port.');
  if (!img.includes(':') && !img.includes('@')) img = `${img}:${tag || 'latest'}`;
  if (!SAFE_IMAGE.test(img)) throw new Error(`"${img}" is not a valid image reference.`);
  const p = Number(port || c?.port);
  if (!Number.isInteger(p) || p <= 0 || p > 65535) throw new Error('port: the port the image serves HTTP on.');
  const ds = (disks || c?.disks || []).map((d) => ({ name: d.name, mountTo: mountPath(d.mountTo, { image: true }), size: String(d.size || '1') }));
  return { name, catalog: service || null, image: img, port: p, disks: ds, privatePorts: c?.privatePorts || {}, latest: /:latest$/.test(img) };
}

export async function deployService(api, args, steps = []) {
  const spec = serviceSpec(args);
  const c = spec.catalog ? SERVICE_CATALOG[spec.catalog] : null;
  const app = args.name;
  // Same private network as the app that will use it, so it is reachable by name.
  let network = args.network;
  if (!network && args.connectTo) {
    const main = await getApp(api, args.connectTo);
    if (!main) throw new LiaraError(`App "${args.connectTo}" not found (connectTo).`, { status: 404 });
    network = main.network?._id || main.network || undefined;
  }
  let project = await getApp(api, app);
  if (!project) {
    project = await createApp(api, { app, platform: 'docker', planID: args.planID, bundlePlanID: args.bundlePlanID, network, createNetwork: args.createNetwork }, steps);
    steps.push(`created docker app ${app} (${args.planID}${args.bundlePlanID ? ` + ${args.bundlePlanID}` : ''})`);
  } else steps.push(`reusing app ${app}`);

  // Secrets: reuse what the service already has, otherwise generate. Never returned.
  const current = await getEnvs(api, app, { reveal: true }).catch(() => ({}));
  const secrets = {};
  for (const k of c?.secrets || []) secrets[k] = current[k] || secret();
  const vars = { ...(c ? c.env(app) : {}), ...(c?.serviceEnv ? c.serviceEnv(secrets) : {}), ...secrets, ...(args.env || {}) };
  if (Object.keys(vars).length) {
    await setEnvs(api, { app, vars, kind: 'service' });
    steps.push(`set ${Object.keys(vars).length} env vars on ${app}${c?.secrets?.length ? ` (generated ${c.secrets.join(', ')}; values not shown)` : ''}`);
  }
  for (const d of spec.disks) {
    const r = await ensureDisk(api, app, d);
    steps.push(r.created ? `created disk ${d.name} (${d.size} GB) for ${d.mountTo}` : `reusing disk ${d.name}`);
  }
  const body = { image: spec.image, port: spec.port, type: 'docker', disks: spec.disks.map(({ name, mountTo }) => ({ name, mountTo })), message: `${spec.image} via Claude Liara plugin` };
  const rel = await api.post('paas', `/v2/projects/${encodeURIComponent(app)}/releases`, body);
  steps.push(`release ${rel?.releaseID} started (${spec.image}, port ${spec.port})`);
  const status = await releaseStatus(api, { app, releaseID: rel?.releaseID, wait: args.wait ?? 300 });

  let connection = null;
  if (args.connectTo && c?.connection) {
    const conn = c.connection(app, secrets);
    const res = await setEnvs(api, { app: args.connectTo, vars: conn, kind: 'service' });
    connection = { app: args.connectTo, envVars: Object.keys(conn), note: `${args.connectTo} restarts to apply them; it reaches ${app} by name inside the private network.`, changed: res.changed ? Object.keys(res.changed) : [] };
    steps.push(`wrote ${Object.keys(conn).join(', ')} into ${args.connectTo}`);
  }
  return {
    service: app,
    image: spec.image,
    state: status.state,
    success: status.success,
    releaseID: status.releaseID,
    publicUrl: `https://${app}.liara.run`,
    privateHost: app,
    ports: { http: spec.port, ...spec.privatePorts },
    disks: spec.disks,
    connection,
    steps,
    notes: [
      spec.latest ? `The image tag is "latest"; pin a version (tag) for reproducible deploys.` : null,
      c?.oneClick ? `Liara also offers ${c.title} as a ready-made app: ${c.oneClick}` : null,
      c ? `Settings from: ${c.source}.` : 'Generic image: check the image docs for the data folder (disks) and required env vars.',
      'The public URL serves the HTTP port; other ports are reachable only inside the private network (by app name).',
    ].filter(Boolean),
    ...(status.success ? {} : { buildLogTail: status.buildLogTail, hint: 'Run diagnose on the service app.' }),
  };
}
