// Copies data from the current provider into Liara.
// Runs dump/restore tools locally (or in Docker when they are not installed).
// Credentials are passed to child processes as env vars and never returned.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { parseEnvFile } from './envfiles.mjs';
import { credsFromEnv } from './envmap.mjs';
import { engineFromUrl, engineFromKey, providerFromHost } from './providers.mjs';
import { dbCreds, waitForDatabase, getEnvs } from './services.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Single-quote for the shell so $VARS expand inside the container, not on the host.
const sq = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
const has = (bin) => {
  try {
    execFileSync('which', [bin], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

function run(script, env, { timeoutMs = 60 * 60_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-o', 'pipefail', '-c', script], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    child.stdout.on('data', (d) => { out = (out + d).slice(-8000); });
    child.stderr.on('data', (d) => { err = (err + d).slice(-8000); });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      // Never echo secrets that tools print back.
      const scrub = (s) => Object.values(env).filter((v) => v && v.length > 5).reduce((acc, v) => acc.split(v).join('****'), s);
      resolve({ code, stdout: scrub(out).slice(-3000), stderr: scrub(err).slice(-3000) });
    });
  });
}

const HTTP_ENGINES = ['clickhouse', 'elasticsearch'];

// ClickHouse and Elasticsearch are often configured as a host plus separate user/password
// keys. Builds one http(s)://user:pass@host:port/db URL from them.
export function httpSourceUrl(vars, engine) {
  const pick = (...ks) => ks.map((k) => vars[k]).find(Boolean);
  const ch = engine === 'clickhouse';
  let base = ch
    ? pick('CLICKHOUSE_URL', 'CLICKHOUSE_HOST', 'CLICKHOUSE_SERVER')
    : pick('ELASTICSEARCH_URL', 'ELASTICSEARCH_NODE', 'ELASTIC_URL', 'ELASTICSEARCH_HOST', 'ELASTICSEARCH_HOSTS', 'ELASTIC_HOST');
  if (!base) return null;
  const user = ch ? pick('CLICKHOUSE_USER', 'CLICKHOUSE_USERNAME') : pick('ELASTICSEARCH_USERNAME', 'ELASTICSEARCH_USER', 'ELASTIC_USERNAME', 'ELASTIC_USER');
  const pass = ch ? pick('CLICKHOUSE_PASSWORD') : pick('ELASTICSEARCH_PASSWORD', 'ELASTIC_PASSWORD');
  const port = ch ? pick('CLICKHOUSE_PORT') || '8123' : '9200';
  // ELASTICSEARCH_HOSTS may be a list: take the first one.
  base = String(base).split(',')[0].trim().replace(/^\[?["']?|["']?\]?$/g, '');
  if (!/^[a-z]+:\/\//i.test(base)) base = `http://${base}${/:\d+$/.test(base) ? '' : `:${port}`}`;
  const u = new URL(base);
  if (user && !u.username) u.username = user;
  if (pass && !u.password) u.password = pass;
  if (!ch && u.password && !u.username) u.username = 'elastic';
  const db = ch && pick('CLICKHOUSE_DATABASE', 'CLICKHOUSE_DB');
  if (db && (!u.pathname || u.pathname === '/')) u.pathname = `/${db}`;
  return u.toString();
}

export function sourceInfo({ root, sourceEnvFile, sourceKey, sourceEngine }) {
  const vars = parseEnvFile(path.resolve(root, sourceEnvFile));
  if (sourceKey) {
    if (!vars[sourceKey]) throw new Error(`${sourceKey} is not set in ${sourceEnvFile}`);
    const engine = sourceEngine || engineFromUrl(vars[sourceKey]) || engineFromKey(sourceKey);
    if (HTTP_ENGINES.includes(engine)) {
      const own = engine === 'clickhouse' ? 'CLICKHOUSE_URL' : 'ELASTICSEARCH_URL';
      return { url: httpSourceUrl({ ...vars, [own]: vars[sourceKey] }, engine), engine };
    }
    return { url: vars[sourceKey], engine };
  }
  if (HTTP_ENGINES.includes(sourceEngine)) {
    const url = httpSourceUrl(vars, sourceEngine);
    if (url) return { url, engine: sourceEngine };
  }
  // Prefer a direct (non-pooled) URL when one exists, e.g. Supabase/Prisma DIRECT_URL.
  const keys = ['DIRECT_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL', 'MONGODB_URI', 'MONGO_URL', 'MONGO_URI', 'MYSQL_URL', 'POSTGRES_URL'];
  for (const k of keys) if (vars[k] && engineFromUrl(vars[k])) return { url: vars[k], engine: engineFromUrl(vars[k]) };
  for (const engine of HTTP_ENGINES) {
    const url = httpSourceUrl(vars, engine);
    if (url) return { url, engine };
  }
  const c = credsFromEnv('database', vars);
  if (c.host) {
    const scheme = /pgsql|postgres/i.test(vars.DB_CONNECTION || '') ? 'postgresql' : /mongo/i.test(vars.DB_CONNECTION || '') ? 'mongodb' : 'mysql';
    const url = `${scheme}://${encodeURIComponent(c.user || '')}:${encodeURIComponent(c.password || '')}@${c.host}:${c.port || (scheme === 'postgresql' ? 5432 : 3306)}/${c.name || ''}`;
    return { url, engine: engineFromUrl(url) };
  }
  throw new Error(`No database URL found in ${sourceEnvFile}. Pass sourceKey.`);
}

// ClickHouse URL → HTTP base, "user:pass" and database. Native ports map to their HTTP ones.
export function clickhouseHttp(url) {
  const u = new URL(url);
  let proto = u.protocol.replace(':', '');
  let port = u.port;
  if (!/^https?$/.test(proto)) proto = ['8443', '9440'].includes(port) ? 'https' : 'http';
  if (port === '9000') port = '8123';
  if (port === '9440') port = '8443';
  return {
    base: `${proto}://${u.hostname}${port ? `:${port}` : ''}`,
    auth: `${decodeURIComponent(u.username) || 'default'}:${decodeURIComponent(u.password)}`,
    db: u.pathname.replace(/^\//, '') || 'default',
  };
}

// Engines whose data is not copied, and what to tell the user instead.
const NOT_COPIED = {
  redis: 'Redis is usually a cache/queue; data is not copied. Ask the user if they really need it (then use redis-cli --rdb / RIOT).',
  rabbitmq: 'RabbitMQ holds messages in flight, not stored data, so nothing is copied. The app declares its queues again when it starts on Liara; let the old broker drain before switching.',
  mssql: 'SQL Server data is not copied automatically. Export a .bacpac from the old server with sqlpackage (or SSMS "Export Data-tier Application") and import it into the Liara database.',
};

const SCRIPTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'scripts');

export function pipeline(engine, { schemas } = {}) {
  if (engine === 'clickhouse') {
    const cmd = fs.readFileSync(path.join(SCRIPTS, 'clickhouse-copy.sh'), 'utf8');
    const verify = `echo "SELECT count() FROM system.tables WHERE database = '$DST_DB'" | curl -sS -u "$DST_AUTH" --data-binary @- "$DST_HTTP/"`;
    return { cmd, verify, tools: ['curl', 'sed'], image: 'curlimages/curl:8.10.1' };
  }
  if (engine === 'elasticsearch') {
    // Every non-system index with its mapping, settings, aliases and documents.
    const types = '--includeType=settings,analyzer,mapping,alias,data';
    const cmd = `d=$(mktemp -d) && multielasticdump --direction=dump --match="^[^.]" ${types} --input="$SRC_URL" --output="$d" && multielasticdump --direction=load ${types} --input="$d" --output="$DST_URL"; s=$?; rm -rf "$d"; exit $s`;
    return { cmd, verify: null, tools: ['multielasticdump'], image: 'elasticdump/elasticsearch-dump:latest' };
  }
  const schemaFlags = (schemas || []).map((s) => `--schema=${s}`).join(' ');
  if (engine === 'postgres') {
    const cmd = `pg_dump "$SRC_URL" --no-owner --no-privileges --quote-all-identifiers ${schemaFlags} | psql "$DST_URL" -v ON_ERROR_STOP=0 -q`;
    const verify = `psql "$DST_URL" -tAc "select table_schema||'.'||table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema') order by 1" | wc -l`;
    return { cmd, verify, tools: ['pg_dump', 'psql'], image: 'postgres:17-alpine' };
  }
  if (engine === 'mysql' || engine === 'mariadb') {
    const cmd = 'MYSQL_PWD="$SRC_PASS" mysqldump -h "$SRC_HOST" -P "$SRC_PORT" -u "$SRC_USER" --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF "$SRC_DB" 2>/dev/null | MYSQL_PWD="$DST_PASS" mysql -h "$DST_HOST" -P "$DST_PORT" -u "$DST_USER" "$DST_DB"';
    const verify = 'MYSQL_PWD="$DST_PASS" mysql -h "$DST_HOST" -P "$DST_PORT" -u "$DST_USER" -N -e "select count(*) from information_schema.tables where table_schema=\'$DST_DB\'"';
    return { cmd, verify, tools: ['mysqldump', 'mysql'], image: engine === 'mariadb' ? 'mariadb:11' : 'mysql:8.4', preDst: 'MYSQL_PWD="$DST_PASS" mysql -h "$DST_HOST" -P "$DST_PORT" -u "$DST_USER" -e "CREATE DATABASE IF NOT EXISTS \\`$DST_DB\\`"' };
  }
  if (engine === 'mongodb') {
    const cmd = 'mongodump --uri="$SRC_URL" --archive --gzip | mongorestore --uri="$DST_URL" --archive --gzip --drop --nsExclude="admin.*" --nsExclude="config.*" --nsExclude="local.*"';
    return { cmd, verify: null, tools: ['mongodump', 'mongorestore'], image: 'mongo:7' };
  }
  return null;
}

function splitUrl(url) {
  const u = new URL(url);
  return { host: u.hostname, port: u.port, user: decodeURIComponent(u.username), pass: decodeURIComponent(u.password), db: u.pathname.replace(/^\//, '') };
}

export async function migrateDatabase(api, args) {
  const root = path.resolve(args.path || process.cwd());
  const { url: src, engine } = sourceInfo({ root, sourceEnvFile: args.sourceEnvFile || '.env.production', sourceKey: args.sourceKey, sourceEngine: args.sourceEngine });
  if (!engine) throw new Error('Could not tell the source engine from its URL. Pass sourceEngine.');
  if (NOT_COPIED[engine]) return { skipped: true, engine, reason: NOT_COPIED[engine] };
  const srcHost = new URL(src).hostname;
  const isSupabase = /supabase/.test(srcHost);
  const schemas = args.schemas || (isSupabase && engine === 'postgres' ? ['public'] : null);

  let db = await waitForDatabase(api, args.databaseId, 30);
  if (!db) throw new Error(`Liara database "${args.databaseId}" not found`);
  const steps = [];
  let openedPublic = false;
  if (!db.publicNetwork) {
    if (!args.allowTemporaryPublicNetwork) {
      return {
        needsConfirmation: true,
        message: 'The Liara database is private, so this computer cannot reach it. Ask the user to allow turning on its public network for the copy (it is turned off again right after), then call again with allowTemporaryPublicNetwork: true.',
      };
    }
    await api.patch('dbaas', `/v1/databases/${db._id || db.id}/public-network/enable`);
    openedPublic = true;
    steps.push('turned on public network for the copy');
    for (let i = 0; i < 30; i++) {
      await sleep(5000);
      db = await waitForDatabase(api, args.databaseId, 10);
      if (db.publicNetwork && db.node?.host && db.port) break;
    }
  }

  try {
    const dst = dbCreds(db, { publicAccess: true, dbName: args.targetDbName || (engine === 'postgres' ? undefined : splitUrl(src).db || undefined) });
    const p = pipeline(engine, { schemas });
    if (!p) throw new Error(`Copying ${engine} data is not supported yet.`);
    const s = splitUrl(src);
    const env = {
      SRC_URL: src, DST_URL: dst.url,
      SRC_HOST: s.host, SRC_PORT: s.port || '3306', SRC_USER: s.user, SRC_PASS: s.pass, SRC_DB: s.db,
      DST_HOST: dst.host, DST_PORT: String(dst.port), DST_USER: dst.user, DST_PASS: dst.password, DST_DB: dst.name,
    };
    if (engine === 'clickhouse') {
      const a = clickhouseHttp(src);
      const b = clickhouseHttp(dst.url);
      Object.assign(env, { SRC_HTTP: a.base, SRC_AUTH: a.auth, SRC_DB: a.db, DST_HTTP: b.base, DST_AUTH: b.auth, DST_DB: args.targetDbName || a.db });
    }
    let script = [p.preDst, p.cmd].filter(Boolean).join(' && ');
    let verify = p.verify;
    let via = 'local tools';
    if (!p.tools.every(has)) {
      if (!has('docker')) {
        return {
          steps,
          error: `Needs ${p.tools.join(' + ')} or Docker on this computer.`,
          install: {
            postgres: 'brew install libpq && brew link --force libpq',
            mongodb: 'brew install mongodb-database-tools',
            elasticsearch: 'npm install -g elasticdump',
            clickhouse: 'brew install curl',
          }[engine] || 'brew install mysql-client',
        };
      }
      const envFlags = Object.keys(env).map((k) => `-e ${k}`).join(' ');
      // Override the entrypoint: some images (curl, elasticdump) start their tool, not a shell.
      // Debian/Ubuntu images use dash, where a bare `set -o pipefail` exits the shell (code 2),
      // so only turn it on where the shell supports it.
      const wrap = (c) => `docker run --rm -i ${envFlags} --entrypoint sh ${p.image} -c ${sq(`(set -o pipefail) 2>/dev/null && set -o pipefail; ${c}`)}`;
      script = wrap([p.preDst, p.cmd].filter(Boolean).join(' && '));
      verify = p.verify ? wrap(p.verify) : null;
      via = `Docker (${p.image})`;
    }
    const started = Date.now();
    const res = await run(script, env);
    steps.push(`copied ${engine} data from ${providerFromHost(srcHost).provider} via ${via} in ${Math.round((Date.now() - started) / 1000)}s (exit ${res.code})`);
    let tables = null;
    if (verify && res.code === 0) {
      const v = await run(verify, env, { timeoutMs: 60_000 });
      tables = v.stdout.trim();
    }
    return {
      steps,
      success: res.code === 0,
      engine,
      schemas: schemas || 'all',
      tablesInTarget: tables,
      stderrTail: res.stderr,
      notes: [
        isSupabase ? 'Supabase: only the public schema was copied (auth/storage schemas belong to Supabase). Users in auth.users are not moved.' : null,
        engine === 'clickhouse' ? 'ClickHouse: tables and rows were copied; views, materialized views and dictionaries were not. Recreate them with your migrations.' : null,
        engine === 'elasticsearch' ? 'Elasticsearch: every index not starting with "." was copied with its settings, mappings, aliases and documents. Index templates and ILM policies were not.' : null,
        'Errors like "role does not exist" or "extension already exists" are usually harmless.',
      ].filter(Boolean),
    };
  } finally {
    if (openedPublic && !args.keepPublicNetwork) {
      await api.patch('dbaas', `/v1/databases/${db._id || db.id}/public-network/disable`).catch(() => {});
      steps.push('turned public network off again');
    }
  }
}

function s3Provider(endpoint) {
  if (!endpoint) return 'AWS';
  const h = new URL(endpoint.startsWith('http') ? endpoint : `https://${endpoint}`).hostname;
  if (/r2\.cloudflarestorage\.com$/.test(h)) return 'Cloudflare';
  if (/amazonaws\.com$/.test(h)) return 'AWS';
  if (/digitaloceanspaces\.com$/.test(h)) return 'DigitalOcean';
  if (/wasabisys\.com$/.test(h)) return 'Wasabi';
  if (/arvanstorage/.test(h)) return 'ArvanCloud';
  if (/liara\.space$/.test(h)) return 'Liara';
  return 'Other';
}

export async function migrateStorage(api, args) {
  const root = path.resolve(args.path || process.cwd());
  const srcVars = parseEnvFile(path.resolve(root, args.sourceEnvFile || '.env.production'));
  const src = credsFromEnv('storage', srcVars);
  if (!src.accessKey || !src.secretKey) throw new Error('Source access key/secret not found in the env file.');
  const srcBucket = args.sourceBucket || src.bucket;
  if (!srcBucket) throw new Error('Pass sourceBucket.');
  const dstVars = await getEnvs(api, args.app, { reveal: true });
  const dst = credsFromEnv('storage', dstVars);
  if (!dst.accessKey || !dst.endpoint) throw new Error(`Liara storage env vars not found on app ${args.app}. Run connect_storage first.`);
  const dstBucket = args.targetBucket || dst.bucket;

  const env = {
    RCLONE_CONFIG_SRC_TYPE: 's3', RCLONE_CONFIG_SRC_PROVIDER: s3Provider(src.endpoint), RCLONE_CONFIG_SRC_ACCESS_KEY_ID: src.accessKey,
    RCLONE_CONFIG_SRC_SECRET_ACCESS_KEY: src.secretKey, RCLONE_CONFIG_SRC_REGION: src.region || 'us-east-1',
    RCLONE_CONFIG_DST_TYPE: 's3', RCLONE_CONFIG_DST_PROVIDER: 'Other', RCLONE_CONFIG_DST_ACCESS_KEY_ID: dst.accessKey,
    RCLONE_CONFIG_DST_SECRET_ACCESS_KEY: dst.secretKey, RCLONE_CONFIG_DST_ENDPOINT: dst.endpoint, RCLONE_CONFIG_DST_FORCE_PATH_STYLE: 'true',
    RCLONE_CONFIG_DST_REGION: 'us-east-1', RCLONE_CONFIG_DST_NO_CHECK_BUCKET: 'true',
  };
  if (src.endpoint) env.RCLONE_CONFIG_SRC_ENDPOINT = src.endpoint.startsWith('http') ? src.endpoint : `https://${src.endpoint}`;
  const cmd = `rclone copy "src:${srcBucket}" "dst:${dstBucket}" --transfers 16 --checkers 16 --stats-one-line --stats 60s && echo SRC && rclone size "src:${srcBucket}" && echo DST && rclone size "dst:${dstBucket}"`;
  let script = cmd; let via = 'rclone';
  if (!has('rclone')) {
    if (!has('docker')) return { error: 'Needs rclone or Docker.', install: 'brew install rclone' };
    script = `docker run --rm ${Object.keys(env).map((k) => `-e ${k}`).join(' ')} --entrypoint sh rclone/rclone:latest -c ${sq(cmd)}`;
    via = 'Docker (rclone/rclone)';
  }
  const started = Date.now();
  const res = await run(script, env, { timeoutMs: 6 * 60 * 60_000 });
  return {
    success: res.code === 0,
    from: `${s3Provider(src.endpoint)}:${srcBucket}`,
    to: `Liara:${dstBucket}`,
    via,
    seconds: Math.round((Date.now() - started) / 1000),
    sizes: res.stdout,
    stderrTail: res.stderr,
    notes: ['Files are copied, not moved. Stored file URLs in the database that point at the old provider must be rewritten to the Liara bucket URL.'],
  };
}
