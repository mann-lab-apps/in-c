import 'dart:convert';

import 'package:qr/qr.dart';

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

class SheetCollaborationPreflightCheck {
  const SheetCollaborationPreflightCheck({
    required this.setlistId,
    required this.totalScoreCount,
    required this.availableScoreIds,
    required this.missingScoreIds,
  });

  factory SheetCollaborationPreflightCheck.forSetlist({
    required String setlistId,
    required Iterable<String> leaderScoreIds,
    required Set<String> followerScoreIds,
  }) {
    final normalizedLeaderScoreIds = <String>[];
    final seen = <String>{};
    for (final scoreId in leaderScoreIds) {
      final normalized = scoreId.trim();
      if (normalized.isNotEmpty && seen.add(normalized)) {
        normalizedLeaderScoreIds.add(normalized);
      }
    }
    final normalizedFollowerScoreIds = followerScoreIds
        .map((scoreId) => scoreId.trim())
        .where((scoreId) => scoreId.isNotEmpty)
        .toSet();
    final available = <String>[];
    final missing = <String>[];
    for (final scoreId in normalizedLeaderScoreIds) {
      if (normalizedFollowerScoreIds.contains(scoreId)) {
        available.add(scoreId);
      } else {
        missing.add(scoreId);
      }
    }
    return SheetCollaborationPreflightCheck(
      setlistId: setlistId.trim(),
      totalScoreCount: normalizedLeaderScoreIds.length,
      availableScoreIds: List<String>.unmodifiable(available),
      missingScoreIds: List<String>.unmodifiable(missing),
    );
  }

  final String setlistId;
  final int totalScoreCount;
  final List<String> availableScoreIds;
  final List<String> missingScoreIds;

  bool get canFollow => totalScoreCount > 0 && missingScoreIds.isEmpty;

  String get headline {
    if (totalScoreCount == 0) {
      return '동기화할 세트리스트 곡이 없습니다.';
    }
    if (missingScoreIds.isEmpty) {
      return '팔로워 기기가 모든 악보를 갖고 있습니다.';
    }
    return '팔로워 기기에 없는 악보 ${missingScoreIds.length}개';
  }

  List<String> get reviewLines {
    if (totalScoreCount == 0) {
      return const <String>['리더 세트리스트에 곡을 추가한 뒤 다시 확인하세요.'];
    }
    if (missingScoreIds.isEmpty) {
      return <String>[
        '총 $totalScoreCount곡을 안전하게 따라갈 수 있습니다.',
        '실제 네트워크 연결 전까지는 같은 기기 시뮬레이션 결과입니다.',
      ];
    }
    return <String>[
      '총 $totalScoreCount곡 중 ${availableScoreIds.length}곡만 이 기기에 있습니다.',
      '없는 악보를 setlist package나 파일 가져오기로 먼저 맞춘 뒤 연결하세요.',
    ];
  }
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

class SheetCollaborationInviteQrPlan {
  const SheetCollaborationInviteQrPlan({
    required this.payload,
    required this.payloadBytes,
    required this.canRenderQr,
    required this.moduleCount,
    required this.minimumPixelSize,
    required this.darkModuleCount,
    required this.modules,
    required this.reviewLines,
  });

