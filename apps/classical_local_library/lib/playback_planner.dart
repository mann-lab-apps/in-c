import 'dart:math';

import 'classical_library_models.dart';

typedef RecordingSelector = Recording Function(List<Recording> recordings);
typedef WorkSelector = Work Function(List<Work> works);
typedef TrackSelector = Track Function(List<Track> tracks);

enum PlaybackMode {
  workRandom(label: '작품 랜덤'),
  recordingRandom(label: '녹음 랜덤'),
  singleTrackRandom(label: '악장/소품 랜덤');

  const PlaybackMode({required this.label});

  final String label;
}

class PlaybackQueueItem {
  const PlaybackQueueItem({
    required this.track,
    required this.file,
    required this.work,
    required this.recording,
    required this.partTitles,
  });

  final Track track;
  final LocalAudioFile file;
  final Work work;
  final Recording recording;
  final List<LocalizedName> partTitles;

  String get displayTitle {
    if (partTitles.isEmpty) {
      return work.title.ko;
    }

    return partTitles.map((part) => part.ko).join(', ');
  }
}

class PlaybackPlan {
  const PlaybackPlan({
    required this.mode,
    required this.work,
    required this.recording,
    required this.items,
  });

  final PlaybackMode mode;
  final Work work;
  final Recording recording;
  final List<PlaybackQueueItem> items;

  bool get isFullWorkOrRecording => mode != PlaybackMode.singleTrackRandom;
}

class ClassicalPlaybackPlanner {
  ClassicalPlaybackPlanner({
    required this.library,
    Random? random,
    this.recordingSelector,
    this.workSelector,
    this.trackSelector,
  }) : _random = random ?? Random();

  final ClassicalLibrary library;
  final Random _random;
  final RecordingSelector? recordingSelector;
  final WorkSelector? workSelector;
  final TrackSelector? trackSelector;

  PlaybackPlan createPlan(PlaybackMode mode) {
    return switch (mode) {
      PlaybackMode.workRandom => _createWorkPlan(),
      PlaybackMode.recordingRandom => _createRecordingPlan(),
      PlaybackMode.singleTrackRandom => _createSingleTrackPlan(),
    };
  }

  PlaybackPlan createPlanForRecording(String recordingId, PlaybackMode mode) {
    final recording = library.recording(recordingId);
    return _planFromRecording(recording, mode, singleTrack: false);
  }

  PlaybackPlan? createContinuationPlan({
    required String recordingId,
    required String trackId,
  }) {
    Recording? recording;
    for (final candidate in library.recordings) {
      if (candidate.id == recordingId) {
        recording = candidate;
        break;
      }
    }
    if (recording == null) {
      return null;
    }

    final tracks = library.tracksForRecording(recording.id);
    final startIndex = tracks.indexWhere((track) => track.id == trackId);
    if (startIndex < 0) {
      return null;
    }
    final work = library.work(recording.workId);
    return PlaybackPlan(
      mode: PlaybackMode.recordingRandom,
      work: work,
      recording: recording,
      items: [
        for (final track in tracks.skip(startIndex))
          _queueItem(track, work, recording),
      ],
    );
  }

  PlaybackPlan _createWorkPlan() {
    final work = _selectWork(_worksWithRecordings());
    final recording = _selectRecording(
      library
          .recordingsForWork(work.id)
          .where(
            (recording) => library.tracksForRecording(recording.id).isNotEmpty,
          )
          .toList(),
    );
    return _planFromRecording(recording, PlaybackMode.workRandom);
  }

  PlaybackPlan _createRecordingPlan() {
    final recording = _selectRecording(
      library.recordings
          .where(
            (recording) => library.tracksForRecording(recording.id).isNotEmpty,
          )
          .toList(),
    );
    return _planFromRecording(recording, PlaybackMode.recordingRandom);
  }

  PlaybackPlan _createSingleTrackPlan() {
    final track = _selectTrack(library.tracks);
    final recording = library.recording(track.recordingId);
    final work = library.work(recording.workId);
    return PlaybackPlan(
      mode: PlaybackMode.singleTrackRandom,
      work: work,
      recording: recording,
      items: [_queueItem(track, work, recording)],
    );
  }

  PlaybackPlan _planFromRecording(
    Recording recording,
    PlaybackMode mode, {
    bool singleTrack = false,
  }) {
    final work = library.work(recording.workId);
    final tracks = library.tracksForRecording(recording.id);
    final selectedTracks = singleTrack && tracks.isNotEmpty
        ? [tracks.first]
        : tracks;

    return PlaybackPlan(
      mode: mode,
      work: work,
      recording: recording,
      items: [
        for (final track in selectedTracks) _queueItem(track, work, recording),
      ],
    );
  }

  PlaybackQueueItem _queueItem(Track track, Work work, Recording recording) {
    return PlaybackQueueItem(
      track: track,
      file: library.file(track.fileId),
      work: work,
      recording: recording,
      partTitles: [
        for (final partId in track.workPartIds) library.workPart(partId).title,
      ],
    );
  }

  List<Work> _worksWithRecordings() {
    return library.works
        .where(
          (work) => library
              .recordingsForWork(work.id)
              .any(
                (recording) =>
                    library.tracksForRecording(recording.id).isNotEmpty,
              ),
        )
        .toList();
  }

  Recording _selectRecording(List<Recording> recordings) {
    if (recordingSelector != null) {
      return recordingSelector!(recordings);
    }

    return recordings[_random.nextInt(recordings.length)];
  }

  Work _selectWork(List<Work> works) {
    if (workSelector != null) {
      return workSelector!(works);
    }

    return works[_random.nextInt(works.length)];
  }

  Track _selectTrack(List<Track> tracks) {
    if (trackSelector != null) {
      return trackSelector!(tracks);
    }

    return tracks[_random.nextInt(tracks.length)];
  }
}
