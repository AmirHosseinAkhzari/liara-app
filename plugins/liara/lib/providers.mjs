// Knowledge base: which packages, env keys and hosts belong to which service and provider.

// What Liara offers for each kind of service.
export const LIARA_EQUIVALENT = {
  database: 'Liara DBaaS (managed database)',
  storage: 'Liara Object Storage (S3-compatible)',
  email: 'Liara Mail server (SMTP + API)',
  dns: 'Liara DNS + app domains with free SSL',
  ai: 'Liara AI (OpenAI-compatible API)',
  disk: 'Liara app disk (persistent volume)',
};

// Engines Liara DBaaS runs. Key = our engine name, value = Liara `type`.
export const LIARA_DB_TYPES = {
  postgres: 'postgres',
  mysql: 'mysql',
  mariadb: 'mariadb',
  mongodb: 'mongodb',
  redis: 'redis',
  mssql: 'mssql',
  elasticsearch: 'elasticsearch',
  rabbitmq: 'rabbitmq',
  clickhouse: 'clickhouse',
};

// Package name → what it tells us. `engine` is for databases, `sdk` for AI/email.
// Keys are matched exactly; entries ending in "*" match a prefix.
export const PACKAGE_RULES = {
  // ---------- databases (JS) ----------
  pg: { kind: 'database', engine: 'postgres' },
  postgres: { kind: 'database', engine: 'postgres' },
  'pg-promise': { kind: 'database', engine: 'postgres' },
  '@neondatabase/serverless': { kind: 'database', engine: 'postgres', provider: 'Neon' },
  '@vercel/postgres': { kind: 'database', engine: 'postgres', provider: 'Vercel Postgres (Neon)' },
  '@supabase/supabase-js': { kind: 'database', engine: 'postgres', provider: 'Supabase', needsCodeChange: true, note: 'supabase-js talks to Supabase REST/Auth, not Postgres directly' },
  mysql: { kind: 'database', engine: 'mysql' },
  mysql2: { kind: 'database', engine: 'mysql' },
  mariadb: { kind: 'database', engine: 'mariadb' },
  '@planetscale/database': { kind: 'database', engine: 'mysql', provider: 'PlanetScale' },
  mongoose: { kind: 'database', engine: 'mongodb' },
  mongodb: { kind: 'database', engine: 'mongodb' },
  redis: { kind: 'database', engine: 'redis' },
  ioredis: { kind: 'database', engine: 'redis' },
  '@upstash/redis': { kind: 'database', engine: 'redis', provider: 'Upstash' },
  '@vercel/kv': { kind: 'database', engine: 'redis', provider: 'Vercel KV (Upstash)' },
  bullmq: { kind: 'database', engine: 'redis' },
  bull: { kind: 'database', engine: 'redis' },
  mssql: { kind: 'database', engine: 'mssql' },
  tedious: { kind: 'database', engine: 'mssql' },
  '@elastic/elasticsearch': { kind: 'database', engine: 'elasticsearch' },
  amqplib: { kind: 'database', engine: 'rabbitmq' },
  'amqp-connection-manager': { kind: 'database', engine: 'rabbitmq' },
  '@clickhouse/client': { kind: 'database', engine: 'clickhouse' },
  '@clickhouse/client-web': { kind: 'database', engine: 'clickhouse' },
  clickhouse: { kind: 'database', engine: 'clickhouse' },
  'better-sqlite3': { kind: 'database', engine: 'sqlite' },
  sqlite3: { kind: 'database', engine: 'sqlite' },
  '@libsql/client': { kind: 'database', engine: 'sqlite', provider: 'Turso' },
  firebase: { kind: 'external', provider: 'Firebase', note: 'Firestore/Auth have no direct Liara equivalent' },
  'firebase-admin': { kind: 'external', provider: 'Firebase', note: 'Firestore/Auth have no direct Liara equivalent' },
  // ORMs: engine comes from their config (schema.prisma, drizzle config, URL)
  '@prisma/client': { kind: 'database', orm: 'prisma' },
  prisma: { kind: 'database', orm: 'prisma' },
  'drizzle-orm': { kind: 'database', orm: 'drizzle' },
  typeorm: { kind: 'database', orm: 'typeorm' },
  sequelize: { kind: 'database', orm: 'sequelize' },
  knex: { kind: 'database', orm: 'knex' },
  '@mikro-orm/core': { kind: 'database', orm: 'mikro-orm' },

  // ---------- object storage (JS) ----------
  '@aws-sdk/client-s3': { kind: 'storage' },
  '@aws-sdk/lib-storage': { kind: 'storage' },
  '@aws-sdk/s3-request-presigner': { kind: 'storage' },
  'aws-sdk': { kind: 'storage', maybe: true },
  minio: { kind: 'storage' },
  'multer-s3': { kind: 'storage' },
  cloudinary: { kind: 'storage', provider: 'Cloudinary', needsCodeChange: true },
  '@vercel/blob': { kind: 'storage', provider: 'Vercel Blob', needsCodeChange: true },
  '@google-cloud/storage': { kind: 'storage', provider: 'Google Cloud Storage', needsCodeChange: true },
  '@azure/storage-blob': { kind: 'storage', provider: 'Azure Blob Storage', needsCodeChange: true },
  uploadthing: { kind: 'storage', provider: 'UploadThing', needsCodeChange: true },
  multer: { kind: 'disk', note: 'multer saves uploads to local disk unless configured with S3' },

  // ---------- email (JS) ----------
  nodemailer: { kind: 'email', sdk: 'smtp' },
  '@sendgrid/mail': { kind: 'email', provider: 'SendGrid', sdk: 'api', needsCodeChange: true },
  resend: { kind: 'email', provider: 'Resend', sdk: 'api', needsCodeChange: true },
  'mailgun.js': { kind: 'email', provider: 'Mailgun', sdk: 'api', needsCodeChange: true },
  'mailgun-js': { kind: 'email', provider: 'Mailgun', sdk: 'api', needsCodeChange: true },
  postmark: { kind: 'email', provider: 'Postmark', sdk: 'api', needsCodeChange: true },
  '@aws-sdk/client-ses': { kind: 'email', provider: 'AWS SES', sdk: 'api', needsCodeChange: true },
  '@aws-sdk/client-sesv2': { kind: 'email', provider: 'AWS SES', sdk: 'api', needsCodeChange: true },
  mailersend: { kind: 'email', provider: 'MailerSend', sdk: 'api', needsCodeChange: true },
  '@getbrevo/brevo': { kind: 'email', provider: 'Brevo', sdk: 'api', needsCodeChange: true },
  'sib-api-v3-sdk': { kind: 'email', provider: 'Brevo', sdk: 'api', needsCodeChange: true },
  'node-mailjet': { kind: 'email', provider: 'Mailjet', sdk: 'api', needsCodeChange: true },
  '@react-email/components': { kind: 'email', sdk: 'template' },

  // ---------- AI (JS) ----------
  openai: { kind: 'ai', sdk: 'openai' },
  '@anthropic-ai/sdk': { kind: 'ai', sdk: 'anthropic', provider: 'Anthropic' },
  '@google/generative-ai': { kind: 'ai', sdk: 'gemini', provider: 'Google Gemini' },
  '@google/genai': { kind: 'ai', sdk: 'gemini', provider: 'Google Gemini' },
  ai: { kind: 'ai', sdk: 'vercel-ai' },
  '@ai-sdk/openai': { kind: 'ai', sdk: 'vercel-ai-openai' },
  '@ai-sdk/openai-compatible': { kind: 'ai', sdk: 'vercel-ai-openai' },
  '@ai-sdk/anthropic': { kind: 'ai', sdk: 'vercel-ai', provider: 'Anthropic' },
  '@ai-sdk/google': { kind: 'ai', sdk: 'vercel-ai', provider: 'Google Gemini' },
  langchain: { kind: 'ai', sdk: 'langchain' },
  '@langchain/openai': { kind: 'ai', sdk: 'langchain-openai' },
  '@langchain/anthropic': { kind: 'ai', sdk: 'langchain', provider: 'Anthropic' },
  'groq-sdk': { kind: 'ai', sdk: 'groq', provider: 'Groq' },
  '@mistralai/mistralai': { kind: 'ai', sdk: 'mistral', provider: 'Mistral' },
  'cohere-ai': { kind: 'ai', sdk: 'cohere', provider: 'Cohere' },
  replicate: { kind: 'ai', sdk: 'replicate', provider: 'Replicate' },
  ollama: { kind: 'ai', sdk: 'ollama', provider: 'Ollama (self-hosted)' },
  '@openrouter/ai-sdk-provider': { kind: 'ai', sdk: 'vercel-ai', provider: 'OpenRouter' },

  // ---------- DNS ----------
  cloudflare: { kind: 'dns', provider: 'Cloudflare' },

  // ---------- Python ----------
  'py:psycopg2': { kind: 'database', engine: 'postgres' },
  'py:psycopg2-binary': { kind: 'database', engine: 'postgres' },
  'py:psycopg': { kind: 'database', engine: 'postgres' },
  'py:asyncpg': { kind: 'database', engine: 'postgres' },
  'py:pymysql': { kind: 'database', engine: 'mysql' },
  'py:mysqlclient': { kind: 'database', engine: 'mysql' },
  'py:aiomysql': { kind: 'database', engine: 'mysql' },
  'py:pymongo': { kind: 'database', engine: 'mongodb' },
  'py:motor': { kind: 'database', engine: 'mongodb' },
  'py:mongoengine': { kind: 'database', engine: 'mongodb' },
  'py:beanie': { kind: 'database', engine: 'mongodb' },
  'py:redis': { kind: 'database', engine: 'redis' },
  'py:django-redis': { kind: 'database', engine: 'redis' },
  'py:celery': { kind: 'database', engine: 'redis', maybe: true },
  'py:sqlalchemy': { kind: 'database', orm: 'sqlalchemy' },
  'py:clickhouse-connect': { kind: 'database', engine: 'clickhouse' },
  'py:clickhouse-driver': { kind: 'database', engine: 'clickhouse' },
  'py:elasticsearch': { kind: 'database', engine: 'elasticsearch' },
  'py:elasticsearch-dsl': { kind: 'database', engine: 'elasticsearch' },
  'py:pika': { kind: 'database', engine: 'rabbitmq' },
  'py:aio-pika': { kind: 'database', engine: 'rabbitmq' },
  'py:pymssql': { kind: 'database', engine: 'mssql' },
  'py:mssql-django': { kind: 'database', engine: 'mssql' },
  'py:supabase': { kind: 'database', engine: 'postgres', provider: 'Supabase' },
  'py:boto3': { kind: 'storage', maybe: true },
  'py:django-storages': { kind: 'storage' },
  'py:minio': { kind: 'storage' },
  'py:cloudinary': { kind: 'storage', provider: 'Cloudinary', needsCodeChange: true },
  'py:sendgrid': { kind: 'email', provider: 'SendGrid', sdk: 'api', needsCodeChange: true },
  'py:resend': { kind: 'email', provider: 'Resend', sdk: 'api', needsCodeChange: true },
  'py:flask-mail': { kind: 'email', sdk: 'smtp' },
  'py:flask-mailman': { kind: 'email', sdk: 'smtp' },
  'py:django-anymail': { kind: 'email', sdk: 'api' },
  'py:fastapi-mail': { kind: 'email', sdk: 'smtp' },
  'py:openai': { kind: 'ai', sdk: 'openai' },
  'py:anthropic': { kind: 'ai', sdk: 'anthropic', provider: 'Anthropic' },
  'py:google-generativeai': { kind: 'ai', sdk: 'gemini', provider: 'Google Gemini' },
  'py:google-genai': { kind: 'ai', sdk: 'gemini', provider: 'Google Gemini' },
  'py:langchain': { kind: 'ai', sdk: 'langchain' },
  'py:langchain-openai': { kind: 'ai', sdk: 'langchain-openai' },
  'py:llama-index': { kind: 'ai', sdk: 'llama-index' },
  'py:litellm': { kind: 'ai', sdk: 'litellm' },
  'py:groq': { kind: 'ai', sdk: 'groq', provider: 'Groq' },

  // ---------- PHP (composer) ----------
  'php:league/flysystem-aws-s3-v3': { kind: 'storage' },
  'php:aws/aws-sdk-php': { kind: 'storage', maybe: true },
  'php:predis/predis': { kind: 'database', engine: 'redis' },
  'php:mongodb/laravel-mongodb': { kind: 'database', engine: 'mongodb' },
  'php:jenssegers/mongodb': { kind: 'database', engine: 'mongodb' },
  'php:smi2/phpclickhouse': { kind: 'database', engine: 'clickhouse' },
  'php:elasticsearch/elasticsearch': { kind: 'database', engine: 'elasticsearch' },
  'php:php-amqplib/php-amqplib': { kind: 'database', engine: 'rabbitmq' },
  'php:vladimir-yuldashev/laravel-queue-rabbitmq': { kind: 'database', engine: 'rabbitmq' },
  'php:openai-php/client': { kind: 'ai', sdk: 'openai' },
  'php:openai-php/laravel': { kind: 'ai', sdk: 'openai' },
  'php:symfony/mailgun-mailer': { kind: 'email', provider: 'Mailgun', sdk: 'api' },
  'php:resend/resend-laravel': { kind: 'email', provider: 'Resend', sdk: 'api', needsCodeChange: true },

  // ---------- Go ----------
  'go:github.com/lib/pq': { kind: 'database', engine: 'postgres' },
  'go:github.com/jackc/pgx': { kind: 'database', engine: 'postgres' },
  'go:github.com/jackc/pgx/v5': { kind: 'database', engine: 'postgres' },
  'go:github.com/go-sql-driver/mysql': { kind: 'database', engine: 'mysql' },
  'go:go.mongodb.org/mongo-driver': { kind: 'database', engine: 'mongodb' },
  'go:github.com/redis/go-redis/v9': { kind: 'database', engine: 'redis' },
  'go:github.com/go-redis/redis/v8': { kind: 'database', engine: 'redis' },
  'go:gorm.io/driver/postgres': { kind: 'database', engine: 'postgres' },
  'go:gorm.io/driver/mysql': { kind: 'database', engine: 'mysql' },
  'go:gorm.io/driver/sqlite': { kind: 'database', engine: 'sqlite' },
  'go:gorm.io/driver/sqlserver': { kind: 'database', engine: 'mssql' },
  'go:gorm.io/driver/clickhouse': { kind: 'database', engine: 'clickhouse' },
  'go:github.com/ClickHouse/clickhouse-go/v2': { kind: 'database', engine: 'clickhouse' },
  'go:github.com/elastic/go-elasticsearch/v8': { kind: 'database', engine: 'elasticsearch' },
  'go:github.com/rabbitmq/amqp091-go': { kind: 'database', engine: 'rabbitmq' },
  'go:github.com/microsoft/go-mssqldb': { kind: 'database', engine: 'mssql' },
  'go:github.com/denisenkom/go-mssqldb': { kind: 'database', engine: 'mssql' },
  'go:github.com/aws/aws-sdk-go-v2/service/s3': { kind: 'storage' },
  'go:github.com/minio/minio-go/v7': { kind: 'storage' },
  'go:github.com/sashabaranov/go-openai': { kind: 'ai', sdk: 'openai' },
  'go:github.com/openai/openai-go': { kind: 'ai', sdk: 'openai' },

  // ---------- .NET (NuGet) ----------
  'nuget:Npgsql': { kind: 'database', engine: 'postgres' },
  'nuget:Npgsql.EntityFrameworkCore.PostgreSQL': { kind: 'database', engine: 'postgres' },
  'nuget:Pomelo.EntityFrameworkCore.MySql': { kind: 'database', engine: 'mysql' },
  'nuget:MySql.Data': { kind: 'database', engine: 'mysql' },
  'nuget:MongoDB.Driver': { kind: 'database', engine: 'mongodb' },
  'nuget:StackExchange.Redis': { kind: 'database', engine: 'redis' },
  'nuget:Microsoft.EntityFrameworkCore.SqlServer': { kind: 'database', engine: 'mssql' },
  'nuget:Microsoft.EntityFrameworkCore.Sqlite': { kind: 'database', engine: 'sqlite' },
  'nuget:Microsoft.Data.SqlClient': { kind: 'database', engine: 'mssql' },
  'nuget:ClickHouse.Client': { kind: 'database', engine: 'clickhouse' },
  'nuget:Elastic.Clients.Elasticsearch': { kind: 'database', engine: 'elasticsearch' },
  'nuget:NEST': { kind: 'database', engine: 'elasticsearch' },
  'nuget:RabbitMQ.Client': { kind: 'database', engine: 'rabbitmq' },
  'nuget:AWSSDK.S3': { kind: 'storage' },
  'nuget:Minio': { kind: 'storage' },
  'nuget:MailKit': { kind: 'email', sdk: 'smtp' },
  'nuget:OpenAI': { kind: 'ai', sdk: 'openai' },
};

