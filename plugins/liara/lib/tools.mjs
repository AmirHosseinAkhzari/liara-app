// Tool definitions shared by the MCP server and the CLI.
import { createClient } from './api.mjs';
import { detectProject, summarize } from './detect.mjs';
import { deploy, releaseStatus, appLogs, getPlans, getApp, createApp, writeLiaraJson } from './deploy.mjs';
import { getEnvs, setEnvs, connectDatabase, connectStorage, connectMail, connectDns, connectAi } from './services.mjs';
import { migrateDatabase, migrateStorage } from './migrate.mjs';
import { browserLogin, logout, useAccount, readAuthFile, AUTH_FILE } from './login.mjs';
import { listTeams, resolveTeam, setChosenTeam, teamContext, describeContext, liaraJsonTeam } from './teams.mjs';
import path from 'node:path';

const str = (description, extra = {}) => ({ type: 'string', description, ...extra });
const num = (description) => ({ type: 'number', description });
const bool = (description) => ({ type: 'boolean', description });
const strArr = (description) => ({ type: 'array', items: { type: 'string' }, description });
const PATH = str('Project folder (absolute or relative to the current directory). Default: current directory.');
const APP = str('Liara app name (lowercase letters, digits, hyphens).');
const PLATFORM = str('Liara platform of the app, used to pick env var names (laravel, django, nextjs, node, ...).');
const ENV_KEYS = strArr('Env var names the app reads for this service (from scan_project). Leave empty to use common defaults for the platform.');

