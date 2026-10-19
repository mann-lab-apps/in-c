import 'dart:convert';
import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_file_import.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_setlist_manifest.dart';
import 'package:in_c_sheet/sheet_setlist_package.dart';

void main() {
  test('supported score label includes every package document type', () {
    expect(
      sheetSetlistPackageSupportedScoreKindsLabel,
      'PDF/JPG/PNG/텍스트/ChordPro/DOCX/RTF',
    );
  });

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
   파일: chart.pages
4. No File
''');

    final dryRun = SheetSetlistPackageDryRun.preview(
      manifest: manifest!,
      currentScores: const <SheetScore>[],
      packageFiles: const [
        SheetSetlistPackageFile(path: 'scores/duplicate.pdf'),
        SheetSetlistPackageFile(path: 'extras/duplicate.pdf'),
        SheetSetlistPackageFile(path: 'scores/chart.pages'),
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
        '지원하지 않는 패키지 파일 형식: chart.pages',
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

  test('codec classifies plain text and ChordPro package scores', () {
    final zip = SheetSetlistPackageArchive.encodeBytes(
      manifestText: '''
Clef & Staff 세트리스트
제목: Text Package
곡 수: 2곡

1. Lesson Notes
   파일: lesson-notes.md
2. Autumn Song
   파일: autumn-song.chordpro
''',
      scoreFiles: <String, List<int>>{
        'scores/lesson-notes.md': utf8.encode('Practice slowly.'),
        'scores/autumn-song.chordpro': utf8.encode('''
{title: Autumn Song}
{artist: Kim}
[Am]Falling [F]leaves
'''),
      },
    );

    final package = SheetSetlistPackageArchive.decodeBytes(zip);
    final dryRun = package.previewImport(currentScores: const <SheetScore>[]);

    expect(package.packageFiles.map((file) => file.scoreKind), [
      SheetSetlistPackageScoreKind.plainText,
      SheetSetlistPackageScoreKind.chordPro,
    ]);
    expect(package.packageFiles.map((file) => file.mediaType), [
      'text/plain',
      'text/vnd.chordpro',
    ]);
    expect(dryRun.canImport, isTrue);
    expect(dryRun.importableFileCount, 2);
  });

  test('codec validates DOCX package scores before import', () {
    final manifest = '''
Clef & Staff 세트리스트
제목: DOCX Package
곡 수: 1곡

1. Studio Notes
   파일: studio-notes.docx
''';
    final validPackage = SheetSetlistPackageArchive.decodeBytes(
      SheetSetlistPackageArchive.encodeBytes(
        manifestText: manifest,
        scoreFiles: <String, List<int>>{
          'scores/studio-notes.docx': _docxBytes('Practice slowly.'),
        },
      ),
    );
    final validDryRun = validPackage.previewImport(
      currentScores: const <SheetScore>[],
    );

    expect(
      validPackage.packageFiles.single.scoreKind,
      SheetSetlistPackageScoreKind.docx,
    );
    expect(
      validPackage.packageFiles.single.mediaType,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(validDryRun.canImport, isTrue);

    final invalidPackage = SheetSetlistPackageArchive.decodeBytes(
      SheetSetlistPackageArchive.encodeBytes(
        manifestText: manifest,
        scoreFiles: const <String, List<int>>{
          'scores/studio-notes.docx': <int>[1, 2, 3],
        },
      ),
    );
    final invalidDryRun = invalidPackage.previewImport(
      currentScores: const <SheetScore>[],
    );
    expect(
      invalidDryRun.entries.single.status,
      SheetSetlistPackageEntryStatus.invalidFile,
    );
    expect(invalidDryRun.warnings.single, contains('DOCX 파일을 읽을 수 없습니다'));
  });

  test('codec validates RTF package scores before import', () {
    final manifest = '''
Clef & Staff 세트리스트
제목: RTF Package
곡 수: 1곡

1. Rehearsal Notes
   파일: rehearsal-notes.rtf
''';
    final validPackage = SheetSetlistPackageArchive.decodeBytes(
      SheetSetlistPackageArchive.encodeBytes(
        manifestText: manifest,
        scoreFiles: <String, List<int>>{
          'scores/rehearsal-notes.rtf': latin1.encode(
            r'{\rtf1\ansi Practice\par slowly}',
          ),
        },
      ),
    );
    final validDryRun = validPackage.previewImport(
      currentScores: const <SheetScore>[],
    );

    expect(
      validPackage.packageFiles.single.scoreKind,
      SheetSetlistPackageScoreKind.rtf,
    );
    expect(validPackage.packageFiles.single.mediaType, 'application/rtf');
    expect(validDryRun.canImport, isTrue);

    final invalidPackage = SheetSetlistPackageArchive.decodeBytes(
      SheetSetlistPackageArchive.encodeBytes(
        manifestText: manifest,
        scoreFiles: <String, List<int>>{
          'scores/rehearsal-notes.rtf': latin1.encode('plain text'),
        },
      ),
    );
    final invalidDryRun = invalidPackage.previewImport(
      currentScores: const <SheetScore>[],
    );
    expect(
      invalidDryRun.entries.single.status,
      SheetSetlistPackageEntryStatus.invalidFile,
    );
    expect(invalidDryRun.warnings.single, contains('RTF 파일을 읽을 수 없습니다'));
  });

  test('dry run rejects invalid packaged text before import', () {
    final manifest = SheetSetlistShareManifest.tryParse('''
Clef & Staff 세트리스트
제목: Invalid Text
곡 수: 3곡

1. Empty
   파일: empty.txt
2. Malformed
   파일: malformed.md
3. Oversized
   파일: oversized.chordpro
''')!;
    final dryRun = SheetSetlistPackageDryRun.preview(
      manifest: manifest,
      currentScores: const <SheetScore>[],
      packageFiles: <SheetSetlistPackageFile>[
        SheetSetlistPackageFile(path: 'scores/empty.txt', bytes: Uint8List(0)),
        SheetSetlistPackageFile(
          path: 'scores/malformed.md',
          bytes: Uint8List.fromList(<int>[0xc3, 0x28]),
        ),
        SheetSetlistPackageFile(
          path: 'scores/oversized.chordpro',
          bytes: Uint8List(SheetFileImportPolicy.maxPlainTextBytes + 1),
        ),
      ],
    );

    expect(dryRun.canImport, isFalse);
    expect(
      dryRun.entries.map((entry) => entry.status),
      everyElement(SheetSetlistPackageEntryStatus.invalidFile),
    );
    expect(dryRun.warnings.join('\n'), contains('비어 있습니다'));
    expect(dryRun.warnings.join('\n'), contains('UTF-8'));
    expect(dryRun.warnings.join('\n'), contains('2 MiB'));
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
    final dryRunWithExisting = package.previewImport(
      currentScores: const <SheetScore>[],
      currentUserStampPacks: [
        SheetAnnotationStampPack(
          id: 'user',
          name: '사용자 스탬프',
          version: 1,
          createdAt: DateTime(2026, 10, 1, 12),
          updatedAt: DateTime(2026, 10, 1, 12),
          stamps: const <SheetAnnotationUserStamp>[
            SheetAnnotationUserStamp(
              id: 'repeat-cue',
              packId: 'user',
              label: 'Local repeat cue',
              category: '사용자',
              kind: SheetAnnotationUserStamp.iconKind,
              iconName: 'repeat',
            ),
          ],
        ),
      ],
    );

    expect(package.userStampPacks, hasLength(1));
    expect(package.userStampPacks.single.stamps.map((stamp) => stamp.id), [
      'bow-cue',
      'repeat-cue',
    ]);
    expect(dryRun.userStampPacks.single.stamps.last.iconName, 'repeat');
    expect(dryRun.userStampPreview.packCount, 1);
    expect(dryRun.userStampPreview.totalStampCount, 2);
    expect(dryRun.userStampPreview.newPackCount, 1);
    expect(dryRun.userStampPreview.newStampCount, 2);
    expect(dryRun.userStampPreview.duplicateStampCount, 0);
    expect(dryRunWithExisting.userStampPreview.newPackCount, 0);
    expect(dryRunWithExisting.userStampPreview.newStampCount, 1);
    expect(dryRunWithExisting.userStampPreview.duplicateStampCount, 1);
  });

  test('codec preserves image user stamp metadata with asset bytes', () {
    final stampPack = SheetAnnotationStampPack(
      id: 'photos',
      name: '사진 스탬프',
      version: 1,
      createdAt: DateTime(2026, 10, 8, 12),
      updatedAt: DateTime(2026, 10, 8, 12),
      stamps: const <SheetAnnotationUserStamp>[
        SheetAnnotationUserStamp(
          id: 'photo-cue',
          packId: 'photos',
          label: 'Photo cue',
          category: '사용자',
          kind: SheetAnnotationUserStamp.imageKind,
          assetRef: 'stamps/photos/photo-cue.png',
          checksum: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          assetSizeBytes: 3,
          assetWidthPixels: 16,
          assetHeightPixels: 16,
          licenseLabel: 'User provided',
        ),
      ],
    );
    final zip = SheetSetlistPackageArchive.encodeBytes(
      manifestText: '''
Clef & Staff 세트리스트
제목: Image Stamp Package
곡 수: 1곡

1. Existing Etude
   파일: existing-etude.pdf
''',
      scoreFiles: const <String, List<int>>{},
      userStampPacks: [stampPack],
      stampAssetFiles: const <String, List<int>>{
        'stamps/photos/photo-cue.png': [1, 2, 3],
      },
    );

    final package = SheetSetlistPackageArchive.decodeBytes(zip);
    final dryRun = package.previewImport(currentScores: const <SheetScore>[]);

    expect(package.stampAssetFiles, hasLength(1));
    expect(package.stampAssetFiles.single.path, 'stamps/photos/photo-cue.png');
    expect(package.stampAssetFiles.single.mediaType, 'image/png');
    expect(package.stampAssetFiles.single.bytes, [1, 2, 3]);
    expect(package.userStampPacks, hasLength(1));
    expect(
      package.userStampPacks.single.stamps.single.kind,
      SheetAnnotationUserStamp.imageKind,
    );
    expect(dryRun.stampAssetFiles, hasLength(1));
    expect(dryRun.userStampPreview.totalStampCount, 1);
  });

  test('codec drops image user stamp metadata when asset is missing', () {
    final stampPack = SheetAnnotationStampPack(
      id: 'photos',
      name: '사진 스탬프',
      version: 1,
      createdAt: DateTime(2026, 10, 8, 12),
      updatedAt: DateTime(2026, 10, 8, 12),
      stamps: const <SheetAnnotationUserStamp>[
        SheetAnnotationUserStamp(
          id: 'photo-cue',
          packId: 'photos',
          label: 'Photo cue',
          category: '사용자',
          kind: SheetAnnotationUserStamp.imageKind,
          assetRef: 'stamps/photos/photo-cue.png',
          checksum: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          assetSizeBytes: 3,
          assetWidthPixels: 16,
          assetHeightPixels: 16,
        ),
      ],
    );
    final zip = SheetSetlistPackageArchive.encodeBytes(
      manifestText: '''
Clef & Staff 세트리스트
제목: Missing Image Stamp Asset
곡 수: 1곡

1. Existing Etude
   파일: existing-etude.pdf
''',
      scoreFiles: const <String, List<int>>{},
      userStampPacks: [stampPack],
    );

    final package = SheetSetlistPackageArchive.decodeBytes(zip);

    expect(package.stampAssetFiles, isEmpty);
    expect(package.userStampPacks, isEmpty);
  });

  test('codec skips unsafe optional user stamp metadata', () {
    final archive = Archive()
      ..addFile(
        ArchiveFile.string(sheetSetlistPackageManifestFileName, '''
Clef & Staff 세트리스트
제목: Stamp Safety
곡 수: 1곡

1. Existing Etude
   파일: existing-etude.pdf
'''),
      )
      ..addFile(
        ArchiveFile.string(
          sheetSetlistPackageUserStampsFileName,
          jsonEncode(<Map<String, Object?>>[
            <String, Object?>{
              'id': 'rehearsal',
              'name': 'Rehearsal',
              'stamps': const <Map<String, Object?>>[
                <String, Object?>{
                  'id': 'cue',
                  'label': 'Cue',
                  'kind': 'text',
                  'text': 'CUE',
                },
              ],
            },
            <String, Object?>{
              'id': 'rehearsal',
              'name': 'Duplicate Rehearsal',
              'stamps': const <Map<String, Object?>>[
                <String, Object?>{
                  'id': 'other',
                  'label': 'Other',
                  'kind': 'text',
                  'text': 'OTHER',
                },
              ],
            },
            <String, Object?>{
              'id': 'unsafe-icon',
              'name': 'Unsafe Icon',
              'stamps': const <Map<String, Object?>>[
                <String, Object?>{
                  'id': 'rocket',
                  'label': 'Rocket',
                  'kind': 'icon',
                  'iconName': 'rocket',
                },
              ],
            },
            <String, Object?>{
              'id': 'reserved-image',
              'name': 'Reserved Image',
              'stamps': const <Map<String, Object?>>[
                <String, Object?>{
                  'id': 'photo',
                  'label': 'Photo',
                  'kind': 'image',
                  'assetRef': 'stamps/photo.png',
                },
              ],
            },
          ]),
        ),
      );
    final zip = ZipEncoder().encode(archive);

    final package = SheetSetlistPackageArchive.decodeBytes(zip);
    final dryRun = package.previewImport(currentScores: const <SheetScore>[]);

    expect(package.userStampPacks, hasLength(1));
    expect(package.userStampPacks.single.id, 'rehearsal');
    expect(package.userStampPacks.single.stamps.single.text, 'CUE');
    expect(dryRun.userStampPreview.packCount, 1);
    expect(dryRun.userStampPreview.totalStampCount, 1);
    expect(dryRun.userStampPreview.newStampCount, 1);
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

  test('export preserves text score extensions and manifest kinds', () async {
    final now = DateTime(2026, 10, 20, 10);
    final scores = <SheetScore>[
      _score(id: 'notes', title: 'Lesson Notes', filePath: '/library/notes.md'),
      _score(
        id: 'song',
        title: 'Autumn Song',
        filePath: '/library/autumn.onsong',
      ),
    ];
    final setlist = SheetSetlist(
      id: 'text-set',
      title: 'Text Set',
      scoreIds: const <String>['notes', 'song'],
      createdAt: now,
      updatedAt: now,
    );

    final result = await SheetSetlistPackageArchive.exportSetlistBytes(
      setlist: setlist,
      scores: scores,
      readScoreBytes: (score) async => utf8.encode(
        score.id == 'notes' ? 'Practice slowly.' : '{title: Autumn Song}',
      ),
    );

    expect(result.didExport, isTrue);
    expect(result.manifestText, contains('형식: 텍스트'));
    expect(result.manifestText, contains('형식: ChordPro'));
    final package = SheetSetlistPackageArchive.decodeBytes(result.bytes!);
    expect(package.packageFiles.map((file) => file.path), [
      'scores/notes.md',
      'scores/autumn.onsong',
    ]);
  });

  test('export preserves a DOCX original instead of extracted text', () async {
    final now = DateTime(2026, 10, 20, 14);
    final bytes = _docxBytes('Studio notes');
    final score = _score(
      id: 'docx-score',
      title: 'Studio Notes',
      filePath: '/library/studio-notes.txt',
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/library/original.docx',
          type: 'docx',
          label: 'studio-notes.docx',
          role: SheetLinkedFile.referenceRole,
          createdAt: now,
        ),
      ],
    );
    final setlist = SheetSetlist(
      id: 'docx-set',
      title: 'DOCX Set',
      scoreIds: const <String>['docx-score'],
      createdAt: now,
      updatedAt: now,
    );

    final result = await SheetSetlistPackageArchive.exportSetlistBytes(
      setlist: setlist,
      scores: <SheetScore>[score],
      readScoreBytes: (_) async => utf8.encode('extracted text'),
      readOriginalDocxBytes: (_, _) async => bytes,
    );

    expect(result.didExport, isTrue);
    expect(result.manifestText, contains('파일: studio-notes.docx'));
    expect(result.manifestText, contains('형식: DOCX'));
    final package = SheetSetlistPackageArchive.decodeBytes(result.bytes!);
    expect(package.packageFiles.single.path, 'scores/studio-notes.docx');
    expect(package.packageFiles.single.bytes, bytes);
  });

  test('export preserves an RTF original instead of extracted text', () async {
    final now = DateTime(2026, 10, 20, 16);
    final bytes = latin1.encode(r'{\rtf1\ansi Studio notes}');
    final score = _score(
      id: 'rtf-score',
      title: 'Studio Notes',
      filePath: '/library/studio-notes.txt',
      linkedFiles: <SheetLinkedFile>[
        SheetLinkedFile(
          path: '/library/original.rtf',
          type: 'rtf',
          label: 'studio-notes.rtf',
          role: SheetLinkedFile.referenceRole,
          createdAt: now,
        ),
      ],
    );
    final setlist = SheetSetlist(
      id: 'rtf-set',
      title: 'RTF Set',
      scoreIds: const <String>['rtf-score'],
      createdAt: now,
      updatedAt: now,
    );

    final result = await SheetSetlistPackageArchive.exportSetlistBytes(
      setlist: setlist,
      scores: <SheetScore>[score],
      readScoreBytes: (_) async => utf8.encode('extracted text'),
      readOriginalRtfBytes: (_, _) async => bytes,
    );

    expect(result.didExport, isTrue);
    expect(result.manifestText, contains('파일: studio-notes.rtf'));
    expect(result.manifestText, contains('형식: RTF'));
    final package = SheetSetlistPackageArchive.decodeBytes(result.bytes!);
    expect(package.packageFiles.single.path, 'scores/studio-notes.rtf');
    expect(package.packageFiles.single.bytes, bytes);
  });

  test(
    'export package includes image user stamp assets when readable',
    () async {
      final now = DateTime(2026, 10, 8, 15);
      final score = _score(
        id: 'goedicke',
        title: 'Goedicke Concert Etude',
        filePath: '/library/goedicke-concert-etude.pdf',
      );
      final setlist = SheetSetlist(
        id: 'recital',
        title: 'Image Stamp Recital',
        scoreIds: const ['goedicke'],
        createdAt: now,
        updatedAt: now,
      );
      final stampPack = SheetAnnotationStampPack(
        id: 'photos',
        name: '사진 스탬프',
        version: 1,
        createdAt: now,
        updatedAt: now,
        stamps: const <SheetAnnotationUserStamp>[
          SheetAnnotationUserStamp(
            id: 'photo-cue',
            packId: 'photos',
            label: 'Photo cue',
            category: '사용자',
            kind: SheetAnnotationUserStamp.imageKind,
            assetRef: 'stamps/photos/photo-cue.png',
            checksum: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            assetSizeBytes: 3,
            assetWidthPixels: 16,
            assetHeightPixels: 16,
          ),
        ],
      );

      final result = await SheetSetlistPackageArchive.exportSetlistBytes(
        setlist: setlist,
        scores: [score],
        readScoreBytes: (_) async => [9, 8, 7],
        userStampPacks: [stampPack],
        readUserStampAssetBytes: (assetRef) async =>
            assetRef == 'stamps/photos/photo-cue.png' ? [1, 2, 3] : null,
      );

      expect(result.didExport, isTrue);
      expect(result.includedUserStampPackCount, 1);
      expect(result.includedUserStampAssetCount, 1);
      final package = SheetSetlistPackageArchive.decodeBytes(result.bytes!);
      expect(
        package.userStampPacks.single.stamps.single.assetRef,
        'stamps/photos/photo-cue.png',
      );
      expect(package.stampAssetFiles.single.bytes, [1, 2, 3]);
    },
  );

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
  List<SheetLinkedFile> linkedFiles = const <SheetLinkedFile>[],
}) {
  final now = DateTime(2026, 9, 28, 15);
  return SheetScore(
    id: id,
    title: title,
    composer: composer,
    tags: const <String>[],
    note: '',
    filePath: filePath ?? '/tmp/$id.pdf',
    linkedFiles: linkedFiles,
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: 1,
    isFavorite: false,
    bookmarks: const <SheetBookmark>[],
  );
}

Uint8List _docxBytes(String text) {
  final archive = Archive()
    ..addFile(
      ArchiveFile.string(
        'word/document.xml',
        '<w:document xmlns:w="urn:word"><w:body><w:p><w:r><w:t>${htmlEscape.convert(text)}</w:t></w:r></w:p></w:body></w:document>',
      ),
    );
  return Uint8List.fromList(ZipEncoder().encode(archive));
}
