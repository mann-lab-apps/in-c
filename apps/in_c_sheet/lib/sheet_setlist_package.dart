import 'dart:convert';
import 'dart:typed_data';

import 'package:archive/archive.dart';

import 'sheet_annotation.dart';
import 'sheet_docx.dart';
import 'sheet_file_import.dart';
import 'sheet_metronome.dart';
import 'sheet_score.dart';
import 'sheet_setlist.dart';
import 'sheet_setlist_manifest.dart';

const String sheetSetlistPackageScope = 'clef.setlist.package';
const int sheetSetlistPackageVersion = 1;
const String sheetSetlistPackageManifestFileName = 'clef-setlist-package.txt';
const String sheetSetlistPackageUserStampsFileName = 'clef-user-stamps.json';
const String sheetSetlistPackageScoreDirectory = 'scores/';
const String sheetSetlistPackageStampAssetDirectory = 'stamps/';

class SheetSetlistPackageArchive {
  const SheetSetlistPackageArchive({
    required this.manifest,
    required this.packageFiles,
    this.userStampPacks = const <SheetAnnotationStampPack>[],
    this.stampAssetFiles = const <SheetSetlistPackageStampAssetFile>[],
  });

  final SheetSetlistShareManifest manifest;
  final List<SheetSetlistPackageFile> packageFiles;
  final List<SheetAnnotationStampPack> userStampPacks;
  final List<SheetSetlistPackageStampAssetFile> stampAssetFiles;

  SheetSetlistPackageDryRun previewImport({
    required List<SheetScore> currentScores,
    List<SheetAnnotationStampPack> currentUserStampPacks =
        const <SheetAnnotationStampPack>[],
  }) {
    return SheetSetlistPackageDryRun.preview(
      manifest: manifest,
      currentScores: currentScores,
      packageFiles: packageFiles,
      userStampPacks: userStampPacks,
      stampAssetFiles: stampAssetFiles,
      currentUserStampPacks: currentUserStampPacks,
    );
  }

  static SheetSetlistPackageArchive decodeBytes(List<int> bytes) {
    late Archive archive;
    try {
      archive = ZipDecoder().decodeBytes(bytes);
    } on ArchiveException catch (error) {
      throw FormatException(
        'Setlist package ZIP cannot be read: ${error.message}',
      );
    }

    final fileEntries = archive.files
        .where((entry) => entry.isFile)
        .toList(growable: false);
    final manifestEntries = fileEntries
        .where((entry) => entry.name == sheetSetlistPackageManifestFileName)
        .toList(growable: false);
    if (manifestEntries.isEmpty) {
      throw const FormatException('Setlist package manifest is missing.');
    }
    if (manifestEntries.length > 1) {
      throw const FormatException(
        'Setlist package contains more than one manifest.',
      );
    }

    final manifestText = utf8.decode(manifestEntries.single.content);
    final manifest = SheetSetlistShareManifest.tryParse(manifestText);
    if (manifest == null) {
      throw const FormatException(
        'Setlist package manifest is not a Clef setlist manifest.',
      );
    }

    final stampPackEntries = fileEntries
        .where((entry) => entry.name == sheetSetlistPackageUserStampsFileName)
        .toList(growable: false);
    if (stampPackEntries.length > 1) {
      throw const FormatException(
        'Setlist package contains more than one user stamp metadata file.',
      );
    }

    final paths = <String>{};
    final packageFiles = <SheetSetlistPackageFile>[];
    final stampAssetFiles = <SheetSetlistPackageStampAssetFile>[];
    for (final entry in fileEntries) {
      final path = entry.name.trim();
      if (path == sheetSetlistPackageManifestFileName ||
          path == sheetSetlistPackageUserStampsFileName) {
        continue;
      }
      if (_isSafePackageScoreZipEntryPath(path)) {
        if (!paths.add(path)) {
          throw FormatException('Duplicate setlist package entry: $path');
        }
        packageFiles.add(
          SheetSetlistPackageFile(
            path: path,
            mediaType: _mediaTypeForScoreFile(path),
            bytes: Uint8List.fromList(entry.content),
          ),
        );
        continue;
      }
      if (_isSafePackageStampAssetZipEntryPath(path)) {
        if (!paths.add(path)) {
          throw FormatException('Duplicate setlist package entry: $path');
        }
        stampAssetFiles.add(
          SheetSetlistPackageStampAssetFile(
            path: path,
            mediaType: _mediaTypeForStampAssetFile(path),
            bytes: Uint8List.fromList(entry.content),
          ),
        );
        continue;
      }
      if (!_isSafePackageScoreZipEntryPath(path)) {
        throw FormatException('Unsafe setlist package entry: $path');
      }
    }
    final stampAssetRefs = {for (final asset in stampAssetFiles) asset.path};
    final userStampPacks = stampPackEntries.isEmpty
        ? const <SheetAnnotationStampPack>[]
        : _decodeUserStampPacks(
            stampPackEntries.single.content,
            allowImageStamps: true,
            availableImageAssetRefs: stampAssetRefs,
          );

    return SheetSetlistPackageArchive(
      manifest: manifest,
      packageFiles: List<SheetSetlistPackageFile>.unmodifiable(packageFiles),
      userStampPacks: userStampPacks,
      stampAssetFiles: List<SheetSetlistPackageStampAssetFile>.unmodifiable(
        stampAssetFiles,
      ),
    );
  }

