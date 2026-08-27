import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import 'sheet_annotation.dart';
import 'sheet_score.dart';

class SheetExternalAnnotationSaveResult {
  const SheetExternalAnnotationSaveResult({
    required this.didSave,
    required this.reference,
    this.failureReason,
  });

  final bool didSave;
  final SheetAnnotationStorageReference reference;
  final String? failureReason;
}

class SheetExternalAnnotationLoadResult {
  const SheetExternalAnnotationLoadResult({
    required this.didLoad,
    required this.layer,
    this.failureReason,
  });

  final bool didLoad;
  final SheetAnnotationLayer layer;
  final String? failureReason;
}

abstract class SheetAnnotationStorageAdapter {
  Future<SheetExternalAnnotationSaveResult> saveLayer({
    required String scoreId,
    required SheetAnnotationLayer layer,
    DateTime? savedAt,
  });

  Future<SheetExternalAnnotationLoadResult> loadLayer(
    SheetAnnotationStorageReference reference,
  );
}

class SheetFileBackedAnnotationStore implements SheetAnnotationStorageAdapter {
  const SheetFileBackedAnnotationStore({this.rootDirectory});

  final Directory? rootDirectory;

  @override
  Future<SheetExternalAnnotationSaveResult> saveLayer({
    required String scoreId,
    required SheetAnnotationLayer layer,
    DateTime? savedAt,
  }) async {
    try {
      final directory = await _annotationDirectory();
      if (!directory.existsSync()) {
        await directory.create(recursive: true);
      }
      final json = const JsonEncoder.withIndent('  ').convert(layer.toJson());
      final path = '${directory.path}/${_safeId(scoreId)}.annotations.json';
      await File(path).writeAsString(json);
      return SheetExternalAnnotationSaveResult(
        didSave: true,
        reference: SheetAnnotationStorageReference(
          mode: SheetAnnotationStorageReference.fileMode,
          path: path,
          checksum: _checksum(json),
          updatedAt: savedAt ?? DateTime.now(),
          lastSaveStatus: 'saved',
        ),
      );
    } catch (error) {
      return SheetExternalAnnotationSaveResult(
        didSave: false,
        reference: SheetAnnotationStorageReference.inline.withSaveError(
          error.toString(),
        ),
        failureReason: error.toString(),
      );
    }
  }

  @override
  Future<SheetExternalAnnotationLoadResult> loadLayer(
    SheetAnnotationStorageReference reference,
  ) async {
    if (!reference.isFileBacked) {
      return const SheetExternalAnnotationLoadResult(
        didLoad: false,
        layer: SheetAnnotationLayer.empty,
        failureReason: 'Annotation reference is not file-backed.',
      );
    }

    try {
      final file = File(reference.path);
      if (!await file.exists()) {
        return const SheetExternalAnnotationLoadResult(
          didLoad: false,
          layer: SheetAnnotationLayer.empty,
          failureReason: 'Annotation file is missing.',
        );
      }
      final json = await file.readAsString();
      if (reference.checksum.isNotEmpty &&
          reference.checksum != _checksum(json)) {
        return const SheetExternalAnnotationLoadResult(
          didLoad: false,
          layer: SheetAnnotationLayer.empty,
          failureReason: 'Annotation checksum mismatch.',
        );
      }
      final decoded = jsonDecode(json);
      if (decoded is! Map) {
        return const SheetExternalAnnotationLoadResult(
          didLoad: false,
          layer: SheetAnnotationLayer.empty,
          failureReason: 'Annotation file root is not an object.',
        );
      }
      return SheetExternalAnnotationLoadResult(
        didLoad: true,
        layer: SheetAnnotationLayer.fromJson(
          decoded.map(
            (key, value) => MapEntry(key.toString(), value as Object?),
          ),
        ),
      );
    } catch (error) {
      return SheetExternalAnnotationLoadResult(
        didLoad: false,
        layer: SheetAnnotationLayer.empty,
        failureReason: error.toString(),
      );
    }
  }

  Future<Directory> _annotationDirectory() async {
    final root = rootDirectory ?? await getApplicationDocumentsDirectory();
    return Directory('${root.path}/annotations');
  }

  static String _safeId(String value) {
    return value.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '_');
  }

  static String _checksum(String value) {
    var hash = 0xcbf29ce484222325;
    for (final byte in utf8.encode(value)) {
      hash ^= byte;
      hash = (hash * 0x100000001b3) & 0x7fffffffffffffff;
    }
    return hash.toRadixString(16);
  }
}
