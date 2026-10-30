import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';

import 'adoption_pilot_test.dart' as pilot;

Future<void> openSortChoices(WidgetTester t) async {
  final sort = find.byWidgetPredicate(
    (w) => w is DdiroriButton && w.label.startsWith('정렬:'),
  );
  await t.ensureVisible(sort);
  await t.pumpAndSettle();
  await t.tap(sort);
  await t.pumpAndSettle();
}

void main() {
  testWidgets('old sort menu does not change a different library', (t) async {
    final c = await pilot.library();
    addTearDown(c.dispose);
    final originalId = c.activeLibraryProfile.id;
    await pilot.mount(t, c, accent: 'blue');
    await openSortChoices(t);
    await c.createLibraryProfile('새 저장소');
    final nextId = c.activeLibraryProfile.id;
    await t.pumpAndSettle();
    await t.ensureVisible(find.text('제목'));
    await t.pumpAndSettle();
    await t.tap(find.text('제목'));
    await t.pumpAndSettle();
    expect(c.activeLibraryProfile.id, nextId);
    expect(c.libraryViewSettings.sortMode, SheetLibrarySortMode.recent);
    expect(
      (await c.store.loadLibraryViewSettings()).sortMode,
      SheetLibrarySortMode.recent,
    );
    await c.switchLibraryProfile(originalId);
    expect(c.libraryViewSettings.sortMode, SheetLibrarySortMode.recent);
    expect(t.takeException(), isNull);
  });

  for (final viewport in <({double width, double height, bool dark})>[
    (width: 390, height: 1000, dark: false),
    (width: 840, height: 1000, dark: true),
    (width: 840, height: 390, dark: false),
  ]) {
    testWidgets(
      'library sort choices preserve filters and records at $viewport',
      (t) async {
        final c = await pilot.library();
        addTearDown(c.dispose);
        c.updateQuery('평균율');
        await c.updateFavoriteFilter(true);
        final ids = c.scores.map((s) => s.id).toList();
        await pilot.mount(
          t,
          c,
          width: viewport.width,
          dark: viewport.dark,
          scale: 2,
          accent: 'blue',
        );
        t.view.physicalSize = Size(viewport.width, viewport.height);
        await t.pumpAndSettle();
        await openSortChoices(t);
        expect(t.takeException(), isNull);
        expect(
          find.byWidgetPredicate(
            (w) => w is DdiroriItem && w.title == '최근 열기' && w.selected,
          ),
          findsOneWidget,
        );
        await t.ensureVisible(find.text('가져온 날짜'));
        await t.pumpAndSettle();
        await t.tap(find.text('가져온 날짜'));
        await t.pumpAndSettle();
        expect(c.libraryViewSettings.sortMode, SheetLibrarySortMode.imported);
        expect(
          (await c.store.loadLibraryViewSettings()).sortMode,
          SheetLibrarySortMode.imported,
        );
        expect(c.query, '평균율');
        expect(c.libraryViewSettings.favoriteOnly, isTrue);
        expect(c.scores.map((s) => s.id), ids);
        expect(c.filteredScores.map((s) => s.id), ['pilot-0']);
        expect(c.scores.every((s) => s.lastOpenedAt == null), isTrue);
        expect(find.byType(SheetViewerScreen), findsNothing);
        await openSortChoices(t);
        expect(
          find.byWidgetPredicate(
            (w) => w is DdiroriItem && w.title == '가져온 날짜' && w.selected,
          ),
          findsOneWidget,
        );
        await t.ensureVisible(find.text('취소'));
        await t.pumpAndSettle();
        await t.tap(find.text('취소'));
        await t.pumpAndSettle();
        expect(c.libraryViewSettings.sortMode, SheetLibrarySortMode.imported);
        expect(c.query, '평균율');
        expect(c.libraryViewSettings.favoriteOnly, isTrue);
        expect(t.takeException(), isNull);
      },
    );
  }
}
