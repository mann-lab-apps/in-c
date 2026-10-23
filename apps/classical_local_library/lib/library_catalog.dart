import 'dart:convert';

import 'package:sqflite/sqflite.dart' as sqflite;

import 'classical_library_models.dart';
import 'file_links.dart';

const emptyClassicalLibrary = ClassicalLibrary(
  people: [],
  instruments: [],
  ensembles: [],
  works: [],
  workParts: [],
  albums: [],
  recordings: [],
  tracks: [],
  files: [],
);

class CatalogMovementDraft {
  const CatalogMovementDraft({
    required this.fileId,
    required this.title,
    required this.sequenceNumber,
  });

  final String fileId;
  final String title;
  final int sequenceNumber;
}

class CatalogRecordingDraft {
  const CatalogRecordingDraft({
    required this.composerName,
    required this.workTitle,
    required this.recordingTitle,
    required this.movements,
    this.existingWorkId,
    this.existingRecordingId,
    this.catalogNumber,
    this.performerName,
    this.conductorName,
    this.recordedYear,
  });

  final String composerName;
  final String workTitle;
  final String recordingTitle;
  final List<CatalogMovementDraft> movements;
  final String? existingWorkId;
  final String? existingRecordingId;
  final String? catalogNumber;
  final String? performerName;
  final String? conductorName;
  final int? recordedYear;
}

class CatalogRegistrationResult {
  const CatalogRegistrationResult({
    required this.library,
    required this.links,
    required this.files,
  });

  final ClassicalLibrary library;
  final List<AudioFileTrackLink> links;
  final List<LocalAudioFile> files;
}

abstract interface class ClassicalCatalogStore {
  Future<ClassicalLibrary> load(List<LocalAudioFile> files);

  Future<void> save(ClassicalLibrary library);

  Future<CatalogRegistrationResult> register(
    CatalogRecordingDraft draft,
    List<LocalAudioFile> files, {
    required DateTime registeredAt,
  });

  Future<CatalogRegistrationResult> reorganize(
    CatalogRecordingDraft draft,
    List<LocalAudioFile> files, {
    required DateTime registeredAt,
  });

  Future<CatalogRegistrationResult> unlinkFile(
    String fileId,
    List<LocalAudioFile> files,
  );

  Future<void> clear();
}

class MemoryClassicalCatalogStore implements ClassicalCatalogStore {
  MemoryClassicalCatalogStore([ClassicalLibrary seed = emptyClassicalLibrary])
    : _library = seed;

  ClassicalLibrary _library;

  @override
  Future<ClassicalLibrary> load(List<LocalAudioFile> files) async =>
      _withFiles(_library, files);

  @override
  Future<void> save(ClassicalLibrary library) async {
    _library = library;
  }

  @override
  Future<CatalogRegistrationResult> register(
    CatalogRecordingDraft draft,
    List<LocalAudioFile> files, {
    required DateTime registeredAt,
  }) async {
    final result = _applyDraft(
      _withFiles(_library, files),
      draft,
      registeredAt.microsecondsSinceEpoch,
    );
    _library = result.library;
    return result;
  }

  @override
  Future<CatalogRegistrationResult> reorganize(
    CatalogRecordingDraft draft,
    List<LocalAudioFile> files, {
    required DateTime registeredAt,
  }) async {
    final result = _reorganize(
      _withFiles(_library, files),
      draft,
      registeredAt.microsecondsSinceEpoch,
    );
    _library = result.library;
    return result;
  }

  @override
  Future<CatalogRegistrationResult> unlinkFile(
    String fileId,
    List<LocalAudioFile> files,
  ) async {
    final result = _unlinkFile(_withFiles(_library, files), fileId);
    _library = result.library;
    return result;
  }

  @override
  Future<void> clear() async {
    _library = emptyClassicalLibrary;
  }
}

class ClassicalCatalogRepository {
  const ClassicalCatalogRepository(this.store);

  final ClassicalCatalogStore store;

  Future<ClassicalLibrary> load(List<LocalAudioFile> files) =>
      store.load(files);

