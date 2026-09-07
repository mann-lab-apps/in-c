import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('Clef home exposes RC actions without discovery surface', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(store: SheetLibraryStore());
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.byTooltip('악보 추가'), findsOneWidget);
    expect(find.byTooltip('테스트 정보'), findsOneWidget);
    expect(find.byTooltip('클래식 듣기'), findsNothing);
  });

  testWidgets('setlist creation dialog closes cleanly', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(store: SheetLibraryStore());
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('세트리스트'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('새 세트리스트'));
    await tester.pumpAndSettle();

    expect(find.text('세트리스트 만들기'), findsOneWidget);

    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    expect(controller.setlists, hasLength(1));
    expect(controller.setlists.single.title, '새 세트리스트');
    expect(tester.takeException(), isNull);
  });

  testWidgets('home renders recent setlists without overflow', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    tester.view.physicalSize = const Size(2560, 1600);
    tester.view.devicePixelRatio = 2;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final now = DateTime(2026, 9, 7, 10);
    final store = SheetLibraryStore();
    await store.saveScores([
      SheetScore(
        id: 'score-1',
        title: 'clef short score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/clef-short-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'setlist-1',
        title: '새 세트리스트',
        scoreIds: const <String>['score-1'],
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('최근 세트리스트'), findsOneWidget);
    expect(find.text('새 세트리스트'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('metronome sheet exposes hotfix rhythm controls', (tester) async {
    await tester.pumpWidget(
      buildMetronomeSheetForTest(
        settings: const SheetMetronomeSettings(
          bpm: 120,
          meter: SheetMetronomeMeter.fourFour,
          subdivision: SheetMetronomeSubdivision.eighth,
          soundEnabled: true,
        ),
      ),
    );

    expect(find.text('메트로놈'), findsOneWidget);
    expect(find.text('박자'), findsOneWidget);
    expect(find.text('나눔'), findsOneWidget);
    expect(find.text('Tap tempo'), findsOneWidget);
    expect(find.byTooltip('악보 위에 작게 띄우기'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('tick 소리'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('첫 박 강조'), findsOneWidget);
    expect(find.text('tick 소리'), findsOneWidget);
  });
}
