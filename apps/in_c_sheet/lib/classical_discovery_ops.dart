import 'classical_concert_import.dart';
import 'classical_discovery_data_source.dart';
import 'classical_discovery_models.dart';
import 'classical_discovery_validation.dart';
import 'classical_promotion_reporting.dart';

enum ClassicalReadinessStatus { ready, needsContentOps, blocked }

enum ClassicalGapCategory {
  codeBlocker,
  contentOps,
  productionVerification,
  legalReview,
  productQuality,
}

enum ClassicalProviderLinkStatus {
  verifiedDirect,
  safeSearchFallback,
  candidatePending,
  rejected,
  missing,
  hostMismatch,
  searchUrlRegisteredAsDirect,
}

enum ClassicalPreviewReviewStatus {
  approvedPreview,
  needsReview,
  rejected,
  unsupportedPlatform,
  missing,
}

enum ClassicalKopisProductionStatus {
  fixtureReady,
  remoteDisabled,
  missingKey,
  networkFailure,
  malformedRow,
  fieldMappingGap,
}

class ClassicalProviderLinkReview {
  const ClassicalProviderLinkReview({
    required this.platformId,
    required this.status,
    required this.label,
    this.url = '',
    this.warning = '',
  });

  final String platformId;
  final ClassicalProviderLinkStatus status;
  final String label;
  final String url;
  final String warning;
}

class ClassicalPreviewReview {
  const ClassicalPreviewReview({
    required this.platformId,
    required this.status,
    required this.label,
    this.previewUrl = '',
    this.warning = '',
  });

  final String platformId;
  final ClassicalPreviewReviewStatus status;
  final String label;
  final String previewUrl;
  final String warning;
}

class ClassicalLinkReviewPolicy {
  const ClassicalLinkReviewPolicy();

  List<ClassicalProviderLinkReview> reviewLinks(ClassicalWork work) {
    return _reviewPlatforms
        .map(
          (platform) => reviewProviderLink(
            platformId: platform.$1,
            label: platform.$2,
            link: _linkForPlatform(work, platform.$1),
          ),
        )
        .toList(growable: false);
  }

  ClassicalProviderLinkReview reviewProviderLink({
    required String platformId,
    required String label,
    required ExternalLink? link,
  }) {
    if (link == null) {
      return ClassicalProviderLinkReview(
        platformId: platformId,
        label: label,
        status: ClassicalProviderLinkStatus.missing,
      );
    }
    if (link.linkType == 'listen_search') {
      return ClassicalProviderLinkReview(
        platformId: platformId,
        label: link.label,
        status: ClassicalProviderLinkStatus.safeSearchFallback,
        url: link.url,
      );
    }
    if (link.linkType == 'listen_candidate') {
      return ClassicalProviderLinkReview(
        platformId: platformId,
        label: link.label,
        status: ClassicalProviderLinkStatus.candidatePending,
        url: link.url,
      );
    }
    if (link.linkType == 'listen_rejected') {
      return ClassicalProviderLinkReview(
        platformId: platformId,
        label: link.label,
        status: ClassicalProviderLinkStatus.rejected,
        url: link.url,
      );
    }
    if (link.linkType == 'listen_direct') {
      if (_looksLikeSearchUrl(link.url)) {
        return ClassicalProviderLinkReview(
          platformId: platformId,
          label: link.label,
          status: ClassicalProviderLinkStatus.searchUrlRegisteredAsDirect,
          url: link.url,
          warning: '검색 URL이 direct link로 등록되어 있습니다.',
        );
      }
      if (!_hostMatchesPlatform(platformId, link.url)) {
        return ClassicalProviderLinkReview(
          platformId: platformId,
          label: link.label,
          status: ClassicalProviderLinkStatus.hostMismatch,
          url: link.url,
          warning: 'provider host가 platformId와 맞지 않습니다.',
        );
      }
      return ClassicalProviderLinkReview(
        platformId: platformId,
        label: link.label,
        status: ClassicalProviderLinkStatus.verifiedDirect,
        url: link.url,
      );
    }
    return ClassicalProviderLinkReview(
      platformId: platformId,
      label: link.label,
      status: ClassicalProviderLinkStatus.candidatePending,
      url: link.url,
      warning: '지원하지 않는 linkType입니다.',
    );
  }

  List<ClassicalPreviewReview> reviewPreviews(ClassicalWork work) {
    return _reviewPlatforms
        .map(
          (platform) => reviewProviderPreview(
            platformId: platform.$1,
            label: platform.$2,
            link: _linkForPlatform(work, platform.$1),
          ),
        )
        .toList(growable: false);
  }

  ClassicalPreviewReview reviewProviderPreview({
    required String platformId,
    required String label,
    required ExternalLink? link,
  }) {
    if (!_previewSupportedPlatforms.contains(platformId)) {
      return ClassicalPreviewReview(
        platformId: platformId,
        label: label,
        status: ClassicalPreviewReviewStatus.unsupportedPlatform,
        warning: 'V1 앱 내 preview playback 지원 대상이 아닙니다.',
      );
    }
    if (link == null || (link.previewUrl ?? '').isEmpty) {
      return ClassicalPreviewReview(
        platformId: platformId,
        label: label,
        status: ClassicalPreviewReviewStatus.missing,
      );
    }
    if (link.linkType.contains('search')) {
      return ClassicalPreviewReview(
        platformId: platformId,
        label: link.label,
        status: ClassicalPreviewReviewStatus.needsReview,
        previewUrl: link.previewUrl!,
        warning: '검색 fallback link에는 preview URL을 붙이지 않습니다.',
      );
    }
    if (link.linkType == 'listen_preview_rejected') {
      return ClassicalPreviewReview(
        platformId: platformId,
        label: link.label,
        status: ClassicalPreviewReviewStatus.rejected,
        previewUrl: link.previewUrl!,
      );
    }
    if (link.linkType == 'listen_direct' &&
        _hostMatchesPlatform(platformId, link.previewUrl!)) {
      return ClassicalPreviewReview(
        platformId: platformId,
        label: link.label,
        status: ClassicalPreviewReviewStatus.approvedPreview,
        previewUrl: link.previewUrl!,
      );
    }
    return ClassicalPreviewReview(
      platformId: platformId,
      label: link.label,
      status: ClassicalPreviewReviewStatus.needsReview,
      previewUrl: link.previewUrl!,
      warning: 'provider preview 허용 범위 검토가 필요합니다.',
    );
  }
}

class ClassicalOpsGateItem {
  const ClassicalOpsGateItem({
    required this.id,
    required this.label,
    required this.status,
    required this.category,
    required this.current,
    required this.target,
    required this.owner,
    required this.priority,
    required this.nextAction,
    required this.evidenceRequirement,
  });

  final String id;
  final String label;
  final ClassicalReadinessStatus status;
  final ClassicalGapCategory category;
  final int current;
  final int target;
  final String owner;
  final String priority;
  final String nextAction;
  final String evidenceRequirement;

  bool get passes => status == ClassicalReadinessStatus.ready;
}

class ClassicalOpsQueueItem {
  const ClassicalOpsQueueItem({
    required this.workId,
    required this.title,
    required this.composer,
    required this.status,
    required this.category,
    required this.reason,
    required this.nextCommand,
    required this.owner,
  });

  final String workId;
  final String title;
  final String composer;
  final String status;
  final ClassicalGapCategory category;
  final String reason;
  final String nextCommand;
  final String owner;
}

class ClassicalSoftLaunchReadinessReport {
  const ClassicalSoftLaunchReadinessReport({
    required this.status,
    required this.friendlyUsersReady,
    required this.summary,
    required this.gateItems,
    required this.founderReadyCount,
    required this.founderPickCount,
    required this.issues,
  });

  final ClassicalReadinessStatus status;
  final bool friendlyUsersReady;
  final String summary;
  final List<ClassicalOpsGateItem> gateItems;
  final int founderReadyCount;
  final int founderPickCount;
  final List<ClassicalOpsQueueItem> issues;
}

class ClassicalPublicV1CloseoutReport {
  const ClassicalPublicV1CloseoutReport({
    required this.status,
    required this.releaseReady,
    required this.summary,
    required this.includedFeatures,
    required this.excludedFeatures,
    required this.codeBlockerCount,
    required this.contentOpsGapCount,
    required this.productionVerificationGapCount,
    required this.legalReviewGapCount,
    required this.productQualityGapCount,
    required this.gateItems,
    required this.evidenceRows,
  });

  final ClassicalReadinessStatus status;
  final bool releaseReady;
  final String summary;
  final List<String> includedFeatures;
  final List<String> excludedFeatures;
  final int codeBlockerCount;
  final int contentOpsGapCount;
  final int productionVerificationGapCount;
  final int legalReviewGapCount;
  final int productQualityGapCount;
  final List<ClassicalOpsGateItem> gateItems;
  final List<String> evidenceRows;

  String get evidenceText => evidenceRows.join('\n');
}

class ClassicalFeedbackSummaryItem {
  const ClassicalFeedbackSummaryItem({
    required this.category,
    required this.count,
    required this.priority,
    this.latestMessage = '',
  });

