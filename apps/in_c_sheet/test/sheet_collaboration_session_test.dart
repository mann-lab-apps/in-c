import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_collaboration_session.dart';

void main() {
  test('preflight flags missing follower scores before collaboration', () {
    final check = SheetCollaborationPreflightCheck.forSetlist(
      setlistId: 'setlist-a',
      leaderScoreIds: ['score-a', 'score-b', 'score-a', ' '],
      followerScoreIds: {'score-a'},
    );

    expect(check.setlistId, 'setlist-a');
    expect(check.totalScoreCount, 2);
    expect(check.availableScoreIds, ['score-a']);
    expect(check.missingScoreIds, ['score-b']);
    expect(check.canFollow, isFalse);
    expect(check.headline, '팔로워 기기에 없는 악보 1개');
    expect(check.reviewLines, contains('총 2곡 중 1곡만 이 기기에 있습니다.'));
  });

  test('preflight allows complete follower score sets', () {
    final check = SheetCollaborationPreflightCheck.forSetlist(
      setlistId: 'setlist-a',
      leaderScoreIds: ['score-a', 'score-b'],
      followerScoreIds: {'score-b', 'score-a', 'other-score'},
    );

    expect(check.totalScoreCount, 2);
    expect(check.availableScoreIds, ['score-a', 'score-b']);
    expect(check.missingScoreIds, isEmpty);
    expect(check.canFollow, isTrue);
    expect(check.headline, '팔로워 기기가 모든 악보를 갖고 있습니다.');
    expect(check.reviewLines, contains('총 2곡을 안전하게 따라갈 수 있습니다.'));
  });

  test('preflight blocks empty leader setlists', () {
    final check = SheetCollaborationPreflightCheck.forSetlist(
      setlistId: 'setlist-a',
      leaderScoreIds: const <String>[],
      followerScoreIds: {'score-a'},
    );

    expect(check.totalScoreCount, 0);
    expect(check.availableScoreIds, isEmpty);
    expect(check.missingScoreIds, isEmpty);
    expect(check.canFollow, isFalse);
    expect(check.headline, '동기화할 세트리스트 곡이 없습니다.');
  });

  test('collaboration invite payload round trips for QR pairing', () {
    final createdAt = DateTime.utc(2026, 10, 2, 12);
    final invite = SheetCollaborationInvite(
      sessionId: 'session-1',
      leaderDeviceId: 'leader-a',
      setlistId: 'setlist-a',
      createdAt: createdAt,
      expiresAt: createdAt.add(const Duration(minutes: 5)),
    );

    final decoded = SheetCollaborationInvite.decodePayload(
      invite.toPayload(),
      now: createdAt.add(const Duration(minutes: 1)),
    );

    expect(decoded.isValid, isTrue);
    expect(decoded.status, SheetCollaborationInviteStatus.valid);
    expect(decoded.invite?.sessionId, 'session-1');
    expect(decoded.invite?.leaderDeviceId, 'leader-a');
    expect(decoded.invite?.setlistId, 'setlist-a');
    expect(decoded.invite?.createdAt, createdAt);
    expect(
      decoded.invite?.expiresAt,
      createdAt.add(const Duration(minutes: 5)),
    );
    expect(decoded.message, isNull);
  });

  test('collaboration invite rejects expired codes', () {
    final createdAt = DateTime.utc(2026, 10, 2, 12);
    final invite = SheetCollaborationInvite(
      sessionId: 'session-1',
      leaderDeviceId: 'leader-a',
      setlistId: 'setlist-a',
      createdAt: createdAt,
      expiresAt: createdAt.add(const Duration(minutes: 5)),
    );

    final decoded = SheetCollaborationInvite.decodePayload(
      invite.toPayload(),
      now: createdAt.add(const Duration(minutes: 5)),
    );

    expect(decoded.status, SheetCollaborationInviteStatus.expired);
    expect(decoded.invite?.sessionId, 'session-1');
    expect(decoded.message, contains('만료'));
  });

  test('collaboration invite rejects unsupported versions', () {
    final payload = SheetCollaborationInvite(
      sessionId: 'session-1',
      leaderDeviceId: 'leader-a',
      setlistId: 'setlist-a',
      createdAt: DateTime.utc(2026, 10, 2, 12),
      expiresAt: DateTime.utc(2026, 10, 2, 12, 5),
      version: 99,
    ).toPayload();

    final decoded = SheetCollaborationInvite.decodePayload(
      payload,
      now: DateTime.utc(2026, 10, 2, 12, 1),
    );

    expect(decoded.status, SheetCollaborationInviteStatus.unsupportedVersion);
    expect(decoded.invite, isNull);
    expect(decoded.message, contains('지원하지 않는'));
  });

  test('collaboration invite rejects malformed codes', () {
    final decoded = SheetCollaborationInvite.decodePayload(
      'not-json',
      now: DateTime.utc(2026, 10, 2, 12),
    );

    expect(decoded.status, SheetCollaborationInviteStatus.malformed);
    expect(decoded.invite, isNull);
  });

  test('collaboration invite requires session fields and valid lifetime', () {
    final decoded = SheetCollaborationInvite.decodePayload(
      '{"scope":"clef.collaboration.invite","version":1,'
      '"sessionId":"session-1","leaderDeviceId":"leader-a",'
      '"createdAt":"2026-10-02T12:05:00Z",'
      '"expiresAt":"2026-10-02T12:00:00Z"}',
      now: DateTime.utc(2026, 10, 2, 12),
    );

    expect(decoded.status, SheetCollaborationInviteStatus.malformed);
    expect(decoded.message, contains('필요한 공연 세션 정보'));
  });

  test('collaboration invite QR plan renders a scannable module matrix', () {
    final now = DateTime.utc(2026, 10, 2, 12);
    final invite = SheetCollaborationInvite(
      sessionId: 'session-1',
      leaderDeviceId: 'leader-a',
      setlistId: 'setlist-a',
      createdAt: now,
      expiresAt: now.add(const Duration(minutes: 5)),
    );

    final plan = SheetCollaborationInviteQrPlan.forInvite(invite);

    expect(plan.canRenderQr, isTrue);
    expect(plan.payloadBytes, greaterThan(0));
    expect(plan.moduleCount, greaterThanOrEqualTo(21));
    expect(plan.minimumPixelSize, plan.moduleCount * 4);
    expect(plan.darkModuleCount, greaterThan(0));
    expect(plan.modules, hasLength(plan.moduleCount));
    expect(plan.modules.first, hasLength(plan.moduleCount));
    expect(plan.modules.first.first, isTrue);
    expect(plan.reviewLines, contains(contains('QR')));

    final decoded = SheetCollaborationInvite.decodePayload(
      plan.copyFallbackPayload,
      now: now.add(const Duration(minutes: 1)),
    );
    expect(decoded.isValid, isTrue);
    expect(decoded.invite?.setlistId, 'setlist-a');
  });

  test(
    'collaboration invite QR plan falls back to copy for large payloads',
    () {
      final now = DateTime.utc(2026, 10, 2, 12);
      final invite = SheetCollaborationInvite(
        sessionId: 'session-${'x' * 950}',
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        createdAt: now,
        expiresAt: now.add(const Duration(minutes: 5)),
      );

      final plan = SheetCollaborationInviteQrPlan.forInvite(invite);

      expect(plan.canRenderQr, isFalse);
      expect(plan.moduleCount, 0);
      expect(plan.modules, isEmpty);
      expect(plan.copyFallbackPayload, invite.toPayload());
      expect(plan.reviewLines, contains(contains('코드 복사')));
    },
  );

  test(
    'collaboration session preview combines invite, preflight and state',
    () {
      final now = DateTime.utc(2026, 10, 2, 12);
      final preview = SheetCollaborationSessionPreview.forInvite(
        invite: SheetCollaborationInvite(
          sessionId: 'session-1',
          leaderDeviceId: 'leader-a',
          setlistId: 'setlist-a',
          createdAt: now,
          expiresAt: now.add(const Duration(minutes: 5)),
        ),
        leaderScoreIds: ['score-a', 'score-b'],
        followerScoreIds: {'score-a', 'score-b'},
      );

      expect(preview.canShareInvite, isTrue);
      expect(preview.canStartLocalSimulation, isTrue);
      expect(preview.blockingReasons, isEmpty);
      expect(preview.preflightCheck.canFollow, isTrue);
      expect(preview.qrPlan.canRenderQr, isTrue);
      expect(preview.followerReview.headline, '리더 기기 연결 대기 중');
      expect(preview.reviewLines, contains('세션 session-1'));
      expect(preview.reviewLines, contains('총 2곡을 안전하게 따라갈 수 있습니다.'));
    },
  );

  test('collaboration session preview blocks missing or attention states', () {
    final now = DateTime.utc(2026, 10, 2, 12);
    final synced = SheetFollowerSyncState.idle('session-1').applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 1,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 2,
        timestamp: now,
      ),
      availableScoreIds: {'score-a'},
    );
    final disconnected = synced.markDisconnected(
      now.add(const Duration(seconds: 1)),
    );

    final preview = SheetCollaborationSessionPreview.forInvite(
      invite: SheetCollaborationInvite(
        sessionId: 'session-1',
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        createdAt: now,
        expiresAt: now.add(const Duration(minutes: 5)),
      ),
      leaderScoreIds: ['score-a', 'score-b'],
      followerScoreIds: {'score-a'},
      followerState: disconnected,
    );

    expect(preview.canShareInvite, isTrue);
    expect(preview.canStartLocalSimulation, isFalse);
    expect(preview.blockingReasons, ['팔로워 기기에 없는 악보 1개', '연결 끊김']);
    expect(preview.reviewLines, contains('연결 끊김'));
  });

  test('local simulator applies leader pages through the follower reducer', () {
    final now = DateTime.utc(2026, 10, 2, 12);
    final simulator = SheetCollaborationLocalSimulator(
      invite: SheetCollaborationInvite(
        sessionId: 'session-1',
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        createdAt: now,
        expiresAt: now.add(const Duration(minutes: 5)),
      ),
      followerScoreIds: {'score-a'},
    );

    final first = simulator.applyLeaderPage(
      scoreId: 'score-a',
      page: 2,
      timestamp: now.add(const Duration(seconds: 1)),
    );
    final second = simulator.applyLeaderPage(
      scoreId: 'score-a',
      page: 3,
      timestamp: now.add(const Duration(seconds: 2)),
    );

    expect(first.status, SheetFollowerSyncStatus.synced);
    expect(first.lastSequence, 1);
    expect(first.page, 2);
    expect(second.status, SheetFollowerSyncStatus.synced);
    expect(second.lastSequence, 2);
    expect(second.page, 3);
    expect(simulator.state.page, 3);
  });

  test('local simulator keeps page when leader points to a missing score', () {
    final now = DateTime.utc(2026, 10, 2, 12);
    final simulator =
        SheetCollaborationLocalSimulator(
          invite: SheetCollaborationInvite(
            sessionId: 'session-1',
            leaderDeviceId: 'leader-a',
            setlistId: 'setlist-a',
            createdAt: now,
            expiresAt: now.add(const Duration(minutes: 5)),
          ),
          followerScoreIds: {'score-a'},
        )..applyLeaderPage(
          scoreId: 'score-a',
          page: 2,
          timestamp: now.add(const Duration(seconds: 1)),
        );

    final missing = simulator.applyLeaderPage(
      scoreId: 'score-b',
      page: 1,
      timestamp: now.add(const Duration(seconds: 2)),
    );

    expect(missing.status, SheetFollowerSyncStatus.missingScore);
    expect(missing.lastSequence, 2);
    expect(missing.scoreId, 'score-a');
    expect(missing.page, 2);
  });

  test('local simulator can recover after follower library gains score', () {
    final now = DateTime.utc(2026, 10, 2, 12);
    final simulator =
        SheetCollaborationLocalSimulator(
          invite: SheetCollaborationInvite(
            sessionId: 'session-1',
            leaderDeviceId: 'leader-a',
            setlistId: 'setlist-a',
            createdAt: now,
            expiresAt: now.add(const Duration(minutes: 5)),
          ),
          followerScoreIds: {'score-a'},
        )..applyLeaderPage(
          scoreId: 'score-b',
          page: 1,
          timestamp: now.add(const Duration(seconds: 1)),
        );

    simulator.replaceFollowerScoreIds({'score-a', 'score-b'});
    final recovered = simulator.applyLeaderPage(
      scoreId: 'score-b',
      page: 2,
      timestamp: now.add(const Duration(seconds: 2)),
    );

    expect(recovered.status, SheetFollowerSyncStatus.synced);
    expect(recovered.lastSequence, 2);
    expect(recovered.scoreId, 'score-b');
    expect(recovered.page, 2);
  });

  test('local simulator disconnect preserves last page', () {
    final now = DateTime.utc(2026, 10, 2, 12);
    final simulator =
        SheetCollaborationLocalSimulator(
          invite: SheetCollaborationInvite(
            sessionId: 'session-1',
            leaderDeviceId: 'leader-a',
            setlistId: 'setlist-a',
            createdAt: now,
            expiresAt: now.add(const Duration(minutes: 5)),
          ),
          followerScoreIds: {'score-a'},
        )..applyLeaderPage(
          scoreId: 'score-a',
          page: 2,
          timestamp: now.add(const Duration(seconds: 1)),
        );

    final disconnected = simulator.markDisconnected(
      now.add(const Duration(seconds: 2)),
    );

    expect(disconnected.status, SheetFollowerSyncStatus.disconnected);
    expect(disconnected.scoreId, 'score-a');
    expect(disconnected.page, 2);
    expect(disconnected.message, contains('현재 쪽'));
  });

  test('local simulation report summarizes recovery after missing scores', () {
    final now = DateTime.utc(2026, 10, 13, 12);
    final report = SheetCollaborationLocalSimulationReport.run(
      invite: SheetCollaborationInvite(
        sessionId: 'session-1',
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        createdAt: now,
        expiresAt: now.add(const Duration(minutes: 5)),
      ),
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

    expect(report.steps, hasLength(4));
    expect(report.steps[1].state.status, SheetFollowerSyncStatus.missingScore);
    expect(report.steps[1].requiresAttention, isTrue);
    expect(report.attentionStepCount, 2);
    expect(report.finalState.status, SheetFollowerSyncStatus.synced);
    expect(report.finalState.scoreId, 'score-b');
    expect(report.finalState.page, 2);
    expect(report.finalRequiresAttention, isFalse);
    expect(report.headline, '중간에 확인할 상태가 있었지만 마지막 상태는 동기화되었습니다.');
    expect(report.reviewLines, contains('확인 필요 2단계'));
  });

  test('local simulation report keeps disconnect as final attention state', () {
    final now = DateTime.utc(2026, 10, 13, 12);
    final report = SheetCollaborationLocalSimulationReport.run(
      invite: SheetCollaborationInvite(
        sessionId: 'session-1',
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        createdAt: now,
        expiresAt: now.add(const Duration(minutes: 5)),
      ),
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

    expect(report.steps, hasLength(2));
    expect(report.finalState.status, SheetFollowerSyncStatus.disconnected);
    expect(report.finalState.scoreId, 'score-a');
    expect(report.finalState.page, 3);
    expect(report.finalRequiresAttention, isTrue);
    expect(report.headline, '마지막 상태에 확인이 필요합니다.');
    expect(report.reviewLines, contains('연결 끊김'));
  });

  test('follower applies newer leader page events for available scores', () {
    final now = DateTime(2026, 10, 2, 20);
    final state = SheetFollowerSyncState.idle('session-1');

    final next = state.applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 1,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 4,
        timestamp: now,
      ),
      availableScoreIds: {'score-a'},
    );

    expect(next.status, SheetFollowerSyncStatus.synced);
    expect(next.lastSequence, 1);
    expect(next.leaderDeviceId, 'leader-a');
    expect(next.setlistId, 'setlist-a');
    expect(next.scoreId, 'score-a');
    expect(next.page, 4);
    expect(next.message, isNull);
    expect(next.updatedAt, now);
  });

  test('follower ignores stale or out-of-order leader page events', () {
    final now = DateTime(2026, 10, 2, 20);
    final state = SheetFollowerSyncState.idle('session-1').applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 5,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 8,
        timestamp: now,
      ),
      availableScoreIds: {'score-a'},
    );

    final stale = state.applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 4,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 2,
        timestamp: now.add(const Duration(seconds: 1)),
      ),
      availableScoreIds: {'score-a'},
    );

    expect(stale.status, SheetFollowerSyncStatus.staleEvent);
    expect(stale.lastSequence, 5);
    expect(stale.scoreId, 'score-a');
    expect(stale.page, 8);
    expect(stale.message, contains('이전 페이지 전환'));
  });

  test('follower records missing scores without moving to a wrong score', () {
    final now = DateTime(2026, 10, 2, 20);
    final state = SheetFollowerSyncState.idle('session-1').applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 1,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 3,
        timestamp: now,
      ),
      availableScoreIds: {'score-a'},
    );

    final missing = state.applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 2,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-missing',
        page: 1,
        timestamp: now.add(const Duration(seconds: 1)),
      ),
      availableScoreIds: {'score-a'},
    );

    expect(missing.status, SheetFollowerSyncStatus.missingScore);
    expect(missing.lastSequence, 2);
    expect(missing.scoreId, 'score-a');
    expect(missing.page, 3);
    expect(missing.message, contains('없는 악보'));
  });

  test('follower rejects page events from another session', () {
    final now = DateTime(2026, 10, 2, 20);
    final state = SheetFollowerSyncState.idle('session-1');

    final mismatch = state.applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-other',
        sequence: 1,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 2,
        timestamp: now,
      ),
      availableScoreIds: {'score-a'},
    );

    expect(mismatch.status, SheetFollowerSyncStatus.sessionMismatch);
    expect(mismatch.lastSequence, 0);
    expect(mismatch.scoreId, isNull);
    expect(mismatch.page, isNull);
    expect(mismatch.message, contains('다른 공연 세션'));
  });

  test('disconnect keeps the last synced page visible', () {
    final now = DateTime(2026, 10, 2, 20);
    final state = SheetFollowerSyncState.idle('session-1').applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 1,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 7,
        timestamp: now,
      ),
      availableScoreIds: {'score-a'},
    );

    final disconnected = state.markDisconnected(
      now.add(const Duration(seconds: 2)),
    );

    expect(disconnected.status, SheetFollowerSyncStatus.disconnected);
    expect(disconnected.scoreId, 'score-a');
    expect(disconnected.page, 7);
    expect(disconnected.message, contains('현재 쪽'));
  });

  test('follower sync review explains normal and blocking states', () {
    final now = DateTime(2026, 10, 2, 20);
    final synced = SheetFollowerSyncState.idle('session-1').applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 1,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-a',
        page: 3,
        timestamp: now,
      ),
      availableScoreIds: {'score-a'},
    );
    final missing = synced.applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: 'session-1',
        sequence: 2,
        leaderDeviceId: 'leader-a',
        setlistId: 'setlist-a',
        scoreId: 'score-b',
        page: 1,
        timestamp: now.add(const Duration(seconds: 1)),
      ),
      availableScoreIds: {'score-a'},
    );

    final syncedReview = SheetFollowerSyncReview.fromState(synced);
    final missingReview = SheetFollowerSyncReview.fromState(missing);
    final disconnectedReview = SheetFollowerSyncReview.fromState(
      synced.markDisconnected(now.add(const Duration(seconds: 2))),
    );

    expect(syncedReview.headline, '리더 기기를 따라가는 중');
    expect(syncedReview.requiresAttention, isFalse);
    expect(syncedReview.reviewLines, contains('현재 3쪽'));
    expect(missingReview.headline, '팔로워 기기에 없는 악보');
    expect(missingReview.requiresAttention, isTrue);
    expect(missingReview.reviewLines, contains(contains('세트리스트 패키지')));
    expect(disconnectedReview.headline, '연결 끊김');
    expect(disconnectedReview.requiresAttention, isTrue);
  });
}
