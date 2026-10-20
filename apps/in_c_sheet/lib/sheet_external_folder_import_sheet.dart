import 'package:flutter/material.dart';

import 'sheet_external_folder_catalog.dart';
import 'sheet_external_folder_gateway.dart';

enum SheetExternalFolderConnectionActionType { open, add, forget }

class SheetExternalFolderConnectionAction {
  const SheetExternalFolderConnectionAction._(this.type, [this.connection]);

  const SheetExternalFolderConnectionAction.add()
    : this._(SheetExternalFolderConnectionActionType.add);

  const SheetExternalFolderConnectionAction.open(
    SheetExternalFolderConnection connection,
  ) : this._(SheetExternalFolderConnectionActionType.open, connection);

  const SheetExternalFolderConnectionAction.forget(
    SheetExternalFolderConnection connection,
  ) : this._(SheetExternalFolderConnectionActionType.forget, connection);

  final SheetExternalFolderConnectionActionType type;
  final SheetExternalFolderConnection? connection;
}

class ExternalFolderConnectionSheet extends StatelessWidget {
  const ExternalFolderConnectionSheet({required this.connections, super.key});

  final List<SheetExternalFolderConnection> connections;

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.sizeOf(context).height * 0.72;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Text(
                  '연결된 폴더',
                  style: Theme.of(context).textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(height: 8),
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    for (final connection in connections)
                      ListTile(
                        enabled: connection.canRead,
                        leading: Icon(
                          connection.canRead
                              ? Icons.folder_open_outlined
                              : Icons.folder_off_outlined,
                        ),
                        title: Text(
                          connection.folderLabel.isEmpty
                              ? '이름 없는 폴더'
                              : connection.folderLabel,
                        ),
                        subtitle: Text(
                          connection.canRead
                              ? (connection.providerLabel ?? 'Android 파일')
                              : '권한이 없거나 폴더를 찾을 수 없습니다.',
                        ),
                        onTap: connection.canRead
                            ? () => Navigator.of(context).pop(
                                SheetExternalFolderConnectionAction.open(
                                  connection,
                                ),
                              )
                            : null,
                        trailing: IconButton(
                          tooltip: '폴더 연결 해제',
                          onPressed: () => Navigator.of(context).pop(
                            SheetExternalFolderConnectionAction.forget(
                              connection,
                            ),
                          ),
                          icon: const Icon(Icons.link_off_outlined),
                        ),
                      ),
                    const Divider(),
                    ListTile(
                      leading: const Icon(Icons.create_new_folder_outlined),
                      title: const Text('새 폴더 연결'),
                      subtitle: const Text('읽기 권한을 유지해 다음에도 다시 사용'),
                      onTap: () => Navigator.of(context)
                          .pop(const SheetExternalFolderConnectionAction.add()),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(8, 8, 8, 0),
                child: Text('연결은 이 기기에만 저장됩니다. 악보를 가져오면 Clef 내부 사본을 사용합니다.'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ExternalFolderImportSheet extends StatefulWidget {
  const ExternalFolderImportSheet({
    required this.folderLabel,
    required this.preview,
    this.providerLabel,
    super.key,
  });

  final String folderLabel;
  final String? providerLabel;
  final SheetExternalFolderCatalogPreview preview;

  @override
  State<ExternalFolderImportSheet> createState() =>
      _ExternalFolderImportSheetState();
}

class _ExternalFolderImportSheetState extends State<ExternalFolderImportSheet> {
  late final Set<String> _selectedIds = widget.preview.candidates
      .where((candidate) => candidate.isReadyToCopy)
      .map((candidate) => candidate.selectionId)
      .toSet();

  SheetExternalFolderCopyPlan get _plan =>
      widget.preview.copyPlanForSelection(_selectedIds);

  @override
  Widget build(BuildContext context) {
    final plan = _plan;
    final title = widget.folderLabel.trim().isEmpty
        ? '폴더의 악보 고르기'
        : widget.folderLabel.trim();
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          24,
          8,
          24,
          24 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.72,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
              if (widget.providerLabel?.trim().isNotEmpty == true) ...[
                const SizedBox(height: 4),
                Text(
                  widget.providerLabel!,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 8),
              Text(widget.preview.message),
              if (widget.preview.sourceChangedCount > 0) ...[
                const SizedBox(height: 8),
                Text(
                  '원본 변경 ${widget.preview.sourceChangedCount}개 · 기존 악보를 자동으로 덮어쓰지 않습니다.',
                  key: const ValueKey('external-folder-source-changes'),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.tertiary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Expanded(
                child: widget.preview.candidates.isEmpty
                    ? const Center(child: Text('가져올 악보 파일이 없습니다.'))
                    : ListView.separated(
                        itemCount: widget.preview.candidates.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final candidate = widget.preview.candidates[index];
                          final enabled = candidate.isReadyToCopy;
                          return CheckboxListTile(
                            value: _selectedIds.contains(candidate.selectionId),
                            onChanged: enabled
                                ? (selected) {
                                    setState(() {
                                      if (selected ?? false) {
                                        _selectedIds.add(candidate.selectionId);
                                      } else {
                                        _selectedIds.remove(
                                          candidate.selectionId,
                                        );
                                      }
                                    });
                                  }
                                : null,
                            title: Text(candidate.entry.displayName),
                            subtitle: Text(candidate.message),
                            controlAffinity: ListTileControlAffinity.leading,
                          );
                        },
                      ),
              ),
              const SizedBox(height: 12),
              Text(plan.message, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: plan.isReady
                      ? () => Navigator.of(context).pop(plan)
                      : null,
                  icon: const Icon(Icons.copy_outlined),
                  label: Text('${plan.copyCount}개 악보 복사'),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '원본 폴더는 계속 참조하지 않습니다. 선택한 악보 파일만 Clef 라이브러리에 복사됩니다.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
