import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:classical_local_library/composer_library.dart';
import 'package:classical_local_library/library_view_settings.dart';
import 'package:classical_local_library/library_search.dart';
import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'dart:io';

void main() {
  setUpAll(sqfliteFfiInit);
  ClassicalLibrary peopleLibrary(List<ClassicalPerson> people) =>
      ClassicalLibrary(
        people: people,
        works: [
          for (final p in people)
            Work(
              id: 'work-${p.id}',
              composerId: p.id,
              title: const LocalizedName(ko: '작품', sortName: 'Work'),
            ),
        ],
        instruments: [],
        ensembles: [],
        workParts: [],
        albums: [],
        recordings: [],
        tracks: [],
        files: [],
      );
  test('confirmed aliases share ID; ambiguous and unknown names never claim a person', () {
    const bach = ClassicalPerson(
      id: 'bach',
      name: LocalizedName(
        ko: '바흐',
        sortName: 'Bach',
        original: 'Johann Sebastian Bach',
        aliases: ['J. S. Bach'],
      ),
    );
    final lib = peopleLibrary([bach]);
    final index = ComposerNames(lib);
    expect(index.key('J. S. Bach'), 'person:bach');
    expect(index.key('바흐'), 'person:bach');
    final entries = const LocalFileLibrary().entries(
      library: lib,
      files: [
        const LocalAudioFile(
          id: 'a',
          path: '/fixture/a.wav',
          format: 'wav',
          tagMetadata: AudioTagMetadata(composer: 'J. S. Bach'),
        ),
      ],
    );
    expect(entries.single.composer, '바흐');
    expect(const LocalFileLibrary().search(entries, 'Johann'), hasLength(1));
    final search = const LibrarySearchService().prepare(
      library: lib,
      files: entries.map((e) => e.file).toList(),
      candidates: [],
    );
    expect(search.fileIds('Johann', search.search('Johann')), ['a']);
    final ambiguous = ComposerNames(
      peopleLibrary([
        bach,
        const ClassicalPerson(
          id: 'other',
          name: LocalizedName(
            ko: '동명이인',
            sortName: 'Other',
            aliases: ['J. S. Bach'],
          ),
        ),
      ]),
    );
    expect(ambiguous.personId('J. S. Bach'), isNull);
    expect(ambiguous.key(null), 'unknown');
    expect(index.key('Bach family'), 'name:bach family');
  });
  test('legacy artist section maps in place without losing order, visibility or playlist sorting', () {
    final value = LibraryViewSettings.fromJson({
      'order': ['playlists', 'artists', 'songs', 'albums'],
      'visible': ['artists', 'playlists'],
      'playlistSort': 'name',
      'trackSorts': {'p': 'album'},
    });
    expect(value.order, ['playlists', 'composers', 'songs', 'albums']);
    expect(value.visible, ['composers', 'playlists']);
    expect(value.playlistSort, PlaylistListSort.name);
    expect(value.trackSorts['p'], PlaylistTrackSort.album);
    expect(
      LibraryViewSettings.fromJson(value.toJson()).toJson(),
      value.toJson(),
    );
  });
  test('role fields and legacy corrections survive SQLite reopen and logical backup', () async {
    final dir = await Directory.systemTemp.createTemp('composer-roles-');
    addTearDown(() => dir.delete(recursive: true));
    final path = '${dir.path}/roles.sqlite';
    var db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    await ScannedAudioRepository(SqliteScannedAudioStore(db)).replaceAll([
      const LocalAudioFile(id: 'f', path: '/fixture/f.wav', format: 'wav'),
    ]);
    final values = <MetadataField, Object>{
      MetadataField.title: 'Song',
      MetadataField.albumTitle: 'Disc',
      MetadataField.albumArtist: 'Disc artist',
      MetadataField.workTitle: 'Work',
      MetadataField.movementTitle: 'Movement',
      MetadataField.composer: 'Composer',
    };
    await MetadataOverrideRepository(SqliteMetadataOverrideStore(db))
        .saveUserValues('f', values);
    await db.close();
    db = await ClassicalLocalDatabase(
      path: path,
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(db.close);
    expect(
      (await SqliteMetadataOverrideStore(db).load()).single.values,
      values,
    );
    final backup = await LibraryBackupService(database: db).exportJson();
    final restored = await ClassicalLocalDatabase(
      path: '${dir.path}/restore.sqlite',
      factory: databaseFactoryFfi,
    ).open();
    addTearDown(restored.close);
    await LibraryBackupService(database: restored).importJson(backup);
    expect(
      (await SqliteMetadataOverrideStore(restored).load()).single.values,
      values,
    );
    expect(await restored.query('catalog_works'), isEmpty);
    expect(await restored.rawQuery('PRAGMA foreign_key_check'), isEmpty);
  });
  test(
    'album and song metadata remain independent of classical corrections',
    () {
      const tag = AudioTagMetadata(
        title: 'Track title',
        album: 'Original disc',
        artist: 'Soloist',
        albumArtist: 'Album orchestra',
        composer: 'Composer',
        work: 'Original work',
      );
      final correction = MetadataOverride(
        fileId: 'f',
        values: {
          MetadataField.workTitle: 'Corrected work',
          MetadataField.movementTitle: 'Corrected movement',
        },
        sources: {
          MetadataField.workTitle: MetadataValueSource.user,
          MetadataField.movementTitle: MetadataValueSource.user,
        },
        updatedAtMillis: 1,
      );
      final value = ListeningFileMetadata.resolve(
        tag: tag,
        override: correction,
      );
      expect(value.album, 'Original disc');
      expect(value.title, 'Track title');
      expect(value.artist, 'Soloist');
      expect(value.albumArtist, 'Album orchestra');
      expect(value.workTitle, 'Corrected work');
      expect(value.movementTitle, 'Corrected movement');
      expect(value.composer, 'Composer');
      expect(
        correction.text(MetadataField.movementTitle),
        'Corrected movement',
      );
      expect(
        ListeningFileMetadata.resolve(
          tag: const AudioTagMetadata(work: 'Work', albumArtist: 'Orchestra'),
        ).album,
        isNull,
      );
      expect(
        ListeningFileMetadata.resolve(
          tag: const AudioTagMetadata(albumArtist: 'Orchestra'),
        ).artist,
        isNull,
      );
    },
  );
  test(
    'compilation uses album artist, distinct album artists stay distinct',
    () {
      final service = const LocalFileLibrary();
      final entries = service.entries(
        files: [
          for (final (id, artist, albumArtist, composer) in [
            ('a', 'Soloist A', 'Various', 'Bach'),
            ('b', 'Soloist B', 'Various', 'Mozart'),
            ('c', 'Soloist A', 'Other release', 'Bach'),
          ])
            LocalAudioFile(
              id: id,
              path: '/fixture/$id.wav',
              format: 'wav',
              tagMetadata: AudioTagMetadata(
                album: 'Collection',
                artist: artist,
                albumArtist: albumArtist,
                composer: composer,
              ),
            ),
        ],
      );
      expect(
        service.groupKey(entries[0], LocalFileCategory.albums),
        service.groupKey(entries[1], LocalFileCategory.albums),
      );
      expect(
        service.groupKey(entries[0], LocalFileCategory.albums),
        isNot(service.groupKey(entries[2], LocalFileCategory.albums)),
      );
    },
  );
  test('unknown album artist never uses a changing performer to split a mixed composer disc', () {
    final entries = const LocalFileLibrary().entries(
      files: [
        for (final (id, composer, artist) in [
          ('a', 'Bach', 'A'),
          ('b', 'Mozart', 'B'),
        ])
          LocalAudioFile(
            id: id,
            path: '/fixture/$id.wav',
            format: 'wav',
            tagMetadata: AudioTagMetadata(
              album: 'Mixed',
              composer: composer,
              artist: artist,
            ),
          ),
      ],
    );
    expect(
      const LocalFileLibrary().groupKey(entries[0], LocalFileCategory.albums),
      const LocalFileLibrary().groupKey(entries[1], LocalFileCategory.albums),
    );
  });
}