// Other paid APIs commonly found in apps. No Liara equivalent: values are copied to Liara env vars.
export const OTHER_API_PACKAGES = {
  stripe: 'Stripe',
  '@stripe/stripe-js': 'Stripe',
  twilio: 'Twilio',
  'kavenegar': 'Kavenegar (SMS)',
  'zarinpal-checkout': 'Zarinpal (payment)',
  '@sentry/node': 'Sentry',
  '@sentry/nextjs': 'Sentry',
  '@clerk/nextjs': 'Clerk (auth)',
  'next-auth': 'NextAuth',
  '@auth/core': 'Auth.js',
  'posthog-js': 'PostHog',
  pusher: 'Pusher',
  algoliasearch: 'Algolia',
  'py:stripe': 'Stripe',
  'py:sentry-sdk': 'Sentry',
  'py:twilio': 'Twilio',
  'php:kavenegar/php': 'Kavenegar (SMS)',
  'php:shetabit/payment': 'Shetabit payment (Iranian gateways)',
  'php:sentry/sentry-laravel': 'Sentry',
};

// Env key → service kind. Order matters: first match wins.
export const ENV_KEY_RULES = [
  { re: /^(LIARA_AI_|OPENAI_|AZURE_OPENAI|ANTHROPIC_|CLAUDE_|GEMINI_|GOOGLE_(GENERATIVE_AI|AI|GENAI)_|GROQ_|MISTRAL_|COHERE_|OPENROUTER_|TOGETHER_|REPLICATE_|DEEPSEEK_|XAI_|PERPLEXITY_|HUGGINGFACE|HF_(TOKEN|API)|OLLAMA_|LLM_|AI_(API|BASE|MODEL|KEY))/, kind: 'ai' },
  { re: /^(SMTP_|MAIL_|EMAIL_|SENDGRID|RESEND_|MAILGUN_|POSTMARK|SES_|MAILERSEND|BREVO|SENDINBLUE|MAILJET|NODEMAILER)/, kind: 'email' },
  { re: /^(LIARA_(ENDPOINT|BUCKET|ACCESS_KEY|SECRET_KEY)|AWS_(S3|BUCKET|ENDPOINT|USE_PATH_STYLE|URL$)|S3_|BUCKET|MINIO_|R2_|CLOUDINARY|BLOB_READ_WRITE_TOKEN|SPACES_|ARVAN_|STORAGE_(BUCKET|ENDPOINT|ACCESS|SECRET|KEY|REGION|URL)|OBJECT_STORAGE|FILESYSTEM_DISK$|DEFAULT_FILE_STORAGE$|UPLOADTHING_)/, kind: 'storage' },
  { re: /^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_DEFAULT_REGION|AWS_REGION)$/, kind: 'storage', weak: true },
  { re: /^(DATABASE_URL|DIRECT_URL|SHADOW_DATABASE_URL|DB_|DATABASE_|POSTGRES|PG(HOST|PORT|USER|PASSWORD|DATABASE)$|MYSQL|MARIADB|MONGO|REDIS|KV_|UPSTASH_REDIS|CACHE_URL|CELERY_BROKER|BROKER_URL|AMQP_|RABBITMQ|ELASTIC|CLICKHOUSE_|SQL_|MSSQL|TURSO_|SUPABASE_)/, kind: 'database' },
];

