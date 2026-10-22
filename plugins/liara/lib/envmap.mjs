// Maps Liara credentials onto the env var names an app already uses.
// e.g. a Laravel app reading DB_HOST/DB_PORT/... gets those keys; a Prisma app gets DATABASE_URL.

const ROLE_RULES = {
  database: [
    [/^(DB_CONNECTION|DB_ENGINE|DATABASE_ENGINE)$/, 'driver'],
    [/(URL|URI|DSN|CONNECTION_STRING|CONNECTION_URL)$/, 'url'],
    [/(HOST|HOSTNAME|SERVER)$/, 'host'],
    [/PORT$/, 'port'],
    [/(USER|USERNAME|UID)$/, 'user'],
    [/(PASSWORD|PASS|PWD)$/, 'password'],
    [/(DATABASE|DB_NAME|DBNAME|_NAME|_DB|DB)$/, 'name'],
  ],
  storage: [
    [/^(FILESYSTEM_DISK|FILESYSTEM_DRIVER|DEFAULT_FILE_STORAGE|STORAGE_DRIVER)$/, 'disk'],
    [/(SECRET_ACCESS_KEY|SECRET_KEY|SECRET|SECRETKEY)$/, 'secretKey'],
    [/(ACCESS_KEY|ACCESS_KEY_ID|KEY_ID|ACCESSKEY)$/, 'accessKey'],
    [/(BUCKET|BUCKET_NAME|STORAGE_BUCKET_NAME)$/, 'bucket'],
    [/PATH_STYLE(_ENDPOINT)?$|FORCE_PATH_STYLE$/, 'pathStyle'],
    [/(ENDPOINT|ENDPOINT_URL|S3_ENDPOINT_URL)$/, 'endpoint'],
    [/REGION(_NAME)?$/, 'region'],
    [/^(AWS_URL|S3_PUBLIC_URL|STORAGE_URL|CDN_URL|S3_URL|PUBLIC_BUCKET_URL|AWS_S3_CUSTOM_DOMAIN)$/, 'publicUrl'],
  ],
  email: [
    [/^(MAIL_MAILER|MAIL_DRIVER|EMAIL_BACKEND)$/, 'mailer'],
    [/(HOST|SERVER)$/, 'host'],
    [/PORT$/, 'port'],
    [/(USER|USERNAME|HOST_USER|LOGIN)$/, 'user'],
    [/(PASSWORD|PASS|HOST_PASSWORD)$/, 'password'],
    [/(FROM|FROM_ADDRESS|FROM_EMAIL|DEFAULT_FROM_EMAIL|SENDER)$/, 'from'],
    [/(ENCRYPTION|SCHEME)$/, 'encryption'],
    [/(SECURE|USE_SSL)$/, 'secure'],
    [/USE_TLS$/, 'tls'],
  ],
  ai: [
    [/(BASE_URL|API_BASE|BASE_PATH|ENDPOINT|API_URL|API_HOST|BASEURL)$/, 'baseUrl'],
    [/(API_KEY|_KEY|_TOKEN|APIKEY)$/, 'apiKey'],
  ],
};

export function roleOf(kind, key) {
  for (const [re, role] of ROLE_RULES[kind] || []) if (re.test(key)) return role;
  return null;
}

export const SECRET_ROLES = new Set(['password', 'secretKey', 'apiKey', 'url', 'accessKey']);

