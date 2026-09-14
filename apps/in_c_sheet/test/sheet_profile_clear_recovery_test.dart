import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final outcome in [
    'success',
    'failure',
    'closed',
    'switched',
    'closed-success',
    'switched-failure',
    'covered-success',
    'covered-failure',
  ]) {
    testWidgets('library clear UI handles $outcome', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final store = _ClearStore();
      await store.createLibraryProfile('Concert');
      final controller = SheetLibraryController(store: store);
      await controller.load();
      await tester.pumpWidget(
        MaterialApp(home: SheetLibraryScreen(controller: controller)),
      );
      await tester.pumpAndSettle();
      await _clear(tester);
      if (outcome.startsWith('closed')) {
        await tester.pumpWidget(const MaterialApp(home: SizedBox()));
      } else if (outcome.startsWith('switched')) {
        await controller.createLibraryProfile('Other');
        await tester.pumpAndSettle();
      } else if (outcome.startsWith('covered')) {
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
      if (outcome == 'success' ||
          outcome == 'switched' ||
          outcome.endsWith('-success')) {
        store.pending!.complete();
      } else {
        store.pending!.completeError(StateError('clear failed'));
      }
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(
        find.text('라이브러리를 비웠습니다.'),
        outcome == 'success' ? findsOneWidget : findsNothing,
      );
      expect(
        find.text('라이브러리를 비우지 못했습니다. 다시 시도해주세요.'),
        outcome == 'failure' ? findsOneWidget : findsNothing,
      );
      if (outcome == 'failure') {
        await tester.pump(const Duration(seconds: 5));
        await _clear(tester);
        store.pending!.complete();
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('라이브러리를 비웠습니다.'), findsOneWidget);
      }
    });
  }
}

Future<void> _clear(WidgetTester tester) async {
  await tester.tap(find.text('Concert'));
  await tester.pumpAndSettle();
  await tester.tap(find.byTooltip('라이브러리 비우기'));
  await tester.pumpAndSettle();
  await tester.tap(find.widgetWithText(FilledButton, '비우기'));
  await tester.pumpAndSettle();
}

class _ClearStore extends SheetLibraryStore {
  Completer<void>? pending;

  @override
  Future<bool> clearLibraryProfile(String id) async {
    pending = Completer<void>();
    await pending!.future;
    return super.clearLibraryProfile(id);
  }
}