  final String category;
  final int count;
  final String priority;
  final String latestMessage;
}

class ClassicalFeedbackSummary {
  const ClassicalFeedbackSummary({
    required this.totalCount,
    required this.blockerCount,
    required this.items,
  });

  final int totalCount;
  final int blockerCount;
  final List<ClassicalFeedbackSummaryItem> items;

  String get exportText {
    if (items.isEmpty) {
      return 'No launch feedback yet.';
    }
    return items
        .map(
          (item) =>
              '${item.category}: ${item.count} · ${item.priority}'
              '${item.latestMessage.isEmpty ? '' : ' · ${item.latestMessage}'}',
        )
        .join('\n');
  }
}

class ClassicalAppIdentityReadiness {
  const ClassicalAppIdentityReadiness({
    required this.appName,
    required this.androidApplicationId,
    required this.iosBundleId,
    required this.version,
    required this.targetAppName,
    required this.targetAndroidApplicationId,
    required this.targetIosBundleId,
    required this.targetVersion,
    required this.storeSubtitle,
    required this.shortDescription,
    required this.iconStatus,
    required this.privacyCopyStatus,
    required this.permissionSummary,
    required this.releaseDecision,
    required this.nextIdentityPlan,
    required this.identityDecisionAccepted,
    required this.gaps,
  });

  factory ClassicalAppIdentityReadiness.currentFlutterShell() {
    return const ClassicalAppIdentityReadiness(
      appName: 'in C',
      androidApplicationId: 'com.mannlab.inc',
      iosBundleId: 'com.mannlab.inc.clef',
      version: '1.0.0+14',
      targetAppName: 'in C',
      targetAndroidApplicationId: 'com.mannlab.inc',
      targetIosBundleId: 'com.mannlab.inc.clef',
      targetVersion: '1.0.0+14 RC; bump build number for public submission',
      storeSubtitle: '오늘 하나씩 여는 클래식',
      shortDescription: '작품 중심으로 클래식을 발견하고, 듣기와 공연으로 이어집니다.',
      iconStatus:
          'first-pass in C icon applied; device and store review still needed',
      privacyCopyStatus: 'in-app policy copy and docs are present',
      permissionSummary: 'local-first storage, external link-out, no hosted audio, no advertiser raw events',
      releaseDecision: 'Public V1 uses the Play Console package name com.mannlab.inc with in C display name, icon, store copy, and direct discovery entry.',
      nextIdentityPlan: 'Clef sheet-reader continuity remains covered by regression tests; a separate Clef package migration is outside the in C Public V1 release.',
      identityDecisionAccepted: true,
      gaps: <String>[],
    );
  }

  final String appName;
  final String androidApplicationId;
  final String iosBundleId;
  final String version;
  final String targetAppName;
  final String targetAndroidApplicationId;
  final String targetIosBundleId;
  final String targetVersion;
  final String storeSubtitle;
  final String shortDescription;
  final String iconStatus;
  final String privacyCopyStatus;
  final String permissionSummary;
  final String releaseDecision;
  final String nextIdentityPlan;
  final bool identityDecisionAccepted;
  final List<String> gaps;

  int get gapCount => gaps.length;
  bool get isVerified => identityDecisionAccepted && gaps.isEmpty;
}

class ClassicalStoreMetadataReadiness {
  const ClassicalStoreMetadataReadiness({
    required this.appName,
    required this.subtitle,
    required this.shortDescription,
    required this.fullDescription,
    required this.keywords,
    required this.category,
    required this.ageRatingAssumption,
    required this.permissionSummary,
    required this.privacySummary,
    required this.supportContact,
    required this.screenshotSurfaces,
    required this.screenshotArtifactPaths,
    required this.excludedScreenshotSurfaces,
    required this.gaps,
  });

  factory ClassicalStoreMetadataReadiness.publicV1Draft() {
    return const ClassicalStoreMetadataReadiness(
      appName: 'in C',
      subtitle: '오늘 하나씩 여는 클래식',
      shortDescription: '작품 중심으로 클래식을 발견하고 듣기와 공연으로 이어집니다.',
      fullDescription: 'in C는 클래식 음원을 직접 제공하지 않고, 오늘 들어볼 작품을 고른 뒤 YouTube, Spotify, Apple Music, Melon 같은 외부 플랫폼으로 이어주는 클래식 디스커버리 앱입니다. 작품, 작곡가, 악기, 시대, 분위기, 공연 정보를 따라 다음 작품을 찾고 My Music에 저장해 다시 들을 루틴을 만들 수 있습니다.',
      keywords: <String>[
        'classical music',
        '클래식',
        '작곡가',
        '공연',
        '음악추천',
        '오케스트라',
      ],
      category: 'Music / Entertainment',
      ageRatingAssumption: '4+ / Everyone; no hosted audio, no social posting, no user-generated public content.',
      permissionSummary: 'External link-out and local-first preferences; no microphone/camera/location permission required for in C discovery.',
      privacySummary: 'local-first preferences and aggregate event reporting only; no hosted audio and no advertiser raw events.',
      supportContact: 'support@mannlab.app',
      screenshotSurfaces: <String>[
        'Today',
        'Work Detail',
        'Discover',
        'My Music',
        'Concerts',
      ],
      screenshotArtifactPaths: <String>[
        'apps/in_c_sheet/build/store-screenshot-android-today.png',
        'apps/in_c_sheet/build/store-screenshot-android-work-detail.png',
        'apps/in_c_sheet/build/store-screenshot-android-discover.png',
        'apps/in_c_sheet/build/store-screenshot-android-my-music.png',
        'apps/in_c_sheet/build/store-screenshot-android-concerts.png',
        'apps/in_c_sheet/build/store-screenshot-android-preview.png',
      ],
      excludedScreenshotSurfaces: <String>[
        'Catalog Ops',
        'fake direct link',
        'fake preview URL',
        'internal funnel/surface terminology',
      ],
      gaps: <String>[
        'Store metadata copy needs final App Store Connect / Play Console review.',
      ],
    );
  }

  final String appName;
  final String subtitle;
  final String shortDescription;
  final String fullDescription;
  final List<String> keywords;
  final String category;
  final String ageRatingAssumption;
  final String permissionSummary;
  final String privacySummary;
  final String supportContact;
  final List<String> screenshotSurfaces;
  final List<String> screenshotArtifactPaths;
  final List<String> excludedScreenshotSurfaces;
  final List<String> gaps;

  int get gapCount => gaps.length;
  bool get isVerified => gaps.isEmpty;
}

class ClassicalPublicCopyReadiness {
  const ClassicalPublicCopyReadiness({
    required this.checkedSurfaces,
    required this.blockedTerms,
    required this.issues,
  });

  factory ClassicalPublicCopyReadiness.fromStoreMetadata(
    ClassicalStoreMetadataReadiness metadata,
  ) {
    const blockedTerms = <String>[
      'CTA',
      'surface',
      'funnel',
      'fake direct',
      'fake preview',
      'Catalog Ops',
      'internal ops',
      'AI 추천',
      '당신을 위한',
      '취향 분석',
      '개인화 추천',
      'streak',
      'XP',
    ];
    final publicCopy = <String>[
      metadata.appName,
      metadata.subtitle,
      metadata.shortDescription,
      metadata.fullDescription,
      metadata.privacySummary,
    ].join('\n');
    final issues = blockedTerms
        .where((term) => publicCopy.toLowerCase().contains(term.toLowerCase()))
        .map((term) => 'Public copy contains internal term: $term')
        .toList(growable: false);
    return ClassicalPublicCopyReadiness(
      checkedSurfaces: const <String>[
        'Today',
        'Work Detail',
        'Discover',
        'My Music',
        'Concerts',
        'Store Metadata',
        'Privacy Sheet',
      ],
      blockedTerms: blockedTerms,
      issues: issues,
    );
  }

  final List<String> checkedSurfaces;
  final List<String> blockedTerms;
  final List<String> issues;

  bool get isVerified => issues.isEmpty;
}

class ClassicalBuildQaReadiness {
  const ClassicalBuildQaReadiness({
    required this.androidDebugApk,
    required this.androidReleaseApk,
    required this.androidAppBundle,
    required this.androidInstallSmoke,
    required this.iosNoCodesignBuild,
    required this.iosSimulatorInstallLaunchSmoke,
    required this.iosTestFlightUpload,
    required this.inCEntryFlag,
    required this.gaps,
  });

  factory ClassicalBuildQaReadiness.latestLocalEvidence() {
    return const ClassicalBuildQaReadiness(
      androidDebugApk: 'PASS · --dart-define=IN_C_DISCOVERY_HOME=true',
      androidReleaseApk: 'PASS · --dart-define=IN_C_DISCOVERY_HOME=true',
      androidAppBundle:
          'PASS · build/app/outputs/bundle/release/app-release.aab',
      androidInstallSmoke: 'PASS · emulator-5554 Android 15 release APK install/launch; Today, preview, link-out, Work Detail, Discover, My Music, Concerts screenshots captured',
      iosNoCodesignBuild: 'PASS · --dart-define=IN_C_DISCOVERY_HOME=true',
      iosSimulatorInstallLaunchSmoke: 'PASS · iPhone 17 Pro simulator',
      iosTestFlightUpload: 'BLOCKED · flutter build ipa archives, then fails codesign because provisioning profile "Clef" does not include Apple Distribution certificate',
      inCEntryFlag: '--dart-define=IN_C_DISCOVERY_HOME=true',
      gaps: <String>[
        'iOS TestFlight upload requires provisioning profile/certificate repair.',
      ],
    );
  }