  Future<void> save(ClassicalLibrary library) => store.save(library);

  Future<CatalogRegistrationResult> register(
    CatalogRecordingDraft draft,
    List<LocalAudioFile> files, {
    DateTime? registeredAt,
  }) {
    _validateDraft(draft, files);
    return store.register(
      draft,
      files,
      registeredAt: registeredAt ?? DateTime.now(),
    );
  }

  Future<CatalogRegistrationResult> reorganize(
    CatalogRecordingDraft draft,
    List<LocalAudioFile> files, {
    DateTime? registeredAt,
  }) {
    _validateDraft(draft, files);
    return store.reorganize(
      draft,
      files,
      registeredAt: registeredAt ?? DateTime.now(),
    );
  }

  Future<CatalogRegistrationResult> unlinkFile(
    String fileId,
    List<LocalAudioFile> files,
  ) => store.unlinkFile(fileId, files);

  Future<void> clear() => store.clear();
}

class SqliteClassicalCatalogStore implements ClassicalCatalogStore {
  const SqliteClassicalCatalogStore(this.database, {this.beforeCommit});

  final sqflite.Database database;
  final Future<void> Function()? beforeCommit;

  Future<bool> bootstrapLegacyReferences(ClassicalLibrary legacy) async {
    final existing = sqflite.Sqflite.firstIntValue(
      await database.rawQuery('SELECT COUNT(*) FROM catalog_works'),
    );
    if ((existing ?? 0) > 0) return false;

    final scannedIds = {
      for (final row in await database.query('scanned_audio_files'))
        row['id']! as String,
    };
    final linkedFilesByTrack = <String, String>{};
    for (final row in await database.query('audio_file_track_links')) {
      final fileId = row['file_id']! as String;
      if (scannedIds.contains(fileId)) {
        linkedFilesByTrack[row['track_id']! as String] = fileId;
      }
    }
    final trackIds = <String>{...linkedFilesByTrack.keys};
    final recordingIds = <String>{};
    final workIds = <String>{};
    for (final row in await database.query('playback_history')) {
      trackIds.add(row['track_id']! as String);
      recordingIds.add(row['recording_id']! as String);
      workIds.add(row['work_id']! as String);
    }
    for (final row in await database.query('imslp_work_links')) {
      workIds.add(row['work_id']! as String);
    }
    for (final row in await database.query('imslp_imports')) {
      final recordingId = row['recording_id'] as String?;
      final trackId = row['track_id'] as String?;
      if (recordingId != null) recordingIds.add(recordingId);
      if (trackId != null) trackIds.add(trackId);
      workIds.add(row['work_id']! as String);
    }

    final legacyTracks = {for (final track in legacy.tracks) track.id: track};
    final selectedTracks = <Track>[];
    for (final trackId in trackIds) {
      final track = legacyTracks[trackId];
      final fileId = linkedFilesByTrack[trackId];
      if (track == null || fileId == null) continue;
      recordingIds.add(track.recordingId);
      selectedTracks.add(
        Track(
          id: track.id,
          recordingId: track.recordingId,
          fileId: fileId,
          sequenceNumber: track.sequenceNumber,
          workPartIds: track.workPartIds,
          title: track.title,
          duration: track.duration,
        ),
      );
    }
    final legacyRecordings = {
      for (final recording in legacy.recordings) recording.id: recording,
    };
    for (final recordingId in [...recordingIds]) {
      final recording = legacyRecordings[recordingId];
      if (recording != null) workIds.add(recording.workId);
    }
    if (workIds.isEmpty && recordingIds.isEmpty && selectedTracks.isEmpty) {
      return false;
    }

    final selectedWorks = legacy.works
        .where((work) => workIds.contains(work.id))
        .toList();
    final selectedWorkIds = {for (final work in selectedWorks) work.id};
    final selectedRecordings = legacy.recordings
        .where(
          (recording) =>
              recordingIds.contains(recording.id) ||
              selectedWorkIds.contains(recording.workId) &&
                  selectedTracks.any(
                    (track) => track.recordingId == recording.id,
                  ),
        )
        .map(
          (recording) => Recording(
            id: recording.id,
            workId: recording.workId,
            title: recording.title,
            trackIds: [
              for (final track in selectedTracks)
                if (track.recordingId == recording.id) track.id,
            ],
            albumId: recording.albumId,
            ensembleId: recording.ensembleId,
            credits: recording.credits,
            recordedYear: recording.recordedYear,
            sourceReferences: recording.sourceReferences,
          ),
        )
        .toList();
    final personIds = <String>{
      for (final work in selectedWorks) work.composerId,
      for (final recording in selectedRecordings)
        for (final credit in recording.credits) credit.personId,
    };
    final instrumentIds = <String>{
      for (final recording in selectedRecordings)
        for (final credit in recording.credits)
          if (credit.instrumentId != null) credit.instrumentId!,
    };
    final albumIds = {
      for (final recording in selectedRecordings)
        if (recording.albumId != null) recording.albumId!,
    };
    final ensembleIds = {
      for (final recording in selectedRecordings)
        if (recording.ensembleId != null) recording.ensembleId!,
    };
    final selected = ClassicalLibrary(
      people: legacy.people
          .where((person) => personIds.contains(person.id))
          .toList(),
      instruments: legacy.instruments
          .where((instrument) => instrumentIds.contains(instrument.id))
          .toList(),
      ensembles: legacy.ensembles
          .where((ensemble) => ensembleIds.contains(ensemble.id))
          .toList(),
      works: selectedWorks,
      workParts: legacy.workParts
          .where((part) => selectedWorkIds.contains(part.workId))
          .toList(),
      albums: legacy.albums
          .where((album) => albumIds.contains(album.id))
          .toList(),
      recordings: selectedRecordings,
      tracks: selectedTracks,
      files: const [],
    );
    await database.transaction((transaction) async {
      await _replaceCatalog(transaction, selected);
      for (final table in [
        'catalog_people',
        'catalog_works',
        'catalog_recordings',
      ]) {
        await transaction.update(table, {'origin': 'legacySample'});
      }
      await beforeCommit?.call();
    });
    return true;
  }