  factory SheetCollaborationInviteQrPlan.forInvite(
    SheetCollaborationInvite invite, {
    int errorCorrectLevel = QrErrorCorrectLevel.M,
    int maxPayloadBytes = 900,
    int minPixelsPerModule = 4,
  }) {
    final payload = invite.toPayload();
    final payloadBytes = utf8.encode(payload).length;
    if (payloadBytes > maxPayloadBytes) {
      return SheetCollaborationInviteQrPlan(
        payload: payload,
        payloadBytes: payloadBytes,
        canRenderQr: false,
        moduleCount: 0,
        minimumPixelSize: 0,
        darkModuleCount: 0,
        modules: const <List<bool>>[],
        reviewLines: const <String>[
          '초대 코드가 QR로 표시하기엔 깁니다.',
          '코드 복사로 전달하거나 새 초대를 만들어주세요.',
        ],
      );
    }

    try {
      final qrCode = QrCode.fromData(
        data: payload,
        errorCorrectLevel: errorCorrectLevel,
      );
      final qrImage = QrImage(qrCode);
      var darkModuleCount = 0;
      final modules = List<List<bool>>.generate(qrImage.moduleCount, (row) {
        return List<bool>.unmodifiable(
          List<bool>.generate(qrImage.moduleCount, (column) {
            final dark = qrImage.isDark(row, column);
            if (dark) {
              darkModuleCount += 1;
            }
            return dark;
          }),
        );
      });
      return SheetCollaborationInviteQrPlan(
        payload: payload,
        payloadBytes: payloadBytes,
        canRenderQr: true,
        moduleCount: qrImage.moduleCount,
        minimumPixelSize: qrImage.moduleCount * minPixelsPerModule,
        darkModuleCount: darkModuleCount,
        modules: List<List<bool>>.unmodifiable(modules),
        reviewLines: <String>[
          'QR ${qrImage.moduleCount}x${qrImage.moduleCount} 모듈을 표시할 수 있습니다.',
          '인식 실패 시 코드 복사를 대체 경로로 제공합니다.',
        ],
      );
    } on Object {
      return SheetCollaborationInviteQrPlan(
        payload: payload,
        payloadBytes: payloadBytes,
        canRenderQr: false,
        moduleCount: 0,
        minimumPixelSize: 0,
        darkModuleCount: 0,
        modules: const <List<bool>>[],
        reviewLines: const <String>[
          '초대 QR을 만들지 못했습니다.',
          '코드 복사로 전달하거나 새 초대를 만들어주세요.',
        ],
      );
    }
  }

  final String payload;
  final int payloadBytes;
  final bool canRenderQr;
  final int moduleCount;
  final int minimumPixelSize;
  final int darkModuleCount;
  final List<List<bool>> modules;
  final List<String> reviewLines;

  String get copyFallbackPayload => payload;
}

class SheetCollaborationSessionPreview {
  const SheetCollaborationSessionPreview({
    required this.invite,
    required this.qrPlan,
    required this.preflightCheck,
    required this.followerReview,
  });

  factory SheetCollaborationSessionPreview.forInvite({
    required SheetCollaborationInvite invite,
    required Iterable<String> leaderScoreIds,
    required Set<String> followerScoreIds,
    SheetFollowerSyncState? followerState,
  }) {
    final preflightCheck = SheetCollaborationPreflightCheck.forSetlist(
      setlistId: invite.setlistId,
      leaderScoreIds: leaderScoreIds,
      followerScoreIds: followerScoreIds,
    );
    return SheetCollaborationSessionPreview(
      invite: invite,
      qrPlan: SheetCollaborationInviteQrPlan.forInvite(invite),
      preflightCheck: preflightCheck,
      followerReview: SheetFollowerSyncReview.fromState(
        followerState ?? SheetFollowerSyncState.idle(invite.sessionId),
      ),
    );
  }

  final SheetCollaborationInvite invite;
  final SheetCollaborationInviteQrPlan qrPlan;
  final SheetCollaborationPreflightCheck preflightCheck;
  final SheetFollowerSyncReview followerReview;

  bool get canShareInvite =>
      qrPlan.canRenderQr || qrPlan.copyFallbackPayload.isNotEmpty;

  bool get canStartLocalSimulation =>
      preflightCheck.canFollow && !followerReview.requiresAttention;

  List<String> get blockingReasons {
    final reasons = <String>[];
    if (!preflightCheck.canFollow) {
      reasons.add(preflightCheck.headline);
    }
    if (!canShareInvite) {
      reasons.add('초대 QR이나 복사 코드를 준비하지 못했습니다.');
    }
    if (followerReview.requiresAttention) {
      reasons.add(followerReview.headline);
    }
    return List<String>.unmodifiable(reasons);
  }

  List<String> get reviewLines {
    return List<String>.unmodifiable(<String>[
      '세션 ${invite.sessionId}',
      ...preflightCheck.reviewLines,
      ...qrPlan.reviewLines,
      followerReview.headline,
      ...followerReview.reviewLines,
    ]);
  }
}

class SheetCollaborationLocalSimulator {
  SheetCollaborationLocalSimulator({
    required this.invite,
    required Set<String> followerScoreIds,
  }) : _followerScoreIds = Set<String>.unmodifiable(followerScoreIds),
       _state = SheetFollowerSyncState.idle(invite.sessionId);