  final String androidDebugApk;
  final String androidReleaseApk;
  final String androidAppBundle;
  final String androidInstallSmoke;
  final String iosNoCodesignBuild;
  final String iosSimulatorInstallLaunchSmoke;
  final String iosTestFlightUpload;
  final String inCEntryFlag;
  final List<String> gaps;

  bool get hasInstallLaunchSmoke =>
      androidInstallSmoke.startsWith('PASS') ||
      iosSimulatorInstallLaunchSmoke.startsWith('PASS');

  int get gapCount => gaps.length;
  bool get isVerified => gaps.isEmpty;
}

class ClassicalKopisProductionReadiness {
  const ClassicalKopisProductionReadiness({
    required this.mode,
    required this.statuses,
    required this.summary,
    required this.gaps,
  });

  factory ClassicalKopisProductionReadiness.currentConfig() {
    return const ClassicalKopisProductionReadiness(
      mode: 'fixture/local import',
      statuses: <ClassicalKopisProductionStatus>[
        ClassicalKopisProductionStatus.fixtureReady,
        ClassicalKopisProductionStatus.remoteDisabled,
        ClassicalKopisProductionStatus.missingKey,
        ClassicalKopisProductionStatus.fieldMappingGap,
      ],
      summary: 'Fixture import is testable. Production KOPIS API is intentionally disabled until key and field mapping are verified.',
      gaps: <String>[
        'KOPIS production API key is not configured.',
        'Remote import is disabled for Public V1 safety.',
        'Production field mapping still needs live payload verification.',
      ],
    );
  }

  final String mode;
  final List<ClassicalKopisProductionStatus> statuses;
  final String summary;
  final List<String> gaps;

  int get gapCount => gaps.length;
  bool get productionReady => gapCount == 0;
}

class ClassicalFounderQualityGate {
  const ClassicalFounderQualityGate({
    required this.testedUserCount,
    required this.dailyStepTapCount,
    required this.reasonAcceptedCount,
    required this.linkOutCount,
    required this.reactionCount,
    required this.mapUnderstandingCount,
    required this.comebackReasonCount,
  });

  static const observationChecklist = <String>[
    '첫 1분 안에 Daily 30초를 눌렀는가',
    '추천 이유를 자기 취향과 연결해서 납득했는가',
    '전체 듣기로 넘어갔는가',
    '저장 또는 reaction을 남겼는가',
    '감상지도의 열린 길/다음 길을 이해했는가',
    '내일 다시 열 이유를 자기 말로 설명했는가',
  ];

  static const decisionRule = '5명 중 3명 이상이 핵심 행동을 통과해야 Public V1 후보로 본다.';

  factory ClassicalFounderQualityGate.fromEvents(List<DiscoveryEvent> events) {
    final probes = events
        .where(
          (event) =>
              event.eventType == 'feedback_submit' &&
              (event.context == 'founder_quality' ||
                  event.properties['category'] == 'founder_quality'),
        )
        .toList(growable: false);
    final byUser = <String, DiscoveryEvent>{};
    for (final event in probes) {
      final userId = event.properties['testerId']?.trim().isNotEmpty == true
          ? event.properties['testerId']!
          : event.id;
      byUser[userId] = event;
    }
    final unique = byUser.values.toList(growable: false);
    return ClassicalFounderQualityGate(
      testedUserCount: unique.length,
      dailyStepTapCount: _probeTrueCount(unique, 'dailyStepTapped'),
      reasonAcceptedCount: _probeTrueCount(unique, 'reasonAccepted'),
      linkOutCount: _probeTrueCount(unique, 'openedFullListen'),
      reactionCount: _probeTrueCount(unique, 'leftReaction'),
      mapUnderstandingCount: _probeTrueCount(unique, 'understoodListeningMap'),
      comebackReasonCount: _probeTrueCount(unique, 'wouldReturnTomorrow'),
    );
  }

  final int testedUserCount;
  final int dailyStepTapCount;
  final int reasonAcceptedCount;
  final int linkOutCount;
  final int reactionCount;
  final int mapUnderstandingCount;
  final int comebackReasonCount;

  bool get ready =>
      testedUserCount >= 5 &&
      dailyStepTapCount >= 3 &&
      reasonAcceptedCount >= 3 &&
      linkOutCount >= 3 &&
      reactionCount >= 3 &&
      mapUnderstandingCount >= 3 &&
      comebackReasonCount >= 3;

  String get exportText {
    return 'Founder Quality: ${ready ? 'YES' : 'NO'} · '
        'tested $testedUserCount/5 · daily $dailyStepTapCount · '
        'reason $reasonAcceptedCount · link-out $linkOutCount · '
        'reaction $reactionCount · map $mapUnderstandingCount · '
        'comeback $comebackReasonCount';
  }
}

class ClassicalFirstUseWowGate {
  const ClassicalFirstUseWowGate({
    required this.testedUserCount,
    required this.personalRecommendationCount,
    required this.knewWhatToHearCount,
    required this.pathFeltNonRandomCount,
    required this.mapFeltPersonalCount,
    required this.tasteBridgeCount,
    required this.comebackReasonCount,
  });

  static const observationChecklist = <String>[
    '첫 추천이 내 입력에서 출발한다고 느꼈는가',
    '30초에서 무엇을 들으면 되는지 알았는가',
    '다음 세 작품이 랜덤이 아니라 길처럼 보였는가',
    '감상지도가 내 위치를 보여준다고 느꼈는가',
    '내 취향에서 클래식으로 이어진다고 말했는가',
    '내일 다시 열 이유를 말했는가',
  ];

  static const decisionRule =
      '5명 중 4명 이상이 첫 추천 이유를 납득하고, 3명 이상이 재방문 이유와 취향 연결감을 말해야 Public V1 후보로 본다.';

  factory ClassicalFirstUseWowGate.fromEvents(List<DiscoveryEvent> events) {
    final probes = events
        .where(
          (event) =>
              event.eventType == 'feedback_submit' &&
              (event.context == 'first_use_wow' ||
                  event.properties['category'] == 'first_use_wow'),
        )
        .toList(growable: false);
    final byUser = <String, DiscoveryEvent>{};
    for (final event in probes) {
      final userId = event.properties['testerId']?.trim().isNotEmpty == true
          ? event.properties['testerId']!
          : event.id;
      byUser[userId] = event;
    }
    final unique = byUser.values.toList(growable: false);
    return ClassicalFirstUseWowGate(
      testedUserCount: unique.length,
      personalRecommendationCount: _probeTrueCount(
        unique,
        'personalRecommendation',
      ),
      knewWhatToHearCount: _probeTrueCount(unique, 'knewWhatToHear'),
      pathFeltNonRandomCount: _probeTrueCount(unique, 'pathFeltNonRandom'),
      mapFeltPersonalCount: _probeTrueCount(unique, 'mapFeltPersonal'),
      tasteBridgeCount: _probeTrueCount(unique, 'tasteBridgeFeltNatural'),
      comebackReasonCount: _probeTrueCount(unique, 'wouldReturnTomorrow'),
    );
  }

  final int testedUserCount;
  final int personalRecommendationCount;
  final int knewWhatToHearCount;
  final int pathFeltNonRandomCount;
  final int mapFeltPersonalCount;
  final int tasteBridgeCount;
  final int comebackReasonCount;

  bool get ready =>
      testedUserCount >= 5 &&
      personalRecommendationCount >= 4 &&
      knewWhatToHearCount >= 4 &&
      pathFeltNonRandomCount >= 3 &&
      mapFeltPersonalCount >= 3 &&
      tasteBridgeCount >= 3 &&
      comebackReasonCount >= 3;

  String get exportText {
    return 'First-Use Wow: ${ready ? 'YES' : 'NO'} · '
        'tested $testedUserCount/5 · personal $personalRecommendationCount · '
        'hear $knewWhatToHearCount · path $pathFeltNonRandomCount · '
        'map $mapFeltPersonalCount · bridge $tasteBridgeCount · '
        'comeback $comebackReasonCount';
  }
}

