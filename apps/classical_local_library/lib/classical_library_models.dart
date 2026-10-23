import 'audio_tags.dart';

const _unsetLocalAudioValue = Object();
final Expando<_ClassicalLibraryIndex> _libraryIndexes =
    Expando<_ClassicalLibraryIndex>('classicalLibraryIndex');

class LocalizedName {
  const LocalizedName({
    required this.ko,
    required this.sortName,
    this.original,
    this.english,
    this.aliases = const [],
  });

  final String ko;
  final String sortName;
  final String? original;
  final String? english;
  final List<String> aliases;

  List<String> get searchNames => [ko, ?original, ?english, ...aliases];
}

class SourceReference {
  const SourceReference({
    required this.kind,
    this.url,
    this.externalId,
    this.licenseLabel,
    this.copyrightStatus,
    this.regionNote,
  });

  final SourceKind kind;
  final String? url;
  final String? externalId;
  final String? licenseLabel;
  final String? copyrightStatus;
  final String? regionNote;

  Map<String, Object?> toJson() {
    return {
      'kind': kind.name,
      'url': url,
      'externalId': externalId,
      'licenseLabel': licenseLabel,
      'copyrightStatus': copyrightStatus,
      'regionNote': regionNote,
    };
  }

  factory SourceReference.fromJson(Map<String, Object?> json) {
    return SourceReference(
      kind: SourceKind.values.byName(json['kind'] as String),
      url: json['url'] as String?,
      externalId: json['externalId'] as String?,
      licenseLabel: json['licenseLabel'] as String?,
      copyrightStatus: json['copyrightStatus'] as String?,
      regionNote: json['regionNote'] as String?,
    );
  }
}

enum SourceKind { localTag, localImport, imslp, musicBrainz, acoustId }

enum AudioImportStatus {
  scanned(label: '스캔됨'),
  needsReview(label: '정리 필요'),
  linked(label: '연결됨'),
  missing(label: '파일 없음');

  const AudioImportStatus({required this.label});

  final String label;
}

enum AudioFileAvailability {
  present(label: '사용 가능'),
  missing(label: '파일 없음');

  const AudioFileAvailability({required this.label});

  final String label;
}

class ClassicalPerson {
  const ClassicalPerson({
    required this.id,
    required this.name,
    this.birthYear,
    this.deathYear,
  });

  final String id;
  final LocalizedName name;
  final int? birthYear;
  final int? deathYear;
}

class Instrument {
  const Instrument({required this.id, required this.name});

  final String id;
  final LocalizedName name;
}

class Ensemble {
  const Ensemble({required this.id, required this.name});

  final String id;
  final LocalizedName name;
}

class Work {
  const Work({
    required this.id,
    required this.composerId,
    required this.title,
    this.catalogNumber,
    this.periodLabel,
    this.sourceReferences = const [],
  });

  final String id;
  final String composerId;
  final LocalizedName title;
  final String? catalogNumber;
  final String? periodLabel;
  final List<SourceReference> sourceReferences;
}

class WorkPart {
  const WorkPart({
    required this.id,
    required this.workId,
    required this.title,
    required this.sequenceNumber,
  });

  final String id;
  final String workId;
  final LocalizedName title;
  final int sequenceNumber;
}

class AlbumRelease {
  const AlbumRelease({
    required this.id,
    required this.title,
    this.label,
    this.releaseYear,
  });

  final String id;
  final LocalizedName title;
  final String? label;
  final int? releaseYear;
}

class RecordingCredit {
  const RecordingCredit({
    required this.personId,
    required this.role,
    this.instrumentId,
  });

  final String personId;
  final RecordingRole role;
  final String? instrumentId;
}

enum RecordingRole { performer, conductor }

class Recording {
  const Recording({
    required this.id,
    required this.workId,
    required this.title,
    required this.trackIds,
    this.albumId,
    this.ensembleId,
    this.credits = const [],
    this.recordedYear,
    this.sourceReferences = const [],
  });

  final String id;
  final String workId;
  final LocalizedName title;
  final List<String> trackIds;
  final String? albumId;
  final String? ensembleId;
  final List<RecordingCredit> credits;
  final int? recordedYear;
  final List<SourceReference> sourceReferences;
}

class Track {
  const Track({
    required this.id,
    required this.recordingId,
    required this.fileId,
    required this.sequenceNumber,
    this.workPartIds = const [],
    this.title,
    this.duration,
  });