  static Uint8List encodeBytes({
    required String manifestText,
    required Map<String, List<int>> scoreFiles,
    List<SheetAnnotationStampPack> userStampPacks =
        const <SheetAnnotationStampPack>[],
    Map<String, List<int>> stampAssetFiles = const <String, List<int>>{},
  }) {
    final manifest = SheetSetlistShareManifest.tryParse(manifestText);
    if (manifest == null) {
      throw const FormatException(
        'Setlist package manifest is not a Clef setlist manifest.',
      );
    }

    final archive = Archive();
    archive.addFile(
      ArchiveFile.string(sheetSetlistPackageManifestFileName, manifestText),
    );
    final normalizedStampAssetFiles = _normalizePackageStampAssetFiles(
      stampAssetFiles,
    );
    final normalizedStampPacks = _normalizePackageUserStampPacks(
      userStampPacks,
      allowImageStamps: normalizedStampAssetFiles.isNotEmpty,
      availableImageAssetRefs: normalizedStampAssetFiles.keys.toSet(),
    );
    if (normalizedStampPacks.isNotEmpty) {
      archive.addFile(
        ArchiveFile.string(
          sheetSetlistPackageUserStampsFileName,
          const JsonEncoder.withIndent('  ').convert(
            normalizedStampPacks
                .map((pack) => pack.toJson())
                .toList(growable: false),
          ),
        ),
      );
    }
    final referencedStampAssetRefs = _imageStampAssetRefs(normalizedStampPacks);
    final paths = <String>{};
    for (final entry in scoreFiles.entries) {
      final path = entry.key.trim().replaceAll('\\', '/');
      if (!_isSafePackageScoreZipEntryPath(path)) {
        throw FormatException('Unsafe setlist package entry: $path');
      }
      if (!paths.add(path)) {
        throw FormatException('Duplicate setlist package entry: $path');
      }
      archive.addFile(ArchiveFile.bytes(path, entry.value));
    }
    for (final entry in normalizedStampAssetFiles.entries) {
      final path = entry.key;
      if (!referencedStampAssetRefs.contains(path)) {
        continue;
      }
      if (!paths.add(path)) {
        throw FormatException('Duplicate setlist package entry: $path');
      }
      archive.addFile(ArchiveFile.bytes(path, entry.value));
    }
    return Uint8List.fromList(ZipEncoder().encode(archive));
  }

