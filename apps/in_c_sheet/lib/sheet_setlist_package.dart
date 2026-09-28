import 'sheet_score.dart';
import 'sheet_setlist_manifest.dart';

const String sheetSetlistPackageScope = 'clef.setlist.package';
const int sheetSetlistPackageVersion = 1;

class SheetSetlistPackageFile {
  const SheetSetlistPackageFile({
    required this.path,
    String? displayName,
    this.mediaType = '',
  }) : displayName = displayName ?? '';

  final String path;
  final String displayName;
  final String mediaType;

  String get fileName {
    final explicit = displayName.trim();
    if (explicit.isNotEmpty) {
      return explicit;
    }
    return _fileName(path);
  }

  bool get isSupportedScoreFile {
    return _supportedScoreExtensions.contains(_fileExtension(fileName));
  }
}

class SheetSetlistPackageDryRun {
  const SheetSetlistPackageDryRun({
    required this.manifest,
    required this.entries,
    this.packageFiles = const <SheetSetlistPackageFile>[],
  });

  final SheetSetlistShareManifest manifest;
  final List<SheetSetlistPackageEntry> entries;
  final List<SheetSetlistPackageFile> packageFiles;

  factory SheetSetlistPackageDryRun.preview({
    required SheetSetlistShareManifest manifest,
    required List<SheetScore> currentScores,
    required List<SheetSetlistPackageFile> packageFiles,
  }) {
    final existingPreview = manifest.matchScores(currentScores);
    final matches = existingPreview.matches;
    return SheetSetlistPackageDryRun(
      manifest: manifest,
      packageFiles: List<SheetSetlistPackageFile>.unmodifiable(packageFiles),
      entries: List<SheetSetlistPackageEntry>.unmodifiable([
        for (var index = 0; index < manifest.items.length; index++)
          SheetSetlistPackageEntry.resolve(
            item: manifest.items[index],
            existingMatch: index < matches.length ? matches[index] : null,
            packageFiles: packageFiles,
          ),
      ]),
    );
  }

  bool get canImport {
    return manifest.canPreviewImport &&
        entries.isNotEmpty &&
        entries.every((entry) => entry.isResolved);
  }

  int get existingScoreCount {
    return entries
        .where(
          (entry) =>
              entry.status == SheetSetlistPackageEntryStatus.existingScore,
        )
        .length;
  }

  int get importableFileCount {
    return entries
        .where(
          (entry) =>
              entry.status == SheetSetlistPackageEntryStatus.importableFile,
        )
        .length;
  }

  int get unresolvedCount {
    return entries.where((entry) => !entry.isResolved).length;
  }

  List<SheetSetlistPackageEntry> get unresolvedEntries {
    return entries.where((entry) => !entry.isResolved).toList(growable: false);
  }

  List<String> get warnings {
    return <String>[
      ...manifest.warnings,
      for (final entry in unresolvedEntries) entry.warning,
    ].where((warning) => warning.trim().isNotEmpty).toList(growable: false);
  }
}

class SheetSetlistPackageEntry {
  const SheetSetlistPackageEntry({
    required this.item,
    required this.status,
    this.existingScore,
    this.packageFile,
    this.candidates = const <SheetScore>[],
    this.packageFileCandidates = const <SheetSetlistPackageFile>[],
  });

  final SheetSetlistShareItem item;
  final SheetSetlistPackageEntryStatus status;
  final SheetScore? existingScore;
  final SheetSetlistPackageFile? packageFile;
  final List<SheetScore> candidates;
  final List<SheetSetlistPackageFile> packageFileCandidates;

  bool get isResolved {
    return status == SheetSetlistPackageEntryStatus.existingScore ||
        status == SheetSetlistPackageEntryStatus.importableFile;
  }

