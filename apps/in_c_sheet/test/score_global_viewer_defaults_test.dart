import 'dart:async';
import 'dart:io';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';

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