// Keys whose value is the public URL of the app → custom domain candidates.
export const DOMAIN_KEY_RE = /^(APP_URL|SITE_URL|BASE_URL|PUBLIC_URL|WEBSITE_URL|FRONTEND_URL|CLIENT_URL|SERVER_URL|API_URL|NEXT_PUBLIC_(SITE|APP|BASE|WEB)_URL|NEXTAUTH_URL|AUTH_URL|VITE_(APP|SITE|BASE|API)_URL|NUXT_PUBLIC_SITE_URL|PUBLIC_SITE_URL|DOMAIN|APP_DOMAIN|SITE_DOMAIN|ALLOWED_HOSTS|DJANGO_ALLOWED_HOSTS|CSRF_TRUSTED_ORIGINS|CORS_ORIGINS?|SESSION_DOMAIN|SANCTUM_STATEFUL_DOMAINS)$/;

// Host suffix → provider, per kind. "local" means a dev machine / docker-compose.
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|host\.docker\.internal|db|database|postgres|postgresql|mysql|mariadb|mongo|mongodb|redis|cache|minio|mailhog|mailpit|smtp|rabbitmq|elasticsearch|clickhouse)$/i;

const HOST_PROVIDERS = [
  // Liara itself
  { re: /(^|\.)liara\.(ir|run|space|email|cloud)$/i, provider: 'Liara', liara: true },
  // databases
  { re: /supabase\.(co|com|net)$/i, provider: 'Supabase' },
  { re: /neon\.tech$/i, provider: 'Neon' },
  { re: /(psdb\.cloud|planetscale\.com)$/i, provider: 'PlanetScale' },
  { re: /(railway\.app|rlwy\.net)$/i, provider: 'Railway' },
  { re: /render\.com$/i, provider: 'Render' },
  { re: /rds\.amazonaws\.com$/i, provider: 'AWS RDS' },
  { re: /mongodb\.net$/i, provider: 'MongoDB Atlas' },
  { re: /upstash\.io$/i, provider: 'Upstash' },
  { re: /(redislabs\.com|redis-cloud\.com|redns\.redis-cloud\.com)$/i, provider: 'Redis Cloud' },
  { re: /aivencloud\.com$/i, provider: 'Aiven' },
  { re: /cockroachlabs\.cloud$/i, provider: 'CockroachDB Cloud' },
  { re: /ondigitalocean\.com$/i, provider: 'DigitalOcean' },
  { re: /database\.azure\.com$/i, provider: 'Azure Database' },
  { re: /(elephantsql\.com)$/i, provider: 'ElephantSQL' },
  { re: /turso\.io$/i, provider: 'Turso' },
  { re: /clickhouse\.cloud$/i, provider: 'ClickHouse Cloud' },
  { re: /(elastic-cloud\.com|cloud\.es\.io|found\.io)$/i, provider: 'Elastic Cloud' },
  { re: /bonsai(search)?\.(io|net)$/i, provider: 'Bonsai Elasticsearch' },
  { re: /cloudamqp\.com$/i, provider: 'CloudAMQP' },
  { re: /(arvancloud\.ir|arvancloud\.com|arvanstorage\.ir|arvanstorage\.com)$/i, provider: 'ArvanCloud' },
  { re: /(hamravesh\.com|darkube\.app)$/i, provider: 'Hamravesh' },
  { re: /(chabokan\.net)$/i, provider: 'Chabokan' },
  { re: /(parspack\.net|parspack\.com)$/i, provider: 'ParsPack' },
  // storage
  { re: /r2\.cloudflarestorage\.com$/i, provider: 'Cloudflare R2' },
  { re: /digitaloceanspaces\.com$/i, provider: 'DigitalOcean Spaces' },
  { re: /backblazeb2\.com$/i, provider: 'Backblaze B2' },
  { re: /wasabisys\.com$/i, provider: 'Wasabi' },
  { re: /storage\.googleapis\.com$/i, provider: 'Google Cloud Storage' },
  { re: /blob\.core\.windows\.net$/i, provider: 'Azure Blob Storage' },
  { re: /cloudinary\.com$/i, provider: 'Cloudinary' },
  // email
  { re: /(gmail\.com|googlemail\.com|smtp-relay\.gmail\.com)$/i, provider: 'Gmail SMTP' },
  { re: /sendgrid\.net$/i, provider: 'SendGrid' },
  { re: /mailgun\.org$/i, provider: 'Mailgun' },
  { re: /email-smtp\..*amazonaws\.com$/i, provider: 'AWS SES' },
  { re: /postmarkapp\.com$/i, provider: 'Postmark' },
  { re: /resend\.(com|dev)$/i, provider: 'Resend' },
  { re: /mailtrap\.io$/i, provider: 'Mailtrap (testing)', dev: true },
  { re: /(office365\.com|outlook\.com)$/i, provider: 'Microsoft 365' },
  { re: /zoho\.(com|eu)$/i, provider: 'Zoho Mail' },
  { re: /(brevo\.com|sendinblue\.com)$/i, provider: 'Brevo' },
  { re: /mailjet\.com$/i, provider: 'Mailjet' },
  { re: /yandex\.(ru|com)$/i, provider: 'Yandex Mail' },
  // AI
  { re: /api\.openai\.com$/i, provider: 'OpenAI' },
  { re: /openai\.azure\.com$/i, provider: 'Azure OpenAI' },
  { re: /api\.anthropic\.com$/i, provider: 'Anthropic' },
  { re: /generativelanguage\.googleapis\.com$/i, provider: 'Google Gemini' },
  { re: /openrouter\.ai$/i, provider: 'OpenRouter' },
  { re: /api\.groq\.com$/i, provider: 'Groq' },
  { re: /api\.together\.xyz$/i, provider: 'Together AI' },
  { re: /api\.deepseek\.com$/i, provider: 'DeepSeek' },
  { re: /(avalai\.ir|gapgpt\.app|metisai\.ir|openai\.ir)$/i, provider: 'Iranian OpenAI proxy' },
  // generic AWS last
  { re: /amazonaws\.com$/i, provider: 'AWS' },
];

