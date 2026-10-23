import 'package:classical_local_library/library_discovery.dart';
import 'package:classical_local_library/playback_history.dart';
import 'package:classical_local_library/presentation/play_activity_components.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('스캔 위치는 경로를 노출하지 않고 동작을 전달한다', (tester) async {
    var rescans = 0;
    var toggles = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: Scaffold(
          body: PlayScanLocationRow(
            location: const ScanLocation(
              id: 'location-1',
              path: '/Users/listener/private/Music',
              displayName: '내 음악',
              createdAtMillis: 1,
              lastScannedAtMillis: 2,
              lastScanFileCount: 18,
            ),
            busy: false,
            onRescan: () => rescans += 1,
            onToggleActive: () => toggles += 1,
          ),
        ),
      ),
    );

    expect(find.textContaining('/Users/'), findsNothing);
    expect(find.bySemanticsLabel('상태: 활성'), findsOneWidget);
    await tester.tap(find.byTooltip('다시 스캔'));
    await tester.tap(find.byTooltip('비활성화'));
    expect(rescans, 1);
    expect(toggles, 1);

    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(),
        home: Scaffold(
          body: PlayScanLocationRow(
            location: const ScanLocation(
              id: 'location-1',
              path: '/Users/listener/private/Music',
              displayName: '내 음악',
              createdAtMillis: 1,
            ),
            busy: true,
            onRescan: () => rescans += 1,
            onToggleActive: () => toggles += 1,
          ),
        ),
      ),
    );
    await tester.tap(find.byTooltip('다시 스캔'), warnIfMissed: false);
    await tester.tap(find.byTooltip('비활성화'), warnIfMissed: false);
    expect(rescans, 1);
    expect(toggles, 1);
  });

  testWidgets('Discovery와 감상 항목은 상태와 callback을 유지한다', (tester) async {
    var discoverySelections = 0;
    var continuations = 0;
    var deletions = 0;
    final entry = _historyEntry();
    await tester.pumpWidget(
      MaterialApp(
        theme: ddiroriTheme(brightness: Brightness.dark),
        home: Scaffold(
          body: ListView(
            children: [
              PlayDiscoveryResultRow(
                result: const DiscoveryResult(
                  type: DiscoveryResultType.recording,
                  id: 'recording-1',
                  title: '클라이버 1974',
                  reason: '같은 작품의 다른 녹음',
                ),
                onOpen: () => discoverySelections += 1,
                onPlay: () {},
              ),
              PlayListeningHistoryRow(
                entry: entry,
                busy: false,
                canContinue: true,
                onContinue: () => continuations += 1,
                onDelete: () => deletions += 1,
              ),
              const PlayListeningStatisticRow(
                group: PlaybackHistoryGroupStatistics(
                  id: 'work-1',
                  title: '교향곡 5번 단조, Op. 67',
                  listenedMillis: 7200000,
                  sessionCount: 3,
                  completedSessionCount: 2,
                  lastPlayedAtMillis: 1,
                ),
                icon: Icons.library_music_outlined,
              ),
            ],
          ),
        ),
      ),
    );

    await tester.tap(find.text('클라이버 1974'));
    await tester.tap(find.byTooltip('이어 듣기'));
    await tester.tap(find.byTooltip('감상 기록 삭제'));
    expect(discoverySelections, 1);
    expect(continuations, 1);
    expect(deletions, 1);
    expect(find.bySemanticsLabel('상태: 일부 감상'), findsOneWidget);
  });

  for (final fixture in const [
    (width: 320.0, height: 900.0, scale: 2.0),
    (width: 1024.0, height: 1366.0, scale: 1.0),
  ]) {
    testWidgets('활동 컴포넌트 ${fixture.width.toInt()}px ${fixture.scale}x 텍스트', (
      tester,
    ) async {
      tester.view.physicalSize = Size(fixture.width, fixture.height);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          theme: ddiroriTheme(),
          home: MediaQuery(
            data: MediaQueryData(
              size: Size(fixture.width, fixture.height),
              textScaler: TextScaler.linear(fixture.scale),
            ),
            child: Scaffold(
              body: SingleChildScrollView(
                child: Column(
                  children: [
                    PlayDiscoveryResultRow(
                      result: const DiscoveryResult(
                        type: DiscoveryResultType.work,
                        id: 'long-work',
                        title: '교향곡 제9번 단조 “합창”, Symphony No. 9 in D minor',
                        reason: '최근 감상과 같은 작곡가의 다른 작품',
                      ),
                      onOpen: _noop,
                      onPlay: _noop,
                    ),
                    PlayListeningHistoryRow(
                      entry: _historyEntry(),
                      busy: false,
                      canContinue: false,
                      unavailableReason: '연결된 악장 파일이 없습니다.',
                      onContinue: _noop,
                      onDelete: _noop,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(tester.takeException(), isNull);
    });
  }
}

PlaybackHistoryEntry _historyEntry() => PlaybackHistoryEntry(
  sessionId: 'session-1',
  trackId: 'track-1',
  recordingId: 'recording-1',
  workId: 'work-1',
  path: '/Users/listener/private/history.flac',
  workTitle: '교향곡 5번 단조, Op. 67',
  recordingTitle: '빈 필하모닉 오케스트라 녹음',
  trackTitle: 'I. Allegro con brio',
  startedAtMillis: 1000,
  lastPlayedAtMillis: 2000,
  listenedMillis: 90000,
  lastPositionMillis: 30000,
  durationMillis: 120000,
  status: PlaybackHistoryStatus.partial,
);

void _noop() {}
