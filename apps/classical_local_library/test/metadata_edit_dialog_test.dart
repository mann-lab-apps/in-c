import 'dart:async';

import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/presentation/metadata_edit_dialog.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final brightness in Brightness.values) {
    testWidgets(
      'metadata form ${brightness.name}, narrow, large type, keyboard',
      (t) async {
        t.view.physicalSize = const Size(390, 844);
        t.view.devicePixelRatio = 1;
        t.view.viewInsets = const FakeViewPadding(bottom: 240);
        t.platformDispatcher.textScaleFactorTestValue = 2;
        addTearDown(t.view.resetPhysicalSize);
        addTearDown(t.view.resetDevicePixelRatio);
        addTearDown(t.view.resetViewInsets);
        addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
        await t.pumpWidget(
          MaterialApp(
            theme: ddiroriTheme(brightness: brightness),
            home: Scaffold(
              body: MetadataEditDialog(
                existing: null,
                effective: EffectiveFileMetadata.resolve(),
                onSave: (_) async {},
              ),
            ),
          ),
        );
        await t.pumpAndSettle();
        expect(t.takeException(), isNull);
        expect(find.text('취소'), findsOneWidget);
        expect(find.text('저장'), findsOneWidget);
        await t.enterText(
          find.byType(TextField).first,
          '긴 한국어 이름과 English title',
        );
        await t.pump();
        expect(t.takeException(), isNull);
      },
    );
  }
  testWidgets('late save completion after disposal does not access context', (
    t,
  ) async {
    final done = Completer<void>();
    await t.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MetadataEditDialog(
            existing: null,
            effective: EffectiveFileMetadata.resolve(),
            onSave: (_) => done.future,
          ),
        ),
      ),
    );
    await t.tap(find.text('저장'));
    await t.pump();
    await t.pumpWidget(const SizedBox());
    done.complete();
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
  });
}
