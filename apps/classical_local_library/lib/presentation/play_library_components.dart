import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import '../classical_library_models.dart';
import '../library_search.dart';
import '../local_playback.dart';

class PlayWorkRow extends StatelessWidget {
  const PlayWorkRow({
    super.key,
    required this.work,
    required this.composer,
    required this.partCount,
    required this.recordingCount,
    this.onTap,
    this.actions = const [],
  });

  final Work work;
  final ClassicalPerson composer;
  final int partCount;
  final int recordingCount;
  final VoidCallback? onTap;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) => DdiroriItem(
    flat: true,
    title: work.title.ko,
    subtitle: [
      _localizedName(composer.name),
      if (work.catalogNumber != null) work.catalogNumber!,
      if (work.title.original != null) work.title.original!,
    ].join(' · '),
    leading: const Icon(Icons.account_tree_outlined),
    onTap: onTap,
    actions: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Text('악장 $partCount · 녹음 $recordingCount'),
      ),
      ...actions,
    ],
  );
}

class PlayRecordingRow extends StatelessWidget {
  const PlayRecordingRow({
    super.key,
    required this.recording,
    required this.workTitle,
    this.onTap,
    this.actions = const [],
  });

  final Recording recording;
  final String workTitle;
  final VoidCallback? onTap;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) => DdiroriItem(
    flat: true,
    title: recording.title.ko,
    subtitle: '$workTitle · ${recording.recordedYear ?? '연도 미상'}',
    leading: const Icon(Icons.graphic_eq),
    onTap: onTap,
    actions: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Text('트랙 ${recording.trackIds.length}개'),
      ),
      ...actions,
    ],
  );
}

class PlayMovementRow extends StatelessWidget {
  const PlayMovementRow({
    super.key,
    required this.sequenceNumber,
    required this.title,
    required this.hasLocalFile,
    this.originalTitle,
    this.duration,
    this.fileName,
    this.current = false,
    this.onTap,
  });

  final int sequenceNumber;
  final String title;
  final String? originalTitle;
  final Duration? duration;
  final String? fileName;
  final bool hasLocalFile;
  final bool current;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final details = [
      if (originalTitle != null && originalTitle != title) originalTitle!,
      if (duration != null) formatDdiroriDuration(duration!),
      ?fileName,
      hasLocalFile ? '로컬 파일 연결됨' : '재생 파일 없음',
    ];
    return Semantics(
      label:
          '$sequenceNumber번, $title, '
          '${hasLocalFile ? '재생 가능' : '재생 불가'}'
          '${current ? ', 현재 재생 중' : ''}',
      button: onTap != null,
      child: ExcludeSemantics(
        child: DdiroriItem(
          flat: true,
          title: title,
          subtitle: details.join(' · '),
          leading: CircleAvatar(child: Text('$sequenceNumber')),
          actions: [
            current
                ? const DdiroriStatusBadge(
                    label: '재생 중',
                    tone: DdiroriStatusTone.success,
                  )
                : DdiroriStatusBadge(
                    label: hasLocalFile ? '재생 가능' : '파일 없음',
                    tone: hasLocalFile
                        ? DdiroriStatusTone.success
                        : DdiroriStatusTone.warning,
                  ),
          ],
          selected: current,
          enabled: hasLocalFile || onTap == null,
          onTap: hasLocalFile ? onTap : null,
        ),
      ),
    );
  }
}

class PlaySearchResultRow extends StatelessWidget {
  const PlaySearchResultRow({super.key, required this.result, this.onTap});

  final LibrarySearchResult result;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => DdiroriItem(
    flat: true,
    title: result.title,
    subtitle: result.subtitle,
    leading: CircleAvatar(
      child: ExcludeSemantics(child: Text(result.type.label.characters.first)),
    ),
    actions: [
      DdiroriStatusBadge(
        label: result.type.label,
        tone: DdiroriStatusTone.info,
        icon: _searchResultIcon(result.type),
      ),
    ],
    onTap: onTap,
  );
}

class PlayQueueRow extends StatelessWidget {
  const PlayQueueRow({
    super.key,
    required this.index,
    required this.item,
    this.current = false,
  });

  final int index;
  final LocalPlaybackQueueItem item;
  final bool current;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label:
        '큐 ${index + 1}번, ${item.displayTitle}, ${item.workTitle}, '
        '${item.recordingTitle}, ${item.fileSourceLabel}'
        '${current ? ', 현재 악장' : ''}',
    selected: current,
    child: DdiroriItem(
      flat: true,
      title: item.displayTitle,
      subtitle:
          '${item.workTitle} · ${item.recordingTitle}\n'
          '${item.fileSourceLabel} · ${_fileName(item.path)}',
      leading: CircleAvatar(child: Text('${index + 1}')),
      actions: [
        if (current)
          const DdiroriStatusBadge(
            label: '현재 악장',
            tone: DdiroriStatusTone.info,
          ),
      ],
      selected: current,
    ),
  );
}

class PlayAudioFileRow extends StatelessWidget {
  const PlayAudioFileRow({
    super.key,
    required this.file,
    required this.details,
    this.missing = false,
    this.selecting = false,
    this.selected = false,
    this.onSelected,
    this.actions = const [],
    this.enabled = true,
  });

  final LocalAudioFile file;
  final String details;
  final bool missing;
  final bool selecting;
  final bool selected;
  final ValueChanged<bool>? onSelected;
  final List<Widget> actions;
  final bool enabled;

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    label:
        '${file.fileName ?? _fileName(file.path)}, '
        '${missing ? '파일 없음' : file.importStatus.label}'
        '${selected ? ', 선택됨' : ''}',
    selected: selecting ? selected : null,
    enabled: enabled,
    child: DdiroriItem(
      title: file.fileName ?? _fileName(file.path),
      subtitle: details,
      leading: Icon(
        missing ? Icons.file_present_outlined : Icons.link_outlined,
      ),
      trailing: DdiroriStatusBadge(
        label: missing ? '파일 없음' : file.importStatus.label,
        tone: missing
            ? DdiroriStatusTone.error
            : switch (file.importStatus) {
                AudioImportStatus.linked => DdiroriStatusTone.success,
                AudioImportStatus.needsReview => DdiroriStatusTone.warning,
                AudioImportStatus.missing => DdiroriStatusTone.error,
                AudioImportStatus.scanned => DdiroriStatusTone.neutral,
              },
      ),
      selecting: selecting,
      selected: selected,
      onSelected: onSelected,
      actions: actions,
      enabled: enabled,
    ),
  );
}

String _localizedName(LocalizedName name) =>
    name.original == null ? name.ko : '${name.ko} / ${name.original}';

String _fileName(String path) {
  final normalized = path.replaceAll('\\', '/');
  final name = normalized.split('/').last;
  return name.isEmpty ? '이름 없는 음원 파일' : name;
}

IconData _searchResultIcon(SearchResultType type) => switch (type) {
  SearchResultType.person => Icons.person_outline,
  SearchResultType.work => Icons.library_music_outlined,
  SearchResultType.workPart => Icons.music_note_outlined,
  SearchResultType.recording => Icons.album_outlined,
  SearchResultType.fileCandidate => Icons.audio_file_outlined,
};