  final String id;
  final String recordingId;
  final String fileId;
  final int sequenceNumber;
  final List<String> workPartIds;
  final LocalizedName? title;
  final Duration? duration;
}

class LocalAudioFile {
  const LocalAudioFile({
    required this.id,
    required this.path,
    required this.format,
    this.fileName,
    this.sizeBytes,
    this.modifiedAtMillis,
    this.lastSeenAtMillis,
    this.consecutiveMissCount = 0,
    this.availability = AudioFileAvailability.present,
    this.lightweightFingerprint,
    this.tagReadStatus = AudioTagReadStatus.noTags,
    this.tagMetadata,
    this.tagFailureKind,
    this.importStatus = AudioImportStatus.linked,
    this.sourceReferences = const [],
  });

  final String id;
  final String path;
  final String format;
  final String? fileName;
  final int? sizeBytes;
  final int? modifiedAtMillis;
  final int? lastSeenAtMillis;
  final int consecutiveMissCount;
  final AudioFileAvailability availability;
  final String? lightweightFingerprint;
  final AudioTagReadStatus tagReadStatus;
  final AudioTagMetadata? tagMetadata;
  final AudioTagFailureKind? tagFailureKind;
  final AudioImportStatus importStatus;
  final List<SourceReference> sourceReferences;

  LocalAudioFile copyWith({
    String? id,
    String? path,
    String? format,
    String? fileName,
    int? sizeBytes,
    int? modifiedAtMillis,
    int? lastSeenAtMillis,
    int? consecutiveMissCount,
    AudioFileAvailability? availability,
    String? lightweightFingerprint,
    AudioTagReadStatus? tagReadStatus,
    Object? tagMetadata = _unsetLocalAudioValue,
    Object? tagFailureKind = _unsetLocalAudioValue,
    AudioImportStatus? importStatus,
    List<SourceReference>? sourceReferences,
  }) {
    return LocalAudioFile(
      id: id ?? this.id,
      path: path ?? this.path,
      format: format ?? this.format,
      fileName: fileName ?? this.fileName,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      modifiedAtMillis: modifiedAtMillis ?? this.modifiedAtMillis,
      lastSeenAtMillis: lastSeenAtMillis ?? this.lastSeenAtMillis,
      consecutiveMissCount: consecutiveMissCount ?? this.consecutiveMissCount,
      availability: availability ?? this.availability,
      lightweightFingerprint:
          lightweightFingerprint ?? this.lightweightFingerprint,
      tagReadStatus: tagReadStatus ?? this.tagReadStatus,
      tagMetadata: identical(tagMetadata, _unsetLocalAudioValue)
          ? this.tagMetadata
          : tagMetadata as AudioTagMetadata?,
      tagFailureKind: identical(tagFailureKind, _unsetLocalAudioValue)
          ? this.tagFailureKind
          : tagFailureKind as AudioTagFailureKind?,
      importStatus: importStatus ?? this.importStatus,
      sourceReferences: sourceReferences ?? this.sourceReferences,
    );
  }

  Map<String, Object?> toJson() {
    return {
      'id': id,
      'path': path,
      'format': format,
      'fileName': fileName,
      'sizeBytes': sizeBytes,
      'modifiedAtMillis': modifiedAtMillis,
      'lastSeenAtMillis': lastSeenAtMillis,
      'consecutiveMissCount': consecutiveMissCount,
      'availability': availability.name,
      'lightweightFingerprint': lightweightFingerprint,
      'tagReadStatus': tagReadStatus.name,
      'tagMetadata': tagMetadata?.toJson(),
      'tagFailureKind': tagFailureKind?.name,
      'importStatus': importStatus.name,
      'sourceReferences': [
        for (final source in sourceReferences) source.toJson(),
      ],
    };
  }