export const TOOLS = [
  {
    name: 'login',
    description: 'Log in to Liara in the browser (same as `liara login`): opens the Liara console login page, the user signs in, and the token comes back to this computer and is saved to ~/.liara-auth.json (shared with the Liara CLI). The token is never shown. If it returns waiting: true, call it again to keep waiting.',
    inputSchema: { type: 'object', properties: { wait: num('Seconds to wait for the user to finish signing in (default 120).') } },
    async handler(args) {
      const res = await browserLogin({ wait: args.wait ?? 120 });
      if (!res.loggedIn) return res;
      const me = await createClient().get('account', '/v1/me').catch((err) => ({ error: err.message }));
      return {
        loggedIn: true,
        account: res.current,
        email: me.user?.email,
        fullname: me.user?.fullname,
        savedAccounts: res.accounts,
        savedTo: res.savedTo,
        check: me.error ? `Saved, but the check call failed: ${me.error}` : 'Token works.',
      };
    },
  },
  {
    name: 'accounts',
    description: 'List Liara accounts saved by browser login, or switch the current one. Never shows tokens.',
    inputSchema: { type: 'object', properties: { use: str('Account name to make current.') } },
    async handler(args) {
      if (args.use) useAccount(args.use);
      const conf = readAuthFile();
      return {
        file: AUTH_FILE,
        accounts: Object.entries(conf.accounts).map(([name, a]) => ({ name, email: a.email, current: Boolean(a.current) })),
      };
    },
  },
  {
    name: 'logout',
    description: 'Remove a saved Liara account (default: the current one) from ~/.liara-auth.json. This also logs the Liara CLI out of it. Ask the user first.',
    inputSchema: { type: 'object', properties: { account: str('Account name (default: current).') } },
    handler: (args) => logout(args.account),
  },
  {
    name: 'whoami',
    description: 'Check the Liara login, show whether calls go to the personal account or a team, and list the teams this account belongs to. Call this first; if it says not logged in or rejected, call login. If chooseAccount is true, ask the user where to work and call teams {use}.',
    inputSchema: { type: 'object', properties: {} },
    async handler(_, api, ctx) {
      const me = await api.get('account', '/v1/me');
      const teams = await listTeams(api).catch(() => []);
      const workingIn = describeContext(ctx.team, api, teams);
      if (me.team) workingIn.name = me.team.teamName || workingIn.name;
      if (me.team) workingIn.role = me.team.teamMemberRole?.name || null;
      return {
        tokenSource: api.auth.source,
        user: { fullname: me.user?.fullname, email: me.user?.email, isVerified: me.user?.isVerified },
        workingIn,
        teams,
        chooseAccount: teams.length > 0 && workingIn.source === 'default',
        privateNetworkFeature: (me.team || me.user)?.privateNetworkFeature,
      };
    },
  },
  {
    name: 'teams',
    description: 'List the Liara teams this account belongs to (role, and whether it may create and deploy apps there) and choose where to work: a team or the personal account. The choice applies to every later call in this session (apps, databases, buckets, DNS, mail, AI, env vars, deploys) and is saved to the project\'s liara.json as "team-id" (same as the Liara CLI) on the next deploy.',
    inputSchema: {
      type: 'object',
      properties: {
        use: str('Team ID or name to work in from now on, or "personal" for the personal account.'),
        path: PATH,
      },
    },
    async handler(args, api, ctx) {
      const teams = await listTeams(api);
      if (args.use !== undefined) {
        const t = await resolveTeam(api, args.use);
        const full = teams.find((x) => x.id === t.id);
        if (full && full.canDeploy === false) {
          throw new Error(`Your role in "${full.name}" (${full.role || 'unknown'}) can't deploy apps there. Pick another team or "personal".`);
        }
        setChosenTeam(t.id ? { id: t.id, name: full?.name || t.name } : null);
      }
      const now = await teamContext(api, args, ctx.cwd);
      const working = describeContext(now, api.withTeam(now.teamID), teams);
      return {
        workingIn: working,
        teams,
        savedInLiaraJson: liaraJsonTeam(path.resolve(ctx.cwd, args.path || '.')),
        note: 'Team resources are billed to the team balance. Use "personal" to switch back.',
      };
    },
  },
  {
    name: 'scan_project',
    description: 'Scan a project: language, framework, Liara platform, port, and every service it uses (database, S3 storage, email, DNS/domains, AI, other APIs) with the provider each points to today and a recommendation (auto-connect / ask-to-migrate / already-on-liara). Secret values are never returned.',
    inputSchema: {
      type: 'object',
      properties: {
        path: PATH,
        app: str('Optional existing Liara app: its env vars are treated as production config.'),
        checkDns: bool('Look up nameservers of custom domains (default true).'),
      },
    },
    async handler(args, api) {
      let liaraEnvs = null;
      if (args.app && api.auth.hasToken) liaraEnvs = await getEnvs(api, args.app, { reveal: true }).catch(() => null);
      const report = await detectProject(path.resolve(args.path || '.'), { liaraEnvs, checkDns: args.checkDns !== false });
      return { summary: summarize(report), ...report };
    },
  },
  {
    name: 'list_resources',
    description: 'List what already exists on the Liara account: apps, databases, buckets, DNS zones, mail servers, AI workspaces.',
    inputSchema: { type: 'object', properties: { kinds: strArr('Subset of: apps, databases, buckets, zones, mail, ai. Default: all.') } },
    async handler(args, api) {
      const want = new Set(args.kinds?.length ? args.kinds : ['apps', 'databases', 'buckets', 'zones', 'mail', 'ai']);
      const out = {};
      const safe = async (k, fn) => {
        if (!want.has(k)) return;
        try {
          out[k] = await fn();
        } catch (err) {
          out[k] = { error: err.message };
        }
      };
      await Promise.all([
        safe('apps', async () => ((await api.get('paas', '/v1/projects')).projects || []).map((p) => ({ name: p.project_id, platform: p.type, status: p.status, scale: p.scale, plan: p.planID, deployed: p.isDeployed }))),
        safe('databases', async () => ((await api.get('dbaas', '/v1/databases')).databases || []).map((d) => ({ id: d._id || d.id, hostname: d.hostname, type: d.type, status: d.status, plan: d.planID, publicNetwork: d.publicNetwork }))),
        safe('buckets', async () => ((await api.get('storage', '/api/v1/buckets')).buckets || []).map((b) => ({ name: b.name, plan: b.plan, permission: b.permission, status: b.status }))),
        safe('zones', async () => ((await api.get('dns', '/api/v1/zones')).data || []).map((z) => ({ name: z.name, status: z.status, nameServers: z.nameServers }))),
        safe('mail', async () => {
          const r = await api.get('mail', '/api/v1/mails');
          return (r?.data?.mailServers || r?.data || []).map((m) => ({ id: m.id || m._id, domain: m.domain, status: m.status, mode: m.mode }));
        }),
        safe('ai', async () => ((await api.get('ai', '/v1/workspaces')).workspaces || []).map((w) => ({ id: w._id, name: w.name, plan: w.plan, state: w.state }))),
      ]);
      return out;
    },
  },
  {
    name: 'plans',
    description: 'Available Liara plans (apps, bundles, databases, object storage, mail) and database versions. Use the IDs for planID / bundlePlanID / version.',
    inputSchema: { type: 'object', properties: {} },
    handler: (_, api) => getPlans(api),
  },
  {
    name: 'deploy',
    description: 'Deploy a project folder to a Liara app: creates the app if missing (needs planID), packs the source (respects .gitignore and .liaraignore, skips .env files), uploads it, starts a release and waits for the result. Returns state, URL and build log tail on failure.',
    inputSchema: {
      type: 'object',
      properties: {
        path: PATH,
        app: APP,
        platform: str('Liara platform: node, nextjs, react, vue, angular, static, laravel, php, django, flask, python, go, netcore, docker. Default: detected.'),
        port: num('Port the app listens on. Default: detected.'),
        planID: str('Plan for a NEW app (see plans tool).'),
        bundlePlanID: str('Bundle plan for a NEW app, if the account uses bundles.'),
        network: str('Private network ID for a NEW app (optional).'),
        create: bool('Create the app if it does not exist (default true).'),
        wait: num('Seconds to wait for the release to finish (default 240, 0 = do not wait).'),
        message: str('Release message.'),
        includeEnvFiles: bool('Also upload .env files (default false; prefer set_envs).'),
        saveLiaraJson: bool('Write app/platform/port to liara.json after a successful deploy (default true).'),
      },
    },
    async handler(args, api, ctx) {
      const res = await deploy(api, args);
      res.account = describeContext(ctx.team, api);
      if (res.success && args.saveLiaraJson !== false) {
        // Remember the team like `liara init` does, so the next deploy (plugin or CLI) goes to the same place.
        const teamID = api.auth.teamID || null;
        writeLiaraJson(path.resolve(args.path || '.'), { app: res.app, platform: res.platform, port: res.port, extra: { 'team-id': teamID || undefined } });
        res.steps.push(teamID ? `saved liara.json (team-id ${teamID})` : 'saved liara.json');
      }
      return res;
    },
  },
  {
    name: 'create_app',
    description: 'Create an empty Liara app (no deploy yet), so services and env vars can be connected before the first deploy. Returns the existing app if it already exists.',
    inputSchema: {
      type: 'object',
      required: ['app', 'platform', 'planID'],
      properties: {
        app: APP,
        platform: str('Liara platform (from scan_project).'),
        planID: str('App plan (see plans tool).'),
        bundlePlanID: str('Bundle plan, if the account uses bundles.'),
        network: str('Private network ID (optional).'),
      },
    },
    async handler(args, api, ctx) {
      const account = describeContext(ctx.team, api);
      const existing = await getApp(api, args.app);
      if (existing) return { created: false, app: args.app, account, platform: existing.type, plan: existing.planID, status: existing.status };
      const p = await createApp(api, args);
      return { created: true, app: args.app, account, platform: p?.type || args.platform, plan: p?.planID || args.planID, url: `https://${args.app}.liara.run` };
    },
  },
  {
    name: 'release_status',
    description: 'State of a release (latest if releaseID omitted). Can wait for it to finish. Includes the build log tail when it failed.',
    inputSchema: { type: 'object', required: ['app'], properties: { app: APP, releaseID: str('Release ID from deploy.'), wait: num('Seconds to wait (default 0).') } },
    handler: (args, api) => releaseStatus(api, args),
  },
  {
    name: 'app_logs',
    description: 'Runtime logs of a Liara app (default: last hour, last 100 lines).',
    inputSchema: { type: 'object', required: ['app'], properties: { app: APP, since: num('Unix timestamp (seconds).'), lines: num('Max lines (default 100).') } },
    handler: (args, api) => appLogs(api, args),
  },
  {
    name: 'app_action',
    description: 'Restart, start (scale 1) or stop (scale 0) a Liara app.',
    inputSchema: { type: 'object', required: ['app', 'action'], properties: { app: APP, action: str('restart | start | stop', { enum: ['restart', 'start', 'stop'] }) } },
    async handler({ app, action }, api) {
      if (action === 'restart') await api.post('paas', `/v1/projects/${app}/actions/restart`);
      else await api.post('paas', `/v1/projects/${app}/actions/scale`, { scale: action === 'start' ? 1 : 0 });
      return { app, action, ok: true };
    },
  },
  {
    name: 'get_envs',
    description: 'Env vars of a Liara app. Secret-looking values are masked.',
    inputSchema: { type: 'object', required: ['app'], properties: { app: APP } },
    handler: ({ app }, api) => getEnvs(api, app),
  },
  {
    name: 'set_envs',
    description: 'Add/update env vars on a Liara app (merged with existing ones). Use fromEnvFile to copy values from a local .env file without them appearing in the chat; keys limits which ones.',
    inputSchema: {
      type: 'object',
      required: ['app'],
      properties: {
        app: APP,
        vars: { type: 'object', additionalProperties: { type: 'string' }, description: 'KEY → value pairs (non-secret values only; use fromEnvFile for secrets).' },
        fromEnvFile: str('Local env file to copy from, e.g. .env.production (relative to path).'),
        keys: strArr('Only copy these keys from fromEnvFile.'),
        path: PATH,
        overwrite: bool('Overwrite keys that already exist on Liara (default true).'),
      },
    },
    handler: (args, api) => setEnvs(api, args),
  },
  {
    name: 'connect_database',
    description: 'Create (or reuse) a Liara managed database and write its connection details into the app env vars using the names the app already reads. Values are masked in the result.',
    inputSchema: {
      type: 'object',
      properties: {
        app: APP,
        platform: PLATFORM,
        databaseId: str('Existing Liara database ID or hostname.'),
        create: {
          type: 'object',
          description: 'Create a new database.',
          properties: {
            type: str('postgres | mysql | mariadb | mongodb | redis | mssql | elasticsearch | rabbitmq | clickhouse'),
            hostname: str('Unique database name, e.g. myapp-db.'),
            planID: str('Database plan (see plans tool).'),
            version: str('Engine version (see plans tool → databaseVersions).'),
            bundlePlanID: str('Optional bundle plan.'),
            network: str('Optional private network ID (same as the app).'),
            publicNetwork: bool('Expose to the internet (default false).'),
          },
        },
        envKeys: ENV_KEYS,
        dbName: str('Database name inside the server (default: engine default).'),
        publicAccess: bool('Use the public host/port instead of the private network (default false).'),
      },
    },
    handler: (args, api) => connectDatabase(api, args),
  },
  {
    name: 'connect_storage',
    description: 'Create (or reuse) a Liara Object Storage bucket, create an access key for it, and write S3 settings into the app env vars.',
    inputSchema: {
      type: 'object',
      required: ['bucket'],
      properties: {
        app: APP,
        platform: PLATFORM,
        bucket: str('Bucket name.'),
        create: { type: 'object', description: 'Create the bucket if missing.', properties: { plan: str('Storage plan (see plans tool → objectStorage).'), permission: str('private | public', { enum: ['private', 'public'] }) } },
        envKeys: ENV_KEYS,
        endpoint: str('S3 endpoint (default https://storage.c2.liara.space or LIARA_S3_ENDPOINT).'),
      },
    },
    handler: (args, api) => connectStorage(api, args),
  },
  {
    name: 'connect_mail',
    description: 'Create (or reuse) a Liara mail server for a domain, create SMTP credentials, write SMTP settings into the app env vars, and return (or add to Liara DNS) the DNS records mail needs.',
    inputSchema: {
      type: 'object',
      required: ['domain'],
      properties: {
        app: APP,
        platform: PLATFORM,
        domain: str('Mail domain, e.g. example.com.'),
        plan: str('Mail plan for a new server (see plans tool → mail).'),
        mode: str('LIVE (real delivery) or DEV (testing)', { enum: ['LIVE', 'DEV'] }),
        account: str('Mailbox to create, e.g. noreply.'),
        from: str('From address (default noreply@domain).'),
        envKeys: ENV_KEYS,
        addDnsRecords: bool('Add MX/SPF/DKIM/return-path records to the Liara DNS zone of the domain.'),
        addDmarc: bool('Also add a DMARC p=none record.'),
      },
    },
    handler: (args, api) => connectMail(api, args),
  },
  {
    name: 'connect_dns',
    description: 'Move a domain to Liara DNS: create the zone, copy existing public records (common names), attach the domain to an app with the right CNAME/ALIAS record, and request SSL. Returns the Liara nameservers to set at the registrar.',
    inputSchema: {
      type: 'object',
      required: ['domain'],
      properties: {
        domain: str('Domain to serve the app on, e.g. example.com or shop.example.com.'),
        app: str('Liara app to attach the domain to (optional).'),
        zone: str('DNS zone (default: the registrable domain).'),
        includeWww: bool('Also attach www.<domain>.'),
        importExisting: bool('Copy current public DNS records into the Liara zone (default true).'),
        enableSsl: bool('Request a free SSL certificate (default true).'),
      },
    },
    handler: (args, api) => connectDns(api, args),
  },
  {
    name: 'connect_ai',
    description: 'Create (or reuse) a Liara AI workspace, create an API key, and set the app env vars for an OpenAI-compatible client (API key + base URL).',
    inputSchema: {
      type: 'object',
      required: ['workspace'],
      properties: {
        app: APP,
        workspace: str('Workspace name (lowercase, 3-50 chars).'),
        plan: str('base | standard | pro (default base)', { enum: ['base', 'standard', 'pro'] }),
        keyName: str('API key name (3-15 chars).'),
        envKeys: ENV_KEYS,
      },
    },
    handler: (args, api) => connectAi(api, args),
  },
  {
    name: 'migrate_database',
    description: 'Copy all data from the current production database (read from a local env file) into a Liara database. PostgreSQL, MySQL/MariaDB, MongoDB (dump tools), ClickHouse (HTTP via curl) and Elasticsearch (elasticdump), locally or in Docker. Redis, RabbitMQ and SQL Server return manual steps instead. Only call after the user agreed to the migration.',
    inputSchema: {
      type: 'object',
      required: ['databaseId'],
      properties: {
        path: PATH,
        sourceEnvFile: str('Env file holding the current production connection (default .env.production).'),
        sourceKey: str('Env key with the source URL, e.g. DATABASE_URL, DIRECT_URL, CLICKHOUSE_HOST or ELASTICSEARCH_URL. Default: auto.'),
        sourceEngine: str('Engine of the source when the URL does not say (http URLs): clickhouse | elasticsearch.'),
        databaseId: str('Target Liara database ID or hostname.'),
        targetDbName: str('Target database name (MySQL/MongoDB).'),
        schemas: strArr('Postgres schemas to copy (default all; Supabase defaults to public).'),
        allowTemporaryPublicNetwork: bool('User agreed to briefly expose the Liara database so this computer can reach it.'),
      },
    },
    handler: (args, api) => migrateDatabase(api, args),
  },
  {
    name: 'migrate_storage',
    description: 'Copy all files from the current S3-compatible bucket (credentials from a local env file) into the Liara bucket configured on the app (via rclone). Only call after the user agreed.',
    inputSchema: {
      type: 'object',
      required: ['app'],
      properties: {
        path: PATH,
        app: str('Liara app whose env vars hold the Liara bucket credentials (after connect_storage).'),
        sourceEnvFile: str('Env file with the current S3 credentials (default .env.production).'),
        sourceBucket: str('Source bucket (default from env).'),
        targetBucket: str('Target bucket (default from app env).'),
      },
    },
    handler: (args, api) => migrateStorage(api, args),
  },
  {
    name: 'api',
    description: 'Call any Liara API endpoint directly (reference: https://developers.liara.ir, endpoint list in https://developers.liara.ir/llms.txt). Use for anything the other tools do not cover. Responses are not masked.',
    inputSchema: {
      type: 'object',
      required: ['service', 'method', 'path'],
      properties: {
        service: str('paas | dbaas | account | billing | storage | dns | mail | iaas | ai'),
        method: str('GET | POST | PUT | PATCH | DELETE'),
        path: str('Path, e.g. /v1/projects/my-app'),
        body: { type: 'object', description: 'JSON body.' },
        query: { type: 'object', description: 'Query parameters.' },
      },
    },
    handler: ({ service, method, path: p, body, query }, api) => api.request(service, method.toUpperCase(), p, { body, query }),
  },
];

