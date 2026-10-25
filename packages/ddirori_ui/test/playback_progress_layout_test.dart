import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('large time labels stack above a usable slider', (t) async {
    t.view.physicalSize = const Size(320, 600);
    t.view.devicePixelRatio = 1;
    t.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(t.view.resetPhysicalSize);
    addTearDown(t.view.resetDevicePixelRatio);
    addTearDown(t.platformDispatcher.clearTextScaleFactorTestValue);
    Duration? requested;
    await t.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(16),
            child: DdiroriPlaybackProgress(
              position: const Duration(minutes: 42),
              duration: const Duration(hours: 2),
              onSeek: (value) => requested = value,
            ),
          ),
        ),
      ),
    );
    final slider = find.byType(Slider);
    expect(t.getRect(slider).width, 288);
    expect(
      t.getRect(find.text('42:00')).bottom,
      lessThanOrEqualTo(t.getRect(slider).top),
    );
    for (final label in ['42:00', '2:00:00']) {
      expect(
        t.renderObject<RenderParagraph>(find.text(label)).didExceedMaxLines,
        isFalse,
      );
    }
    expect(t.widget<Slider>(slider).semanticFormatterCallback!(42000), '00:42');
    t.widget<Slider>(slider).onChangeEnd!(42000);
    expect(requested, const Duration(seconds: 42));
    expect(t.takeException(), isNull);
  });
}
