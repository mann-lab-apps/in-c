import 'classical_library_models.dart';
import 'file_links.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';

class WorkPartDetail {
  const WorkPartDetail({required this.part, required this.hasLocalFile});

  final WorkPart part;
  final bool hasLocalFile;
}

class RecordingSummaryDetail {
  const RecordingSummaryDetail({
    required this.recording,
    required this.participantLabel,
    required this.availableTrackCount,
    required this.trackCount,
  });

  final Recording recording;
  final String participantLabel;
  final int availableTrackCount;
  final int trackCount;

  bool get canPlay => availableTrackCount > 0;
}

class WorkDetailData {
  const WorkDetailData({
    required this.work,
    required this.composer,
    required this.displayComposerName,
    required this.displayTitle,
    required this.displayCatalogNumber,
    required this.parts,
    required this.recordings,
  });

  final Work work;
  final ClassicalPerson composer;
  final String displayComposerName;
  final String displayTitle;
  final String? displayCatalogNumber;
  final List<WorkPartDetail> parts;
  final List<RecordingSummaryDetail> recordings;
}

class RecordingCreditDetail {
  const RecordingCreditDetail({required this.name, required this.roleLabel});

  final String name;
  final String roleLabel;
}

class RecordingTrackDetail {
  const RecordingTrackDetail({
    required this.track,
    required this.displayTitle,
    required this.originalTitle,
    required this.hasLocalFile,
    required this.fileName,
  });

  final Track track;
  final String displayTitle;
  final String? originalTitle;
  final bool hasLocalFile;
  final String? fileName;
}

class RecordingDetailData {
  const RecordingDetailData({
    required this.recording,
    required this.work,
    required this.composer,
    required this.displayComposerName,
    required this.displayWorkTitle,
    required this.displayRecordingTitle,
    required this.ensembleName,
    required this.albumTitle,
    required this.year,
    required this.credits,
    required this.tracks,
    required this.totalDuration,
  });

  final Recording recording;
  final Work work;
  final ClassicalPerson composer;
  final String displayComposerName;
  final String displayWorkTitle;
  final String displayRecordingTitle;
  final String? ensembleName;
  final String? albumTitle;
  final int? year;
  final List<RecordingCreditDetail> credits;
  final List<RecordingTrackDetail> tracks;
  final Duration? totalDuration;

  int get availableTrackCount =>
      tracks.where((track) => track.hasLocalFile).length;

  bool get canPlay => availableTrackCount > 0;
}

class LibraryDetailBuilder {
  const LibraryDetailBuilder({
    required this.library,
    required this.scannedFiles,
    required this.links,
    this.candidates = const [],
    this.overrides = const [],
    this.workAliases = const {},
    this.recordingAliases = const {},
    this.fileResolver = const LinkedAudioFileResolver(),
  });

  final ClassicalLibrary library;
  final List<LocalAudioFile> scannedFiles;
  final List<AudioFileTrackLink> links;
  final List<MetadataCandidate> candidates;
  final List<MetadataOverride> overrides;
  final Map<String, String> workAliases;
  final Map<String, String> recordingAliases;
  final LinkedAudioFileResolver fileResolver;

  WorkDetailData buildWork(String workId) {
    final indexes = _buildIndexes();
    final work = library.work(_resolve(workAliases, workId));
    final recordings = library.recordingsForWork(work.id);
    final linkedPartIds = <String>{};
    String? correctedComposer;
    String? correctedTitle;
    String? correctedCatalogNumber;
    final summaries = <RecordingSummaryDetail>[];
    for (final recording in recordings) {
      var available = 0;
      for (final track in library.tracksForRecording(recording.id)) {
        final file = indexes.linkedFiles.fileForTrack(track);
        if (file == null) continue;
        available += 1;
        linkedPartIds.addAll(track.workPartIds);
        final effective = _effective(file, indexes);
        correctedComposer ??= effective.text(MetadataField.composer);
        correctedTitle ??= effective.text(MetadataField.workTitle);
        correctedCatalogNumber ??= effective.text(MetadataField.catalogNumber);
      }
      summaries.add(
        RecordingSummaryDetail(
          recording: recording,
          participantLabel: _participantLabel(recording),
          availableTrackCount: available,
          trackCount: library.tracksForRecording(recording.id).length,
        ),
      );
    }
    summaries.sort((left, right) {
      final byTitle = left.recording.title.sortName.compareTo(
        right.recording.title.sortName,
      );
      return byTitle != 0
          ? byTitle
          : left.recording.id.compareTo(right.recording.id);
    });
    return WorkDetailData(
      work: work,
      composer: library.person(work.composerId),
      displayComposerName:
          correctedComposer ?? library.person(work.composerId).name.ko,
      displayTitle: correctedTitle ?? work.title.ko,
      displayCatalogNumber: correctedCatalogNumber ?? work.catalogNumber,
      parts: [
        for (final part in library.partsForWork(work.id))
          WorkPartDetail(
            part: part,
            hasLocalFile: linkedPartIds.contains(part.id),
          ),
      ],
      recordings: List.unmodifiable(summaries),
    );
  }