  static Future<SheetSetlistPackageExportResult> exportSetlistBytes({
    required SheetSetlist setlist,
    required List<SheetScore> scores,
    required Future<List<int>?> Function(SheetScore score) readScoreBytes,
    Future<List<int>?> Function(SheetScore score, SheetLinkedFile originalDocx)?
    readOriginalDocxBytes,
    List<SheetAnnotationStampPack> userStampPacks =
        const <SheetAnnotationStampPack>[],
    Future<List<int>?> Function(String assetRef)? readUserStampAssetBytes,
  }) async {
    final orderedScores = _scoresInSetlistOrder(setlist, scores);
    if (orderedScores.isEmpty) {
      return SheetSetlistPackageExportResult(
        manifestText: _setlistPackageManifestText(setlist, orderedScores),
        missingScores: const <SheetScore>[],
        unsupportedScores: const <SheetScore>[],
      );
    }

    final scoreFiles = <String, List<int>>{};
    final entryPathBySourcePath = <String, String>{};
    final usedEntryPaths = <String>{};
    final missingScores = <SheetScore>[];
    final unsupportedScores = <SheetScore>[];
    final packageFileNames = <String, String>{};

    for (final score in orderedScores) {
      final originalDocx = _originalDocxReference(score);
      final sourcePath = originalDocx?.path.trim() ?? score.filePath.trim();
      final sourceFileName = originalDocx == null
          ? score.sourceFileDisplayName
          : _docxReferenceFileName(originalDocx);
      if (originalDocx != null) {
        packageFileNames[score.id] = sourceFileName;
      }
      if (entryPathBySourcePath.containsKey(sourcePath)) {
        continue;
      }
      final extension = _fileExtension(
        originalDocx == null ? score.filePath : sourceFileName,
      );
      final safeEntryPath = _scorePackageEntryPath(
        score,
        sourceFileName: sourceFileName,
        extension: extension,
        usedEntryPaths: usedEntryPaths,
      );
      if (!SheetSetlistPackageFile(path: safeEntryPath).isSupportedScoreFile) {
        unsupportedScores.add(score);
        continue;
      }

      if (originalDocx != null && readOriginalDocxBytes == null) {
        unsupportedScores.add(score);
        continue;
      }
      final bytes = originalDocx == null
          ? await readScoreBytes(score)
          : await readOriginalDocxBytes!(score, originalDocx);
      if (bytes == null) {
        missingScores.add(score);
        continue;
      }
      entryPathBySourcePath[sourcePath] = safeEntryPath;
      scoreFiles[safeEntryPath] = bytes;
    }

    final manifestText = _setlistPackageManifestText(
      setlist,
      orderedScores,
      packageFileNames: packageFileNames,
    );

    if (missingScores.isNotEmpty || unsupportedScores.isNotEmpty) {
      return SheetSetlistPackageExportResult(
        manifestText: manifestText,
        missingScores: List<SheetScore>.unmodifiable(missingScores),
        unsupportedScores: List<SheetScore>.unmodifiable(unsupportedScores),
      );
    }
    final stampAssetFiles = <String, List<int>>{};
    if (readUserStampAssetBytes != null) {
      for (final assetRef in _imageStampAssetRefs(userStampPacks)) {
        final bytes = await readUserStampAssetBytes(assetRef);
        if (bytes != null) {
          stampAssetFiles[assetRef] = bytes;
        }
      }
    }

    return SheetSetlistPackageExportResult(
      bytes: encodeBytes(
        manifestText: manifestText,
        scoreFiles: scoreFiles,
        userStampPacks: userStampPacks,
        stampAssetFiles: stampAssetFiles,
      ),
      manifestText: manifestText,
      includedFileCount: scoreFiles.length,
      includedUserStampPackCount: _normalizePackageUserStampPacks(
        userStampPacks,
        allowImageStamps: stampAssetFiles.isNotEmpty,
        availableImageAssetRefs: stampAssetFiles.keys.toSet(),
      ).length,
      includedUserStampAssetCount: _normalizePackageStampAssetFiles(
        stampAssetFiles,
      ).length,
      missingScores: const <SheetScore>[],
      unsupportedScores: const <SheetScore>[],
    );
  }
}

class SheetSetlistPackageExportResult {
  const SheetSetlistPackageExportResult({
    required this.manifestText,
    required this.missingScores,
    required this.unsupportedScores,
    this.bytes,
    this.includedFileCount = 0,
    this.includedUserStampPackCount = 0,
    this.includedUserStampAssetCount = 0,
  });

