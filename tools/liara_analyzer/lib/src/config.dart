/// Reads AI Box settings from the environment or a `.env` file.
library;

import 'dart:io';

class AnalyzerConfig {
  AnalyzerConfig({required this.baseUrl, required this.apiKey});

  final String baseUrl;
  final String apiKey;

  static const baseUrlKey = 'BOX_AI_BASE_URL';
  static const apiKeyKey = 'BOX_AI_API_KEY';
  static const defaultBaseUrl = 'https://ai.boxapi.ir/ai/v1';

  /// Environment variables win; otherwise the first `.env` found in
  /// [searchDirs] (and their parents) is used.
  static AnalyzerConfig? load(List<String> searchDirs) {
    final values = <String, String>{};
    for (final dir in searchDirs) {
      final env = _findEnvFile(Directory(dir).absolute);
      if (env != null) {
        values.addAll(_parse(env.readAsStringSync()));
        break;
      }
    }
    values.addAll({
      for (final k in [baseUrlKey, apiKeyKey])
        if ((Platform.environment[k] ?? '').isNotEmpty) k: Platform.environment[k]!,
    });
    final key = values[apiKeyKey] ?? '';
    if (key.isEmpty) return null;
    return AnalyzerConfig(baseUrl: values[baseUrlKey] ?? defaultBaseUrl, apiKey: key);
  }

  static File? _findEnvFile(Directory start) {
    Directory? dir = start;
    for (var i = 0; i < 6 && dir != null; i++) {
      final f = File('${dir.path}${Platform.pathSeparator}.env');
      if (f.existsSync()) return f;
      final parent = dir.parent;
      dir = parent.path == dir.path ? null : parent;
    }
    return null;
  }

  static Map<String, String> _parse(String text) {
    final out = <String, String>{};
    for (final raw in text.split('\n')) {
      final line = raw.trim();
      if (line.isEmpty || line.startsWith('#')) continue;
      final i = line.indexOf('=');
      if (i <= 0) continue;
      final key = line.substring(0, i).replaceFirst(RegExp(r'^export\s+'), '').trim();
      var value = line.substring(i + 1).trim();
      if (value.length >= 2 &&
          ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
        value = value.substring(1, value.length - 1);
      }
      out[key] = value;
    }
    return out;
  }
}