  final SheetCollaborationInvite invite;
  Set<String> _followerScoreIds;
  SheetFollowerSyncState _state;
  int _sequence = 0;

  SheetFollowerSyncState get state => _state;

  Set<String> get followerScoreIds => _followerScoreIds;

  SheetFollowerSyncState applyLeaderPage({
    required String scoreId,
    required int page,
    required DateTime timestamp,
  }) {
    _sequence += 1;
    _state = _state.applyLeaderEvent(
      SheetLeaderPageEvent(
        sessionId: invite.sessionId,
        sequence: _sequence,
        leaderDeviceId: invite.leaderDeviceId,
        setlistId: invite.setlistId,
        scoreId: scoreId,
        page: page,
        timestamp: timestamp,
      ),
      availableScoreIds: _followerScoreIds,
    );
    return _state;
  }

  SheetFollowerSyncState markDisconnected(DateTime timestamp) {
    _state = _state.markDisconnected(timestamp);
    return _state;
  }

  void replaceFollowerScoreIds(Set<String> scoreIds) {
    _followerScoreIds = Set<String>.unmodifiable(scoreIds);
  }
}

enum SheetCollaborationSimulationActionType {
  leaderPage,
  replaceFollowerScores,
  disconnect,
}

class SheetCollaborationSimulationAction {
  const SheetCollaborationSimulationAction.leaderPage({
    required this.scoreId,
    required this.page,
    required this.timestamp,
  }) : type = SheetCollaborationSimulationActionType.leaderPage,
       scoreIds = const <String>{},
       assert(scoreId != null),
       assert(page != null);

  SheetCollaborationSimulationAction.replaceFollowerScores({
    required Set<String> scoreIds,
    required this.timestamp,
  }) : type = SheetCollaborationSimulationActionType.replaceFollowerScores,
       scoreId = null,
       page = null,
       scoreIds = Set<String>.unmodifiable(scoreIds);

  const SheetCollaborationSimulationAction.disconnect({required this.timestamp})
    : type = SheetCollaborationSimulationActionType.disconnect,
      scoreId = null,
      page = null,
      scoreIds = const <String>{};

  final SheetCollaborationSimulationActionType type;
  final String? scoreId;
  final int? page;
  final Set<String> scoreIds;
  final DateTime timestamp;
}

class SheetCollaborationSimulationStep {
  const SheetCollaborationSimulationStep({
    required this.label,
    required this.state,
    required this.review,
  });

  final String label;
  final SheetFollowerSyncState state;
  final SheetFollowerSyncReview review;

  bool get requiresAttention => review.requiresAttention;

  List<String> get reviewLines {
    return List<String>.unmodifiable(<String>[
      label,
      review.headline,
      ...review.reviewLines,
    ]);
  }
}

class SheetCollaborationLocalSimulationReport {
  const SheetCollaborationLocalSimulationReport({
    required this.steps,
    required this.finalState,
  });

  factory SheetCollaborationLocalSimulationReport.run({
    required SheetCollaborationInvite invite,
    required Set<String> initialFollowerScoreIds,
    required Iterable<SheetCollaborationSimulationAction> actions,
  }) {
    final simulator = SheetCollaborationLocalSimulator(
      invite: invite,
      followerScoreIds: initialFollowerScoreIds,
    );
    final steps = <SheetCollaborationSimulationStep>[];
    for (final action in actions) {
      switch (action.type) {
        case SheetCollaborationSimulationActionType.leaderPage:
          final scoreId = action.scoreId;
          final page = action.page;
          if (scoreId == null || page == null) {
            continue;
          }
          final state = simulator.applyLeaderPage(
            scoreId: scoreId,
            page: page,
            timestamp: action.timestamp,
          );
          steps.add(
            SheetCollaborationSimulationStep(
              label: '리더: $scoreId $page쪽',
              state: state,
              review: SheetFollowerSyncReview.fromState(state),
            ),
          );
        case SheetCollaborationSimulationActionType.replaceFollowerScores:
          simulator.replaceFollowerScoreIds(action.scoreIds);
          final state = simulator.state;
          steps.add(
            SheetCollaborationSimulationStep(
              label: '팔로워 악보 목록 갱신: ${action.scoreIds.length}곡',
              state: state,
              review: SheetFollowerSyncReview.fromState(state),
            ),
          );
        case SheetCollaborationSimulationActionType.disconnect:
          final state = simulator.markDisconnected(action.timestamp);
          steps.add(
            SheetCollaborationSimulationStep(
              label: '연결 끊김 시뮬레이션',
              state: state,
              review: SheetFollowerSyncReview.fromState(state),
            ),
          );
      }
    }
    return SheetCollaborationLocalSimulationReport(
      steps: List<SheetCollaborationSimulationStep>.unmodifiable(steps),
      finalState: simulator.state,
    );
  }

