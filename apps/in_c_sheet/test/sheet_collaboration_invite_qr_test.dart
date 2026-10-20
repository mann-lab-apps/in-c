import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_collaboration_invite_qr.dart';
import 'package:in_c_sheet/sheet_collaboration_session.dart';

void main() {
  testWidgets('collaboration session preview enables safe local simulation', (
    tester,
  ) async {
    var started = false;
    var copied = false;
    final preview = SheetCollaborationSessionPreview.forInvite(
      invite: _invite(sessionId: 'session-a'),
      leaderScoreIds: ['score-a', 'score-b'],
      followerScoreIds: {'score-a', 'score-b'},
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SheetCollaborationSessionPreviewView(
            preview: preview,
            onStartLocalSimulation: () {
              started = true;
            },
            onCopyFallback: () {
              copied = true;
            },
          ),
        ),
      ),
    );

    expect(find.text('협업 세션 미리보기'), findsOneWidget);
    expect(find.text('팔로워 기기가 모든 악보를 갖고 있습니다.'), findsOneWidget);
    expect(find.text('리더 기기 연결 대기 중'), findsOneWidget);
    expect(find.text('시작 전 확인 필요'), findsNothing);
    expect(_qrPaint, findsOneWidget);

    await tester.ensureVisible(find.widgetWithText(OutlinedButton, '코드 복사'));
    await tester.tap(find.widgetWithText(OutlinedButton, '코드 복사'));
    expect(copied, isTrue);
    await tester.ensureVisible(
      find.widgetWithText(FilledButton, '로컬 시뮬레이션 시작'),
    );
    await tester.tap(find.widgetWithText(FilledButton, '로컬 시뮬레이션 시작'));
    expect(started, isTrue);
  });

  testWidgets('collaboration session preview explains blocking reasons', (
    tester,
  ) async {
    var started = false;
    final now = DateTime.utc(2026, 10, 13, 12);
    final synced = SheetFollowerSyncState.idle('session-a').applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-a',
        sequence: 1,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 2,
        timestamp: now,
      ),
      availableScoreIds: {'score-a'},
    );
    final preview = SheetCollaborationSessionPreview.forInvite(
      invite: _invite(sessionId: 'session-a'),
      leaderScoreIds: ['score-a', 'score-b'],
      followerScoreIds: {'score-a'},
      followerState: synced.markDisconnected(
        now.add(const Duration(seconds: 1)),
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SheetCollaborationSessionPreviewView(
            preview: preview,
            onStartLocalSimulation: () {
              started = true;
            },
          ),
        ),
      ),
    );

    expect(find.text('시작 전 확인 필요'), findsOneWidget);
    expect(find.text('팔로워 기기에 없는 악보 1개'), findsNWidgets(2));
    expect(find.text('연결 끊김'), findsNWidgets(2));

    final startButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, '로컬 시뮬레이션 시작'),
    );
    expect(startButton.onPressed, isNull);
    expect(started, isFalse);
  });

  testWidgets('collaboration simulation report shows recovery summary', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 10, 13, 12);
    final report = SheetCollaborationLocalSimulationReport.run(
      invite: _invite(sessionId: 'session-a'),
      initialFollowerScoreIds: {'score-a'},
      actions: <SheetCollaborationSimulationAction>[
        SheetCollaborationSimulationAction.leaderPage(
          scoreId: 'score-a',
          page: 1,
          timestamp: now.add(const Duration(seconds: 1)),
        ),
        SheetCollaborationSimulationAction.leaderPage(
          scoreId: 'score-b',
          page: 1,
          timestamp: now.add(const Duration(seconds: 2)),
        ),
        SheetCollaborationSimulationAction.replaceFollowerScores(
          scoreIds: {'score-a', 'score-b'},
          timestamp: now.add(const Duration(seconds: 3)),
        ),
        SheetCollaborationSimulationAction.leaderPage(
          scoreId: 'score-b',
          page: 2,
          timestamp: now.add(const Duration(seconds: 4)),
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SheetCollaborationSimulationReportView(report: report),
        ),
      ),
    );

    expect(find.text('협업 시뮬레이션 결과'), findsOneWidget);
    expect(find.text('요약'), findsOneWidget);
    expect(find.text('확인 필요 2단계'), findsOneWidget);
    expect(find.text('리더: score-b 2쪽'), findsOneWidget);
    expect(find.text('리더 기기를 따라가는 중'), findsWidgets);
  });

  testWidgets('collaboration simulation report highlights final disconnect', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 10, 13, 12);
    final report = SheetCollaborationLocalSimulationReport.run(
      invite: _invite(sessionId: 'session-a'),
      initialFollowerScoreIds: {'score-a'},
      actions: <SheetCollaborationSimulationAction>[
        SheetCollaborationSimulationAction.leaderPage(
          scoreId: 'score-a',
          page: 3,
          timestamp: now.add(const Duration(seconds: 1)),
        ),
        SheetCollaborationSimulationAction.disconnect(
          timestamp: now.add(const Duration(seconds: 2)),
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SheetCollaborationSimulationReportView(report: report),
        ),
      ),
    );

    expect(find.text('마지막 상태에 확인이 필요합니다.'), findsOneWidget);
    expect(find.text('연결 끊김'), findsNWidgets(2));
    expect(find.text('연결 끊김 시뮬레이션'), findsOneWidget);
  });

  testWidgets('collaboration QR view renders matrix and copy fallback action', (
    tester,
  ) async {
    var copied = false;
    final plan = SheetCollaborationInviteQrPlan.forInvite(
      _invite(sessionId: 'session-a'),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SheetCollaborationInviteQrView(
            plan: plan,
            onCopyFallback: () {
              copied = true;
            },
          ),
        ),
      ),
    );

    expect(find.text('초대 QR'), findsOneWidget);
    expect(_qrPaint, findsOneWidget);
    expect(find.textContaining('모듈'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, '코드 복사'), findsOneWidget);

    await tester.tap(find.widgetWithText(OutlinedButton, '코드 복사'));
    expect(copied, isTrue);
  });

  testWidgets('collaboration QR view shows selectable copy payload fallback', (
    tester,
  ) async {
    final invite = _invite(sessionId: 'session-${'x' * 950}');
    final plan = SheetCollaborationInviteQrPlan.forInvite(invite);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: SheetCollaborationInviteQrView(plan: plan)),
      ),
    );

    expect(find.text('초대 코드'), findsOneWidget);
    expect(_qrPaint, findsNothing);
    expect(find.byType(SelectableText), findsOneWidget);
    expect(find.textContaining('코드 복사'), findsOneWidget);
    expect(find.textContaining('session-'), findsOneWidget);
  });
}

final Finder _qrPaint = find.byWidgetPredicate(
  (widget) =>
      widget is CustomPaint &&
      widget.painter is SheetCollaborationInviteQrPainter,
);

SheetCollaborationInvite _invite({required String sessionId}) {
  final now = DateTime.utc(2026, 10, 13, 12);
  return SheetCollaborationInvite(
    sessionId: sessionId,
    leaderDeviceId: 'leader-a',
    setlistId: 'setlist-a',
    createdAt: now,
    expiresAt: now.add(const Duration(minutes: 5)),
  );
}
