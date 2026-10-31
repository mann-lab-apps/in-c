import 'dart:async';
import 'dart:io';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';

import 'adoption_pilot_test.dart' as pilot;

class GlobalSettingsStore extends SheetLibraryStore {
  Completer<void>? gate;
  bool fail = false;
  int writes = 0;

  @override
  Future<void> saveGlobalViewerSettings(SheetViewerSettings settings) async {
    writes++;
    await gate?.future;
    if (fail) {
      throw const FileSystemException('fixture defaults save failure');
    }
    await super.saveGlobalViewerSettings(settings);
  }
}

class DefaultsImportStore extends SheetLibraryStore {
  late SheetScore template;
  SheetScore imported(String id) =>
      SheetScore.fromJson({...template.toJson(), 'id': id});
  @override
  Future<SheetScore?> importPdf() async => imported('new-pdf');
  @override
  Future<SheetScore?> importImagesAsPdf() async => imported('new-images');
  @override
  Future<SheetScore> importPdfFile(File file, {String? fileName}) async =>
      imported('new-shared');
}

Future<void> openDefaults(WidgetTester t) async {
  await t.tap(find.byTooltip('전역 보기/입력 기본값'));
  await t.pumpAndSettle();
}

Future<void> action(WidgetTester t, String label) async {
  final target = find.descendant(
    of: find.byType(BottomSheet),
    matching: find.text(label),
  );
  await t.ensureVisible(target);
  await t.pumpAndSettle();
  await t.tap(target);
  await t.pumpAndSettle();
}