  @override
  Future<ClassicalLibrary> load(List<LocalAudioFile> files) async =>
      _loadFrom(database, files);

  @override
  Future<void> save(ClassicalLibrary library) async {
    await database.transaction((transaction) async {
      await _replaceCatalog(transaction, library);
      await beforeCommit?.call();
    });
  }

  @override
  Future<CatalogRegistrationResult> register(
    CatalogRecordingDraft draft,
    List<LocalAudioFile> files, {
    required DateTime registeredAt,
  }) async {
    _validateDraft(draft, files);
    late CatalogRegistrationResult result;
    await database.transaction((transaction) async {
      final current = await _loadFrom(transaction, files);
      result = _applyDraft(current, draft, registeredAt.microsecondsSinceEpoch);
      await _replaceCatalog(transaction, result.library);
      for (final movement in draft.movements) {
        await transaction.delete(
          'audio_file_track_links',
          where: 'file_id = ?',
          whereArgs: [movement.fileId],
        );
      }
      for (final link in result.links) {
        await transaction.insert('audio_file_track_links', {
          'track_id': link.trackId,
          'file_id': link.fileId,
          'linked_at_millis': link.linkedAtMillis,
        }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
      }
      for (final movement in draft.movements) {
        await transaction.update(
          'scanned_audio_files',
          {'import_status': AudioImportStatus.linked.name},
          where: 'id = ?',
          whereArgs: [movement.fileId],
        );
      }
      await beforeCommit?.call();
    });
    return result;
  }

  @override
  Future<CatalogRegistrationResult> reorganize(
    CatalogRecordingDraft draft,
    List<LocalAudioFile> files, {
    required DateTime registeredAt,
  }) async {
    _validateDraft(draft, files);
    late CatalogRegistrationResult result;
    await database.transaction((transaction) async {
      final current = await _loadFrom(transaction, files);
      result = _reorganize(current, draft, registeredAt.microsecondsSinceEpoch);
      await _replaceCatalog(transaction, result.library);
      for (final movement in draft.movements) {
        await transaction.delete(
          'audio_file_track_links',
          where: 'file_id = ?',
          whereArgs: [movement.fileId],
        );
      }
      for (final link in result.links) {
        await transaction.insert('audio_file_track_links', {
          'track_id': link.trackId,
          'file_id': link.fileId,
          'linked_at_millis': link.linkedAtMillis,
        }, conflictAlgorithm: sqflite.ConflictAlgorithm.replace);
      }
      for (final movement in draft.movements) {
        await transaction.update(
          'scanned_audio_files',
          {'import_status': AudioImportStatus.linked.name},
          where: 'id = ?',
          whereArgs: [movement.fileId],
        );
      }
      await beforeCommit?.call();
    });
    return result;
  }

  @override
  Future<CatalogRegistrationResult> unlinkFile(
    String fileId,
    List<LocalAudioFile> files,
  ) async {
    late CatalogRegistrationResult result;
    await database.transaction((transaction) async {
      final current = await _loadFrom(transaction, files);
      result = _unlinkFile(current, fileId);
      await _replaceCatalog(transaction, result.library);
      await transaction.delete(
        'audio_file_track_links',
        where: 'file_id = ?',
        whereArgs: [fileId],
      );
      await transaction.update(
        'scanned_audio_files',
        {'import_status': AudioImportStatus.needsReview.name},
        where: 'id = ?',
        whereArgs: [fileId],
      );
      await beforeCommit?.call();
    });
    return result;
  }

  @override
  Future<void> clear() async {
    await database.transaction((transaction) async {
      for (final table in _catalogDeleteOrder) {
        await transaction.delete(table);
      }
      await beforeCommit?.call();
    });
  }
}

const _catalogDeleteOrder = [
  'catalog_recording_credits',
  'catalog_tracks',
  'catalog_recordings',
  'catalog_work_parts',
  'catalog_works',
  'catalog_albums',
  'catalog_ensembles',
  'catalog_instruments',
  'catalog_people',
];

Future<void> _replaceCatalog(
  sqflite.DatabaseExecutor executor,
  ClassicalLibrary library,
) async {
  for (final table in _catalogDeleteOrder) {
    await executor.delete(table);
  }
  for (final person in library.people) {
    await executor.insert('catalog_people', {
      'id': person.id,
      'name_json': jsonEncode(_nameToJson(person.name)),
      'birth_year': person.birthYear,
      'death_year': person.deathYear,
      'origin': 'user',
    });
  }
  for (final instrument in library.instruments) {
    await executor.insert('catalog_instruments', {
      'id': instrument.id,
      'name_json': jsonEncode(_nameToJson(instrument.name)),
    });
  }
  for (final ensemble in library.ensembles) {
    await executor.insert('catalog_ensembles', {
      'id': ensemble.id,
      'name_json': jsonEncode(_nameToJson(ensemble.name)),
    });
  }
  for (final album in library.albums) {
    await executor.insert('catalog_albums', {
      'id': album.id,
      'title_json': jsonEncode(_nameToJson(album.title)),
      'label': album.label,
      'release_year': album.releaseYear,
    });
  }
  for (final work in library.works) {
    await executor.insert('catalog_works', {
      'id': work.id,
      'composer_id': work.composerId,
      'title_json': jsonEncode(_nameToJson(work.title)),
      'catalog_number': work.catalogNumber,
      'period_label': work.periodLabel,
      'source_references_json': jsonEncode([
        for (final reference in work.sourceReferences) reference.toJson(),
      ]),
      'origin': 'user',
    });
  }
  for (final part in library.workParts) {
    await executor.insert('catalog_work_parts', {
      'id': part.id,
      'work_id': part.workId,
      'title_json': jsonEncode(_nameToJson(part.title)),
      'sequence_number': part.sequenceNumber,
    });
  }
  for (final recording in library.recordings) {
    await executor.insert('catalog_recordings', {
      'id': recording.id,
      'work_id': recording.workId,
      'title_json': jsonEncode(_nameToJson(recording.title)),
      'album_id': recording.albumId,
      'ensemble_id': recording.ensembleId,
      'recorded_year': recording.recordedYear,
      'source_references_json': jsonEncode([
        for (final reference in recording.sourceReferences) reference.toJson(),
      ]),
      'origin': 'user',
    });
    for (final credit in recording.credits) {
      await executor.insert('catalog_recording_credits', {
        'recording_id': recording.id,
        'person_id': credit.personId,
        'role': credit.role.name,
        'instrument_id': credit.instrumentId,
      });
    }
  }
  for (final track in library.tracks) {
    await executor.insert('catalog_tracks', {
      'id': track.id,
      'recording_id': track.recordingId,
      'file_id': track.fileId,
      'sequence_number': track.sequenceNumber,
      'work_part_ids_json': jsonEncode(track.workPartIds),
      'title_json': track.title == null
          ? null
          : jsonEncode(_nameToJson(track.title!)),
      'duration_millis': track.duration?.inMilliseconds,
    });
  }
}

Future<ClassicalLibrary> _loadFrom(
  sqflite.DatabaseExecutor executor,
  List<LocalAudioFile> files,
) async {
  final people = [
    for (final row in await executor.query('catalog_people', orderBy: 'id'))
      ClassicalPerson(
        id: row['id']! as String,
        name: _nameFromJson(row['name_json']! as String),
        birthYear: row['birth_year'] as int?,
        deathYear: row['death_year'] as int?,
      ),
  ];
  final instruments = [
    for (final row in await executor.query(
      'catalog_instruments',
      orderBy: 'id',
    ))
      Instrument(
        id: row['id']! as String,
        name: _nameFromJson(row['name_json']! as String),
      ),
  ];
  final ensembles = [
    for (final row in await executor.query('catalog_ensembles', orderBy: 'id'))
      Ensemble(
        id: row['id']! as String,
        name: _nameFromJson(row['name_json']! as String),
      ),
  ];
  final albums = [
    for (final row in await executor.query('catalog_albums', orderBy: 'id'))
      AlbumRelease(
        id: row['id']! as String,
        title: _nameFromJson(row['title_json']! as String),
        label: row['label'] as String?,
        releaseYear: row['release_year'] as int?,
      ),
  ];
  final works = [
    for (final row in await executor.query('catalog_works', orderBy: 'id'))
      Work(
        id: row['id']! as String,
        composerId: row['composer_id']! as String,
        title: _nameFromJson(row['title_json']! as String),
        catalogNumber: row['catalog_number'] as String?,
        periodLabel: row['period_label'] as String?,
        sourceReferences: _referencesFromJson(
          row['source_references_json']! as String,
        ),
      ),
  ];
  final workParts = [
    for (final row in await executor.query(
      'catalog_work_parts',
      orderBy: 'work_id, sequence_number, id',
    ))
      WorkPart(
        id: row['id']! as String,
        workId: row['work_id']! as String,
        title: _nameFromJson(row['title_json']! as String),
        sequenceNumber: row['sequence_number']! as int,
      ),
  ];
  final creditRows = await executor.query(
    'catalog_recording_credits',
    orderBy: 'recording_id, role, person_id',
  );
  final creditsByRecording = <String, List<RecordingCredit>>{};
  for (final row in creditRows) {
    creditsByRecording
        .putIfAbsent(row['recording_id']! as String, () => [])
        .add(
          RecordingCredit(
            personId: row['person_id']! as String,
            role: RecordingRole.values.byName(row['role']! as String),
            instrumentId: row['instrument_id'] as String?,
          ),
        );
  }
  final trackRows = await executor.query(
    'catalog_tracks',
    orderBy: 'recording_id, sequence_number, id',
  );
  final tracks = [
    for (final row in trackRows)
      Track(
        id: row['id']! as String,
        recordingId: row['recording_id']! as String,
        fileId: row['file_id']! as String,
        sequenceNumber: row['sequence_number']! as int,
        workPartIds: (jsonDecode(
          row['work_part_ids_json']! as String,
        ) as List<Object?>).whereType<String>().toList(),
        title: row['title_json'] == null
            ? null
            : _nameFromJson(row['title_json']! as String),
        duration: row['duration_millis'] == null
            ? null
            : Duration(milliseconds: row['duration_millis']! as int),
      ),
  ];
  final trackIdsByRecording = <String, List<String>>{};
  for (final track in tracks) {
    trackIdsByRecording.putIfAbsent(track.recordingId, () => []).add(track.id);
  }
  final recordings = [
    for (final row in await executor.query('catalog_recordings', orderBy: 'id'))
      Recording(
        id: row['id']! as String,
        workId: row['work_id']! as String,
        title: _nameFromJson(row['title_json']! as String),
        trackIds: trackIdsByRecording[row['id']! as String] ?? const [],
        albumId: row['album_id'] as String?,
        ensembleId: row['ensemble_id'] as String?,
        credits: creditsByRecording[row['id']! as String] ?? const [],
        recordedYear: row['recorded_year'] as int?,
        sourceReferences: _referencesFromJson(
          row['source_references_json']! as String,
        ),
      ),
  ];
  return ClassicalLibrary(
    people: people,
    instruments: instruments,
    ensembles: ensembles,
    works: works,
    workParts: workParts,
    albums: albums,
    recordings: recordings,
    tracks: tracks,
    files: files,
  );
}

void _validateDraft(CatalogRecordingDraft draft, List<LocalAudioFile> files) {
  if (draft.composerName.trim().isEmpty ||
      draft.workTitle.trim().isEmpty ||
      draft.recordingTitle.trim().isEmpty) {
    throw const FormatException('작곡가, 작품과 녹음 이름을 입력하세요.');
  }
  if (draft.movements.isEmpty) {
    throw const FormatException('하나 이상의 음원 파일을 선택하세요.');
  }
  final availableIds = {for (final file in files) file.id};
  final fileIds = <String>{};
  final sequences = <int>{};
  for (final movement in draft.movements) {
    if (!availableIds.contains(movement.fileId)) {
      throw const FormatException('선택한 음원 파일을 찾지 못했습니다.');
    }
    if (!fileIds.add(movement.fileId)) {
      throw const FormatException('같은 음원 파일을 두 번 연결할 수 없습니다.');
    }
    if (movement.title.trim().isEmpty || movement.sequenceNumber < 1) {
      throw const FormatException('악장 이름과 순서를 확인하세요.');
    }
    if (!sequences.add(movement.sequenceNumber)) {
      throw const FormatException('악장 순서는 중복될 수 없습니다.');
    }
  }
}

CatalogRegistrationResult _applyDraft(
  ClassicalLibrary current,
  CatalogRecordingDraft draft,
  int idSeed,
) {
  _validateDraft(draft, current.files);
  final existingFileIds = {for (final track in current.tracks) track.fileId};
  if (draft.movements.any(
    (movement) => existingFileIds.contains(movement.fileId),
  )) {
    throw const FormatException('이미 다른 트랙에 연결된 음원 파일이 포함되어 있습니다.');
  }

  final people = [...current.people];
  final works = [...current.works];
  final workParts = [...current.workParts];
  final recordings = [...current.recordings];
  final tracks = [...current.tracks];
  var nextId = idSeed;
  String id(String kind, String label) => '$kind.${_slug(label)}.${nextId++}';

  Work work;
  if (draft.existingRecordingId != null) {
    final recording = current.recording(draft.existingRecordingId!);
    work = current.work(recording.workId);
  } else if (draft.existingWorkId != null) {
    work = current.work(draft.existingWorkId!);
  } else {
    ClassicalPerson? composer;
    for (final person in people) {
      if (_sameName(person.name, draft.composerName)) composer = person;
    }
    composer ??= ClassicalPerson(
      id: id('person', draft.composerName),
      name: _simpleName(draft.composerName),
    );
    if (!people.any((person) => person.id == composer!.id)) {
      people.add(composer);
    }
    work = Work(
      id: id('work', draft.workTitle),
      composerId: composer.id,
      title: _simpleName(draft.workTitle),
      catalogNumber: _nullIfBlank(draft.catalogNumber),
      sourceReferences: const [SourceReference(kind: SourceKind.localImport)],
    );
    works.add(work);
  }

  final draftMovements = [
    ...draft.movements,
  ]..sort((left, right) => left.sequenceNumber.compareTo(right.sequenceNumber));
  final partBySequence = {
    for (final part in workParts.where((part) => part.workId == work.id))
      part.sequenceNumber: part,
  };
  for (final movement in draftMovements) {
    partBySequence.putIfAbsent(movement.sequenceNumber, () {
      final part = WorkPart(
        id: id('part', movement.title),
        workId: work.id,
        title: _simpleName(movement.title),
        sequenceNumber: movement.sequenceNumber,
      );
      workParts.add(part);
      return part;
    });
  }

  Recording recording;
  if (draft.existingRecordingId != null) {
    recording = current.recording(draft.existingRecordingId!);
    final existingSequences = {
      for (final track in current.tracksForRecording(recording.id))
        track.sequenceNumber,
    };
    if (draftMovements.any(
      (movement) => existingSequences.contains(movement.sequenceNumber),
    )) {
      throw const FormatException('기존 녹음의 악장 순서와 중복됩니다.');
    }
    recordings.removeWhere((item) => item.id == recording.id);
  } else {
    final credits = <RecordingCredit>[];
    for (final pair in [
      (draft.performerName, RecordingRole.performer),
      (draft.conductorName, RecordingRole.conductor),
    ]) {
      final name = _nullIfBlank(pair.$1);
      if (name == null) continue;
      ClassicalPerson? person;
      for (final candidate in people) {
        if (_sameName(candidate.name, name)) person = candidate;
      }
      person ??= ClassicalPerson(
        id: id('person', name),
        name: _simpleName(name),
      );
      if (!people.any((item) => item.id == person!.id)) people.add(person);
      credits.add(RecordingCredit(personId: person.id, role: pair.$2));
    }
    recording = Recording(
      id: id('recording', draft.recordingTitle),
      workId: work.id,
      title: _simpleName(draft.recordingTitle),
      trackIds: const [],
      credits: credits,
      recordedYear: draft.recordedYear,
      sourceReferences: const [SourceReference(kind: SourceKind.localImport)],
    );
  }

  final newTracks = <Track>[];
  for (final movement in draftMovements) {
    final track = Track(
      id: id('track', movement.title),
      recordingId: recording.id,
      fileId: movement.fileId,
      sequenceNumber: movement.sequenceNumber,
      workPartIds: [partBySequence[movement.sequenceNumber]!.id],
      title: _simpleName(movement.title),
    );
    tracks.add(track);
    newTracks.add(track);
  }
  final recordingTracks =
      tracks.where((track) => track.recordingId == recording.id).toList()..sort(
        (left, right) => left.sequenceNumber.compareTo(right.sequenceNumber),
      );
  recordings.add(
    Recording(
      id: recording.id,
      workId: recording.workId,
      title: recording.title,
      trackIds: [for (final track in recordingTracks) track.id],
      albumId: recording.albumId,
      ensembleId: recording.ensembleId,
      credits: recording.credits,
      recordedYear: recording.recordedYear,
      sourceReferences: recording.sourceReferences,
    ),
  );

  final linkedFileIds = {
    for (final movement in draftMovements) movement.fileId,
  };
  final updatedFiles = [
    for (final file in current.files)
      linkedFileIds.contains(file.id)
          ? file.copyWith(importStatus: AudioImportStatus.linked)
          : file,
  ];
  final library = ClassicalLibrary(
    people: people,
    instruments: current.instruments,
    ensembles: current.ensembles,
    works: works,
    workParts: workParts,
    albums: current.albums,
    recordings: recordings,
    tracks: tracks,
    files: updatedFiles,
    playHistory: current.playHistory,
  );
  return CatalogRegistrationResult(
    library: library,
    files: updatedFiles,
    links: [
      for (final track in newTracks)
        AudioFileTrackLink(
          fileId: track.fileId,
          trackId: track.id,
          linkedAtMillis: idSeed ~/ 1000,
        ),
    ],
  );
}

CatalogRegistrationResult _unlinkFile(ClassicalLibrary current, String fileId) {
  Track? removed;
  for (final track in current.tracks) {
    if (track.fileId == fileId) removed = track;
  }
  if (removed == null) {
    throw const FormatException('파일에 연결된 사용자 트랙을 찾지 못했습니다.');
  }
  final tracks = [
    for (final track in current.tracks)
      if (track.id != removed.id) track,
  ];
  final recordings = [
    for (final recording in current.recordings)
      if (recording.id == removed.recordingId)
        Recording(
          id: recording.id,
          workId: recording.workId,
          title: recording.title,
          trackIds: [
            for (final trackId in recording.trackIds)
              if (trackId != removed.id) trackId,
          ],
          albumId: recording.albumId,
          ensembleId: recording.ensembleId,
          credits: recording.credits,
          recordedYear: recording.recordedYear,
          sourceReferences: recording.sourceReferences,
        )
      else
        recording,
  ];
  final files = [
    for (final file in current.files)
      file.id == fileId
          ? file.copyWith(importStatus: AudioImportStatus.needsReview)
          : file,
  ];
  return CatalogRegistrationResult(
    library: ClassicalLibrary(
      people: current.people,
      instruments: current.instruments,
      ensembles: current.ensembles,
      works: current.works,
      workParts: current.workParts,
      albums: current.albums,
      recordings: recordings,
      tracks: tracks,
      files: files,
      playHistory: current.playHistory,
    ),
    links: const [],
    files: files,
  );
}

CatalogRegistrationResult _reorganize(
  ClassicalLibrary current,
  CatalogRecordingDraft draft,
  int idSeed,
) {
  var prepared = current;
  final linkedFileIds = {for (final track in current.tracks) track.fileId};
  for (final movement in draft.movements) {
    if (linkedFileIds.contains(movement.fileId)) {
      prepared = _unlinkFile(prepared, movement.fileId).library;
    }
  }
  return _applyDraft(prepared, draft, idSeed);
}

ClassicalLibrary _withFiles(
  ClassicalLibrary library,
  List<LocalAudioFile> files,
) => ClassicalLibrary(
  people: library.people,
  instruments: library.instruments,
  ensembles: library.ensembles,
  works: library.works,
  workParts: library.workParts,
  albums: library.albums,
  recordings: library.recordings,
  tracks: library.tracks,
  files: files,
  playHistory: library.playHistory,
);

LocalizedName _simpleName(String value) {
  final clean = value.trim();
  return LocalizedName(ko: clean, sortName: clean, aliases: const []);
}

bool _sameName(LocalizedName name, String value) =>
    _slug(name.sortName) == _slug(value);

String _slug(String value) {
  final normalized = value.trim().toLowerCase().replaceAll(
    RegExp(r'[^a-z0-9가-힣]+'),
    '-',
  );
  final clean = normalized.replaceAll(RegExp(r'^-+|-+$'), '');
  return clean.isEmpty ? 'item' : clean;
}

String? _nullIfBlank(String? value) {
  final clean = value?.trim();
  return clean == null || clean.isEmpty ? null : clean;
}

Map<String, Object?> _nameToJson(LocalizedName name) => {
  'ko': name.ko,
  'sortName': name.sortName,
  'original': name.original,
  'english': name.english,
  'aliases': name.aliases,
};

LocalizedName _nameFromJson(String source) {
  final json = jsonDecode(source) as Map<String, Object?>;
  return LocalizedName(
    ko: json['ko']! as String,
    sortName: json['sortName']! as String,
    original: json['original'] as String?,
    english: json['english'] as String?,
    aliases: (json['aliases'] as List<Object?>? ?? const [])
        .whereType<String>()
        .toList(),
  );
}

List<SourceReference> _referencesFromJson(String source) => [
  for (final item in jsonDecode(source) as List<Object?>)
    SourceReference.fromJson(item! as Map<String, Object?>),
];
