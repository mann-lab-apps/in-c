import 'package:flutter/material.dart';

import 'sheet_external_folder_catalog.dart';

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
        ? '폴더의 PDF 고르기'
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
              const SizedBox(height: 8),
              Expanded(
                child: widget.preview.candidates.isEmpty
                    ? const Center(child: Text('가져올 PDF가 없습니다.'))
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
                  label: Text('${plan.copyCount}개 PDF 복사'),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '원본 폴더는 계속 참조하지 않습니다. 선택한 PDF만 Clef 라이브러리에 복사됩니다.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