// Keys to use when the project has none for this service yet.
export function defaultKeys(kind, { platform, engine } = {}) {
  if (kind === 'database') {
    if (platform === 'laravel') {
      if (engine === 'redis') return ['REDIS_HOST', 'REDIS_PORT', 'REDIS_USERNAME', 'REDIS_PASSWORD'];
      return ['DB_CONNECTION', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'];
    }
    if (engine === 'redis') return ['REDIS_URL'];
    if (engine === 'mongodb') return ['MONGODB_URI'];
    if (engine === 'rabbitmq') return ['AMQP_URL'];
    if (engine === 'elasticsearch') return ['ELASTICSEARCH_URL'];
    // Same names as Liara's ClickHouse docs (CLICKHOUSE_HOST holds http://host:port).
    if (engine === 'clickhouse') return ['CLICKHOUSE_HOST', 'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD'];
    return ['DATABASE_URL'];
  }
  if (kind === 'storage') {
    if (platform === 'laravel') return ['FILESYSTEM_DISK', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_DEFAULT_REGION', 'AWS_BUCKET', 'AWS_ENDPOINT', 'AWS_USE_PATH_STYLE_ENDPOINT', 'AWS_URL'];
    if (platform === 'django') return ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_STORAGE_BUCKET_NAME', 'AWS_S3_ENDPOINT_URL', 'AWS_S3_REGION_NAME'];
    return ['LIARA_ENDPOINT', 'LIARA_BUCKET_NAME', 'LIARA_ACCESS_KEY', 'LIARA_SECRET_KEY'];
  }
  if (kind === 'email') {
    if (platform === 'laravel') return ['MAIL_MAILER', 'MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_ENCRYPTION', 'MAIL_FROM_ADDRESS'];
    if (platform === 'django') return ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_HOST_USER', 'EMAIL_HOST_PASSWORD', 'EMAIL_USE_TLS', 'DEFAULT_FROM_EMAIL'];
    return ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
  }
  if (kind === 'ai') return ['OPENAI_API_KEY', 'OPENAI_BASE_URL'];
  return [];
}

const LARAVEL_DRIVER = { postgres: 'pgsql', mysql: 'mysql', mariadb: 'mariadb', mongodb: 'mongodb', mssql: 'sqlsrv' };

// creds: role → value. Returns { KEY: value } for every key we could fill.
export function fillKeys(kind, keys, creds, { platform } = {}) {
  const out = {};
  const unmapped = [];
  // ClickHouse clients over HTTP (@clickhouse/client) take a full URL in *_HOST unless
  // the app also has a separate port key (clickhouse-connect style).
  const hostIsUrl = kind === 'database' && creds.engine === 'clickhouse' && !keys.some((k) => roleOf(kind, k) === 'port');
  for (const key of keys) {
    const role = roleOf(kind, key);
    let value;
    switch (role) {
      case 'host': value = hostIsUrl ? `http://${creds.host}:${creds.port}` : creds.host; break;
      case 'driver': value = platform === 'laravel' || /^DB_CONNECTION$/.test(key) ? LARAVEL_DRIVER[creds.engine] : creds.engine; break;
      case 'disk': value = /DEFAULT_FILE_STORAGE/.test(key) ? 'storages.backends.s3boto3.S3Boto3Storage' : 's3'; break;
      case 'pathStyle': value = 'true'; break;
      case 'mailer': value = /EMAIL_BACKEND/.test(key) ? 'django.core.mail.backends.smtp.EmailBackend' : 'smtp'; break;
      case 'secure': value = String(Number(creds.port) === 465); break;
      case 'tls': value = String(Number(creds.port) !== 465); break;
      case 'encryption': value = Number(creds.port) === 465 ? 'ssl' : 'tls'; break;
      default: value = role ? creds[role] : undefined;
    }
    if (value === undefined || value === null || value === '') unmapped.push(key);
    else out[key] = String(value);
  }
  return { vars: out, unmapped };
}

export function databaseUrl(engine, { host, port, user, password, name }) {
  const u = encodeURIComponent(user || '');
  const p = encodeURIComponent(password || '');
  const auth = user ? `${u}:${p}@` : password ? `:${p}@` : '';
  switch (engine) {
    case 'postgres': return `postgresql://${auth}${host}:${port}/${name || 'postgres'}`;
    case 'mysql':
    case 'mariadb': return `mysql://${auth}${host}:${port}/${name || ''}`;
    case 'mongodb': return `mongodb://${auth}${host}:${port}/${name || ''}?authSource=admin`;
    case 'redis': return `redis://${auth}${host}:${port}/0`;
    case 'rabbitmq': return `amqp://${auth}${host}:${port}`;
    case 'elasticsearch': return `http://${auth}${host}:${port}`;
    case 'clickhouse': return `http://${auth}${host}:${port}/${name || 'default'}`;
    case 'mssql': return `sqlserver://${host}:${port};database=${name || 'master'};user=${user};password=${password};encrypt=true;trustServerCertificate=true`;
    default: return null;
  }
}

// Reads credentials back out of a set of env vars (used for data migration).
export function credsFromEnv(kind, vars) {
  const creds = {};
  for (const [k, v] of Object.entries(vars)) {
    const role = roleOf(kind, k);
    if (role && v && creds[role] === undefined) creds[role] = v;
  }
  return creds;
}
