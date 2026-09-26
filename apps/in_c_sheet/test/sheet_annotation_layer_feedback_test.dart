import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _failureNotice = '필기 변경사항을 저장하지 못했습니다. 저장 상태를 확인해주세요.';

void main() {
  for (final export in [false, true]) {
    for (final exit in [
      'stay',
      'closed',
      'covered',
      'profile',
      'newer-success',
      'newer-failure',
    ]) {
      for (final fails in [false, true]) {
        testWidgets('layer export=$export exit=$exit fails=$fails', (
          tester,
        ) async {
          SharedPreferences.setMockInitialValues({});
          tester.view.physicalSize = const Size(1600, 1000);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final now = DateTime(2026, 9, 15);
          final store = _LayerStore();
          await store.saveScores([
            SheetScore(
              id: 'score',
              title: 'Concert',
              composer: '',
              tags: const [],
              note: '',
              filePath: '/tmp/clef-missing-layer-fixture.pdf',
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
          final sourceId = controller.activeLibraryProfile.id;
          final originalScore = controller.scores.single;
          final original = controller.scores.single.toJson();
          await tester.runAsync(() async {
            await tester.pumpWidget(
              MaterialApp(
                home: SheetViewerScreen(
                  controller: controller,
                  scoreId: 'score',
                ),
              ),
            );
            await Future<void>.delayed(const Duration(milliseconds: 50));
          });
          await tester.pumpAndSettle();
          await tester.tap(find.byTooltip('필기 모드'));
          await tester.pumpAndSettle();
          final tooltip = export ? 'PDF 공유/인쇄에서 필기 제외' : '필기 layer 숨기기';
          final success = export ? '필기를 PDF 공유/인쇄에서 제외합니다.' : '필기 layer를 숨깁니다.';
          final button = find.byTooltip(tooltip).last;
          await tester.ensureVisible(button);
          store.pending = Completer<void>();
          final firstPending = store.pending!;
          await tester.tap(button);
          await tester.pumpAndSettle();
          expect(find.text(success), findsNothing);
          if (exit == 'closed') {
            await tester.pumpWidget(const SizedBox());
          } else if (exit == 'covered') {
            unawaited(
              Navigator.of(tester.element(find.byType(SheetViewerScreen)))
                  .push<void>(
                    MaterialPageRoute(
                      builder: (_) => const Scaffold(body: Text('Other route')),
                    ),
                  ),
            );
            await tester.pumpAndSettle();
          } else if (exit == 'profile') {
            final pending = store.pending;
            store.pending = null;
            await controller.createLibraryProfile('Other library');
            await store.saveScores([originalScore]);
            await controller.load();
            store.pending = pending;
            await tester.pumpAndSettle();
          } else if (exit.startsWith('newer')) {
            store.pending = Completer<void>();
            final nextButton = find
                .byTooltip(export ? 'PDF 공유/인쇄에 필기 포함' : '필기 layer 표시')
                .last;
            await tester.ensureVisible(nextButton);
            await tester.tap(nextButton);
            await tester.pumpAndSettle();
          }
          if (fails) {
            firstPending.completeError(StateError('save failed'));
          } else {
            firstPending.complete();
          }
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);
          expect(
            find.text(success),
            exit == 'stay' && !fails ? findsOneWidget : findsNothing,
          );
          expect(
            find.text(_failureNotice),
            exit == 'stay' && fails ? findsOneWidget : findsNothing,
          );
          if (exit.startsWith('newer')) {
            final newerFails = exit == 'newer-failure';
            if (newerFails) {
              store.pending!.completeError(StateError('newer failed'));
            } else {
              store.pending!.complete();
            }
            await tester.pumpAndSettle();
            final savedLayer = controller.scores.single.annotationLayer;
            expect(
              export
                  ? savedLayer.includeDefaultLayerInExport
                  : savedLayer.isDefaultLayerVisible,
              newerFails ? fails : true,
            );
            expect(
              (await store.loadScores()).single.toJson(),
              controller.scores.single.toJson(),
            );
            expect(
              find.text(_failureNotice),
              newerFails ? findsOneWidget : findsNothing,
            );
            expect(
              find.text(export ? '필기를 PDF 공유/인쇄에 포함합니다.' : '필기 layer를 표시합니다.'),
              newerFails ? findsNothing : findsOneWidget,
            );
            expect(tester.takeException(), isNull);
            await tester.pumpWidget(const SizedBox());
            controller.dispose();
            return;
          }
          final layer = controller.scores.single.annotationLayer;
          expect(
            export
                ? layer.includeDefaultLayerInExport
                : layer.isDefaultLayerVisible,
            exit == 'profile' || fails,
          );
          expect(
            (await store.loadScores()).single.toJson(),
            controller.scores.single.toJson(),
          );
          if (fails) expect(controller.scores.single.toJson(), original);
          if (exit == 'covered') {
            Navigator.of(tester.element(find.text('Other route'))).pop();
            await tester.pumpAndSettle();
            expect(find.text(success), findsNothing);
            expect(find.text(_failureNotice), findsNothing);
          }
          if (exit == 'stay' && fails) {
            store.pending = null;
            await tester.ensureVisible(find.byTooltip(tooltip).last);
            await tester.tap(find.byTooltip(tooltip).last);
            await tester.pumpAndSettle();
            expect(find.text(success), findsOneWidget);
          }
          await tester.pumpWidget(const SizedBox());
          if (exit == 'profile') {
            await controller.switchLibraryProfile(sourceId);
            final sourceLayer = controller.scores.single.annotationLayer;
            expect(
              export
                  ? sourceLayer.includeDefaultLayerInExport
                  : sourceLayer.isDefaultLayerVisible,
              fails,
            );
          }
          controller.dispose();
        });
      }
    }
  }
}

class _LayerStore extends SheetLibraryStore {
  Completer<void>? pending;

  @override
  Future<void> saveScores(List<SheetScore> scores, {String? libraryId}) async {
    if (pending != null) await pending!.future;
    await super.saveScores(scores, libraryId: libraryId);
  }
}