// Tools that act on the login itself, not on an account's resources.
const ACCOUNT_LEVEL = new Set(['login', 'accounts', 'logout']);
const TEAM = str('Liara team to act in for this call: team ID or name (see the teams tool), or "personal". Default: the team chosen with the teams tool, else "team-id" in the project\'s liara.json, else LIARA_TEAM_ID, else the personal account.');
for (const t of TOOLS) {
  if (!ACCOUNT_LEVEL.has(t.name) && t.name !== 'teams') t.inputSchema.properties.team = TEAM;
}

export async function callTool(name, args = {}, { cwd = process.cwd() } = {}) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  args = args || {};
  if (ACCOUNT_LEVEL.has(name)) return tool.handler(args, createClient({ cwd }), { cwd });
  const team = await teamContext(createClient({ cwd, teamID: null }), args, cwd);
  const api = createClient({ cwd, teamID: team.teamID });
  try {
    return await tool.handler(args, api, { cwd, team });
  } catch (err) {
    // A resource "not found" is often just in another account: say where we looked.
    if (err.status === 404) {
      const where = describeContext(team, api);
      err.message += where.type === 'team'
        ? ` (looked in team ${where.name ? `"${where.name}" ` : ''}${where.id}). If it belongs to another team or the personal account, pass team or switch with the teams tool.`
        : ' (looked in the personal account). If it belongs to a team, pass team or switch with the teams tool.';
    }
    throw err;
  }
}

