import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_collaboration_session.dart';

void main() {
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
}
