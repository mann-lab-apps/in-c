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

  testWidgets(
    'duplicate setlist names show guidance without creating another',
    (tester) async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 7, 10);
      final store = SheetLibraryStore();
      await store.saveSetlists([
        SheetSetlist(
          id: 'setlist-1',
          title: '새 세트리스트',
          scoreIds: const <String>[],
          createdAt: now,
          updatedAt: now,
        ),
      ]);
      final controller = SheetLibraryController(store: store);
      await controller.load();

      await tester.pumpWidget(
        MaterialApp(home: SheetSetlistsScreen(controller: controller)),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('새 세트리스트').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('저장'));
      await tester.pumpAndSettle();

      expect(controller.setlists, hasLength(1));
      expect(find.text('"새 세트리스트" 세트리스트가 이미 있습니다.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('import menu exposes setlist assignment actions', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(store: SheetLibraryStore());
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('악보 추가'));
    await tester.pumpAndSettle();

    expect(find.text('PDF 가져오기'), findsOneWidget);
    expect(find.text('PDF 가져와 세트리스트에 추가'), findsOneWidget);
    expect(find.text('여러 PDF 가져오기'), findsOneWidget);
    expect(find.text('여러 PDF를 세트리스트에 추가'), findsOneWidget);
    expect(find.text('이미지를 PDF 악보로 묶기'), findsOneWidget);
    expect(find.text('이미지를 묶어 세트리스트에 추가'), findsOneWidget);
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
        lastOpenedScoreId: 'score-1',
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('최근 세트리스트'), findsOneWidget);
    expect(find.text('새 세트리스트'), findsOneWidget);
    expect(find.text('진행 1/1'), findsOneWidget);
    expect(find.textContaining('최근 '), findsWidgets);
    expect(find.textContaining('이어보기 · clef short score'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('home surfaces common custom metadata facets', (tester) async {
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
      for (final (index, key) in ['D', 'D', 'G'].indexed)
        SheetScore(
          id: 'score-$index',
          title: '악보 $index',
          composer: '',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/score-$index.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const <SheetBookmark>[],
          customFields: <SheetCustomMetadataField>[
            SheetCustomMetadataField(key: '조성', value: key),
            SheetCustomMetadataField(
              key: '장르',
              value: index < 2 ? 'Etude' : 'Sonata',
            ),
          ],
        ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('조성'), findsOneWidget);
    expect(find.text('D 2'), findsOneWidget);
    expect(find.text('G 1'), findsOneWidget);
    expect(find.text('장르'), findsOneWidget);
    expect(find.text('Etude 2'), findsOneWidget);

    await tester.tap(find.text('D 2'));
    await tester.pumpAndSettle();

    expect(controller.filteredScores, hasLength(2));
    expect(find.text('2곡 표시 · 전체 3곡'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('home summarizes active search and metadata filters', (
    tester,
  ) async {
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
        title: 'Moonlight',
        composer: 'Beethoven',
        tags: const <String>['recital'],
        note: '',
        filePath: '/tmp/moonlight.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: true,
        rating: 4,
        collection: 'Recital',
        group: 'Piano',
        bookmarks: const <SheetBookmark>[],
        customFields: const <SheetCustomMetadataField>[
          SheetCustomMetadataField(key: '조성', value: 'D'),
        ],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();
    controller.updateQuery('moon');
    await controller.updateFavoriteFilter(true);
    await controller.updateCollectionFilter('Recital');
    await controller.updateGroupFilter('Piano');
    await controller.updateMinimumRatingFilter(4);
    await controller.updateCustomFieldFilter('조성', 'D');

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('현재 조건'), findsOneWidget);
    expect(find.text('검색: moon'), findsOneWidget);
    expect(find.text('즐겨찾기'), findsWidgets);
    expect(find.text('컬렉션: Recital'), findsWidgets);
    expect(find.text('그룹: Piano'), findsWidgets);
    expect(find.text('별점 4+'), findsOneWidget);
    expect(find.text('조성: D'), findsOneWidget);

    await tester.tap(find.text('전체 초기화'));
    await tester.pumpAndSettle();

    expect(controller.query, isEmpty);
    expect(controller.libraryViewSettings.hasAnyFilter, isFalse);
    expect(find.text('현재 조건'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  test('recent setlist resume picks the last opened score when valid', () {
    final now = DateTime(2026, 9, 7, 10);
    final scores = <SheetScore>[
      SheetScore(
        id: 'score-1',
        title: 'First',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/first.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
      SheetScore(
        id: 'score-2',
        title: 'Second',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/second.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ];

    final setlist = SheetSetlist(
      id: 'setlist-1',
      title: '공연 순서',
      scoreIds: const <String>['score-1', 'score-2'],
      createdAt: now,
      updatedAt: now,
      lastOpenedScoreId: 'score-2',
    );

    expect(scoreToOpenForSetlistResumeForTest(setlist, scores).id, 'score-2');
    expect(setlistProgressLabelForTest(setlist), '진행 2/2');
    expect(
      scoreToOpenForSetlistResumeForTest(
        setlist.copyWith(lastOpenedScoreId: 'missing'),
        scores,
      ).id,
      'score-1',
    );
    expect(
      setlistProgressLabelForTest(
        setlist.copyWith(clearLastOpenedScoreId: true),
      ),
      '2곡',
    );
    expect(
      setlistProgressLabelForTest(setlist.copyWith(scoreIds: const <String>[])),
      '빈 목록',
    );
  });

  testWidgets('setlist progress badge keeps current score context visible', (
    tester,
  ) async {
    await tester.pumpWidget(
      buildSetlistProgressBadgeForTest(
        scoreTitle: 'G선상의 아리아',
        subtitle: '공연 순서 · 2/8 · 3분',
      ),
    );

    expect(find.text('G선상의 아리아'), findsOneWidget);
    expect(find.text('공연 순서 · 2/8 · 3분'), findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Semantics && widget.properties.label == '세트리스트 진행 위치',
      ),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('recent quick access scores participate in bulk selection', (
    tester,
  ) async {
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
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('여러 악보 선택'));
    await tester.pumpAndSettle();
    expect(find.text('0개 선택'), findsOneWidget);

    await tester.tap(find.text('clef short score').first);
    await tester.pumpAndSettle();

    expect(find.text('1개 선택'), findsOneWidget);
    expect(find.byTooltip('선택 악보를 세트리스트에 추가'), findsOneWidget);
    expect(find.byTooltip('선택 악보 컬렉션 지정'), findsOneWidget);
    expect(find.byTooltip('선택 악보 정보 일괄 편집'), findsOneWidget);
    expect(find.widgetWithText(FloatingActionButton, '일괄 편집'), findsNothing);
    expect(find.byTooltip('악보 추가'), findsNothing);
    expect(find.byTooltip('백업/복원'), findsNothing);

    await tester.tap(find.byTooltip('선택 악보 컬렉션 지정'));
    await tester.pumpAndSettle();

    expect(find.text('1개 악보 컬렉션 지정'), findsOneWidget);
    expect(find.text('새 컬렉션 이름 입력'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('long pressing a score enters bulk selection', (tester) async {
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
        title: 'long press score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/long-press-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.longPress(find.text('long press score').first);
    await tester.pumpAndSettle();

    expect(find.text('1개 선택'), findsOneWidget);
    expect(find.byTooltip('선택 취소'), findsOneWidget);
    expect(find.byTooltip('선택 악보를 세트리스트에 추가'), findsOneWidget);
    expect(find.byTooltip('선택 악보 컬렉션 지정'), findsOneWidget);
    expect(find.byTooltip('선택 악보 정보 일괄 편집'), findsOneWidget);
    expect(find.widgetWithText(FloatingActionButton, '일괄 편집'), findsNothing);
    expect(find.byTooltip('악보 추가'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('bulk edit opens from the selection app bar', (tester) async {
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
        title: 'bulk edit score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/bulk-edit-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.longPress(find.text('bulk edit score').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('선택 악보 정보 일괄 편집'));
    await tester.pumpAndSettle();

    expect(find.text('일괄 편집'), findsOneWidget);
    expect(find.text('추가할 태그'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('bulk delete confirms before removing scores', (tester) async {
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
        title: 'delete me score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/delete-me-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
      SheetScore(
        id: 'score-2',
        title: 'keep me score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/keep-me-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.longPress(find.text('delete me score').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('선택 악보 라이브러리에서 제거'));
    await tester.pumpAndSettle();

    expect(find.text('선택 악보 제거'), findsOneWidget);
    expect(find.textContaining('PDF 원본 파일은 삭제하지 않고'), findsOneWidget);

    await tester.tap(find.text('제거'));
    await tester.pumpAndSettle();

    expect(controller.scores.map((score) => score.id), <String>['score-2']);
    expect(find.text('1개 악보를 라이브러리에서 제거했습니다.'), findsOneWidget);
    expect(find.text('delete me score'), findsNothing);
    expect(find.text('keep me score'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('bulk collection assignment can jump to its filter', (
    tester,
  ) async {
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
        title: 'uncollected score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/uncollected-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
      SheetScore(
        id: 'score-2',
        title: 'recital score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/recital-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        collection: 'Recital',
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.longPress(find.text('uncollected score').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('선택 악보 컬렉션 지정'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Recital').last);
    await tester.pumpAndSettle();

    expect(controller.scoreById('score-1').collection, 'Recital');
    expect(find.text('보기'), findsOneWidget);

    await tester.tap(find.text('보기'));
    await tester.pumpAndSettle();

    expect(controller.libraryViewSettings.collectionQuery, 'Recital');
    expect(tester.takeException(), isNull);
  });

  testWidgets('bulk setlist add can open the target setlist', (tester) async {
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
        title: 'bulk setlist score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/bulk-setlist-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'setlist-1',
        title: 'Sunday service',
        scoreIds: const <String>[],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.longPress(find.text('bulk setlist score').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('선택 악보를 세트리스트에 추가'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sunday service').last);
    await tester.pumpAndSettle();

    expect(find.text('1개 악보를 "Sunday service"에 추가했습니다.'), findsOneWidget);
    expect(find.text('열기'), findsOneWidget);

    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();

    expect(find.byType(SheetSetlistDetailScreen), findsOneWidget);
    expect(controller.setlistById('setlist-1').scoreIds, const ['score-1']);
    expect(tester.takeException(), isNull);
  });

  testWidgets('bulk selection toggles all visible scores', (tester) async {
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
        title: 'visible score one',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/visible-score-one.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
      SheetScore(
        id: 'score-2',
        title: 'visible score two',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/visible-score-two.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('여러 악보 선택'));
    await tester.pumpAndSettle();
    expect(find.text('0개 선택'), findsOneWidget);
    expect(find.byTooltip('현재 목록 전체 선택'), findsOneWidget);

    await tester.tap(find.byTooltip('현재 목록 전체 선택'));
    await tester.pumpAndSettle();
    expect(find.text('2개 선택'), findsOneWidget);
    expect(find.byTooltip('현재 목록 선택 해제'), findsOneWidget);

    await tester.tap(find.byTooltip('현재 목록 선택 해제'));
    await tester.pumpAndSettle();
    expect(find.text('0개 선택'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('home surfaces imported scores that need metadata review', (
    tester,
  ) async {
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
        title: 'clef imported score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/score-1-clef-imported-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
      SheetScore(
        id: 'score-2',
        title: 'metadata ready score',
        composer: 'Bach',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/score-2-ready.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('정리 필요'), findsOneWidget);
    expect(find.text('clef imported score'), findsWidgets);
    expect(find.textContaining('파일 · clef-imported-score'), findsWidgets);

    await tester.tap(find.text('clef imported score').first);
    await tester.pumpAndSettle();

    expect(find.text('악보 정보 편집'), findsOneWidget);
    expect(find.text('자주 쓰는 필드'), findsOneWidget);
    expect(find.text('조성'), findsOneWidget);
    expect(find.text('장르'), findsOneWidget);
    expect(find.text('난이도'), findsOneWidget);
    expect(find.text('편성'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('setlist detail supports direct order entry', (tester) async {
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
      for (final id in const <String>['score-1', 'score-2', 'score-3'])
        SheetScore(
          id: id,
          title: '악보 $id',
          composer: '',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/$id.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const <SheetBookmark>[],
        ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'setlist-1',
        title: '공연 순서',
        scoreIds: const <String>['score-1', 'score-2', 'score-3'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(
      MaterialApp(
        home: SheetSetlistDetailScreen(
          controller: controller,
          setlistId: 'setlist-1',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byTooltip('순서 입력'), findsNWidgets(3));
    expect(find.textContaining('파일 · score-1'), findsOneWidget);

    await tester.tap(find.byTooltip('순서 입력').first);
    await tester.pumpAndSettle();
    expect(find.text('"악보 score-1" 순서 이동'), findsOneWidget);

    await tester.enterText(find.byType(TextFormField), '3');
    await tester.tap(find.text('이동'));
    await tester.pumpAndSettle();

    expect(controller.setlists.single.scoreIds, <String>[
      'score-2',
      'score-3',
      'score-1',
    ]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty setlist detail exposes a single add action', (
    tester,
  ) async {
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
        title: '빈 세트에 담을 악보',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/empty-set-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'setlist-1',
        title: '빈 공연 순서',
        scoreIds: const <String>[],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(
      MaterialApp(
        home: SheetSetlistDetailScreen(
          controller: controller,
          setlistId: 'setlist-1',
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('이 세트리스트에 악보가 없습니다.'), findsOneWidget);
    expect(find.text('연주 순서에 넣을 악보를 골라 담아보세요.'), findsOneWidget);
    expect(find.byType(FloatingActionButton), findsNothing);

    await tester.tap(find.text('악보 추가'));
    await tester.pumpAndSettle();

    expect(find.text('추가할 악보를 선택하세요'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('setlist detail removal can be undone', (tester) async {
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
      for (final id in const <String>['score-1', 'score-2', 'score-3'])
        SheetScore(
          id: id,
          title: '악보 $id',
          composer: '',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/$id.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const <SheetBookmark>[],
        ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'setlist-1',
        title: '공연 순서',
        scoreIds: const <String>['score-1', 'score-2', 'score-3'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(
      MaterialApp(
        home: SheetSetlistDetailScreen(
          controller: controller,
          setlistId: 'setlist-1',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('제거').at(1));
    await tester.pumpAndSettle();

    expect(controller.setlists.single.scoreIds, <String>['score-1', 'score-3']);
    expect(find.text('"악보 score-2"을 세트리스트에서 제거했습니다.'), findsOneWidget);
    expect(find.text('되돌리기'), findsOneWidget);

    await tester.tap(find.text('되돌리기'));
    await tester.pumpAndSettle();

    expect(controller.setlists.single.scoreIds, <String>[
      'score-1',
      'score-2',
      'score-3',
    ]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('setlist detail adds multiple scores at once', (tester) async {
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
      for (final id in const <String>['score-1', 'score-2', 'score-3'])
        SheetScore(
          id: id,
          title: '악보 $id',
          composer: '',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/$id.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const <SheetBookmark>[],
        ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'setlist-1',
        title: '공연 순서',
        scoreIds: const <String>['score-1'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(
      MaterialApp(
        home: SheetSetlistDetailScreen(
          controller: controller,
          setlistId: 'setlist-1',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('악보 추가'));
    await tester.pumpAndSettle();

    expect(find.text('추가할 악보를 선택하세요'), findsOneWidget);
    await tester.tap(find.text('악보 score-2'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('악보 score-3'));
    await tester.pumpAndSettle();

    expect(find.text('2개 악보 선택됨'), findsOneWidget);
    await tester.tap(find.text('추가'));
    await tester.pumpAndSettle();

    expect(controller.setlists.single.scoreIds, <String>[
      'score-1',
      'score-2',
      'score-3',
    ]);
    expect(find.text('2개 악보를 세트리스트에 추가했습니다.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('setlist detail selects filtered scores for bulk add', (
    tester,
  ) async {
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
      for (final id in const <String>['score-1', 'score-2', 'score-3'])
        SheetScore(
          id: id,
          title: '악보 $id',
          composer: '',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/$id.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const <SheetBookmark>[],
        ),
    ]);
    await store.saveSetlists([
      SheetSetlist(
        id: 'setlist-1',
        title: '공연 순서',
        scoreIds: const <String>['score-1'],
        createdAt: now,
        updatedAt: now,
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(
      MaterialApp(
        home: SheetSetlistDetailScreen(
          controller: controller,
          setlistId: 'setlist-1',
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('악보 추가'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'score-2');
    await tester.pumpAndSettle();

    await tester.tap(find.text('현재 검색 결과 전체 선택'));
    await tester.pumpAndSettle();
    expect(find.text('1개 악보 선택됨'), findsOneWidget);

    await tester.tap(find.text('추가'));
    await tester.pumpAndSettle();

    expect(controller.setlists.single.scoreIds, <String>['score-1', 'score-2']);
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
          countInBars: 1,
        ),
      ),
    );

    expect(find.text('메트로놈'), findsOneWidget);
    expect(find.textContaining('소리 켬'), findsOneWidget);
    expect(find.text('이 악보에 저장됩니다'), findsOneWidget);
    expect(find.text('박자'), findsOneWidget);
    expect(find.text('나눔'), findsOneWidget);
    expect(find.text('카운트인'), findsOneWidget);
    expect(find.text('1마디'), findsOneWidget);
    expect(find.text('탭 템포'), findsOneWidget);
    expect(find.byTooltip('악보 위에 작게 띄우기'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('틱 소리'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('강세 패턴'), findsOneWidget);
    expect(find.text('1박'), findsOneWidget);
    expect(find.text('강세 사용'), findsOneWidget);
    expect(find.text('틱 소리'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('소리 크기'),
      160,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('소리 크기'), findsOneWidget);
    expect(find.text('85%'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('소리 확인'),
      160,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('소리 확인'), findsOneWidget);
  });

  testWidgets('mini metronome panel exposes visual beat strip', (tester) async {
    await tester.pumpWidget(
      buildViewerMiniMetronomePanelForTest(
        settings: const SheetMetronomeSettings(
          bpm: 96,
          meter: SheetMetronomeMeter.threeFour,
          soundEnabled: false,
        ),
      ),
    );

    expect(find.bySemanticsLabel('메트로놈 시각 박자 표시'), findsOneWidget);
    expect(find.textContaining('96 BPM'), findsOneWidget);
    expect(find.text('화면 표시만'), findsOneWidget);

    await tester.tap(find.text('시작'));
    await tester.pump();

    expect(find.text('정지'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tap zone hint explains page turn regions', (tester) async {
    await tester.pumpWidget(buildTapZoneHintOverlayForTest());

    expect(find.text('이전'), findsOneWidget);
    expect(find.text('메뉴'), findsOneWidget);
    expect(find.text('다음'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('compact viewer menu exposes score metadata editing', (
    tester,
  ) async {
    await tester.pumpWidget(buildViewerCompactOptionsMenuForTest());

    await tester.tap(find.byTooltip('보기 옵션'));
    await tester.pumpAndSettle();

    expect(find.text('북마크 목록'), findsOneWidget);
    expect(find.text('파트/버전'), findsOneWidget);
    expect(find.text('악보 정보 편집'), findsOneWidget);
    expect(find.text('악보 메모'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('annotation stamp picker exposes music rehearsal marks', (
    tester,
  ) async {
    await tester.pumpWidget(buildAnnotationToolbarForTest());

    expect(find.byTooltip('오선'), findsOneWidget);
    expect(find.byTooltip('격자'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.byTooltip('스탬프 선택'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byTooltip('스탬프 선택'));
    await tester.pumpAndSettle();

    expect(find.text('Fine'), findsOneWidget);
    expect(find.text('D.C.'), findsOneWidget);
    expect(find.text('D.S.'), findsOneWidget);
    expect(find.text('Coda'), findsOneWidget);
    expect(find.text('rit.'), findsOneWidget);
    expect(find.text('accel.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('import nudge offers immediate score metadata editing', (
    tester,
  ) async {
    var didTapEdit = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => FilledButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  buildImportedScoreNudgeSnackBarForTest(
                    title: '새 악보',
                    onEdit: () => didTapEdit = true,
                  ),
                );
              },
              child: const Text('show'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('show'));
    await tester.pumpAndSettle();

    expect(find.text('"새 악보" 악보를 추가했습니다.'), findsOneWidget);
    expect(find.text('정보 편집'), findsOneWidget);

    await tester.tap(find.text('정보 편집'));
    await tester.pump();

    expect(didTapEdit, isTrue);
    expect(tester.takeException(), isNull);
  });
}
