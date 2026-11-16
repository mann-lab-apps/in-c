import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_batch.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:flutter_test/flutter_test.dart';

import 'dart:io';

import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  setUpAll(sqfliteFfiInit);
  final entries = const LocalFileLibrary().entries(
    files: [
      for (final id in ['a', 'b', 'c'])
        LocalAudioFile(
          id: id,
          path: '/fixture/$id.wav',
          fileName: '$id.wav',
          format: 'wav',
        ),
    ],
  );
  test('filter selection and snapshots use IDs and full sorted results', () {
    final s = LibrarySongSelection()
      ..active = true
      ..selectAll(['a', 'c']);
    expect(s.snapshot(entries.reversed.toList()), ['c', 'a']);
    s.selectAll(['b']);
    final snapshot = s.snapshot(entries);
    s.toggle('a');
    expect(snapshot, ['a', 'b', 'c']);
    expect(s.ids, {'b', 'c'});
    expect(() => s.ids.add('x'), throwsUnsupportedError);
    s.finish();
    expect(s.active, isFalse);
    expect(s.ids, isEmpty);
  });
  test('empty, unknown, missing and unsupported queue entries are excluded honestly', () {
    final q = const LocalFileLibrary().queue(entries);
    final unavailable = const LocalFileLibrary().entries(
      files: [
        entries[0].file.copyWith(availability: AudioFileAvailability.missing),
        entries[1].file.copyWith(path: '/fixture/b.xyz'),
      ],
    );
    final state = LocalPlaybackState(
      playerState: LocalPlayerState.ready,
      queue: q,
      currentIndex: 0,
    );
    final snapshot = QueuePlaylistSnapshot.capture(
      state: state,
      entries: unavailable,
      links: [],
    );
    expect(snapshot.fileIds, isEmpty);
    expect(snapshot.excluded, 3);
    final empty = QueuePlaylistSnapshot.capture(
      state: const LocalPlaybackState(
        playerState: LocalPlayerState.idle,
        queue: [],
        currentIndex: 0,
      ),
      entries: entries,
      links: [],
    );
    expect(empty.fileIds, isEmpty);
    expect(empty.excluded, 0);
    final selection = LibrarySongSelection()..selectAll(['removed', 'a']);
    expect(selection.snapshot(entries), ['a', 'removed']);
    selection.clear();
    expect(selection.snapshot(entries), isEmpty);
  });
  test(
    'saved effective queue order survives SQLite reopen and logical backup',
    () async {
      final dir = await Directory.systemTemp.createTemp(
        'queue-playlist-backup-',
      );
      addTearDown(() => dir.delete(recursive: true));
      final path = '${dir.path}/source.sqlite';
      var db = await ClassicalLocalDatabase(
        path: path,
        factory: databaseFactoryFfi,
      ).open();
      final q = const LocalFileLibrary().queue(entries);
      final state = LocalPlaybackState(
        playerState: LocalPlayerState.paused,
        queue: [q[2], q[0], q[2], q[1]],
        currentIndex: 0,
        shuffleEnabled: true,
        queueOrder: [2, 0, 3, 1],
      );
      final snapshot = QueuePlaylistSnapshot.capture(
        state: state,
        entries: entries,
        links: [],
      );
      final repo = LocalPlaylistRepository(SqliteLocalPlaylistStore(db));
      final list = await repo.create(
        'snapshot',
        initialFileIds: snapshot.fileIds,
      );
      await repo.addFiles(list.id, ['b', 'a']);
      await db.close();
      db = await ClassicalLocalDatabase(
        path: path,
        factory: databaseFactoryFfi,
      ).open();
      addTearDown(db.close);
      expect((await SqliteLocalPlaylistStore(db).load()).single.fileIds, [
        'c',
        'a',
        'b',
      ]);
      final backup = await LibraryBackupService(database: db).exportJson();
      final restored = await ClassicalLocalDatabase(
        path: '${dir.path}/restored.sqlite',
        factory: databaseFactoryFfi,
      ).open();
      addTearDown(restored.close);
      await LibraryBackupService(database: restored).importJson(backup);
      expect((await SqliteLocalPlaylistStore(restored).load()).single.fileIds, [
        'c',
        'a',
        'b',
      ]);
      expect(state.queue, [q[2], q[0], q[2], q[1]]);
      expect(state.shuffleEnabled, isTrue);
    },
  );
  test(
    'queue saves effective order, mixed links, exclusions and first duplicates',
    () {
      final q = const LocalFileLibrary().queue(entries);
      final classical = LocalPlaybackQueueItem(
        trackId: 'movement',
        recordingId: 'recording',
        workId: 'work',
        displayTitle: 'linked',
        path: entries[1].file.path,
        usesLinkedFile: true,
        workTitle: '',
        recordingTitle: '',
      );
      final state = LocalPlaybackState(
        playerState: LocalPlayerState.paused,
        queue: [q[2], classical, q[2], q[0]],
        currentIndex: 1,
        shuffleEnabled: true,
        queueOrder: [2, 1, 3, 0],
      );
      final links = [
        const AudioFileTrackLink(
          fileId: 'b',
          trackId: 'movement',
          linkedAtMillis: 1,
        ),
      ];
      final whole = QueuePlaylistSnapshot.capture(
        state: state,
        entries: entries,
        links: links,
      );
      expect(whole.fileIds, ['c', 'b', 'a']);
      expect(whole.duplicates, 1);
      expect(
        QueuePlaylistSnapshot.capture(
          state: state,
          entries: entries,
          links: links,
          remaining: true,
        ).fileIds,
        ['b', 'c', 'a'],
      );
      final removed = QueuePlaylistSnapshot.capture(
        state: state,
        entries: entries.take(1).toList(),
        links: links,
      );
      expect(removed.fileIds, ['a']);
      expect(removed.excluded, 3);
      expect(
        QueuePlaylistSnapshot.capture(
          state: state.copyWith(
            currentIndex: 4,
            playerState: LocalPlayerState.completed,
          ),
          entries: entries,
          links: links,
          remaining: true,
        ).fileIds,
        isEmpty,
      );
      expect(state.currentIndex, 1);
      expect(state.shuffleEnabled, isTrue);
    },
  );
}
