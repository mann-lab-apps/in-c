import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  for (final tooltip in ['즐겨찾기', '고정']) {
    testWidgets('score card accepts two $tooltip taps before rebuilding', (
      tester,
    ) async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final now = DateTime(2026, 9, 13);
      final store = SheetLibraryStore();
      await store.saveScores([
        SheetScore(
          id: 'ready',
          title: 'Concert score',
          composer: 'Bach',
          tags: const [],
          note: '',
          filePath: '/tmp/concert.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const [],
        ),
      ]);
      final controller = SheetLibraryController(store: store);
      await controller.load();
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      final control = find.byTooltip(tooltip).first;
      await tester.ensureVisible(control);
      await tester.tap(control);
      final first = controller.scoreById('ready');
      expect(tooltip == '고정' ? first.isPinned : first.isFavorite, isTrue);
      await tester.tap(control);
      await tester.pumpAndSettle();
      final second = controller.scoreById('ready');
      expect(tooltip == '고정' ? second.isPinned : second.isFavorite, isFalse);
      expect(tester.takeException(), isNull);
      await controller.load();
      expect(
        tooltip == '고정'
            ? controller.scoreById('ready').isPinned
            : controller.scoreById('ready').isFavorite,
        isFalse,
      );
    });
  }

  for (final outcome in ['save', 'removed', 'cancel']) {
    final removed = outcome == 'removed';
    testWidgets(
      'metadata dialog preserves current score or reports missing target $outcome',
      (tester) async {
        SharedPreferences.setMockInitialValues(<String, Object>{});
        tester.view.physicalSize = const Size(2560, 1600);
        tester.view.devicePixelRatio = 2;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });
        final now = DateTime(2026, 9, 13);
        final store = SheetLibraryStore();
        await store.saveScores([
          SheetScore(
            id: 'draft',
            title: 'Draft score',
            composer: '',
            tags: const [],
            note: '',
            filePath: '/tmp/draft.pdf',
            importedAt: now,
            updatedAt: now,
            lastOpenedAt: null,
            lastPage: 1,
            isFavorite: false,
            bookmarks: const [],
          ),
        ]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        await tester.pumpWidget(InCSheetApp(controller: controller));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Draft score').first);
        await tester.pumpAndSettle();
        expect(find.text('악보 정보 편집'), findsOneWidget);
        await tester.enterText(
          find.widgetWithText(TextField, '제목'),
          'Concert score',
        );
        if (removed) {
          await controller.deleteScoresByIds({'draft'});
        } else {
          await controller.updateLastPage(controller.scoreById('draft'), 4);
          await controller.toggleFavorite(controller.scoreById('draft'));
        }
        await tester.pump();
        final save = outcome == 'cancel'
            ? find.widgetWithText(TextButton, '취소')
            : find.widgetWithText(FilledButton, '저장');
        await tester.ensureVisible(save);
        await tester.tap(save);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        if (removed) {
          expect(controller.scores, isEmpty);
          expect(find.text('악보가 없어 정보를 저장하지 못했습니다.'), findsOneWidget);
        } else {
          final score = controller.scoreById('draft');
          expect(
            score.title,
            outcome == 'cancel' ? 'Draft score' : 'Concert score',
          );
          expect(score.lastPage, 4);
          expect(score.isFavorite, isTrue);
        }
        await controller.load();
        if (removed) {
          expect(controller.scores, isEmpty);
        } else {
          expect(controller.scoreById('draft').lastPage, 4);
        }
      },
    );
  }

  for (final action in <String>['정보 복원', '자동 정보 복원', '전체 백업 복원']) {
    for (final outcome in <String>['success', 'cancel', 'error']) {
      testWidgets('$action blocks editing until restore $outcome', (
        tester,
      ) async {
        SharedPreferences.setMockInitialValues(<String, Object>{});
        final store = _DelayedRestoreStore();
        final controller = SheetLibraryController(store: store);
        await controller.load();
        await tester.pumpWidget(InCSheetApp(controller: controller));
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('백업/복원'));
        await tester.pumpAndSettle();
        await tester.tap(find.text(action));
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(FilledButton, '복원'));
        await tester.pump(const Duration(milliseconds: 350));
        expect(find.text('백업 복원 중'), findsOneWidget);
        expect(find.byTooltip('여러 악보 선택').hitTestable(), findsNothing);
        expect(find.byTooltip('백업/복원').hitTestable(), findsNothing);
        await tester.tapAt(const Offset(10, 250));
        await tester.binding.handlePopRoute();
        await tester.pump(const Duration(milliseconds: 350));
        expect(find.text('백업 복원 중'), findsOneWidget);
        expect(store.restoreCalls, 1);
        if (outcome == 'error') {
          store.completion.completeError(
            StateError('Simulated restore failure'),
          );
        } else {
          store.completion.complete(
            SheetLibraryBackupRestoreResult(
              status: outcome == 'cancel'
                  ? SheetLibraryBackupRestoreStatus.canceled
                  : SheetLibraryBackupRestoreStatus.restored,
            ),
          );
        }
        await tester.pumpAndSettle();
        expect(find.text('백업 복원 중'), findsNothing);
        expect(find.byTooltip('백업/복원').hitTestable(), findsOneWidget);
        if (outcome == 'error') {
          expect(find.textContaining('복원하지 못했습니다'), findsOneWidget);
        }
        expect(tester.takeException(), isNull);
      });
    }
  }

  testWidgets(
    'restore completion after leaving the app does not use a disposed navigator',
    (tester) async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      final store = _DelayedRestoreStore();
      final controller = SheetLibraryController(store: store);
      await controller.load();
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('백업/복원'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('전체 백업 복원'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, '복원'));
      await tester.pump(const Duration(milliseconds: 350));
      expect(find.text('백업 복원 중'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      store.completion.completeError(StateError('Late restore error'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('shared PDF import waits for a pending restore', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = _DelayedRestoreStore();
    final controller = _RecordingSharedImportController(store: store);
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('백업/복원'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('전체 백업 복원'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '복원'));
    await tester.pump(const Duration(milliseconds: 350));
    final reply = Completer<void>();
    tester.binding.channelBuffers.push(
      'clef/shared_imports',
      const StandardMethodCodec().encodeMethodCall(
        const MethodCall('sharedFiles', <Map<String, String>>[
          <String, String>{
            'path': '/tmp/shared-during-restore.pdf',
            'name': 'Shared score.pdf',
          },
        ]),
      ),
      (_) => reply.complete(),
    );
    await tester.pump(const Duration(milliseconds: 100));
    expect(controller.sharedImports, isEmpty);
    expect(reply.isCompleted, isFalse);
    store.completion.complete(
      const SheetLibraryBackupRestoreResult(
        status: SheetLibraryBackupRestoreStatus.restored,
      ),
    );
    await tester.pumpAndSettle();
    expect(reply.isCompleted, isTrue);
    expect(
      controller.sharedImports.single.path,
      '/tmp/shared-during-restore.pdf',
    );
    expect(find.text('백업 복원 중'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('backup menu waits for an active PDF import', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final store = _DelayedRestoreStore();
    final controller = SheetLibraryController(store: store);
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();
    final importing = controller.importPdf();
    await tester.pump();
    final menu = find.byWidgetPredicate(
      (widget) => widget is PopupMenuButton && widget.tooltip == '백업/복원',
    );
    expect(tester.widget<PopupMenuButton<dynamic>>(menu).enabled, isFalse);
    await tester.tap(find.byTooltip('라이브러리 메뉴'));
    await tester.pump(const Duration(milliseconds: 300));
    final namedBackup = find.ancestor(
      of: find.text('정보 복원'),
      matching: find.byWidgetPredicate((widget) => widget is PopupMenuItem),
    );
    expect(tester.widget<PopupMenuItem<dynamic>>(namedBackup).enabled, isFalse);
    Navigator.of(tester.element(find.text('정보 복원'))).pop();
    await tester.pump(const Duration(milliseconds: 300));
    store.importCompletion.complete(null);
    await importing;
    await tester.pumpAndSettle();
    expect(tester.widget<PopupMenuButton<dynamic>>(menu).enabled, isTrue);
    expect(tester.takeException(), isNull);
  });

  for (final width in <double>[320, 360]) {
    testWidgets('compact selection actions preserve the count at $width', (
      tester,
    ) async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      tester.view.physicalSize = Size(width, 720);
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      final now = DateTime(2026, 9, 13);
      final store = SheetLibraryStore();
      await store.saveScores(
        List<SheetScore>.generate(
          2,
          (index) => SheetScore(
            id: 'compact-$index',
            title: 'Score $index',
            composer: '',
            tags: const <String>[],
            note: '',
            filePath: '/tmp/compact-$index.pdf',
            importedAt: now,
            updatedAt: now,
            lastOpenedAt: null,
            lastPage: 1,
            isFavorite: false,
            bookmarks: const <SheetBookmark>[],
          ),
        ),
      );
      final controller = SheetLibraryController(store: store);
      await controller.load();
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('여러 악보 선택'));
      await tester.pumpAndSettle();
      final count = find.descendant(
        of: find.text('0개 선택'),
        matching: find.byType(RichText),
      );
      expect(
        tester.renderObject<RenderParagraph>(count).didExceedMaxLines,
        isFalse,
      );
      await tester.tap(find.byTooltip('선택 작업 더 보기'));
      await tester.pumpAndSettle();
      final actions = tester.widgetList<PopupMenuItem<dynamic>>(
        find.byWidgetPredicate((widget) => widget is PopupMenuItem),
      );
      expect(actions.length, 3);
      expect(actions.every((item) => !item.enabled), isTrue);
      await tester.tapAt(const Offset(10, 200));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('현재 목록 전체 선택'));
      await tester.pumpAndSettle();
      expect(find.text('2개 선택'), findsOneWidget);
      expect(find.byTooltip('선택 악보를 세트리스트에 추가').hitTestable(), findsOneWidget);
      await tester.tap(find.byTooltip('선택 작업 더 보기'));
      await tester.pumpAndSettle();
      expect(find.text('컬렉션 지정'), findsOneWidget);
      expect(find.text('라이브러리에서 제거'), findsOneWidget);
      await tester.tap(find.text('정보 일괄 편집'));
      await tester.pumpAndSettle();
      expect(find.text('일괄 편집'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('선택 작업 더 보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('컬렉션 지정'));
      await tester.pumpAndSettle();
      expect(find.text('2개 악보 컬렉션 지정'), findsOneWidget);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('선택 작업 더 보기'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('라이브러리에서 제거'));
      await tester.pumpAndSettle();
      expect(find.text('선택 악보 제거'), findsOneWidget);
      await tester.tap(find.text('취소'));
      await tester.pumpAndSettle();
      expect(controller.scores.length, 2);
      expect(find.text('2개 선택'), findsOneWidget);
      tester.view.physicalSize = const Size(1280, 800);
      await tester.pumpAndSettle();
      expect(find.byTooltip('선택 작업 더 보기'), findsNothing);
      expect(find.byTooltip('선택 악보 컬렉션 지정').hitTestable(), findsOneWidget);
      expect(find.byTooltip('선택 악보 정보 일괄 편집').hitTestable(), findsOneWidget);
      expect(find.byTooltip('선택 악보 라이브러리에서 제거').hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
  for (final viewport in <Size>[
    const Size(360, 720),
    const Size(1280, 800),
    const Size(800, 360),
  ]) {
    testWidgets(
      'library remains scrollable with all quick sections at $viewport',
      (tester) async {
        SharedPreferences.setMockInitialValues(<String, Object>{});
        tester.view.physicalSize = viewport;
        tester.view.devicePixelRatio = 1;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });
        final now = DateTime(2026, 9, 13);
        final store = SheetLibraryStore();
        final scores = List<SheetScore>.generate(
          30,
          (index) => SheetScore(
            id: 'scroll-$index',
            title: 'Scroll score $index',
            composer: 'Composer',
            tags: const <String>[],
            note: '',
            filePath: '/tmp/scroll-$index.pdf',
            importedAt: now.subtract(Duration(minutes: index)),
            updatedAt: now,
            lastOpenedAt: now.subtract(Duration(minutes: index)),
            lastPage: 1,
            isFavorite: true,
            isPinned: true,
            bookmarks: const <SheetBookmark>[],
            collection: 'Concert',
            group: 'Ensemble',
            rating: 4,
          ),
        );
        await store.saveScores(scores);
        await store.saveSetlists(<SheetSetlist>[
          SheetSetlist(
            id: 'recent',
            title: 'Recent concert',
            scoreIds: <String>[scores.first.id],
            createdAt: now,
            updatedAt: now,
            lastOpenedAt: now,
          ),
        ]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        await tester.pumpWidget(InCSheetApp(controller: controller));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        final scrollable = find
            .descendant(
              of: find.byKey(const ValueKey('clef-library-scroll')),
              matching: find.byWidgetPredicate(
                (widget) =>
                    widget is Scrollable &&
                    widget.axisDirection == AxisDirection.down,
              ),
            )
            .first;
        for (
          var attempt = 0;
          attempt < 60 &&
              find.text('Scroll score 29').hitTestable().evaluate().isEmpty;
          attempt += 1
        ) {
          final bounds = tester.getRect(scrollable);
          await tester.dragFrom(
            Offset(bounds.center.dx, bounds.bottom - 24),
            const Offset(0, -250),
          );
          await tester.pumpAndSettle();
        }
        final position = tester.state<ScrollableState>(scrollable).position;
        expect(
          find.text('Scroll score 29').hitTestable(),
          findsOneWidget,
          reason: 'scroll=${position.pixels}/${position.maxScrollExtent}',
        );
        await tester.longPress(find.text('Scroll score 29'));
        await tester.pumpAndSettle();
        expect(find.text('1개 선택'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.tap(find.byTooltip('선택 취소'));
        controller.updateQuery('no matching score');
        await tester.pumpAndSettle();
        expect(find.text('조건에 맞는 악보가 없습니다.'), findsOneWidget);
        final reset = find.widgetWithText(OutlinedButton, '검색/필터 초기화');
        await tester.ensureVisible(reset);
        await tester.pumpAndSettle();
        await tester.tap(reset);
        await tester.pumpAndSettle();
        expect(controller.filteredScores.length, 30);
        expect(controller.query, isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
    testWidgets('empty library actions remain reachable at $viewport', (
      tester,
    ) async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      tester.view.physicalSize = viewport;
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      final controller = SheetLibraryController(store: SheetLibraryStore());
      await controller.load();
      await tester.pumpWidget(InCSheetApp(controller: controller));
      await tester.pumpAndSettle();
      final add = find.widgetWithText(FilledButton, '악보 추가');
      await tester.dragFrom(
        Offset(viewport.width / 2, viewport.height - 48),
        const Offset(0, -250),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(add);
      await tester.pumpAndSettle();
      expect(add.hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('untitled scores remain identifiable in library and setlist', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime(2026, 9, 13);
    final store = SheetLibraryStore();
    final score = SheetScore(
      id: 'nameless',
      title: '   ',
      composer: '',
      tags: const <String>[],
      note: '',
      filePath: '/tmp/nameless-Bach-Minuet.pdf',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: null,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
    );
    final setlist = SheetSetlist(
      id: 'concert',
      title: 'Concert',
      scoreIds: <String>[score.id],
      createdAt: now,
      updatedAt: now,
    );
    await store.saveScores(<SheetScore>[score]);
    await store.saveSetlists(<SheetSetlist>[setlist]);
    final controller = SheetLibraryController(store: store);
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();
    expect(find.text('Bach-Minuet'), findsWidgets);
    expect(
      setlistShareTextForTest(setlist, <SheetScore>[score]),
      contains('1. Bach-Minuet'),
    );
    await tester.tap(find.byTooltip('세트리스트'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Concert'));
    await tester.pumpAndSettle();
    expect(find.text('Bach-Minuet'), findsOneWidget);
    expect(controller.scoreById('nameless').title, '   ');
    expect(tester.takeException(), isNull);
  });

  testWidgets('full restore reports missing files until acknowledged', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(store: _PartialBackupStore());
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('백업/복원'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('전체 백업 복원'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '복원'));
    await tester.pumpAndSettle();
    expect(find.text('일부 파일은 복원되지 않았습니다'), findsOneWidget);
    expect(find.textContaining('2개 파일은 백업에 포함되어 있지 않습니다.'), findsOneWidget);
    await tester.pump(const Duration(seconds: 10));
    expect(find.text('일부 파일은 복원되지 않았습니다'), findsOneWidget);
    await tester.tap(find.text('확인'));
    await tester.pumpAndSettle();
    expect(find.text('일부 파일은 복원되지 않았습니다'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Clef home exposes RC actions without discovery surface', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(store: SheetLibraryStore());
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.byTooltip('악보 추가'), findsOneWidget);
    await tester.tap(find.byTooltip('라이브러리 메뉴'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(ListTile, '도움말/피드백'), findsOneWidget);
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
          composer: index < 2 ? 'Bach' : 'Chopin',
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
    expect(find.text('작곡가'), findsOneWidget);
    expect(find.text('Bach 2'), findsOneWidget);

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
    await controller.updateComposerFilter('Beethoven');
    await controller.updateCollectionFilter('Recital');
    await controller.updateGroupFilter('Piano');
    await controller.updateMinimumRatingFilter(4);
    await controller.updateCustomFieldFilter('조성', 'D');

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('현재 조건'), findsOneWidget);
    expect(find.text('검색: moon'), findsOneWidget);
    expect(find.text('즐겨찾기'), findsWidgets);
    expect(find.text('작곡가: Beethoven'), findsOneWidget);
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

  testWidgets('home facet rows expose hidden values through more action', (
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
      for (var index = 1; index <= 8; index += 1)
        SheetScore(
          id: 'score-$index',
          title: 'Score $index',
          composer: '',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/score-$index.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          collection: 'Collection $index',
          bookmarks: const <SheetBookmark>[],
        ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    expect(find.text('Collection 1 1'), findsOneWidget);
    expect(find.text('더 보기 2'), findsOneWidget);
    expect(find.text('Collection 8 1'), findsNothing);

    await tester.tap(find.text('더 보기 2'));
    await tester.pumpAndSettle();

    expect(find.text('컬렉션 전체'), findsOneWidget);
    expect(find.widgetWithText(TextField, '조건 검색'), findsOneWidget);
    await tester.enterText(find.widgetWithText(TextField, '조건 검색'), '8');
    await tester.pumpAndSettle();
    expect(find.text('Collection 8 1'), findsOneWidget);
    expect(find.text('Collection 7 1'), findsNothing);

    await tester.tap(find.text('Collection 8 1'));
    await tester.pumpAndSettle();

    expect(controller.libraryViewSettings.collectionQuery, 'Collection 8');
    expect(controller.filteredScores.single.id, 'score-8');
    expect(find.text('컬렉션: Collection 8'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  test('recent setlist resume picks the last opened score when valid', () {
    final now = DateTime(2026, 9, 7, 10);
    final scores = <SheetScore>[
      SheetScore(
        id: 'score-1',
        title: 'First',
        composer: 'Bach',
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
    expect(
      setlistShareTextForTest(
        setlist.copyWith(
          rehearsalMode: true,
          scoreStartPages: const <String, int>{'score-1': 2, 'score-2': 5},
          scoreDurations: const <String, int>{'score-1': 180},
          scoreNotes: const <String, String>{'score-2': '반복 없이'},
          transitionSeconds: 15,
        ),
        scores,
      ),
      [
        '공연 순서',
        '2곡 · 총 3분 15초',
        '전환 15초',
        '',
        '1. First',
        '   Bach · 2쪽부터 · 3분',
        '2. Second',
        '   5쪽부터 · 반복 없이',
      ].join('\n'),
    );
  });

  testWidgets('setlist progress badge keeps current score context visible', (
    tester,
  ) async {
    await tester.pumpWidget(
      buildSetlistProgressBadgeForTest(
        scoreTitle: 'G선상의 아리아',
        subtitle: '공연 순서 · 2/8 · 3분 · 반복 없이',
      ),
    );

    expect(find.text('G선상의 아리아'), findsOneWidget);
    expect(find.text('공연 순서 · 2/8 · 3분 · 반복 없이'), findsOneWidget);
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
    expect(find.widgetWithText(TextField, '작곡가 변경'), findsOneWidget);
    await tester.enterText(
      find.widgetWithText(TextField, '작곡가 변경'),
      '  Bach  ',
    );
    expect(find.text('사용자 필드 일괄 지정'), findsOneWidget);
    expect(find.text('조성'), findsOneWidget);
    expect(find.text('필드 이름'), findsOneWidget);
    expect(find.text('필드 값'), findsOneWidget);

    await tester.tap(find.text('조성'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '필드 값'), 'D');
    await tester.pumpAndSettle();
    final apply = find.widgetWithText(FilledButton, '적용');
    await tester.ensureVisible(apply);
    await tester.pumpAndSettle();
    await tester.tap(apply);
    await tester.pumpAndSettle();

    expect(controller.scoreById('score-1').customFields.single.key, '조성');
    expect(controller.scoreById('score-1').customFields.single.value, 'D');
    expect(controller.scoreById('score-1').composer, 'Bach');
    await tester.tap(find.byTooltip('여러 악보 선택'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('현재 목록 전체 선택'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('선택 악보 정보 일괄 편집'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '작곡가 변경'), '   ');
    await tester.enterText(
      find.widgetWithText(TextField, '추가할 태그'),
      'practice',
    );
    await tester.ensureVisible(apply);
    await tester.pumpAndSettle();
    await tester.tap(apply);
    await tester.pumpAndSettle();
    expect(controller.scoreById('score-1').composer, 'Bach');
    expect(controller.scoreById('score-1').tags, contains('practice'));
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

    expect(find.text('정보 정리 필요'), findsOneWidget);
    expect(find.text('제목/작곡가 등이 비어 있어요. 누르면 정보 편집.'), findsOneWidget);
    expect(find.text('정보 편집'), findsOneWidget);
    expect(find.text('최근 악보'), findsOneWidget);
    expect(find.text('마지막으로 연 악보'), findsOneWidget);
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

  for (final width in [320.0, 360.0]) {
    testWidgets('setlist toolbar keeps title readable at $width', (
      tester,
    ) async {
      SharedPreferences.setMockInitialValues(<String, Object>{});
      String? copied;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            copied = (call.arguments as Map)['text'] as String;
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      tester.view.physicalSize = Size(width, 720);
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      final controller = SheetLibraryController(store: SheetLibraryStore());
      await controller.load();
      final setlist = await controller.createSetlist('공연 순서');
      await tester.pumpWidget(
        MaterialApp(
          initialRoute: '/setlist',
          routes: {
            '/': (_) => const Scaffold(),
            '/setlist': (_) => SheetSetlistDetailScreen(
              controller: controller,
              setlistId: setlist.id,
            ),
          },
        ),
      );
      await tester.pumpAndSettle();
      final title = tester.renderObject<RenderParagraph>(find.text('공연 순서'));
      expect(title.didExceedMaxLines, isFalse);
      expect(title.size.width, greaterThanOrEqualTo(80));
      for (final tooltip in ['첫 곡 열기', '리허설 모드']) {
        final button = find.byWidgetPredicate(
          (widget) => widget is IconButton && widget.tooltip == tooltip,
        );
        expect(tester.widget<IconButton>(button).onPressed, isNull);
      }
      final more = find.byTooltip('세트리스트 작업 더 보기');
      await tester.tap(more);
      await tester.pumpAndSettle();
      for (final label in ['목록 복사', '세트리스트 복제', '이름 변경', '삭제']) {
        expect(find.text(label).hitTestable(), findsOneWidget);
      }
      await tester.tap(find.text('목록 복사'));
      await tester.pumpAndSettle();
      expect(copied, contains('공연 순서'));
      await tester.tap(more);
      await tester.pumpAndSettle();
      await tester.tap(find.text('이름 변경'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '저녁 공연');
      await tester.tap(find.widgetWithText(FilledButton, '저장'));
      await tester.pumpAndSettle();
      expect(controller.setlists.single.title, '저녁 공연');
      await tester.tap(more);
      await tester.pumpAndSettle();
      await tester.tap(find.text('세트리스트 복제'));
      await tester.pumpAndSettle();
      expect(controller.setlists, hasLength(2));
      expect(
        controller.setlists.map((item) => item.title),
        contains('저녁 공연 copy'),
      );
      await tester.tap(more);
      await tester.pumpAndSettle();
      await tester.tap(find.text('세트리스트 복제'));
      await tester.pumpAndSettle();
      expect(controller.setlists, hasLength(3));
      expect(
        controller.setlists.map((item) => item.title),
        contains('저녁 공연 copy (2)'),
      );
      await tester.tap(more);
      await tester.pumpAndSettle();
      await tester.tap(find.text('삭제'));
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.tap(find.widgetWithText(TextButton, '취소'));
      await tester.pumpAndSettle();
      expect(controller.setlists, hasLength(3));
      tester.view.physicalSize = const Size(1280, 800);
      await tester.pumpAndSettle();
      expect(more, findsNothing);
      for (final label in ['목록 복사', '세트리스트 복제', '이름 변경', '삭제']) {
        expect(find.byTooltip(label).hitTestable(), findsOneWidget);
      }
      expect(tester.takeException(), isNull);
    });
  }

  for (final listChanged in [false, true]) {
    testWidgets('setlist direct order entry with changed list: $listChanged', (
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
      if (listChanged) {
        await controller.removeScoreFromSetlist(
          controller.setlists.single,
          controller.scoreById('score-1'),
        );
        await tester.pumpAndSettle();
      }

      await tester.enterText(find.byType(TextFormField), '3');
      await tester.tap(find.text('이동'));
      await tester.pumpAndSettle();

      expect(controller.setlists.single.scoreIds, <String>[
        'score-2',
        'score-3',
        if (!listChanged) 'score-1',
      ]);
      if (listChanged) {
        expect(find.text('목록이 바뀌었습니다. 순서를 다시 선택해주세요.'), findsOneWidget);
        await tester.tap(find.byTooltip('순서 입력').first);
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextFormField), '2');
        await tester.tap(find.text('이동'));
        await tester.pumpAndSettle();
        expect(controller.setlists.single.scoreIds, ['score-3', 'score-2']);
      }
      expect(tester.takeException(), isNull);
    });
  }

  for (final pendingAction in ['add', 'rehearsal']) {
    testWidgets(
      'missing setlist closes pending $pendingAction without false success',
      (tester) async {
        SharedPreferences.setMockInitialValues(<String, Object>{});
        final now = DateTime(2026, 9, 13);
        final store = SheetLibraryStore();
        await store.saveScores([
          SheetScore(
            id: 'a',
            title: 'Minuet',
            composer: '',
            tags: const [],
            note: '',
            filePath: '/tmp/a.pdf',
            importedAt: now,
            updatedAt: now,
            lastOpenedAt: null,
            lastPage: 1,
            isFavorite: false,
            bookmarks: const [],
          ),
        ]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        final setlist = await controller.createSetlist('Concert');
        if (pendingAction == 'rehearsal') {
          await controller.addScoreToSetlist(setlist, controller.scores.single);
        }
        await tester.pumpWidget(
          MaterialApp(
            home: SheetSetlistDetailScreen(
              controller: controller,
              setlistId: setlist.id,
            ),
          ),
        );
        await tester.pumpAndSettle();
        if (pendingAction == 'add') {
          await tester.tap(find.text('악보 추가'));
          await tester.pumpAndSettle();
          await tester.tap(find.text('Minuet'));
        } else {
          await tester.tap(find.byTooltip('리허설 모드'));
          await tester.pumpAndSettle();
        }
        await controller.deleteSetlist(setlist);
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        final submit = find.widgetWithText(
          FilledButton,
          pendingAction == 'add' ? '추가' : '저장',
        );
        await tester.ensureVisible(submit);
        await tester.pumpAndSettle();
        await tester.tap(submit);
        await tester.pumpAndSettle();
        expect(find.text('세트리스트를 찾을 수 없습니다.'), findsOneWidget);
        if (pendingAction == 'add') {
          expect(find.text('세트리스트가 없어 추가하지 못했습니다. 다시 선택해주세요.'), findsOneWidget);
        }
        expect(find.text('이미 모두 세트리스트에 포함되어 있습니다.'), findsNothing);
        expect(controller.setlists, isEmpty);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('setlist detail appends another setlist from toolbar action', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    tester.view.physicalSize = const Size(2560, 1600);
    tester.view.devicePixelRatio = 2;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final now = DateTime(2026, 9, 26, 10);
    final store = SheetLibraryStore();
    await store.saveScores([
      SheetScore(
        id: 'a',
        title: 'Prelude',
        composer: '',
        tags: const [],
        note: '',
        filePath: '/tmp/a.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const [],
      ),
      SheetScore(
        id: 'b',
        title: 'Fugue',
        composer: '',
        tags: const [],
        note: '',
        filePath: '/tmp/b.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const [],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();
    final target = await controller.createSetlist('First half');
    await controller.addScoreToSetlist(target, controller.scoreById('a'));
    final source = await controller.createSetlist('Second half');
    await controller.addScoreToSetlist(source, controller.scoreById('b'));

    await tester.pumpWidget(
      MaterialApp(
        home: SheetSetlistDetailScreen(
          controller: controller,
          setlistId: target.id,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('다른 세트리스트 이어붙이기'));
    await tester.pumpAndSettle();
    expect(find.text('이어붙일 세트리스트'), findsOneWidget);
    await tester.tap(find.text('Second half'));
    await tester.pumpAndSettle();

    expect(controller.setlistById(target.id).scoreIds, ['a', 'b']);
    expect(find.text('1개 악보를 "Second half"에서 이어붙였습니다.'), findsOneWidget);
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

  for (final removed in ['none', 'score', 'setlist']) {
    testWidgets('setlist undo after removing $removed', (tester) async {
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

      expect(controller.setlists.single.scoreIds, <String>[
        'score-1',
        'score-3',
      ]);
      expect(find.text('"악보 score-2"을 세트리스트에서 제거했습니다.'), findsOneWidget);
      expect(find.text('되돌리기'), findsOneWidget);
      if (removed == 'score') {
        await controller.deleteScoresByIds({'score-2'});
        await tester.pumpAndSettle();
      } else if (removed == 'setlist') {
        await controller.deleteSetlist(controller.setlists.single);
        await tester.pumpAndSettle();
      }

      await tester.tap(find.text('되돌리기'));
      await tester.pumpAndSettle();

      if (removed == 'setlist') {
        expect(controller.setlists, isEmpty);
      } else {
        expect(controller.setlists.single.scoreIds, <String>[
          'score-1',
          if (removed == 'none') 'score-2',
          'score-3',
        ]);
      }
      if (removed != 'none') {
        expect(find.text('악보 또는 세트리스트가 없어 되돌리지 못했습니다.'), findsOneWidget);
      }
      expect(tester.takeException(), isNull);
    });
  }

  for (final removedCount in [1, 2]) {
    testWidgets(
      'bulk add reports $removedCount scores removed while selecting',
      (tester) async {
        SharedPreferences.setMockInitialValues(<String, Object>{});
        final now = DateTime(2026, 9, 13);
        final store = SheetLibraryStore();
        await store.saveScores([
          for (final id in ['a', 'b', 'c'])
            SheetScore(
              id: id,
              title: 'Score $id',
              composer: '',
              tags: const [],
              note: '',
              filePath: '/tmp/$id.pdf',
              importedAt: now,
              updatedAt: now,
              lastOpenedAt: null,
              lastPage: 1,
              isFavorite: false,
              bookmarks: const [],
            ),
        ]);
        final controller = SheetLibraryController(store: store);
        await controller.load();
        final setlist = await controller.createSetlist('Concert');
        await controller.addScoreToSetlist(setlist, controller.scoreById('a'));
        await tester.pumpWidget(
          MaterialApp(
            home: SheetSetlistDetailScreen(
              controller: controller,
              setlistId: setlist.id,
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('악보 추가'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Score b'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Score c'));
        await tester.pumpAndSettle();
        await controller.deleteScoresByIds({'c', if (removedCount == 2) 'b'});
        await tester.pumpAndSettle();
        await tester.tap(find.text('추가'));
        await tester.pumpAndSettle();
        expect(controller.setlists.single.scoreIds, [
          'a',
          if (removedCount == 1) 'b',
        ]);
        expect(
          find.text(
            removedCount == 1
                ? '1개 악보를 세트리스트에 추가했습니다. 라이브러리에서 제거된 1개는 건너뛰었습니다.'
                : '선택한 악보 중 2개가 라이브러리에 없어 추가하지 못했습니다.',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final changedWhilePicking in [false, true]) {
    testWidgets(
      'setlist detail bulk add with newer snapshot: $changedWhilePicking',
      (tester) async {
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
        if (changedWhilePicking) {
          await controller.addScoreToSetlist(
            controller.setlists.single,
            controller.scoreById('score-3'),
          );
          await tester.pumpAndSettle();
        }
        await tester.tap(find.text('추가'));
        await tester.pumpAndSettle();

        expect(controller.setlists.single.scoreIds, <String>[
          'score-1',
          if (changedWhilePicking) ...[
            'score-3',
            'score-2',
          ] else ...[
            'score-2',
            'score-3',
          ],
        ]);
        expect(
          find.text(
            changedWhilePicking
                ? '1개 악보를 세트리스트에 추가했습니다. 이미 포함된 1개는 건너뛰었습니다.'
                : '2개 악보를 세트리스트에 추가했습니다.',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }

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

  testWidgets('page picker supports long score direct jump', (tester) async {
    final requestedPages = <int>[];
    await tester.pumpWidget(
      buildPagePickerSheetForTest(
        pageCount: 24,
        currentPage: 3,
        pageSettings: const SheetPageSettings(
          hiddenPages: <int>[5],
          pageRotations: <int, int>{},
          pageOrder: <int>[1, 2, 2, 3, 4, 6],
        ),
        onGoToPage: requestedPages.add,
      ),
    );

    expect(find.text('현재 3쪽 · 선택 3/24쪽'), findsOneWidget);
    expect(find.byType(Slider), findsOneWidget);
    expect(find.text('쪽 번호'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '5');
    await tester.pump();
    expect(find.text('숨김 페이지는 가까운 보이는 쪽으로 이동합니다.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '99');
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, '이동'));
    await tester.pump();

    expect(requestedPages, <int>[24]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('annotation stamp picker exposes music rehearsal marks', (
    tester,
  ) async {
    await tester.pumpWidget(buildAnnotationToolbarForTest());

    expect(find.text('필기 도구'), findsOneWidget);
    expect(find.text('스탬프'), findsOneWidget);
    expect(find.byTooltip('오선'), findsOneWidget);
    expect(find.byTooltip('격자'), findsOneWidget);

    await tester.tap(find.byTooltip('필기 도구 선택'));
    await tester.pumpAndSettle();

    expect(find.text('펜'), findsOneWidget);
    expect(find.text('형광펜'), findsOneWidget);
    expect(find.text('오선'), findsOneWidget);
    expect(find.text('지우개'), findsOneWidget);
    await tester.tap(find.text('지우개'));
    await tester.pumpAndSettle();

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

  testWidgets('performance preset save failure reports and preserves input', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(
      buildPerformanceSettingsSheetForTest(
        onSavePresetTemplate: (_, _, _) async {
          throw StateError('injected save failure');
        },
      ),
    );

    await tester.enterText(find.byType(TextField).first, 'Tablet preset');
    await tester.scrollUntilVisible(
      find.text('현재 설정 저장'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('현재 설정 저장'));
    await tester.pumpAndSettle();

    expect(find.text('공연 보기 프리셋을 저장하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
    expect(find.text('Tablet preset'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final mode in ['false', 'throw']) {
    testWidgets('performance preset delete $mode reports and keeps preset', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1200, 1400);
      tester.view.devicePixelRatio = 1;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      await tester.pumpWidget(
        buildPerformanceSettingsSheetForTest(
          presetTemplates: const [
            SheetPerformancePresetTemplate(
              id: 'concert',
              name: 'Concert setup',
              viewerSettings: SheetViewerSettings.defaultSettings,
            ),
          ],
          onDeletePresetTemplate: (_) async {
            if (mode == 'throw') {
              throw StateError('injected delete failure');
            }
            return false;
          },
        ),
      );

      await tester.scrollUntilVisible(
        find.byTooltip('삭제'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byTooltip('삭제'));
      await tester.pumpAndSettle();

      expect(find.text('공연 보기 프리셋을 삭제하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
      expect(find.text('Concert setup'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

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

class _RecordingSharedImportController extends SheetLibraryController {
  _RecordingSharedImportController({required super.store});
  final sharedImports = <SheetSharedImportFile>[];

  @override
  Future<List<SheetScore>> importSharedPdfFiles(
    List<SheetSharedImportFile> files,
  ) async {
    sharedImports.addAll(files);
    return <SheetScore>[];
  }
}

class _DelayedRestoreStore extends SheetLibraryStore {
  final completion = Completer<SheetLibraryBackupRestoreResult>();
  final importCompletion = Completer<SheetScore?>();
  int restoreCalls = 0;

  @override
  Future<SheetScore?> importPdf() => importCompletion.future;

  Future<SheetLibraryBackupRestoreResult> _restore() {
    restoreCalls += 1;
    return completion.future;
  }

  @override
  Future<SheetLibraryBackupRestoreResult> importMetadataBackup() => _restore();
  @override
  Future<SheetLibraryBackupRestoreResult> restoreAutomaticMetadataBackup() =>
      _restore();
  @override
  Future<SheetLibraryBackupRestoreResult> importFullBackup() => _restore();
}

class _PartialBackupStore extends SheetLibraryStore {
  @override
  Future<SheetLibraryBackupRestoreResult> importFullBackup() async {
    return const SheetLibraryBackupRestoreResult(
      status: SheetLibraryBackupRestoreStatus.restored,
      restoredScoreCount: 3,
      restoredSetlistCount: 1,
      missingFileCount: 2,
    );
  }
}
