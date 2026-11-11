import 'dart:async';
import 'dart:ui' as ui;

import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_library.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/presentation/play_playback_components.dart';
import 'package:classical_local_library/presentation/play_playback_layout.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _item = LocalPlaybackQueueItem(
  trackId: 'local-file:a',
  recordingId: 'a',
  workId: 'a',
  displayTitle: '현재 곡 Alpha',
  path: '/fixture/a.wav',
  usesLinkedFile: true,
  workTitle: '',
  recordingTitle: '',
);
const _ready = LocalPlaybackState(
  playerState: LocalPlayerState.paused,
  queue: [_item, _item, _item],
  currentIndex: 1,
  position: Duration(seconds: 20),
  duration: Duration(minutes: 2),
);

void main() {
  setUpAll(() => WidgetController.hitTestWarningShouldBeFatal = true);
  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final dark in [false, true]) {
        testWidgets(
          'actual control semantics and hit targets $width/$scale/$dark',
          (tester) async {
            final handle = tester.ensureSemantics();
            try {
              tester.view.physicalSize = Size(width, 1500);
              tester.view.devicePixelRatio = 1;
              tester.platformDispatcher.textScaleFactorTestValue = scale;
              tester.platformDispatcher.accessibilityFeaturesTestValue =
                  FakeAccessibilityFeatures(disableAnimations: scale == 2);
              addTearDown(tester.view.resetPhysicalSize);
              addTearDown(tester.view.resetDevicePixelRatio);
              addTearDown(
                tester.platformDispatcher.clearTextScaleFactorTestValue,
              );
              addTearDown(
                tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
              );
              final seeks = <Duration>[];
              var plays = 0;
              Widget page(
                LocalPlaybackState state, {
                bool favoriteBusy = false,
              }) => MaterialApp(
                theme: ddiroriTheme(
                  brightness: dark ? Brightness.dark : Brightness.light,
                ),
                home: Scaffold(
                  body: SafeArea(
                    child: SingleChildScrollView(
                      child: PlayNowPlayingControls(
                        state: state,
                        canUseQueue: true,
                        commandRunning: false,
                        onPlayPause: () => plays++,
                        onNext: () {},
                        onPrevious: () {},
                        onStop: () {},
                        onSeek: seeks.add,
                        onShuffle: () {},
                        onRepeat: () {},
                        onToggleFavorite: () {},
                        favorite: true,
                        favoriteBusy: favoriteBusy,
                      ),
                    ),
                  ),
                ),
              );
              await tester.pumpWidget(page(_ready));
              await tester.pumpAndSettle();
              final favorite = tester
                  .getSemantics(find.byTooltip('현재 곡 즐겨찾기 해제'))
                  .getSemanticsData();
              expect(favorite.flagsCollection.isButton, isTrue);
              expect(
                favorite.flagsCollection.isSelected.toBoolOrNull(),
                isTrue,
              );
              expect(favorite.hasAction(ui.SemanticsAction.tap), isTrue);
              final play = find.byTooltip('재생');
              await tester.ensureVisible(play);
              expect(tester.getSize(play).width, greaterThanOrEqualTo(48));
              expect(tester.getSize(play).height, greaterThanOrEqualTo(48));
              await tester.tap(play.hitTestable());
              expect(plays, 1);
              final slider = find.byKey(const ValueKey('playback-progress'));
              await tester.ensureVisible(slider);
              await tester.pumpAndSettle();
              final node = _nodes(
                tester.getSemantics(find.byType(PlayNowPlayingControls)),
              ).singleWhere((n) => n.getSemanticsData().value == '00:20');
              expect(node.getSemanticsData().value, '00:20');
              expect(
                node.getSemanticsData().hasAction(ui.SemanticsAction.increase),
                isTrue,
              );
              tester.binding.performSemanticsAction(
                ui.SemanticsActionEvent(
                  nodeId: node.id,
                  viewId: tester.view.viewId,
                  type: ui.SemanticsAction.increase,
                ),
              );
              await tester.pumpAndSettle();
              expect(seeks, hasLength(1));
              expect(seeks.single, greaterThan(const Duration(seconds: 20)));
              // An accessibility seek is a command; engine position is unchanged until its event.
              expect(_ready.position, const Duration(seconds: 20));
              await tester.pumpWidget(
                page(_ready.copyWith(isEditingQueue: true), favoriteBusy: true),
              );
              await tester.pump();
              final disabled = tester
                  .getSemantics(find.byTooltip('재생'))
                  .getSemanticsData();
              expect(
                disabled.flagsCollection.isEnabled.toBoolOrNull(),
                isFalse,
              );
              expect(disabled.hasAction(ui.SemanticsAction.tap), isFalse);
              expect(
                tester
                    .getSemantics(slider)
                    .getSemanticsData()
                    .hasAction(ui.SemanticsAction.increase),
                isFalse,
              );
              await tester.ensureVisible(find.byType(DdiroriProgress));
              await tester.pump();
              expect(find.bySemanticsLabel(RegExp('대기열 편집 중')), findsWidgets);
              expect(tester.takeException(), isNull);
            } finally {
              handle.dispose();
            }
          },
        );
      }
    }
  }

  testWidgets(
    'queue semantics protect past/current and keyboard dismiss returns focus',
    (tester) async {
      final handle = tester.ensureSemantics();
      try {
        tester.view.physicalSize = const Size(390, 1000);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final snapshot = ValueNotifier(const PlayPlaybackSnapshot(_ready));
        addTearDown(snapshot.dispose);
        var removed = 0, retries = 0;
        await tester.pumpWidget(
          MaterialApp(
            theme: ddiroriTheme(),
            home: PlayPlaybackScope(
              snapshot: snapshot,
              onPlayPause: () async {
                retries++;
              },
              onNext: () async {},
              onStop: () async {},
              onSeek: (_) async {},
              onRemoveQueueItem: (_) async {
                removed++;
              },
              onMoveQueueItem: (_, _) async {},
              onClearUpcoming: () async {},
              child: const Scaffold(
                body: PlayPlaybackLayout(child: Text('탐색 중 Beta')),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final mini = tester
            .getSemantics(find.bySemanticsLabel(RegExp('현재 재생 상세 열기')).first)
            .getSemanticsData();
        expect(mini.flagsCollection.isButton, isTrue);
        expect(mini.label, contains('Alpha'));
        expect(mini.label, isNot(contains('Beta')));
        await tester.tap(find.byTooltip('재생 상세 열기'));
        await tester.pumpAndSettle();
        expect(find.byTooltip('1번 대기열 편집'), findsNothing);
        expect(find.byTooltip('2번 대기열 편집'), findsNothing);
        final current = tester
            .getSemantics(find.byKey(const ValueKey('now-playing-queue-1')))
            .getSemanticsData();
        expect(current.flagsCollection.isSelected.toBoolOrNull(), isTrue);
        expect(current.label, contains('현재 곡'));
        final menu = find.byTooltip('3번 대기열 편집');
        await tester.ensureVisible(menu);
        await tester.pumpAndSettle();
        await tester.tap(menu);
        await tester.pumpAndSettle();
        expect(
          tester
              .getSemantics(find.text('대기열에서 제거'))
              .getSemanticsData()
              .hasAction(ui.SemanticsAction.tap),
          isTrue,
        );
        await tester.sendKeyEvent(LogicalKeyboardKey.escape);
        await tester.pumpAndSettle();
        expect(removed, 0);
        expect(FocusManager.instance.primaryFocus?.context?.mounted, isTrue);
        snapshot.value = PlayPlaybackSnapshot(
          _ready.copyWith(
            playerState: LocalPlayerState.error,
            failure: const LocalPlaybackFailure(
              kind: LocalPlaybackFailureKind.loadFailed,
              userMessage: '대기열을 다시 불러와 주세요.',
            ),
            queueEditError: '편집에 실패했습니다.',
          ),
        );
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.byTooltip('재생 다시 시도'));
        expect(find.textContaining('첫 항목부터 재생합니다'), findsOneWidget);
        expect(
          tester
              .getSemantics(find.byTooltip('재생 다시 시도'))
              .getSemanticsData()
              .hasAction(ui.SemanticsAction.tap),
          isTrue,
        );
        await tester.scrollUntilVisible(
          find.byTooltip('3번 대기열 편집'),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.ensureVisible(find.byTooltip('3번 대기열 편집'));
        await tester.pumpAndSettle();
        expect(
          tester
              .getSemantics(find.byTooltip('3번 대기열 편집'))
              .getSemanticsData()
              .hasAction(ui.SemanticsAction.tap),
          isFalse,
        );
        await tester.ensureVisible(find.byTooltip('재생 다시 시도'));
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('재생 다시 시도'));
        await tester.pumpAndSettle();
        expect(retries, 1);
      } finally {
        handle.dispose();
      }
    },
  );

  testWidgets(
    'IMSLP IME failure retry keeps draft and announces failure, cancel and completion',
    (tester) async {
      final handle = tester.ensureSemantics();
      try {
        final client = _Client();
        await tester.pumpWidget(
          MaterialApp(
            theme: ddiroriTheme(),
            home: ImslpLibraryScreen(
              library: emptyClassicalLibrary,
              store: MemoryImslpStore(),
              client: client,
              onImportLocalFiles: () async => null,
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextField), 'Beethoven');
        await tester.testTextInput.receiveAction(TextInputAction.search);
        await tester.pump();
        expect(client.requests, hasLength(1));
        expect(find.bySemanticsLabel('IMSLP 검색 중'), findsWidgets);
        client.requests.first.completeError(StateError('synthetic failure'));
        await tester.pumpAndSettle();
        expect(
          tester
              .getSemantics(find.byKey(const Key('imslp-status')))
              .getSemanticsData()
              .flagsCollection
              .isLiveRegion,
          isTrue,
        );
        expect(
          tester.widget<TextField>(find.byType(TextField)).controller!.text,
          'Beethoven',
        );
        await tester.showKeyboard(find.byType(TextField));
        expect(
          tester
              .widget<EditableText>(find.byType(EditableText))
              .focusNode
              .hasFocus,
          isTrue,
        );
        await tester.tap(find.text('검색 다시 시도'));
        await tester.pump();
        client.requests.last.complete(const []);
        await tester.pumpAndSettle();
        expect(find.text('일치하는 IMSLP 작품을 찾지 못했습니다.'), findsOneWidget);
        await tester.ensureVisible(find.text('음원 파일 가져오기'));
        await tester.tap(find.text('음원 파일 가져오기'));
        await tester.pumpAndSettle();
        expect(find.text('파일 가져오기를 취소했습니다.'), findsOneWidget);
        expect(
          tester
              .getSemantics(find.byKey(const Key('imslp-status')))
              .getSemanticsData()
              .flagsCollection
              .isLiveRegion,
          isTrue,
        );
        expect(tester.takeException(), isNull);
      } finally {
        handle.dispose();
      }
    },
  );
}

class _Client implements ImslpCatalogClient {
  final requests = <Completer<List<ImslpWorkSearchResult>>>[];
  @override
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 8,
  }) {
    final request = Completer<List<ImslpWorkSearchResult>>();
    requests.add(request);
    return request.future;
  }
}

Iterable<SemanticsNode> _nodes(SemanticsNode node) sync* {
  yield node;
  final children = <SemanticsNode>[];
  node.visitChildren((child) {
    children.add(child);
    return true;
  });
  for (final child in children) {
    yield* _nodes(child);
  }
}
