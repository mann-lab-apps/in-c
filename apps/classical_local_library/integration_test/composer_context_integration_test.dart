import 'dart:io';
import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/composer_library.dart';
import 'package:classical_local_library/composer_management.dart';
import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/library_deduplication.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:classical_local_library/sample_classical_library.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'native composer period IMSLP context survives restart without changing actual audio queue',
    (t) async {
      final dir = await (await getTemporaryDirectory()).createTemp(
        'composer-context-',
      );
      final bytes = await rootBundle.load('assets/audio_test/movement_1.flac');
      final file = await File('${dir.path}/fixture.flac').writeAsBytes(
        bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
      );
      final files = [
        LocalAudioFile(
          id: 'context-file',
          path: file.path,
          format: 'flac',
          tagMetadata: const AudioTagMetadata(
            title: '자체 제작 음원',
            composer: 'Alias Composer',
          ),
        ),
      ];
      var db = await ClassicalLocalDatabase(path: '${dir.path}/context.sqlite')
          .open();
      final player = JustAudioLocalPlaybackController();
      addTearDown(() async {
        await player.dispose();
        if (db.isOpen) await db.close();
        await dir.delete(recursive: true);
      });
      await SqliteScannedAudioStore(db).save(files);
      var catalog = ClassicalCatalogRepository(SqliteClassicalCatalogStore(db));
      final repo = ComposerRepository(catalog);
      var library = await repo.saveComposer(
        files: files,
        name: '확인한 작곡가',
        original: 'Confirmed Composer',
        aliases: ['Alias Composer'],
        source: '자체 제작 fixture',
        period: PeriodAssessment(
          eras: [MusicEra.baroque, MusicEra.classical],
          source: 'fixture 활동 시대',
          certainty: PeriodCertainty.estimated,
        ),
      );
      final composerId = library.people.single.id;
      library = await repo.connectFile(
        files: files,
        fileId: files.single.id,
        personId: composerId,
      );
      expect(library.works, isEmpty);
      expect(library.recordings, isEmpty);
      final entries = const LocalFileLibrary().entries(
        files: files,
        library: library,
      );
      expect(entries.single.period.eras, [
        MusicEra.baroque,
        MusicEra.classical,
      ]);
      await player.loadQueue(const LocalFileLibrary().queue(entries));
      await player.play();
      await t.pump(const Duration(milliseconds: 150));
      await player.pause();
      await player.seek(const Duration(milliseconds: 400));
      final before = player.playbackState;
      final item = before.currentItem!;
      await db.insert('playback_history', {
        'session_id': 'direct-fixture',
        'track_id': item.trackId,
        'recording_id': item.recordingId,
        'work_id': item.workId,
        'path': file.path,
        'work_title': item.workTitle,
        'recording_title': item.recordingTitle,
        'track_title': item.displayTitle,
        'started_at_millis': 1,
        'last_played_at_millis': 2,
        'status': 'completed',
      });
      await db.close();
      db = await ClassicalLocalDatabase(path: '${dir.path}/context.sqlite')
          .open();
      final reopened = SqliteClassicalCatalogStore(db);
      expect(
        await reopened.bootstrapLegacyReferences(sampleClassicalLibrary),
        isFalse,
      );
      catalog = ClassicalCatalogRepository(reopened);
      library = await catalog.load(files);
      expect(library.people.single.id, composerId);
      expect(library.works, isEmpty);
      library = copyCatalog(
        library,
        works: [
          Work(
            id: 'confirmed-work',
            composerId: composerId,
            title: const LocalizedName(ko: '확인한 작품', sortName: 'Work'),
            periodLabel: '사용자 옛 입력',
            periodAssessment: PeriodAssessment(
              eras: [MusicEra.romantic],
              source: 'fixture 작품 시대',
            ),
          ),
        ],
      );
      await catalog.save(library);
      final imslp = SqliteImslpStore(db);
      await imslp.upsertWorkLink(
        const ImslpWorkLink(
          workId: 'confirmed-work',
          externalId: 'Fixture_Work',
          pageUrl: 'https://imslp.org/wiki/Fixture_Work',
          workTitle: 'Fixture Work',
          linkedAtMillis: 1,
        ),
      );
      final backup = await LibraryBackupService(database: db).exportJson();
      final corrupted = jsonDecode(backup) as Map<String, Object?>;
      final data = corrupted['data']! as Map<String, Object?>;
      (data['catalog_people']! as List).single['name_json'] = '{';
      final backupService = LibraryBackupService(database: db);
      await expectLater(
        () => backupService.previewImport(jsonEncode(corrupted)),
        throwsA(isA<LibraryBackupException>()),
      );
      await expectLater(
        () => backupService.importJson(jsonEncode(corrupted)),
        throwsA(isA<LibraryBackupException>()),
      );
      expect(await db.rawQuery('PRAGMA integrity_check'), [
        {'integrity_check': 'ok'},
      ]);
      await db.close();
      db = await ClassicalLocalDatabase(path: '${dir.path}/context.sqlite')
          .open();
      library = await SqliteClassicalCatalogStore(db).load(files);
      expect(
        ComposerNames(library).forFile(files.single.id, 'Alias Composer'),
        composerId,
      );
      expect(library.works.single.periodLabel, '사용자 옛 입력');
      expect(library.works.single.periodAssessment!.source, 'fixture 작품 시대');
      expect(
        (await SqliteImslpStore(db).loadWorkLinks()).single.workId,
        'confirmed-work',
      );
      expect(player.playbackState.queue, same(before.queue));
      expect(player.playbackState.currentIndex, before.currentIndex);
      expect(player.playbackState.playerState, before.playerState);
      expect(
        (player.playbackState.position - before.position).inMilliseconds.abs(),
        lessThan(120),
      );
      final restored = await ClassicalLocalDatabase(
        path: '${dir.path}/restored.sqlite',
      ).open();
      try {
        await LibraryBackupService(database: restored).importJson(backup);
        final copy = await SqliteClassicalCatalogStore(restored)
            .load(await SqliteScannedAudioStore(restored).load());
        expect(copy.people.single.composerProfile!.confirmedFileIds, [
          files.single.id,
        ]);
        expect(copy.works.single.periodAssessment!.eras, [MusicEra.romantic]);
        expect(await restored.rawQuery('PRAGMA foreign_key_check'), isEmpty);
      } finally {
        await restored.close();
      }
      expect(
        (await db.query(
          'schema_migrations',
          orderBy: 'version DESC',
          limit: 1,
        )).single['version'],
        19,
      );
      await _verifyPortableMerge(dir, files.single);
    },
    timeout: const Timeout(Duration(minutes: 3)),
  );
}

