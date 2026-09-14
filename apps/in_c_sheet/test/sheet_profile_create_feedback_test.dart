import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  for (final create in [false, true]) {
    testWidgets(
      'home profile ${create ? 'create' : 'switch'} failure and retry',
      (tester) async {
        SharedPreferences.setMockInitialValues({});
        final store = _ProfileStore();
        if (!create) {
          await store.createLibraryProfile('Concert');
          await store.setActiveLibraryProfile(SheetLibraryProfile.defaultId);
        }
        final controller = SheetLibraryController(store: store);
        await controller.load();
        await tester.pumpWidget(
          MaterialApp(home: SheetLibraryScreen(controller: controller)),
        );
        await tester.pumpAndSettle();
        store.failNext = true;
        for (final retry in [false, true]) {
          await tester.tap(find.text(SheetLibraryProfile.defaultName));
          await tester.pumpAndSettle();
          await tester.tap(find.text(create ? '새 라이브러리' : 'Concert'));
          await tester.pumpAndSettle();
          if (create) {
            await tester.enterText(find.byType(TextField).last, 'Concert');
            await tester.tap(find.widgetWithText(FilledButton, '저장'));
            await tester.pumpAndSettle();
          }
          expect(tester.takeException(), isNull);
          final error = create ? '라이브러리를 만들지 못했습니다.' : '라이브러리를 전환하지 못했습니다.';
          expect(find.text(error), retry ? findsNothing : findsOneWidget);
          expect(controller.isLoading, isFalse);
          expect(controller.activeLibraryProfile.isDefault, !retry);
          if (retry) expect(controller.activeLibraryProfile.name, 'Concert');
        }
        await tester.pumpWidget(const SizedBox());
      },
    );
  }
}

class _ProfileStore extends SheetLibraryStore {
  bool failNext = false;

  void _checkFailure() {
    if (failNext) {
      failNext = false;
      throw StateError('profile save failed');
    }
  }

  @override
  Future<SheetLibraryProfile> createLibraryProfile(String name) {
    _checkFailure();
    return super.createLibraryProfile(name);
  }

  @override
  Future<void> setActiveLibraryProfile(String id) {
    _checkFailure();
    return super.setActiveLibraryProfile(id);
  }
}
