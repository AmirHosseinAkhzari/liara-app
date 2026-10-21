/// Minimal client for the AI Box (OpenAI-compatible) chat completions API.
library;

import 'dart:convert';
import 'dart:io';

class BoxAiException implements Exception {
  BoxAiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => statusCode == null ? message : 'HTTP $statusCode: $message';
}

class BoxAiClient {
  BoxAiClient({
    required this.baseUrl,
    required this.apiKey,
    this.timeout = const Duration(seconds: 180),
  });

  final String baseUrl;
  final String apiKey;
  final Duration timeout;

  /// Sends a chat request that must come back as JSON matching [schema].
  /// Falls back to plain JSON mode for models without schema support.
  Future<Map<String, dynamic>> completeJson({
    required String model,
    required String system,
    required String user,
    required Map<String, dynamic> schema,
    int maxTokens = 6000,
  }) async {
    final body = <String, dynamic>{
      'model': model,
      'messages': [
        {'role': 'system', 'content': system},
        {'role': 'user', 'content': user},
      ],
      'max_completion_tokens': maxTokens,
      'response_format': {
        'type': 'json_schema',
        'json_schema': {'name': 'liara_project_analysis', 'strict': true, 'schema': schema},
      },
    };

    Map<String, dynamic> res;
    try {
      res = await _post('/chat/completions', body);
    } on BoxAiException catch (e) {
      final msg = e.message.toLowerCase();
      if (e.statusCode == 400 && msg.contains('max_completion_tokens')) {
        body
          ..remove('max_completion_tokens')
          ..['max_tokens'] = maxTokens;
        res = await _post('/chat/completions', body);
      } else if (e.statusCode == 400 && (msg.contains('response_format') || msg.contains('json_schema'))) {
        body['response_format'] = {'type': 'json_object'};
        res = await _post('/chat/completions', body);
      } else {
        rethrow;
      }
    }

    final choices = res['choices'];
    if (choices is! List || choices.isEmpty) {
      throw BoxAiException('The AI returned no answer.');
    }
    final message = (choices.first as Map)['message'] as Map? ?? const {};
    final refusal = message['refusal'];
    if (refusal is String && refusal.isNotEmpty) {
      throw BoxAiException('The AI refused: $refusal');
    }
    final content = message['content'];
    if (content is! String || content.trim().isEmpty) {
      final reason = (choices.first as Map)['finish_reason'];
      throw BoxAiException('The AI returned an empty answer (finish_reason: $reason).');
    }
    try {
      return jsonDecode(_stripFences(content)) as Map<String, dynamic>;
    } on FormatException {
      throw BoxAiException('The AI answer was not valid JSON.');
    }
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 30);
    try {
      final uri = Uri.parse('${baseUrl.replaceAll(RegExp(r'/+$'), '')}$path');
      final req = await client.postUrl(uri).timeout(timeout);
      req.headers
        ..set(HttpHeaders.authorizationHeader, 'Bearer $apiKey')
        ..set(HttpHeaders.contentTypeHeader, 'application/json; charset=utf-8')
        ..set(HttpHeaders.acceptHeader, 'application/json');
      req.add(utf8.encode(jsonEncode(body)));
      final resp = await req.close().timeout(timeout);
      final text = await resp.transform(utf8.decoder).join().timeout(timeout);
      Map<String, dynamic>? json;
      try {
        json = jsonDecode(text) as Map<String, dynamic>;
      } catch (_) {}
      if (resp.statusCode < 200 || resp.statusCode >= 300) {
        final err = json?['error'];
        final msg = err is Map ? (err['message'] ?? err.toString()) : text;
        throw BoxAiException(msg.toString(), statusCode: resp.statusCode);
      }
      if (json == null) throw BoxAiException('The API did not return JSON.');
      return json;
    } on SocketException catch (e) {
      throw BoxAiException('Network error: ${e.message}');
    } finally {
      client.close(force: true);
    }
  }

  static String _stripFences(String s) {
    final t = s.trim();
    if (!t.startsWith('```')) return t;
    return t.replaceFirst(RegExp(r'^```[a-zA-Z]*\s*'), '').replaceFirst(RegExp(r'\s*```$'), '');
  }
}