class ClassicalCatalogOpsSummary {
  const ClassicalCatalogOpsSummary({
    required this.catalog,
    required this.validationReport,
    required this.workCount,
    required this.composerCount,
    required this.concertCount,
    required this.promotionCount,
    required this.minimumWorkTarget,
    required this.launchWorkTarget,
    required this.previewLinkCount,
    required this.previewCoveragePercent,
    required this.concertLinkedWorkCount,
    required this.worksMissingListeningMoments,
    required this.worksMissingExternalLinks,
    required this.worksMissingScoreLinks,
    required this.concertsWithRawText,
    required this.expectedProgramItems,
    required this.matchedProgramItems,
    required this.promotionsMissingDisclosure,
    required this.promotionReports,
    required this.recentEventTypes,
    required this.founderPickCount,
    required this.founderReadyCount,
    required this.releaseCatalogCount,
    required this.directReadyWorkCount,
    required this.safeSearchFallbackWorkCount,
    required this.approvedPreviewWorkCount,
    required this.founderApprovedPreviewCount,
    required this.firstThreeMinuteFunnelComplete,
    required this.appIdentityGapCount,
    required this.appIdentityReadiness,
    required this.storeMetadataReadiness,
    required this.publicCopyReadiness,
    required this.buildQaReadiness,
    required this.feedbackSummary,
    required this.founderQualityGate,
    required this.firstUseWowGate,
    required this.listeningMapNodeCount,
    required this.founderMapCoverageCount,
    required this.worksWithMapNodeCount,
    required this.worksWithUnlockPathCount,
    required this.worksWithConqueredCriteriaCount,
    required this.orphanMapNodeCount,
    required this.brokenMapPrerequisiteCount,
    required this.beginnerPathCoverageCount,
    required this.listeningMapCopyCoverageCount,
    required this.minimumRecommendedWorksPerMapNode,
    required this.kopisProductionReadiness,
    required this.founderReviewQueue,
    required this.directLinkReviewQueue,
    required this.previewReviewQueue,
    required this.concertMatchReviewQueue,
    required this.softLaunchReadiness,
    required this.publicV1Closeout,
  });

