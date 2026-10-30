import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/main.dart';
import 'package:in_c_sheet/sheet_library_profile.dart';

import 'adoption_pilot_test.dart' as pilot;

Future<void> openProfileChoices(WidgetTester t) async {
  final trigger = find.byTooltip('라이브러리 전환');
  await t.ensureVisible(trigger);
  await t.pumpAndSettle();
  await t.tap(trigger);
  await t.pumpAndSettle();
}

Finder profileItem(String title) =>
    find.byWidgetPredicate((w) => w is DdiroriItem && w.title == title);

Future<void> selectProfile(WidgetTester t, String title) async {
  final label = find.descendant(
    of: profileItem(title),
    matching: find.text(title),
  );
  await t.ensureVisible(label);
  await t.pumpAndSettle();
  await t.tap(label);
  await t.pumpAndSettle();
}

void main() {
  testWidgets(
    'profile sheet cancel create-cancel and clear-cancel retain current data',
    (t) async {
      final c = await pilot.library();
      addTearDown(c.dispose);
      await c.createLibraryProfile('합주 자료');
      final profile = c.activeLibraryProfile;
      await c.switchLibraryProfile(SheetLibraryProfile.defaultId);
      c.updateQuery('평균율');
      final ids = c.scores.map((s) => s.id).toList();
      await pilot.mount(t, c, scale: 2, accent: 'blue');
      await openProfileChoices(t);
      await t.ensureVisible(find.text('취소'));
      await t.pumpAndSettle();
      await t.tap(find.text('취소'));
      await t.pumpAndSettle();
      expect(c.query, '평균율');
      await openProfileChoices(t);
      await t.ensureVisible(find.text('새 라이브러리'));
      await t.pumpAndSettle();
      await t.tap(find.text('새 라이브러리'));
      await t.pumpAndSettle();
      expect(find.text('라이브러리 만들기'), findsOneWidget);
      await t.enterText(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.byType(TextField),
        ),
        '만들지 않을 연습함',
      );
      await t.pumpAndSettle();
      await t.tap(find.text('취소'));
      await t.pumpAndSettle();
      expect(c.libraryProfiles, hasLength(2));
      await openProfileChoices(t);
      final manage = find.byTooltip('${profile.name} 관리');
      await t.ensureVisible(manage);
      await t.pumpAndSettle();
      await t.tap(manage);
      await t.pumpAndSettle();
      await t.tap(find.text('라이브러리 비우기'));
      await t.pumpAndSettle();
      expect(find.textContaining('악보 파일은 삭제하지 않고'), findsOneWidget);
      expect(find.textContaining('metadata만 비웁니다.'), findsOneWidget);
      await t.tap(find.text('취소'));
      await t.pumpAndSettle();
      expect(c.activeLibraryProfile.id, SheetLibraryProfile.defaultId);
      expect(c.libraryProfileByName(profile.name)?.id, profile.id);
      expect(c.scores.map((s) => s.id), ids);
      expect(c.query, '평균율');
      expect(t.takeException(), isNull);
    },
  );
  for (final viewport in <({double width, double height, bool dark})>[
    (width: 390, height: 1000, dark: false),
    (width: 840, height: 1000, dark: true),
    (width: 840, height: 390, dark: false),
  ]) {
    testWidgets(
      'library profile names and independent actions work at $viewport',
      (t) async {
        final c = await pilot.library();
        addTearDown(c.dispose);
        await c.createLibraryProfile(
          '합주와 개인 연습을 위한 긴 이름의 라이브러리 · Rehearsal collection',
        );
        final profile = c.activeLibraryProfile;
        await c.switchLibraryProfile(SheetLibraryProfile.defaultId);
        c.updateQuery('평균율');
        final ids = c.scores.map((s) => s.id).toList();
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
        await openProfileChoices(t);
        final label = find.descendant(
          of: find.byType(BottomSheet),
          matching: find.text(profile.name),
        );
        await t.ensureVisible(label);
        await t.pumpAndSettle();
        expect(
          t.renderObject<RenderParagraph>(label).didExceedMaxLines,
          isFalse,
        );
        expect(profileItem(profile.name), findsOneWidget);
        expect(
          t
              .widget<DdiroriItem>(profileItem(SheetLibraryProfile.defaultName))
              .selected,
          isTrue,
        );
        final manage = find.byTooltip('${profile.name} 관리');
        await t.ensureVisible(manage);
        await t.pumpAndSettle();
        await t.tap(manage);
        await t.pumpAndSettle();
        await t.tap(find.text('이름 변경'));
        await t.pumpAndSettle();
        expect(c.activeLibraryProfile.id, SheetLibraryProfile.defaultId);
        expect(find.text('라이브러리 이름 변경'), findsOneWidget);
        await t.tap(find.text('취소'));
        await t.pumpAndSettle();
        expect(c.query, '평균율');
        expect(c.scores.map((s) => s.id), ids);
        expect(c.libraryProfileByName(profile.name)?.id, profile.id);
        expect(find.byType(SheetViewerScreen), findsNothing);
        await openProfileChoices(t);
        await selectProfile(t, profile.name);
        expect(c.activeLibraryProfile.id, profile.id);
        expect(c.query, isEmpty);
        expect(c.scores, isEmpty);
        await openProfileChoices(t);
        await selectProfile(t, SheetLibraryProfile.defaultName);
        expect(c.scores.map((s) => s.id), ids);
        expect(c.activeLibraryProfile.id, SheetLibraryProfile.defaultId);
        expect(t.takeException(), isNull);
      },
    );
  }
}
