import 'dart:convert';
import 'dart:io';

import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/library_view_settings.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:classical_local_library/sqlite_migration.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'library_navigation_test.dart' as fixture;

class Version15Schema extends SqliteStorageSchema {
  const Version15Schema();
  @override
  int get version => 15;
  @override
  List<SqliteTableSchema> get tables => super.tables
      .where(
        (table) =>
            !['library_view_settings', 'library_artwork'].contains(table.name),
      )
      .toList();
}

class FailingViewSettingsStore extends MemoryLibraryViewSettingsStore {
  bool fail = true;
  bool invalid = false;
  @override
  Future<LibraryViewSettings> load() async {
    if (invalid) throw const FormatException('fixture invalid settings');
    return super.load();
  }

  @override
  Future<void> save(LibraryViewSettings settings) async {
    if (fail) throw StateError('fixture failed save');
    await super.save(settings);
  }
}

void main() {
  setUpAll(sqfliteFfiInit);
  test('v15 migration preserves playlist data and invalid preferences remain recoverable', () async {
    final dir = await Directory.systemTemp.createTemp('view-upgrade-');
    addTearDown(() => dir.delete(recursive: true));
    final path = '${dir.path}/old.sqlite';
    var db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
      schema: const Version15Schema(),
    ).open();
    final repository = LocalPlaylistRepository(SqliteLocalPlaylistStore(db));
    final saved = await repository.create('기존 목록', initialFileIds: ['file-a']);
    await db.close();
    db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(db.close);
    expect(
      (await LocalPlaylistRepository(
        SqliteLocalPlaylistStore(db),
      ).load()).single.id,
      saved.id,
    );
    await db.insert('library_view_settings', {
      'id': 1,
      'value_json': '{invalid',
    });
    final store = SqliteLibraryViewSettingsStore(db);
    await expectLater(store.load(), throwsFormatException);
    expect(
      (await db.query('library_view_settings')).single['value_json'],
      '{invalid',
    );
    await store.save(LibraryViewSettings());
    expect((await store.load()).visible, LibraryViewSettings.sections);
  });

  testWidgets(
    'failed section save retains draft and damaged settings do not hide music',
    (tester) async {
      final store = FailingViewSettingsStore()..invalid = true;
      await tester.pumpWidget(fixture.libraryApp(viewSettingsStore: store));
      await tester.pumpAndSettle();
      expect(find.textContaining('표시 설정을 읽지 못해'), findsOneWidget);
      await tester.tap(find.text('분류 편집'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byTooltip('재생목록 위로'));
      await tester.tap(find.byTooltip('재생목록 위로'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('저장'));
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(find.textContaining('저장하지 못했습니다. 선택은 유지'), findsOneWidget);
      expect(store.value.order.last, 'playlists');
      store.fail = false;
      store.invalid = false;
      await tester.ensureVisible(find.text('저장'));
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(store.value.order[2], 'playlists');
      expect(find.textContaining('표시 설정을 읽지 못해'), findsNothing);
      await fixture.openCategory(tester, 'songs');
      expect(find.text('Alpha'), findsOneWidget);
    },
  );
  test('view settings survive SQLite reopen and older logical backup stays compatible', () async {
    final dir = await Directory.systemTemp.createTemp('view-settings-');
    addTearDown(() => dir.delete(recursive: true));
    final path = '${dir.path}/library.sqlite';
    var db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    var store = SqliteLibraryViewSettingsStore(db);
    await store.save(
      LibraryViewSettings(
        order: ['playlists', 'songs', 'albums', 'artists'],
        visible: [],
        playlistSort: PlaylistListSort.name,
        trackSorts: {'list': PlaylistTrackSort.artist},
      ),
    );
    final json = await LibraryBackupService(database: db).exportJson();
    final old = jsonDecode(json) as Map<String, dynamic>;
    old['storageSchemaVersion'] = 15;
    (old['scope'] as List).remove('local_favorites');
    (old['data'] as Map).remove('local_favorites');
    (old['counts'] as Map).remove('local_favorites');
    (old['scope'] as List).remove('library_artwork');
    (old['data'] as Map).remove('library_artwork');
    (old['counts'] as Map).remove('library_artwork');
    (old['scope'] as List).remove('library_view_settings');
    (old['data'] as Map).remove('library_view_settings');
    (old['counts'] as Map).remove('library_view_settings');
    expect(
      (await LibraryBackupService(database: db).previewImport(jsonEncode(old)))
          .canImport,
      isTrue,
    );
    await db.close();
    db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(db.close);
    store = SqliteLibraryViewSettingsStore(db);
    final loaded = await store.load();
    expect(loaded.visible, isEmpty);
    expect(loaded.order.first, 'playlists');
    expect(loaded.trackSorts['list'], PlaylistTrackSort.artist);
    expect(
      (await LibraryBackupService(database: db).previewImport(json)).canImport,
      isTrue,
    );
    expect(() => LibraryViewSettings(order: ['songs']), throwsFormatException);
    expect(
      () => LibraryViewSettings.fromJson({'secret': 'value'}),
      throwsFormatException,
    );
  });

  test(
    'playlist view query sorts deterministically without changing manual ids',
    () {
      final entries = const LocalFileLibrary().entries(files: fixture.files);
      final byId = {for (final e in entries) e.file.id: e};
      final p = fixture.playlist(ids: ['b', 'missing', 'a']);
      const query = LocalPlaylistBrowseQuery();
      expect(query.tracks(p, byId, '', PlaylistTrackSort.title), [
        'a',
        'b',
        'missing',
      ]);
      expect(query.tracks(p, byId, 'Beta', PlaylistTrackSort.manual), ['b']);
      expect(p.fileIds, ['b', 'missing', 'a']);
    },
  );

  testWidgets(
    'sorted playlist playback uses visible order; edit retains saved order and restart keeps sort',
    (tester) async {
      final settings = MemoryLibraryViewSettingsStore();
      final repository = LocalPlaylistRepository(
        MemoryLocalPlaylistStore([
          fixture.playlist(ids: ['b', 'a']),
        ]),
      );
      final player = FakeLocalPlayer();
      await tester.pumpWidget(
        fixture.libraryApp(
          playlists: repository,
          player: player,
          viewSettingsStore: settings,
        ),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'playlists');
      await tester.tap(find.byKey(const ValueKey('playlist-evening')));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('재생목록 곡 정렬'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.widgetWithText(CheckedPopupMenuItem<PlaylistTrackSort>, '제목'),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('모두 재생'));
      await tester.tap(find.text('모두 재생'));
      await tester.pumpAndSettle();
      expect(player.playbackState.queue.map((e) => e.trackId), [
        'local-file:a',
        'local-file:b',
      ]);
      expect((await repository.load()).single.fileIds, ['b', 'a']);
      await tester.tap(find.byTooltip('재생목록 더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('편집'));
      await tester.pumpAndSettle();
      final first = tester
          .getTopLeft(find.byKey(const ValueKey('playlist-edit-b')))
          .dy;
      final second = tester
          .getTopLeft(find.byKey(const ValueKey('playlist-edit-a')))
          .dy;
      expect(first, lessThan(second));
      expect(player.playbackState.currentItem!.trackId, 'local-file:a');
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      await tester.pumpWidget(
        fixture.libraryApp(playlists: repository, viewSettingsStore: settings),
      );
      await tester.pumpAndSettle();
      await fixture.openCategory(tester, 'playlists');
      await tester.tap(find.byKey(const ValueKey('playlist-evening')));
      await tester.pumpAndSettle();
      expect(settings.value.trackSorts['evening'], PlaylistTrackSort.title);
      await tester.enterText(find.byType(TextField), 'not in list');
      await tester.pumpAndSettle();
      expect(find.text('검색 결과가 없습니다'), findsOneWidget);
    },
  );

  testWidgets(
    'all sections can be hidden and recovered without deleting music',
    (tester) async {
      final settings = MemoryLibraryViewSettingsStore();
      await tester.pumpWidget(fixture.libraryApp(viewSettingsStore: settings));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('도구 더보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('보관함 분류 편집'));
      await tester.pumpAndSettle();
      for (final id in LibraryViewSettings.sections) {
        final checkbox = find.descendant(
          of: find.byKey(ValueKey('section-editor-$id')),
          matching: find.byType(Checkbox),
        );
        await tester.ensureVisible(checkbox);
        await tester.tap(checkbox);
        await tester.pumpAndSettle();
      }
      await tester.ensureVisible(find.text('저장'));
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(find.text('보관함 분류가 숨겨져 있습니다'), findsOneWidget);
      expect(find.text('보관함이 비어 있습니다'), findsNothing);
      expect(settings.value.visible, isEmpty);
      await tester.tap(find.text('분류 편집'));
      await tester.pumpAndSettle();
      final row = find.byKey(const ValueKey('section-editor-songs'));
      await tester.tap(
        find.descendant(of: row, matching: find.byType(Checkbox)),
      );
      await tester.ensureVisible(find.text('저장'));
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('file-category-songs')), findsOneWidget);
      expect(settings.value.visible, ['songs']);
    },
  );
}