export function providerFromHost(host) {
  if (!host) return null;
  const h = host.toLowerCase().replace(/:\d+$/, '');
  if (LOCAL_HOSTS.test(h) || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h)) return { provider: 'Local / docker-compose', local: true };
  for (const rule of HOST_PROVIDERS) {
    if (rule.re.test(h)) return { provider: rule.provider, liara: Boolean(rule.liara), dev: Boolean(rule.dev) };
  }
  return { provider: `Self-hosted / other (${h})`, other: true };
}

// Provider implied by the key name alone (API-key based services).
export const KEY_PROVIDERS = [
  { re: /^LIARA_AI_/, provider: 'Liara', liara: true },
  { re: /^OPENAI_/, provider: 'OpenAI' },
  { re: /^AZURE_OPENAI/, provider: 'Azure OpenAI' },
  { re: /^(ANTHROPIC|CLAUDE)_/, provider: 'Anthropic' },
  { re: /^(GEMINI|GOOGLE_(GENERATIVE_AI|AI|GENAI))_/, provider: 'Google Gemini' },
  { re: /^GROQ_/, provider: 'Groq' },
  { re: /^MISTRAL_/, provider: 'Mistral' },
  { re: /^COHERE_/, provider: 'Cohere' },
  { re: /^OPENROUTER_/, provider: 'OpenRouter' },
  { re: /^TOGETHER_/, provider: 'Together AI' },
  { re: /^DEEPSEEK_/, provider: 'DeepSeek' },
  { re: /^REPLICATE_/, provider: 'Replicate' },
  { re: /^SENDGRID/, provider: 'SendGrid' },
  { re: /^RESEND_/, provider: 'Resend' },
  { re: /^MAILGUN_/, provider: 'Mailgun' },
  { re: /^POSTMARK/, provider: 'Postmark' },
  { re: /^(BREVO|SENDINBLUE)/, provider: 'Brevo' },
  { re: /^MAILJET/, provider: 'Mailjet' },
  { re: /^CLOUDINARY/, provider: 'Cloudinary' },
  { re: /^BLOB_READ_WRITE_TOKEN$/, provider: 'Vercel Blob' },
  { re: /^R2_/, provider: 'Cloudflare R2' },
  { re: /^UPLOADTHING_/, provider: 'UploadThing' },
  { re: /^LIARA_(ENDPOINT|BUCKET|ACCESS_KEY|SECRET_KEY)/, provider: 'Liara', liara: true },
  { re: /^UPSTASH_/, provider: 'Upstash' },
  { re: /^TURSO_/, provider: 'Turso' },
  { re: /^SUPABASE_/, provider: 'Supabase' },
];