  factory ClassicalCatalogOpsSummary.fromCatalog({
    required ClassicalCatalogSnapshot catalog,
    required List<DiscoveryEvent> recentEvents,
    ClassicalCatalogValidator validator = const ClassicalCatalogValidator(),
    ConcertProgramMatcher matcher = const ConcertProgramMatcher(),
  }) {
    final validationReport = validator.validate(
      composers: catalog.composers,
      works: catalog.works,
      concerts: catalog.concerts,
      promotions: catalog.promotions,
    );
    var expectedProgramItems = 0;
    var matchedProgramItems = 0;
    for (final concert in catalog.concerts) {
      expectedProgramItems += concert.programWorkIds.length;
      final matched = matcher
          .matchWorkIds(
            programRawText: concert.programRawText,
            works: catalog.works,
          )
          .toSet();
      matchedProgramItems += concert.programWorkIds
          .where(matched.contains)
          .length;
    }
    final previewLinkCount = catalog.works
        .where(
          (work) =>
              work.externalLinks.any(
                (link) => (link.previewUrl ?? '').isNotEmpty,
              ) ||
              work.recordings.any(
                (recording) => (recording.previewUrl ?? '').isNotEmpty,
              ),
        )
        .length;
    final founderPicks = catalog.works
        .where((work) => _hasStatus(work, 'founder_pick'))
        .toList(growable: false);
    final founderIssues = _founderReviewQueue(founderPicks);
    final founderBlockedWorkIds = founderIssues
        .where(
          (issue) =>
              issue.category == ClassicalGapCategory.productQuality ||
              issue.category == ClassicalGapCategory.codeBlocker,
        )
        .map((issue) => issue.workId)
        .toSet();
    final founderReadyCount = founderPicks
        .where((work) => !founderBlockedWorkIds.contains(work.id))
        .length;
    final directReadyWorkCount = catalog.works
        .where(_hasVerifiedDirectLink)
        .length;
    final safeSearchFallbackWorkCount = catalog.works
        .where(_hasSafeSearchFallback)
        .length;
    final approvedPreviewWorkCount = catalog.works
        .where(_hasApprovedPreview)
        .length;
    final founderApprovedPreviewCount = founderPicks
        .where(_hasApprovedPreview)
        .length;
    final firstThreeMinuteFunnelComplete = _hasFirstThreeMinuteFunnel(
      recentEvents,
    );
    final appIdentityReadiness =
        ClassicalAppIdentityReadiness.currentFlutterShell();
    final storeMetadataReadiness =
        ClassicalStoreMetadataReadiness.publicV1Draft();
    final publicCopyReadiness = ClassicalPublicCopyReadiness.fromStoreMetadata(
      storeMetadataReadiness,
    );
    final buildQaReadiness = ClassicalBuildQaReadiness.latestLocalEvidence();
    final feedbackSummary = _feedbackSummary(recentEvents);
    final founderQualityGate = ClassicalFounderQualityGate.fromEvents(
      recentEvents,
    );
    final firstUseWowGate = ClassicalFirstUseWowGate.fromEvents(recentEvents);
    final mapNodes = _opsListeningMapNodes(catalog.works);
    final mapEdges = _opsListeningMapEdges();
    final mapNodeIds = mapNodes.map((node) => node.id).toSet();
    final workMapNodeIds = <String, Set<String>>{
      for (final work in catalog.works) work.id: _opsMapNodeIdsForWork(work),
    };
    final coveredMapNodeIds = workMapNodeIds.values
        .expand((ids) => ids)
        .toSet();
    final founderMapCoverageCount = founderPicks
        .where(
          (work) => (workMapNodeIds[work.id] ?? const <String>{}).isNotEmpty,
        )
        .length;
    final worksWithMapNodeCount = workMapNodeIds.values
        .where((ids) => ids.isNotEmpty)
        .length;
    final worksWithUnlockPathCount = catalog.works
        .where(
          (work) => (workMapNodeIds[work.id] ?? const <String>{}).any(
            (id) => mapEdges.any((edge) => edge.fromNodeId == id),
          ),
        )
        .length;
    final worksWithConqueredCriteriaCount = catalog.works
        .where(
          (work) =>
              work.primaryMoment != null &&
              work.externalLinks.isNotEmpty &&
              work.listeningMoments.isNotEmpty,
        )
        .length;
    final orphanMapNodeCount = mapNodeIds.difference(coveredMapNodeIds).length;
    final brokenMapPrerequisiteCount = mapNodes
        .expand((node) => node.prerequisiteNodeIds)
        .where((id) => !mapNodeIds.contains(id))
        .length;
    final beginnerPathCoverageCount = catalog.works
        .where(
          (work) =>
              work.difficultyForListening <= 2 &&
              _opsMapNodeIdsForWork(work).isNotEmpty,
        )
        .length;
    final listeningMapCopyCoverageCount = mapNodes
        .where(_hasPublicListeningMapCopy)
        .length;
    final minimumRecommendedWorksPerMapNode = mapNodes.isEmpty
        ? 0
        : mapNodes
              .map((node) => node.recommendedWorkIds.length)
              .reduce((a, b) => a < b ? a : b);
    final kopisProductionReadiness =
        ClassicalKopisProductionReadiness.currentConfig();
    final appIdentityGapCount = appIdentityReadiness.gapCount;

    final directQueue = _directLinkReviewQueue(catalog.works);
    final previewQueue = catalog.works
        .where((work) => !_hasApprovedPreview(work))
        .map(
          (work) => ClassicalOpsQueueItem(
            workId: work.id,
            title: work.titleKo,
            composer: work.composerNameKo,
            status: 'preview missing',
            category: ClassicalGapCategory.legalReview,
            reason: 'Provider 허용 범위가 확인된 preview URL이 없습니다.',
            nextCommand: 'preview_review ${work.id}',
            owner: 'legal/content ops',
          ),
        )
        .take(30)
        .toList(growable: false);
    final concertQueue = catalog.works
        .where((work) => work.concertIds.isEmpty)
        .map(
          (work) => ClassicalOpsQueueItem(
            workId: work.id,
            title: work.titleKo,
            composer: work.composerNameKo,
            status: 'concert unmatched',
            category: ClassicalGapCategory.contentOps,
            reason: '관련 공연 후보가 아직 확정되지 않았습니다.',
            nextCommand: 'concert_match_review ${work.id}',
            owner: 'concert ops',
          ),
        )
        .take(30)
        .toList(growable: false);

    final softLaunchGateItems = <ClassicalOpsGateItem>[
      _gate(
        id: 'founder-30',
        label: 'founder_pick 30 ready',
        current: founderReadyCount,
        target: 30,
        category: ClassicalGapCategory.productQuality,
        owner: 'founder/content ops',
        nextAction: 'Founder Pick Review에서 문구와 fallback을 정리합니다.',
        evidenceRequirement: '첫 노출 30개가 ready 또는 soft launch ready입니다.',
      ),
      _gate(
        id: 'first-3m',
        label: 'first 3 minutes funnel evidence',
        current: firstThreeMinuteFunnelComplete ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.productQuality,
        owner: 'product',
        nextAction:
            'Today -> link-out -> save -> reaction -> next path smoke를 실행합니다.',
        evidenceRequirement: '핵심 funnel event가 local event log에 남아야 합니다.',
      ),
      _gate(
        id: 'fallback',
        label: 'safe external search fallback',
        current: founderPicks.where(_hasSafeSearchFallback).length,
        target: 30,
        category: ClassicalGapCategory.contentOps,
        owner: 'content ops',
        nextAction: 'YouTube/Spotify/Apple Music/Melon 검색 fallback을 보강합니다.',
        evidenceRequirement: '검증 전 direct link 대신 안전한 검색 fallback을 제공합니다.',
      ),
      _gate(
        id: 'validation',
        label: 'critical validation errors',
        current: validationReport.errorCount == 0 ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.codeBlocker,
        owner: 'engineering',
        nextAction: 'Catalog validation error를 0으로 만듭니다.',
        evidenceRequirement: 'ClassicalCatalogValidator errorCount == 0',
      ),
    ];
    final softLaunchReady = softLaunchGateItems.every((item) => item.passes);
    final softLaunchReport = ClassicalSoftLaunchReadinessReport(
      status: softLaunchReady
          ? ClassicalReadinessStatus.ready
          : ClassicalReadinessStatus.needsContentOps,
      friendlyUsersReady: softLaunchReady,
      summary: softLaunchReady
          ? '20-50명 가오픈 후보로 볼 수 있습니다.'
          : 'Founder 30 또는 첫 3분 evidence가 아직 부족합니다.',
      gateItems: List<ClassicalOpsGateItem>.unmodifiable(softLaunchGateItems),
      founderReadyCount: founderReadyCount,
      founderPickCount: founderPicks.length,
      issues: founderIssues,
    );

    final publicGateItems = <ClassicalOpsGateItem>[
      _gate(
        id: 'catalog-300',
        label: 'release catalog size',
        current: catalog.works.length,
        target: 300,
        category: ClassicalGapCategory.contentOps,
        owner: 'content ops',
        nextAction: '검수 가능한 작품 catalog를 300개 이상으로 확장합니다.',
        evidenceRequirement: 'Public V1 release catalog count >= 300',
      ),
      _gate(
        id: 'soft-launch',
        label: 'soft launch readiness',
        current: softLaunchReady ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.productQuality,
        owner: 'product',
        nextAction: 'Soft Launch gate의 남은 항목을 처리합니다.',
        evidenceRequirement: 'Soft Launch friendly users YES',
      ),
      _gate(
        id: 'app-identity',
        label: 'store identity verification',
        current: appIdentityGapCount == 0 ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.productionVerification,
        owner: 'release',
        nextAction: '앱 이름, bundle id, version, icon, privacy copy를 확인합니다.',
        evidenceRequirement:
            'Store readiness summary에 production verification GAP이 없습니다.',
      ),
      _gate(
        id: 'store-metadata',
        label: 'store metadata and screenshot draft',
        current: storeMetadataReadiness.gapCount == 0 ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.productionVerification,
        owner: 'release/marketing',
        nextAction: '스토어 문구와 스크린샷 후보를 실제 제출 화면 기준으로 검수합니다.',
        evidenceRequirement:
            'Store metadata와 screenshot 후보에 내부 용어와 fake URL이 없습니다.',
      ),
      _gate(
        id: 'public-copy',
        label: 'public user copy review',
        current: publicCopyReadiness.isVerified ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.productQuality,
        owner: 'product/marketing',
        nextAction: 'Today, My Music, Concerts, store copy에서 내부 용어를 제거합니다.',
        evidenceRequirement:
            '사용자-facing 문구에 CTA/surface/funnel/fake URL 같은 내부 용어가 없습니다.',
      ),
      _gate(
        id: 'build-install-qa',
        label: 'release build and install smoke',
        current: buildQaReadiness.isVerified
            ? 2
            : buildQaReadiness.hasInstallLaunchSmoke
            ? 1
            : 0,
        target: 2,
        category: ClassicalGapCategory.productionVerification,
        owner: 'release/qa',
        nextAction:
            'Android install smoke, AAB build, iOS TestFlight upload을 검증합니다.',
        evidenceRequirement:
            'Android/iOS build와 최소 하나 이상의 install/launch smoke가 제출 기준으로 통과합니다.',
      ),
      _gate(
        id: 'approved-preview',
        label: 'approved preview policy',
        current: founderApprovedPreviewCount,
        target: 30,
        category: ClassicalGapCategory.legalReview,
        owner: 'legal/content ops',
        nextAction: '검증된 provider preview URL만 approved 상태로 반영합니다.',
        evidenceRequirement:
            'Founder first exposure pool의 preview가 approved-only입니다.',
      ),
      _gate(
        id: 'validation-public',
        label: 'release validation errors',
        current: validationReport.errorCount == 0 ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.codeBlocker,
        owner: 'engineering',
        nextAction: 'Release catalog validation error를 0으로 유지합니다.',
        evidenceRequirement: 'Catalog validation errorCount == 0',
      ),
      _gate(
        id: 'feedback-blockers',
        label: 'launch feedback blockers',
        current: feedbackSummary.blockerCount == 0 ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.productQuality,
        owner: 'product/support',
        nextAction: 'Launch feedback에서 blocker category를 triage합니다.',
        evidenceRequirement:
            'link issue / concert issue / retention issue blocker가 없어야 합니다.',
      ),
      _gate(
        id: 'founder-quality',
        label: '5 user founder quality gate',
        current: founderQualityGate.ready ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.productQuality,
        owner: 'founder/product',
        nextAction: '5명 테스트에서 첫 1분 행동과 내일 재방문 이유를 관찰합니다.',
        evidenceRequirement: '5명 중 3명 이상이 Daily step, 추천 이유, link-out, reaction, 내일 재방문 이유를 통과해야 합니다.',
      ),
      _gate(
        id: 'first-use-wow',
        label: 'first-use discovery wow gate',
        current: firstUseWowGate.ready ? 1 : 0,
        target: 1,
        category: ClassicalGapCategory.productQuality,
        owner: 'founder/product',
        nextAction: '5명 테스트에서 첫 추천의 개인화감과 다음 길의 납득감을 관찰합니다.',
        evidenceRequirement:
            '5명 중 4명 이상이 첫 추천 이유를 납득하고, 3명 이상이 재방문 이유와 취향 연결감을 말해야 합니다.',
      ),
      _gate(
        id: 'listening-map-founder-30',
        label: 'founder_pick listening map coverage',
        current: founderMapCoverageCount,
        target: 30,
        category: ClassicalGapCategory.productQuality,
        owner: 'product/content ops',
        nextAction: 'Founder Pick 30개를 감상지도 node와 next path에 연결합니다.',
        evidenceRequirement:
            'Founder Pick 30개가 모두 Listening Map node를 가져야 합니다.',
      ),
      _gate(
        id: 'listening-map-copy',
        label: 'listening map copy coverage',
        current: listeningMapCopyCoverageCount,
        target: mapNodes.length,
        category: ClassicalGapCategory.productQuality,
        owner: 'product/content ops',
        nextAction: '감상지도 node마다 사용자가 이해할 수 있는 짧은 안내문을 채웁니다.',
        evidenceRequirement:
            '모든 Listening Map node에 title, description, public copy가 있어야 합니다.',
      ),
    ];
    final publicReady = publicGateItems.every((item) => item.passes);
    final publicReport = ClassicalPublicV1CloseoutReport(
      status: publicReady
          ? ClassicalReadinessStatus.ready
          : ClassicalReadinessStatus.needsContentOps,
      releaseReady: publicReady,
      summary: publicReady
          ? 'Public V1 release candidate로 고정할 수 있습니다.'
          : 'Public V1 RC 이전에 content ops / verification GAP이 남아 있습니다.',
      includedFeatures: const <String>[
        '오늘 30초 Daily listening step',
        '좋아하는 음악에서 시작하는 감상지도',
        '내 취향을 클래식 감상 언어로 바꾸는 첫 시작점',
        '10초 귀 트임 micro interaction',
        '열린 길/다시 알아본 길/내 곡이 된 작품/다음 길',
        'Next Three 감상 확장',
        '30초/3분 listening guide',
        '외부 플랫폼 link-out/search fallback',
        '저장/reaction 기반 My Music continuity',
        '관련 공연/sponsored card와 aggregate reporting',
      ],
      excludedFeatures: const <String>[
        '음원 host/cache/download',
        '검증되지 않은 provider direct link',
        '검증되지 않은 preview playback',
        'Apple Music Classical 전용 deep link',
        'KOPIS production API key 없는 실제 원격 import',
      ],
      codeBlockerCount: _gapCount(
        publicGateItems,
        ClassicalGapCategory.codeBlocker,
      ),
      contentOpsGapCount: _gapCount(
        publicGateItems,
        ClassicalGapCategory.contentOps,
      ),
      productionVerificationGapCount: _gapCount(
        publicGateItems,
        ClassicalGapCategory.productionVerification,
      ),
      legalReviewGapCount: _gapCount(
        publicGateItems,
        ClassicalGapCategory.legalReview,
      ),
      productQualityGapCount: _gapCount(
        publicGateItems,
        ClassicalGapCategory.productQuality,
      ),
      gateItems: List<ClassicalOpsGateItem>.unmodifiable(publicGateItems),
      evidenceRows: _evidenceRows(
        softLaunchReport: softLaunchReport,
        publicGateItems: publicGateItems,
        workCount: catalog.works.length,
        validationErrors: validationReport.errorCount,
        directReadyWorkCount: directReadyWorkCount,
        safeSearchFallbackWorkCount: safeSearchFallbackWorkCount,
        approvedPreviewWorkCount: approvedPreviewWorkCount,
        concertLinkedWorkCount: catalog.works
            .where((work) => work.concertIds.isNotEmpty)
            .length,
        appIdentityGaps: appIdentityReadiness.gapCount,
        storeMetadataGaps: storeMetadataReadiness.gapCount,
        publicCopyGaps: publicCopyReadiness.issues.length,
        buildQaGaps: buildQaReadiness.gapCount,
        installLaunchSmoke: buildQaReadiness.hasInstallLaunchSmoke,
        feedbackBlockers: feedbackSummary.blockerCount,
        founderQualityGate: founderQualityGate,
        firstUseWowGate: firstUseWowGate,
      ),
    );

    return ClassicalCatalogOpsSummary(
      catalog: catalog,
      validationReport: validationReport,
      workCount: catalog.works.length,
      composerCount: catalog.composers.length,
      concertCount: catalog.concerts.length,
      promotionCount: catalog.promotions.length,
      minimumWorkTarget: 300,
      launchWorkTarget: 1000,
      previewLinkCount: previewLinkCount,
      previewCoveragePercent: catalog.works.isEmpty
          ? 0
          : previewLinkCount / catalog.works.length,
      concertLinkedWorkCount: catalog.works
          .where((work) => work.concertIds.isNotEmpty)
          .length,
      worksMissingListeningMoments: catalog.works
          .where((work) => work.listeningMoments.length < 2)
          .length,
      worksMissingExternalLinks: catalog.works
          .where(
            (work) =>
                work.externalLinks
                    .where((link) => link.linkType.startsWith('listen'))
                    .length <
                3,
          )
          .length,
      worksMissingScoreLinks: catalog.works
          .where((work) => work.scoreLinks.isEmpty)
          .length,
      concertsWithRawText: catalog.concerts
          .where((concert) => concert.programRawText.isNotEmpty)
          .length,
      expectedProgramItems: expectedProgramItems,
      matchedProgramItems: matchedProgramItems,
      promotionsMissingDisclosure: catalog.promotions
          .where((promotion) => promotion.sponsorLabel.trim().isEmpty)
          .length,
      promotionReports: const PromotionReportBuilder().build(
        promotions: catalog.promotions,
        concerts: catalog.concerts,
        events: recentEvents,
      ),
      recentEventTypes: recentEvents
          .map((event) => event.eventType)
          .take(8)
          .toList(growable: false),
      founderPickCount: founderPicks.length,
      founderReadyCount: founderReadyCount,
      releaseCatalogCount: catalog.works.length,
      directReadyWorkCount: directReadyWorkCount,
      safeSearchFallbackWorkCount: safeSearchFallbackWorkCount,
      approvedPreviewWorkCount: approvedPreviewWorkCount,
      founderApprovedPreviewCount: founderApprovedPreviewCount,
      firstThreeMinuteFunnelComplete: firstThreeMinuteFunnelComplete,
      appIdentityGapCount: appIdentityGapCount,
      appIdentityReadiness: appIdentityReadiness,
      storeMetadataReadiness: storeMetadataReadiness,
      publicCopyReadiness: publicCopyReadiness,
      buildQaReadiness: buildQaReadiness,
      feedbackSummary: feedbackSummary,
      founderQualityGate: founderQualityGate,
      firstUseWowGate: firstUseWowGate,
      listeningMapNodeCount: mapNodes.length,
      founderMapCoverageCount: founderMapCoverageCount,
      worksWithMapNodeCount: worksWithMapNodeCount,
      worksWithUnlockPathCount: worksWithUnlockPathCount,
      worksWithConqueredCriteriaCount: worksWithConqueredCriteriaCount,
      orphanMapNodeCount: orphanMapNodeCount,
      brokenMapPrerequisiteCount: brokenMapPrerequisiteCount,
      beginnerPathCoverageCount: beginnerPathCoverageCount,
      listeningMapCopyCoverageCount: listeningMapCopyCoverageCount,
      minimumRecommendedWorksPerMapNode: minimumRecommendedWorksPerMapNode,
      kopisProductionReadiness: kopisProductionReadiness,
      founderReviewQueue: List<ClassicalOpsQueueItem>.unmodifiable(
        founderIssues,
      ),
      directLinkReviewQueue: List<ClassicalOpsQueueItem>.unmodifiable(
        directQueue,
      ),
      previewReviewQueue: List<ClassicalOpsQueueItem>.unmodifiable(
        previewQueue,
      ),
      concertMatchReviewQueue: List<ClassicalOpsQueueItem>.unmodifiable(
        concertQueue,
      ),
      softLaunchReadiness: softLaunchReport,
      publicV1Closeout: publicReport,
    );
  }

