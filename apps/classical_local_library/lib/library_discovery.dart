import 'classical_library_models.dart';
import 'library_search.dart';
import 'metadata_candidates.dart';
import 'metadata_overrides.dart';

enum DiscoveryResultType { work, recording }

class DiscoveryResult {
  const DiscoveryResult({
    required this.type,
    required this.id,
    required this.title,
    required this.reason,
  });

  final DiscoveryResultType type;
  final String id;
  final String title;
  final String reason;
}

class LibraryDiscoveryService {
  const LibraryDiscoveryService({this.normalizer = const SearchNormalizer()});

  final SearchNormalizer normalizer;

  List<DiscoveryResult> otherWorksByComposer(
    ClassicalLibrary library, {
    required String workId,
    Map<String, String> workAliases = const {},
  }) {
    final canonicalWorkId = workAliases[workId] ?? workId;
    final current = library.work(canonicalWorkId);
    final composer = library.person(current.composerId);
    return _uniqueSorted([
      for (final work in library.works)
        if ((workAliases[work.id] ?? work.id) != current.id &&
            work.composerId == current.composerId)
          DiscoveryResult(
            type: DiscoveryResultType.work,
            id: workAliases[work.id] ?? work.id,
            title: work.title.ko,
            reason: '${composer.name.ko}의 다른 작품',
          ),
    ]);
  }

  List<DiscoveryResult> otherRecordingsForWork(
    ClassicalLibrary library, {
    required String recordingId,
    Map<String, String> recordingAliases = const {},
  }) {
    final canonicalRecordingId = recordingAliases[recordingId] ?? recordingId;
    final current = library.recording(canonicalRecordingId);
    return _uniqueSorted([
      for (final recording in library.recordingsForWork(current.workId))
        if ((recordingAliases[recording.id] ?? recording.id) != current.id)
          DiscoveryResult(
            type: DiscoveryResultType.recording,
            id: recordingAliases[recording.id] ?? recording.id,
            title: recording.title.ko,
            reason: '같은 작품의 다른 녹음',
          ),
    ]);
  }

  List<DiscoveryResult> recordingsByPerson(
    ClassicalLibrary library, {
    required String personId,
    Map<String, String> recordingAliases = const {},
  }) {
    final person = library.person(personId);
    return _uniqueSorted([
      for (final recording in library.recordings)
        if (recording.credits.any((credit) => credit.personId == personId))
          DiscoveryResult(
            type: DiscoveryResultType.recording,
            id: recordingAliases[recording.id] ?? recording.id,
            title: recording.title.ko,
            reason: '${person.name.ko} 참여 녹음',
          ),
    ]);
  }

  List<DiscoveryResult> relatedToFile({
    required ClassicalLibrary library,
    required LocalAudioFile file,
    MetadataCandidate? candidate,
    MetadataOverride? override,
    Map<String, String> workAliases = const {},
  }) {
    final effective = EffectiveFileMetadata.resolve(
      candidate: candidate,
      tag: file.tagMetadata,
      override: override,
    );
    final composerQuery = normalizer.normalize(
      effective.text(MetadataField.composer) ?? '',
    );
    final workQuery = normalizer.normalize(
      effective.text(MetadataField.workTitle) ?? '',
    );
    final matches = <DiscoveryResult>[];
    for (final work in library.works) {
      final composer = library.person(work.composerId);
      final composerNames = normalizer.normalize(
        composer.name.searchNames.join(' '),
      );
      final workNames = normalizer.normalize(work.title.searchNames.join(' '));
      final composerMatches =
          composerQuery.isNotEmpty &&
          (composerNames.contains(composerQuery) ||
              composerQuery.contains(
                normalizer.normalize(composer.name.sortName),
              ));
      final workMatches =
          workQuery.isNotEmpty &&
          (workNames.contains(workQuery) || workQuery.contains(workNames));
      if (!composerMatches && !workMatches) continue;
      matches.add(
        DiscoveryResult(
          type: DiscoveryResultType.work,
          id: work.id,
          title: work.title.ko,
          reason: override == null ? '파일 메타데이터와 관련된 작품' : '교정·승인 메타데이터와 관련된 작품',
        ),
      );
    }
    return _uniqueSorted([
      for (final match in matches)
        DiscoveryResult(
          type: match.type,
          id: workAliases[match.id] ?? match.id,
          title: match.title,
          reason: match.reason,
        ),
    ]);
  }

  List<DiscoveryResult> fromHistory(
    ClassicalLibrary library,
    List<PlayHistoryEntry> history, {
    Map<String, String> workAliases = const {},
    Map<String, String> recordingAliases = const {},
  }) {
    if (history.isEmpty) return const [];
    final recent = history.toList()
      ..sort((left, right) => right.playedAt.compareTo(left.playedAt));
    final recordingId =
        recordingAliases[recent.first.recordingId] ?? recent.first.recordingId;
    final recording = library.recording(recordingId);
    return _uniqueSorted([
      ...otherRecordingsForWork(
        library,
        recordingId: recording.id,
        recordingAliases: recordingAliases,
      ),
      ...otherWorksByComposer(
        library,
        workId: recording.workId,
        workAliases: workAliases,
      ),
    ]);
  }

  List<DiscoveryResult> _uniqueSorted(Iterable<DiscoveryResult> source) {
    final unique = <String, DiscoveryResult>{};
    for (final result in source) {
      unique.putIfAbsent('${result.type.name}:${result.id}', () => result);
    }
    final results = unique.values.toList()
      ..sort((left, right) {
        final byReason = left.reason.compareTo(right.reason);
        return byReason != 0 ? byReason : left.title.compareTo(right.title);
      });
    return List.unmodifiable(results);
  }
}
