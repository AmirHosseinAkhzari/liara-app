import 'dart:convert';
import 'dart:io';

import 'package:liara_analyzer/liara_analyzer.dart';

const _usage = '''
Usage: liara_analyze <project-folder> [options]

Reads the project with AI and prints what it needs on Liara:
language/platform, databases, S3, email, AI and DNS.

Options:
  --json         Print the result as JSON.
  --model <id>   AI model to use (default: $defaultModel).
  --dry-run      Show what would be sent to the AI, without calling it.
  --brief        Hide the evidence lines.
  --no-color     Plain output.
  -h, --help     Show this help.

Settings (environment or a .env file in the current folder or above):
  BOX_AI_API_KEY   required
  BOX_AI_BASE_URL  default ${AnalyzerConfig.defaultBaseUrl}
''';

Future<void> main(List<String> args) async {
  String? path;
  var json = false, dryRun = false, brief = false;
  var color = stdout.hasTerminal && stdout.supportsAnsiEscapes;
  var model = defaultModel;

  for (var i = 0; i < args.length; i++) {
    final a = args[i];
    switch (a) {
      case '-h' || '--help':
        stdout.write(_usage);
        return;
      case '--json':
        json = true;
      case '--dry-run':
        dryRun = true;
      case '--brief':
        brief = true;
      case '--no-color':
        color = false;
      case '--model':
        if (i + 1 >= args.length) _fail('--model needs a value.');
        model = args[++i];
      default:
        if (a.startsWith('-')) _fail('Unknown option: $a');
        if (path != null) _fail('Give one project folder.');
        path = a;
    }
  }
  if (path == null) {
    stderr.write(_usage);
    exit(64);
  }

  final ProjectSnapshot snapshot;
  try {
    snapshot = await ProjectScanner().scan(path);
  } on FileSystemException catch (e) {
    _fail('${e.message}: ${e.path}');
  }

  if (dryRun) {
    stdout
      ..writeln('Files listed: ${snapshot.files.length} of ${snapshot.totalFiles}')
      ..writeln('Files sent in full: ${snapshot.keyFiles.keys.join(', ')}')
      ..writeln('Code hints: ${snapshot.signals.length}')
      ..writeln('Secret files skipped (never read): ${snapshot.skippedSecrets.isEmpty ? 'none' : snapshot.skippedSecrets.join(', ')}')
      ..writeln('Prompt size: ${snapshot.toPrompt().length} characters')
      ..writeln()
      ..writeln(snapshot.toPrompt());
    return;
  }

  final scriptDir = File.fromUri(Platform.script).parent.path;
  final config = AnalyzerConfig.load([Directory.current.path, scriptDir]);
  if (config == null) {
    _fail('BOX_AI_API_KEY is not set. Add it to your environment or a .env file.');
  }

  if (!json) {
    stderr.writeln('Reading ${snapshot.totalFiles} files in ${snapshot.root} with $model …');
  }
  final watch = Stopwatch()..start();
  final ProjectAnalysis result;
  try {
    result = await ProjectAnalyzer(
      client: BoxAiClient(baseUrl: config.baseUrl, apiKey: config.apiKey),
      model: model,
    ).analyze(snapshot);
  } on BoxAiException catch (e) {
    stderr.writeln('AI request failed: $e');
    exit(2);
  }
  watch.stop();

  if (json) {
    stdout.writeln(const JsonEncoder.withIndent('  ').convert(result.toJson()));
  } else {
    stdout.write(formatReport(
      result,
      projectPath: snapshot.root,
      filesScanned: snapshot.totalFiles,
      model: model,
      took: watch.elapsed,
      color: color,
      showEvidence: !brief,
    ));
  }
}

Never _fail(String message) {
  stderr.writeln('Error: $message');
  exit(64);
}
