import 'package:flutter/material.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'capture_fixture.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  Future<void> restart(WidgetTester tester, {FakeLocalPlayer? player}) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    await launchCaptureFixtureApp(playbackController: player);
    await tester.pumpAndSettle();
  }

  Future<void> scrollTo(WidgetTester tester, String text) async {
    final target = find.text(text);
    final scrollable = find
        .byWidgetPredicate(
          (widget) =>
              widget is Scrollable &&
              axisDirectionToAxis(widget.axisDirection) == Axis.vertical,
        )
        .hitTestable()
        .first;
    for (
      var attempt = 0;
      attempt < 20 && target.evaluate().isEmpty;
      attempt += 1
    ) {
      await tester.drag(scrollable, const Offset(0, -300));
      await tester.pumpAndSettle();
    }
    expect(target, findsWidgets);
    await tester.ensureVisible(target.first);
    await tester.pumpAndSettle();
  }

  testWidgets('store screenshot scenes follow independent current UI routes', (
    tester,
  ) async {
    await restart(tester);
    expect(find.text('띠로리 플레이'), findsNothing);
    expect(find.byTooltip('도구 더보기'), findsOneWidget);
    expect(find.byTooltip('내 음악 검색'), findsOneWidget);
    expect(find.textContaining('/Users/'), findsNothing);

    await scrollTo(tester, '즐겨찾기');
    await tester.tap(find.byKey(const ValueKey('file-category-favorites')));
    await tester.pumpAndSettle();
    expect(find.text('즐겨찾는 곡을 모아보세요'), findsOneWidget);
    expect(find.text('이 목록에서 검색'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('도구 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('IMSLP 자료'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('IMSLP 검색'), findsOneWidget);
    expect(find.text('음원 파일 가져오기'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    // Each authored scene starts at its own fixture; returning from Favorites
    // intentionally retains the root scroll visit rather than scrolling up.
    await restart(tester);

    await tester.tap(find.byTooltip('내 음악 검색'));
    await tester.pumpAndSettle();
    expect(find.text('작품, 작곡가와 파일 검색'), findsOneWidget);
    expect(find.text('검색 결과가 없습니다.'), findsNothing);
    expect(find.text('검색하지 못했습니다'), findsNothing);
    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('file-category-songs')));
    await tester.pumpAndSettle();
    expect(find.byTooltip('곡 정렬'), findsOneWidget);
    expect(find.text('이 목록에서 검색'), findsOneWidget);
    await tester.tap(find.byTooltip('뒤로'));
    await tester.pumpAndSettle();

    await restart(tester);
    await tester.tap(find.byKey(const ValueKey('file-category-playlists')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('새 재생목록'));
    await tester.pumpAndSettle();
    expect(find.byType(AlertDialog), findsOneWidget);
    expect(find.text('곡 선택'), findsOneWidget);
    expect(find.text('저장'), findsOneWidget);
    expect(find.byTooltip('도구 더보기'), findsNothing);

    await restart(tester);
    await tester.tap(find.byTooltip('도구 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('보관함 분류 편집'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('section-editor-songs')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('section-editor-playlists')),
      findsOneWidget,
    );
    expect(find.text('저장'), findsOneWidget);
    expect(find.byTooltip('재생목록 위로'), findsOneWidget);

    await restart(tester);
    await tester.tap(find.byTooltip('도구 더보기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('재생 계획'));
    await tester.pumpAndSettle();
    await scrollTo(tester, '현재 재생 큐');
    expect(find.text('현재 재생 큐'), findsOneWidget);
    expect(find.text('1악장 Allegro con brio'), findsWidgets);
    expect(find.byTooltip('이전'), findsWidgets);
    expect(find.byTooltip('다음'), findsWidgets);

    await restart(tester);
    await scrollTo(tester, '교향곡 5번 다단조');
    await tester.tap(find.text('교향곡 5번 다단조').first.hitTestable());
    await tester.pumpAndSettle();
    expect(find.text('작품'), findsOneWidget);
    expect(find.text('악장'), findsOneWidget);
    expect(find.text('1악장 Allegro con brio'), findsOneWidget);

    await restart(tester);
    await scrollTo(tester, '교향곡 5번 다단조');
    await tester.tap(find.text('교향곡 5번 다단조').first.hitTestable());
    await tester.pumpAndSettle();
    await scrollTo(tester, '클라이버 / 빈 필하모닉 연주 녹음');
    await tester.tap(find.text('클라이버 / 빈 필하모닉 연주 녹음').first.hitTestable());
    await tester.pumpAndSettle();
    expect(find.text('녹음'), findsOneWidget);
    expect(find.text('녹음 전체 재생'), findsOneWidget);
    expect(find.text('4/4 재생 가능'), findsOneWidget);
    expect(find.textContaining('/Users/'), findsNothing);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
  });

  testWidgets(
    'R2 browsing scene preserves A playback while inspecting B on iOS',
    (tester) async {
      final player = FakeLocalPlayer();
      await restart(tester, player: player);
      await scrollTo(tester, '교향곡 5번 다단조');
      await tester.tap(find.text('교향곡 5번 다단조').first.hitTestable());
      await tester.pumpAndSettle();
      await scrollTo(tester, '클라이버 / 빈 필하모닉 연주 녹음');
      await tester.tap(find.text('클라이버 / 빈 필하모닉 연주 녹음').first.hitTestable());
      await tester.pumpAndSettle();
      await tester.tap(find.text('녹음 전체 재생'));
      await tester.pumpAndSettle();
      await player.updatePosition(const Duration(seconds: 42));
      await tester.pumpAndSettle();
      final before = player.playbackState;
      await tester.pageBack();
      await tester.pumpAndSettle();
      await tester.pageBack();
      await tester.pumpAndSettle();
      await scrollTo(tester, '브렌델 피아노 연주 녹음');
      await tester.tap(find.text('브렌델 피아노 연주 녹음').first.hitTestable());
      await tester.pumpAndSettle();
      expect(find.text('브렌델 피아노 연주 녹음'), findsOneWidget);
      expect(player.playbackState, same(before));
      expect(player.currentItem?.recordingId, 'recording.beethoven5.kleiber');
      final pause = find.byTooltip('축약 일시정지').evaluate().isNotEmpty
          ? find.byTooltip('축약 일시정지')
          : find.byTooltip('일시정지');
      await tester.ensureVisible(pause);
      await tester.tap(pause);
      await tester.pumpAndSettle();
      expect(player.state, LocalPlayerState.paused);
      expect(player.playbackState.position, const Duration(seconds: 42));
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpAndSettle();
    },
  );
}
