import 'dart:io';

import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late Directory tempDir;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('classical_scan_test_');
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('지원 확장자만 오디오 후보로 인식하고 비오디오 파일은 무시한다', () async {
    await File('${tempDir.path}/01 Allegro.FLAC').writeAsString('audio-a');
    await File('${tempDir.path}/02 Andante.mp3').writeAsString('audio-b');
    await File('${tempDir.path}/cover.jpg').writeAsString('image');
    await File('${tempDir.path}/notes.txt').writeAsString('text');
    final nested = await Directory('${tempDir.path}/nested').create();
    await File('${nested.path}/03 Scherzo.opus').writeAsString('audio-c');

    final scanner = _scanner();
    final files = await scanner.scan(tempDir.path);

    expect(files.map((file) => file.fileName), [
      '01 Allegro.FLAC',
      '02 Andante.mp3',
      '03 Scherzo.opus',
    ]);
    expect(
      files.every((file) => file.importStatus == AudioImportStatus.needsReview),
      isTrue,
    );
    expect(files.map((file) => file.format), ['FLAC', 'MP3', 'OPUS']);
    expect(files.every((file) => file.sizeBytes != null), isTrue);
    expect(files.every((file) => file.modifiedAtMillis != null), isTrue);
  });

  test('스캔된 파일은 needsReview 상태로 저장되고 다시 읽을 수 있다', () async {
    await File('${tempDir.path}/Moonlight 1.m4a').writeAsString('audio');

    final scanner = _scanner();
    final scanned = await scanner.scan(tempDir.path);
    final storeFile = File('${tempDir.path}/scan-store.json');
    final repository = ScannedAudioRepository(JsonScannedAudioStore(storeFile));

    final saved = await repository.mergeScanned(scanned);
    final loaded = await repository.load();

    expect(saved, hasLength(1));
    expect(loaded, hasLength(1));
    expect(loaded.single.fileName, 'Moonlight 1.m4a');
    expect(loaded.single.importStatus, AudioImportStatus.needsReview);
    expect(loaded.single.sourceReferences.single.kind, SourceKind.localTag);
  });

  test('저장소는 같은 경로를 다시 스캔하면 중복 대신 갱신한다', () async {
    final file = File('${tempDir.path}/same.wav');
    await file.writeAsString('audio-a');

    final scanner = _scanner();
    final repository = ScannedAudioRepository(
      JsonScannedAudioStore(File('${tempDir.path}/scan-store.json')),
    );

    await repository.mergeScanned(await scanner.scan(tempDir.path));
    await file.writeAsString('audio-a-longer');
    final merged = await repository.mergeScanned(
      await scanner.scan(tempDir.path),
    );

    expect(merged, hasLength(1));
    expect(merged.single.fileName, 'same.wav');
    expect(merged.single.sizeBytes, greaterThan(7));
  });

  test('스캔 결과에 태그와 파일 지문, 마지막 확인 시각을 보존한다', () async {
    await File('${tempDir.path}/01 Allegro.flac').writeAsString('audio');
    final scanner = FileSystemAudioFileScanner(
      tagReader: const _TagReader(
        AudioTagReadResult.read(
          AudioTagMetadata(
            title: 'Allegro',
            album: 'Symphony No. 5',
            trackNumber: 1,
          ),
        ),
      ),
      clock: _fixedNow,
    );

    final file = (await scanner.scan(tempDir.path)).single;

    expect(file.tagReadStatus, AudioTagReadStatus.read);
    expect(file.tagMetadata?.album, 'Symphony No. 5');
    expect(file.lightweightFingerprint, isNotNull);
    expect(file.lastSeenAtMillis, _fixedNow().millisecondsSinceEpoch);
  });

  test('고유 지문으로 이동을 판정하면 파일 ID와 연결 상태를 유지한다', () async {
    final original = _observed('/Music/old/01.flac', id: 'stable-file')
        .copyWith(
          importStatus: AudioImportStatus.linked,
          sourceReferences: const [
            SourceReference(
              kind: SourceKind.imslp,
              externalId: 'resource-1',
              url: 'https://imslp.org/wiki/Test',
            ),
          ],
        );
    final repository = ScannedAudioRepository(
      MemoryScannedAudioStore([original]),
    );

    final result = await repository.reconcileScan(
      [_observed('/Music/new/01.flac')],
      rootPath: '/Music',
      scannedAt: _fixedNow(),
    );

    expect(result.movedCount, 1);
    expect(result.newCount, 0);
    expect(result.files.single.id, 'stable-file');
    expect(result.files.single.path, '/Music/new/01.flac');
    expect(result.files.single.importStatus, AudioImportStatus.linked);
    expect(
      result.files.single.sourceReferences.single.externalId,
      'resource-1',
    );
  });

  test('누락은 두 번 연속 확인 후 확정하고 재등장하면 복구한다', () async {
    final original = _observed('/Music/01.flac', id: 'stable-file');
    final repository = ScannedAudioRepository(
      MemoryScannedAudioStore([original]),
    );

    final first = await repository.reconcileScan(const [], rootPath: '/Music');
    final second = await repository.reconcileScan(const [], rootPath: '/Music');
    final restored = await repository.reconcileScan([
      _observed('/Music/01.flac'),
    ], rootPath: '/Music');

    expect(first.files.single.availability, AudioFileAvailability.present);
    expect(first.files.single.consecutiveMissCount, 1);
    expect(second.files.single.availability, AudioFileAvailability.missing);
    expect(second.missingCount, 1);
    expect(restored.files.single.availability, AudioFileAvailability.present);
    expect(restored.files.single.consecutiveMissCount, 0);
  });

  test('같은 지문 후보가 여러 개면 자동 이동으로 합치지 않는다', () async {
    final repository = ScannedAudioRepository(
      MemoryScannedAudioStore([
        _observed('/Music/a.flac', id: 'a'),
        _observed('/Music/b.flac', id: 'b'),
      ]),
    );

    final result = await repository.reconcileScan([
      _observed('/Music/c.flac', id: 'c'),
    ], rootPath: '/Music');

    expect(result.ambiguousCount, 1);
    expect(result.movedCount, 0);
    expect(result.newCount, 1);
    expect(result.files.map((file) => file.id), containsAll(['a', 'b', 'c']));
  });

  test('수동 재연결은 누락 파일 ID를 유지하고 대체 행을 합친다', () async {
    final repository = ScannedAudioRepository(
      MemoryScannedAudioStore([
        _observed('/Music/missing.flac', id: 'old').copyWith(
          availability: AudioFileAvailability.missing,
          importStatus: AudioImportStatus.linked,
          sourceReferences: const [
            SourceReference(
              kind: SourceKind.imslp,
              externalId: 'resource-1',
              url: 'https://imslp.org/wiki/Test',
            ),
          ],
        ),
        _observed('/Music/found.flac', id: 'replacement'),
      ]),
    );

    final files = await repository.reconnectMissingFile(
      missingFileId: 'old',
      replacementFileId: 'replacement',
    );

    expect(files, hasLength(1));
    expect(files.single.id, 'old');
    expect(files.single.path, '/Music/found.flac');
    expect(files.single.importStatus, AudioImportStatus.linked);
    expect(files.single.availability, AudioFileAvailability.present);
    expect(files.single.sourceReferences.single.externalId, 'resource-1');
  });
}

DateTime _fixedNow() => DateTime.utc(2026, 10, 19, 12);

FileSystemAudioFileScanner _scanner() => const FileSystemAudioFileScanner(
  tagReader: _TagReader(AudioTagReadResult.noTags()),
);

class _TagReader extends AudioTagReader {
  const _TagReader(this.result);

  final AudioTagReadResult result;

  @override
  Future<AudioTagReadResult> read(String path) async => result;
}

LocalAudioFile _observed(String path, {String? id}) {
  return LocalAudioFile(
    id: id ?? scannedAudioId(path),
    path: path,
    fileName: fileNameForPath(path),
    format: 'FLAC',
    sizeBytes: 100,
    modifiedAtMillis: 200,
    lightweightFingerprint: '100:200',
    importStatus: AudioImportStatus.needsReview,
  );
}
