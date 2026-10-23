import 'dart:io';
import 'dart:ui' as ui;

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_controller.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<void> capture(WidgetTester t, String name) async {
  if (Platform.environment['DDIRORI_BRAND_CAPTURE'] != 'true') return;
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(const Key('brand-capture')),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 1.5);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File(
      '../../docs/brand/ddirori-brand-system/evidence/$name.png',
    );
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}

Future<void> font(WidgetTester t) async {
  final path = Platform.environment['DDIRORI_BRAND_FONT'];
  if (path == null) return;
  await t.runAsync(() async {
    final loader = FontLoader('DdiroriCapture')
      ..addFont(
        Future.value(ByteData.sublistView(await File(path).readAsBytes())),
      );
    await loader.load();
    final fallback = FontLoader('Roboto')
      ..addFont(
        Future.value(ByteData.sublistView(await File(path).readAsBytes())),
      );
    await fallback.load();
    final iconsPath = Platform.environment['DDIRORI_MATERIAL_FONT'];
    if (iconsPath != null) {
      final icons = FontLoader('MaterialIcons')
        ..addFont(
          Future.value(
            ByteData.sublistView(await File(iconsPath).readAsBytes()),
          ),
        );
      await icons.load();
    }
  });
}

class FailedStore extends SheetLibraryStore {
  bool fail = true;
  @override
  Future<List<SheetScore>> loadScores() async {
    if (fail) throw const FileSystemException('fixture: unavailable store');
    return super.loadScores();
  }
}

void main() {
  for (final entry in [
    ('library', Brightness.light, 390.0, 1.0),
    ('library-large', Brightness.dark, 320.0, 2.0),
    ('library-wide', Brightness.light, 1024.0, 1.0),
    ('empty', Brightness.dark, 390.0, 1.0),
    ('filtered', Brightness.light, 320.0, 2.0),
    ('loading', Brightness.dark, 390.0, 1.0),
    ('error', Brightness.light, 390.0, 1.0),
  ]) {
    testWidgets('score brand ${entry.$1}, ${entry.$3}px, text ${entry.$4}', (
      t,
    ) async {
      t.view.physicalSize = Size(
        entry.$3,
        entry.$1 == 'library-large' ? 844 : 1100,
      );
      t.view.devicePixelRatio = 1;
      t.platformDispatcher.platformBrightnessTestValue = entry.$2;
      t.platformDispatcher.textScaleFactorTestValue = entry.$4;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      addTearDown(t.platformDispatcher.clearAllTestValues);
      SharedPreferences.setMockInitialValues({});
      await font(t);
      final store = entry.$1 == 'error' ? FailedStore() : SheetLibraryStore();
      final c = SheetLibraryController(store: store);
      addTearDown(c.dispose);
      if (entry.$1.startsWith('library')) {
        final now = DateTime(2026, 10, 23);
        await store.saveScores([
          for (final (i, title) in [
            'Prelude',
            'Evening Practice',
            '평균율 클라비어곡집 제1권 전주곡과 푸가 다장조 BWV 846 · J. S. Bach',
          ].indexed)
            SheetScore(
              id: 'brand-$i',
              title: title,
              composer: '자가 제작 샘플',
              tags: ['연습'],
              note: '',
              filePath: '/brand-fixture/$i.pdf',
              importedAt: now,
              updatedAt: now,
              lastOpenedAt: null,
              lastPage: 1,
              isFavorite: i == 0,
              bookmarks: [],
            ),
        ]);
      }
      if (entry.$1 != 'loading') await c.load();
      if (entry.$1 == 'filtered') c.updateQuery('없는 악보');
      await t.pumpWidget(
        RepaintBoundary(
          key: const Key('brand-capture'),
          child: InCSheetApp(controller: c, fontFamily: 'DdiroriCapture'),
        ),
      );
      await t.pump(const Duration(milliseconds: 400));
      if (entry.$4 == 1) {
        expect(find.text('띠로리 스코어'), findsOneWidget);
      } else {
        expect(find.text('스코어'), findsOneWidget);
      }
      expect(find.byType(DdiroriSearch), findsOneWidget);
      if (entry.$1 == 'empty') {
        expect(find.byType(DdiroriBachVector), findsOneWidget);
      }
      if (entry.$1 == 'loading') {
        expect(find.byType(DdiroriProgress), findsOneWidget);
      }
      if (entry.$1 == 'error') {
        expect(find.byType(DdiroriBanner), findsOneWidget);
        expect(find.text('첫 악보를 펼쳐볼까요?'), findsNothing);
        expect(find.text('다시 불러오기'), findsOneWidget);
      }
      if (entry.$1 == 'filtered') {
        expect(find.text('조건에 맞는 악보가 없습니다.'), findsOneWidget);
        await t.ensureVisible(find.text('검색/필터 초기화'));
        await t.tap(find.text('검색/필터 초기화'));
        await t.pumpAndSettle();
        expect(c.query, isEmpty);
        expect(find.text('첫 악보를 펼쳐볼까요?'), findsOneWidget);
      }
      expect(t.takeException(), isNull);
      await capture(t, 'score-${entry.$1}-${entry.$2.name}');
      if (entry.$1 == 'library') {
        final target = c.filteredScores.first;
        expect(target.isFavorite, isFalse);
        await t.tap(find.byTooltip('즐겨찾기').first);
        await t.pumpAndSettle();
        expect(c.scoreById(target.id).isFavorite, isTrue);
        await t.enterText(find.byType(TextField).first, '평균율');
        await t.pumpAndSettle();
        expect(c.filteredScores, hasLength(1));
        expect(find.textContaining('BWV 846'), findsWidgets);
        expect(t.takeException(), isNull);
        await capture(t, 'score-library-search-light');
      }
      if (store is FailedStore) {
        store.fail = false;
        await t.ensureVisible(find.text('다시 불러오기'));
        await t.tap(find.text('다시 불러오기'));
        await t.pumpAndSettle();
        expect(find.byType(DdiroriBanner), findsNothing);
        expect(find.text('첫 악보를 펼쳐볼까요?'), findsOneWidget);
      }
      expect(t.takeException(), isNull);
      await t.pumpWidget(const SizedBox());
    });
  }
}
