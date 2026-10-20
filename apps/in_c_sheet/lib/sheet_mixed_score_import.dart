import 'package:flutter/material.dart';

import 'sheet_file_import.dart';

const int sheetMixedScoreImportMaxFiles = 200;

const List<String> sheetMixedScoreImportExtensions = <String>[
  'pdf',
  'txt',
  'text',
  'md',
  'markdown',
  'cho',
  'chordpro',
  'chopro',
  'chord',
  'crd',
  'pro',
  'song',
  'onsong',
  'docx',
  'rtf',
];

enum SheetMixedScoreFileStatus { ready, unsupported, unavailable, duplicate }

class SheetMixedScorePickedFile {
  const SheetMixedScorePickedFile({required this.name, this.path});

  final String name;
  final String? path;
}

class SheetMixedScoreFileCandidate {
  const SheetMixedScoreFileCandidate({
    required this.name,
    required this.path,
    required this.status,
  });

  final String name;
  final String? path;
  final SheetMixedScoreFileStatus status;

  bool get isReady => status == SheetMixedScoreFileStatus.ready;

  String get statusLabel => switch (status) {
    SheetMixedScoreFileStatus.ready => _formatLabel(name),
    SheetMixedScoreFileStatus.unsupported => '지원하지 않는 형식',
    SheetMixedScoreFileStatus.unavailable => '파일을 읽을 수 없음',
    SheetMixedScoreFileStatus.duplicate => '같은 파일을 두 번 선택함',
  };

  static String _formatLabel(String name) {
    if (SheetFileImportPolicy.isPdfFileName(name)) return 'PDF';
    if (SheetFileImportPolicy.isChordProFileName(name)) return 'ChordPro';
    if (SheetFileImportPolicy.isPlainTextFileName(name)) return '텍스트';
    if (SheetFileImportPolicy.isDocxFileName(name)) return 'DOCX';
    if (SheetFileImportPolicy.isRtfFileName(name)) return 'RTF';
    return '악보 파일';
  }
}

class SheetMixedScoreImportPreview {
  const SheetMixedScoreImportPreview({required this.candidates});

  factory SheetMixedScoreImportPreview.fromFiles(
    Iterable<SheetMixedScorePickedFile> files,
  ) {
    final seenPaths = <String>{};
    final candidates = <SheetMixedScoreFileCandidate>[];
    for (final file in files) {
      final name = file.name.trim();
      final path = file.path?.trim();
      late final SheetMixedScoreFileStatus status;
      if (name.isEmpty || path == null || path.isEmpty) {
        status = SheetMixedScoreFileStatus.unavailable;
      } else if (!SheetFileImportPolicy.isSupportedScoreFileName(name)) {
        status = SheetMixedScoreFileStatus.unsupported;
      } else if (!seenPaths.add(path)) {
        status = SheetMixedScoreFileStatus.duplicate;
      } else {
        status = SheetMixedScoreFileStatus.ready;
      }
      candidates.add(
        SheetMixedScoreFileCandidate(name: name, path: path, status: status),
      );
    }
    return SheetMixedScoreImportPreview(
      candidates: List<SheetMixedScoreFileCandidate>.unmodifiable(candidates),
    );
  }

  final List<SheetMixedScoreFileCandidate> candidates;

  List<SheetMixedScoreFileCandidate> get readyFiles =>
      List.unmodifiable(candidates.where((candidate) => candidate.isReady));

  int get blockedCount =>
      candidates.where((candidate) => !candidate.isReady).length;

  bool get exceedsFileLimit =>
      candidates.length > sheetMixedScoreImportMaxFiles;

  bool get canImport =>
      candidates.isNotEmpty &&
      readyFiles.isNotEmpty &&
      blockedCount == 0 &&
      !exceedsFileLimit;

  String get summary {
    if (candidates.isEmpty) return '선택한 파일이 없습니다.';
    if (exceedsFileLimit) {
      return '한 번에 $sheetMixedScoreImportMaxFiles개 이하만 가져올 수 있습니다.';
    }
    if (blockedCount > 0) {
      return '확인이 필요한 파일 $blockedCount개가 있어 가져오기를 시작하지 않았습니다.';
    }
    return '${readyFiles.length}개 악보를 Clef 라이브러리에 복사합니다.';
  }
}

class SheetMixedScoreImportDecision {
  const SheetMixedScoreImportDecision({required this.addToSetlist});

  final bool addToSetlist;
}

class SheetMixedScoreImportPreviewSheet extends StatefulWidget {
  const SheetMixedScoreImportPreviewSheet({required this.preview, super.key});

  final SheetMixedScoreImportPreview preview;

  @override
  State<SheetMixedScoreImportPreviewSheet> createState() =>
      _SheetMixedScoreImportPreviewSheetState();
}

class _SheetMixedScoreImportPreviewSheetState
    extends State<SheetMixedScoreImportPreviewSheet> {
  bool _addToSetlist = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final preview = widget.preview;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.72,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '여러 악보 가져오기',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              Text(preview.summary),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.separated(
                  itemCount: preview.candidates.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final candidate = preview.candidates[index];
                    return ListTile(
                      leading: Icon(
                        candidate.isReady
                            ? Icons.description_outlined
                            : Icons.error_outline,
                        color: candidate.isReady
                            ? null
                            : theme.colorScheme.error,
                      ),
                      title: Text(
                        candidate.name.isEmpty ? '이름 없는 파일' : candidate.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(candidate.statusLabel),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '모든 파일을 확인한 뒤 한 번에 저장합니다. 실패하면 이번 선택은 라이브러리에 남지 않습니다.',
                style: theme.textTheme.bodySmall,
              ),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _addToSetlist,
                onChanged: preview.canImport
                    ? (value) {
                        setState(() {
                          _addToSetlist = value ?? false;
                        });
                      }
                    : null,
                title: const Text('가져온 악보를 세트리스트에 바로 추가'),
                subtitle: const Text('가져오기 완료 후 기존 또는 새 세트리스트를 선택합니다.'),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('취소'),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: preview.canImport
                        ? () => Navigator.of(context).pop(
                            SheetMixedScoreImportDecision(
                              addToSetlist: _addToSetlist,
                            ),
                          )
                        : null,
                    icon: const Icon(Icons.library_add_outlined),
                    label: Text('${preview.readyFiles.length}개 가져오기'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