  final ClassicalCatalogSnapshot catalog;
  final CatalogValidationReport validationReport;
  final int workCount;
  final int composerCount;
  final int concertCount;
  final int promotionCount;
  final int minimumWorkTarget;
  final int launchWorkTarget;
  final int previewLinkCount;
  final double previewCoveragePercent;
  final int concertLinkedWorkCount;
  final int worksMissingListeningMoments;
  final int worksMissingExternalLinks;
  final int worksMissingScoreLinks;
  final int concertsWithRawText;
  final int expectedProgramItems;
  final int matchedProgramItems;
  final int promotionsMissingDisclosure;
  final List<PromotionReportSummary> promotionReports;
  final List<String> recentEventTypes;
  final int founderPickCount;
  final int founderReadyCount;
  final int releaseCatalogCount;
  final int directReadyWorkCount;
  final int safeSearchFallbackWorkCount;
  final int approvedPreviewWorkCount;
  final int founderApprovedPreviewCount;
  final bool firstThreeMinuteFunnelComplete;
  final int appIdentityGapCount;
  final ClassicalAppIdentityReadiness appIdentityReadiness;
  final ClassicalStoreMetadataReadiness storeMetadataReadiness;
  final ClassicalPublicCopyReadiness publicCopyReadiness;
  final ClassicalBuildQaReadiness buildQaReadiness;
  final ClassicalFeedbackSummary feedbackSummary;
  final ClassicalFounderQualityGate founderQualityGate;
  final ClassicalFirstUseWowGate firstUseWowGate;
  final int listeningMapNodeCount;
  final int founderMapCoverageCount;
  final int worksWithMapNodeCount;
  final int worksWithUnlockPathCount;
  final int worksWithConqueredCriteriaCount;
  final int orphanMapNodeCount;
  final int brokenMapPrerequisiteCount;
  final int beginnerPathCoverageCount;
  final int listeningMapCopyCoverageCount;
  final int minimumRecommendedWorksPerMapNode;
  final ClassicalKopisProductionReadiness kopisProductionReadiness;
  final List<ClassicalOpsQueueItem> founderReviewQueue;
  final List<ClassicalOpsQueueItem> directLinkReviewQueue;
  final List<ClassicalOpsQueueItem> previewReviewQueue;
  final List<ClassicalOpsQueueItem> concertMatchReviewQueue;
  final ClassicalSoftLaunchReadinessReport softLaunchReadiness;
  final ClassicalPublicV1CloseoutReport publicV1Closeout;
}

const _reviewPlatforms = <(String id, String label)>[
  ('youtube', 'YouTube'),
  ('spotify', 'Spotify'),
  ('apple-music', 'Apple Music'),
  ('melon', 'Melon'),
];

const _previewSupportedPlatforms = <String>{'spotify', 'apple-music'};

ExternalLink? _linkForPlatform(ClassicalWork work, String platformId) {
  for (final link in work.externalLinks) {
    if (link.platformId == platformId) {
      return link;
    }
  }
  return null;
}

bool _looksLikeSearchUrl(String url) {
  final lower = url.toLowerCase();
  return lower.contains('/search') ||
      lower.contains('search_query=') ||
      lower.contains('search?term=') ||
      lower.contains('/results?') ||
      lower.contains('/search/total/');
}

bool _hostMatchesPlatform(String platformId, String url) {
  final uri = Uri.tryParse(url);
  final host = uri?.host.toLowerCase() ?? '';
  if (host.isEmpty) {
    return false;
  }
  return switch (platformId) {
    'youtube' => host == 'youtu.be' || host.endsWith('youtube.com'),
    'spotify' => host.endsWith('spotify.com'),
    'apple-music' => host.endsWith('music.apple.com'),
    'melon' => host.endsWith('melon.com'),
    _ => true,
  };
}

ClassicalOpsGateItem _gate({
  required String id,
  required String label,
  required int current,
  required int target,
  required ClassicalGapCategory category,
  required String owner,
  required String nextAction,
  required String evidenceRequirement,
}) {
  return ClassicalOpsGateItem(
    id: id,
    label: label,
    status: current >= target
        ? ClassicalReadinessStatus.ready
        : ClassicalReadinessStatus.needsContentOps,
    category: category,
    current: current,
    target: target,
    owner: owner,
    priority: _gatePriority(
      category: category,
      current: current,
      target: target,
    ),
    nextAction: nextAction,
    evidenceRequirement: evidenceRequirement,
  );
}