  String get warning {
    switch (status) {
      case SheetSetlistPackageEntryStatus.existingScore:
      case SheetSetlistPackageEntryStatus.importableFile:
        return '';
      case SheetSetlistPackageEntryStatus.ambiguousExistingScore:
        return '여러 기존 악보와 일치하는 곡: ${item.title}';
      case SheetSetlistPackageEntryStatus.missingFile:
        return '패키지에서 찾을 수 없는 파일: ${_displayFileReference(item)}';
      case SheetSetlistPackageEntryStatus.duplicatePackageFile:
        return '패키지에 같은 이름의 파일이 여러 개 있습니다: ${item.fileName}';
      case SheetSetlistPackageEntryStatus.unsupportedFile:
        return '지원하지 않는 패키지 파일 형식: ${_displayFileReference(item)}';
    }
  }

  static SheetSetlistPackageEntry resolve({
    required SheetSetlistShareItem item,
    required SheetSetlistManifestMatch? existingMatch,
    required List<SheetSetlistPackageFile> packageFiles,
  }) {
    if (existingMatch != null && existingMatch.isResolved) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.existingScore,
        existingScore: existingMatch.score,
        candidates: existingMatch.candidates,
      );
    }

    if (existingMatch?.kind == SheetSetlistManifestMatchKind.ambiguous) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.ambiguousExistingScore,
        candidates: existingMatch?.candidates ?? const <SheetScore>[],
      );
    }

    final fileName = item.fileName.trim();
    if (fileName.isEmpty) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.missingFile,
      );
    }

    final matches = _matchingPackageFiles(fileName, packageFiles);
    if (matches.isEmpty) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.missingFile,
      );
    }
    if (matches.length > 1) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.duplicatePackageFile,
        packageFileCandidates: matches,
      );
    }

    final file = matches.single;
    if (!file.isSupportedScoreFile) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.unsupportedFile,
        packageFile: file,
        packageFileCandidates: matches,
      );
    }
    return SheetSetlistPackageEntry(
      item: item,
      status: SheetSetlistPackageEntryStatus.importableFile,
      packageFile: file,
      packageFileCandidates: matches,
    );
  }
}

enum SheetSetlistPackageEntryStatus {
  existingScore,
  importableFile,
  ambiguousExistingScore,
  missingFile,
  duplicatePackageFile,
  unsupportedFile,
}

const _supportedScoreExtensions = <String>{'.pdf', '.jpg', '.jpeg', '.png'};

List<SheetSetlistPackageFile> _matchingPackageFiles(
  String fileName,
  List<SheetSetlistPackageFile> packageFiles,
) {
  final wanted = _normalizeLookup(fileName);
  final wantedStem = _normalizeLookup(_fileStem(fileName));
  return packageFiles
      .where((file) {
        final keys = <String>{
          _normalizeLookup(file.fileName),
          _normalizeLookup(_fileStem(file.fileName)),
          _normalizeLookup(_fileName(file.path)),
          _normalizeLookup(_fileStem(file.path)),
        }..remove('');
        return keys.contains(wanted) ||
            (wantedStem.isNotEmpty && keys.contains(wantedStem));
      })
      .toList(growable: false);
}

String _displayFileReference(SheetSetlistShareItem item) {
  final fileName = item.fileName.trim();
  if (fileName.isNotEmpty) {
    return fileName;
  }
  return item.title.trim().isEmpty ? '이름 없는 곡' : item.title.trim();
}

String _normalizeLookup(String value) {
  return value.trim().replaceAll(RegExp(r'\s+'), ' ').toLowerCase();
}

String _fileName(String path) {
  return path.trim().replaceAll('\\', '/').split('/').last.trim();
}

String _fileStem(String path) {
  return _fileName(path).replaceFirst(RegExp(r'\.[^.]+$'), '').trim();
}

String _fileExtension(String path) {
  final name = _fileName(path).toLowerCase();
  final dot = name.lastIndexOf('.');
  if (dot < 0) {
    return '';
  }
  return name.substring(dot);
}
