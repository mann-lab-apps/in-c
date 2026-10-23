import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:doyo_design_review/adapters/flutter/doyo_theme.dart';
import 'package:doyo_design_review/adapters/flutter/doyo_loader.dart';

void main() {
  test('Selected brand and touch/desktop density survive Material theming', () {
    final light = doyoTheme(fontFamily: 'DoyoReviewFont');
    final dark = doyoTheme(brightness: Brightness.dark);
    expect(light.colorScheme.primary, const Color(0xFF486879));
    expect(light.scaffoldBackgroundColor, const Color(0xFFF7F4EF));
    expect(dark.colorScheme.onSurface, const Color(0xFFF1ECE5));
    expect(dark.extension<DoyoColors>()!.scorePaper, Colors.white);
    expect(light.textTheme.bodyLarge!.fontFamily, 'DoyoReviewFont');
    final desktop = doyoTheme(compact: true, touch: false);
    final touch = doyoTheme(compact: true, touch: true);
    expect(desktop.filledButtonTheme.style!.minimumSize!.resolve({})!.height, 32);
    expect(touch.filledButtonTheme.style!.minimumSize!.resolve({})!.height, 48);
    expect(light.filledButtonTheme.style!.backgroundColor!.resolve({WidgetState.disabled}), const Color(0xFFE8E0D5));
  });

  testWidgets('Bird paints different frames; reduced motion is static and announced', (tester) async {
    final semantics = tester.ensureSemantics();
    final key = GlobalKey();
    Future<void> mount(bool reduced) async {
      await tester.pumpWidget(MaterialApp(theme: doyoTheme(), home: MediaQuery(
        data: MediaQueryData(disableAnimations: reduced),
        child: Scaffold(body: Center(child: RepaintBoundary(key: key,
          child: const DoyoLoader(width: 96, label: '악보를 불러오는 중')))),
      )));
      await tester.pump();
    }
    Future<List<int>> pixels() async {
      return (await tester.runAsync(() async {
        final image = await (key.currentContext!.findRenderObject()! as RenderRepaintBoundary).toImage();
        final data = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
        image.dispose();
        return data!.buffer.asUint8List().toList();
      }))!;
    }
    await mount(false);
    final initial = await pixels();
    await tester.pump(const Duration(milliseconds: 450));
    final moving = await pixels();
    expect(moving, isNot(orderedEquals(initial)));
    await mount(true);
    final still = await pixels();
    await tester.pump(const Duration(milliseconds: 450));
    expect(await pixels(), orderedEquals(still));
    expect(find.text('악보를 불러오는 중'), findsOneWidget);
    expect(find.bySemanticsLabel('악보를 불러오는 중'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    semantics.dispose();
  });
}