String _gatePriority({
  required ClassicalGapCategory category,
  required int current,
  required int target,
}) {
  if (current >= target) {
    return 'done';
  }
  return switch (category) {
    ClassicalGapCategory.codeBlocker => 'P0',
    ClassicalGapCategory.productionVerification => 'P0',
    ClassicalGapCategory.legalReview => 'P0',
    ClassicalGapCategory.productQuality => 'P1',
    ClassicalGapCategory.contentOps => 'P1',
  };
}

bool _hasStatus(ClassicalWork work, String tag) {
  return work.catalogStatusTags.contains(tag);
}

bool _hasVerifiedDirectLink(ClassicalWork work) {
  return work.catalogStatusTags.contains('direct_link_verified') ||
      const ClassicalLinkReviewPolicy()
          .reviewLinks(work)
          .any(
            (review) =>
                review.status == ClassicalProviderLinkStatus.verifiedDirect,
          );
}

bool _hasSafeSearchFallback(ClassicalWork work) {
  return work.externalLinks.any((link) => link.linkType == 'listen_search');
}

bool _hasApprovedPreview(ClassicalWork work) {
  if (work.catalogStatusTags.contains('preview_approved')) {
    return true;
  }
  return const ClassicalLinkReviewPolicy()
      .reviewPreviews(work)
      .any(
        (review) =>
            review.status == ClassicalPreviewReviewStatus.approvedPreview,
      );
}

bool _hasFirstThreeMinuteFunnel(List<DiscoveryEvent> events) {
  final eventTypes = events.map((event) => event.eventType).toSet();
  return eventTypes.contains('listening_moment_preview_open') &&
      eventTypes.contains('external_platform_click') &&
      eventTypes.contains('work_save') &&
      eventTypes.contains('reaction_add') &&
      eventTypes.contains('recommendation_click');
}

List<ListeningMapNode> _opsListeningMapNodes(List<ClassicalWork> works) {
  ListeningMapNode node(
    String id,
    String title,
    String axis,
    int level, {
    List<String> prerequisiteNodeIds = const <String>[],
  }) {
    final primary = works
        .where((work) => _opsMapNodeIdsForWork(work).contains(id))
        .take(10)
        .map((work) => work.id)
        .toList(growable: false);
    final recommended = primary.isNotEmpty
        ? primary
        : works
              .where((work) => level <= 1 || work.difficultyForListening >= 2)
              .where((work) => work.primaryMoment != null)
              .take(6)
              .map((work) => work.id)
              .toList(growable: false);
    return ListeningMapNode(
      id: id,
      title: title,
      description: title,
      axis: axis,
      level: level,
      prerequisiteNodeIds: prerequisiteNodeIds,
      recommendedWorkIds: recommended,
      anchorWorkIds: recommended.take(3).toList(growable: false),
      unlockedByTags: const <String>[],
      userFacingCopy: '$title 쪽으로 다음 작품을 열 수 있습니다.',
    );
  }

  return <ListeningMapNode>[
    node('melody-entry', '선율이 먼저 들리는 길', '선율형', 1),
    node(
      'melody-familiar',
      '긴 선율을 따라가는 길',
      '선율형',
      2,
      prerequisiteNodeIds: const ['melody-entry'],
    ),
    node('color-entry', '악기 색이 들리는 길', '색채형', 1),
    node(
      'color-familiar',
      '소리의 결을 따라가는 길',
      '색채형',
      2,
      prerequisiteNodeIds: const ['color-entry'],
    ),
    node('rhythm-entry', '몸이 먼저 반응하는 길', '리듬형', 1),
    node(
      'rhythm-familiar',
      '반복과 변형이 보이는 길',
      '리듬형',
      2,
      prerequisiteNodeIds: const ['rhythm-entry'],
    ),
    node('dramatic-entry', '장면이 바뀌는 길', '극적형', 1),
    node(
      'dramatic-familiar',
      '큰 흐름을 따라가는 길',
      '극적형',
      2,
      prerequisiteNodeIds: const ['dramatic-entry'],
    ),
    node('tension-entry', '긴장이 쌓이는 길', '긴장형', 1),
    node('form-entry', '주제가 돌아오는 길', '구조형', 1),
    node(
      'form-familiar',
      '구조가 보이는 길',
      '구조형',
      2,
      prerequisiteNodeIds: const ['form-entry'],
    ),
    node('instrument-color', '좋아하는 악기로 넓히는 길', '악기형', 1),
  ];
}

bool _hasPublicListeningMapCopy(ListeningMapNode node) {
  final copy = [node.title, node.description, node.userFacingCopy].join(' ');
  if (node.title.trim().isEmpty ||
      node.description.trim().isEmpty ||
      node.userFacingCopy.trim().isEmpty) {
    return false;
  }
  return !_opsContainsAny(copy, ['AI', 'CTA', 'funnel', 'surface', 'coverage']);
}

List<ListeningMapEdge> _opsListeningMapEdges() {
  return const <ListeningMapEdge>[
    ListeningMapEdge(
      fromNodeId: 'melody-entry',
      toNodeId: 'melody-familiar',
      reason: '선율을 잡으면 긴 선율로 이어집니다.',
      difficultyStep: 1,
    ),
    ListeningMapEdge(
      fromNodeId: 'melody-entry',
      toNodeId: 'color-entry',
      reason: '선율 뒤의 소리 색으로 넓힙니다.',
      difficultyStep: 1,
    ),
    ListeningMapEdge(
      fromNodeId: 'color-entry',
      toNodeId: 'color-familiar',
      reason: '소리 색을 더 깊게 듣습니다.',
      difficultyStep: 1,
    ),
    ListeningMapEdge(
      fromNodeId: 'rhythm-entry',
      toNodeId: 'rhythm-familiar',
      reason: '움직임에서 반복과 변형으로 갑니다.',
      difficultyStep: 1,
    ),
    ListeningMapEdge(
      fromNodeId: 'dramatic-entry',
      toNodeId: 'dramatic-familiar',
      reason: '장면 전환에서 큰 흐름으로 갑니다.',
      difficultyStep: 1,
    ),
    ListeningMapEdge(
      fromNodeId: 'form-entry',
      toNodeId: 'form-familiar',
      reason: '주제의 귀환을 더 길게 따라갑니다.',
      difficultyStep: 1,
    ),
  ];
}

Set<String> _opsMapNodeIdsForWork(ClassicalWork work) {
  final primaryAxis = _opsPrimaryAxisForWork(work);
  final text = [
    work.titleKo,
    work.titleOriginal,
    work.instrumentation,
    work.period,
    ...work.moodTags,
    ...work.contextTags,
  ].join(' ');
  return <String>{
    _opsEntryNodeIdForAxis(primaryAxis),
    if (work.difficultyForListening >= 2)
      _opsFamiliarNodeIdForAxis(primaryAxis),
    if (work.instrumentation.isNotEmpty) 'instrument-color',
    if (_opsContainsAny(text, ['긴장', '어두', '비극', '불안', '폭풍', '단조']))
      'tension-entry',
  };
}

String _opsPrimaryAxisForWork(ClassicalWork work) {
  final text = [
    work.titleKo,
    work.titleOriginal,
    work.instrumentation,
    work.period,
    ...work.moodTags,
    ...work.contextTags,
  ].join(' ');
  if (_opsContainsAny(text, ['색채', '인상', '관현악', '목관', '현악', '분위기'])) {
    return '색채형';
  }
  if (_opsContainsAny(text, ['춤', '리듬', '행진', '스케르초', '반복', '활기'])) {
    return '리듬형';
  }
  if (_opsContainsAny(text, ['긴장', '어두', '비극', '불안', '폭풍', '단조'])) {
    return '긴장형';
  }
  if (_opsContainsAny(text, ['극적', '클라이맥스', '협주곡', '오페라', '서사', '웅장'])) {
    return '극적형';
  }
  if (_opsContainsAny(text, ['푸가', '변주', '소나타', '교향곡', '사중주', '구조'])) {
    return '구조형';
  }
  return '선율형';
}

String _opsEntryNodeIdForAxis(String axis) {
  return switch (axis) {
    '색채형' => 'color-entry',
    '리듬형' => 'rhythm-entry',
    '극적형' => 'dramatic-entry',
    '긴장형' => 'tension-entry',
    '구조형' => 'form-entry',
    _ => 'melody-entry',
  };
}

String _opsFamiliarNodeIdForAxis(String axis) {
  return switch (axis) {
    '색채형' => 'color-familiar',
    '리듬형' => 'rhythm-familiar',
    '극적형' => 'dramatic-familiar',
    '구조형' => 'form-familiar',
    _ => 'melody-familiar',
  };
}

bool _opsContainsAny(String value, List<String> needles) {
  final normalized = normalizeDiscoveryText(value);
  return needles.any(
    (needle) => normalized.contains(normalizeDiscoveryText(needle)),
  );
}

