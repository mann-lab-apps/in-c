import 'dart:io';
import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_score.dart';

import 'adoption_pilot_test.dart' as pilot;

const linkedLabel = '다른 판본 · 피아노 합주 리허설에서 사용하는 긴 이름의 연습 자료';

Future<SheetLibraryController> fixture(WidgetTester t) async {
  final c = await pilot.library();
  addTearDown(c.dispose);
  final path = File('test-fixtures/pdfs/link-annotation-score.pdf')
      .absolute
      .path;
  await c.store.saveScores([
    c.scores.first.copyWith(
      filePath: path,
      linkedFiles: [
        SheetLinkedFile(
          path: path,
          type: 'pdf',
          label: linkedLabel,
          createdAt: DateTime(2026, 10, 31),
        ),
      ],
    ),
    ...c.scores.skip(1),
  ]);
  await c.load();
  return c;
}

Future<void> openShare(WidgetTester t) async {
  final menu = find.descendant(
    of: find.byKey(const ValueKey('score-pilot-0')),
    matching: find.byTooltip('더보기'),
  );
  if (menu.evaluate().isEmpty) {
    await t.scrollUntilVisible(
      menu,
      300,
      scrollable: find.byType(Scrollable).first,
      maxScrolls: 40,
    );
  }
  await t.ensureVisible(menu);
  await t.pumpAndSettle();
  await t.tap(menu);
  await t.pumpAndSettle();
  await t.tap(find.text('PDF 공유'));
  await t.pumpAndSettle();
}

Future<void> choose(WidgetTester t, String text) async {
  final target = find.descendant(
    of: find.byType(BottomSheet),
    matching: find.text(text),
  );
  await t.ensureVisible(target);
  await t.pumpAndSettle();
  await t.tap(target);
  await t.pumpAndSettle();
  await t.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 30)),
  );
  await t.pumpAndSettle();
}

void main() {
  const channel = MethodChannel('dev.fluttercommunity.plus/share');
  late List<MethodCall> calls;
  var failShare = false;
  Completer<String>? shareGate;
  setUp(() {
    calls = [];
    failShare = false;
    shareGate = null;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          final gate = shareGate;
          shareGate = null;
          if (gate != null) {
            return gate.future;
          }
          if (failShare) throw PlatformException(code: 'fixture-share-failure');
          return 'dev.fluttercommunity.plus/share/unavailable';
        });
  });
  tearDown(
    () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null),
  );

  for (final viewport in <({double width, double height, bool dark})>[
    (width: 390, height: 1000, dark: false),
    (width: 840, height: 1000, dark: true),
    (width: 840, height: 390, dark: false),
  ]) {
    testWidgets(
      'library share choices wrap and cancel without sharing at $viewport',
      (t) async {
        final c = await fixture(t);
        final original = c.scores.map((s) => s.toJson()).toList();
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
        await openShare(t);
        expect(find.text('공유할 파일 선택'), findsOneWidget);
        for (final candidate in c.shareCandidates(c.scores.first)) {
          final title = find.text(candidate.label);
          await t.ensureVisible(title);
          await t.pumpAndSettle();
          expect(
            t.renderObject<RenderParagraph>(title).didExceedMaxLines,
            isFalse,
          );
          expect(find.text(candidate.fileName), findsOneWidget);
          expect(find.text(candidate.path), findsNothing);
        }
        final captureDir = Platform.environment['DDIRORI_SCORE_SHARE_CAPTURE'];
        if (captureDir != null) {
          final boundary = t.renderObject<RenderRepaintBoundary>(
            find.byKey(const Key('pilot-capture')),
          );
          await t.runAsync(() async {
            final image = await boundary.toImage();
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.png,
            );
            await File(
              '$captureDir/share-${viewport.width.toInt()}x${viewport.height.toInt()}.png',
            ).writeAsBytes(bytes!.buffer.asUint8List());
            image.dispose();
          });
        }
        await choose(t, '취소');
        expect(calls, isEmpty);
        expect(c.scores.map((s) => s.toJson()).toList(), original);
        expect(find.byType(SheetViewerScreen), findsNothing);
        expect(t.takeException(), isNull);
      },
    );
  }

  testWidgets('old share choice is rejected after library switch and return', (
    t,
  ) async {
    final c = await fixture(t);
    await pilot.mount(t, c, accent: 'blue');
    final originalId = c.activeLibraryProfile.id;
    await openShare(t);
    await c.createLibraryProfile('새 자료');
    await c.switchLibraryProfile(originalId);
    await t.pumpAndSettle();
    await choose(t, '현재 PDF');
    expect(calls, isEmpty);
    expect(t.takeException(), isNull);
  });

  testWidgets(
    'chosen linked file reaches share channel unchanged and failures can retry',
    (t) async {
      final c = await fixture(t);
      await pilot.mount(t, c, accent: 'blue');
      final candidate = c.shareCandidates(c.scores.first).last;
      final bytes = File(candidate.path).readAsBytesSync();
      failShare = true;
      await openShare(t);
      await choose(t, candidate.label);
      expect(calls, hasLength(1));
      expect(find.text('파일을 공유하지 못했습니다.'), findsOneWidget);
      expect(calls.single.arguments['paths'], [candidate.path]);
      expect(calls.single.arguments['mimeTypes'], [candidate.mimeType]);
      failShare = false;
      await openShare(t);
      await choose(t, candidate.label);
      expect(calls, hasLength(2));
      expect(File(candidate.path).readAsBytesSync(), bytes);
      expect(c.scores.every((s) => s.lastOpenedAt == null), isTrue);
      expect(t.takeException(), isNull);
    },
  );

  for (final fails in [false, true]) {
    testWidgets('late native share reply cannot replace newer state: $fails', (
      t,
    ) async {
      final c = await fixture(t);
      await pilot.mount(t, c, accent: 'blue');
      final gate = Completer<String>();
      shareGate = gate;
      await openShare(t);
      await choose(t, '현재 PDF');
      expect(calls, hasLength(1));
      await openShare(t);
      await choose(t, '현재 PDF');
      expect(calls, hasLength(2));
      if (fails) {
        gate.completeError(PlatformException(code: 'late-share-failure'));
      } else {
        gate.complete('dev.fluttercommunity.plus/share/unavailable');
      }
      await t.pumpAndSettle();
      expect(find.text('파일을 공유하지 못했습니다.'), findsNothing);
      expect(c.scores.every((s) => s.lastOpenedAt == null), isTrue);
      expect(t.takeException(), isNull);
    });
  }

  testWidgets('single missing PDF reports a missing file without sharing', (
    t,
  ) async {
    final c = await pilot.library();
    addTearDown(c.dispose);
    await pilot.mount(t, c, accent: 'blue');
    await openShare(t);
    await t.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 30)),
    );
    await t.pumpAndSettle();
    expect(calls, isEmpty);
    expect(find.textContaining('공유할 파일을 찾지 못했습니다'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
}