  factory LocalAudioFile.fromJson(Map<String, Object?> json) {
    return LocalAudioFile(
      id: json['id'] as String,
      path: json['path'] as String,
      format: json['format'] as String,
      fileName: json['fileName'] as String?,
      sizeBytes: json['sizeBytes'] as int?,
      modifiedAtMillis: json['modifiedAtMillis'] as int?,
      lastSeenAtMillis: json['lastSeenAtMillis'] as int?,
      consecutiveMissCount: json['consecutiveMissCount'] as int? ?? 0,
      availability: AudioFileAvailability.values.byName(
        json['availability'] as String? ?? AudioFileAvailability.present.name,
      ),
      lightweightFingerprint: json['lightweightFingerprint'] as String?,
      tagReadStatus: AudioTagReadStatus.values.byName(
        json['tagReadStatus'] as String? ?? AudioTagReadStatus.noTags.name,
      ),
      tagMetadata: json['tagMetadata'] == null
          ? null
          : AudioTagMetadata.fromJson(
              json['tagMetadata']! as Map<String, Object?>,
            ),
      tagFailureKind: json['tagFailureKind'] == null
          ? null
          : AudioTagFailureKind.values.byName(
              json['tagFailureKind']! as String,
            ),
      importStatus: AudioImportStatus.values.byName(
        json['importStatus'] as String,
      ),
      sourceReferences: [
        for (final source
            in (json['sourceReferences'] as List<Object?>? ?? const []))
          SourceReference.fromJson(source! as Map<String, Object?>),
      ],
    );
  }
}

class PlayHistoryEntry {
  const PlayHistoryEntry({
    required this.playedAt,
    required this.recordingId,
    this.trackId,
  });

  final DateTime playedAt;
  final String recordingId;
  final String? trackId;
}

class ClassicalLibrary {
  const ClassicalLibrary({
    required this.people,
    required this.instruments,
    required this.ensembles,
    required this.works,
    required this.workParts,
    required this.albums,
    required this.recordings,
    required this.tracks,
    required this.files,
    this.playHistory = const [],
  });

  final List<ClassicalPerson> people;
  final List<Instrument> instruments;
  final List<Ensemble> ensembles;
  final List<Work> works;
  final List<WorkPart> workParts;
  final List<AlbumRelease> albums;
  final List<Recording> recordings;
  final List<Track> tracks;
  final List<LocalAudioFile> files;
  final List<PlayHistoryEntry> playHistory;

  _ClassicalLibraryIndex get _index =>
      _libraryIndexes[this] ??= _ClassicalLibraryIndex(this);

  ClassicalPerson person(String id) => _required(_index.people, id);

  Work work(String id) => _required(_index.works, id);

  WorkPart workPart(String id) => _required(_index.parts, id);

  Recording recording(String id) => _required(_index.recordings, id);

  Track track(String id) => _required(_index.tracks, id);

  LocalAudioFile file(String id) => _required(_index.files, id);

  List<WorkPart> partsForWork(String workId) {
    return [...?_index.partsByWork[workId]];
  }

  List<Recording> recordingsForWork(String workId) {
    return [...?_index.recordingsByWork[workId]];
  }

  List<Track> tracksForRecording(String recordingId) {
    return [...?_index.tracksByRecording[recordingId]];
  }
}

T _required<T>(Map<String, T> values, String id) {
  final value = values[id];
  if (value == null) throw StateError('No element');
  return value;
}

class _ClassicalLibraryIndex {
  _ClassicalLibraryIndex(ClassicalLibrary library)
    : people = {for (final item in library.people) item.id: item},
      works = {for (final item in library.works) item.id: item},
      parts = {for (final item in library.workParts) item.id: item},
      recordings = {for (final item in library.recordings) item.id: item},
      tracks = {for (final item in library.tracks) item.id: item},
      files = {for (final item in library.files) item.id: item} {
    for (final part in library.workParts) {
      partsByWork.putIfAbsent(part.workId, () => []).add(part);
    }
    for (final values in partsByWork.values) {
      values.sort((a, b) => a.sequenceNumber.compareTo(b.sequenceNumber));
    }
    for (final recording in library.recordings) {
      recordingsByWork.putIfAbsent(recording.workId, () => []).add(recording);
    }
    for (final values in recordingsByWork.values) {
      values.sort((a, b) => a.title.sortName.compareTo(b.title.sortName));
    }
    for (final track in library.tracks) {
      tracksByRecording.putIfAbsent(track.recordingId, () => []).add(track);
    }
    for (final values in tracksByRecording.values) {
      values.sort((a, b) => a.sequenceNumber.compareTo(b.sequenceNumber));
    }
  }

  final Map<String, ClassicalPerson> people;
  final Map<String, Work> works;
  final Map<String, WorkPart> parts;
  final Map<String, Recording> recordings;
  final Map<String, Track> tracks;
  final Map<String, LocalAudioFile> files;
  final Map<String, List<WorkPart>> partsByWork = {};
  final Map<String, List<Recording>> recordingsByWork = {};
  final Map<String, List<Track>> tracksByRecording = {};
}