  final Uint8List? bytes;
  final String manifestText;
  final int includedFileCount;
  final int includedUserStampPackCount;
  final int includedUserStampAssetCount;
  final List<SheetScore> missingScores;
  final List<SheetScore> unsupportedScores;

  bool get didExport =>
      bytes != null && missingScores.isEmpty && unsupportedScores.isEmpty;

  String get failureReason {
    if (didExport) {
      return '';
    }
    if (missingScores.isNotEmpty) {
      return '원본 파일을 찾을 수 없는 악보가 있습니다: ${missingScores.map((score) => score.displayTitle).join(', ')}';
    }
    if (unsupportedScores.isNotEmpty) {
      return '패키지로 묶을 수 없는 파일 형식이 있습니다: ${unsupportedScores.map((score) => score.displayTitle).join(', ')}';
    }
    return '세트리스트에 내보낼 악보가 없습니다.';
  }
}

class SheetSetlistPackageStampAssetFile {
  const SheetSetlistPackageStampAssetFile({
    required this.path,
    this.mediaType = '',
    this.bytes,
  });

  final String path;
  final String mediaType;
  final Uint8List? bytes;

  String get fileName => _fileName(path);
}

class SheetSetlistPackageFile {
  const SheetSetlistPackageFile({
    required this.path,
    String? displayName,
    this.mediaType = '',
    this.bytes,
  }) : displayName = displayName ?? '';

  final String path;
  final String displayName;
  final String mediaType;
  final Uint8List? bytes;

  String get fileName {
    final explicit = displayName.trim();
    if (explicit.isNotEmpty) {
      return explicit;
    }
    return _fileName(path);
  }

  SheetSetlistPackageScoreKind get scoreKind =>
      SheetSetlistPackageScoreKind.forFileName(fileName);

  bool get isSupportedScoreFile =>
      scoreKind != SheetSetlistPackageScoreKind.unsupported;

  bool get isPdf => scoreKind == SheetSetlistPackageScoreKind.pdf;

  bool get isImage => scoreKind == SheetSetlistPackageScoreKind.image;

  bool get isPlainText => scoreKind == SheetSetlistPackageScoreKind.plainText;

  bool get isChordPro => scoreKind == SheetSetlistPackageScoreKind.chordPro;

  bool get isDocx => scoreKind == SheetSetlistPackageScoreKind.docx;

  String get validationFailure {
    final content = bytes;
    if (content == null) {
      return '';
    }
    if (scoreKind == SheetSetlistPackageScoreKind.docx) {
      try {
        SheetDocxTextExtractor.extract(content);
        return '';
      } on FormatException catch (error) {
        return 'DOCX 파일을 읽을 수 없습니다: ${error.message}';
      }
    }
    if (!scoreKind.isTextScore) return '';
    if (content.isEmpty) {
      return '텍스트 파일이 비어 있습니다.';
    }
    if (content.length > SheetFileImportPolicy.maxPlainTextBytes) {
      return '텍스트 파일이 2 MiB 제한을 초과합니다.';
    }
    try {
      final source = utf8.decode(content);
      if (source.trim().isEmpty) {
        return '텍스트 파일에 읽을 내용이 없습니다.';
      }
    } on FormatException {
      return '텍스트 파일이 올바른 UTF-8 형식이 아닙니다.';
    }
    return '';
  }
}

enum SheetSetlistPackageScoreKind {
  pdf('PDF'),
  image('이미지'),
  plainText('텍스트'),
  chordPro('ChordPro'),
  docx('DOCX'),
  unsupported('지원하지 않음');

  const SheetSetlistPackageScoreKind(this.label);

  final String label;

  bool get isTextScore => this == plainText || this == chordPro;

  static SheetSetlistPackageScoreKind forFileName(String fileName) {
    if (SheetFileImportPolicy.isPdfFileName(fileName)) return pdf;
    if (SheetFileImportPolicy.isSupportedImageFileName(fileName)) return image;
    if (SheetFileImportPolicy.isPlainTextFileName(fileName)) return plainText;
    if (SheetFileImportPolicy.isChordProFileName(fileName)) return chordPro;
    if (SheetFileImportPolicy.isDocxFileName(fileName)) return docx;
    return unsupported;
  }
}

