import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_collaboration_session.dart';

void main() {
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
