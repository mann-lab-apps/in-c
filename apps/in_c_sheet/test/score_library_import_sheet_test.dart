import 'dart:io';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_library_store.dart';
import 'package:in_c_sheet/sheet_score.dart';

import 'adoption_pilot_test.dart' as pilot;

class ImportChoicesStore extends SheetLibraryStore {
  int pdfRequests = 0;
  int imageRequests = 0;
  bool failPdf = false;

  @override
  Future<SheetScore?> importPdf() async {
    pdfRequests++;
    if (failPdf) throw const FileSystemException('import choice fixture');
    return null;
  }

  @override
  Future<SheetScore?> importImagesAsPdf() async {
    imageRequests++;
    return null;
  }
}

Future<void> openImport(WidgetTester t) async {
  await t.tap(find.byTooltip('악보 추가'));
  await t.pumpAndSettle();
}

void main() {
  for (final viewport in <({double width, double height, bool dark})>[
    (width: 390, height: 1000, dark: false),
    (width: 840, height: 1000, dark: true),
    (width: 840, height: 390, dark: false),
  ]) {
    testWidgets('common library import choices remain reachable at $viewport', (
      t,
    ) async {
      final store = ImportChoicesStore();
      final c = await pilot.library(store: store);
      addTearDown(c.dispose);
      c.updateQuery('평균율');
      final ids = c.scores.map((s) => s.id).toList();
      final libraryId = c.activeLibraryProfile.id;
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
      await openImport(t);
      expect(t.takeException(), isNull);
      expect(
        find.byWidgetPredicate(
          (w) => w is DdiroriItem && w.title == 'PDF 가져오기',
        ),
        findsOneWidget,
      );
      expect(
        find.byWidgetPredicate(
          (w) => w is DdiroriItem && w.title == '이미지를 PDF 악보로 묶기',
        ),
        findsOneWidget,
      );
      await t.ensureVisible(find.text('이미지를 PDF 악보로 묶기'));
      await t.pumpAndSettle();
      await t.tap(find.text('이미지를 PDF 악보로 묶기'));
      await t.pumpAndSettle();
      expect(store.imageRequests, 1);
      expect(store.pdfRequests, 0);
      expect(c.scores.map((s) => s.id), ids);
      expect(c.query, '평균율');
      expect(c.activeLibraryProfile.id, libraryId);
      expect(find.byType(BottomSheet), findsNothing);
      await openImport(t);
      await t.ensureVisible(find.text('취소'));
      await t.pumpAndSettle();
      await t.tap(find.text('취소'));
      await t.pumpAndSettle();
      expect(find.byType(BottomSheet), findsNothing);
      await openImport(t);
      await t.state<NavigatorState>(find.byType(Navigator).first).maybePop();
      await t.pumpAndSettle();
      expect(store.imageRequests, 1);
      expect(store.pdfRequests, 0);
      expect(c.query, '평균율');
      expect(t.takeException(), isNull);
    });
  }

  testWidgets(
    'PDF import choice failure and cancelled retry preserve library',
    (t) async {
      final store = ImportChoicesStore();
      final c = await pilot.library(store: store);
      addTearDown(c.dispose);
      final ids = c.scores.map((s) => s.id).toList();
      await pilot.mount(t, c, scale: 2, accent: 'blue');
      store.failPdf = true;
      await openImport(t);
      await t.ensureVisible(find.text('PDF 가져오기'));
      await t.pumpAndSettle();
      await t.tap(find.text('PDF 가져오기'));
      await t.pumpAndSettle();
      expect(store.pdfRequests, 1);
      expect(c.errorMessage, isNotNull);
      expect(c.scores.map((s) => s.id), ids);
      expect(find.text(c.errorMessage!), findsOneWidget);
      store.failPdf = false;
      await openImport(t);
      await t.ensureVisible(find.text('PDF 가져오기'));
      await t.pumpAndSettle();
      await t.tap(find.text('PDF 가져오기'));
      await t.pumpAndSettle();
      expect(store.pdfRequests, 2);
      expect(c.errorMessage, isNull);
      expect(c.scores.map((s) => s.id), ids);
      expect(t.takeException(), isNull);
    },
  );
}