  RecordingDetailData buildRecording(String recordingId) {
    final indexes = _buildIndexes();
    final recording = library.recording(
      _resolve(recordingAliases, recordingId),
    );
    final work = library.work(_resolve(workAliases, recording.workId));
    final trackDetails = <RecordingTrackDetail>[];
    String? correctedComposer;
    String? correctedWorkTitle;
    int? correctedYear;
    String? correctedPerformer;
    String? correctedConductor;
    String? correctedEnsemble;
    var totalDuration = Duration.zero;
    var hasDuration = false;
    for (final track in library.tracksForRecording(recording.id)) {
      final file = indexes.linkedFiles.fileForTrack(track);
      final effective = file == null ? null : _effective(file, indexes);
      correctedComposer ??= effective?.text(MetadataField.composer);
      correctedWorkTitle ??= effective?.text(MetadataField.workTitle);
      correctedYear ??= effective?.number(MetadataField.year);
      correctedPerformer ??= effective?.text(MetadataField.performer);
      correctedConductor ??= effective?.text(MetadataField.conductor);
      correctedEnsemble ??= effective?.text(MetadataField.ensemble);
      final title = effective?.text(MetadataField.movementTitle);
      final partNames = [
        for (final partId in track.workPartIds) library.workPart(partId).title,
      ];
      final duration = track.duration;
      if (duration != null) {
        totalDuration += duration;
        hasDuration = true;
      }
      trackDetails.add(
        RecordingTrackDetail(
          track: track,
          displayTitle:
              title ??
              track.title?.ko ??
              (partNames.isEmpty
                  ? '${track.sequenceNumber}번 트랙'
                  : partNames.map((name) => name.ko).join(', ')),
          originalTitle:
              track.title?.original ??
              (partNames.length == 1 ? partNames.single.original : null),
          hasLocalFile: file != null,
          fileName: file == null ? null : _fileName(file.path),
        ),
      );
    }
    return RecordingDetailData(
      recording: recording,
      work: work,
      composer: library.person(work.composerId),
      displayComposerName:
          correctedComposer ?? library.person(work.composerId).name.ko,
      displayWorkTitle: correctedWorkTitle ?? work.title.ko,
      displayRecordingTitle: recording.title.ko,
      ensembleName: correctedEnsemble ?? _ensembleName(recording.ensembleId),
      albumTitle: _album(recording.albumId)?.title.ko,
      year:
          correctedYear ??
          recording.recordedYear ??
          _album(recording.albumId)?.releaseYear,
      credits: [
        if (correctedConductor != null)
          RecordingCreditDetail(name: correctedConductor, roleLabel: '지휘')
        else
          for (final credit in recording.credits)
            if (credit.role == RecordingRole.conductor)
              RecordingCreditDetail(
                name: library.person(credit.personId).name.ko,
                roleLabel: _creditRole(credit),
              ),
        if (correctedPerformer != null)
          RecordingCreditDetail(name: correctedPerformer, roleLabel: '연주')
        else
          for (final credit in recording.credits)
            if (credit.role == RecordingRole.performer)
              RecordingCreditDetail(
                name: library.person(credit.personId).name.ko,
                roleLabel: _creditRole(credit),
              ),
      ],
      tracks: List.unmodifiable(trackDetails),
      totalDuration: hasDuration ? totalDuration : null,
    );
  }

  _LibraryDetailIndexes _buildIndexes() => _LibraryDetailIndexes(
    linkedFiles: fileResolver.index(scannedFiles: scannedFiles, links: links),
    candidatesByFileId: {
      for (final candidate in candidates) candidate.fileId: candidate,
    },
    overridesByFileId: {
      for (final override in overrides) override.fileId: override,
    },
  );

  EffectiveFileMetadata _effective(
    LocalAudioFile file,
    _LibraryDetailIndexes indexes,
  ) {
    return EffectiveFileMetadata.resolve(
      candidate: indexes.candidatesByFileId[file.id],
      tag: file.tagMetadata,
      override: indexes.overridesByFileId[file.id],
    );
  }

  String _participantLabel(Recording recording) {
    final values = <String>[
      for (final credit in recording.credits)
        library.person(credit.personId).name.ko,
      ?_ensembleName(recording.ensembleId),
    ];
    return values.isEmpty ? '참여 정보 없음' : values.join(' · ');
  }

  String? _ensembleName(String? id) {
    if (id == null) return null;
    for (final ensemble in library.ensembles) {
      if (ensemble.id == id) return ensemble.name.ko;
    }
    return null;
  }

  AlbumRelease? _album(String? id) {
    if (id == null) return null;
    for (final album in library.albums) {
      if (album.id == id) return album;
    }
    return null;
  }

  String _creditRole(RecordingCredit credit) {
    final role = switch (credit.role) {
      RecordingRole.performer => '연주',
      RecordingRole.conductor => '지휘',
    };
    if (credit.instrumentId == null) return role;
    for (final instrument in library.instruments) {
      if (instrument.id == credit.instrumentId) {
        return '$role · ${instrument.name.ko}';
      }
    }
    return role;
  }
}

class _LibraryDetailIndexes {
  const _LibraryDetailIndexes({
    required this.linkedFiles,
    required this.candidatesByFileId,
    required this.overridesByFileId,
  });

  final LinkedAudioFileIndex linkedFiles;
  final Map<String, MetadataCandidate> candidatesByFileId;
  final Map<String, MetadataOverride> overridesByFileId;
}

String _resolve(Map<String, String> aliases, String id) {
  var current = id;
  final visited = <String>{};
  while (visited.add(current)) {
    final next = aliases[current];
    if (next == null) return current;
    current = next;
  }
  throw StateError('순환 병합 별칭을 확인했습니다.');
}

String _fileName(String path) {
  final normalized = path.replaceAll('\\', '/');
  final name = normalized.split('/').last;
  return name.isEmpty ? '이름 없는 음원 파일' : name;
}
