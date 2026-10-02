import 'sheet_file_import.dart';

enum SheetExternalFolderCatalogStatus {
  ready,
  empty,
  permissionDenied,
  scanFailed,
  capped,
}

enum SheetExternalFolderCandidateStatus {
  readyToCopy,
  duplicateName,
  unsupportedFormat,
  unreadable,
}

class SheetExternalFolderEntry {
  const SheetExternalFolderEntry({
    required this.displayName,
    this.sizeBytes,
    this.modifiedAt,
    this.providerLabel,
    this.documentId,
    this.canRead = true,
  });

  final String displayName;
  final int? sizeBytes;
  final DateTime? modifiedAt;
  final String? providerLabel;
  final String? documentId;
  final bool canRead;

  String get normalizedName =>
      SheetExternalFolderCatalogPreview.normalizeName(displayName);
}

class SheetExternalFolderImportCandidate {
  const SheetExternalFolderImportCandidate({
    required this.entry,
    required this.status,
    required this.message,
  });

  final SheetExternalFolderEntry entry;
  final SheetExternalFolderCandidateStatus status;
  final String message;

  bool get isReadyToCopy =>
      status == SheetExternalFolderCandidateStatus.readyToCopy;
}

class SheetExternalFolderCatalogPreview {
  const SheetExternalFolderCatalogPreview._({
    required this.status,
    required this.candidates,
    required this.scannedCount,
    required this.message,
    this.maxEntries,
  });

  factory SheetExternalFolderCatalogPreview.fromEntries(
    Iterable<SheetExternalFolderEntry> entries, {
    Iterable<String> existingFileNames = const <String>[],
    int maxEntries = 200,
  }) {
    final allEntries = entries.toList(growable: false);
    if (allEntries.isEmpty) {
      return const SheetExternalFolderCatalogPreview._(
        status: SheetExternalFolderCatalogStatus.empty,
        candidates: <SheetExternalFolderImportCandidate>[],
        scannedCount: 0,
        message: '선택한 폴더에서 PDF 후보를 찾지 못했습니다.',
      );
    }

    final capped = allEntries.length > maxEntries;
    final visibleEntries = capped
        ? allEntries.take(maxEntries).toList(growable: false)
        : allEntries;
    final existingNames = existingFileNames
        .map(normalizeName)
        .where((name) => name.isNotEmpty)
        .toSet();

    final candidates = visibleEntries
        .map((entry) => _candidateFor(entry, existingNames: existingNames))
        .toList(growable: false);

    return SheetExternalFolderCatalogPreview._(
      status: capped
          ? SheetExternalFolderCatalogStatus.capped
          : SheetExternalFolderCatalogStatus.ready,
      candidates: candidates,
      scannedCount: allEntries.length,
      maxEntries: maxEntries,
      message: capped
          ? '파일이 많아 처음 $maxEntries개만 먼저 보여줍니다. 선택한 파일만 Clef 라이브러리에 복사됩니다.'
          : '선택한 폴더를 둘러보고 가져올 PDF를 고를 수 있습니다.',
    );
  }

  const SheetExternalFolderCatalogPreview.permissionDenied()
    : this._(
        status: SheetExternalFolderCatalogStatus.permissionDenied,
        candidates: const <SheetExternalFolderImportCandidate>[],
        scannedCount: 0,
        message: '폴더 접근 권한이 없어 미리보기를 만들 수 없습니다. 라이브러리는 변경되지 않았습니다.',
      );

  const SheetExternalFolderCatalogPreview.scanFailed([String? details])
    : this._(
        status: SheetExternalFolderCatalogStatus.scanFailed,
        candidates: const <SheetExternalFolderImportCandidate>[],
        scannedCount: 0,
        message:
            details ?? '폴더를 읽지 못했습니다. 클라우드 파일이 내려받아져 있는지 또는 권한이 유지되는지 확인해주세요.',
      );

  final SheetExternalFolderCatalogStatus status;
  final List<SheetExternalFolderImportCandidate> candidates;
  final int scannedCount;
  final int? maxEntries;
  final String message;

  int get readyCount => candidates.where((candidate) {
    return candidate.status == SheetExternalFolderCandidateStatus.readyToCopy;
  }).length;

  int get blockedCount => candidates.length - readyCount;

  bool get hasReadyCandidates => readyCount > 0;

  bool get isReadOnlyPreview => true;

  static String normalizeName(String value) {
    return value.trim().toLowerCase();
  }

  static SheetExternalFolderImportCandidate _candidateFor(
    SheetExternalFolderEntry entry, {
    required Set<String> existingNames,
  }) {
    final normalizedName = entry.normalizedName;
    if (!entry.canRead) {
      return SheetExternalFolderImportCandidate(
        entry: entry,
        status: SheetExternalFolderCandidateStatus.unreadable,
        message: '이 파일은 현재 기기에서 읽을 수 없습니다.',
      );
    }
    if (!SheetFileImportPolicy.isPdfFileName(entry.displayName)) {
      return SheetExternalFolderImportCandidate(
        entry: entry,
        status: SheetExternalFolderCandidateStatus.unsupportedFormat,
        message: '폴더 가져오기는 먼저 PDF 파일만 복사 대상으로 보여줍니다.',
      );
    }
    if (existingNames.contains(normalizedName)) {
      return SheetExternalFolderImportCandidate(
        entry: entry,
        status: SheetExternalFolderCandidateStatus.duplicateName,
        message: '같은 이름의 악보가 이미 라이브러리에 있습니다.',
      );
    }
    return SheetExternalFolderImportCandidate(
      entry: entry,
      status: SheetExternalFolderCandidateStatus.readyToCopy,
      message: '선택하면 Clef 라이브러리에 복사됩니다.',
    );
  }
}