// Which DB engine a URL scheme or key name points to.
export function engineFromUrl(value) {
  const m = String(value).match(/^([a-z0-9+]+):\/\//i);
  if (!m) return null;
  const s = m[1].toLowerCase();
  if (s.startsWith('postgres')) return 'postgres';
  if (s.startsWith('mysql')) return 'mysql';
  if (s.startsWith('mariadb')) return 'mariadb';
  if (s.startsWith('mongodb')) return 'mongodb';
  if (s.startsWith('redis') || s === 'rediss') return 'redis';
  if (s.startsWith('sqlserver') || s.startsWith('mssql')) return 'mssql';
  if (s.startsWith('amqp')) return 'rabbitmq';
  if (s.startsWith('clickhouse')) return 'clickhouse';
  if (s.startsWith('libsql') || s.startsWith('file') || s.startsWith('sqlite')) return 'sqlite';
  return null;
}

export function engineFromKey(key) {
  const k = key.toUpperCase();
  if (/CLICKHOUSE/.test(k)) return 'clickhouse';
  if (/POSTGRES|^PG|PGSQL/.test(k)) return 'postgres';
  if (/MARIADB/.test(k)) return 'mariadb';
  if (/MYSQL/.test(k)) return 'mysql';
  if (/MONGO/.test(k)) return 'mongodb';
  if (/REDIS|^KV_|CACHE_URL|CELERY_BROKER/.test(k)) return 'redis';
  if (/MSSQL|SQLSERVER/.test(k)) return 'mssql';
  if (/RABBIT|AMQP|BROKER_URL/.test(k)) return 'rabbitmq';
  if (/ELASTIC/.test(k)) return 'elasticsearch';
  if (/TURSO/.test(k)) return 'sqlite';
  return null;
}

// Laravel DB_CONNECTION / Django ENGINE values → engine.
export function engineFromName(name) {
  const n = String(name || '').toLowerCase();
  if (/pgsql|postgres/.test(n)) return 'postgres';
  if (/mariadb/.test(n)) return 'mariadb';
  if (/mysql/.test(n)) return 'mysql';
  if (/mongo/.test(n)) return 'mongodb';
  if (/sqlite/.test(n)) return 'sqlite';
  if (/sqlsrv|mssql|sqlserver/.test(n)) return 'mssql';
  if (/redis/.test(n)) return 'redis';
  if (/clickhouse/.test(n)) return 'clickhouse';
  return null;
}
