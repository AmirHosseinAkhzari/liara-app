// Copies data from the current provider into Liara.
// Runs dump/restore tools locally (or in Docker when they are not installed).
// Credentials are passed to child processes as env vars and never returned.
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { parseEnvFile } from './envfiles.mjs';
import { credsFromEnv } from './envmap.mjs';
import { engineFromUrl, providerFromHost } from './providers.mjs';
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

function sourceUrl({ root, sourceEnvFile, sourceKey }) {
  const vars = parseEnvFile(path.resolve(root, sourceEnvFile));
  if (sourceKey) {
    if (!vars[sourceKey]) throw new Error(`${sourceKey} is not set in ${sourceEnvFile}`);
    return vars[sourceKey];
  }
  // Prefer a direct (non-pooled) URL when one exists, e.g. Supabase/Prisma DIRECT_URL.
  const keys = ['DIRECT_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL', 'MONGODB_URI', 'MONGO_URL', 'MONGO_URI', 'MYSQL_URL', 'POSTGRES_URL'];
  for (const k of keys) if (vars[k] && engineFromUrl(vars[k])) return vars[k];
  const c = credsFromEnv('database', vars);
  if (c.host) {
    const engine = /pgsql|postgres/i.test(vars.DB_CONNECTION || '') ? 'postgresql' : /mongo/i.test(vars.DB_CONNECTION || '') ? 'mongodb' : 'mysql';
    return `${engine}://${encodeURIComponent(c.user || '')}:${encodeURIComponent(c.password || '')}@${c.host}:${c.port || (engine === 'postgresql' ? 5432 : 3306)}/${c.name || ''}`;
  }
  throw new Error(`No database URL found in ${sourceEnvFile}. Pass sourceKey.`);
}

function pipeline(engine, { schemas }) {
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
  const src = sourceUrl({ root, sourceEnvFile: args.sourceEnvFile || '.env.production', sourceKey: args.sourceKey });
  const engine = engineFromUrl(src);
  if (!engine) throw new Error('Could not tell the source engine from its URL.');
  if (engine === 'redis') return { skipped: true, reason: 'Redis is usually a cache/queue; data is not copied. Ask the user if they really need it (then use redis-cli --rdb / RIOT).' };
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
    let script = [p.preDst, p.cmd].filter(Boolean).join(' && ');
    let verify = p.verify;
    let via = 'local tools';
    if (!p.tools.every(has)) {
      if (!has('docker')) {
        return {
          steps,
          error: `Needs ${p.tools.join(' + ')} or Docker on this computer.`,
          install: engine === 'postgres' ? 'brew install libpq && brew link --force libpq' : engine === 'mongodb' ? 'brew install mongodb-database-tools' : 'brew install mysql-client',
        };
      }
      const envFlags = Object.keys(env).map((k) => `-e ${k}`).join(' ');
      const wrap = (c) => `docker run --rm -i ${envFlags} ${p.image} sh -c ${sq(`set -o pipefail 2>/dev/null; ${c}`)}`;
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
