import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_annotation.dart';
import 'package:in_c_sheet/sheet_chordpro.dart';
import 'package:in_c_sheet/sheet_file_import.dart';
import 'package:in_c_sheet/sheet_library_backup.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_library_view_settings.dart';
import 'package:in_c_sheet/sheet_metronome.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';
import 'package:in_c_sheet/sheet_tone.dart';
import 'package:in_c_sheet/sheet_tuner.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('Clef app disables debug banner for store screenshots', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(store: SheetLibraryStore());
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.title, 'Clef & Staff');
    expect(app.debugShowCheckedModeBanner, isFalse);
  });

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

  testWidgets('metadata dialog suggests existing custom field values', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    tester.view.physicalSize = const Size(2560, 1600);
    tester.view.devicePixelRatio = 2;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final now = DateTime(2026, 9, 27);
    final store = SheetLibraryStore();
    await store.saveScores([
      SheetScore(
        id: 'target',
        title: 'Target score',
        composer: '',
        tags: const [],
        note: '',
        filePath: '/tmp/target.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const [],
      ),
      SheetScore(
        id: 'source',
        title: 'Source score',
        composer: '',
        tags: const [],
        note: '',
        filePath: '/tmp/source.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const [],
        customFields: const [
          SheetCustomMetadataField(key: '조성', value: 'A minor'),
        ],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Target score').first);
    await tester.pumpAndSettle();
    final keyChip = find.widgetWithText(ActionChip, '조성').last;
    await tester.ensureVisible(keyChip);
    await tester.tap(keyChip);
    await tester.pumpAndSettle();

    expect(find.text('이전에 쓴 값'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'A minor'), findsOneWidget);

    await tester.tap(find.widgetWithText(ActionChip, 'A minor'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '저장').last);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '저장'));
    await tester.pumpAndSettle();

    expect(controller.scoreById('target').customFields.single.key, '조성');
    expect(controller.scoreById('target').customFields.single.value, 'A minor');
    expect(tester.takeException(), isNull);
  });

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
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
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

  testWidgets('backup status explains automatic snapshot and full backup', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = _BackupHealthController(
      SheetLibraryBackupHealth(
        currentScoreCount: 3,
        currentSetlistCount: 1,
        currentTextScoreCount: 1,
        currentPdfScoreCount: 2,
        missingPrimaryFileCount: 1,
        linkedFileCount: 2,
        fileBackedAnnotationCount: 1,
        userStampPackCount: 1,
        hasAutomaticMetadataBackup: true,
        automaticMetadataExportedAt: DateTime(2026, 9, 27, 10),
        automaticMetadataScoreCount: 3,
        automaticMetadataSetlistCount: 1,
        lastBackupExportRecord: SheetLibraryBackupExportRecord(
          kind: SheetLibraryBackupExportKind.full,
          exportedAt: DateTime(2026, 9, 27, 11),
          outputUri: 'file:///tmp/clef-full-backup.zip',
        ),
      ),
    );
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('백업/복원'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('백업 상태'));
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('백업 상태'), findsWidgets);
    expect(find.text('자동 정보 백업 있음'), findsOneWidget);
    expect(find.text('PDF 포함 전체 백업'), findsOneWidget);
    expect(find.text('최근 수동 백업'), findsOneWidget);
    expect(find.textContaining('PDF 포함 전체 백업 ·'), findsOneWidget);
    expect(find.textContaining('clef-full-backup.zip'), findsOneWidget);
    expect(
      find.textContaining('동기화 완료 표시가 아닙니다', skipOffstage: false),
      findsOneWidget,
    );
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

  testWidgets('library quick index opens grouped title picker', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final now = DateTime(2026, 9, 27);
    final store = SheetLibraryStore();
    await store.saveScores([
      for (var index = 0; index < 6; index += 1)
        SheetScore(
          id: 'alpha-$index',
          title: 'Alpha score $index',
          composer: 'Composer',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/alpha-$index.pdf',
          importedAt: now,
          updatedAt: now,
          lastOpenedAt: null,
          lastPage: 1,
          isFavorite: false,
          bookmarks: const <SheetBookmark>[],
        ),
      for (var index = 0; index < 6; index += 1)
        SheetScore(
          id: 'beta-$index',
          title: 'Beta score $index',
          composer: 'Composer',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/beta-$index.pdf',
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

    expect(find.text('빠른 찾기'), findsOneWidget);
    expect(find.text('A 6'), findsOneWidget);
    expect(find.text('B 6'), findsOneWidget);

    await tester.tap(find.text('B 6'));
    await tester.pumpAndSettle();

    expect(find.text('B 빠른 찾기'), findsOneWidget);
    final sheet = find.byType(BottomSheet);
    expect(
      find.descendant(of: sheet, matching: find.text('Beta score 0')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: sheet, matching: find.text('Alpha score 5')),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
  });

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

  testWidgets('automatic restore dialog previews backup changes', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime(2026, 9, 27, 10);
    final store = SheetLibraryStore();
    await store.saveScores(<SheetScore>[
      SheetScore(
        id: 'auto-backup-score',
        title: 'Automatic Backup Score',
        composer: 'Bach',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/automatic-backup-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const [],
      ),
    ]);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      'clef_scores',
      SheetScore.encodeList(const <SheetScore>[]),
    );

    final controller = SheetLibraryController(store: store);
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('백업/복원'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('자동 정보 복원'));
    await tester.pumpAndSettle();

    expect(find.text('자동 정보 복원'), findsOneWidget);
    expect(find.text('백업 변경 1종 감지'), findsOneWidget);
    expect(find.text('• 새 악보 1개'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('metadata restore dialog previews selected backup changes', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final now = DateTime(2026, 9, 27, 10);
    final store = _MetadataPreviewStore();
    await store.saveScores(<SheetScore>[
      SheetScore(
        id: 'current-score',
        title: 'Current Score',
        composer: 'Bach',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/current-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const [],
      ),
    ]);
    store.backupJson = SheetLibraryBackupCodec.encode(
      SheetLibraryBackup.fromState(
        scores: <SheetScore>[
          SheetScore(
            id: 'incoming-score',
            title: 'Incoming Score',
            composer: 'Mozart',
            tags: const <String>[],
            note: '',
            filePath: '/tmp/incoming-score.pdf',
            importedAt: now,
            updatedAt: now,
            lastOpenedAt: null,
            lastPage: 1,
            isFavorite: false,
            bookmarks: const [],
          ),
        ],
        setlists: const <SheetSetlist>[],
        metronomeSettings: SheetMetronomeSettings.defaultSettings,
        tunerSettings: SheetTunerSettings.defaultSettings,
        toneSettings: SheetToneSettings.defaultSettings,
        libraryViewSettings: SheetLibraryViewSettings.defaultSettings,
      ),
    );

    final controller = SheetLibraryController(store: store);
    await controller.load();
    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('백업/복원'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('정보 복원'));
    await tester.pumpAndSettle();

    expect(find.text('정보 복원'), findsOneWidget);
    expect(find.textContaining('선택한 백업 JSON의 1개 악보'), findsOneWidget);
    expect(find.text('백업 변경 2종 감지'), findsOneWidget);
    expect(find.text('• 새 악보 1개'), findsOneWidget);
    expect(find.text('• 삭제된 악보 1개'), findsOneWidget);
    expect(find.text('삭제 포함 전체 교체'), findsOneWidget);
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
    expect(find.widgetWithText(ListTile, '개발자용 기기 리포트'), findsOneWidget);
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

  testWidgets('setlist manifest import creates matched setlist', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final now = DateTime(2026, 9, 28, 12);
    final store = SheetLibraryStore();
    await store.saveScores([
      SheetScore(
        id: 'goedicke',
        title: 'Goedicke Concert Etude',
        composer: 'Goedicke',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/goedicke-concert-etude.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
      ),
      SheetScore(
        id: 'bach',
        title: 'Bach Cello Suite No. 1',
        composer: 'Bach',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/bach-suite.pdf',
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

    await tester.pumpWidget(
      MaterialApp(home: SheetSetlistsScreen(controller: controller)),
    );
    await tester.pumpAndSettle();

    expect(find.widgetWithText(OutlinedButton, '패키지'), findsOneWidget);
    await tester.tap(find.widgetWithText(OutlinedButton, '텍스트'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '''
Clef & Staff 세트리스트
제목: Autumn Recital
곡 수: 2곡 · 총 7분 30초
전환 10초

1. Goedicke Concert Etude
   작곡가: Goedicke
   파일: goedicke-concert-etude.pdf
   시작: 3쪽
   예상 시간: 3분 30초
   세트 메모: mute ready
2. Bach Cello Suite No. 1
   작곡가: Bach
   파일: bach-suite.pdf
   시작: 1쪽
   예상 시간: 4분
''');
    await tester.pumpAndSettle();

    expect(find.text('모든 곡을 찾았습니다'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, '세트리스트 만들기'));
    await tester.pumpAndSettle();

    expect(controller.setlists, hasLength(1));
    final imported = controller.setlists.single;
    expect(imported.title, 'Autumn Recital');
    expect(imported.scoreIds, ['goedicke', 'bach']);
    expect(imported.scoreStartPages, {'goedicke': 3, 'bach': 1});
    expect(imported.scoreNotes, {'goedicke': 'mute ready'});
    expect(imported.scoreDurations, {'goedicke': 210, 'bach': 240});
    expect(imported.transitionSeconds, 10);
    expect(find.textContaining('세트리스트를 2곡으로 만들었습니다'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('setlist manifest import blocks unresolved matches', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    tester.view.physicalSize = const Size(1400, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final controller = SheetLibraryController(store: SheetLibraryStore());
    await controller.load();

    await tester.pumpWidget(
      MaterialApp(home: SheetSetlistsScreen(controller: controller)),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(OutlinedButton, '텍스트'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '''
Clef & Staff 세트리스트
제목: Autumn Recital
곡 수: 1곡

1. Missing Score
   파일: missing.pdf
''');
    await tester.pumpAndSettle();

    expect(find.text('확인이 필요합니다'), findsOneWidget);
    expect(find.textContaining('라이브러리에서 찾을 수 없는 곡'), findsOneWidget);
    final createButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, '세트리스트 만들기'),
    );
    expect(createButton.onPressed, isNull);
    expect(controller.setlists, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('setlist manifest import summarizes long lists on phone width', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final now = DateTime(2026, 9, 28, 12);
    final store = SheetLibraryStore();
    await store.saveScores([
      for (var index = 1; index <= 20; index++)
        SheetScore(
          id: 'score-$index',
          title: 'Score $index',
          composer: 'Composer',
          tags: const <String>[],
          note: '',
          filePath: '/tmp/score-$index.pdf',
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
    final manifest = StringBuffer('''
Clef & Staff 세트리스트
제목: Long Recital
곡 수: 20곡 · 총 20분
전환 5초

''');
    for (var index = 1; index <= 20; index++) {
      manifest
        ..writeln('$index. Score $index')
        ..writeln('   작곡가: Composer')
        ..writeln('   파일: score-$index.pdf')
        ..writeln('   예상 시간: 1분');
    }

    await tester.pumpWidget(
      MaterialApp(home: SheetSetlistsScreen(controller: controller)),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.widgetWithText(OutlinedButton, '텍스트'));
    await tester.tap(find.widgetWithText(OutlinedButton, '텍스트'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), manifest.toString());
    await tester.pumpAndSettle();

    expect(find.text('모든 곡을 찾았습니다'), findsOneWidget);
    expect(find.text('매칭 20개'), findsOneWidget);
    expect(find.text('확인 0개'), findsOneWidget);
    expect(find.text('외 12곡'), findsOneWidget);
    await tester.ensureVisible(find.widgetWithText(FilledButton, '세트리스트 만들기'));
    await tester.tap(find.widgetWithText(FilledButton, '세트리스트 만들기'));
    await tester.pumpAndSettle();

    expect(controller.setlists.single.title, 'Long Recital');
    expect(controller.setlists.single.scoreIds, hasLength(20));
    expect(tester.takeException(), isNull);
  });

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
    expect(find.text('텍스트/ChordPro/DOCX 안내'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('import menu explains unsupported text score formats', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(store: SheetLibraryStore());
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('악보 추가'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('텍스트/ChordPro/DOCX 안내'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('텍스트/ChordPro/DOCX 안내'));
    await tester.pumpAndSettle();

    expect(find.text('지금 가능한 저장 흐름'), findsOneWidget);
    expect(find.textContaining('ChordPro 붙여넣기 미리보기'), findsWidgets);
    expect(find.text('ChordPro 파일 선택 가져오기'), findsOneWidget);
    expect(find.text('ChordPro 표시 조정 지원'), findsOneWidget);
    expect(find.textContaining('ChordPro 붙여넣기/파일 저장'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ChordPro info can preview and save pasted text', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(store: _SmokeChordProStore());
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('악보 추가'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('텍스트/ChordPro/DOCX 안내'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('텍스트/ChordPro/DOCX 안내'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ChordPro 붙여넣기 미리보기'));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'ChordPro 텍스트'), '''
{title: Autumn Tune}
{artist: Lee}
{key: D}
{time: 6/8}
[D]가을 [A]노래
''');
    await tester.pumpAndSettle();

    expect(find.text('코드를 읽었습니다'), findsOneWidget);
    expect(find.text('제목: Autumn Tune'), findsOneWidget);
    expect(find.text('작곡가: Lee'), findsOneWidget);
    expect(find.text('조성: D'), findsOneWidget);
    expect(find.textContaining('가을 노래'), findsOneWidget);
    await tester.tap(find.text('악보로 저장'));
    await tester.pumpAndSettle();

    expect(find.text('"Autumn Tune" ChordPro 악보를 저장했습니다.'), findsOneWidget);
    expect(controller.scores.single.title, 'Autumn Tune');
    expect(find.text('Autumn Tune'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ChordPro info can import a selected ChordPro file', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final controller = SheetLibraryController(
      store: _SmokeChordProStore()
        ..pickedChordProFile = SheetImportedFile(
          name: 'winter-song.chordpro',
          bytes: Uint8List.fromList(
            utf8.encode('''
{title: Winter Song}
{artist: Kim}
{key: F}
[F]겨울 [C]노래
'''),
          ),
        ),
    );
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('악보 추가'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('텍스트/ChordPro/DOCX 안내'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('텍스트/ChordPro/DOCX 안내'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ChordPro 파일 선택 가져오기'));
    await tester.pumpAndSettle();

    expect(find.text('"Winter Song" ChordPro 파일을 가져왔습니다.'), findsOneWidget);
    expect(controller.scores.single.title, 'Winter Song');
    expect(find.text('Winter Song'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('saved ChordPro score opens a read-only chord lyric viewer', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final tempDir = Directory.systemTemp.createTempSync(
      'clef-chordpro-viewer-',
    );
    addTearDown(() {
      if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
    });
    final file = File('${tempDir.path}/autumn.chordpro')
      ..writeAsStringSync('''
{title: Autumn Tune}
{composer: Lee}
{key: D}
[D]가을 [A]노래
''');
    final now = DateTime(2026, 9, 28, 17);
    final store = SheetLibraryStore();
    await store.saveScores([
      SheetScore(
        id: 'chordpro-score',
        title: 'Autumn Tune',
        composer: 'Lee',
        tags: const <String>[],
        note: '',
        filePath: file.path,
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

    await tester.pumpWidget(
      MaterialApp(
        home: SheetChordProViewerScreen(
          controller: controller,
          scoreId: 'chordpro-score',
        ),
      ),
    );
    await tester.pump();
    await tester.runAsync(() async {
      await Future<void>.delayed(Duration.zero);
    });
    await tester.pump();

    expect(find.text('Autumn Tune'), findsWidgets);
    expect(find.text('ChordPro'), findsOneWidget);
    expect(find.text('조성: D'), findsOneWidget);
    expect(find.textContaining('가을 노래'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ChordPro viewer can transpose and show capo chord shapes', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final tempDir = Directory.systemTemp.createTempSync(
      'clef-chordpro-display-',
    );
    addTearDown(() {
      if (tempDir.existsSync()) tempDir.deleteSync(recursive: true);
    });
    final file = File('${tempDir.path}/capo.chordpro')
      ..writeAsStringSync('''
{title: Capo Tune}
{composer: Lee}
{key: E}
{capo: 2}
[E]가을 [B]노래
''');
    final now = DateTime(2026, 9, 28, 17);
    final store = SheetLibraryStore();
    await store.saveScores([
      SheetScore(
        id: 'chordpro-capo-score',
        title: 'Capo Tune',
        composer: 'Lee',
        tags: const <String>[],
        note: '',
        filePath: file.path,
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

    await tester.pumpWidget(
      MaterialApp(
        home: SheetChordProViewerScreen(
          controller: controller,
          scoreId: 'chordpro-capo-score',
        ),
      ),
    );
    await tester.pump();
    await tester.runAsync(() async {
      await Future<void>.delayed(Duration.zero);
    });
    await tester.pump();

    expect(find.text('조성: E'), findsOneWidget);
    expect(find.textContaining('E  B'), findsOneWidget);

    await tester.tap(find.byTooltip('반음 올림'));
    await tester.pump();

    expect(find.text('조성: F'), findsOneWidget);
    expect(find.text('이조: +1'), findsOneWidget);
    expect(find.textContaining('F  C'), findsOneWidget);

    await tester.tap(find.text('원래대로'));
    await tester.pump();
    await tester.tap(find.text('카포 운지'));
    await tester.pump();

    expect(find.text('카포 운지 표시'), findsOneWidget);
    expect(find.textContaining('D  A'), findsOneWidget);
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
        tags: const <String>['recital'],
        note: '',
        filePath: '/tmp/first.pdf',
        collection: 'Autumn',
        group: 'Cello',
        rating: 4,
        customFields: const <SheetCustomMetadataField>[
          SheetCustomMetadataField(key: '조성', value: 'G major'),
        ],
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
          scoreMetronomeSettings: const <String, SheetMetronomeSettings>{
            'score-1': SheetMetronomeSettings(
              bpm: 88,
              meter: SheetMetronomeMeter.threeFour,
              subdivision: SheetMetronomeSubdivision.eighth,
              volumePercent: 70,
            ),
          },
          transitionSeconds: 15,
        ),
        scores,
      ),
      [
        'Clef & Staff 세트리스트',
        '제목: 공연 순서',
        '곡 수: 2곡 · 총 3분 15초',
        '전환 15초',
        '',
        '1. First',
        '   작곡가: Bach',
        '   파일: first',
        '   시작: 2쪽',
        '   예상 시간: 3분',
        '   태그: recital',
        '   컬렉션: Autumn',
        '   그룹: Cello',
        '   별점: 4/5',
        '   조성: G major',
        '   메트로놈: 88 BPM · 3/4 · 8분 · 소리 70%',
        '2. Second',
        '   파일: second',
        '   시작: 5쪽',
        '   세트 메모: 반복 없이',
      ].join('\n'),
    );
  });

  testWidgets('setlist progress badge keeps current score context visible', (
    tester,
  ) async {
    await tester.pumpWidget(
      buildSetlistProgressBadgeForTest(
        scoreTitle: 'G선상의 아리아',
        subtitle: '공연 순서 · 2/8 · 3분 · 반복 없이 · 다음: 앙코르',
      ),
    );

    expect(find.text('G선상의 아리아'), findsOneWidget);
    expect(find.text('공연 순서 · 2/8 · 3분 · 반복 없이 · 다음: 앙코르'), findsOneWidget);
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

    await tester.longPress(find.text('long press score').last);
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
      SheetScore(
        id: 'score-2',
        title: 'metadata source score',
        composer: '',
        tags: const <String>[],
        note: '',
        filePath: '/tmp/metadata-source-score.pdf',
        importedAt: now,
        updatedAt: now,
        lastOpenedAt: null,
        lastPage: 1,
        isFavorite: false,
        bookmarks: const <SheetBookmark>[],
        customFields: const <SheetCustomMetadataField>[
          SheetCustomMetadataField(key: '조성', value: 'F minor'),
        ],
      ),
    ]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(InCSheetApp(controller: controller));
    await tester.pumpAndSettle();

    await tester.longPress(find.text('bulk edit score').last);
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
    expect(find.widgetWithText(ActionChip, '조성'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, '박자'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, '조표'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, '앨범'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, '출처'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, '출처 유형'), findsOneWidget);
    expect(find.text('필드 이름'), findsOneWidget);
    expect(find.text('필드 값'), findsOneWidget);

    await tester.tap(find.widgetWithText(ActionChip, '조성'));
    await tester.pumpAndSettle();
    expect(find.text('이전에 쓴 값'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'F minor'), findsOneWidget);
    await tester.tap(find.widgetWithText(ActionChip, 'F minor'));
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).last, const Offset(0, -500));
    await tester.pumpAndSettle();
    final apply = find.widgetWithText(FilledButton, '적용');
    await tester.tap(apply);
    await tester.pumpAndSettle();

    expect(controller.scoreById('score-1').customFields.single.key, '조성');
    expect(
      controller.scoreById('score-1').customFields.single.value,
      'F minor',
    );
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
    await tester.drag(find.byType(ListView).last, const Offset(0, -500));
    await tester.pumpAndSettle();
    final secondApply = find.widgetWithText(FilledButton, '적용');
    await tester.tap(secondApply);
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

    await tester.longPress(find.text('delete me score').last);
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

    await tester.longPress(find.text('uncollected score').last);
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

    await tester.longPress(find.text('bulk setlist score').last);
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
    expect(find.text('악보 열기 목록이 아니라 제목/작곡가를 보강할 작업입니다.'), findsOneWidget);
    expect(find.text('정보 보강'), findsOneWidget);
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
    expect(find.text('박자'), findsOneWidget);
    expect(find.text('조표'), findsOneWidget);
    expect(find.text('장르'), findsOneWidget);
    expect(find.text('앨범'), findsOneWidget);
    expect(find.text('난이도'), findsOneWidget);
    expect(find.text('편성'), findsOneWidget);
    expect(find.text('출처'), findsOneWidget);
    expect(find.text('출처 유형'), findsOneWidget);
    expect(find.text('연도'), findsOneWidget);
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
      for (final label in [
        '공유용 목록 보기',
        '목록 복사',
        '패키지 내보내기',
        '세트리스트 복제',
        '이름 변경',
        '삭제',
      ]) {
        expect(find.text(label).hitTestable(), findsOneWidget);
      }
      await tester.tap(find.text('공유용 목록 보기'));
      await tester.pumpAndSettle();
      expect(find.text('복사할 내용 미리보기'), findsOneWidget);
      expect(find.textContaining('Clef & Staff 세트리스트'), findsOneWidget);
      expect(find.textContaining('제목: 공연 순서'), findsOneWidget);
      await tester.tap(find.widgetWithText(TextButton, '닫기'));
      await tester.pumpAndSettle();
      await tester.tap(more);
      await tester.pumpAndSettle();
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
      for (final label in [
        '공유용 목록 보기',
        '목록 복사',
        '패키지 내보내기',
        '세트리스트 복제',
        '이름 변경',
        '삭제',
      ]) {
        expect(find.byTooltip(label).hitTestable(), findsOneWidget);
      }
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('setlist package export explains empty package before sharing', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    final now = DateTime(2026, 9, 28, 15);
    final setlist = SheetSetlist(
      id: 'package-recital',
      title: 'Package Recital',
      scoreIds: const <String>[],
      createdAt: now,
      updatedAt: now,
    );
    final store = SheetLibraryStore();
    await store.saveSetlists(<SheetSetlist>[setlist]);
    final controller = SheetLibraryController(store: store);
    await controller.load();

    await tester.pumpWidget(
      MaterialApp(
        home: SheetSetlistDetailScreen(
          controller: controller,
          setlistId: setlist.id,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('패키지 내보내기'));
    await tester.pumpAndSettle();

    expect(find.text('세트리스트 패키지 내보내기'), findsOneWidget);
    expect(find.text('패키지를 만들 수 없습니다'), findsOneWidget);
    expect(find.text('곡 0개'), findsOneWidget);
    expect(find.text('파일 0개'), findsOneWidget);
    expect(find.textContaining('세트리스트에 내보낼 악보가 없습니다'), findsOneWidget);
    expect(find.textContaining('제목: Package Recital'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(find.widgetWithText(FilledButton, '패키지 공유'))
          .onPressed,
      isNull,
    );
    expect(tester.takeException(), isNull);
  });

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
    expect(find.text('현재 PDF 교체'), findsOneWidget);
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

  testWidgets('page picker offers quick jump targets for long scores', (
    tester,
  ) async {
    final requestedPages = <int>[];
    await tester.pumpWidget(
      buildPagePickerSheetForTest(
        pageCount: 120,
        currentPage: 54,
        onGoToPage: requestedPages.add,
      ),
    );

    expect(find.text('빠른 이동'), findsOneWidget);
    expect(find.text('처음'), findsOneWidget);
    expect(find.text('10쪽 전'), findsOneWidget);
    expect(find.text('현재'), findsOneWidget);
    expect(find.text('10쪽 후'), findsOneWidget);
    expect(find.text('끝'), findsOneWidget);

    await tester.tap(find.widgetWithText(ActionChip, '10쪽 전'));
    await tester.pump();
    expect(find.text('현재 54쪽 · 선택 44/120쪽'), findsOneWidget);
    expect(requestedPages, isEmpty);

    await tester.tap(find.widgetWithText(ActionChip, '10쪽 후'));
    await tester.pump();
    expect(find.text('현재 54쪽 · 선택 64/120쪽'), findsOneWidget);

    await tester.tap(find.widgetWithText(ActionChip, '끝'));
    await tester.pump();
    expect(find.text('현재 54쪽 · 선택 120/120쪽'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, '이동'));
    await tester.pump();

    expect(requestedPages, <int>[120]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('page picker exposes bookmark and rehearsal mark targets', (
    tester,
  ) async {
    final requestedPages = <int>[];
    await tester.pumpWidget(
      buildPagePickerSheetForTest(
        pageCount: 80,
        currentPage: 10,
        bookmarks: [
          SheetBookmark(
            pageNumber: 32,
            label: 'Cadenza',
            createdAt: DateTime(2026, 9, 27),
          ),
        ],
        pageSettings: SheetPageSettings(
          hiddenPages: const <int>[],
          pageRotations: const <int, int>{},
          jumpPoints: [
            SheetPageJumpPoint(
              id: 'jump-solo',
              sourcePage: 8,
              targetPage: 12,
              label: 'Solo',
              createdAt: DateTime(2026, 9, 27),
            ),
          ],
          rehearsalMarks: [
            SheetRehearsalMark(
              id: 'mark-a',
              pageNumber: 18,
              label: 'A',
              kind: SheetRehearsalMark.rehearsalKind,
              createdAt: DateTime(2026, 9, 27),
            ),
          ],
        ),
        onGoToPage: requestedPages.add,
      ),
    );

    expect(find.text('표시 지점 3개'), findsOneWidget);
    expect(find.text('점프 1 · 북마크 1 · 리허설 1'), findsOneWidget);
    expect(find.text('점프 · Solo · 12쪽'), findsWidgets);
    expect(find.text('북마크 · Cadenza · 32쪽'), findsWidgets);
    expect(find.text('리허설 · A · 18쪽'), findsWidgets);
    expect(find.text('12쪽으로 선택'), findsOneWidget);
    expect(find.text('18쪽으로 선택'), findsOneWidget);

    await tester.tap(find.widgetWithText(ListTile, '점프 · Solo · 12쪽'));
    await tester.pump();
    expect(find.text('현재 10쪽 · 선택 12/80쪽'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, '이동'));
    await tester.pump();

    expect(requestedPages, <int>[12]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('quick jump overflow labels named target types', (tester) async {
    final jumps = <SheetPageJumpPoint>[];
    final pages = <int>[];
    final createdAt = DateTime(2026, 9, 28);

    await tester.pumpWidget(
      buildQuickJumpButtonsForTest(
        jumpPoints: [
          SheetPageJumpPoint(
            id: 'jump-a',
            sourcePage: 2,
            targetPage: 4,
            label: 'To A',
            createdAt: createdAt,
          ),
          SheetPageJumpPoint(
            id: 'jump-b',
            sourcePage: 6,
            targetPage: 8,
            label: 'To B',
            createdAt: createdAt,
          ),
          SheetPageJumpPoint(
            id: 'jump-c',
            sourcePage: 10,
            targetPage: 12,
            label: 'To C',
            createdAt: createdAt,
          ),
        ],
        rehearsalMarks: [
          SheetRehearsalMark(
            id: 'mark-a',
            pageNumber: 18,
            label: 'A',
            kind: SheetRehearsalMark.rehearsalKind,
            createdAt: createdAt,
          ),
        ],
        bookmarks: [
          SheetBookmark(pageNumber: 32, label: 'Cadenza', createdAt: createdAt),
        ],
        onJump: jumps.add,
        onPageSelected: pages.add,
      ),
    );

    await tester.tap(find.text('+3'));
    await tester.pumpAndSettle();

    expect(find.text('점프 · To C · 12쪽'), findsOneWidget);
    expect(find.text('리허설 · A · 18쪽'), findsOneWidget);
    expect(find.text('북마크 · Cadenza · 32쪽'), findsOneWidget);

    await tester.tap(find.text('북마크 · Cadenza · 32쪽'));
    await tester.pumpAndSettle();

    expect(jumps, isEmpty);
    expect(pages, <int>[32]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('crop settings sheet offers quick margin presets', (
    tester,
  ) async {
    await tester.pumpWidget(buildCropSettingsSheetForTest());

    expect(find.text('빠른 여백 자르기'), findsOneWidget);
    expect(find.text('좁게 3%'), findsOneWidget);
    expect(find.text('보통 6%'), findsOneWidget);
    expect(find.text('강하게 10%'), findsOneWidget);

    await tester.tap(find.text('보통 6%'));
    await tester.pump();

    expect(find.text('6%'), findsNWidgets(4));
    expect(tester.takeException(), isNull);
  });

  testWidgets('crop settings sheet can apply detected PDF crop box', (
    tester,
  ) async {
    await tester.pumpWidget(
      buildCropSettingsSheetForTest(
        detectedCrop: const SheetCropSettings(
          left: 0.04,
          top: 0.08,
          right: 0.06,
          bottom: 0.10,
        ),
      ),
    );

    expect(find.text('PDF 여백 감지값'), findsOneWidget);
    expect(find.textContaining('감지값 적용'), findsOneWidget);
    expect(find.text('PDF에 저장된 CropBox 기준입니다.'), findsOneWidget);

    await tester.tap(find.textContaining('감지값 적용'));
    await tester.pump();

    expect(find.text('4%'), findsAtLeastNWidgets(1));
    expect(find.text('6%'), findsAtLeastNWidgets(1));
    expect(find.text('8%'), findsAtLeastNWidgets(1));
    expect(find.text('10%'), findsAtLeastNWidgets(1));
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

    expect(find.text('스탬프 선택'), findsWidgets);
    expect(find.text('빠른 선택'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'OK'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'CUE'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, '!'), findsOneWidget);
    expect(find.text('사용자 스탬프'), findsOneWidget);
    expect(find.text('추가된 사용자 스탬프가 없습니다.'), findsOneWidget);
    expect(find.text('텍스트 스탬프 추가'), findsOneWidget);
    expect(find.widgetWithText(ChoiceChip, '전체'), findsOneWidget);
    expect(find.widgetWithText(ChoiceChip, '리허설 표시'), findsOneWidget);
    expect(find.widgetWithText(ChoiceChip, '반복/마침'), findsOneWidget);
    expect(find.widgetWithText(ChoiceChip, '템포 변화'), findsOneWidget);
    expect(find.text('리허설 표시'), findsWidgets);
    expect(find.text('OK'), findsWidgets);

    await tester.tap(find.widgetWithText(ChoiceChip, '템포 변화'));
    await tester.pumpAndSettle();

    expect(find.text('rit.'), findsAtLeastNWidgets(1));
    expect(find.text('Fine'), findsNothing);

    await tester.tap(find.widgetWithText(ChoiceChip, '전체'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), '반복');
    await tester.pumpAndSettle();

    expect(find.text('반복/마침'), findsWidgets);
    expect(find.text('Fine'), findsOneWidget);
    expect(find.text('D.C.'), findsAtLeastNWidgets(1));

    await tester.enterText(find.byType(TextField), '템포');
    await tester.pumpAndSettle();

    expect(find.text('템포 변화'), findsWidgets);
    expect(find.text('rit.'), findsAtLeastNWidgets(1));
    expect(find.text('Fine'), findsNothing);

    await tester.tap(find.widgetWithText(ActionChip, 'CUE'));
    await tester.pumpAndSettle();

    expect(find.byTooltip('스탬프 선택'), findsOneWidget);
    expect(find.text('빠른 선택'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('annotation stamp picker creates and deletes user stamps', (
    tester,
  ) async {
    final userPack = SheetAnnotationStampPack.fromJson(<String, Object?>{
      'id': 'user',
      'name': '사용자 스탬프',
      'createdAt': '2026-10-02T10:00:00.000',
      'updatedAt': '2026-10-02T10:00:00.000',
      'stamps': const <Map<String, Object?>>[
        <String, Object?>{
          'id': 'bow-cue',
          'packId': 'user',
          'label': 'Bow cue',
          'category': '사용자',
          'kind': 'text',
          'text': 'BOW',
        },
      ],
    });
    var currentPacks = <SheetAnnotationStampPack>[];
    var didCreate = false;
    await tester.pumpWidget(
      buildAnnotationToolbarForTest(
        userStampPacks: currentPacks,
        onCreateUserStamp: (_, _) async {
          didCreate = true;
          currentPacks = <SheetAnnotationStampPack>[userPack];
          return currentPacks;
        },
        onDeleteUserStamp: (_, _) async {
          currentPacks = const <SheetAnnotationStampPack>[];
          return currentPacks;
        },
      ),
    );

    await tester.scrollUntilVisible(
      find.byTooltip('스탬프 선택'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byTooltip('스탬프 선택'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('텍스트 스탬프 추가'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '이름'), 'Bow cue');
    await tester.pump();
    await tester.enterText(find.widgetWithText(TextField, '악보에 찍을 글자'), 'BOW');
    await tester.pump();
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    expect(didCreate, isTrue);
    expect(find.text('Bow cue'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.close).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('삭제'));
    await tester.pumpAndSettle();

    expect(find.text('추가된 사용자 스탬프가 없습니다.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('annotation stamp picker selects a user text stamp', (
    tester,
  ) async {
    final userPack = SheetAnnotationStampPack.fromJson(<String, Object?>{
      'id': 'user',
      'name': '사용자 스탬프',
      'createdAt': '2026-10-02T10:00:00.000',
      'updatedAt': '2026-10-02T10:00:00.000',
      'stamps': const <Map<String, Object?>>[
        <String, Object?>{
          'id': 'bow-cue',
          'packId': 'user',
          'label': 'Bow cue',
          'category': '사용자',
          'kind': 'text',
          'text': 'BOW',
        },
      ],
    });
    await tester.pumpWidget(
      buildAnnotationToolbarForTest(
        userStampPacks: <SheetAnnotationStampPack>[userPack],
      ),
    );

    await tester.scrollUntilVisible(
      find.byTooltip('스탬프 선택'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byTooltip('스탬프 선택'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Bow cue'));
    await tester.pumpAndSettle();

    expect(find.byTooltip('스탬프 선택'), findsOneWidget);
    expect(find.text('Bow cue'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'annotation stamp picker filters user stamps by search and category',
    (tester) async {
      final userPack = SheetAnnotationStampPack.fromJson(<String, Object?>{
        'id': 'user',
        'name': '사용자 스탬프',
        'createdAt': '2026-10-02T10:00:00.000',
        'updatedAt': '2026-10-02T10:00:00.000',
        'stamps': const <Map<String, Object?>>[
          <String, Object?>{
            'id': 'bow-cue',
            'packId': 'user',
            'label': 'Bow cue',
            'category': '개인 표시',
            'kind': 'text',
            'text': 'BOW',
          },
          <String, Object?>{
            'id': 'repeat-cue',
            'packId': 'user',
            'label': 'Repeat cue',
            'category': '사용자',
            'kind': 'icon',
            'iconName': 'repeat',
          },
          <String, Object?>{
            'id': 'breath-cue',
            'packId': 'user',
            'label': '숨표',
            'category': '한글 표시',
            'kind': 'text',
            'text': '숨',
          },
        ],
      });
      await tester.pumpWidget(
        buildAnnotationToolbarForTest(
          userStampPacks: <SheetAnnotationStampPack>[userPack],
        ),
      );

      await tester.scrollUntilVisible(
        find.byTooltip('스탬프 선택'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byTooltip('스탬프 선택'));
      await tester.pumpAndSettle();

      expect(find.text('Bow cue'), findsOneWidget);
      expect(find.text('Repeat cue'), findsOneWidget);
      expect(find.text('숨표'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'bow');
      await tester.pumpAndSettle();

      expect(find.text('Bow cue'), findsOneWidget);
      expect(find.text('Repeat cue'), findsNothing);
      expect(find.text('숨표'), findsNothing);

      await tester.enterText(find.byType(TextField), '');
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ChoiceChip, '개인 표시'));
      await tester.pumpAndSettle();

      expect(find.text('Bow cue'), findsOneWidget);
      expect(find.text('Repeat cue'), findsNothing);
      expect(find.text('숨표'), findsNothing);

      await tester.ensureVisible(find.widgetWithText(ChoiceChip, '한글 표시'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ChoiceChip, '한글 표시'));
      await tester.pumpAndSettle();

      expect(find.text('Bow cue'), findsNothing);
      expect(find.text('Repeat cue'), findsNothing);
      expect(find.text('숨표'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('annotation stamp picker summarizes near-limit user stamps', (
    tester,
  ) async {
    final targetIndex = SheetAnnotationStampPack.maxStampCount - 1;
    final userPack = SheetAnnotationStampPack.fromJson(<String, Object?>{
      'id': 'large-user-pack',
      'name': 'Large user pack',
      'createdAt': '2026-10-02T10:00:00.000',
      'updatedAt': '2026-10-02T10:00:00.000',
      'stamps': List<Map<String, Object?>>.generate(
        SheetAnnotationStampPack.maxStampCount,
        (index) => <String, Object?>{
          'id': 'stamp-$index',
          'packId': 'large-user-pack',
          'label': index == targetIndex ? 'Target $index' : 'Bulk $index',
          'category': index == targetIndex ? 'Target Category' : 'Bulk',
          'kind': 'text',
          'text': index == targetIndex ? 'TARGET' : 'B$index',
        },
      ),
    });
    await tester.pumpWidget(
      buildAnnotationToolbarForTest(
        userStampPacks: <SheetAnnotationStampPack>[userPack],
      ),
    );

    await tester.scrollUntilVisible(
      find.byTooltip('스탬프 선택'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byTooltip('스탬프 선택'));
    await tester.pumpAndSettle();

    expect(find.text('Bulk 0'), findsOneWidget);
    expect(find.text('Target $targetIndex'), findsNothing);
    expect(find.textContaining('122개 더 있습니다.'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'target');
    await tester.pumpAndSettle();

    expect(find.text('Bulk 0'), findsNothing);
    expect(find.text('Target $targetIndex'), findsOneWidget);
    expect(find.textContaining('122개 더 있습니다.'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('annotation stamp picker creates and selects user icon stamps', (
    tester,
  ) async {
    final iconPack = SheetAnnotationStampPack.fromJson(<String, Object?>{
      'id': 'user',
      'name': '사용자 스탬프',
      'createdAt': '2026-10-02T10:00:00.000',
      'updatedAt': '2026-10-02T10:00:00.000',
      'stamps': const <Map<String, Object?>>[
        <String, Object?>{
          'id': 'repeat-cue',
          'packId': 'user',
          'label': 'Repeat cue',
          'category': '사용자',
          'kind': 'icon',
          'iconName': 'repeat',
        },
      ],
    });
    var currentPacks = <SheetAnnotationStampPack>[];
    await tester.pumpWidget(
      buildAnnotationToolbarForTest(
        userStampPacks: currentPacks,
        onCreateIconUserStamp: (_, _) async {
          currentPacks = <SheetAnnotationStampPack>[iconPack];
          return currentPacks;
        },
      ),
    );

    await tester.scrollUntilVisible(
      find.byTooltip('스탬프 선택'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.byTooltip('스탬프 선택'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('아이콘 스탬프 추가'));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, '이름'), 'Repeat cue');
    await tester.pump();
    await tester.tap(find.widgetWithText(ChoiceChip, '반복'));
    await tester.pump();
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    expect(find.text('Repeat cue'), findsOneWidget);

    await tester.tap(find.text('Repeat cue'));
    await tester.pumpAndSettle();

    expect(find.byTooltip('스탬프 선택'), findsOneWidget);
    expect(find.text('Repeat cue'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'annotation stamp picker restores recent stamps without duplicates',
    (tester) async {
      await tester.pumpWidget(
        buildAnnotationToolbarForTest(
          recentStampNames: const <String>['fine', 'unknown', 'cue', 'rit'],
        ),
      );

      await tester.scrollUntilVisible(
        find.byTooltip('스탬프 선택'),
        220,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byTooltip('스탬프 선택'));
      await tester.pumpAndSettle();

      expect(find.text('최근 사용'), findsOneWidget);
      expect(find.text('빠른 선택'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'Fine'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'CUE'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'rit.'), findsOneWidget);
      expect(find.widgetWithText(ActionChip, 'OK'), findsOneWidget);
      expect(find.text('unknown'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('linked audio sheet sends A-B loop points to player', (
    tester,
  ) async {
    final channel = const MethodChannel('clef/test_linked_audio_loop');
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    await tester.pumpWidget(
      buildLinkedAudioPlayerSheetForTest(channel: channel),
    );

    await tester.tap(find.widgetWithText(SwitchListTile, 'A-B 반복'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), '1.5');
    await tester.enterText(find.byType(TextField).at(1), '8.2');
    await tester.tap(find.widgetWithText(FilledButton, '재생'));
    await tester.pumpAndSettle();

    expect(calls.single.method, 'play');
    expect(calls.single.arguments, <String, Object?>{
      'path': '/tmp/backing-track.m4a',
      'loopStartMs': 1500,
      'loopEndMs': 8200,
    });
    expect(tester.takeException(), isNull);
  });

  testWidgets('linked audio sheet preloads and saves A-B loop markers', (
    tester,
  ) async {
    final channel = const MethodChannel('clef/test_linked_audio_saved_loop');
    final calls = <MethodCall>[];
    final savedFiles = <SheetLinkedFile>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    await tester.pumpWidget(
      buildLinkedAudioPlayerSheetForTest(
        channel: channel,
        linkedFile: SheetLinkedFile(
          path: '/tmp/backing-track.m4a',
          type: 'm4a',
          label: 'Backing Track',
          createdAt: DateTime(2026, 9, 26),
          audioLoopStartMs: 2000,
          audioLoopEndMs: 9000,
        ),
        onLinkedFileChanged: (linkedFile) async {
          savedFiles.add(linkedFile);
          return true;
        },
      ),
    );

    expect(find.widgetWithText(SwitchListTile, 'A-B 반복'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    expect(find.text('9'), findsOneWidget);
    expect(find.text('저장된 구간 · A 2초 -> B 9초'), findsOneWidget);

    await tester.enterText(find.byType(TextField).at(0), '3.5');
    await tester.enterText(find.byType(TextField).at(1), '10');
    await tester.pumpAndSettle();

    expect(find.text('새 구간 · A 3.5초 -> B 10초'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, '재생'));
    await tester.pumpAndSettle();

    expect(find.text('저장된 구간 · A 3.5초 -> B 10초'), findsOneWidget);
    expect(savedFiles.single.audioLoopStartMs, 3500);
    expect(savedFiles.single.audioLoopEndMs, 10000);
    expect(calls.single.arguments, <String, Object?>{
      'path': '/tmp/backing-track.m4a',
      'loopStartMs': 3500,
      'loopEndMs': 10000,
    });
    expect(tester.takeException(), isNull);
  });

  testWidgets('linked audio sheet clears saved A-B loop markers', (
    tester,
  ) async {
    final channel = const MethodChannel('clef/test_linked_audio_clear_loop');
    final calls = <MethodCall>[];
    final savedFiles = <SheetLinkedFile>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    await tester.pumpWidget(
      buildLinkedAudioPlayerSheetForTest(
        channel: channel,
        linkedFile: SheetLinkedFile(
          path: '/tmp/backing-track.m4a',
          type: 'm4a',
          label: 'Backing Track',
          createdAt: DateTime(2026, 9, 26),
          audioLoopStartMs: 2000,
          audioLoopEndMs: 9000,
        ),
        onLinkedFileChanged: (linkedFile) async {
          savedFiles.add(linkedFile);
          return true;
        },
      ),
    );

    expect(find.text('2'), findsOneWidget);
    expect(find.text('9'), findsOneWidget);

    await tester.tap(find.widgetWithText(TextButton, '구간 지우기'));
    await tester.pumpAndSettle();

    expect(savedFiles.single.audioLoopStartMs, isNull);
    expect(savedFiles.single.audioLoopEndMs, isNull);
    expect(calls, isEmpty);
    expect(find.text('2'), findsNothing);
    expect(find.text('9'), findsNothing);
    expect(find.text('저장된 구간 · A 2초 -> B 9초'), findsNothing);
    expect(find.widgetWithText(SwitchListTile, 'A-B 반복'), findsOneWidget);
    final loopSwitch = tester.widget<SwitchListTile>(
      find.widgetWithText(SwitchListTile, 'A-B 반복'),
    );
    expect(loopSwitch.value, isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('linked audio sheet keeps saved loop when clear save fails', (
    tester,
  ) async {
    final channel = const MethodChannel('clef/test_linked_audio_clear_failure');
    final calls = <MethodCall>[];
    final savedFiles = <SheetLinkedFile>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    await tester.pumpWidget(
      buildLinkedAudioPlayerSheetForTest(
        channel: channel,
        linkedFile: SheetLinkedFile(
          path: '/tmp/backing-track.m4a',
          type: 'm4a',
          label: 'Backing Track',
          createdAt: DateTime(2026, 9, 26),
          audioLoopStartMs: 2000,
          audioLoopEndMs: 9000,
        ),
        onLinkedFileChanged: (linkedFile) async {
          savedFiles.add(linkedFile);
          return false;
        },
      ),
    );

    await tester.tap(find.widgetWithText(TextButton, '구간 지우기'));
    await tester.pumpAndSettle();

    expect(savedFiles.single.audioLoopStartMs, isNull);
    expect(savedFiles.single.audioLoopEndMs, isNull);
    expect(calls, isEmpty);
    expect(find.text('2'), findsOneWidget);
    expect(find.text('9'), findsOneWidget);
    expect(find.text('저장된 구간 · A 2초 -> B 9초'), findsOneWidget);
    expect(find.text('A-B 반복 구간을 지우지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
    final loopSwitch = tester.widget<SwitchListTile>(
      find.widgetWithText(SwitchListTile, 'A-B 반복'),
    );
    expect(loopSwitch.value, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('linked audio sheet explains invalid A-B loop input', (
    tester,
  ) async {
    final channel = const MethodChannel('clef/test_linked_audio_invalid_loop');
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    await tester.pumpWidget(
      buildLinkedAudioPlayerSheetForTest(channel: channel),
    );

    await tester.tap(find.widgetWithText(SwitchListTile, 'A-B 반복'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), 'intro');
    await tester.enterText(find.byType(TextField).at(1), '8');
    await tester.tap(find.widgetWithText(FilledButton, '재생'));
    await tester.pumpAndSettle();

    expect(calls, isEmpty);
    expect(find.text('A-B 반복 구간은 초 단위 숫자로 입력해주세요.'), findsOneWidget);

    await tester.enterText(find.byType(TextField).at(0), '9');
    await tester.enterText(find.byType(TextField).at(1), '8');
    await tester.tap(find.widgetWithText(FilledButton, '재생'));
    await tester.pumpAndSettle();

    expect(calls, isEmpty);
    expect(find.text('B 끝은 A 시작보다 커야 합니다.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('linked files editor labels audio image and pdf attachments', (
    tester,
  ) async {
    await tester.pumpWidget(
      buildLinkedFilesEditorForTest([
        SheetLinkedFile(
          path: '/tmp/part.pdf',
          type: 'pdf',
          label: 'Trumpet Part',
          role: SheetLinkedFile.partRole,
          createdAt: DateTime(2026, 9, 27),
        ),
        SheetLinkedFile(
          path: '/tmp/backing.m4a',
          type: 'm4a',
          label: 'Backing Track',
          role: SheetLinkedFile.referenceRole,
          createdAt: DateTime(2026, 9, 27),
          audioLoopStartMs: 1500,
          audioLoopEndMs: 8250,
        ),
        SheetLinkedFile(
          path: '/tmp/cover.png',
          type: 'png',
          label: 'Cover Scan',
          role: SheetLinkedFile.referenceRole,
          createdAt: DateTime(2026, 9, 27),
        ),
      ]),
    );

    expect(find.text('Trumpet Part'), findsOneWidget);
    expect(find.textContaining('Part · PDF · /tmp/part.pdf'), findsOneWidget);
    expect(find.text('Backing Track'), findsOneWidget);
    expect(
      find.textContaining('Reference · 오디오 · A-B 1.5-8.25초 · /tmp/backing.m4a'),
      findsOneWidget,
    );
    expect(find.text('Cover Scan'), findsOneWidget);
    expect(
      find.textContaining('Reference · 이미지 · /tmp/cover.png'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('linked audio sheet blocks playback when loop save fails', (
    tester,
  ) async {
    final channel = const MethodChannel('clef/test_linked_audio_save_failure');
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    await tester.pumpWidget(
      buildLinkedAudioPlayerSheetForTest(
        channel: channel,
        onLinkedFileChanged: (_) async => false,
      ),
    );

    await tester.tap(find.widgetWithText(SwitchListTile, 'A-B 반복'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), '1');
    await tester.enterText(find.byType(TextField).at(1), '4');
    await tester.tap(find.widgetWithText(FilledButton, '재생'));
    await tester.pumpAndSettle();

    expect(calls, isEmpty);
    expect(find.text('A-B 반복 구간을 저장하지 못했습니다. 다시 시도해주세요.'), findsOneWidget);
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

class _SmokeChordProStore extends SheetLibraryStore {
  SheetImportedFile? pickedChordProFile;

  @override
  Future<SheetImportedFile?> pickChordProFile() async {
    return pickedChordProFile;
  }

  @override
  Future<SheetScore> importChordProText({
    required String source,
    required SheetChordProScoreDraft draft,
    DateTime? importedAt,
  }) async {
    final now = importedAt ?? DateTime(2026, 9, 28, 17);
    return SheetScore(
      id: 'smoke-chordpro',
      title: draft.title,
      composer: draft.composer,
      tags: draft.tags,
      note: draft.subtitle,
      filePath: '/text/${draft.title}.chordpro',
      importedAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      lastPage: 1,
      isFavorite: false,
      bookmarks: const <SheetBookmark>[],
      customFields: [
        for (final entry in draft.customFields.entries)
          SheetCustomMetadataField(key: entry.key, value: entry.value),
      ],
    );
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
  Future<String?> pickMetadataBackupJson() async {
    return SheetLibraryBackupCodec.encode(
      SheetLibraryBackup.fromState(
        scores: const <SheetScore>[],
        setlists: const <SheetSetlist>[],
        metronomeSettings: SheetMetronomeSettings.defaultSettings,
        tunerSettings: SheetTunerSettings.defaultSettings,
        toneSettings: SheetToneSettings.defaultSettings,
        libraryViewSettings: SheetLibraryViewSettings.defaultSettings,
      ),
    );
  }

  @override
  Future<SheetLibraryBackupRestoreResult> restoreMetadataBackupJson(
    String value,
  ) => _restore();

  @override
  Future<SheetLibraryBackupRestoreResult> restoreAutomaticMetadataBackup() =>
      _restore();

  @override
  Future<SheetLibraryBackupRestoreResult> importFullBackup() => _restore();

  @override
  Future<Uint8List?> pickFullBackupZipBytes() async {
    return await exportFullBackupZipBytes();
  }

  @override
  Future<SheetLibraryBackupRestoreResult> restoreFullBackupZipBytes(
    List<int> bytes,
  ) => _restore();
}

class _MetadataPreviewStore extends SheetLibraryStore {
  String? backupJson;

  @override
  Future<String?> pickMetadataBackupJson() async {
    return backupJson;
  }
}

class _BackupHealthController extends SheetLibraryController {
  _BackupHealthController(this.health) : super(store: SheetLibraryStore());

  final SheetLibraryBackupHealth health;

  @override
  Future<SheetLibraryBackupHealth> loadBackupHealth() async {
    return health;
  }
}

class _PartialBackupStore extends SheetLibraryStore {
  @override
  Future<SheetLibraryBackupRestoreResult> importFullBackup() async {
    return _fullBackupResult();
  }

  @override
  Future<Uint8List?> pickFullBackupZipBytes() async {
    return await exportFullBackupZipBytes();
  }

  @override
  Future<SheetLibraryBackupRestoreResult> restoreFullBackupZipBytes(
    List<int> bytes,
  ) async {
    return _fullBackupResult();
  }

  SheetLibraryBackupRestoreResult _fullBackupResult() {
    return const SheetLibraryBackupRestoreResult(
      status: SheetLibraryBackupRestoreStatus.restored,
      restoredScoreCount: 3,
      restoredSetlistCount: 1,
      missingFileCount: 2,
    );
  }
}
