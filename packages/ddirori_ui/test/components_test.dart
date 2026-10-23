import 'dart:async';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget harness(Widget child, {bool reduced = false}) => MaterialApp(
  theme: ddiroriTheme(),
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: reduced),
    child: Scaffold(body: SingleChildScrollView(child: child)),
  ),
);

void main() {
  testWidgets('selected actions have a visible fill and disabled wins', (
    t,
  ) async {
    await t.pumpWidget(
      harness(DdiroriButton(label: '반복', selected: true, onPressed: () {})),
    );
    final button = t.widget<FilledButton>(find.byType(FilledButton));
    expect(
      button.style!.backgroundColor!.resolve({}),
      Color(DdiroriTokens.light['selection']!),
    );
    expect(
      button.style!.backgroundColor!.resolve({WidgetState.disabled}),
      Color(DdiroriTokens.light['disabled']!),
    );
    final iconStyle = ddiroriTheme().iconButtonTheme.style!;
    expect(
      iconStyle.backgroundColor!.resolve({WidgetState.selected}),
      Color(DdiroriTokens.light['selection']!),
    );
    expect(
      iconStyle.backgroundColor!.resolve({
        WidgetState.selected,
        WidgetState.disabled,
      }),
      Color(DdiroriTokens.light['disabled']!),
    );
  });
  test('semantic typography preserves tracking and neutral modal surfaces', () {
    final theme = ddiroriTheme(brightness: Brightness.dark);
    expect(theme.textTheme.titleLarge!.letterSpacing, closeTo(-0.48, 0.0001));
    expect(theme.textTheme.bodySmall!.fontSize, 14);
    expect(ddiroriTextStyle(DdiroriTextRole.numeric).fontFeatures, isNotEmpty);
    expect(theme.dialogTheme.surfaceTintColor, Colors.transparent);
    expect(theme.dialogTheme.titleTextStyle!.fontSize, 20);
  });
  testWidgets(
    'disabled item excludes keyboard focus as well as pointer actions',
    (t) async {
      final node = FocusNode();
      addTearDown(node.dispose);
      await t.pumpWidget(
        harness(
          DdiroriItem(
            title: '사용 불가',
            enabled: false,
            actions: [
              TextButton(
                focusNode: node,
                onPressed: () {},
                child: const Text('열기'),
              ),
            ],
          ),
        ),
      );
      node.requestFocus();
      await t.pump();
      expect(node.hasFocus, isFalse);
      expect(node.canRequestFocus, isFalse);
    },
  );

  testWidgets('async button blocks duplicate execution and recovers', (
    t,
  ) async {
    final pending = Completer<void>();
    var calls = 0;
    await t.pumpWidget(
      harness(
        DdiroriButton(
          label: '저장',
          onPressed: () {
            calls++;
            return pending.future;
          },
        ),
      ),
    );
    await t.tap(find.text('저장'));
    await t.pump();
    await t.tap(find.byType(FilledButton));
    await t.pump();
    expect(calls, 1);
    expect(t.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);
    pending.complete();
    await t.pumpAndSettle();
    expect(
      t.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNotNull,
    );
  });
  testWidgets('controlled search accepts external query and clear', (t) async {
    var query = '바흐';
    late StateSetter update;
    await t.pumpWidget(
      harness(
        StatefulBuilder(
          builder: (c, set) {
            update = set;
            return DdiroriSearch(
              value: query,
              onChanged: (v) => set(() => query = v),
            );
          },
        ),
      ),
    );
    await t.enterText(find.byType(TextField), '인벤션');
    await t.pump();
    expect(query, '인벤션');
    update(() => query = '평균율');
    await t.pump();
    expect(find.text('평균율'), findsOneWidget);
    await t.tap(find.byTooltip('검색 지우기'));
    await t.pump();
    expect(query, '');
    expect(find.byTooltip('검색 지우기'), findsNothing);
  });
  testWidgets('invalid numeric entry does not emit, valid entry does', (
    t,
  ) async {
    var bpm = 96.0;
    await t.pumpWidget(
      harness(
        StatefulBuilder(
          builder: (c, set) => DdiroriNumber(
            label: '빠르기',
            unit: 'BPM',
            value: bpm,
            min: 40,
            max: 240,
            onChanged: (v) => set(() => bpm = v),
          ),
        ),
      ),
    );
    await t.enterText(find.byType(TextField), '999');
    await t.testTextInput.receiveAction(TextInputAction.done);
    await t.pump();
    expect(bpm, 96);
    expect(find.textContaining('범위로 입력'), findsOneWidget);
    await t.enterText(find.byType(TextField), '120');
    await t.testTextInput.receiveAction(TextInputAction.done);
    await t.pump();
    expect(bpm, 120);
  });
  testWidgets('multi-choice preserves other selections', (t) async {
    var chosen = <int>{1};
    await t.pumpWidget(
      harness(
        StatefulBuilder(
          builder: (c, set) => DdiroriChoices<int>(
            options: const {1: '피아노', 2: '현악'},
            selected: chosen,
            multiple: true,
            onChanged: (v) => set(() => chosen = v),
          ),
        ),
      ),
    );
    await t.tap(find.widgetWithText(FilterChip, '현악'));
    await t.pumpAndSettle();
    expect(chosen, {1, 2});
    await t.tap(find.widgetWithText(FilterChip, '피아노'));
    await t.pump();
    expect(chosen, {2});
  });
  testWidgets('segments expose icons and preserve the selected value', (
    t,
  ) async {
    var selected = <int>{1};
    await t.pumpWidget(
      harness(
        StatefulBuilder(
          builder: (c, set) => DdiroriSegments<int>(
            options: const {1: '작품', 2: '녹음'},
            icons: const {1: Icons.account_tree_outlined, 2: Icons.album},
            selected: selected,
            onChanged: (value) => set(() => selected = value),
          ),
        ),
      ),
    );
    expect(find.byIcon(Icons.account_tree_outlined), findsOneWidget);
    await t.tap(find.text('녹음'));
    await t.pump();
    expect(selected, {2});
  });
  testWidgets('section and metric remain readable at a narrow width', (
    t,
  ) async {
    await t.binding.setSurfaceSize(const Size(320, 640));
    addTearDown(() => t.binding.setSurfaceSize(null));
    await t.pumpWidget(
      harness(
        const DdiroriSection(
          title: '감상 통계',
          subtitle: '최근 감상 기록을 기준으로 계산합니다.',
          trailing: DdiroriStatusBadge(label: '12회'),
          children: [
            DdiroriMetricGroup(
              metrics: [
                DdiroriMetricData(
                  label: '작품',
                  value: '128',
                  icon: Icons.library_music_outlined,
                ),
                DdiroriMetricData(label: '녹음', value: '42'),
              ],
            ),
          ],
        ),
      ),
    );
    expect(find.text('감상 통계'), findsOneWidget);
    expect(find.text('작품'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
  testWidgets('page header and actions stack at 200 percent text', (t) async {
    await t.binding.setSurfaceSize(const Size(320, 640));
    t.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(() {
      t.binding.setSurfaceSize(null);
      t.platformDispatcher.clearTextScaleFactorTestValue();
    });
    await t.pumpWidget(
      harness(
        DdiroriPageHeader(
          title: '나의 클래식 음악 라이브러리',
          subtitle: '긴 작품명과 여러 작업을 함께 확인합니다.',
          actions: [
            DdiroriButton(label: '파일 가져오기', onPressed: () {}),
            DdiroriButton(
              label: '폴더 추가',
              kind: DdiroriButtonKind.secondary,
              onPressed: () {},
            ),
          ],
        ),
      ),
    );
    expect(find.text('나의 클래식 음악 라이브러리'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
  testWidgets('item preserves selection, slots, and secondary action', (
    t,
  ) async {
    var actionCalls = 0;
    await t.pumpWidget(
      harness(
        DdiroriItem(
          title: '교향곡 제9번 라단조 Op. 125',
          subtitle: '루트비히 판 베토벤 · 베를린 필하모닉',
          leading: const Icon(Icons.album),
          trailing: const DdiroriStatusBadge(
            label: '재생 중',
            tone: DdiroriStatusTone.success,
          ),
          selected: true,
          actions: [
            DdiroriIconButton(
              label: '대기열에 추가',
              icon: Icons.playlist_add,
              onPressed: () => actionCalls++,
            ),
          ],
        ),
      ),
    );
    expect(
      t.getSemantics(find.byType(DdiroriItem)),
      matchesSemantics(
        hasSelectedState: true,
        isSelected: true,
        hasEnabledState: true,
        isEnabled: true,
      ),
    );
    expect(find.byIcon(Icons.album), findsOneWidget);
    expect(find.bySemanticsLabel('상태: 재생 중'), findsOneWidget);
    await t.tap(find.byTooltip('대기열에 추가'));
    expect(actionCalls, 1);
  });
  testWidgets('disabled item blocks its row and secondary actions', (t) async {
    var calls = 0;
    await t.pumpWidget(
      harness(
        DdiroriItem(
          title: '사용할 수 없는 파일',
          enabled: false,
          onTap: () => calls++,
          actions: [
            DdiroriIconButton(
              label: '파일 작업',
              icon: Icons.more_vert,
              onPressed: () => calls++,
            ),
          ],
        ),
      ),
    );
    await t.tap(find.text('사용할 수 없는 파일'), warnIfMissed: false);
    await t.tap(find.byTooltip('파일 작업'), warnIfMissed: false);
    expect(calls, 0);
    expect(
      t.getSemantics(find.byType(DdiroriItem)),
      matchesSemantics(
        hasSelectedState: true,
        isSelected: false,
        hasEnabledState: true,
        isEnabled: false,
      ),
    );
  });
  testWidgets('error banner is announced and state panel keeps recovery UI', (
    t,
  ) async {
    await t.pumpWidget(
      harness(
        const Column(
          children: [
            DdiroriBanner(
              message: '파일을 읽을 수 없습니다.',
              kind: DdiroriNoticeKind.error,
            ),
            DdiroriStatePanel(
              title: '음원이 없습니다',
              message: '다른 폴더를 선택해주세요.',
              action: DdiroriButton(label: '폴더 선택', onPressed: null),
            ),
          ],
        ),
      ),
    );
    expect(
      t.getSemantics(find.byType(DdiroriBanner)),
      matchesSemantics(isLiveRegion: true),
    );
    expect(find.text('음원이 없습니다'), findsOneWidget);
    expect(find.text('폴더 선택'), findsOneWidget);
  });
  testWidgets('transport exposes state controls and seek callback', (t) async {
    var toggles = 0;
    var nextCalls = 0;
    Duration? seeked;
    await t.pumpWidget(
      harness(
        DdiroriTransport(
          playing: true,
          position: const Duration(seconds: 30),
          duration: const Duration(minutes: 2),
          onToggle: () => toggles++,
          onNext: () => nextCalls++,
          onSeek: (value) => seeked = value,
        ),
      ),
    );
    expect(find.text('일시정지'), findsOneWidget);
    expect(find.text('00:30'), findsOneWidget);
    expect(find.text('02:00'), findsOneWidget);
    await t.tap(find.text('일시정지'));
    await t.tap(find.byTooltip('다음 트랙'));
    expect(toggles, 1);
    expect(nextCalls, 1);
    t.widget<Slider>(find.byType(Slider)).onChanged!(60000);
    await t.pump();
    t.widget<Slider>(find.byType(Slider)).onChangeEnd!(60000);
    expect(seeked, const Duration(minutes: 1));
  });
  testWidgets('playback progress exposes buffering and compact transport', (
    t,
  ) async {
    await t.pumpWidget(
      harness(
        const Column(
          children: [
            DdiroriPlaybackProgress(
              position: Duration(seconds: 20),
              bufferedPosition: Duration(seconds: 50),
              duration: Duration(minutes: 2),
              statusLabel: '버퍼링 중',
            ),
            DdiroriTransport(
              playing: false,
              onToggle: null,
              duration: Duration(minutes: 3),
              variant: DdiroriTransportVariant.compact,
              statusLabel: '재생 대기',
            ),
          ],
        ),
      ),
    );
    final slider = t.widget<Slider>(find.byType(Slider));
    expect(slider.secondaryTrackValue, 50000);
    expect(find.text('버퍼링 중'), findsOneWidget);
    expect(find.text('재생 대기'), findsOneWidget);
    expect(find.byType(Slider), findsOneWidget);
  });
  testWidgets('page boundaries disable invalid navigation', (t) async {
    var page = 1;
    await t.pumpWidget(
      harness(
        StatefulBuilder(
          builder: (c, set) => DdiroriPageControls(
            page: page,
            pageCount: 2,
            onPrevious: () => set(() => page--),
            onNext: () => set(() => page++),
          ),
        ),
      ),
    );
    final previous = t.widget<IconButton>(
      find
          .ancestor(
            of: find.byTooltip('이전 페이지'),
            matching: find.byType(IconButton),
          )
          .first,
    );
    expect(previous.onPressed, isNull);
    await t.tap(find.byTooltip('다음 페이지'));
    await t.pump();
    expect(page, 2);
    expect(
      t
          .widget<IconButton>(
            find
                .ancestor(
                  of: find.byTooltip('다음 페이지'),
                  matching: find.byType(IconButton),
                )
                .first,
          )
          .onPressed,
      isNull,
    );
  });
  testWidgets('reduced motion keeps indeterminate mark static', (t) async {
    await t.pumpWidget(
      harness(const DdiroriProgress(label: '악보 준비 중'), reduced: true),
    );
    await t.pump(const Duration(seconds: 2));
    expect(t.hasRunningAnimations, isFalse);
    expect(find.text('악보 준비 중'), findsOneWidget);
    final mark = t.widget<DdiroriMark>(find.byType(DdiroriMark));
    expect(mark.pulse, isFalse);
  });
  testWidgets('theme preserves selected primary and separate score ink', (
    t,
  ) async {
    await t.pumpWidget(harness(const Text('기준')));
    final context = t.element(find.text('기준'));
    expect(
      Theme.of(context).colorScheme.primary,
      Color(DdiroriTokens.light['action']!),
    );
    expect(DdiroriTokens.score['notation'], 0xFF202020);
    final dark = ddiroriTheme(brightness: Brightness.dark);
    expect(dark.colorScheme.primary, Color(DdiroriTokens.dark['action']!));
    // Material segments/navigation use secondaryContainer. It must not fall
    // back to the decorative sky color or tint neutral elevated surfaces.
    for (final theme in [ddiroriTheme(), dark]) {
      expect(
        theme.colorScheme.secondaryContainer,
        theme.colorScheme.primaryContainer,
      );
      expect(
        theme.colorScheme.secondaryContainer,
        isNot(theme.colorScheme.secondary),
      );
      expect(theme.colorScheme.surfaceTint, Colors.transparent);
    }
  });
  testWidgets('common surfaces render with the dark theme', (t) async {
    await t.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(brightness: Brightness.dark),
        home: const Scaffold(
          body: DdiroriSection(
            title: '현재 재생',
            children: [
              DdiroriItem(title: '골드베르크 변주곡', selected: true),
              DdiroriBanner(message: '로컬 파일을 재생하고 있습니다.'),
            ],
          ),
        ),
      ),
    );
    final context = t.element(find.text('현재 재생'));
    expect(Theme.of(context).brightness, Brightness.dark);
    expect(t.takeException(), isNull);
  });
  testWidgets('components fall back safely during incremental adoption', (
    t,
  ) async {
    await t.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: DdiroriButton(label: '기본 테마', onPressed: null)),
      ),
    );
    expect(find.text('기본 테마'), findsOneWidget);
    expect(t.takeException(), isNull);
  });
  testWidgets('sheet has an accessible closing action', (t) async {
    await t.pumpWidget(
      harness(
        Builder(
          builder: (c) => DdiroriButton(
            label: '열기',
            onPressed: () => showDdiroriSheet<void>(
              context: c,
              title: '설정',
              child: const Text('본문'),
              actions: [
                DdiroriButton(
                  label: '완료',
                  onPressed: () => Navigator.of(c).pop(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    await t.tap(find.text('열기'));
    await t.pumpAndSettle();
    expect(find.text('본문'), findsOneWidget);
    await t.tap(find.text('완료'));
    await t.pumpAndSettle();
    expect(find.text('본문'), findsNothing);
  });
  testWidgets('confirmation dialog returns the selected result', (t) async {
    bool? result;
    await t.pumpWidget(
      harness(
        Builder(
          builder: (context) => DdiroriButton(
            label: '삭제 열기',
            onPressed: () async {
              result = await showDdiroriConfirmDialog(
                context: context,
                title: '기록 삭제',
                message: '선택한 기록을 삭제할까요?',
                confirmLabel: '삭제',
                danger: true,
              );
            },
          ),
        ),
      ),
    );
    await t.tap(find.text('삭제 열기'));
    await t.pumpAndSettle();
    expect(find.text('선택한 기록을 삭제할까요?'), findsOneWidget);
    await t.tap(find.text('삭제'));
    await t.pumpAndSettle();
    expect(result, isTrue);
  });
  testWidgets('unavailable service cannot invoke navigation', (t) async {
    var calls = 0;
    await t.pumpWidget(
      harness(
        DdiroriServiceLink(
          product: DdiroriProduct.play,
          name: '띠로리 플레이',
          description: '관련 연주',
          availability: DdiroriServiceAvailability.unavailable,
          onOpen: () => calls++,
        ),
      ),
    );
    await t.tap(find.text('연결 준비 중'));
    expect(calls, 0);
    expect(
      t.widget<OutlinedButton>(find.byType(OutlinedButton)).onPressed,
      isNull,
    );
  });
}
