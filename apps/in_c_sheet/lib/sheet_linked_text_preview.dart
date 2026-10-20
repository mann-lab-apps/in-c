import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

import 'sheet_chordpro.dart';
import 'sheet_file_import.dart';
import 'sheet_score.dart';

class SheetLinkedTextPreviewData {
  const SheetLinkedTextPreviewData({
    required this.text,
    required this.isChordPro,
  });

  final String text;
  final bool isChordPro;
}

class SheetLinkedTextPreviewPolicy {
  const SheetLinkedTextPreviewPolicy._();

  static bool supports(SheetLinkedFile file) {
    final type = file.type.trim().toLowerCase();
    return type == 'text' ||
        type == 'chordpro' ||
        SheetFileImportPolicy.isPlainTextFileName(file.path) ||
        SheetFileImportPolicy.isChordProFileName(file.path);
  }

  static bool isChordPro(SheetLinkedFile file) {
    return file.type.trim().toLowerCase() == 'chordpro' ||
        SheetFileImportPolicy.isChordProFileName(file.path);
  }

  static Future<SheetLinkedTextPreviewData> load(SheetLinkedFile file) async {
    if (!supports(file)) {
      throw const FormatException('지원하지 않는 연결 파일 형식입니다.');
    }
    final bytes = await File(file.path).readAsBytes();
    if (bytes.isEmpty) {
      throw const FormatException('연결된 텍스트 파일이 비어 있습니다.');
    }
    if (bytes.length > SheetFileImportPolicy.maxPlainTextBytes) {
      throw const FormatException('연결된 텍스트 파일이 2 MiB 제한을 넘었습니다.');
    }
    late final String source;
    try {
      source = utf8.decode(bytes);
    } on FormatException {
      throw const FormatException('연결된 텍스트 파일의 UTF-8 내용이 손상되었습니다.');
    }
    if (source.trim().isEmpty) {
      throw const FormatException('연결된 텍스트 파일이 비어 있습니다.');
    }
    final chordPro = isChordPro(file);
    return SheetLinkedTextPreviewData(
      text: chordPro
          ? SheetChordProTextRenderer.renderPlainText(
              SheetChordProParser.parse(source),
            )
          : source,
      isChordPro: chordPro,
    );
  }
}

class SheetLinkedTextPreviewDialog extends StatefulWidget {
  const SheetLinkedTextPreviewDialog({
    required this.file,
    this.previewLoader = SheetLinkedTextPreviewPolicy.load,
    super.key,
  });

  final SheetLinkedFile file;
  final Future<SheetLinkedTextPreviewData> Function(SheetLinkedFile file)
  previewLoader;

  @override
  State<SheetLinkedTextPreviewDialog> createState() =>
      _SheetLinkedTextPreviewDialogState();
}

class _SheetLinkedTextPreviewDialogState
    extends State<SheetLinkedTextPreviewDialog> {
  late Future<SheetLinkedTextPreviewData> _previewFuture;

  @override
  void initState() {
    super.initState();
    _previewFuture = widget.previewLoader(widget.file);
  }

  @override
  void didUpdateWidget(covariant SheetLinkedTextPreviewDialog oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.file.path != widget.file.path ||
        oldWidget.previewLoader != widget.previewLoader) {
      _previewFuture = widget.previewLoader(widget.file);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog.fullscreen(
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.file.label),
          actions: [
            const Center(child: Text('읽기 전용 사본')),
            IconButton(
              tooltip: '닫기',
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        body: FutureBuilder<SheetLinkedTextPreviewData>(
          future: _previewFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError || !snapshot.hasData) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, size: 36),
                      const SizedBox(height: 12),
                      const Text('연결된 텍스트 사본을 열지 못했습니다.'),
                      const SizedBox(height: 8),
                      Text(
                        '${snapshot.error}',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              );
            }
            final data = snapshot.data!;
            return SafeArea(
              child: SelectionArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                  child: Align(
                    alignment: Alignment.topLeft,
                    child: Text(
                      data.text,
                      key: const ValueKey('linked-text-preview-content'),
                      style: data.isChordPro
                          ? const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 16,
                              height: 1.5,
                            )
                          : const TextStyle(fontSize: 16, height: 1.5),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
