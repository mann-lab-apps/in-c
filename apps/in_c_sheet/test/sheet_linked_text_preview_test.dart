import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_file_import.dart';
import 'package:in_c_sheet/sheet_linked_text_preview.dart';
import 'package:in_c_sheet/sheet_score.dart';

void main() {
  test('recognizes only linked plain text and ChordPro sources', () {
    final now = DateTime.parse('2026-10-20T10:00:00.000');
    SheetLinkedFile file(String path, String type) =>
        SheetLinkedFile(path: path, type: type, label: path, createdAt: now);

    expect(
      SheetLinkedTextPreviewPolicy.supports(file('/tmp/a.txt', 'text')),
      isTrue,
    );
    expect(
      SheetLinkedTextPreviewPolicy.supports(file('/tmp/a.chordpro', 'file')),
      isTrue,
    );
    expect(
      SheetLinkedTextPreviewPolicy.supports(file('/tmp/a.pdf', 'pdf')),
      isFalse,
    );
    expect(
      SheetLinkedTextPreviewPolicy.supports(file('/tmp/a.docx', 'docx')),
      isFalse,
    );
  });

  test(
    'renders a linked ChordPro source as readable chord and lyric text',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'clef-linked-chordpro-preview-',
      );
      addTearDown(() => directory.delete(recursive: true));
      final source = File('${directory.path}/song.chordpro');
      await source.writeAsString('{title: Autumn}\n[C]Leaves [G]fall');
      final data = await SheetLinkedTextPreviewPolicy.load(
        SheetLinkedFile(
          path: source.path,
          type: 'chordpro',
          label: '이전 ChordPro',
          createdAt: DateTime.now(),
        ),
      );

      expect(data.isChordPro, isTrue);
      expect(data.text, contains('C'));
      expect(data.text, contains('Leaves'));
      expect(data.text, isNot(contains('{title:')));
    },
  );

  test('rejects oversized and malformed linked text', () async {
    final directory = await Directory.systemTemp.createTemp(
      'clef-invalid-linked-text-preview-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final oversized = File('${directory.path}/large.txt');
    await oversized.writeAsBytes(
      List<int>.filled(SheetFileImportPolicy.maxPlainTextBytes + 1, 65),
    );
    final malformed = File('${directory.path}/broken.txt');
    await malformed.writeAsBytes(<int>[0xff, 0xfe]);

    SheetLinkedFile linked(File file) => SheetLinkedFile(
      path: file.path,
      type: 'text',
      label: file.path,
      createdAt: DateTime.now(),
    );

    await expectLater(
      SheetLinkedTextPreviewPolicy.load(linked(oversized)),
      throwsFormatException,
    );
    await expectLater(
      SheetLinkedTextPreviewPolicy.load(linked(malformed)),
      throwsFormatException,
    );
  });

  testWidgets('shows linked text in a read-only full-screen preview', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: SheetLinkedTextPreviewDialog(
          file: SheetLinkedFile(
            path: '/tmp/notes.txt',
            type: 'text',
            label: '이전 연습 메모',
            createdAt: DateTime.now(),
          ),
          previewLoader: (_) => SynchronousFuture(
            const SheetLinkedTextPreviewData(
              text: 'First version notes',
              isChordPro: false,
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('이전 연습 메모'), findsOneWidget);
    expect(find.text('읽기 전용 사본'), findsOneWidget);
    expect(find.text('First version notes'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('linked-text-preview-content')),
      findsOneWidget,
    );
    expect(find.byTooltip('닫기'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
