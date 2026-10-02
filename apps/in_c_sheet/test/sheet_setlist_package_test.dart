import 'package:archive/archive.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_setlist_manifest.dart';
import 'package:in_c_sheet/sheet_setlist_package.dart';

void main() {
  test('dry run separates existing scores from package files', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Package Recital
곡 수: 3곡

1. Existing Etude
   작곡가: Goedicke
   파일: existing-etude.pdf
2. New Sonata
   작곡가: Mozart
   파일: new-sonata.pdf
3. New Image Score
   파일: scans/new-image-score.png
''');

    final dryRun = SheetSetlistPackageDryRun.preview(
      manifest: manifest!,
      currentScores: [
        _score(
          id: 'existing',
          title: 'Existing Etude',
          composer: 'Goedicke',
          filePath: '/library/existing-etude.pdf',
        ),
      ],
      packageFiles: const [
        SheetSetlistPackageFile(path: 'scores/new-sonata.pdf'),
        SheetSetlistPackageFile(path: 'scores/scans/new-image-score.png'),
      ],
    );

    expect(dryRun.canImport, isTrue);
    expect(dryRun.existingScoreCount, 1);
    expect(dryRun.importableFileCount, 2);
    expect(dryRun.unresolvedCount, 0);
    expect(dryRun.entries.map((entry) => entry.status), [
      SheetSetlistPackageEntryStatus.existingScore,
      SheetSetlistPackageEntryStatus.importableFile,
      SheetSetlistPackageEntryStatus.importableFile,
    ]);
    expect(dryRun.entries.first.existingScore?.id, 'existing');
    expect(dryRun.entries[1].packageFile?.path, 'scores/new-sonata.pdf');
    expect(
      dryRun.entries[2].packageFile?.path,
      'scores/scans/new-image-score.png',
    );
    expect(dryRun.warnings, isEmpty);
  });

  test('dry run reports missing, duplicate and unsupported package files', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Risky Package
곡 수: 4곡

1. Missing
   파일: missing.pdf
2. Duplicate
   파일: duplicate.pdf
3. Unsupported
   파일: chart.docx
4. No File
''');

    final dryRun = SheetSetlistPackageDryRun.preview(
      manifest: manifest!,
      currentScores: const <SheetScore>[],
      packageFiles: const [
        SheetSetlistPackageFile(path: 'scores/duplicate.pdf'),
        SheetSetlistPackageFile(path: 'extras/duplicate.pdf'),
        SheetSetlistPackageFile(path: 'scores/chart.docx'),
      ],
    );

    expect(dryRun.canImport, isFalse);
    expect(dryRun.existingScoreCount, 0);
    expect(dryRun.importableFileCount, 0);
    expect(dryRun.unresolvedCount, 4);
    expect(dryRun.entries.map((entry) => entry.status), [
      SheetSetlistPackageEntryStatus.missingFile,
      SheetSetlistPackageEntryStatus.duplicatePackageFile,
      SheetSetlistPackageEntryStatus.unsupportedFile,
      SheetSetlistPackageEntryStatus.missingFile,
    ]);
    expect(
      dryRun.warnings,
      containsAll([
        '패키지에서 찾을 수 없는 파일: missing.pdf',
        '패키지에 같은 이름의 파일이 여러 개 있습니다: duplicate.pdf',
        '지원하지 않는 패키지 파일 형식: chart.docx',
        '패키지에서 찾을 수 없는 파일: No File',
      ]),
    );
  });

  test(
    'dry run keeps ambiguous library matches unresolved before file import',
    () {
      final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Ambiguous Package
곡 수: 1곡

1. Sonata
   파일: sonata.pdf
''');

      final dryRun = SheetSetlistPackageDryRun.preview(
        manifest: manifest!,
        currentScores: [
          _score(id: 'mozart', title: 'Sonata', composer: 'Mozart'),
          _score(id: 'beethoven', title: 'Sonata', composer: 'Beethoven'),
        ],
        packageFiles: const [
          SheetSetlistPackageFile(path: 'scores/sonata.pdf'),
        ],
      );

      expect(dryRun.canImport, isFalse);
      expect(
        dryRun.entries.single.status,
        SheetSetlistPackageEntryStatus.ambiguousExistingScore,
      );
      expect(dryRun.entries.single.candidates.map((score) => score.id), [
        'mozart',
        'beethoven',
      ]);
      expect(dryRun.importableFileCount, 0);
      expect(dryRun.warnings, contains('여러 기존 악보와 일치하는 곡: Sonata'));
    },
  );

  test('dry run inherits manifest validation failures', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Count Mismatch
곡 수: 2곡

1. Only One
   파일: only-one.pdf
''');

    final dryRun = SheetSetlistPackageDryRun.preview(
      manifest: manifest!,
      currentScores: const <SheetScore>[],
      packageFiles: const [
        SheetSetlistPackageFile(path: 'scores/only-one.pdf'),
      ],
    );

    expect(manifest.canPreviewImport, isFalse);
    expect(dryRun.canImport, isFalse);
    expect(dryRun.importableFileCount, 1);
    expect(dryRun.warnings, contains('곡 수와 항목 수가 다릅니다.'));
  });

  test('codec decodes ZIP package bytes and connects dry run', () {
    final zip = SheetSetlistPackageArchive.encodeBytes(
      manifestText: '''
Clef & Staff 세트리스트
제목: Package Recital
곡 수: 2곡

1. Existing Etude
   작곡가: Goedicke
   파일: existing-etude.pdf
2. New Sonata
   작곡가: Mozart
   파일: new-sonata.pdf
''',
      scoreFiles: const {
        'scores/new-sonata.pdf': [1, 2, 3],
      },
    );

    final package = SheetSetlistPackageArchive.decodeBytes(zip);
    final dryRun = package.previewImport(
      currentScores: [
        _score(
          id: 'existing',
          title: 'Existing Etude',
          composer: 'Goedicke',
          filePath: '/library/existing-etude.pdf',
        ),
      ],
    );

    expect(package.manifest.title, 'Package Recital');
    expect(package.packageFiles.single.path, 'scores/new-sonata.pdf');
    expect(package.packageFiles.single.mediaType, 'application/pdf');
    expect(package.packageFiles.single.bytes, [1, 2, 3]);
    expect(dryRun.canImport, isTrue);
    expect(dryRun.existingScoreCount, 1);
    expect(dryRun.importableFileCount, 1);
  });

  test('codec preserves optional text and icon user stamp metadata', () {
    final stampPack = SheetAnnotationStampPack(
      id: 'user',
      name: '사용자 스탬프',
      version: 1,
      createdAt: DateTime(2026, 10, 2, 12),
      updatedAt: DateTime(2026, 10, 2, 12),
      stamps: const <SheetAnnotationUserStamp>[
        SheetAnnotationUserStamp(
          id: 'bow-cue',
          packId: 'user',
          label: 'Bow cue',
          category: '사용자',
          kind: SheetAnnotationUserStamp.textKind,
          text: 'BOW',
        ),
        SheetAnnotationUserStamp(
          id: 'repeat-cue',
          packId: 'user',
          label: 'Repeat cue',
          category: '사용자',
          kind: SheetAnnotationUserStamp.iconKind,
          iconName: 'repeat',
        ),
      ],
    );
    final zip = SheetSetlistPackageArchive.encodeBytes(
      manifestText: '''
Clef & Staff 세트리스트
제목: Stamp Package
곡 수: 1곡

1. Existing Etude
   파일: existing-etude.pdf
''',
      scoreFiles: const <String, List<int>>{},
      userStampPacks: [stampPack],
    );

    final package = SheetSetlistPackageArchive.decodeBytes(zip);
    final dryRun = package.previewImport(currentScores: const <SheetScore>[]);

    expect(package.userStampPacks, hasLength(1));
    expect(package.userStampPacks.single.stamps.map((stamp) => stamp.id), [
      'bow-cue',
      'repeat-cue',
    ]);
    expect(dryRun.userStampPacks.single.stamps.last.iconName, 'repeat');
  });

  test('codec rejects packages without a Clef manifest', () {
    final archive = Archive()
      ..addFile(ArchiveFile.bytes('scores/new-sonata.pdf', [1, 2, 3]));
    final zip = ZipEncoder().encode(archive);

    expect(
      () => SheetSetlistPackageArchive.decodeBytes(zip),
      throwsA(
        isA<FormatException>().having(
          (error) => error.message,
          'message',
          contains('manifest is missing'),
        ),
      ),
    );
  });

  test('codec rejects unsafe score entry paths', () {
    final archive = Archive()
      ..addFile(
        ArchiveFile.string(sheetSetlistPackageManifestFileName, '''
Clef & Staff 세트리스트
제목: Unsafe Package
곡 수: 1곡

1. Unsafe
   파일: evil.pdf
'''),
      )
      ..addFile(ArchiveFile.bytes('scores/../evil.pdf', [1, 2, 3]));
    final zip = ZipEncoder().encode(archive);

    expect(
      () => SheetSetlistPackageArchive.decodeBytes(zip),
      throwsA(
        isA<FormatException>().having(
          (error) => error.message,
          'message',
          contains('Unsafe setlist package entry'),
        ),
      ),
    );
  });

  test('codec rejects non-Clef manifest content', () {
    final archive = Archive()
      ..addFile(
        ArchiveFile.string(sheetSetlistPackageManifestFileName, 'plain text'),
      )
      ..addFile(ArchiveFile.bytes('scores/etude.pdf', [1, 2, 3]));
    final zip = ZipEncoder().encode(archive);

    expect(
      () => SheetSetlistPackageArchive.decodeBytes(zip),
      throwsA(
        isA<FormatException>().having(
          (error) => error.message,
          'message',
          contains('not a Clef setlist manifest'),
        ),
      ),
    );
  });

  test('export package bytes round trip through codec and dry run', () async {
    final now = DateTime(2026, 9, 28, 15);
    final scores = [
      _score(
        id: 'goedicke',
        title: 'Goedicke Concert Etude',
        composer: 'Goedicke',
        filePath: '/library/goedicke-concert-etude.pdf',
      ),
      _score(
        id: 'mozart',
        title: 'Mozart Sonata K. 545',
        composer: 'Mozart',
        filePath: '/library/mozart-k545.pdf',
      ),
    ];
    final setlist = SheetSetlist(
      id: 'recital',
      title: 'Package Recital',
      scoreIds: const ['goedicke', 'mozart'],
      createdAt: now,
      updatedAt: now,
      scoreStartPages: const {'goedicke': 3},
      scoreNotes: const {'goedicke': 'mute ready'},
      scoreDurations: const {'goedicke': 210, 'mozart': 240},
      transitionSeconds: 10,
    );

    final result = await SheetSetlistPackageArchive.exportSetlistBytes(
      setlist: setlist,
      scores: scores,
      readScoreBytes: (score) async => [score.id.length],
    );

    expect(result.didExport, isTrue);
    expect(result.includedFileCount, 2);
    expect(result.manifestText, contains('제목: Package Recital'));
    expect(result.manifestText, contains('시작: 3쪽'));
    expect(result.manifestText, contains('세트 메모: mute ready'));

    final package = SheetSetlistPackageArchive.decodeBytes(result.bytes!);
    expect(package.packageFiles.map((file) => file.path), [
      'scores/concert-etude.pdf',
      'scores/k545.pdf',
    ]);
    final dryRun = package.previewImport(currentScores: const <SheetScore>[]);
    expect(dryRun.canImport, isTrue);
    expect(dryRun.importableFileCount, 2);
  });

  test('export stores a shared source file once', () async {
    final now = DateTime(2026, 9, 28, 15);
    final scores = [
      _score(
        id: 'song-a',
        title: 'Songbook A',
        filePath: '/library/songbook.pdf',
      ),
      _score(
        id: 'song-b',
        title: 'Songbook B',
        filePath: '/library/songbook.pdf',
      ),
    ];
    final setlist = SheetSetlist(
      id: 'songbook-set',
      title: 'Songbook Set',
      scoreIds: const ['song-a', 'song-b'],
      createdAt: now,
      updatedAt: now,
    );

    final result = await SheetSetlistPackageArchive.exportSetlistBytes(
      setlist: setlist,
      scores: scores,
      readScoreBytes: (_) async => [1, 2, 3],
    );

    expect(result.didExport, isTrue);
    expect(result.includedFileCount, 1);
    final package = SheetSetlistPackageArchive.decodeBytes(result.bytes!);
    expect(package.packageFiles, hasLength(1));
    expect(package.packageFiles.single.path, 'scores/songbook.pdf');
  });

  test('export reports missing source files without bytes', () async {
    final now = DateTime(2026, 9, 28, 15);
    final score = _score(id: 'missing', title: 'Missing');
    final setlist = SheetSetlist(
      id: 'missing-set',
      title: 'Missing Set',
      scoreIds: const ['missing'],
      createdAt: now,
      updatedAt: now,
    );

    final result = await SheetSetlistPackageArchive.exportSetlistBytes(
      setlist: setlist,
      scores: [score],
      readScoreBytes: (_) async => null,
    );

    expect(result.didExport, isFalse);
    expect(result.bytes, isNull);
    expect(result.missingScores.single.id, 'missing');
    expect(result.failureReason, contains('원본 파일을 찾을 수 없는 악보'));
  });

  test(
    'export reports unsupported source file formats without bytes',
    () async {
      final now = DateTime(2026, 9, 28, 15);
      final score = _score(
        id: 'midi',
        title: 'Registration',
        filePath: '/library/registration.mid',
      );
      final setlist = SheetSetlist(
        id: 'midi-set',
        title: 'MIDI Set',
        scoreIds: const ['midi'],
        createdAt: now,
        updatedAt: now,
      );

      final result = await SheetSetlistPackageArchive.exportSetlistBytes(
        setlist: setlist,
        scores: [score],
        readScoreBytes: (_) async => [1, 2, 3],
      );

      expect(result.didExport, isFalse);
      expect(result.bytes, isNull);
      expect(result.unsupportedScores.single.id, 'midi');
      expect(result.failureReason, contains('묶을 수 없는 파일 형식'));
    },
  );
}

SheetScore _score({
  required String id,
  required String title,
  String composer = '',
  String? filePath,
}) {
  final now = DateTime(2026, 9, 28, 15);
  return SheetScore(
    id: id,
    title: title,
    composer: composer,
    tags: const <String>[],
    note: '',
    filePath: filePath ?? '/tmp/$id.pdf',
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 1,
    isFavorite: false,
    bookmarks: const <SheetBookmark>[],
  );
}
