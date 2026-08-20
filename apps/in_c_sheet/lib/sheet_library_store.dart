import 'dart:io';
import 'dart:math';

import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'sheet_score.dart';

class SheetLibraryStore {
  static const _scoresKey = 'in_c_sheet_scores';
  static const _pdfFolderName = 'scores';

  Future<List<SheetScore>> loadScores() async {
    final preferences = await SharedPreferences.getInstance();
    final scores = SheetScore.decodeList(preferences.getString(_scoresKey));
    return _sortScores(scores);
  }

  Future<void> saveScores(List<SheetScore> scores) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_scoresKey, SheetScore.encodeList(scores));
  }

  Future<SheetScore?> importPdf() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: const <String>['pdf'],
    );

    if (file == null) {
      return null;
    }

    final bytes = await file.readAsBytes();
    final now = DateTime.now();
    final id = '${now.microsecondsSinceEpoch}-${Random().nextInt(1 << 32)}';
    final title = _titleFromFileName(file.name);
    final storedPath = await _writeImportedPdf(
      bytes: bytes,
      id: id,
      originalFileName: file.name,
    );

    return SheetScore(
      id: id,
      title: title,
      composer: '',
      tags: const <String>[],
      note: '',
      filePath: storedPath,
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      lastPage: 1,
      isFavorite: false,
    );
  }

  Future<String> _writeImportedPdf({
    required List<int> bytes,
    required String id,
    required String originalFileName,
  }) async {
    final documents = await getApplicationDocumentsDirectory();
    final scoresDir = Directory('${documents.path}/$_pdfFolderName');
    if (!scoresDir.existsSync()) {
      await scoresDir.create(recursive: true);
    }

    final safeName = _safeFileName(originalFileName);
    final file = File('${scoresDir.path}/$id-$safeName');
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }

  List<SheetScore> _sortScores(List<SheetScore> scores) {
    final sorted = scores.toList();
    sorted.sort((a, b) {
      final aDate = a.lastOpenedAt ?? a.importedAt;
      final bDate = b.lastOpenedAt ?? b.importedAt;
      return bDate.compareTo(aDate);
    });
    return sorted;
  }

  String _titleFromFileName(String name) {
    final withoutExtension = name.replaceFirst(
      RegExp(r'\.pdf$', caseSensitive: false),
      '',
    );
    final normalized = withoutExtension
        .replaceAll(RegExp(r'[_-]+'), ' ')
        .trim();
    return normalized.isEmpty ? 'Untitled score' : normalized;
  }

  String _safeFileName(String name) {
    final sanitized = name.replaceAll(RegExp(r'[^A-Za-z0-9._-]+'), '-');
    final collapsed = sanitized.replaceAll(RegExp(r'-+'), '-');
    return collapsed.isEmpty ? 'score.pdf' : collapsed;
  }
}