class SheetSetlistPackageDryRun {
  const SheetSetlistPackageDryRun({
    required this.manifest,
    required this.entries,
    this.packageFiles = const <SheetSetlistPackageFile>[],
    this.userStampPacks = const <SheetAnnotationStampPack>[],
    this.stampAssetFiles = const <SheetSetlistPackageStampAssetFile>[],
    this.userStampPreview = const SheetSetlistPackageUserStampPreview.empty(),
  });

  final SheetSetlistShareManifest manifest;
  final List<SheetSetlistPackageEntry> entries;
  final List<SheetSetlistPackageFile> packageFiles;
  final List<SheetAnnotationStampPack> userStampPacks;
  final List<SheetSetlistPackageStampAssetFile> stampAssetFiles;
  final SheetSetlistPackageUserStampPreview userStampPreview;

  factory SheetSetlistPackageDryRun.preview({
    required SheetSetlistShareManifest manifest,
    required List<SheetScore> currentScores,
    required List<SheetSetlistPackageFile> packageFiles,
    List<SheetAnnotationStampPack> userStampPacks =
        const <SheetAnnotationStampPack>[],
    List<SheetSetlistPackageStampAssetFile> stampAssetFiles =
        const <SheetSetlistPackageStampAssetFile>[],
    List<SheetAnnotationStampPack> currentUserStampPacks =
        const <SheetAnnotationStampPack>[],
  }) {
    final existingPreview = manifest.matchScores(currentScores);
    final matches = existingPreview.matches;
    final stampAssetRefs = {for (final asset in stampAssetFiles) asset.path};
    final normalizedUserStampPacks = _normalizePackageUserStampPacks(
      userStampPacks,
      allowImageStamps: stampAssetFiles.isNotEmpty,
      availableImageAssetRefs: stampAssetRefs,
    );
    return SheetSetlistPackageDryRun(
      manifest: manifest,
      packageFiles: List<SheetSetlistPackageFile>.unmodifiable(packageFiles),
      userStampPacks: normalizedUserStampPacks,
      stampAssetFiles: List<SheetSetlistPackageStampAssetFile>.unmodifiable(
        stampAssetFiles,
      ),
      userStampPreview: SheetSetlistPackageUserStampPreview.compare(
        importedPacks: normalizedUserStampPacks,
        currentPacks: currentUserStampPacks,
        importedImageAssetRefs: stampAssetRefs,
      ),
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

class SheetSetlistPackageUserStampPreview {
  const SheetSetlistPackageUserStampPreview({
    required this.packCount,
    required this.totalStampCount,
    required this.newPackCount,
    required this.newStampCount,
    required this.duplicateStampCount,
  });

  const SheetSetlistPackageUserStampPreview.empty()
    : packCount = 0,
      totalStampCount = 0,
      newPackCount = 0,
      newStampCount = 0,
      duplicateStampCount = 0;

  factory SheetSetlistPackageUserStampPreview.compare({
    required List<SheetAnnotationStampPack> importedPacks,
    required List<SheetAnnotationStampPack> currentPacks,
    Set<String> importedImageAssetRefs = const <String>{},
  }) {
    final currentImageAssetRefs = _imageStampAssetRefs(currentPacks);
    final currentById = {
      for (final pack in _normalizePackageUserStampPacks(
        currentPacks,
        allowImageStamps: currentImageAssetRefs.isNotEmpty,
        availableImageAssetRefs: currentImageAssetRefs,
      ))
        pack.id: pack,
    };
    var totalStampCount = 0;
    var newPackCount = 0;
    var newStampCount = 0;
    var duplicateStampCount = 0;
    for (final pack in _normalizePackageUserStampPacks(
      importedPacks,
      allowImageStamps: importedImageAssetRefs.isNotEmpty,
      availableImageAssetRefs: importedImageAssetRefs,
    )) {
      totalStampCount += pack.stamps.length;
      final current = currentById[pack.id];
      if (current == null) {
        newPackCount += 1;
        newStampCount += pack.stamps.length;
        continue;
      }
      final currentStampIds = {for (final stamp in current.stamps) stamp.id};
      for (final stamp in pack.stamps) {
        if (currentStampIds.contains(stamp.id)) {
          duplicateStampCount += 1;
        } else {
          newStampCount += 1;
        }
      }
    }
    return SheetSetlistPackageUserStampPreview(
      packCount: importedPacks.length,
      totalStampCount: totalStampCount,
      newPackCount: newPackCount,
      newStampCount: newStampCount,
      duplicateStampCount: duplicateStampCount,
    );
  }

  final int packCount;
  final int totalStampCount;
  final int newPackCount;
  final int newStampCount;
  final int duplicateStampCount;

  bool get hasStamps => totalStampCount > 0;
  bool get hasDuplicates => duplicateStampCount > 0;
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
      case SheetSetlistPackageEntryStatus.invalidFile:
        return '${_displayFileReference(item)}: ${packageFile?.validationFailure ?? '파일을 읽을 수 없습니다.'}';
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
    if (file.validationFailure.isNotEmpty) {
      return SheetSetlistPackageEntry(
        item: item,
        status: SheetSetlistPackageEntryStatus.invalidFile,
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
  invalidFile,
}

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

List<SheetScore> _scoresInSetlistOrder(
  SheetSetlist setlist,
  List<SheetScore> scores,
) {
  final scoresById = <String, SheetScore>{
    for (final score in scores) score.id: score,
  };
  return [
    for (final scoreId in setlist.scoreIds)
      if (scoresById[scoreId] != null) scoresById[scoreId]!,
  ];
}

List<SheetAnnotationStampPack> _decodeUserStampPacks(
  List<int> bytes, {
  bool allowImageStamps = false,
  Set<String> availableImageAssetRefs = const <String>{},
}) {
  try {
    final decoded = jsonDecode(utf8.decode(bytes));
    if (decoded is! List) {
      return const <SheetAnnotationStampPack>[];
    }
    return _normalizePackageUserStampPacks(
      decoded
          .whereType<Map>()
          .map(
            (json) => SheetAnnotationStampPack.fromJson(
              json.map((key, value) => MapEntry(key.toString(), value)),
            ),
          )
          .toList(growable: false),
      allowImageStamps: allowImageStamps,
      availableImageAssetRefs: availableImageAssetRefs,
    );
  } catch (_) {
    return const <SheetAnnotationStampPack>[];
  }
}

List<SheetAnnotationStampPack> _normalizePackageUserStampPacks(
  List<SheetAnnotationStampPack> packs, {
  bool allowImageStamps = false,
  Set<String> availableImageAssetRefs = const <String>{},
}) {
  final normalized = <SheetAnnotationStampPack>[];
  final seenPackIds = <String>{};
  for (final pack in packs) {
    if (!seenPackIds.add(pack.id)) {
      continue;
    }
    final filteredStamps = <SheetAnnotationUserStamp>[
      for (final stamp in pack.stamps)
        if (stamp.kind != SheetAnnotationUserStamp.imageKind ||
            (allowImageStamps &&
                availableImageAssetRefs.contains(stamp.assetRef)))
          stamp,
    ];
    if (filteredStamps.isEmpty) {
      continue;
    }
    final filteredPack = SheetAnnotationStampPack(
      id: pack.id,
      name: pack.name,
      version: pack.version,
      createdAt: pack.createdAt,
      updatedAt: pack.updatedAt,
      stamps: List<SheetAnnotationUserStamp>.unmodifiable(filteredStamps),
    );
    if (!filteredPack.validate(allowImageStamps: allowImageStamps).isValid) {
      continue;
    }
    normalized.add(filteredPack);
  }
  return List<SheetAnnotationStampPack>.unmodifiable(normalized);
}

Map<String, List<int>> _normalizePackageStampAssetFiles(
  Map<String, List<int>> stampAssetFiles,
) {
  final normalized = <String, List<int>>{};
  for (final entry in stampAssetFiles.entries) {
    final path = entry.key.trim().replaceAll('\\', '/');
    if (!_isSafePackageStampAssetZipEntryPath(path) || entry.value.isEmpty) {
      continue;
    }
    normalized[path] = List<int>.unmodifiable(entry.value);
  }
  return Map<String, List<int>>.unmodifiable(normalized);
}

Set<String> _imageStampAssetRefs(List<SheetAnnotationStampPack> packs) {
  return {
    for (final pack in packs)
      for (final stamp in pack.stamps)
        if (stamp.kind == SheetAnnotationUserStamp.imageKind)
          stamp.assetRef.trim().replaceAll('\\', '/'),
  }..remove('');
}

String _setlistPackageManifestText(
  SheetSetlist setlist,
  List<SheetScore> scores, {
  Map<String, String> packageFileNames = const <String, String>{},
}) {
  final buffer = StringBuffer()
    ..writeln('Clef & Staff 세트리스트')
    ..writeln('제목: ${setlist.title}')
    ..writeln(
      setlist.totalEstimatedSeconds > 0
          ? '곡 수: ${scores.length}곡 · 총 ${_formatDuration(setlist.totalEstimatedSeconds)}'
          : '곡 수: ${scores.length}곡',
    );
  if (setlist.transitionSeconds > 0 && scores.length > 1) {
    buffer.writeln('전환 ${_formatDuration(setlist.transitionSeconds)}');
  }
  buffer.writeln();

  for (var index = 0; index < scores.length; index += 1) {
    final score = scores[index];
    buffer.writeln('${index + 1}. ${score.displayTitle}');
    for (final detail in _setlistPackageManifestDetails(
      setlist,
      score,
      packageFileName: packageFileNames[score.id],
    )) {
      buffer.writeln('   $detail');
    }
  }
  return buffer.toString().trimRight();
}

List<String> _setlistPackageManifestDetails(
  SheetSetlist setlist,
  SheetScore score, {
  String? packageFileName,
}) {
  final composer = score.composer.trim();
  final note = setlist.scoreNotes[score.id]?.trim();
  final duration = setlist.scoreDurations[score.id] ?? 0;
  final collection = score.collection.trim();
  final group = score.group.trim();
  final scoreNote = score.note.trim();
  final metadata = <String>[
    if (composer.isNotEmpty) '작곡가: $composer',
    '파일: ${packageFileName ?? score.sourceFileDisplayName}',
    '형식: ${SheetSetlistPackageScoreKind.forFileName(packageFileName ?? score.filePath).label}',
    '시작: ${setlist.scoreStartPages[score.id] ?? score.lastPage}쪽',
    if (duration > 0) '예상 시간: ${_formatDuration(duration)}',
    if (note?.isNotEmpty == true) '세트 메모: $note',
    if (scoreNote.isNotEmpty) '악보 메모: $scoreNote',
    if (score.tags.isNotEmpty) '태그: ${score.tags.join(', ')}',
    if (collection.isNotEmpty) '컬렉션: $collection',
    if (group.isNotEmpty) '그룹: $group',
    if (score.rating > 0) '별점: ${score.rating}/5',
  ];
  for (final field in score.customFields) {
    metadata.add('${field.key}: ${field.value}');
  }
  final metronome =
      setlist.scoreMetronomeSettings[score.id] ?? score.metronomeSettings;
  if (metronome != null) {
    metadata.add('메트로놈: ${_formatMetronomeSettings(metronome)}');
  }
  return metadata;
}

String _scorePackageEntryPath(
  SheetScore score, {
  String? sourceFileName,
  required String extension,
  required Set<String> usedEntryPaths,
}) {
  final fallbackStem = score.id.trim().isEmpty ? 'score' : score.id.trim();
  final stemSource = sourceFileName == null
      ? score.sourceFileDisplayName
      : _removeFileExtension(sourceFileName, extension);
  final stem = _safePackageFileStem(stemSource, fallbackStem);
  final safeExtension = extension.isEmpty ? '.pdf' : extension;
  var path = '$sheetSetlistPackageScoreDirectory$stem$safeExtension';
  var suffix = 2;
  while (usedEntryPaths.contains(path)) {
    path = '$sheetSetlistPackageScoreDirectory$stem-$suffix$safeExtension';
    suffix += 1;
  }
  usedEntryPaths.add(path);
  return path;
}

String _removeFileExtension(String fileName, String extension) {
  if (extension.isEmpty ||
      !fileName.toLowerCase().endsWith(extension.toLowerCase())) {
    return fileName;
  }
  return fileName.substring(0, fileName.length - extension.length);
}

String _safePackageFileStem(String value, String fallback) {
  final sanitized = value
      .trim()
      .replaceAll(RegExp(r'[\\/:*?"<>|]+'), '-')
      .replaceAll(RegExp(r'\s+'), ' ')
      .replaceAll(RegExp(r'^-+|-+$'), '')
      .trim();
  if (sanitized.isEmpty || sanitized == '.' || sanitized == '..') {
    return fallback;
  }
  return sanitized;
}

String _formatMetronomeSettings(SheetMetronomeSettings settings) {
  final parts = <String>[
    '${settings.bpm} BPM',
    settings.meter.label,
    if (settings.subdivision != SheetMetronomeSubdivision.none)
      settings.subdivision.label,
    settings.soundEnabled ? '소리 ${settings.volumePercent}%' : '시각만',
    if (settings.countInBars > 0) '카운트인 ${settings.countInBars}마디',
  ];
  return parts.join(' · ');
}

String _formatDuration(int seconds) {
  if (seconds <= 0) {
    return '시간 없음';
  }
  final minutes = seconds ~/ 60;
  final remainingSeconds = seconds % 60;
  if (minutes == 0) {
    return '$remainingSeconds초';
  }
  if (remainingSeconds == 0) {
    return '$minutes분';
  }
  return '$minutes분 $remainingSeconds초';
}

bool _isSafePackageScoreZipEntryPath(String path) {
  return path.startsWith(sheetSetlistPackageScoreDirectory) &&
      !path.contains('..') &&
      !path.startsWith('/') &&
      !path.contains('\\') &&
      _fileName(path).isNotEmpty;
}

bool _isSafePackageStampAssetZipEntryPath(String path) {
  return path.startsWith(sheetSetlistPackageStampAssetDirectory) &&
      !path.contains('..') &&
      !path.startsWith('/') &&
      !path.contains('\\') &&
      _fileName(path).isNotEmpty &&
      SheetAnnotationStampPack.allowedImageAssetExtensions.contains(
        _fileExtension(path).replaceFirst('.', ''),
      );
}

String _mediaTypeForScoreFile(String path) {
  switch (SheetSetlistPackageScoreKind.forFileName(path)) {
    case SheetSetlistPackageScoreKind.pdf:
      return 'application/pdf';
    case SheetSetlistPackageScoreKind.image:
      return _fileExtension(path) == '.png' ? 'image/png' : 'image/jpeg';
    case SheetSetlistPackageScoreKind.plainText:
      return 'text/plain';
    case SheetSetlistPackageScoreKind.chordPro:
      return 'text/vnd.chordpro';
    case SheetSetlistPackageScoreKind.docx:
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case SheetSetlistPackageScoreKind.unsupported:
      return '';
  }
}

SheetLinkedFile? _originalDocxReference(SheetScore score) {
  for (final linkedFile in score.linkedFiles) {
    if (linkedFile.role == SheetLinkedFile.referenceRole &&
        (linkedFile.type.toLowerCase() == 'docx' ||
            SheetFileImportPolicy.isDocxFileName(linkedFile.path))) {
      return linkedFile;
    }
  }
  return null;
}

String _docxReferenceFileName(SheetLinkedFile file) {
  final label = file.label.trim();
  if (SheetFileImportPolicy.isDocxFileName(label)) return _fileName(label);
  final pathName = _fileName(file.path);
  if (SheetFileImportPolicy.isDocxFileName(pathName)) return pathName;
  return 'score.docx';
}

String _mediaTypeForStampAssetFile(String path) {
  switch (_fileExtension(path)) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
  }
  return '';
}
