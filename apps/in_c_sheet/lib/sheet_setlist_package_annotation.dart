import 'dart:convert';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';

import 'sheet_annotation.dart';

const String sheetSetlistPackageAnnotationScope =
    'clef.setlist.package.annotation';
const int sheetSetlistPackageAnnotationVersion = 1;
const String sheetSetlistPackageAnnotationDirectory = 'annotations/';

class SheetSetlistPackageAnnotationSidecar {
  const SheetSetlistPackageAnnotationSidecar({
    required this.scoreEntryPath,
    required this.scoreSha256,
    required this.annotationLayer,
  });

  final String scoreEntryPath;
  final String scoreSha256;
  final SheetAnnotationLayer annotationLayer;

  String get archiveEntryPath =>
      SheetSetlistPackageAnnotationCodec.entryPathForScore(scoreEntryPath);
}

class SheetSetlistPackageAnnotationCodec {
  const SheetSetlistPackageAnnotationCodec._();

  static const int maxSidecarBytes = 16 * 1024 * 1024;
  static const int maxAnnotationObjects = 20000;
  static const int maxAnnotationPoints = 1000000;

  static String entryPathForScore(String scoreEntryPath) {
    final normalizedPath = _normalizeScoreEntryPath(scoreEntryPath);
    final digest = sha256.convert(utf8.encode(normalizedPath)).toString();
    return '$sheetSetlistPackageAnnotationDirectory$digest.json';
  }

  static Uint8List encode(SheetSetlistPackageAnnotationSidecar sidecar) {
    final scoreEntryPath = _normalizeScoreEntryPath(sidecar.scoreEntryPath);
    final scoreSha256 = _normalizeSha256(sidecar.scoreSha256);
    _validateAnnotationLayer(sidecar.annotationLayer);
    final transferableLayer = SheetAnnotationLayer(
      strokes: sidecar.annotationLayer.strokes,
      texts: sidecar.annotationLayer.texts,
      layers: sidecar.annotationLayer.layers,
    );
    final bytes = utf8.encode(
      jsonEncode(<String, Object?>{
        'scope': sheetSetlistPackageAnnotationScope,
        'version': sheetSetlistPackageAnnotationVersion,
        'scoreEntryPath': scoreEntryPath,
        'scoreSha256': scoreSha256,
        'annotation': transferableLayer.toJson(),
      }),
    );
    if (bytes.length > maxSidecarBytes) {
      throw const FormatException(
        'Setlist package annotation sidecar exceeds the size limit.',
      );
    }
    return Uint8List.fromList(bytes);
  }

  static SheetSetlistPackageAnnotationSidecar decode({
    required String archiveEntryPath,
    required List<int> bytes,
  }) {
    if (!_isSafeAnnotationEntryPath(archiveEntryPath)) {
      throw FormatException(
        'Unsafe setlist package annotation entry: $archiveEntryPath',
      );
    }
    if (bytes.isEmpty || bytes.length > maxSidecarBytes) {
      throw const FormatException(
        'Setlist package annotation sidecar has an invalid size.',
      );
    }

    late Object? decoded;
    try {
      decoded = jsonDecode(utf8.decode(bytes));
    } on FormatException catch (error) {
      throw FormatException(
        'Setlist package annotation sidecar is not valid UTF-8 JSON: '
        '${error.message}',
      );
    }
    if (decoded is! Map) {
      throw const FormatException(
        'Setlist package annotation sidecar must be a JSON object.',
      );
    }
    final json = decoded.map<String, Object?>(
      (key, value) => MapEntry(key.toString(), value),
    );
    if (json['scope'] != sheetSetlistPackageAnnotationScope ||
        json['version'] != sheetSetlistPackageAnnotationVersion) {
      throw const FormatException(
        'Setlist package annotation sidecar scope or version is unsupported.',
      );
    }

    final scoreEntryPath = _normalizeScoreEntryPath(
      json['scoreEntryPath']?.toString() ?? '',
    );
    final expectedEntryPath = entryPathForScore(scoreEntryPath);
    if (archiveEntryPath != expectedEntryPath) {
      throw const FormatException(
        'Setlist package annotation sidecar path does not match its score.',
      );
    }
    final scoreSha256 = _normalizeSha256(json['scoreSha256']?.toString() ?? '');
    final annotationJson = _jsonObject(json['annotation']);
    _validateRawAnnotationJson(annotationJson);
    final annotationLayer = SheetAnnotationLayer.fromJson(annotationJson);
    _validateParsedCounts(annotationJson, annotationLayer);
    _validateAnnotationLayer(annotationLayer);

    return SheetSetlistPackageAnnotationSidecar(
      scoreEntryPath: scoreEntryPath,
      scoreSha256: scoreSha256,
      annotationLayer: annotationLayer,
    );
  }

