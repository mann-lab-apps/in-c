import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_mixed_score_import.dart';

void main() {
  test('accepts every supported score type in one atomic preview', () {
    final preview = SheetMixedScoreImportPreview.fromFiles(const [
      SheetMixedScorePickedFile(name: 'part.pdf', path: '/tmp/part.pdf'),
      SheetMixedScorePickedFile(name: 'notes.md', path: '/tmp/notes.md'),
      SheetMixedScorePickedFile(
        name: 'song.chordpro',
        path: '/tmp/song.chordpro',
      ),
      SheetMixedScorePickedFile(name: 'lesson.docx', path: '/tmp/lesson.docx'),
      SheetMixedScorePickedFile(name: 'marks.rtf', path: '/tmp/marks.rtf'),
    ]);

    expect(preview.canImport, isTrue);
    expect(preview.readyFiles, hasLength(5));
    expect(preview.blockedCount, 0);
    expect(preview.summary, '5개 악보를 Clef 라이브러리에 복사합니다.');
  });

  test(
    'blocks the whole preview for unavailable unsupported or duplicate files',
    () {
      final preview = SheetMixedScoreImportPreview.fromFiles(const [
        SheetMixedScorePickedFile(name: 'part.pdf', path: '/tmp/part.pdf'),
        SheetMixedScorePickedFile(name: 'missing.txt'),
        SheetMixedScorePickedFile(name: 'table.xlsx', path: '/tmp/table.xlsx'),
        SheetMixedScorePickedFile(name: 'part.pdf', path: '/tmp/part.pdf'),
      ]);

      expect(preview.canImport, isFalse);
      expect(preview.readyFiles, hasLength(1));
      expect(preview.blockedCount, 3);
      expect(
        preview.candidates.map((candidate) => candidate.status),
        <SheetMixedScoreFileStatus>[
          SheetMixedScoreFileStatus.ready,
          SheetMixedScoreFileStatus.unavailable,
          SheetMixedScoreFileStatus.unsupported,
          SheetMixedScoreFileStatus.duplicate,
        ],
      );
    },
  );

  test('caps a single batch before any file is stored', () {
    final preview = SheetMixedScoreImportPreview.fromFiles(
      List<SheetMixedScorePickedFile>.generate(
        sheetMixedScoreImportMaxFiles + 1,
        (index) => SheetMixedScorePickedFile(
          name: 'score-$index.pdf',
          path: '/tmp/score-$index.pdf',
        ),
      ),
    );

    expect(preview.exceedsFileLimit, isTrue);
    expect(preview.canImport, isFalse);
    expect(preview.summary, contains('$sheetMixedScoreImportMaxFiles개 이하'));
  });

  testWidgets('preview explains formats and blocks an invalid batch', (
    tester,
  ) async {
    final preview = SheetMixedScoreImportPreview.fromFiles(const [
      SheetMixedScorePickedFile(name: 'part.pdf', path: '/tmp/part.pdf'),
      SheetMixedScorePickedFile(name: 'song.chordpro'),
    ]);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SheetMixedScoreImportPreviewSheet(preview: preview),
        ),
      ),
    );

    expect(find.text('여러 악보 가져오기'), findsOneWidget);
    expect(find.text('PDF'), findsOneWidget);
    expect(find.text('파일을 읽을 수 없음'), findsOneWidget);
    final importButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, '1개 가져오기'),
    );
    expect(importButton.onPressed, isNull);
    final setlistChoice = tester.widget<CheckboxListTile>(
      find.byType(CheckboxListTile),
    );
    expect(setlistChoice.onChanged, isNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('preview returns confirmation only for a valid batch', (
    tester,
  ) async {
    final preview = SheetMixedScoreImportPreview.fromFiles(const [
      SheetMixedScorePickedFile(name: 'notes.txt', path: '/tmp/notes.txt'),
    ]);
    SheetMixedScoreImportDecision? result;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => FilledButton(
            onPressed: () async {
              result =
                  await showModalBottomSheet<SheetMixedScoreImportDecision>(
                    context: context,
                    builder: (context) =>
                        SheetMixedScoreImportPreviewSheet(preview: preview),
                  );
            },
            child: const Text('열기'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '1개 가져오기'));
    await tester.pumpAndSettle();

    expect(result?.addToSetlist, isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('preview carries the setlist choice into confirmation', (
    tester,
  ) async {
    final preview = SheetMixedScoreImportPreview.fromFiles(const [
      SheetMixedScorePickedFile(name: 'notes.txt', path: '/tmp/notes.txt'),
    ]);
    SheetMixedScoreImportDecision? result;

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => FilledButton(
            onPressed: () async {
              result =
                  await showModalBottomSheet<SheetMixedScoreImportDecision>(
                    context: context,
                    builder: (context) =>
                        SheetMixedScoreImportPreviewSheet(preview: preview),
                  );
            },
            child: const Text('열기'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('가져온 악보를 세트리스트에 바로 추가'));
    await tester.tap(find.widgetWithText(FilledButton, '1개 가져오기'));
    await tester.pumpAndSettle();

    expect(result?.addToSetlist, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('long valid preview remains usable on a small phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final preview = SheetMixedScoreImportPreview.fromFiles(
      List<SheetMixedScorePickedFile>.generate(
        40,
        (index) => SheetMixedScorePickedFile(
          name: 'very-long-recital-score-name-$index.chordpro',
          path: '/tmp/very-long-recital-score-name-$index.chordpro',
        ),
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SheetMixedScoreImportPreviewSheet(preview: preview),
        ),
      ),
    );

    expect(find.text('40개 악보를 Clef 라이브러리에 복사합니다.'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, '40개 가져오기'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