List<ClassicalOpsQueueItem> _directLinkReviewQueue(List<ClassicalWork> works) {
  const policy = ClassicalLinkReviewPolicy();
  return works
      .where((work) => !_hasVerifiedDirectLink(work))
      .map((work) {
        final reviews = policy.reviewLinks(work);
        final warning = reviews
            .map((review) => review.warning)
            .where((value) => value.isNotEmpty)
            .firstOrNull;
        final status = reviews
            .map((review) => '${review.label}:${review.status.name}')
            .join(', ');
        return ClassicalOpsQueueItem(
          workId: work.id,
          title: work.titleKo,
          composer: work.composerNameKo,
          status: status,
          category: _hasSafeSearchFallback(work)
              ? ClassicalGapCategory.contentOps
              : ClassicalGapCategory.codeBlocker,
          reason:
              warning ??
              (_hasSafeSearchFallback(work)
                  ? '검증된 direct link는 없고 provider별 검색 fallback만 있습니다.'
                  : '외부 플랫폼으로 나갈 안전한 fallback이 없습니다.'),
          nextCommand: 'external_link_review ${work.id}',
          owner: 'content ops',
        );
      })
      .take(30)
      .toList(growable: false);
}

List<ClassicalOpsQueueItem> _founderReviewQueue(List<ClassicalWork> works) {
  final issues = <ClassicalOpsQueueItem>[];
  for (final work in works) {
    if (!_hasReleaseMetadataQuality(work)) {
      issues.add(
        ClassicalOpsQueueItem(
          workId: work.id,
          title: work.titleKo,
          composer: work.composerNameKo,
          status: 'needs metadata',
          category: ClassicalGapCategory.productQuality,
          reason: '첫 노출 작품의 한국어명, 원제, 작곡가, 작품번호 검수가 필요합니다.',
          nextCommand: 'work_metadata_review ${work.id}',
          owner: 'founder/content ops',
        ),
      );
    }
    if (!_hasHumanPromptQuality(work)) {
      issues.add(
        ClassicalOpsQueueItem(
          workId: work.id,
          title: work.titleKo,
          composer: work.composerNameKo,
          status: 'needs copy',
          category: ClassicalGapCategory.productQuality,
          reason: '첫 guide 문구가 너무 짧거나 앱 내부 용어처럼 보입니다.',
          nextCommand: 'work_copy_review ${work.id}',
          owner: 'founder/content ops',
        ),
      );
    }
    if (!_hasRecommendationPath(work)) {
      issues.add(
        ClassicalOpsQueueItem(
          workId: work.id,
          title: work.titleKo,
          composer: work.composerNameKo,
          status: 'needs recommendation path',
          category: ClassicalGapCategory.productQuality,
          reason: '저장/reaction 후 자연스럽게 이어질 related work 또는 tag 연결이 부족합니다.',
          nextCommand: 'recommendation_path_review ${work.id}',
          owner: 'product/content ops',
        ),
      );
    }
    if (!_hasSafeSearchFallback(work)) {
      issues.add(
        ClassicalOpsQueueItem(
          workId: work.id,
          title: work.titleKo,
          composer: work.composerNameKo,
          status: 'needs fallback',
          category: ClassicalGapCategory.codeBlocker,
          reason: '전체 듣기로 나갈 안전한 검색 fallback이 없습니다.',
          nextCommand: 'external_link_upsert ${work.id}',
          owner: 'engineering/content ops',
        ),
      );
    }
    if (work.concertIds.isEmpty) {
      issues.add(
        ClassicalOpsQueueItem(
          workId: work.id,
          title: work.titleKo,
          composer: work.composerNameKo,
          status: 'no concert match',
          category: ClassicalGapCategory.contentOps,
          reason: '관련 공연이 없거나 아직 수동 확인되지 않았습니다.',
          nextCommand: 'concert_match_review ${work.id}',
          owner: 'concert ops',
        ),
      );
    }
  }
  return issues;
}

bool _hasReleaseMetadataQuality(ClassicalWork work) {
  if (work.titleKo.trim().length < 2 ||
      work.titleOriginal.trim().length < 2 ||
      work.composerNameKo.trim().length < 2 ||
      work.composerNameOriginal.trim().length < 2) {
    return false;
  }
  if (work.catalogNumber.trim().isEmpty &&
      !work.catalogStatusTags.contains('catalog_number_unavailable')) {
    return false;
  }
  return true;
}

bool _hasRecommendationPath(ClassicalWork work) {
  return work.relatedWorkIds.isNotEmpty ||
      work.moodTags.length >= 2 ||
      work.contextTags.length >= 2;
}

bool _hasHumanPromptQuality(ClassicalWork work) {
  final prompt = work.primaryMoment?.prompt.trim() ?? '';
  if (prompt.length < 12 || prompt.length > 90) {
    return false;
  }
  final blockedWords = <String>[
    'CTA',
    'surface',
    'flow',
    '사용자는',
    '기능',
    '버튼',
    '개인화',
    '추천',
    '분석',
    '당신',
    'AI',
    'streak',
    'XP',
  ];
  if (blockedWords.any(prompt.contains)) {
    return false;
  }
  return prompt.contains('들') ||
      prompt.contains('기다') ||
      prompt.contains('찾') ||
      prompt.contains('따라');
}

int _gapCount(List<ClassicalOpsGateItem> items, ClassicalGapCategory category) {
  return items
      .where((item) => item.category == category && !item.passes)
      .length;
}

ClassicalFeedbackSummary _feedbackSummary(List<DiscoveryEvent> events) {
  final feedbackEvents = events
      .where((event) => event.eventType == 'feedback_submit')
      .toList(growable: false);
  final counts = <String, int>{};
  final latestMessages = <String, String>{};
  for (final event in feedbackEvents) {
    final category = event.properties['category'] ?? event.context ?? 'other';
    counts[category] = (counts[category] ?? 0) + 1;
    final message = event.properties['message'] ?? '';
    if (message.isNotEmpty && !latestMessages.containsKey(category)) {
      latestMessages[category] = message;
    }
  }
  final items = counts.entries.map((entry) {
    final priority = _feedbackPriority(entry.key, entry.value);
    return ClassicalFeedbackSummaryItem(
      category: entry.key,
      count: entry.value,
      priority: priority,
      latestMessage: latestMessages[entry.key] ?? '',
    );
  }).toList();
  items.sort((a, b) {
    final priority = _feedbackPriorityRank(b.priority)
        .compareTo(_feedbackPriorityRank(a.priority));
    if (priority != 0) {
      return priority;
    }
    return b.count.compareTo(a.count);
  });
  final blockerCount = items
      .where((item) => item.priority == 'blocker')
      .fold<int>(0, (sum, item) => sum + item.count);
  return ClassicalFeedbackSummary(
    totalCount: feedbackEvents.length,
    blockerCount: blockerCount,
    items: List<ClassicalFeedbackSummaryItem>.unmodifiable(items),
  );
}

int _probeTrueCount(List<DiscoveryEvent> events, String propertyName) {
  return events
      .where((event) => event.properties[propertyName] == 'true')
      .length;
}

String _feedbackPriority(String category, int count) {
  const blockerCategories = <String>{
    'link_issue',
    'concert_issue',
    'retention_issue',
    'crash_or_blocker',
  };
  if (blockerCategories.contains(category) || count >= 3) {
    return 'blocker';
  }
  if (category == 'copy_issue' || count >= 2) {
    return 'review';
  }
  return 'watch';
}

int _feedbackPriorityRank(String priority) {
  return switch (priority) {
    'blocker' => 3,
    'review' => 2,
    _ => 1,
  };
}

List<String> _evidenceRows({
  required ClassicalSoftLaunchReadinessReport softLaunchReport,
  required List<ClassicalOpsGateItem> publicGateItems,
  required int workCount,
  required int validationErrors,
  required int directReadyWorkCount,
  required int safeSearchFallbackWorkCount,
  required int approvedPreviewWorkCount,
  required int concertLinkedWorkCount,
  required int appIdentityGaps,
  required int storeMetadataGaps,
  required int publicCopyGaps,
  required int buildQaGaps,
  required bool installLaunchSmoke,
  required int feedbackBlockers,
  required ClassicalFounderQualityGate founderQualityGate,
  required ClassicalFirstUseWowGate firstUseWowGate,
}) {
  return <String>[
    'Soft Launch: ${softLaunchReport.friendlyUsersReady ? 'YES' : 'NO'} '
        '(${softLaunchReport.founderReadyCount}/${softLaunchReport.founderPickCount} founder picks ready)',
    'Public V1 release catalog: $workCount works',
    'Catalog validation errors: $validationErrors',
    'Verified direct links: $directReadyWorkCount',
    'Safe search fallback works: $safeSearchFallbackWorkCount',
    'Approved preview works: $approvedPreviewWorkCount',
    'Concert-linked works: $concertLinkedWorkCount',
    'App identity production verification gaps: $appIdentityGaps',
    'Store metadata production verification gaps: $storeMetadataGaps',
    'Public copy product quality gaps: $publicCopyGaps',
    'Build QA production verification gaps: $buildQaGaps',
    'Install/launch smoke: ${installLaunchSmoke ? 'PASS' : 'GAP'}',
    'Launch feedback blockers: $feedbackBlockers',
    founderQualityGate.exportText,
    firstUseWowGate.exportText,
    for (final item in publicGateItems)
      '${item.label}: ${item.passes ? 'PASS' : 'GAP'} '
          '(${item.current}/${item.target}) · ${item.priority} · owner ${item.owner}',
  ];
}
