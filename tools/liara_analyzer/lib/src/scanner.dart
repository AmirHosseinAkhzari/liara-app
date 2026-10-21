/// Walks a project folder and collects what the AI needs to see:
/// the file tree, manifest/config files, and code lines that hint at
/// databases, storage, email, AI or domains. Secrets never leave the machine.
library;

import 'dart:convert';
import 'dart:io';

class ProjectSnapshot {
  ProjectSnapshot({
    required this.root,
    required this.files,
    required this.totalFiles,
    required this.keyFiles,
    required this.signals,
    required this.skippedSecrets,
  });

  final String root;

  /// Relative paths of the files that were listed (capped).
  final List<String> files;

  /// Every file seen, including ones past the listing cap.
  final int totalFiles;

  /// Manifest and config files, path -> (possibly truncated, redacted) content.
  final Map<String, String> keyFiles;

  /// `path:line: code` hints found in source files.
  final List<String> signals;

  /// Secret files that were found and deliberately not read.
  final List<String> skippedSecrets;

  String get name => root.split(Platform.pathSeparator).where((s) => s.isNotEmpty).last;

  /// The text sent to the model.
  String toPrompt() {
    final b = StringBuffer()
      ..writeln('PROJECT: $name')
      ..writeln('FILES ($totalFiles total, ${files.length} listed):')
      ..writeln(files.join('\n'))
      ..writeln();
    for (final e in keyFiles.entries) {
      b
        ..writeln('===== FILE: ${e.key} =====')
        ..writeln(e.value)
        ..writeln();
    }
    b.writeln('===== CODE HINTS (path:line: code) =====');
    b.writeln(signals.isEmpty ? '(none)' : signals.join('\n'));
    return b.toString();
  }
}

class ProjectScanner {
  ProjectScanner({
    this.maxListedFiles = 600,
    this.maxKeyFileChars = 12000,
    this.maxTotalChars = 160000,
    this.maxSignals = 300,
    this.maxSignalsPerFile = 8,
  });

  final int maxListedFiles;
  final int maxKeyFileChars;
  final int maxTotalChars;
  final int maxSignals;
  final int maxSignalsPerFile;

  static const _ignoredDirs = {
    '.git', '.hg', '.svn', 'node_modules', 'bower_components', 'vendor', '.venv', 'venv', 'env',
    '__pycache__', '.mypy_cache', '.pytest_cache', 'dist', 'build', '.next', '.nuxt', '.svelte-kit',
    'out', 'target', 'bin', 'obj', '.idea', '.vscode', 'coverage', '.dart_tool', '.turbo', '.cache',
    'Pods', '.gradle', 'storage', 'public/build', 'tmp', 'logs',
  };

  static const _keyFileNames = {
    'package.json', 'requirements.txt', 'requirements-prod.txt', 'pyproject.toml', 'Pipfile',
    'setup.py', 'setup.cfg', 'composer.json', 'go.mod', 'Gemfile', 'Cargo.toml', 'pom.xml',
    'build.gradle', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml',
    'compose.yaml', 'liara.json', 'next.config.js', 'next.config.mjs', 'next.config.ts',
    'nuxt.config.ts', 'nuxt.config.js', 'vite.config.ts', 'vite.config.js', 'angular.json',
    'vue.config.js', 'svelte.config.js', 'astro.config.mjs', 'schema.prisma', 'settings.py',
    'manage.py', 'app.py', 'main.py', 'wsgi.py', 'asgi.py', 'artisan', '.env.example',
    '.env.sample', '.env.template', '.env.dist', 'appsettings.json', 'Program.cs', 'main.go',
    'CNAME', 'netlify.toml', 'vercel.json', 'Procfile', 'app.json', 'database.php',
    'filesystems.php', 'mail.php', 'services.php', 'celery.py', 'server.js', 'server.ts',
    'index.js', 'index.ts', 'app.js', 'app.ts',
  };

  static const _sourceExts = {
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.php', '.go', '.cs', '.rb', '.vue',
    '.svelte', '.java', '.kt', '.rs', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.json',
    '.html', '.astro',
  };

  static final _secretFile = RegExp(
    r'(^\.env$|^\.env\.(?!example$|sample$|template$|dist$).+|\.pem$|\.key$|\.p12$|\.pfx$|^id_(rsa|ed25519|ecdsa)|\.keystore$|^credentials.*\.json$|^service-account.*\.json$)',
    caseSensitive: false,
  );

  static final _lockFile = RegExp(
    r'(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|poetry\.lock|Pipfile\.lock|go\.sum|Cargo\.lock|bun\.lockb)$',
  );

  /// Lines worth showing the model.
  static final _signal = RegExp(
    r'(prisma|mongoose|mongodb|pymongo|motor|sequelize|typeorm|knex|drizzle|mikro-orm|\bpg\b|postgres|psycopg|mysql|mariadb|sqlite|sqlserver|mssql|tedious|redis|ioredis|predis|bullmq|\bbull\b|celery|amqp|rabbit|pika|elastic|clickhouse|aws-sdk|boto3|botocore|\bs3\b|minio|django-storages|flysystem|multer|nodemailer|smtp|sendgrid|mailgun|resend|postmark|send_mail|EmailMessage|Mail::|Mailable|MAIL_|EMAIL_|openai|anthropic|langchain|llamaindex|@ai-sdk|generativeai|genai|ollama|groq|cohere|huggingface|DATABASE_URL|DB_CONNECTION|DB_HOST|ENGINE|SITE_URL|APP_URL|BASE_URL|PUBLIC_URL|NEXTAUTH_URL|ALLOWED_HOSTS|CSRF_TRUSTED|server_name|\bdomain\b|\.listen\(|\bPORT\b)',
    caseSensitive: false,
  );