  static String _normalizeScoreEntryPath(String value) {
    final path = value.trim().replaceAll('\\', '/');
    final segments = path.split('/');
    if (!path.startsWith('scores/') ||
        path.endsWith('/') ||
        segments.any(
          (segment) => segment.isEmpty || segment == '.' || segment == '..',
        )) {
      throw FormatException('Unsafe setlist package score entry: $value');
    }
    return path;
  }

  static String _normalizeSha256(String value) {
    final digest = value.trim().toLowerCase();
    if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(digest)) {
      throw const FormatException(
        'Setlist package annotation score checksum must be SHA-256.',
      );
    }
    return digest;
  }

  static bool _isSafeAnnotationEntryPath(String value) {
    final path = value.trim().replaceAll('\\', '/');
    return RegExp(r'^annotations/[a-f0-9]{64}\.json$').hasMatch(path);
  }

  static Map<String, Object?> _jsonObject(Object? value) {
    if (value is! Map) {
      throw const FormatException(
        'Setlist package annotation payload must be a JSON object.',
      );
    }
    return value.map<String, Object?>(
      (key, item) => MapEntry(key.toString(), item),
    );
  }

  static List<Object?> _jsonList(Map<String, Object?> json, String key) {
    final value = json[key];
    if (value == null) return const <Object?>[];
    if (value is! List) {
      throw FormatException('Annotation field $key must be a JSON array.');
    }
    if (value.any((item) => item is! Map)) {
      throw FormatException('Annotation field $key contains an invalid item.');
    }
    return value;
  }

  static void _validateRawAnnotationJson(Map<String, Object?> json) {
    final strokes = _jsonList(json, 'strokes');
    final texts = _jsonList(json, 'texts');
    final redo = _jsonList(json, 'redoStack');
    final eraseUndo = _jsonList(json, 'eraseUndoStack');
    _jsonList(json, 'layers');
    if (strokes.length + texts.length > maxAnnotationObjects) {
      throw const FormatException(
        'Setlist package annotation sidecar contains too many objects.',
      );
    }
    if (redo.isNotEmpty || eraseUndo.isNotEmpty) {
      throw const FormatException(
        'Setlist package annotation sidecar cannot contain undo history.',
      );
    }
  }

  static void _validateParsedCounts(
    Map<String, Object?> json,
    SheetAnnotationLayer layer,
  ) {
    if (_jsonList(json, 'strokes').length != layer.strokes.length ||
        _jsonList(json, 'texts').length != layer.texts.length) {
      throw const FormatException(
        'Setlist package annotation sidecar contains malformed objects.',
      );
    }
  }

  static void _validateAnnotationLayer(SheetAnnotationLayer layer) {
    if (layer.strokeCount + layer.textCount > maxAnnotationObjects ||
        layer.pointCount > maxAnnotationPoints) {
      throw const FormatException(
        'Setlist package annotation sidecar exceeds object limits.',
      );
    }
    final objectIds = <String>{};
    final layerIds = {for (final displayLayer in layer.layers) displayLayer.id};
    for (final stroke in layer.strokes) {
      if (!objectIds.add(stroke.id)) {
        throw FormatException('Duplicate annotation object id: ${stroke.id}');
      }
      if (!layerIds.contains(stroke.layerId)) {
        throw FormatException(
          'Annotation ${stroke.id} references an unknown layer.',
        );
      }
    }
    for (final text in layer.texts) {
      if (!objectIds.add(text.id)) {
        throw FormatException('Duplicate annotation object id: ${text.id}');
      }
      if (!layerIds.contains(text.layerId)) {
        throw FormatException(
          'Annotation ${text.id} references an unknown layer.',
        );
      }
    }
  }
}
