/// Turns a project snapshot into a [ProjectAnalysis] using the AI.
library;

import 'analysis.dart';
import 'box_ai_client.dart';
import 'scanner.dart';

const defaultModel = 'openai/gpt-6-luna';

const _systemPrompt = '''
You read software projects and decide what they need to run on Liara, an Iranian cloud provider.
Decide only from the evidence given (file list, manifest/config files, code hints). Never invent files.
Every "evidence" item must name a real file from the input, like "package.json: \\"next\\": \\"15.0.3\\"" or "lib/mailer.ts:3: import nodemailer".

LANGUAGE — pick the Liara platform that would run this app:
- next: Next.js apps. node: Express, NestJS, Fastify, Koa, plain Node servers, Nuxt/Remix/SvelteKit/Astro with a Node server.
- react / vue / angular: single-page apps built to static files (Vite, CRA, Vue CLI, Angular CLI) with no own server.
- static: plain HTML/CSS/JS with no build step, or static site generators whose output is just files.
- django: Django. flask: Flask. python: FastAPI, other Python web apps.
- laravel: Laravel. php: other PHP apps.
- dotnet: ASP.NET / .NET web apps. go: Go web apps.
- docker: only if a Dockerfile exists AND the stack is not covered above (Ruby, Java, Rust, Elixir, several runtimes in one image) or the app clearly depends on its Dockerfile.
Also give the main language (e.g. TypeScript, Python), the framework name, and its version if a manifest shows it.

DATABASES — list every Liara database the app connects to, and only those:
mariadb, mysql, postgres, mssql, mongodb, redis, elasticsearch, rabbitmq, clickhouse.
- Use ORM/driver config: Prisma "provider", Django DATABASES ENGINE, Laravel DB_CONNECTION, TypeORM/Sequelize dialect, drivers (pg, mysql2, mongoose, pymongo, go mongo-driver, Npgsql, EF Core providers).
- Redis: ioredis, redis, predis, django-redis, BullMQ/Bull queues, Celery or Laravel queues/cache using redis.
- rabbitmq: amqplib, pika, Celery with an amqp:// broker. elasticsearch / clickhouse: their client libraries.
- SQLite is NOT a Liara database: do not list it; add a warning that the data needs a Liara disk or a move to MySQL/PostgreSQL.
- A framework's untouched default config is not enough on its own; look for the app's own choice (.env.example, settings, schema, real queries).

S3 (Liara object storage) — needed=true only if the code stores or serves files through object storage:
@aws-sdk/client-s3, aws-sdk S3, boto3/botocore S3, django-storages with S3, league/flysystem-aws-s3-v3, Laravel "s3" disk actually used, minio clients, multer-s3.
If the app saves user uploads to the local filesystem, keep needed=false and add a warning that uploads need a Liara disk or S3.

EMAIL (Liara mail server) — needed=true only if the app sends email: nodemailer, SMTP libraries, Django send_mail/EmailMessage with an SMTP backend,
Laravel Mailables / Mail:: facade / Notifications via mail, PHPMailer, SendGrid/Mailgun/Resend/Postmark SDKs, net/smtp, MailKit.
Default MAIL_* lines in a framework template without any code that sends mail do not count.

AI (Liara AI) — needed=true if the code calls an LLM or AI API: openai, anthropic, @ai-sdk/*, langchain, llamaindex, google-genai / generativeai,
ollama, groq, cohere, huggingface inference, or HTTP calls to such APIs.

DNS (Liara DNS) — needed=true if the project is meant to run on its own custom domain: a real, non-localhost domain in .env.example, settings
(ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS), APP_URL/SITE_URL/NEXTAUTH_URL, a CNAME file, next.config, sitemap/robots config, or nginx server_name.
Put that domain in "domain" (no scheme). If no custom domain is found, needed=false and domain=null (Liara's free subdomain is used).

DEPLOY — the port the app listens on (framework default if the code does not set one: Next.js/Node 3000, Django/Python 8000, Flask 5000,
Laravel/PHP 80, static/SPA 80), build and start commands from the manifests, and the runtime version if pinned (engines, .nvmrc, python_requires, go version).
The start command must be production-ready: prefer gunicorn/uvicorn when they are dependencies (e.g. "gunicorn config.wsgi"), "npm start"/"next start"
for Node, never a dev server such as "runserver", "flask run" or "vite dev". Use null when Liara's platform runs the app itself (laravel, php, static, react, vue, angular).
ENV_VARS — names (never values) of environment variables the app reads.
WARNINGS — short, practical notes about anything that would break or must change on Liara (SQLite, local file uploads, hardcoded localhost URLs,
missing start script, secrets committed to the repo). Empty list if none.

Keep every "reason" to one short sentence in English.
''';

class ProjectAnalyzer {
  ProjectAnalyzer({required this.client, this.model = defaultModel});

  final BoxAiClient client;
  final String model;

  Future<ProjectAnalysis> analyze(ProjectSnapshot snapshot) async {
    final json = await client.completeJson(
      model: model,
      system: _systemPrompt,
      user: snapshot.toPrompt(),
      schema: analysisJsonSchema(),
    );
    return ProjectAnalysis.fromJson(json);
  }
}
