// Runs the analyzer on every sample project in test/fixtures and compares
// the six answers with the expected ones. Calls the real AI Box API.
//
//   dart run tool/check_fixtures.dart [--model <id>] [fixture ...]
import 'dart:io';

import 'package:liara_analyzer/liara_analyzer.dart';

class Expected {
  const Expected(this.platform, this.dbs, {this.s3 = false, this.email = false, this.ai = false, this.dns = false});
  final String platform;
  final Set<String> dbs;
  final bool s3, email, ai, dns;
}

const expected = <String, Expected>{
  'next-shop': Expected('next', {'postgres', 'redis'}, s3: true, email: true, ai: true, dns: true),
  'django-blog': Expected('django', {'mysql'}, s3: true, dns: true),
  'laravel-store': Expected('laravel', {'mysql', 'redis'}, email: true),
  'static-landing': Expected('static', {}),
  'go-api': Expected('go', {'mongodb'}, ai: true),
  'flask-notes': Expected('flask', {}),
  'react-dashboard': Expected('react', {}),
};

Future<void> main(List<String> args) async {
  var model = defaultModel;
  final only = <String>[];
  for (var i = 0; i < args.length; i++) {
    if (args[i] == '--model') {
      model = args[++i];
    } else {
      only.add(args[i]);
    }
  }

  final toolDir = File.fromUri(Platform.script).parent.parent.path;
  final config = AnalyzerConfig.load([Directory.current.path, toolDir]);
  if (config == null) {
    stderr.writeln('BOX_AI_API_KEY is not set.');
    exit(64);
  }
  final analyzer = ProjectAnalyzer(client: BoxAiClient(baseUrl: config.baseUrl, apiKey: config.apiKey), model: model);

  final names = only.isEmpty ? expected.keys.toList() : only;
  final results = await Future.wait(names.map((name) async {
    final exp = expected[name]!;
    final snap = await ProjectScanner().scan('$toolDir/test/fixtures/$name');
    final leaked = snap.toPrompt().contains('THIS-MUST-NEVER-BE-SENT');
    try {
      final watch = Stopwatch()..start();
      final a = await analyzer.analyze(snap);
      final dbs = a.databases.map((d) => d.type).toSet();
      final problems = <String>[
        if (leaked) 'SECRET LEAKED into prompt',
        if (a.language.platform != exp.platform) 'platform ${a.language.platform} != ${exp.platform}',
        if (!_sameSet(dbs, exp.dbs)) 'databases $dbs != ${exp.dbs}',
        if (a.s3.needed != exp.s3) 's3 ${a.s3.needed} != ${exp.s3}',
        if (a.email.needed != exp.email) 'email ${a.email.needed} != ${exp.email}',
        if (a.ai.needed != exp.ai) 'ai ${a.ai.needed} != ${exp.ai}',
        if (a.dns.needed != exp.dns) 'dns ${a.dns.needed} != ${exp.dns}',
      ];
      final summary = '${a.language.platform} | db=${dbs.join(',')} | s3=${a.s3.needed} email=${a.email.needed} '
          'ai=${a.ai.needed} dns=${a.dns.needed}${a.dns.domain == null ? '' : '(${a.dns.domain})'} '
          '| port=${a.deploy.port} | ${(watch.elapsedMilliseconds / 1000).toStringAsFixed(1)}s';
      return (name, problems, summary, a.warnings);
    } on BoxAiException catch (e) {
      return (name, ['API error: $e'], '', <String>[]);
    }
  }));

  var failed = 0;
  for (final (name, problems, summary, warnings) in results) {
    final ok = problems.isEmpty;
    if (!ok) failed++;
    stdout.writeln('${ok ? 'PASS' : 'FAIL'}  ${name.padRight(16)} $summary');
    for (final p in problems) {
      stdout.writeln('        ✘ $p');
    }
    for (final w in warnings) {
      stdout.writeln('        ! $w');
    }
  }
  stdout.writeln('\n${results.length - failed}/${results.length} passed ($model)');
  exit(failed == 0 ? 0 : 1);
}

bool _sameSet(Set<String> a, Set<String> b) => a.length == b.length && a.containsAll(b);
