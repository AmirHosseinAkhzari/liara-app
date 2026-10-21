/// Prints a [ProjectAnalysis] as a readable terminal report.
library;

import 'analysis.dart';

class Ansi {
  Ansi(this.enabled);
  final bool enabled;
  String _w(String code, String s) => enabled ? '\x1B[${code}m$s\x1B[0m' : s;
  String bold(String s) => _w('1', s);
  String dim(String s) => _w('2', s);
  String mint(String s) => _w('38;2;135;252;196', s);
  String sky(String s) => _w('38;2;40;193;245', s);
  String yellow(String s) => _w('38;2;255;196;78', s);
  String gray(String s) => _w('38;2;153;153;153', s);
}

String formatReport(
  ProjectAnalysis a, {
  required String projectPath,
  required int filesScanned,
  required String model,
  required Duration took,
  bool color = true,
  bool showEvidence = true,
}) {
  final c = Ansi(color);
  final yes = c.mint('✔');
  final no = c.gray('✘');
  final b = StringBuffer();
  const label = 11;

  void row(String name, String mark, String text, List<String> evidence) {
    b.writeln('  ${c.bold(name.padRight(label))}$mark $text');
    if (showEvidence) {
      for (final e in evidence.take(3)) {
        b.writeln('  ${' ' * label}  ${c.dim('↳ $e')}');
      }
    }
  }

  b
    ..writeln()
    ..writeln(c.bold(c.mint('Liara AI Deploy · project analysis')))
    ..writeln(c.gray('$projectPath · $filesScanned files read · $model · ${(took.inMilliseconds / 1000).toStringAsFixed(1)}s'))
    ..writeln();

  final lang = a.language;
  final version = (lang.version ?? '').isEmpty ? '' : ' ${lang.version}';
  row(
    'Language',
    yes,
    '${c.bold(lang.framework.isEmpty ? lang.platformName : lang.framework)}$version'
        '${lang.language.isEmpty ? '' : ' (${lang.language})'}  →  Liara platform: ${c.sky(lang.platform)}',
    lang.evidence,
  );

  if (a.databases.isEmpty) {
    row('Database', no, c.gray('none'), const []);
  } else {
    for (var i = 0; i < a.databases.length; i++) {
      final d = a.databases[i];
      row(i == 0 ? 'Database' : '', yes, '${c.bold(d.name)} ${c.gray('— ${d.reason}')}', d.evidence);
    }
  }

  void need(String name, ProductNeed n, {String? extra}) {
    final text = n.needed
        ? '${c.bold('needed')}${extra == null ? '' : ' · ${c.sky(extra)}'} ${c.gray('— ${n.reason}')}'
        : c.gray('not needed — ${n.reason}');
    row(name, n.needed ? yes : no, text, n.needed ? n.evidence : const []);
  }

  need('S3', a.s3);
  need('Email', a.email);
  need('AI', a.ai);
  need('DNS', a.dns, extra: a.dns.domain);

  b.writeln();
  final d = a.deploy;
  final parts = [
    if (d.port != null) 'port ${d.port}',
    if (d.buildCommand != null) 'build: ${d.buildCommand}',
    if (d.startCommand != null) 'start: ${d.startCommand}',
    if (d.runtimeVersion != null) 'runtime: ${d.runtimeVersion}',
  ];
  if (parts.isNotEmpty) b.writeln('  ${c.bold('Deploy'.padRight(label))}  ${parts.join(c.gray(' · '))}');
  if (a.envVars.isNotEmpty) {
    b.writeln('  ${c.bold('Env vars'.padRight(label))}  ${a.envVars.join(c.gray(', '))}');
  }
  if (a.warnings.isNotEmpty) {
    b.writeln('  ${c.bold(c.yellow('Warnings'.padRight(label)))}');
    for (final w in a.warnings) {
      b.writeln('  ${' ' * label}  ${c.yellow('!')} $w');
    }
  }

  final products = <String>[
    'App (${lang.platform})',
    ...a.databases.map((d) => d.name),
    if (a.s3.needed) 'S3',
    if (a.email.needed) 'Email',
    if (a.ai.needed) 'AI',
    if (a.dns.needed) 'DNS',
  ];
  b
    ..writeln()
    ..writeln('  ${c.bold('Liara products:')} ${c.mint(products.join(' + '))}')
    ..writeln();
  return b.toString();
}
