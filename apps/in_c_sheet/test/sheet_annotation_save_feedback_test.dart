import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  for (final redo in [false, true]) {
    for (final outcome in [
      'success',
      'empty',
      'failure',
      'closed',
      'covered-success',
      'covered-failure',
    ]) {
      testWidgets(
        'annotation ${redo ? 'redo' : 'undo'} keeps $outcome feedback',
        (tester) async {
          SharedPreferences.setMockInitialValues(<String, Object>{});
          tester.view.physicalSize = const Size(1600, 1000);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final now = DateTime(2026, 9, 13);
          final store = SheetLibraryStore();
          await store.saveScores([
            SheetScore(
              id: 'score',
              title: 'Concert',
              composer: 'Bach',
              tags: const [],
              note: '',
              filePath: '/tmp/clef-missing-feedback-fixture.pdf',
              importedAt: now,
              updatedAt: now,
              lastOpenedAt: null,
              lastPage: 1,
              isFavorite: false,
              bookmarks: const [],
            ),
          ]);
          final controller = _AnnotationOutcomeController(store: store);
          await controller.load();
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
          final button = find
              .byTooltip(redo ? '마지막 필기 다시 적용' : '마지막 필기 취소')
              .last;
          await tester.ensureVisible(button);
          await tester.tap(button);
          if (outcome == 'closed') {
            await tester.pumpWidget(const SizedBox());
          } else if (outcome.startsWith('covered')) {
            unawaited(
              Navigator.of(tester.element(find.byType(SheetViewerScreen)))
                  .push<void>(
                    MaterialPageRoute(
                      builder: (_) => const Scaffold(body: Text('Other route')),
                    ),
                  ),
            );
            await tester.pumpAndSettle();
          }
          if (outcome == 'failure' ||
              outcome == 'closed' ||
              outcome == 'covered-failure') {
            controller.result.completeError(StateError('save failed'));
          } else {
            controller.result.complete(
              outcome == 'success' || outcome == 'covered-success',
            );
          }
          await tester.pumpAndSettle();
          if (outcome.startsWith('covered')) {
            expect(
              find.text('필기 변경사항을 저장하지 못했습니다. 저장 상태를 확인해주세요.'),
              findsNothing,
            );
            expect(
              find.text(redo ? '마지막 필기를 다시 적용했습니다.' : '마지막 필기를 취소했습니다.'),
              findsNothing,
            );
            Navigator.of(tester.element(find.text('Other route'))).pop();
            await tester.pumpAndSettle();
            expect(
              find.text('필기 변경사항을 저장하지 못했습니다. 저장 상태를 확인해주세요.'),
              findsNothing,
            );
            expect(
              find.text(redo ? '마지막 필기를 다시 적용했습니다.' : '마지막 필기를 취소했습니다.'),
              findsNothing,
            );
          } else if (outcome != 'closed') {
            if (outcome == 'failure') {
              expect(
                find.text(redo ? '다시 적용할 필기가 없습니다.' : '취소할 필기가 없습니다.'),
                findsNothing,
              );
            }
            final expected = outcome == 'failure'
                ? '필기 변경사항을 저장하지 못했습니다. 저장 상태를 확인해주세요.'
                : outcome == 'success'
                ? redo
                      ? '마지막 필기를 다시 적용했습니다.'
                      : '마지막 필기를 취소했습니다.'
                : redo
                ? '다시 적용할 필기가 없습니다.'
                : '취소할 필기가 없습니다.';
            expect(find.text(expected), findsOneWidget);
            if (outcome == 'failure') {
              await tester.pump(const Duration(seconds: 3));
              await tester.pumpAndSettle();
              expect(
                find.text(redo ? '다시 적용할 필기가 없습니다.' : '취소할 필기가 없습니다.'),
                findsNothing,
              );
            }
          }
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox());
        },
      );
    }
  }
}

class _AnnotationOutcomeController extends SheetLibraryController {
  _AnnotationOutcomeController({required super.store});
  final result = Completer<bool>();

  @override
  Future<bool> undoLastAnnotation(SheetScore score, int pageNumber) =>
      result.future;

  @override
  Future<bool> redoLastAnnotation(SheetScore score, int pageNumber) =>
      result.future;
}
