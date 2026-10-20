import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_backup_diff.dart';
import 'package:in_c_sheet/sheet_library_backup_diff_view.dart';

void main() {
  testWidgets('backup details stay collapsed until requested', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: SheetLibraryBackupDetailsView(
              details: <SheetLibraryBackupDiffDetail>[
                SheetLibraryBackupDiffDetail(
                  kind: SheetLibraryBackupDiffItemKind.score,
                  change: SheetLibraryBackupDiffChange.changed,
                  id: 'score-a',
                  title: 'Concert Etude',
                  contextLabel: 'Goedicke · etude.pdf',
                  fieldLabels: <String>['제목'],
                  annotationObjectChanged: true,
                ),
              ],
            ),
          ),
        ),
      ),
    );

    expect(find.text('변경 항목 자세히 보기 (1)'), findsOneWidget);
    expect(find.text('Concert Etude'), findsNothing);

    await tester.tap(find.text('변경 항목 자세히 보기 (1)'));
    await tester.pumpAndSettle();

    expect(find.text('Concert Etude'), findsOneWidget);
    expect(find.text('수정 · Goedicke · etude.pdf · 제목, 필기 내용'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('backup details bound long lists and disambiguate titles', (
    tester,
  ) async {
    final details = List<SheetLibraryBackupDiffDetail>.generate(
      23,
      (index) => SheetLibraryBackupDiffDetail(
        kind: SheetLibraryBackupDiffItemKind.score,
        change: SheetLibraryBackupDiffChange.added,
        id: 'score-${index.toString().padLeft(3, '0')}',
        title: index < 2 ? '같은 제목' : '악보 $index',
        contextLabel: '',
      ),
    );
    await tester.binding.setSurfaceSize(const Size(320, 640));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: SheetLibraryBackupDetailsView(details: details),
          ),
        ),
      ),
    );

    await tester.tap(find.text('변경 항목 자세히 보기 (23)'));
    await tester.pumpAndSettle();

    expect(find.text('같은 제목'), findsNWidgets(2));
    expect(find.textContaining('식별자 score-000'), findsOneWidget);
    expect(find.textContaining('식별자 score-001'), findsOneWidget);
    expect(find.text('나머지 3개 항목은 백업 요약에 포함되어 있습니다.'), findsOneWidget);
    expect(find.text('악보 20'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