  static final _secretAssignment = RegExp(
    r'''^([ \t]*["']?[A-Za-z0-9_.-]*(SECRET|PASSWORD|PASSWD|TOKEN|API_KEY|APIKEY|PRIVATE|ACCESS_KEY|AUTH_KEY|CREDENTIAL)[A-Za-z0-9_.-]*["']?[ \t]*[:=][ \t]*)(.+)$''',
    caseSensitive: false,
    multiLine: true,
  );

  static final _secretLiteral = RegExp(
    r'(sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|xox[abp]-[A-Za-z0-9-]{10,}|box-ai-[a-f0-9]{16,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)',
  );

  static final _urlCredentials = RegExp(r'([a-zA-Z][a-zA-Z0-9+.-]*://)[^\s/:@]+:[^\s/@]+@');

  /// Removes secret-looking values while keeping variable names.
  static String redact(String text) {
    var out = text.replaceAllMapped(_secretAssignment, (m) {
      final value = m.group(3)!.trim();
      final empty = value.isEmpty || value == '""' || value == "''" || value == 'null';
      return empty ? m.group(0)! : '${m.group(1)}<redacted>';
    });
    out = out.replaceAll(_secretLiteral, '<redacted>');
    // user:password@ inside connection URLs
    out = out.replaceAllMapped(_urlCredentials, (m) => '${m.group(1)}<redacted>@');
    return out;
  }

  Future<ProjectSnapshot> scan(String rootPath) async {
    final root = Directory(rootPath).absolute;
    if (!await root.exists()) {
      throw FileSystemException('Folder not found', rootPath);
    }
    final rootStr = root.path.endsWith(Platform.pathSeparator) ? root.path : '${root.path}${Platform.pathSeparator}';

    final all = <File>[];
    final skippedSecrets = <String>[];
    await _walk(root, rootStr, all, skippedSecrets);
    all.sort((a, b) => _rel(a, rootStr).compareTo(_rel(b, rootStr)));

    final listed = all.take(maxListedFiles).map((f) => _rel(f, rootStr)).toList();

    var budget = maxTotalChars;
    final keyFiles = <String, String>{};
    final keyCandidates = all.where((f) {
      final base = _base(f.path);
      return _keyFileNames.contains(base) || base.endsWith('.csproj') || base == 'schema.prisma';
    }).toList()
      // Shallow files first: root manifests matter most.
      ..sort((a, b) => _depth(_rel(a, rootStr)).compareTo(_depth(_rel(b, rootStr))));
    for (final f in keyCandidates) {
      if (budget <= 0) break;
      final text = await _readText(f);
      if (text == null) continue;
      var content = redact(text);
      final cap = maxKeyFileChars < budget ? maxKeyFileChars : budget;
      if (content.length > cap) content = '${content.substring(0, cap)}\n…(truncated)';
      keyFiles[_rel(f, rootStr)] = content;
      budget -= content.length;
    }

    final signals = <String>[];
    for (final f in all) {
      if (signals.length >= maxSignals) break;
      final rel = _rel(f, rootStr);
      if (keyFiles.containsKey(rel)) continue;
      if (!_sourceExts.contains(_ext(f.path))) continue;
      final text = await _readText(f);
      if (text == null) continue;
      var perFile = 0;
      final lines = text.split('\n');
      for (var i = 0; i < lines.length; i++) {
        final line = lines[i].trim();
        if (line.isEmpty || line.length > 400) continue;
        if (!_signal.hasMatch(line)) continue;
        signals.add('$rel:${i + 1}: ${redact(line.length > 200 ? line.substring(0, 200) : line)}');
        if (++perFile >= maxSignalsPerFile || signals.length >= maxSignals) break;
      }
    }

    return ProjectSnapshot(
      root: root.path,
      files: listed,
      totalFiles: all.length,
      keyFiles: keyFiles,
      signals: signals,
      skippedSecrets: skippedSecrets,
    );
  }

  Future<void> _walk(Directory dir, String rootStr, List<File> out, List<String> skipped) async {
    final entries = await dir.list(followLinks: false).toList()
      ..sort((a, b) => a.path.compareTo(b.path));
    for (final e in entries) {
      final base = _base(e.path);
      if (e is Directory) {
        final rel = _rel(e, rootStr);
        if (_ignoredDirs.contains(base) || _ignoredDirs.contains(rel)) continue;
        await _walk(e, rootStr, out, skipped);
      } else if (e is File) {
        if (_secretFile.hasMatch(base)) {
          skipped.add(_rel(e, rootStr));
          continue;
        }
        if (_lockFile.hasMatch(base) || base == '.DS_Store') continue;
        out.add(e);
      }
    }
  }

  Future<String?> _readText(File f) async {
    try {
      final len = await f.length();
      if (len > 300 * 1024) return null;
      final bytes = await f.readAsBytes();
      if (bytes.take(2000).contains(0)) return null; // binary
      return utf8.decode(bytes); // throws on non-UTF-8 (binary) files
    } catch (_) {
      return null;
    }
  }

  static String _rel(FileSystemEntity e, String rootStr) =>
      e.path.startsWith(rootStr) ? e.path.substring(rootStr.length) : e.path;
  static String _base(String p) => p.split(Platform.pathSeparator).last;
  static String _ext(String p) {
    final b = _base(p);
    final i = b.lastIndexOf('.');
    return i <= 0 ? '' : b.substring(i).toLowerCase();
  }

  static int _depth(String rel) => rel.split(Platform.pathSeparator).length;
}