  final List<SheetCollaborationSimulationStep> steps;
  final SheetFollowerSyncState finalState;

  int get attentionStepCount {
    return steps.where((step) => step.requiresAttention).length;
  }

  bool get hasAttention => attentionStepCount > 0;

  bool get finalRequiresAttention {
    return SheetFollowerSyncReview.fromState(finalState).requiresAttention;
  }

  String get headline {
    if (steps.isEmpty) {
      return '시뮬레이션할 페이지 전환이 없습니다.';
    }
    if (finalRequiresAttention) {
      return '마지막 상태에 확인이 필요합니다.';
    }
    if (hasAttention) {
      return '중간에 확인할 상태가 있었지만 마지막 상태는 동기화되었습니다.';
    }
    return '모든 시뮬레이션 단계가 안전하게 동기화되었습니다.';
  }

  List<String> get reviewLines {
    return List<String>.unmodifiable(<String>[
      '총 ${steps.length}단계',
      if (attentionStepCount > 0) '확인 필요 $attentionStepCount단계',
      SheetFollowerSyncReview.fromState(finalState).headline,
    ]);
  }
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

class SheetFollowerSyncReview {
  const SheetFollowerSyncReview({
    required this.headline,
    required this.reviewLines,
    required this.requiresAttention,
  });

  factory SheetFollowerSyncReview.fromState(SheetFollowerSyncState state) {
    switch (state.status) {
      case SheetFollowerSyncStatus.idle:
        return const SheetFollowerSyncReview(
          headline: '리더 기기 연결 대기 중',
          reviewLines: <String>['초대 코드를 받은 뒤 리더의 첫 페이지 전환을 기다립니다.'],
          requiresAttention: false,
        );
      case SheetFollowerSyncStatus.synced:
        return SheetFollowerSyncReview(
          headline: '리더 기기를 따라가는 중',
          reviewLines: <String>[
            if (state.scoreId != null) '악보 ${state.scoreId}',
            if (state.page != null) '현재 ${state.page}쪽',
            '늦게 도착한 이전 페이지 전환은 무시됩니다.',
          ],
          requiresAttention: false,
        );
      case SheetFollowerSyncStatus.missingScore:
        return SheetFollowerSyncReview(
          headline: '팔로워 기기에 없는 악보',
          reviewLines: <String>[
            state.message ?? '이 기기에 없는 악보라 페이지를 넘기지 않았습니다.',
            '세트리스트 패키지나 파일 가져오기로 악보를 맞춘 뒤 다시 연결하세요.',
          ],
          requiresAttention: true,
        );
      case SheetFollowerSyncStatus.staleEvent:
        return SheetFollowerSyncReview(
          headline: '이전 페이지 전환 무시',
          reviewLines: <String>[
            state.message ?? '이미 처리한 페이지 전환입니다.',
            '현재 표시 중인 악보와 쪽을 유지합니다.',
          ],
          requiresAttention: false,
        );
      case SheetFollowerSyncStatus.disconnected:
        return SheetFollowerSyncReview(
          headline: '연결 끊김',
          reviewLines: <String>[
            state.message ?? '연결이 끊겼습니다. 현재 쪽을 유지합니다.',
            '리더 초대를 다시 받으면 같은 세션인지 확인한 뒤 이어갑니다.',
          ],
          requiresAttention: true,
        );
      case SheetFollowerSyncStatus.sessionMismatch:
        return SheetFollowerSyncReview(
          headline: '다른 공연 세션',
          reviewLines: <String>[
            state.message ?? '다른 공연 세션의 페이지 전환 요청입니다.',
            '현재 세트리스트 초대 코드와 같은지 확인하세요.',
          ],
          requiresAttention: true,
        );
    }
  }

  final String headline;
  final List<String> reviewLines;
  final bool requiresAttention;
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
