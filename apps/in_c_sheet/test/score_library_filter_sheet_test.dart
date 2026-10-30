import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/presentation/score_library_choices.dart';

import 'adoption_pilot_test.dart' as pilot;

const longTag = '긴 이름의 연습 분류 · Piano studies for weekly rehearsal';

Finder sheetText(String text) => find.descendant(
  of: find.byType(BottomSheet).last,
  matching: find.text(text),
);

Future<void> choose(WidgetTester t, String text) async {
  final target = sheetText(text);
  await t.ensureVisible(target);
  await t.pumpAndSettle();
  await t.tap(target);
  await t.pumpAndSettle();
}

Future<void> openFilter(WidgetTester t, String field) async {
  final filter = find.byWidgetPredicate(
    (w) => w is DdiroriButton && w.label.startsWith('필터'),
  );
  await t.ensureVisible(filter);
  await t.pumpAndSettle();
  await t.tap(filter);
  await t.pumpAndSettle();
  final entry = find.byWidgetPredicate(
    (w) => w is DdiroriButton && w.label.startsWith('$field:'),
  );
  await t.ensureVisible(entry);
  await t.pumpAndSettle();
  await t.tap(entry);
  await t.pumpAndSettle();
}

void main() {
  for (final viewport in <({double width, double height, bool dark})>[
    (width: 390, height: 1000, dark: false),
    (width: 840, height: 1000, dark: true),
    (width: 840, height: 390, dark: false),
  ]) {
    testWidgets('tag and rating preserve other filters at $viewport', (
      t,
    ) async {
      final c = await pilot.library();
      addTearDown(c.dispose);
      await c.store.saveScores([
        c.scores.first.copyWith(tags: [longTag], rating: 5),
        ...c.scores.skip(1),
      ]);
      await c.load();
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
      await openFilter(t, '태그');
      expect(find.byType(ScoreLibraryChoices<String>), findsOneWidget);
      await t.ensureVisible(sheetText(longTag));
      await t.pumpAndSettle();
      expect(
        t.renderObject<RenderParagraph>(sheetText(longTag)).didExceedMaxLines,
        isFalse,
      );
      await choose(t, longTag);
      expect(c.libraryViewSettings.tagQuery, longTag);
      expect((await c.store.loadLibraryViewSettings()).tagQuery, longTag);
      await openFilter(t, '태그');
      expect(
        find.byWidgetPredicate(
          (w) => w is DdiroriItem && w.title == longTag && w.selected,
        ),
        findsOneWidget,
      );
      await choose(t, '취소');
      expect(c.libraryViewSettings.tagQuery, longTag);
      await openFilter(t, '별점');
      await choose(t, '5점 이상');
      expect(c.libraryViewSettings.minimumRating, 5);
      expect((await c.store.loadLibraryViewSettings()).minimumRating, 5);
      expect(c.libraryViewSettings.tagQuery, longTag);
      await openFilter(t, '태그');
      await choose(t, '전체 태그');
      expect(c.libraryViewSettings.tagQuery, '');
      expect(c.libraryViewSettings.minimumRating, 5);
      await openFilter(t, '별점');
      expect(
        find.byWidgetPredicate(
          (w) => w is DdiroriItem && w.title == '5점 이상' && w.selected,
        ),
        findsOneWidget,
      );
      await choose(t, '별점 전체');
      expect(c.libraryViewSettings.minimumRating, 0);
      expect(c.query, '평균율');
      expect(c.libraryViewSettings.favoriteOnly, isTrue);
      expect(c.scores.map((s) => s.id), ids);
      expect(c.filteredScores.map((s) => s.id), ['pilot-0']);
      expect(c.scores.every((s) => s.lastOpenedAt == null), isTrue);
      expect(find.byType(SheetViewerScreen), findsNothing);
      expect(t.takeException(), isNull);
    });
  }

  testWidgets('collection and group reset only their own condition', (t) async {
    final c = await pilot.library();
    addTearDown(c.dispose);
    await c.store.saveScores([
      c.scores.first.copyWith(collection: '연습 묶음', group: '피아노 모임'),
      ...c.scores.skip(1),
    ]);
    await c.load();
    await pilot.mount(t, c, width: 840, accent: 'blue');
    await openFilter(t, '컬렉션');
    await choose(t, '연습 묶음');
    await openFilter(t, '그룹');
    await choose(t, '피아노 모임');
    final saved = await c.store.loadLibraryViewSettings();
    expect(saved.collectionQuery, '연습 묶음');
    expect(saved.groupQuery, '피아노 모임');
    expect(c.filteredScores.map((s) => s.id), ['pilot-0']);
    await openFilter(t, '컬렉션');
    await choose(t, '컬렉션 전체');
    expect(c.libraryViewSettings.collectionQuery, '');
    expect(c.libraryViewSettings.groupQuery, '피아노 모임');
    await openFilter(t, '그룹');
    await choose(t, '취소');
    expect(c.libraryViewSettings.groupQuery, '피아노 모임');
    expect(t.takeException(), isNull);
  });

  testWidgets('old metadata and rating menus ignore a new library', (t) async {
    final c = await pilot.library();
    addTearDown(c.dispose);
    await pilot.mount(t, c, accent: 'blue');
    final original = c.activeLibraryProfile.id;
    await openFilter(t, '태그');
    await c.createLibraryProfile('다른 저장소');
    await t.pumpAndSettle();
    await choose(t, '연습');
    expect(c.libraryViewSettings.tagQuery, '');
    expect((await c.store.loadLibraryViewSettings()).tagQuery, '');
    await openFilter(t, '별점');
    await c.switchLibraryProfile(original);
    await t.pumpAndSettle();
    await choose(t, '5점 이상');
    expect(c.libraryViewSettings.minimumRating, 0);
    expect((await c.store.loadLibraryViewSettings()).minimumRating, 0);
    expect(t.takeException(), isNull);
  });

  testWidgets('large choices are lazy and the last value remains reachable', (
    t,
  ) async {
    final c = await pilot.library();
    addTearDown(c.dispose);
    await pilot.mount(t, c, scale: 2, accent: 'blue');
    final context = t.element(find.byType(Scaffold).first);
    final result = showDdiroriSheet<String>(
      context: context,
      title: '태그',
      child: Builder(
        builder: (sheetContext) => ScoreLibraryChoices<String>(
          description: '목록에서 태그를 선택합니다.',
          selectedValue: 'tag-0',
          options: [
            for (var i = 0; i < 300; i++)
              (value: 'tag-$i', label: '태그 $i', icon: Icons.sell_outlined),
          ],
          onSelected: (value) => Navigator.of(sheetContext).pop(value),
          onCancel: () => Navigator.of(sheetContext).pop(),
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.byType(DdiroriItem).evaluate().length, lessThan(60));
    final list = find.byKey(const ValueKey('score-library-choices-list'));
    await t.scrollUntilVisible(
      sheetText('태그 299'),
      1200,
      scrollable: find.descendant(of: list, matching: find.byType(Scrollable)),
      maxScrolls: 60,
    );
    await t.pumpAndSettle();
    await t.tap(sheetText('태그 299'));
    await t.pumpAndSettle();
    expect(await result, 'tag-299');
    expect(t.takeException(), isNull);
  });
}
