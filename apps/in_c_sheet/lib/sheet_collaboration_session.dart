enum SheetFollowerSyncStatus {
  idle,
  synced,
  missingScore,
  staleEvent,
  disconnected,
  sessionMismatch,
}

class SheetLeaderPageEvent {
  const SheetLeaderPageEvent({
    required this.sessionId,
    required this.sequence,
    required this.leaderDeviceId,
    required this.setlistId,
    required this.scoreId,
    required this.page,
    required this.timestamp,
  });

  final String sessionId;
  final int sequence;
  final String leaderDeviceId;
  final String setlistId;
  final String scoreId;
  final int page;
  final DateTime timestamp;
}

class SheetFollowerSyncState {
  const SheetFollowerSyncState({
    required this.sessionId,
    required this.lastSequence,
    required this.status,
    this.leaderDeviceId,
    this.setlistId,
    this.scoreId,
    this.page,
    this.message,
    this.updatedAt,
  });

  factory SheetFollowerSyncState.idle(String sessionId) {
    return SheetFollowerSyncState(
      sessionId: sessionId,
      lastSequence: 0,
      status: SheetFollowerSyncStatus.idle,
    );
  }

  final String sessionId;
  final int lastSequence;
  final SheetFollowerSyncStatus status;
  final String? leaderDeviceId;
  final String? setlistId;
  final String? scoreId;
  final int? page;
  final String? message;
  final DateTime? updatedAt;

  SheetFollowerSyncState applyLeaderEvent(
    SheetLeaderPageEvent event, {
    required Set<String> availableScoreIds,
  }) {
    if (event.sessionId != sessionId) {
      return copyWith(
        status: SheetFollowerSyncStatus.sessionMismatch,
        message: '다른 공연 세션의 페이지 전환 요청입니다.',
        updatedAt: event.timestamp,
      );
    }
    if (event.sequence <= lastSequence) {
      return copyWith(
        status: SheetFollowerSyncStatus.staleEvent,
        message: '이미 처리한 이전 페이지 전환 요청입니다.',
        updatedAt: event.timestamp,
      );
    }
    if (!availableScoreIds.contains(event.scoreId)) {
      return copyWith(
        lastSequence: event.sequence,
        leaderDeviceId: event.leaderDeviceId,
        setlistId: event.setlistId,
        status: SheetFollowerSyncStatus.missingScore,
        message: '이 기기에 없는 악보라 페이지를 넘기지 않았습니다.',
        updatedAt: event.timestamp,
      );
    }
    return copyWith(
      lastSequence: event.sequence,
      leaderDeviceId: event.leaderDeviceId,
      setlistId: event.setlistId,
      scoreId: event.scoreId,
      page: event.page,
      status: SheetFollowerSyncStatus.synced,
      message: null,
      updatedAt: event.timestamp,
    );
  }

  SheetFollowerSyncState markDisconnected(DateTime timestamp) {
    return copyWith(
      status: SheetFollowerSyncStatus.disconnected,
      message: '연결이 끊겼습니다. 현재 쪽을 유지합니다.',
      updatedAt: timestamp,
    );
  }

  SheetFollowerSyncState copyWith({
    int? lastSequence,
    SheetFollowerSyncStatus? status,
    String? leaderDeviceId,
    String? setlistId,
    String? scoreId,
    int? page,
    String? message,
    DateTime? updatedAt,
  }) {
    return SheetFollowerSyncState(
      sessionId: sessionId,
      lastSequence: lastSequence ?? this.lastSequence,
      status: status ?? this.status,
      leaderDeviceId: leaderDeviceId ?? this.leaderDeviceId,
      setlistId: setlistId ?? this.setlistId,
      scoreId: scoreId ?? this.scoreId,
      page: page ?? this.page,
      message: message,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
