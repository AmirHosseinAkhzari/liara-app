/// The result of analyzing a project: which Liara products it needs.
library;

/// Platforms Liara can run, keyed by the id the analyzer returns.
const liaraPlatforms = <String, String>{
  'node': 'Node.js',
  'next': 'Next.js',
  'laravel': 'Laravel',
  'php': 'PHP',
  'python': 'Python',
  'django': 'Django',
  'flask': 'Flask',
  'dotnet': '.NET',
  'react': 'React',
  'angular': 'Angular',
  'vue': 'Vue',
  'static': 'Static',
  'go': 'Go',
  'docker': 'Docker',
};

/// Databases Liara offers, keyed by the id the analyzer returns.
const liaraDatabases = <String, String>{
  'mariadb': 'MariaDB',
  'mysql': 'MySQL',
  'postgres': 'PostgreSQL',
  'mssql': 'SQL Server',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'elasticsearch': 'Elasticsearch',
  'rabbitmq': 'RabbitMQ',
  'clickhouse': 'ClickHouse',
};

class LanguageInfo {
  LanguageInfo({
    required this.platform,
    required this.language,
    required this.framework,
    required this.version,
    required this.reason,
    required this.evidence,
  });

  /// One of [liaraPlatforms] keys.
  final String platform;
  final String language;
  final String framework;
  final String? version;
  final String reason;
  final List<String> evidence;

  String get platformName => liaraPlatforms[platform] ?? platform;

  factory LanguageInfo.fromJson(Map<String, dynamic> j) => LanguageInfo(
        platform: _str(j['platform']),
        language: _str(j['language']),
        framework: _str(j['framework']),
        version: j['version'] as String?,
        reason: _str(j['reason']),
        evidence: _list(j['evidence']),
      );

  Map<String, dynamic> toJson() => {
        'platform': platform,
        'language': language,
        'framework': framework,
        'version': version,
        'reason': reason,
        'evidence': evidence,
      };
}

class DatabaseNeed {
  DatabaseNeed({required this.type, required this.reason, required this.evidence});

  /// One of [liaraDatabases] keys.
  final String type;
  final String reason;
  final List<String> evidence;

  String get name => liaraDatabases[type] ?? type;

  factory DatabaseNeed.fromJson(Map<String, dynamic> j) => DatabaseNeed(
        type: _str(j['type']),
        reason: _str(j['reason']),
        evidence: _list(j['evidence']),
      );

  Map<String, dynamic> toJson() => {'type': type, 'reason': reason, 'evidence': evidence};
}

/// A yes/no product need (S3, email, AI, DNS).
class ProductNeed {
  ProductNeed({required this.needed, required this.reason, required this.evidence, this.domain});

  final bool needed;
  final String reason;
  final List<String> evidence;

  /// Only used for DNS: the custom domain found in the project, if any.
  final String? domain;

  factory ProductNeed.fromJson(Map<String, dynamic> j) => ProductNeed(
        needed: j['needed'] == true,
        reason: _str(j['reason']),
        evidence: _list(j['evidence']),
        domain: j['domain'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'needed': needed,
        'reason': reason,
        'evidence': evidence,
        if (domain != null) 'domain': domain,
      };
}

class DeployInfo {
  DeployInfo({this.port, this.buildCommand, this.startCommand, this.runtimeVersion});

  final int? port;
  final String? buildCommand;
  final String? startCommand;
  final String? runtimeVersion;

  factory DeployInfo.fromJson(Map<String, dynamic> j) => DeployInfo(
        port: (j['port'] as num?)?.toInt(),
        buildCommand: j['build_command'] as String?,
        startCommand: j['start_command'] as String?,
        runtimeVersion: j['runtime_version'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'port': port,
        'build_command': buildCommand,
        'start_command': startCommand,
        'runtime_version': runtimeVersion,
      };
}

class ProjectAnalysis {
  ProjectAnalysis({
    required this.language,
    required this.databases,
    required this.s3,
    required this.email,
    required this.ai,
    required this.dns,
    required this.deploy,
    required this.envVars,
    required this.warnings,
  });

  final LanguageInfo language;
  final List<DatabaseNeed> databases;
  final ProductNeed s3;
  final ProductNeed email;
  final ProductNeed ai;
  final ProductNeed dns;
  final DeployInfo deploy;
  final List<String> envVars;
  final List<String> warnings;

  /// Parses the model's JSON and drops anything Liara does not offer.
  factory ProjectAnalysis.fromJson(Map<String, dynamic> j) {
    final warnings = _list(j['warnings']);
    final lang = LanguageInfo.fromJson(_map(j['language']));
    if (!liaraPlatforms.containsKey(lang.platform)) {
      warnings.add('Unknown platform "${lang.platform}" from the model; treat the language result with care.');
    }
    final dbs = <DatabaseNeed>[];
    for (final raw in (j['databases'] as List? ?? const [])) {
      final db = DatabaseNeed.fromJson(_map(raw));
      if (liaraDatabases.containsKey(db.type) && !dbs.any((d) => d.type == db.type)) {
        dbs.add(db);
      }
    }
    return ProjectAnalysis(
      language: lang,
      databases: dbs,
      s3: ProductNeed.fromJson(_map(j['s3'])),
      email: ProductNeed.fromJson(_map(j['email'])),
      ai: ProductNeed.fromJson(_map(j['ai'])),
      dns: ProductNeed.fromJson(_map(j['dns'])),
      deploy: DeployInfo.fromJson(_map(j['deploy'])),
      envVars: _list(j['env_vars']),
      warnings: warnings,
    );
  }

  Map<String, dynamic> toJson() => {
        'language': language.toJson(),
        'databases': databases.map((d) => d.toJson()).toList(),
        's3': s3.toJson(),
        'email': email.toJson(),
        'ai': ai.toJson(),
        'dns': dns.toJson(),
        'deploy': deploy.toJson(),
        'env_vars': envVars,
        'warnings': warnings,
      };
}

/// JSON schema sent to the model so it can only answer with Liara values.
Map<String, dynamic> analysisJsonSchema() {
  Map<String, dynamic> obj(Map<String, dynamic> props) => {
        'type': 'object',
        'properties': props,
        'required': props.keys.toList(),
        'additionalProperties': false,
      };
  const str = {'type': 'string'};
  const nullableStr = {
    'type': ['string', 'null']
  };
  const strList = {'type': 'array', 'items': str};
  Map<String, dynamic> need({bool withDomain = false}) => obj({
        'needed': {'type': 'boolean'},
        if (withDomain) 'domain': nullableStr,
        'reason': str,
        'evidence': strList,
      });

  return obj({
    'language': obj({
      'platform': {'type': 'string', 'enum': liaraPlatforms.keys.toList()},
      'language': str,
      'framework': str,
      'version': nullableStr,
      'reason': str,
      'evidence': strList,
    }),
    'databases': {
      'type': 'array',
      'items': obj({
        'type': {'type': 'string', 'enum': liaraDatabases.keys.toList()},
        'reason': str,
        'evidence': strList,
      }),
    },
    's3': need(),
    'email': need(),
    'ai': need(),
    'dns': need(withDomain: true),
    'deploy': obj({
      'port': {
        'type': ['integer', 'null']
      },
      'build_command': nullableStr,
      'start_command': nullableStr,
      'runtime_version': nullableStr,
    }),
    'env_vars': strList,
    'warnings': strList,
  });
}

String _str(Object? v) => v is String ? v : '';
List<String> _list(Object? v) => v is List ? v.whereType<String>().toList() : <String>[];
Map<String, dynamic> _map(Object? v) => v is Map<String, dynamic> ? v : <String, dynamic>{};