Future<void> _verifyPortableMerge(
  Directory directory,
  LocalAudioFile file,
) async {
  final source = await ClassicalLocalDatabase(
    path: '${directory.path}/merge-source.sqlite',
  ).open();
  var target = await ClassicalLocalDatabase(
    path: '${directory.path}/merge-target.sqlite',
  ).open();
  final originalBytes = await File(file.path).readAsBytes();
  try {
    await SqliteScannedAudioStore(source).save([file]);
    final name = jsonEncode({'ko': '합성 검증', 'sortName': 'Fixture'});
    await source.insert('catalog_people', {
      'id': 'composer',
      'name_json': name,
      'origin': 'user',
    });
    for (final id in ['w1', 'w2']) {
      await source.insert('catalog_works', {
        'id': id,
        'composer_id': 'composer',
        'title_json': name,
        'source_references_json': '[]',
        'origin': 'user',
      });
    }
    await source.insert('catalog_recordings', {
      'id': 'r',
      'work_id': 'w1',
      'title_json': name,
      'source_references_json': '[]',
      'origin': 'user',
    });
    await source.insert('catalog_tracks', {
      'id': 't',
      'recording_id': 'r',
      'file_id': file.id,
      'sequence_number': 1,
      'work_part_ids_json': '[]',
    });
    await source.insert('playback_history', {
      'session_id': 'h',
      'track_id': 't',
      'recording_id': 'r',
      'work_id': 'w1',
      'path': file.path,
      'work_title': '합성 작품',
      'recording_title': '합성 녹음',
      'track_title': '합성 곡',
      'started_at_millis': 1,
      'last_played_at_millis': 2,
      'status': 'partial',
    });
    await SqliteLibraryMergeStore(source).merge(
      const LibraryEntityMerge(
        id: 'm',
        entityType: LibraryEntityType.work,
        sourceId: 'w1',
        targetId: 'w2',
        sourceLabel: '합성 작품',
        targetLabel: '대표 합성 작품',
        mergedAtMillis: 10,
        evidence: [],
      ),
    );
    final backup = await LibraryBackupService(database: source).exportJson();
    expect(backup, isNot(contains(file.path)));
    await LibraryBackupService(database: target).importJson(backup);
    await target.close();
    target = await ClassicalLocalDatabase(
      path: '${directory.path}/merge-target.sqlite',
    ).open();
    await SqliteLibraryMergeStore(target).undo('m', 20);
    expect((await target.query('playback_history')).single['work_id'], 'w1');
    expect(
      (await target.query('playback_history')).single['path'],
      'ddirori-backup://missing/${Uri.encodeComponent(file.id)}',
    );
    final store = LibraryBackupService(database: target);
    expect((await store.previewImport(await store.exportJson())).conflicts, 0);
    expect(await target.rawQuery('PRAGMA foreign_key_check'), isEmpty);
    expect(await target.rawQuery('PRAGMA integrity_check'), [
      {'integrity_check': 'ok'},
    ]);
    expect(await File(file.path).readAsBytes(), originalBytes);
  } finally {
    await source.close();
    if (target.isOpen) await target.close();
  }
}
