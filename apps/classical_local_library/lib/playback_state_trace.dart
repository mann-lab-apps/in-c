import 'local_playback.dart';

/// Deterministic state snapshots for tests and failure reports.
///
/// This deliberately records synthetic track identifiers instead of file paths
/// so test output can be shared without exposing a user's library structure.
class PlaybackStateTrace {
  final List<PlaybackStateTraceEntry> _entries = [];

  List<PlaybackStateTraceEntry> get entries => List.unmodifiable(_entries);

  void record(String command, LocalPlaybackState state) {
    _entries.add(
      PlaybackStateTraceEntry.fromState(
        sequence: _entries.length + 1,
        command: command,
        state: state,
      ),
    );
  }

  String get diagnosticText =>
      _entries.map((entry) => entry.toDiagnosticLine()).join('\n');
}

class PlaybackStateTraceEntry {
  const PlaybackStateTraceEntry({
    required this.sequence,
    required this.command,
    required this.playerState,
    required this.processingState,
    required this.queueIndex,
    required this.trackId,
    required this.positionMillis,
    required this.durationMillis,
    required this.failureKind,
  });

  factory PlaybackStateTraceEntry.fromState({
    required int sequence,
    required String command,
    required LocalPlaybackState state,
  }) {
    return PlaybackStateTraceEntry(
      sequence: sequence,
      command: command,
      playerState: state.playerState.name,
      processingState: state.processingState.name,
      queueIndex: state.currentIndex,
      trackId: state.currentItem?.trackId,
      positionMillis: state.normalizedPosition.inMilliseconds,
      durationMillis: state.duration?.inMilliseconds,
      failureKind: state.failure?.kind.name,
    );
  }

  final int sequence;
  final String command;
  final String playerState;
  final String processingState;
  final int queueIndex;
  final String? trackId;
  final int positionMillis;
  final int? durationMillis;
  final String? failureKind;

  String toDiagnosticLine() {
    return '#$sequence command=$command player=$playerState processing=$processingState '
        'queueIndex=$queueIndex track=${trackId ?? '-'} '
        'positionMs=$positionMillis durationMs=${durationMillis ?? '-'} '
        'failure=${failureKind ?? '-'}';
  }
}
