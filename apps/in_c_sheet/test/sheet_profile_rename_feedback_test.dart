import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  for (final exit in ['stay', 'closed', 'switched', 'covered']) {
    for (final fails in [false, true]) {
      testWidgets('profile rename $exit: fails=$fails', (tester) async {
        SharedPreferences.setMockInitialValues({});
        final store = _RenameStore();
        await store.createLibraryProfile('Concert');
        final controller = SheetLibraryController(store: store);
        await controller.load();
        await tester.pumpWidget(
          MaterialApp(home: SheetLibraryScreen(controller: controller)),
        );
        await tester.pumpAndSettle();
        await _rename(tester);
        if (exit == 'closed') {
          await tester.pumpWidget(const SizedBox());
        } else if (exit == 'switched') {
          await controller.switchLibraryProfile(SheetLibraryProfile.defaultId);
          await tester.pumpAndSettle();
        } else if (exit == 'covered') {
          unawaited(
            Navigator.of(tester.element(find.byType(SheetLibraryScreen)))
                .push<void>(
                  MaterialPageRoute(
                    builder: (_) => const Scaffold(body: Text('Other route')),
                  ),
                ),
          );
          await tester.pumpAndSettle();
        }
        if (fails) {
          store.pending!.completeError(StateError('rename failed'));
        } else {
          store.pending!.complete();
        }
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(
          find.text('라이브러리 이름을 변경했습니다.'),
          exit == 'stay' && !fails ? findsOneWidget : findsNothing,
        );
        expect(
          find.text('라이브러리 이름을 저장하지 못했습니다. 다시 시도해주세요.'),
          exit == 'stay' && fails ? findsOneWidget : findsNothing,
        );
        expect(find.text('같은 이름의 라이브러리가 이미 있습니다.'), findsNothing);
        if (exit == 'stay' && fails) {
          await tester.pump(const Duration(seconds: 5));
          await _rename(tester);
          store.pending!.complete();
          await tester.pumpAndSettle();
          expect(find.text('라이브러리 이름을 변경했습니다.'), findsOneWidget);
        }
        await tester.pumpWidget(const SizedBox());
      });
    }
  }
}

Future<void> _rename(WidgetTester tester) async {
  await tester.tap(find.text('Concert'));
  await tester.pumpAndSettle();
  await tester.tap(find.byTooltip('이름 변경'));
  await tester.pumpAndSettle();
  await tester.enterText(find.byType(TextField).last, 'Revised');
  await tester.tap(find.widgetWithText(FilledButton, '저장'));
  await tester.pumpAndSettle();
}

class _RenameStore extends SheetLibraryStore {
  Completer<void>? pending;

  @override
  Future<SheetLibraryProfile?> renameLibraryProfile({
    required String id,
    required String name,
  }) async {
    pending = Completer<void>();
    await pending!.future;
    return super.renameLibraryProfile(id: id, name: name);
  }
}
