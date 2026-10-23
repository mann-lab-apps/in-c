import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '_deployment_capture_adapter.dart' as adapter;

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  final plan = jsonDecode(
    utf8.decode(
      base64Decode(const String.fromEnvironment('STORE_CAPTURE_PLAN')),
    ),
  ) as Map<String, dynamic>;
  testWidgets('capture configured production UI scenes', (tester) async {
    Finder match(Map<String, dynamic> step) {
      switch (step['by']) {
        case 'text':
          return find.text(step['value'] as String);
        case 'tooltip':
          return find.byTooltip(step['value'] as String);
        case 'key':
          return find.byKey(ValueKey<String>(step['value'] as String));
        case 'widget_type':
          return find.byWidgetPredicate(
            (w) => w.runtimeType.toString() == step['value'],
          );
        default:
          throw StateError('Unknown capture selector');
      }
    }

    for (final raw in plan['scenes'] as List) {
      // Authored routes are independent and always begin at the app root.
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
      await adapter.launch();
      await tester.pumpAndSettle();
      final scene = raw as Map<String, dynamic>;
      Future<void> checkState(
        Finder finder,
        bool present,
        String reason,
      ) async {
        if (finder.evaluate().isNotEmpty != present) {
          await binding.takeScreenshot(
            '${plan['device']}-failed-${scene['id']}',
          );
        }
        expect(finder, present ? findsWidgets : findsNothing, reason: reason);
      }

      for (final rawStep in scene['steps'] as List) {
        final step = rawStep as Map<String, dynamic>;
        switch (step['action']) {
          case 'tap':
            final target = match(step).hitTestable();
            await checkState(
              target,
              true,
              'Scene ${scene['id']}: tap target missing',
            );
            await tester.tap(target.first);
          case 'back':
            final navigator = tester.state<NavigatorState>(
              find.byType(Navigator).first,
            );
            expect(navigator.canPop(), isTrue);
            navigator.pop();
          case 'scroll_to':
            final target = match(step);
            final delta = (step['delta'] as int).toDouble();
            final scrollable = find
                .byWidgetPredicate(
                  (widget) =>
                      widget is Scrollable &&
                      axisDirectionToAxis(widget.axisDirection) ==
                          Axis.vertical,
                )
                .hitTestable()
                .first;
            for (
              var attempt = 0;
              attempt < 20 && target.evaluate().isEmpty;
              attempt += 1
            ) {
              await tester.drag(scrollable, Offset(0, -delta));
              await tester.pumpAndSettle();
            }
            await checkState(
              target,
              true,
              'Scene ${scene['id']}: scroll target missing',
            );
            await tester.ensureVisible(target.first);
          case 'wait':
            await Future<void>.delayed(
              Duration(milliseconds: step['milliseconds'] as int),
            );
          default:
            throw StateError('Unknown capture action');
        }
        await tester.pumpAndSettle();
      }
      for (final rawCheck in scene['assertions'] as List) {
        final check = rawCheck as Map<String, dynamic>;
        await checkState(
          match(check).hitTestable(),
          check['present'] as bool,
          'Scene ${scene['id']}: required UI state differs',
        );
      }
      await tester.pumpAndSettle(const Duration(milliseconds: 200));
      await Future<void>.delayed(const Duration(seconds: 1));
      await tester.pump();
      expect(tester.takeException(), isNull);
      // Native iOS snapshot is taken now. The host later saves these exact bytes.
      await binding.takeScreenshot('${plan['device']}-${scene['id']}');
    }
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  }, timeout: const Timeout(Duration(minutes: 8)));
}
