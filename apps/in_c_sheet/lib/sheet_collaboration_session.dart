import 'dart:convert';

const String sheetCollaborationInviteScope = 'clef.collaboration.invite';
const int sheetCollaborationInviteVersion = 1;

enum SheetFollowerSyncStatus {
  idle,
  synced,
  missingScore,
  staleEvent,
  disconnected,
  sessionMismatch,
}

enum SheetCollaborationInviteStatus {
  valid,
  malformed,
  unsupportedVersion,
  expired,
}

class SheetCollaborationInvite {
  const SheetCollaborationInvite({
    required this.sessionId,
    required this.leaderDeviceId,
    required this.setlistId,
    required this.createdAt,
    required this.expiresAt,
    this.version = sheetCollaborationInviteVersion,
  });

  final String sessionId;
  final String leaderDeviceId;
  final String setlistId;
  final DateTime createdAt;
  final DateTime expiresAt;
  final int version;

  bool isExpired(DateTime now) => !now.isBefore(expiresAt);

  String toPayload() {
    return jsonEncode(<String, Object?>{
      'scope': sheetCollaborationInviteScope,
      'version': version,
      'sessionId': sessionId,
      'leaderDeviceId': leaderDeviceId,
      'setlistId': setlistId,
      'createdAt': createdAt.toUtc().toIso8601String(),
      'expiresAt': expiresAt.toUtc().toIso8601String(),
    });
  }

  static SheetCollaborationInviteDecodeResult decodePayload(
    String payload, {
    required DateTime now,
  }) {
    Object? decoded;
    try {
      decoded = jsonDecode(payload);
    } on FormatException {
      return const SheetCollaborationInviteDecodeResult(
        status: SheetCollaborationInviteStatus.malformed,
        message: '초대 코드를 읽을 수 없습니다.',
      );
    }
    if (decoded is! Map<String, Object?>) {
      return const SheetCollaborationInviteDecodeResult(
        status: SheetCollaborationInviteStatus.malformed,
        message: '초대 코드 형식이 올바르지 않습니다.',
      );
    }
    if (decoded['scope'] != sheetCollaborationInviteScope) {
      return const SheetCollaborationInviteDecodeResult(
        status: SheetCollaborationInviteStatus.malformed,
        message: 'Clef 협업 초대 코드가 아닙니다.',
      );
    }
    final version = decoded['version'];
    if (version is! int || version != sheetCollaborationInviteVersion) {
      return const SheetCollaborationInviteDecodeResult(
        status: SheetCollaborationInviteStatus.unsupportedVersion,
        message: '지원하지 않는 협업 초대 버전입니다.',
      );
    }
    final sessionId = _trimmedString(decoded['sessionId']);
    final leaderDeviceId = _trimmedString(decoded['leaderDeviceId']);
    final setlistId = _trimmedString(decoded['setlistId']);
    final createdAt = _parseIsoDateTime(decoded['createdAt']);
    final expiresAt = _parseIsoDateTime(decoded['expiresAt']);
    if (sessionId == null ||
        leaderDeviceId == null ||
        setlistId == null ||
        createdAt == null ||
        expiresAt == null ||
        !expiresAt.isAfter(createdAt)) {
      return const SheetCollaborationInviteDecodeResult(
        status: SheetCollaborationInviteStatus.malformed,
        message: '초대 코드에 필요한 공연 세션 정보가 없습니다.',
      );
    }

    final invite = SheetCollaborationInvite(
      sessionId: sessionId,
      leaderDeviceId: leaderDeviceId,
      setlistId: setlistId,
      createdAt: createdAt,
      expiresAt: expiresAt,
      version: version,
    );
    if (invite.isExpired(now)) {
      return SheetCollaborationInviteDecodeResult(
        status: SheetCollaborationInviteStatus.expired,
        message: '초대 코드가 만료되었습니다. 리더 기기에서 새 코드를 받으세요.',
        invite: invite,
      );
    }
    return SheetCollaborationInviteDecodeResult(
      status: SheetCollaborationInviteStatus.valid,
      invite: invite,
    );
  }
}

class SheetCollaborationInviteDecodeResult {
  const SheetCollaborationInviteDecodeResult({
    required this.status,
    this.message,
    this.invite,
  });

  final SheetCollaborationInviteStatus status;
  final String? message;
  final SheetCollaborationInvite? invite;

  bool get isValid => status == SheetCollaborationInviteStatus.valid;
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

String? _trimmedString(Object? value) {
  if (value is! String) {
    return null;
  }
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

DateTime? _parseIsoDateTime(Object? value) {
  if (value is! String) {
    return null;
  }
  return DateTime.tryParse(value)?.toUtc();
}