void main() {
  testWidgets(
    'global choice values persist and reselecting does not clear them',
    (t) async {
      final c = await pilot.library();
      addTearDown(c.dispose);
      await c.updateGlobalViewerSettings(
        c.globalViewerSettings.copyWith(
          displayEffect: 'sepia',
          renderProfile: 'largePdf',
          allowPerformanceMenus: true,
        ),
      );
      final originalScores = c.scores.map((s) => s.toJson()).toList();
      await pilot.mount(t, c, accent: 'blue');
      await openDefaults(t);
      Future<void> choice(String row, String label) async {
        final target = find.descendant(
          of: find.ancestor(
            of: find.text(row),
            matching: find.byType(DdiroriSettingsRow),
          ),
          matching: find.widgetWithText(FilterChip, label),
        );
        await t.ensureVisible(target);
        await t.pumpAndSettle();
        await t.tap(target);
        await t.pumpAndSettle();
      }

      await choice('보기 모드', '2페이지');
      await choice('보기 모드', '2페이지');
      await choice('페이지 맞춤', '폭 맞춤');
      await choice('페이지 맞춤', '폭 맞춤');
      await choice('페달 매핑', '직접 설정');
      await choice('오른쪽 화살표', '이전 페이지');
      await choice('오른쪽 화살표', '이전 페이지');
      await action(t, '저장');
      final expected = c.globalViewerSettings.toJson();
      expect(c.globalViewerSettings.displayMode, 'twoPage');
      expect(c.globalViewerSettings.pageScale, 'fitWidth');
      expect(
        c.globalViewerSettings.customPedalMapping['ArrowRight'],
        'previousPage',
      );
      expect(c.globalViewerSettings.displayEffect, 'sepia');
      expect(c.globalViewerSettings.renderProfile, 'largePdf');
      expect(c.globalViewerSettings.allowPerformanceMenus, isTrue);
      expect(c.scores.map((s) => s.toJson()).toList(), originalScores);
      await c.load();
      expect(c.globalViewerSettings.toJson(), expected);
      await openDefaults(t);
      final twoPage = find.widgetWithText(FilterChip, '2페이지');
      await t.ensureVisible(twoPage);
      await t.pumpAndSettle();
      expect(t.widget<FilterChip>(twoPage).selected, isTrue);
      await action(t, '취소');
      expect(t.takeException(), isNull);
    },
  );

  for (final route in ['pdf', 'images', 'shared']) {
    test(
      'new $route import receives defaults without changing existing scores',
      () async {
        final store = DefaultsImportStore();
        final c = await pilot.library(store: store);
        addTearDown(c.dispose);
        store.template = c.scores.first;
        final existing = c.scores.map((s) => s.toJson()).toList();
        final defaults = c.globalViewerSettings.copyWith(
          displayMode: 'twoPage',
          pageScale: 'fitWidth',
          pedalMapping: 'custom',
          customPedalMapping: {
            ...SheetViewerSettings.defaultCustomPedalMapping,
            'ArrowRight': 'previousPage',
          },
        );
        await c.updateGlobalViewerSettings(defaults);
        final SheetScore? imported;
        switch (route) {
          case 'pdf':
            imported = await c.importPdf();
          case 'images':
            imported = await c.importImagesAsPdf();
          default:
            imported = (await c.importSharedPdfFiles([
              const SheetSharedImportFile(
                path: '/fixture/new.pdf',
                name: 'new.pdf',
              ),
            ])).single;
        }
        expect(imported, isNotNull);
        expect(imported!.viewerSettings.toJson(), defaults.toJson());
        expect(
          c.scores
              .where((s) => s.id.startsWith('pilot-'))
              .map((s) => s.toJson())
              .toList(),
          existing,
        );
        await c.load();
        expect(
          c.scoreById(imported.id).viewerSettings.toJson(),
          defaults.toJson(),
        );
        expect(
          c.scores
              .where((s) => s.id.startsWith('pilot-'))
              .map((s) => s.toJson())
              .toList(),
          existing,
        );
      },
    );
  }

  for (final fail in [false, true]) {
    testWidgets(
      'global defaults wait for save and retain failed draft: $fail',
      (t) async {
        final store = GlobalSettingsStore();
        final c = await pilot.library(store: store);
        addTearDown(c.dispose);
        final original = c.globalViewerSettings.toJson();
        final scores = c.scores.map((s) => s.toJson()).toList();
        await pilot.mount(t, c, accent: 'blue');
        await openDefaults(t);
        await t.ensureVisible(find.byType(Switch).first);
        await t.pumpAndSettle();
        await t.tap(find.byType(Switch).first);
        await t.pumpAndSettle();
        expect(c.globalViewerSettings.toJson(), original);
        store.gate = Completer<void>();
        store.fail = fail;
        await action(t, '저장');
        expect(store.writes, 1);
        expect(find.byType(BottomSheet), findsOneWidget);
        expect(c.globalViewerSettings.toJson(), original);
        expect(find.text('저장 중'), findsOneWidget);
        await t.binding.handlePopRoute();
        await t.pumpAndSettle();
        expect(find.byType(BottomSheet), findsOneWidget);
        store.gate!.complete();
        await t.pumpAndSettle();
        if (fail) {
          expect(find.byType(BottomSheet), findsOneWidget);
          expect(c.globalViewerSettings.toJson(), original);
          expect((await store.loadGlobalViewerSettings()).toJson(), original);
          expect(t.widget<Switch>(find.byType(Switch).first).value, isTrue);
          expect(find.textContaining('저장하지 못했습니다'), findsOneWidget);
          store.fail = false;
          store.gate = null;
          await action(t, '다시 시도');
          expect(store.writes, 2);
        }
        expect(find.byType(BottomSheet), findsNothing);
        expect(c.globalViewerSettings.halfPageTurn, isTrue);
        expect((await store.loadGlobalViewerSettings()).halfPageTurn, isTrue);
        expect(c.scores.map((s) => s.toJson()).toList(), scores);
        await openDefaults(t);
        expect(t.widget<Switch>(find.byType(Switch).first).value, isTrue);
        expect(t.takeException(), isNull);
      },
    );
  }

  for (final viewport in <({double width, double height, bool dark})>[
    (width: 390, height: 1000, dark: false),
    (width: 840, height: 1000, dark: true),
    (width: 840, height: 390, dark: false),
  ]) {
    testWidgets(
      'global defaults cancel keeps every original field at $viewport',
      (t) async {
        final c = await pilot.library();
        addTearDown(c.dispose);
        await c.updateGlobalViewerSettings(
          c.globalViewerSettings.copyWith(
            pedalMapping: SheetViewerSettings.customPedalMappingType,
            customPedalMapping: {'ArrowRight': 'previousPage'},
            displayEffect: 'sepia',
            renderProfile: 'largePdf',
            allowPerformanceAnnotations: false,
          ),
        );
        final original = c.globalViewerSettings.toJson();
        final persistedOriginal = (await c.store.loadGlobalViewerSettings())
            .toJson();
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
        await openDefaults(t);
        expect(find.byType(DdiroriSection), findsWidgets);
        await t.ensureVisible(find.byType(Switch).first);
        await t.pumpAndSettle();
        await t.tap(find.byType(Switch).first);
        await t.pumpAndSettle();
        await action(t, '취소');
        expect(c.globalViewerSettings.toJson(), original);
        expect(
          (await c.store.loadGlobalViewerSettings()).toJson(),
          persistedOriginal,
        );
        expect(find.byType(BottomSheet), findsNothing);
        expect(t.takeException(), isNull);
      },
    );
  }
}
