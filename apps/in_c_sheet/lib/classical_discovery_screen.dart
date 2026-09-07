import 'dart:async';

import 'package:flutter/material.dart';

import 'classical_concert_import.dart';
import 'classical_discovery_controller.dart';
import 'classical_discovery_models.dart';
import 'classical_discovery_ops.dart';
import 'classical_discovery_validation.dart';
import 'classical_link_launcher.dart';
import 'classical_preview_player.dart';

const _reactionLabels = <String, String>{
  'liked': '좋음',
  'repeat': '다시 듣기',
  'instrument': '악기가 궁금함',
  'unsure': '아직 모르겠음',
};

class ClassicalDiscoveryScreen extends StatefulWidget {
  const ClassicalDiscoveryScreen({required this.controller, super.key});

  final ClassicalDiscoveryController controller;

  @override
  State<ClassicalDiscoveryScreen> createState() =>
      _ClassicalDiscoveryScreenState();
}

class _ClassicalDiscoveryScreenState extends State<ClassicalDiscoveryScreen> {
  int _selectedIndex = 0;
  String _query = '';
  bool _didShowOnboarding = false;

  ClassicalDiscoveryController get controller => widget.controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        _scheduleOnboardingIfNeeded();
        return Scaffold(
          appBar: AppBar(
            title: const Text('in C'),
            actions: [
              IconButton(
                tooltip: '선호 플랫폼',
                onPressed: _showPlatformSheet,
                icon: const Icon(Icons.play_circle_outline),
              ),
              IconButton(
                tooltip: '지역',
                onPressed: _showRegionSheet,
                icon: const Icon(Icons.location_on_outlined),
              ),
              IconButton(
                tooltip: '의견 보내기',
                onPressed: _showFeedbackSheet,
                icon: const Icon(Icons.feedback_outlined),
              ),
              IconButton(
                tooltip: 'Catalog Ops',
                onPressed: _openCatalogOps,
                icon: const Icon(Icons.fact_check_outlined),
              ),
            ],
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _selectedIndex,
            onDestinationSelected: (index) {
              setState(() {
                _selectedIndex = index;
              });
            },
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.today_outlined),
                selectedIcon: Icon(Icons.today),
                label: 'Preview',
              ),
              NavigationDestination(
                icon: Icon(Icons.explore_outlined),
                selectedIcon: Icon(Icons.explore),
                label: 'Discover',
              ),
              NavigationDestination(
                icon: Icon(Icons.library_music_outlined),
                selectedIcon: Icon(Icons.library_music),
                label: 'My Music',
              ),
              NavigationDestination(icon: Icon(Icons.search), label: 'Works'),
              NavigationDestination(
                icon: Icon(Icons.event_outlined),
                selectedIcon: Icon(Icons.event),
                label: 'Concerts',
              ),
            ],
          ),
          body: SafeArea(
            child: controller.isLoading
                ? const Center(child: CircularProgressIndicator())
                : _buildSelectedPage(context),
          ),
        );
      },
    );
  }

  void _scheduleOnboardingIfNeeded() {
    if (_didShowOnboarding ||
        controller.isLoading ||
        !controller.needsOnboarding) {
      return;
    }
    _didShowOnboarding = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !controller.needsOnboarding) {
        return;
      }
      unawaited(_showOnboardingSheet());
    });
  }

  Widget _buildSelectedPage(BuildContext context) {
    return switch (_selectedIndex) {
      0 => _TodayView(
        controller: controller,
        onOpenWork: _openWork,
        onOpenLink: _openLink,
        onOpenTicket: _openTicket,
        onOpenConcert: _openPromotionConcert,
      ),
      1 => _DiscoverView(controller: controller, onOpenWork: _openWork),
      2 => _MyMusicView(
        controller: controller,
        onOpenWork: _openWork,
        onPlatformPressed: _showPlatformSheet,
        onPreferencesPressed: _showOnboardingSheet,
      ),
      3 => _WorksView(
        controller: controller,
        query: _query,
        onQueryChanged: (value) => setState(() => _query = value),
        onOpenWork: _openWork,
      ),
      _ => _ConcertsView(
        controller: controller,
        onOpenWork: _openWork,
        onOpenTicket: _openTicket,
      ),
    };
  }

  Future<void> _openWork(ClassicalWork work) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) =>
            ClassicalWorkDetailScreen(controller: controller, work: work),
      ),
    );
  }

  Future<void> _openCatalogOps() async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => ClassicalCatalogOpsScreen(controller: controller),
      ),
    );
  }

  Future<void> _openLink(ClassicalWork work, ExternalLink link) async {
    await controller.recordProviderClick(work, link);
    final opened = await _launchUrl(
      link.url,
      surface: ClassicalLinkSurface.listening,
    );
    if (opened || link.linkType == 'listen_search') {
      return;
    }
    final fallback = _fallbackSearchLinkFor(work, except: link.id);
    if (fallback == null) {
      return;
    }
    await controller.recordProviderClick(work, fallback, fallback: true);
    await _launchUrl(fallback.url, surface: ClassicalLinkSurface.listening);
  }

  Future<void> _openTicket(ClassicalPromotionView view) async {
    await controller.recordPromotionClick(view.promotion.id);
    await controller.recordTicketDestinationClick(view.concert.id);
    await _launchUrl(
      view.concert.ticketUrl,
      surface: ClassicalLinkSurface.ticket,
    );
  }

  Future<void> _openPromotionConcert(ClassicalPromotionView view) async {
    await controller.recordPromotionClick(view.promotion.id);
    await _openConcert(view.concert);
  }

  Future<void> _openConcert(ClassicalConcert concert) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => ClassicalConcertDetailScreen(
          controller: controller,
          concert: concert,
        ),
      ),
    );
  }

  Future<bool> _launchUrl(
    String value, {
    ClassicalLinkSurface surface = ClassicalLinkSurface.listening,
  }) async {
    return launchClassicalUrl(context, value, surface: surface);
  }

  Future<void> _showPlatformSheet() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        const platforms = <({String id, String label})>[
          (id: 'youtube', label: 'YouTube'),
          (id: 'spotify', label: 'Spotify'),
          (id: 'apple-music', label: 'Apple Music'),
          (id: 'melon', label: 'Melon'),
        ];
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              for (final platform in platforms)
                ListTile(
                  leading: const Icon(Icons.play_arrow_outlined),
                  title: Text(platform.label),
                  trailing: controller.preferredPlatformId == platform.id
                      ? const Icon(Icons.check)
                      : null,
                  onTap: () => Navigator.of(context).pop(platform.id),
                ),
            ],
          ),
        );
      },
    );
    if (selected != null) {
      await controller.setPreferredPlatform(selected);
    }
  }

  Future<void> _showOnboardingSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      isDismissible: false,
      builder: (context) => _OnboardingSheet(controller: controller),
    );
  }

  Future<void> _showRegionSheet() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        const regions = <String>['서울', '경기', '부산', '대전', '대구', '광주'];
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              for (final region in regions)
                ListTile(
                  leading: const Icon(Icons.location_on_outlined),
                  title: Text(region),
                  trailing: controller.region == region
                      ? const Icon(Icons.check)
                      : null,
                  onTap: () => Navigator.of(context).pop(region),
                ),
            ],
          ),
        );
      },
    );
    if (selected != null) {
      await controller.setRegion(selected);
    }
  }

  Future<void> _showFeedbackSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _FeedbackSheet(controller: controller),
    );
  }
}

class ClassicalCatalogOpsScreen extends StatelessWidget {
  const ClassicalCatalogOpsScreen({required this.controller, super.key});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    final summary = ClassicalCatalogOpsSummary.fromCatalog(
      catalog: controller.catalogSnapshot,
      recentEvents: controller.state.events,
    );
    final report = summary.validationReport;
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Catalog Ops')),
      body: SafeArea(
        child: _PageFrame(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
            children: [
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report.hasErrors ? '검증 필요' : 'Catalog OK',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(
                          avatar: const Icon(Icons.library_music_outlined),
                          label: Text('${summary.workCount} works'),
                        ),
                        Chip(
                          avatar: const Icon(Icons.person_outline),
                          label: Text('${summary.composerCount} composers'),
                        ),
                        Chip(
                          avatar: const Icon(Icons.event_outlined),
                          label: Text('${summary.concertCount} concerts'),
                        ),
                        Chip(
                          avatar: const Icon(Icons.campaign_outlined),
                          label: Text('${summary.promotionCount} promotions'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'errors ${report.errorCount} · warnings ${report.warningCount}',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Soft Launch Readiness'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  (
                    'friendly users',
                    summary.softLaunchReadiness.friendlyUsersReady
                        ? 'YES'
                        : 'NO',
                  ),
                  (
                    'status',
                    _readinessLabel(summary.softLaunchReadiness.status),
                  ),
                  ('summary', summary.softLaunchReadiness.summary),
                  (
                    'founder ready',
                    '${summary.founderReadyCount}/${summary.founderPickCount}',
                  ),
                  (
                    'first 3 minutes',
                    summary.firstThreeMinuteFunnelComplete ? 'PASS' : 'GAP',
                  ),
                ],
              ),
              for (final item in summary.softLaunchReadiness.gateItems.where(
                (item) => !item.passes,
              ))
                _Panel(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.flag_outlined),
                    title: Text(item.label),
                    subtitle: Text(
                      '${item.current}/${item.target} · ${item.nextAction}',
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Public V1 Closeout'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  (
                    'release-ready',
                    summary.publicV1Closeout.releaseReady ? 'YES' : 'NO',
                  ),
                  ('status', _readinessLabel(summary.publicV1Closeout.status)),
                  ('summary', summary.publicV1Closeout.summary),
                  (
                    'GAP 분류',
                    'code ${summary.publicV1Closeout.codeBlockerCount} · '
                        'content ${summary.publicV1Closeout.contentOpsGapCount} · '
                        'verification ${summary.publicV1Closeout.productionVerificationGapCount} · '
                        'legal ${summary.publicV1Closeout.legalReviewGapCount} · '
                        'quality ${summary.publicV1Closeout.productQualityGapCount}',
                  ),
                  ('evidence', summary.publicV1Closeout.evidenceText),
                ],
              ),
              for (final item in summary.publicV1Closeout.gateItems.where(
                (item) => !item.passes,
              ))
                _Panel(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.pending_actions_outlined),
                    title: Text('${item.priority} · ${item.label}'),
                    subtitle: Text(
                      '${item.category.name} · ${item.current}/${item.target}\n'
                      'owner: ${item.owner}\n'
                      'next: ${item.nextAction}\n'
                      'evidence: ${item.evidenceRequirement}',
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Release Catalog Lock'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('release catalog', '${summary.releaseCatalogCount} works'),
                  ('verified direct', '${summary.directReadyWorkCount} works'),
                  (
                    'safe fallback',
                    '${summary.safeSearchFallbackWorkCount} works',
                  ),
                  (
                    'approved preview',
                    '${summary.approvedPreviewWorkCount} works',
                  ),
                  (
                    'founder preview',
                    '${summary.founderApprovedPreviewCount}/${summary.founderPickCount} approved',
                  ),
                  ('map nodes', '${summary.listeningMapNodeCount} nodes'),
                  (
                    'founder map',
                    '${summary.founderMapCoverageCount}/${summary.founderPickCount}',
                  ),
                  (
                    'map coverage',
                    '${summary.worksWithMapNodeCount}/${summary.workCount} works',
                  ),
                  ('unlock path', '${summary.worksWithUnlockPathCount} works'),
                  (
                    'familiarity criteria',
                    '${summary.worksWithConqueredCriteriaCount} works',
                  ),
                  (
                    'map integrity',
                    'orphan ${summary.orphanMapNodeCount} · broken prereq ${summary.brokenMapPrerequisiteCount}',
                  ),
                  (
                    'beginner path',
                    '${summary.beginnerPathCoverageCount} works',
                  ),
                  (
                    'map copy',
                    '${summary.listeningMapCopyCoverageCount}/${summary.listeningMapNodeCount}',
                  ),
                  (
                    'node work floor',
                    '${summary.minimumRecommendedWorksPerMapNode} works',
                  ),
                  (
                    'app identity',
                    summary.appIdentityReadiness.isVerified
                        ? 'decision accepted'
                        : '${summary.appIdentityGapCount} GAP',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'App Identity'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('current app', summary.appIdentityReadiness.appName),
                  ('target app', summary.appIdentityReadiness.targetAppName),
                  (
                    'current Android id',
                    summary.appIdentityReadiness.androidApplicationId,
                  ),
                  (
                    'target Android id',
                    summary.appIdentityReadiness.targetAndroidApplicationId,
                  ),
                  ('current iOS id', summary.appIdentityReadiness.iosBundleId),
                  (
                    'target iOS id',
                    summary.appIdentityReadiness.targetIosBundleId,
                  ),
                  ('current version', summary.appIdentityReadiness.version),
                  (
                    'target version',
                    summary.appIdentityReadiness.targetVersion,
                  ),
                  ('subtitle', summary.appIdentityReadiness.storeSubtitle),
                  (
                    'description',
                    summary.appIdentityReadiness.shortDescription,
                  ),
                  ('icon', summary.appIdentityReadiness.iconStatus),
                  ('privacy', summary.appIdentityReadiness.privacyCopyStatus),
                  (
                    'permissions',
                    summary.appIdentityReadiness.permissionSummary,
                  ),
                  (
                    'release decision',
                    summary.appIdentityReadiness.releaseDecision,
                  ),
                  (
                    'next identity plan',
                    summary.appIdentityReadiness.nextIdentityPlan,
                  ),
                  (
                    'production GAP',
                    summary.appIdentityReadiness.gaps.isEmpty
                        ? '없음'
                        : summary.appIdentityReadiness.gaps.join('\n'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Store Metadata'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('app name', summary.storeMetadataReadiness.appName),
                  ('subtitle', summary.storeMetadataReadiness.subtitle),
                  (
                    'short description',
                    summary.storeMetadataReadiness.shortDescription,
                  ),
                  (
                    'keywords',
                    summary.storeMetadataReadiness.keywords.join(', '),
                  ),
                  ('category', summary.storeMetadataReadiness.category),
                  (
                    'age rating',
                    summary.storeMetadataReadiness.ageRatingAssumption,
                  ),
                  (
                    'permissions',
                    summary.storeMetadataReadiness.permissionSummary,
                  ),
                  (
                    'screenshots',
                    summary.storeMetadataReadiness.screenshotSurfaces.join(
                      ', ',
                    ),
                  ),
                  (
                    'screenshot files',
                    summary.storeMetadataReadiness.screenshotArtifactPaths.join(
                      '\n',
                    ),
                  ),
                  (
                    'exclude',
                    summary.storeMetadataReadiness.excludedScreenshotSurfaces
                        .join(', '),
                  ),
                  ('privacy', summary.storeMetadataReadiness.privacySummary),
                  ('support', summary.storeMetadataReadiness.supportContact),
                  (
                    'production GAP',
                    summary.storeMetadataReadiness.gaps.isEmpty
                        ? '없음'
                        : summary.storeMetadataReadiness.gaps.join('\n'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Public Copy'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  (
                    'checked',
                    summary.publicCopyReadiness.checkedSurfaces.join(', '),
                  ),
                  (
                    'blocked terms',
                    summary.publicCopyReadiness.blockedTerms.join(', '),
                  ),
                  (
                    'copy GAP',
                    summary.publicCopyReadiness.issues.isEmpty
                        ? '없음'
                        : summary.publicCopyReadiness.issues.join('\n'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Build QA'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('entry flag', summary.buildQaReadiness.inCEntryFlag),
                  (
                    'Android debug APK',
                    summary.buildQaReadiness.androidDebugApk,
                  ),
                  (
                    'Android release APK',
                    summary.buildQaReadiness.androidReleaseApk,
                  ),
                  ('Android AAB', summary.buildQaReadiness.androidAppBundle),
                  (
                    'Android install',
                    summary.buildQaReadiness.androidInstallSmoke,
                  ),
                  (
                    'iOS no-codesign',
                    summary.buildQaReadiness.iosNoCodesignBuild,
                  ),
                  (
                    'iOS simulator',
                    summary.buildQaReadiness.iosSimulatorInstallLaunchSmoke,
                  ),
                  ('TestFlight', summary.buildQaReadiness.iosTestFlightUpload),
                  (
                    'production GAP',
                    summary.buildQaReadiness.gaps.isEmpty
                        ? '없음'
                        : summary.buildQaReadiness.gaps.join('\n'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Launch Feedback'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('feedback', '${summary.feedbackSummary.totalCount}'),
                  ('blocker', '${summary.feedbackSummary.blockerCount}'),
                  ('export', summary.feedbackSummary.exportText),
                ],
              ),
              for (final item in summary.feedbackSummary.items.take(5))
                _Panel(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.feedback_outlined),
                    title: Text('${item.category} · ${item.priority}'),
                    subtitle: Text(
                      item.latestMessage.isEmpty
                          ? '${item.count}건'
                          : '${item.count}건 · ${item.latestMessage}',
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Founder Quality Gate'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('ready', summary.founderQualityGate.ready ? 'YES' : 'NO'),
                  ('tested', '${summary.founderQualityGate.testedUserCount}/5'),
                  (
                    'daily step',
                    '${summary.founderQualityGate.dailyStepTapCount}',
                  ),
                  (
                    'reason accepted',
                    '${summary.founderQualityGate.reasonAcceptedCount}',
                  ),
                  ('link-out', '${summary.founderQualityGate.linkOutCount}'),
                  ('reaction', '${summary.founderQualityGate.reactionCount}'),
                  (
                    'map',
                    '${summary.founderQualityGate.mapUnderstandingCount}',
                  ),
                  (
                    'comeback',
                    '${summary.founderQualityGate.comebackReasonCount}',
                  ),
                  ('export', summary.founderQualityGate.exportText),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'KOPIS Production'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('mode', summary.kopisProductionReadiness.mode),
                  (
                    'status',
                    summary.kopisProductionReadiness.statuses
                        .map((status) => status.name)
                        .join(', '),
                  ),
                  ('summary', summary.kopisProductionReadiness.summary),
                  (
                    'production GAP',
                    summary.kopisProductionReadiness.gaps.join('\n'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Review Queues'),
              const SizedBox(height: 8),
              _OpsQueuePreview(
                title: 'Founder Pick Review',
                items: summary.founderReviewQueue,
                emptyMessage: 'Founder first exposure issue가 없습니다.',
              ),
              _OpsQueuePreview(
                title: 'Direct Link Review',
                items: summary.directLinkReviewQueue,
                emptyMessage: '검증 대기 중인 direct link GAP이 없습니다.',
              ),
              _OpsQueuePreview(
                title: 'Preview Review',
                items: summary.previewReviewQueue,
                emptyMessage: '검증 대기 중인 preview GAP이 없습니다.',
              ),
              _OpsQueuePreview(
                title: 'Concert Match Review',
                items: summary.concertMatchReviewQueue,
                emptyMessage: '검증 대기 중인 concert match GAP이 없습니다.',
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Works Coverage'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('작품 수', '${summary.workCount}'),
                  (
                    'V1 최소 목표',
                    '${summary.workCount}/${summary.minimumWorkTarget}',
                  ),
                  (
                    '출시 후보 목표',
                    '${summary.workCount}/${summary.launchWorkTarget}',
                  ),
                  ('작곡가 수', '${summary.composerCount}'),
                  (
                    'preview link 보유',
                    '${summary.previewLinkCount} (${_formatRate(summary.previewCoveragePercent)})',
                  ),
                  ('공연 연결 작품', '${summary.concertLinkedWorkCount}'),
                  (
                    'listening moment 부족',
                    '${summary.worksMissingListeningMoments}',
                  ),
                  ('외부 link 부족', '${summary.worksMissingExternalLinks}'),
                  ('악보 link 부족', '${summary.worksMissingScoreLinks}'),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Concert Matching'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('공연 수', '${summary.concertCount}'),
                  ('raw text 보유', '${summary.concertsWithRawText}'),
                  (
                    'program match',
                    '${summary.matchedProgramItems}/${summary.expectedProgramItems}',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Promotion Coverage'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('promotion 수', '${summary.promotionCount}'),
                  ('disclosure 누락', '${summary.promotionsMissingDisclosure}'),
                ],
              ),
              const SizedBox(height: 8),
              for (final report in summary.promotionReports)
                _Panel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        report.advertiserName,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'imp ${report.impressions} · click ${report.clicks} · save ${report.saves} · dismiss ${report.dismisses} · ticket ${report.ticketClicks}',
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'CTR ${_formatRate(report.ctr)} · save ${_formatRate(report.saveRate)} · dismiss ${_formatRate(report.dismissRate)}',
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Event Schema'),
              const SizedBox(height: 8),
              _OpsSummaryPanel(
                rows: [
                  ('local event 수', '${controller.state.events.length}'),
                  (
                    '최근 event',
                    summary.recentEventTypes.isEmpty
                        ? '없음'
                        : summary.recentEventTypes.join(', '),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _SectionTitle(title: 'Validation'),
              const SizedBox(height: 8),
              if (report.issues.isEmpty)
                const _EmptyState(
                  icon: Icons.check_circle_outline,
                  title: '누락된 필드가 없습니다',
                  message: 'Seed catalog가 현재 validation rule을 통과했습니다.',
                )
              else
                for (final issue in report.issues)
                  _Panel(
                    child: ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        issue.severity == CatalogValidationSeverity.error
                            ? Icons.error_outline
                            : Icons.warning_amber_outlined,
                      ),
                      title: Text('${issue.entityType} · ${issue.entityId}'),
                      subtitle: Text(issue.message),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeedbackSheet extends StatefulWidget {
  const _FeedbackSheet({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  State<_FeedbackSheet> createState() => _FeedbackSheetState();
}

class _FeedbackSheetState extends State<_FeedbackSheet> {
  String _category = 'product_quality';
  final TextEditingController _messageController = TextEditingController();

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 20 + bottomInset),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '의견 보내기',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              '불편한 지점만 짧게 남겨주세요.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final item in const <({String id, String label})>[
                  (id: 'product_quality', label: '앱 느낌'),
                  (id: 'link_issue', label: '듣기 링크'),
                  (id: 'concert_issue', label: '공연 정보'),
                  (id: 'copy_issue', label: '문구'),
                  (id: 'retention_issue', label: '다시 열 이유'),
                  (id: 'crash_or_blocker', label: '멈춤/오류'),
                ])
                  ChoiceChip(
                    label: Text(item.label),
                    selected: _category == item.id,
                    onSelected: (_) => setState(() => _category = item.id),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _messageController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: '내용',
                hintText: '예: 오늘 화면에서 뭘 눌러야 할지 애매했어요.',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('취소'),
                ),
                const Spacer(),
                FilledButton.icon(
                  onPressed: _submit,
                  icon: const Icon(Icons.send_outlined),
                  label: const Text('보내기'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    await widget.controller.submitFeedback(
      category: _category,
      message: _messageController.text,
    );
    if (!mounted) {
      return;
    }
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('의견을 남겼습니다.')));
  }
}

class _OnboardingSheet extends StatefulWidget {
  const _OnboardingSheet({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  State<_OnboardingSheet> createState() => _OnboardingSheetState();
}

class _OnboardingSheetState extends State<_OnboardingSheet> {
  int _step = 0;
  String _experienceLevel = '첫 입구';
  String _platform = 'youtube';
  String _region = '서울';
  final Set<String> _moods = <String>{};
  final Set<String> _contexts = <String>{};
  final Set<String> _instruments = <String>{};
  final Set<String> _notifications = <String>{};
  final Set<String> _quickTasteInputs = <String>{};
  final TextEditingController _tasteInputController = TextEditingController();

  @override
  void dispose() {
    _tasteInputController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '좋아하는 음악에서 시작해요',
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 12),
              LinearProgressIndicator(value: (_step + 1) / 2),
              const SizedBox(height: 16),
              if (_step == 0) _buildTasteStep(),
              if (_step == 1) _buildPlatformStep(),
              const SizedBox(height: 16),
              Row(
                children: [
                  TextButton(
                    onPressed: () => unawaited(_skip()),
                    child: const Text('건너뛰기'),
                  ),
                  const Spacer(),
                  if (_step > 0)
                    TextButton(
                      onPressed: () => setState(() => _step -= 1),
                      child: const Text('이전'),
                    ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () {
                      if (_step < 1) {
                        setState(() => _step += 1);
                      } else {
                        unawaited(_complete());
                      }
                    },
                    child: Text(_step < 1 ? '다음' : '시작하기'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTasteStep() {
    final rewardPreview = _buildTasteRewardPreview();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle(title: '요즘 좋았던 음악을 알려주세요'),
        const SizedBox(height: 6),
        const Text('곡명, 작곡가, OST, 분위기 모두 괜찮아요. 모르면 바로 시작해도 됩니다.'),
        const SizedBox(height: 12),
        TextField(
          key: const ValueKey('taste-intake-field'),
          controller: _tasteInputController,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            hintText: '예: 라흐 피협 2, 인터스텔라 OST, 밤에 듣는 피아노',
            border: OutlineInputBorder(),
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final item in const ['라흐마니노프 선율', '영화음악', '밤의 피아노', '현악 소리'])
              FilterChip(
                label: Text(item),
                selected: _quickTasteInputs.contains(item),
                onSelected: (_) => _toggle(_quickTasteInputs, item),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final level in const ['첫 입구', '조금 익숙함', '더 넓히고 싶음'])
              ChoiceChip(
                label: Text(level),
                selected: _experienceLevel == level,
                onSelected: (_) => setState(() => _experienceLevel = level),
              ),
          ],
        ),
        if (rewardPreview != null) ...[
          const SizedBox(height: 12),
          rewardPreview,
        ],
      ],
    );
  }

  Widget _buildPlatformStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle(title: '어디서 들으세요?'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final platform in const <({String id, String label})>[
              (id: 'youtube', label: 'YouTube'),
              (id: 'spotify', label: 'Spotify'),
              (id: 'apple-music', label: 'Apple Music'),
              (id: 'melon', label: 'Melon'),
            ])
              ChoiceChip(
                label: Text(platform.label),
                selected: _platform == platform.id,
                onSelected: (_) => setState(() => _platform = platform.id),
              ),
          ],
        ),
        const SizedBox(height: 16),
        const _SectionTitle(title: '필요하면 공연 연결도 맞춰둘게요'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final region in const [
              '서울',
              '경기',
              '부산',
              '대전',
              '대구',
              '광주',
              '기타',
            ])
              ChoiceChip(
                label: Text(region),
                selected: _region == region,
                onSelected: (_) => setState(() => _region = region),
              ),
          ],
        ),
        const SizedBox(height: 16),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          value: _notifications.contains('today_work'),
          onChanged: (_) => _toggle(_notifications, 'today_work'),
          title: const Text('저녁에 30초 알림 준비하기'),
          subtitle: const Text('실제 알림 예약은 출시 전 네이티브 설정 확인이 필요합니다.'),
        ),
      ],
    );
  }

  void _toggle(Set<String> target, String value) {
    setState(() {
      if (!target.add(value)) {
        target.remove(value);
      }
    });
  }

  Widget? _buildTasteRewardPreview() {
    final preview = widget.controller.previewTasteStart(_currentTasteInputs());
    if (preview == null) {
      return null;
    }
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('이 입력이면'),
          const SizedBox(height: 6),
          Text(preview.dailyStep.title),
          const SizedBox(height: 4),
          Text(
            preview.dailyStep.work.titleKo,
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text('${preview.axis} · ${preview.dailyStep.reason}'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final item in preview.items.take(3))
                Chip(
                  label: Text(
                    item.sourceType == 'catalog_match'
                        ? item.label
                        : '${item.rawInput}에서 시작',
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '다음 세 작품: ${preview.nextThree.map((item) => item.work.titleKo).take(3).join(', ')}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  List<String> _currentTasteInputs() {
    return <String>[
      ..._quickTasteInputs,
      ..._tasteInputController.text
          .split(RegExp(r'[\n,;]+'))
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty),
    ];
  }

  Future<void> _complete() async {
    await widget.controller.completeOnboarding(
      experienceLevel: _experienceLevel,
      preferredMoodTags: _moods,
      preferredContextTags: _contexts,
      preferredInstruments: _instruments,
      preferredPlatformId: _platform,
      region: _region,
      tasteInputs: _currentTasteInputs(),
      notificationPreferences: _notifications,
    );
    if (!mounted) {
      return;
    }
    Navigator.of(context).pop();
  }

  Future<void> _skip() async {
    await widget.controller.skipOnboarding();
    if (!mounted) {
      return;
    }
    Navigator.of(context).pop();
  }
}

class ClassicalWorkDetailScreen extends StatelessWidget {
  const ClassicalWorkDetailScreen({
    required this.controller,
    required this.work,
    super.key,
  });

  final ClassicalDiscoveryController controller;
  final ClassicalWork work;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final state = controller.state.stateForWork(work.id);
        final shelves = controller.shelvesForWork(work);
        final promotions = controller.promotionsForWork(work);
        return Scaffold(
          appBar: AppBar(title: Text(work.titleKo)),
          body: SafeArea(
            child: _PageFrame(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
                children: [
                  _WorkHero(
                    work: work,
                    state: state,
                    controller: controller,
                    onOpenLink: (link) => _openLink(context, link),
                  ),
                  const SizedBox(height: 16),
                  _HallListeningPointPanel(work: work),
                  const SizedBox(height: 16),
                  _WorkListeningMapPanel(controller: controller, work: work),
                  const SizedBox(height: 16),
                  _NextThreePanel(
                    controller: controller,
                    anchor: work,
                    onOpenWork: (next) {
                      Navigator.of(context).pushReplacement<void, void>(
                        MaterialPageRoute<void>(
                          builder: (context) => ClassicalWorkDetailScreen(
                            controller: controller,
                            work: next,
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),
                  _WorkPassportPanel(controller: controller, work: work),
                  const SizedBox(height: 16),
                  _MetadataPanel(work: work),
                  const SizedBox(height: 16),
                  _SectionTitle(title: '듣는 지점'),
                  const SizedBox(height: 8),
                  for (final moment in work.listeningMoments)
                    _MomentTile(
                      work: work,
                      moment: moment,
                      controller: controller,
                    ),
                  const SizedBox(height: 16),
                  _SectionTitle(title: '외부 플랫폼에서 듣기'),
                  const SizedBox(height: 8),
                  _ExternalLinksWrap(
                    work: work,
                    controller: controller,
                    onOpenLink: (link) => _openLink(context, link),
                  ),
                  const SizedBox(height: 16),
                  if (work.scoreLinks.isNotEmpty) ...[
                    _SectionTitle(title: '악보와 연습'),
                    const SizedBox(height: 8),
                    for (final link in work.scoreLinks)
                      _LinkTile(
                        icon: Icons.library_books_outlined,
                        title: link.label,
                        subtitle: 'public-domain 자료를 먼저 연결합니다',
                        onTap: () => _launch(
                          context,
                          link.url,
                          surface: ClassicalLinkSurface.reference,
                        ),
                      ),
                    const SizedBox(height: 16),
                  ],
                  for (final shelf in shelves) ...[
                    _WorkShelf(
                      shelf: shelf,
                      controller: controller,
                      onOpenWork: (next) {
                        Navigator.of(context).pushReplacement<void, void>(
                          MaterialPageRoute<void>(
                            builder: (context) => ClassicalWorkDetailScreen(
                              controller: controller,
                              work: next,
                            ),
                          ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (promotions.isNotEmpty) ...[
                    _SectionTitle(title: '관련 공연'),
                    const SizedBox(height: 8),
                    for (final view in promotions.take(2))
                      _PromotionCard(
                        view: view,
                        controller: controller,
                        onTicket: () => _openTicket(context, view),
                        onOpenConcert: () =>
                            _openPromotionConcert(context, view),
                      ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _openLink(BuildContext context, ExternalLink link) async {
    await controller.recordProviderClick(work, link);
    if (!context.mounted) {
      return;
    }
    final opened = await _launch(
      context,
      link.url,
      surface: ClassicalLinkSurface.listening,
    );
    if (opened || link.linkType == 'listen_search') {
      return;
    }
    final fallback = _fallbackSearchLinkFor(work, except: link.id);
    if (fallback == null) {
      return;
    }
    await controller.recordProviderClick(work, fallback, fallback: true);
    if (!context.mounted) {
      return;
    }
    await _launch(
      context,
      fallback.url,
      surface: ClassicalLinkSurface.listening,
    );
  }

  Future<void> _openTicket(
    BuildContext context,
    ClassicalPromotionView view,
  ) async {
    await controller.recordPromotionClick(view.promotion.id);
    await controller.recordTicketDestinationClick(view.concert.id);
    if (!context.mounted) {
      return;
    }
    await _launch(
      context,
      view.concert.ticketUrl,
      surface: ClassicalLinkSurface.ticket,
    );
  }

  Future<void> _openPromotionConcert(
    BuildContext context,
    ClassicalPromotionView view,
  ) async {
    await controller.recordPromotionClick(view.promotion.id);
    if (!context.mounted) {
      return;
    }
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (context) => ClassicalConcertDetailScreen(
          controller: controller,
          concert: view.concert,
        ),
      ),
    );
  }
}

class ClassicalConcertDetailScreen extends StatelessWidget {
  const ClassicalConcertDetailScreen({
    required this.controller,
    required this.concert,
    super.key,
  });

  final ClassicalDiscoveryController controller;
  final ClassicalConcert concert;

  @override
  Widget build(BuildContext context) {
    final works = concert.programWorkIds
        .map(controller.workById)
        .whereType<ClassicalWork>()
        .toList(growable: false);
    final destinations = _sortedTicketDestinations(concert);
    return Scaffold(
      appBar: AppBar(title: Text(concert.title)),
      body: SafeArea(
        child: _PageFrame(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
            children: [
              _IntroBand(
                title: concert.title,
                subtitle:
                    '${_formatDateTime(concert.startsAt)} · ${concert.venue}',
              ),
              const SizedBox(height: 12),
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionTitle(title: '연주'),
                    const SizedBox(height: 8),
                    Text(concert.performers.join(', ')),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final tag in concert.instrumentTags)
                          Chip(label: Text(tag)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () => unawaited(_createRoute(context)),
                icon: const Icon(Icons.route_outlined),
                label: const Text('10분 프리뷰 만들기'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: works.isEmpty
                    ? null
                    : () => _showReflectionSheet(context, works),
                icon: const Icon(Icons.rate_review_outlined),
                label: const Text('공연 후 회고 남기기'),
              ),
              const SizedBox(height: 16),
              const _SectionTitle(title: '프로그램'),
              const SizedBox(height: 8),
              if (works.isEmpty)
                _Panel(child: Text(concert.programRawText))
              else
                for (final work in works)
                  _WorkListTile(
                    work: work,
                    onTap: () {
                      Navigator.of(context).push<void>(
                        MaterialPageRoute<void>(
                          builder: (context) => ClassicalWorkDetailScreen(
                            controller: controller,
                            work: work,
                          ),
                        ),
                      );
                    },
                  ),
              const SizedBox(height: 16),
              const _SectionTitle(title: '예매처'),
              const SizedBox(height: 8),
              for (final destination in destinations)
                _LinkTile(
                  icon: Icons.confirmation_number_outlined,
                  title: destination.label,
                  subtitle: destination.url,
                  onTap: () async {
                    await controller.recordTicketDestinationClick(
                      concert.id,
                      destination: destination,
                    );
                    if (!context.mounted) {
                      return;
                    }
                    await _launch(
                      context,
                      destination.url,
                      surface: ClassicalLinkSurface.ticket,
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _createRoute(BuildContext context) async {
    final route = await controller.createPreviewRouteFromConcert(concert.id);
    if (!context.mounted || route == null) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${route.programWorkIds.length}개 작품으로 프리뷰를 만들었습니다.'),
      ),
    );
  }

  Future<void> _showReflectionSheet(
    BuildContext context,
    List<ClassicalWork> works,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _PostConcertReflectionSheet(
        controller: controller,
        concert: concert,
        works: works,
      ),
    );
  }
}

class _TodayView extends StatelessWidget {
  const _TodayView({
    required this.controller,
    required this.onOpenWork,
    required this.onOpenLink,
    required this.onOpenTicket,
    required this.onOpenConcert,
  });

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;
  final Future<void> Function(ClassicalWork work, ExternalLink link) onOpenLink;
  final Future<void> Function(ClassicalPromotionView view) onOpenTicket;
  final Future<void> Function(ClassicalPromotionView view) onOpenConcert;

  @override
  Widget build(BuildContext context) {
    final work = controller.todayWork;
    final state = controller.state.stateForWork(work.id);
    final shelves = controller.shelvesForWork(work);
    final promotions = controller.promotionsForWork(work);
    final latestRoute = controller.latestPreviewRoute;
    final savedButUnopened = controller.savedButUnopenedWorks;
    final dailyStep = controller.dailyListeningStep();
    return _PageFrame(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          _DailyListeningStepPanel(
            step: dailyStep,
            controller: controller,
            onOpenWork: onOpenWork,
            onOpenLink: onOpenLink,
          ),
          const SizedBox(height: 12),
          _NextThreePanel(controller: controller, onOpenWork: onOpenWork),
          const SizedBox(height: 16),
          if (latestRoute != null) ...[
            _RoutePreviewPanel(
              route: latestRoute,
              controller: controller,
              onOpenWork: onOpenWork,
              onOpenLink: onOpenLink,
            ),
            const SizedBox(height: 16),
          ],
          _BeforeConcertHero(
            controller: controller,
            onOpenProgramPaste: () => _showProgramPasteSheet(context),
          ),
          const SizedBox(height: 16),
          if (savedButUnopened.isNotEmpty) ...[
            _WorkShelf(
              shelf: RecommendationShelf(
                id: 'saved-unopened-home',
                title: '저장했지만 아직 전체 듣기 전',
                reason: '잊힌 저장물을 실제 듣기로 이어갑니다.',
                works: savedButUnopened.take(6).toList(growable: false),
              ),
              controller: controller,
              onOpenWork: onOpenWork,
            ),
            const SizedBox(height: 16),
          ],
          _SectionTitle(title: '오늘 하나만'),
          const SizedBox(height: 8),
          _WorkHero(
            work: work,
            state: state,
            controller: controller,
            onOpenLink: (link) => onOpenLink(work, link),
          ),
          const SizedBox(height: 16),
          if (shelves.isNotEmpty)
            _WorkShelf(
              shelf: shelves.first,
              controller: controller,
              onOpenWork: onOpenWork,
            ),
          if (shelves.isNotEmpty) const SizedBox(height: 16),
          if (promotions.isNotEmpty) ...[
            _SectionTitle(title: '이 작품을 실제로 들을 수 있는 공연'),
            const SizedBox(height: 8),
            for (final view in promotions.take(2))
              _PromotionCard(
                view: view,
                controller: controller,
                onTicket: () => onOpenTicket(view),
                onOpenConcert: () => onOpenConcert(view),
              ),
          ],
          const SizedBox(height: 16),
          _WorkShelf(
            shelf: RecommendationShelf(
              id: 'due',
              title: '공연 전 다시 들을 3분',
              works: controller.repeatDueWorks().isEmpty
                  ? controller.works.take(6).toList(growable: false)
                  : controller.repeatDueWorks(),
            ),
            controller: controller,
            onOpenWork: onOpenWork,
          ),
        ],
      ),
    );
  }

  Future<void> _showProgramPasteSheet(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _ProgramPasteSheet(controller: controller),
    );
  }
}

class _DailyListeningStepPanel extends StatelessWidget {
  const _DailyListeningStepPanel({
    required this.step,
    required this.controller,
    required this.onOpenWork,
    required this.onOpenLink,
  });

  final DailyListeningStep step;
  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;
  final Future<void> Function(ClassicalWork work, ExternalLink link) onOpenLink;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final links = step.work.linksForPreferredPlatform(
      controller.preferredPlatformId,
    );
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('오늘 30초', style: theme.textTheme.labelLarge),
              const Spacer(),
              if (step.isCompleted)
                const Chip(
                  avatar: Icon(Icons.check_circle_outline),
                  label: Text('완료'),
                )
              else
                Chip(label: Text('${step.estimatedSeconds}초')),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            step.title,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            step.work.titleKo,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${step.work.composerNameKo} · ${step.work.instrumentation}',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 12),
          Text(
            '${step.moment.label} · ${_formatMomentRange(step.moment)}',
            style: theme.textTheme.labelLarge,
          ),
          const SizedBox(height: 6),
          Text(step.prompt),
          const SizedBox(height: 10),
          Text(step.reason, style: theme.textTheme.bodySmall),
          const SizedBox(height: 6),
          Text(step.nextEffect, style: theme.textTheme.bodySmall),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Chip(label: Text(step.axis)),
              Chip(label: Text('입구 ${step.difficulty}')),
            ],
          ),
          if (step.isCompleted) ...[
            const SizedBox(height: 12),
            _DailyMapRewardPanel(
              controller: controller,
              step: step,
              onOpenWork: onOpenWork,
            ),
          ],
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                key: const ValueKey('daily-listening-step-preview'),
                onPressed: () => unawaited(_showMomentPreview(context, links)),
                icon: const Icon(Icons.play_arrow),
                label: const Text('30초 포인트 보기'),
              ),
              if (links.isNotEmpty)
                FilledButton.tonalIcon(
                  onPressed: () =>
                      unawaited(onOpenLink(step.work, links.first)),
                  icon: const Icon(Icons.open_in_new),
                  label: Text(_listenCtaLabel(links.first)),
                ),
              OutlinedButton.icon(
                onPressed: () => onOpenWork(step.work),
                icon: const Icon(Icons.info_outline),
                label: const Text('작품 보기'),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final entry in _reactionLabels.entries.take(2))
                ActionChip(
                  label: Text(entry.value),
                  onPressed: () => unawaited(
                    controller.addReaction(
                      step.work.id,
                      entry.key,
                      momentId: step.moment.id,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _showMomentPreview(
    BuildContext context,
    List<ExternalLink> links,
  ) async {
    await controller.recordMomentPreviewOpen(step.work.id, step.moment.id);
    if (!context.mounted) {
      return;
    }
    final result = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _MomentPreviewSheet(
        work: step.work,
        moment: step.moment,
        links: links,
        controller: controller,
        onOpenLink: (link) => onOpenLink(step.work, link),
      ),
    );
    if (result == null) {
      await controller.recordMomentCancel(step.work.id, step.moment.id);
    }
  }
}

class _BeforeConcertHero extends StatelessWidget {
  const _BeforeConcertHero({
    required this.controller,
    required this.onOpenProgramPaste,
  });

  final ClassicalDiscoveryController controller;
  final VoidCallback onOpenProgramPaste;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('공연 전 10분', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          Text(
            '프로그램을 붙여넣으면 먼저 들을 지점만 골라드릴게요.',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              key: const ValueKey('open-program-paste-sheet'),
              onPressed: onOpenProgramPaste,
              icon: const Icon(Icons.content_paste_search_outlined),
              label: const Text('프로그램으로 10분 프리뷰 만들기'),
            ),
          ),
          if (controller.latestPreviewRoute case final route?) ...[
            const SizedBox(height: 8),
            Text(
              '최근 프리뷰: ${route.routeTitle}',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _RoutePreviewPanel extends StatelessWidget {
  const _RoutePreviewPanel({
    required this.route,
    required this.controller,
    required this.onOpenWork,
    required this.onOpenLink,
  });

  final ConcertPreviewRoute route;
  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;
  final Future<void> Function(ClassicalWork work, ExternalLink link) onOpenLink;

  @override
  Widget build(BuildContext context) {
    final works = route.programWorkIds
        .map(controller.workById)
        .whereType<ClassicalWork>()
        .toList(growable: false);
    final theme = Theme.of(context);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  route.routeTitle,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Chip(label: Text('${route.totalPreviewMinutes}분')),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            route.venue == null
                ? '공연장에서 먼저 들릴 지점을 골랐습니다.'
                : '${route.venue} · 공연장에서 먼저 들릴 지점',
          ),
          if (route.unmatchedProgramLines.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '매칭 안 된 줄 ${route.unmatchedProgramLines.length}개',
              style: theme.textTheme.bodySmall,
            ),
          ],
          const SizedBox(height: 12),
          for (final work in works.take(4)) ...[
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.graphic_eq),
              title: Text(work.titleKo),
              subtitle: Text(
                work.primaryMoment?.prompt ?? work.instrumentation,
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => onOpenWork(work),
            ),
            if (work.primaryMoment case final moment?)
              Align(
                alignment: Alignment.centerLeft,
                child: FilledButton.tonalIcon(
                  onPressed: () =>
                      unawaited(_showMomentPreview(context, work, moment)),
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('30초 듣기'),
                ),
              ),
          ],
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed:
                  route.completionState ==
                      ConcertPreviewRouteCompletionState.completed
                  ? null
                  : () => unawaited(controller.completePreviewRoute(route.id)),
              icon: const Icon(Icons.check_circle_outline),
              label: Text(
                route.completionState ==
                        ConcertPreviewRouteCompletionState.completed
                    ? '프리뷰 완료'
                    : '프리뷰 완료로 표시',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showMomentPreview(
    BuildContext context,
    ClassicalWork work,
    ListeningMoment moment,
  ) async {
    await controller.recordMomentPreviewOpen(work.id, moment.id);
    if (!context.mounted) {
      return;
    }
    final links = work.linksForPreferredPlatform(
      controller.preferredPlatformId,
    );
    final result = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _MomentPreviewSheet(
        work: work,
        moment: moment,
        links: links,
        controller: controller,
        onOpenLink: (link) => onOpenLink(work, link),
      ),
    );
    if (result == null) {
      await controller.recordMomentCancel(work.id, moment.id);
    }
  }
}

class _DiscoverView extends StatelessWidget {
  const _DiscoverView({required this.controller, required this.onOpenWork});

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          _IntroBand(
            title: '감상지도에서 다음 길로',
            subtitle: '열린 길, 익숙해진 길, 아직 낯선 길을 나눠서 봅니다.',
          ),
          const SizedBox(height: 16),
          _NextThreePanel(controller: controller, onOpenWork: onOpenWork),
          const SizedBox(height: 16),
          for (final shelf in controller.discoverShelves().take(5)) ...[
            _WorkShelf(
              shelf: shelf,
              controller: controller,
              onOpenWork: onOpenWork,
            ),
            const SizedBox(height: 16),
          ],
        ],
      ),
    );
  }
}

class _MyMusicView extends StatelessWidget {
  const _MyMusicView({
    required this.controller,
    required this.onOpenWork,
    required this.onPlatformPressed,
    required this.onPreferencesPressed,
  });

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;
  final VoidCallback onPlatformPressed;
  final VoidCallback onPreferencesPressed;

  @override
  Widget build(BuildContext context) {
    final savedWorks = controller.savedWorks;
    final savedButUnopened = controller.savedButUnopenedWorks;
    final dueWorks = controller.repeatDueWorks();
    return _PageFrame(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          _IntroBand(
            title: '내 감상지도',
            subtitle:
                '선호 플랫폼 ${controller.preferredPlatformId} · 지역 ${controller.region}',
            trailing: OutlinedButton.icon(
              onPressed: onPreferencesPressed,
              icon: const Icon(Icons.tune),
              label: const Text('취향'),
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onPlatformPressed,
              icon: const Icon(Icons.play_circle_outline),
              label: const Text('플랫폼만 바꾸기'),
            ),
          ),
          const SizedBox(height: 16),
          _ListeningMapPanel(controller: controller, onOpenWork: onOpenWork),
          const SizedBox(height: 16),
          _ContinuitySummaryPanel(controller: controller),
          const SizedBox(height: 16),
          _SectionTitle(title: '감상 좌표'),
          const SizedBox(height: 8),
          _ListeningCoordinatePanel(controller: controller),
          const SizedBox(height: 8),
          _TasteMapPanel(controller: controller),
          const SizedBox(height: 16),
          _SectionTitle(title: '내 클래식 연대기'),
          const SizedBox(height: 8),
          _ListeningTimelinePanel(
            controller: controller,
            onOpenWork: onOpenWork,
          ),
          const SizedBox(height: 16),
          _SectionTitle(title: '프리뷰 기록'),
          const SizedBox(height: 8),
          _PreviewRouteHistory(controller: controller),
          const SizedBox(height: 16),
          _SectionTitle(title: '아직 전체 듣기 전'),
          const SizedBox(height: 8),
          if (savedButUnopened.isEmpty)
            const _EmptyState(
              icon: Icons.queue_music_outlined,
              title: '남겨둔 작품이 없습니다',
              message: '저장한 뒤 전체 듣기를 열지 않은 작품이 여기에 남습니다.',
            )
          else
            for (final work in savedButUnopened)
              _WorkListTile(work: work, onTap: () => onOpenWork(work)),
          const SizedBox(height: 16),
          if (dueWorks.isNotEmpty) ...[
            _WorkShelf(
              shelf: RecommendationShelf(
                id: 'my-due',
                title: '오늘 다시 들을 작품',
                works: dueWorks,
              ),
              controller: controller,
              onOpenWork: onOpenWork,
            ),
            const SizedBox(height: 16),
          ],
          _SectionTitle(title: '저장한 작품'),
          const SizedBox(height: 8),
          if (savedWorks.isEmpty)
            const _EmptyState(
              icon: Icons.library_music_outlined,
              title: '아직 저장한 작품이 없습니다',
              message: 'Today에서 마음에 걸린 작품을 저장해보세요.',
            )
          else
            for (final work in savedWorks)
              _WorkListTile(work: work, onTap: () => onOpenWork(work)),
          const SizedBox(height: 16),
          _SectionTitle(title: '최근 들은 지점'),
          const SizedBox(height: 8),
          _RecentMomentSummary(controller: controller),
          const SizedBox(height: 16),
          _SectionTitle(title: '좋아한 작품'),
          const SizedBox(height: 8),
          _ReactionHistory(controller: controller, onOpenWork: onOpenWork),
          const SizedBox(height: 16),
          _SectionTitle(title: '저장한 공연'),
          const SizedBox(height: 8),
          _SavedConcertSummary(controller: controller),
          const SizedBox(height: 16),
          _SectionTitle(title: '관심 신호'),
          const SizedBox(height: 8),
          _InterestSummary(controller: controller),
          const SizedBox(height: 16),
          _SectionTitle(title: '공연 후 회고'),
          const SizedBox(height: 8),
          _ReflectionHistory(controller: controller, onOpenWork: onOpenWork),
        ],
      ),
    );
  }
}

class _WorksView extends StatelessWidget {
  const _WorksView({
    required this.controller,
    required this.query,
    required this.onQueryChanged,
    required this.onOpenWork,
  });

  final ClassicalDiscoveryController controller;
  final String query;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<ClassicalWork> onOpenWork;

  @override
  Widget build(BuildContext context) {
    final results = controller.searchWorks(query);
    return _PageFrame(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          TextField(
            onChanged: onQueryChanged,
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              hintText: '월광, 쇼팽, 피아노, 밤...',
              filled: true,
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          for (final work in results)
            _WorkListTile(work: work, onTap: () => onOpenWork(work)),
        ],
      ),
    );
  }
}

class _ConcertsView extends StatelessWidget {
  const _ConcertsView({
    required this.controller,
    required this.onOpenWork,
    required this.onOpenTicket,
  });

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;
  final Future<void> Function(ClassicalPromotionView view) onOpenTicket;

  @override
  Widget build(BuildContext context) {
    final concerts = controller.concertsForInterests();
    return _PageFrame(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          _IntroBand(
            title: '작품에서 공연으로',
            subtitle: '저장한 작품, 작곡가, 악기, 지역을 기준으로 공연을 연결합니다.',
          ),
          const SizedBox(height: 16),
          for (final concert in concerts) ...[
            _ConcertCard(
              concert: concert,
              controller: controller,
              onOpenWork: onOpenWork,
              onTicket: () async {
                final promotion = controller
                    .promotionsForWork(
                      controller.workById(concert.programWorkIds.first) ??
                          controller.todayWork,
                    )
                    .where((view) => view.concert.id == concert.id)
                    .firstOrNull;
                if (promotion != null) {
                  await onOpenTicket(promotion);
                } else {
                  await controller.recordTicketDestinationClick(concert.id);
                  if (!context.mounted) {
                    return;
                  }
                  await _launch(
                    context,
                    concert.ticketUrl,
                    surface: ClassicalLinkSurface.ticket,
                  );
                }
              },
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

class _ContinuitySummaryPanel extends StatelessWidget {
  const _ContinuitySummaryPanel({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    final summary = controller.continuitySummary();
    final step = controller.dailyListeningStep();
    final reminder = controller.reminderPreference;
    final savedUnopenedCount = controller.savedButUnopenedWorks.length;
    final theme = Theme.of(context);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '이어 듣는 흐름',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(summary.headline, style: theme.textTheme.titleSmall),
          const SizedBox(height: 6),
          Text(summary.recoveryCopy),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Chip(label: Text('이번 주 ${summary.weeklyCompletedDays}일')),
              Chip(label: Text('이어 들은 날 ${summary.currentRunDays}')),
              Chip(label: Text('아직 전체 듣기 전 $savedUnopenedCount')),
              if (summary.lastCompletedDate != null)
                Chip(
                  label: Text(
                    '마지막 ${_formatDateTime(summary.lastCompletedDate!)}',
                  ),
                ),
            ],
          ),
          if (!summary.completedToday) ...[
            const Divider(),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.play_circle_outline),
              title: Text(step.work.titleKo),
              subtitle: Text('오늘은 ${step.moment.label}만 열어도 충분합니다.'),
            ),
          ],
          const Divider(),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: reminder.enabled,
            onChanged: (enabled) => unawaited(
              controller.setReminderPreference(
                reminder.copyWith(enabled: enabled),
              ),
            ),
            title: Text(reminder.message),
            subtitle: Text(
              reminder.enabled
                  ? '${reminder.timeLabel} · 앱 안 설정만 저장됨'
                  : '원할 때 저녁 30초 초대 문구만 준비해둡니다.',
            ),
          ),
        ],
      ),
    );
  }
}

class _NextThreePanel extends StatelessWidget {
  const _NextThreePanel({
    required this.controller,
    required this.onOpenWork,
    this.anchor,
  });

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;
  final ClassicalWork? anchor;

  @override
  Widget build(BuildContext context) {
    final recommendations = controller.nextThreeRecommendations(anchor: anchor);
    final theme = Theme.of(context);
    if (recommendations.isEmpty) {
      return const _EmptyState(
        icon: Icons.alt_route_outlined,
        title: '다음 길을 고르는 중입니다',
        message: '좋아하는 음악이나 반응이 조금 쌓이면 세 갈래 추천이 보입니다.',
      );
    }
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '다음 세 작품',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            recommendations.first.sourceEvidence,
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 8),
          for (final recommendation in recommendations)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                child: Text(_laneShortLabel(recommendation.lane)),
              ),
              title: Text(recommendation.work.titleKo),
              subtitle: Text(recommendation.reason),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                unawaited(
                  controller.recordRecommendationClick(
                    'next-three-${recommendation.lane}',
                    recommendation.work,
                  ),
                );
                onOpenWork(recommendation.work);
              },
            ),
        ],
      ),
    );
  }
}

class _DailyMapRewardPanel extends StatelessWidget {
  const _DailyMapRewardPanel({
    required this.controller,
    required this.step,
    required this.onOpenWork,
  });

  final ClassicalDiscoveryController controller;
  final DailyListeningStep step;
  final ValueChanged<ClassicalWork> onOpenWork;

  @override
  Widget build(BuildContext context) {
    final progress = controller.listeningMapProgress();
    final nextWork = controller.nextThreeRecommendations().firstOrNull?.work;
    final next = progress.nextPath.firstOrNull?.title ?? '가까운 다음 길';
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer.withAlpha(110),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('지도에 표시됐어요', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            Text('${step.moment.label}이 ${step.axis} 길에 남았습니다.'),
            const SizedBox(height: 4),
            Text(progress.rewardCopy),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: nextWork == null ? null : () => onOpenWork(nextWork),
              icon: const Icon(Icons.alt_route_outlined),
              label: Text('$next 보기'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ListeningMapPanel extends StatelessWidget {
  const _ListeningMapPanel({
    required this.controller,
    required this.onOpenWork,
  });

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;

  @override
  Widget build(BuildContext context) {
    final progress = controller.listeningMapProgress();
    final theme = Theme.of(context);
    if (progress.openedCount == 0) {
      return _Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '아직 지도는 비어 있어요',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            const Text('좋아하는 음악 하나에서 시작하면 첫 길이 열립니다.'),
            const SizedBox(height: 4),
            const Text('오늘은 30초만 들어도 충분해요.'),
          ],
        ),
      );
    }
    final visibleNodes = progress.nodes
        .where(
          (node) =>
              progress.userState.openedNodeIds.contains(node.id) ||
              progress.userState.nextNodeIds.contains(node.id) ||
              progress.userState.unfamiliarNodeIds.contains(node.id),
        )
        .take(8)
        .toList(growable: false);
    final nextWork = controller.nextThreeRecommendations().firstOrNull?.work;
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            progress.currentNode?.title ?? '열린 감상지도',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(progress.summaryCopy),
          if (nextWork != null) ...[
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.play_circle_outline),
              title: const Text('오늘 이어갈 하나'),
              subtitle: Text(
                '${nextWork.titleKo} · ${nextWork.composerNameKo}',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => onOpenWork(nextWork),
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Chip(label: Text('열린 길 ${progress.openedCount}')),
              Chip(label: Text('다시 알아본 길 ${progress.familiarCount}')),
              Chip(label: Text('내 곡이 된 작품 ${progress.conqueredCount}')),
            ],
          ),
          const SizedBox(height: 12),
          Text('지도', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              final itemWidth = constraints.maxWidth < 420
                  ? constraints.maxWidth
                  : (constraints.maxWidth - 8) / 2;
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final node in visibleNodes)
                    _ListeningMapNodeTile(
                      width: itemWidth,
                      node: node,
                      status: progress.userState.statusFor(node.id),
                      isCurrent: node.id == progress.currentNode?.id,
                    ),
                ],
              );
            },
          ),
          if (progress.nextPath.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('다음에 열릴 길', style: theme.textTheme.labelLarge),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final node in progress.nextPath)
                  ActionChip(
                    avatar: const Icon(Icons.alt_route_outlined, size: 18),
                    label: Text(node.title),
                    onPressed: nextWork == null
                        ? null
                        : () => onOpenWork(nextWork),
                  ),
              ],
            ),
          ],
          if (progress.conqueredWorks.isNotEmpty) ...[
            const Divider(),
            Text('내 곡이 된 작품', style: theme.textTheme.labelLarge),
            const SizedBox(height: 6),
            for (final work in progress.conqueredWorks.take(3))
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.library_music_outlined),
                title: Text(work.titleKo),
                subtitle: Text('${work.composerNameKo} · 반응과 전체 듣기가 남았습니다.'),
                onTap: () => onOpenWork(work),
              ),
          ],
        ],
      ),
    );
  }
}

class _ListeningMapNodeTile extends StatelessWidget {
  const _ListeningMapNodeTile({
    required this.width,
    required this.node,
    required this.status,
    required this.isCurrent,
  });

  final double width;
  final ListeningMapNode node;
  final String status;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isOpen = status != ListeningMapNodeStatus.locked;
    final borderColor = isCurrent
        ? scheme.primary
        : isOpen
        ? scheme.outline
        : scheme.outlineVariant;
    final backgroundColor = switch (status) {
      ListeningMapNodeStatus.conquered => scheme.primaryContainer.withAlpha(
        110,
      ),
      ListeningMapNodeStatus.familiar => scheme.secondaryContainer.withAlpha(
        120,
      ),
      ListeningMapNodeStatus.opened => scheme.surfaceContainerHighest.withAlpha(
        150,
      ),
      ListeningMapNodeStatus.suggested => scheme.tertiaryContainer.withAlpha(
        95,
      ),
      _ => scheme.surface,
    };

    return SizedBox(
      width: width,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: borderColor, width: isCurrent ? 1.6 : 1),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Icon(_mapStatusIcon(status), size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      _mapStatusLabel(status),
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                node.title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(node.userFacingCopy, style: theme.textTheme.bodySmall),
              const SizedBox(height: 8),
              Text(
                '${node.axis} · 작품 ${node.recommendedWorkIds.length}',
                style: theme.textTheme.labelSmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WorkListeningMapPanel extends StatelessWidget {
  const _WorkListeningMapPanel({required this.controller, required this.work});

  final ClassicalDiscoveryController controller;
  final ClassicalWork work;

  @override
  Widget build(BuildContext context) {
    final role = controller.listeningMapRoleForWork(work);
    final theme = Theme.of(context);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('감상지도에서', style: theme.textTheme.labelLarge),
          const SizedBox(height: 6),
          Text(
            role.primaryNode.title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(role.roleCopy),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Chip(label: Text(_mapStatusLabel(role.status))),
              for (final node in role.relatedNodes.skip(1).take(2))
                Chip(label: Text(node.title)),
            ],
          ),
          if (role.capturedPoints.isNotEmpty) ...[
            const Divider(),
            Text('남은 흔적', style: theme.textTheme.labelLarge),
            const SizedBox(height: 4),
            for (final point in role.capturedPoints) Text('- $point'),
          ],
          if (role.nextPath.isNotEmpty) ...[
            const Divider(),
            Text('다음에 이어질 작품', style: theme.textTheme.labelLarge),
            const SizedBox(height: 4),
            for (final item in role.nextPath)
              Text('- ${item.work.titleKo}: ${item.reason}'),
          ],
        ],
      ),
    );
  }
}

class _ListeningCoordinatePanel extends StatelessWidget {
  const _ListeningCoordinatePanel({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    final level = controller.listeningLevelSnapshot();
    final axes = controller.tasteAxisScores();
    final intake = controller.tasteIntakeItems.take(4).toList(growable: false);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            level.level,
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            level.strengths.isEmpty
                ? '아직 기록이 적어, 잘 열리는 입구부터 천천히 봅니다.'
                : '${level.strengths.join(', ')} 쪽으로 귀가 움직이고 있습니다. 다음은 ${level.nextGrowthArea}을 조금 열어볼 수 있어요.',
          ),
          if (axes.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final axis in axes.take(4))
                  Chip(label: Text('${axis.axis} · ${axis.evidenceCount}')),
              ],
            ),
          ],
          if (intake.isNotEmpty) ...[
            const Divider(),
            Text(
              '시작점: ${intake.map((item) => item.label).join(', ')}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _WorkPassportPanel extends StatelessWidget {
  const _WorkPassportPanel({required this.controller, required this.work});

  final ClassicalDiscoveryController controller;
  final ClassicalWork work;

  @override
  Widget build(BuildContext context) {
    final stamps = controller.workPassportFor(work.id).take(5).toList();
    if (stamps.isEmpty) {
      return const _EmptyState(
        icon: Icons.auto_stories_outlined,
        title: '아직 이 작품과의 기록이 없습니다',
        message: '30초 지점을 열거나 반응을 남기면 작품 여권이 시작됩니다.',
      );
    }
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(title: '작품 여권'),
          const SizedBox(height: 8),
          for (final stamp in stamps)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.local_activity_outlined),
              title: Text(stamp.label),
              subtitle: Text(_formatDateTime(stamp.occurredAt)),
            ),
        ],
      ),
    );
  }
}

class _ListeningTimelinePanel extends StatelessWidget {
  const _ListeningTimelinePanel({
    required this.controller,
    required this.onOpenWork,
  });

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;

  @override
  Widget build(BuildContext context) {
    final stamps = controller.listeningTimeline().take(6).toList();
    if (stamps.isEmpty) {
      return const _EmptyState(
        icon: Icons.timeline_outlined,
        title: '아직 연대기가 비어 있습니다',
        message: '좋아하는 음악을 넣고 30초만 들어보면 첫 기록이 생깁니다.',
      );
    }
    return Column(
      children: [
        for (final stamp in stamps)
          _Panel(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.timeline_outlined),
              title: Text(
                controller.workById(stamp.workId)?.titleKo ?? stamp.workId,
              ),
              subtitle: Text(
                '${stamp.label} · ${_formatDateTime(stamp.occurredAt)}',
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                final work = controller.workById(stamp.workId);
                if (work != null) {
                  onOpenWork(work);
                }
              },
            ),
          ),
      ],
    );
  }
}

class _WorkHero extends StatelessWidget {
  const _WorkHero({
    required this.work,
    required this.state,
    required this.controller,
    required this.onOpenLink,
  });

  final ClassicalWork work;
  final UserWorkState state;
  final ClassicalDiscoveryController controller;
  final ValueChanged<ExternalLink> onOpenLink;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final moment = work.primaryMoment;
    final links = work.linksForPreferredPlatform(
      controller.preferredPlatformId,
    );
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      color: theme.colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('오늘 하나만', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            Text(
              work.titleKo,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${work.composerNameKo} · ${work.instrumentation} · ${work.period}',
              style: theme.textTheme.bodyMedium,
            ),
            if (work.catalogNumber.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(work.catalogNumber, style: theme.textTheme.labelMedium),
            ],
            const SizedBox(height: 14),
            if (moment != null)
              Text(moment.prompt, style: theme.textTheme.bodyLarge),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: moment == null
                      ? null
                      : () => unawaited(
                          _showMomentPreview(context, moment, links),
                        ),
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('30초 포인트 보기'),
                ),
                OutlinedButton.icon(
                  onPressed: work.listeningMoments.length < 2
                      ? null
                      : () => unawaited(
                          _showMomentPreview(
                            context,
                            work.listeningMoments[1],
                            links,
                          ),
                        ),
                  icon: const Icon(Icons.timelapse),
                  label: const Text('3분 가이드 보기'),
                ),
                IconButton.filledTonal(
                  tooltip: state.saved ? '저장 해제' : '작품 저장',
                  onPressed: () =>
                      unawaited(controller.toggleSaveWork(work.id)),
                  icon: Icon(
                    state.saved ? Icons.bookmark : Icons.bookmark_add_outlined,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in _reactionLabels.entries)
                  ActionChip(
                    label: Text(entry.value),
                    onPressed: () => unawaited(
                      controller.addReaction(
                        work.id,
                        entry.key,
                        momentId: moment?.id,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (links.isNotEmpty)
              FilledButton.tonalIcon(
                onPressed: () => onOpenLink(links.first),
                icon: const Icon(Icons.open_in_new),
                label: Text(_listenCtaLabel(links.first)),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _showMomentPreview(
    BuildContext context,
    ListeningMoment moment,
    List<ExternalLink> links,
  ) async {
    await controller.recordMomentPreviewOpen(work.id, moment.id);
    if (!context.mounted) {
      return;
    }
    final result = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => _MomentPreviewSheet(
        work: work,
        moment: moment,
        links: _orderedMomentLinks(moment, links),
        controller: controller,
        onOpenLink: onOpenLink,
      ),
    );
    if (result == null) {
      await controller.recordMomentCancel(work.id, moment.id);
    }
  }

  List<ExternalLink> _orderedMomentLinks(
    ListeningMoment moment,
    List<ExternalLink> links,
  ) {
    final fallbackId = moment.fallbackExternalLinkId;
    if (fallbackId == null) {
      return links;
    }
    final ordered = [...links];
    ordered.sort((a, b) {
      final aScore = a.id == fallbackId ? 0 : 1;
      final bScore = b.id == fallbackId ? 0 : 1;
      return aScore.compareTo(bScore);
    });
    return ordered;
  }
}

class _ProgramPasteSheet extends StatefulWidget {
  const _ProgramPasteSheet({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  State<_ProgramPasteSheet> createState() => _ProgramPasteSheetState();
}

class _ProgramPasteSheetState extends State<_ProgramPasteSheet> {
  final TextEditingController _textController = TextEditingController();
  ProgramPreviewDraft? _draft;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final draft = _draft;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 20 + bottomInset),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              '공연 프로그램 붙여넣기',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text('작품명, 작곡가, 작품번호가 보이면 10분 프리뷰로 묶습니다.'),
            const SizedBox(height: 12),
            TextField(
              controller: _textController,
              minLines: 4,
              maxLines: 8,
              decoration: const InputDecoration(
                hintText: '예: Bach Air; Beethoven Symphony No. 5',
                border: OutlineInputBorder(),
              ),
              onChanged: _refreshDraft,
            ),
            const SizedBox(height: 12),
            if (draft != null) ...[
              _Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('매칭 후보 ${draft.candidates.length}개'),
                    const SizedBox(height: 8),
                    for (final candidate in draft.candidates.take(6))
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(_confidenceIcon(candidate.confidence)),
                        title: Text(candidate.title),
                        subtitle: Text(
                          '${_confidenceLabel(candidate.confidence)} · ${candidate.reason}',
                        ),
                      ),
                    if (draft.unmatchedLines.isNotEmpty) ...[
                      const Divider(),
                      Text('매칭 안 된 줄 ${draft.unmatchedLines.length}개'),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
            FilledButton.icon(
              key: const ValueKey('create-program-preview-route'),
              onPressed: draft == null || draft.routeReadyCandidates.isEmpty
                  ? null
                  : () => unawaited(_createRoute(context)),
              icon: const Icon(Icons.route_outlined),
              label: const Text('10분 프리뷰 만들기'),
            ),
          ],
        ),
      ),
    );
  }

  void _refreshDraft(String value) {
    setState(() {
      _draft = value.trim().isEmpty
          ? null
          : widget.controller.previewProgramText(value);
    });
  }

  Future<void> _createRoute(BuildContext context) async {
    final route = await widget.controller.createPreviewRouteFromProgram(
      rawProgramText: _textController.text,
    );
    if (!context.mounted) {
      return;
    }
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${route.programWorkIds.length}개 작품으로 프리뷰를 만들었습니다.'),
      ),
    );
  }

  IconData _confidenceIcon(ConcertProgramMatchConfidence confidence) {
    return switch (confidence) {
      ConcertProgramMatchConfidence.high => Icons.check_circle_outline,
      ConcertProgramMatchConfidence.medium => Icons.rule_folder_outlined,
      ConcertProgramMatchConfidence.low => Icons.help_outline,
    };
  }

  String _confidenceLabel(ConcertProgramMatchConfidence confidence) {
    return switch (confidence) {
      ConcertProgramMatchConfidence.high => '바로 사용 가능',
      ConcertProgramMatchConfidence.medium => '확인 후 사용',
      ConcertProgramMatchConfidence.low => '수동 확인 필요',
    };
  }
}

class _PostConcertReflectionSheet extends StatefulWidget {
  const _PostConcertReflectionSheet({
    required this.controller,
    required this.concert,
    required this.works,
  });

  final ClassicalDiscoveryController controller;
  final ClassicalConcert concert;
  final List<ClassicalWork> works;

  @override
  State<_PostConcertReflectionSheet> createState() =>
      _PostConcertReflectionSheetState();
}

class _PostConcertReflectionSheetState
    extends State<_PostConcertReflectionSheet> {
  late String _workId = widget.works.first.id;
  String _reactionType = 'liked';
  String _instrument = '';
  final TextEditingController _noteController = TextEditingController();

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(16, 8, 16, 20 + bottomInset),
        child: ListView(
          shrinkWrap: true,
          children: [
            Text(
              '공연 후 30초 회고',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(widget.concert.title),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _workId,
              decoration: const InputDecoration(labelText: '기억난 작품'),
              items: [
                for (final work in widget.works)
                  DropdownMenuItem(value: work.id, child: Text(work.titleKo)),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _workId = value);
                }
              },
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in _reactionLabels.entries)
                  ChoiceChip(
                    label: Text(entry.value),
                    selected: _reactionType == entry.key,
                    onSelected: (_) =>
                        setState(() => _reactionType = entry.key),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final instrument in widget.concert.instrumentTags.take(6))
                  ChoiceChip(
                    label: Text(instrument),
                    selected: _instrument == instrument,
                    onSelected: (_) => setState(() => _instrument = instrument),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _noteController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: '짧은 메모',
                hintText: '예: 느린 부분에서 현악 소리가 기억나요.',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: () => unawaited(_submit(context)),
              icon: const Icon(Icons.check),
              label: const Text('회고 저장'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit(BuildContext context) async {
    await widget.controller.addPostConcertReflection(
      concertId: widget.concert.id,
      workId: _workId,
      reactionType: _reactionType,
      instrument: _instrument,
      note: _noteController.text,
    );
    if (!context.mounted) {
      return;
    }
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('회고를 저장했습니다.')));
  }
}

class _MomentPreviewSheet extends StatefulWidget {
  const _MomentPreviewSheet({
    required this.work,
    required this.moment,
    required this.links,
    required this.controller,
    required this.onOpenLink,
  });

  final ClassicalWork work;
  final ListeningMoment moment;
  final List<ExternalLink> links;
  final ClassicalDiscoveryController controller;
  final ValueChanged<ExternalLink> onOpenLink;

  @override
  State<_MomentPreviewSheet> createState() => _MomentPreviewSheetState();
}

class _MomentPreviewSheetState extends State<_MomentPreviewSheet> {
  final ClassicalPreviewPlayer _previewPlayer = ClassicalPreviewPlayer();
  bool _isPlayingPreview = false;

  @override
  Widget build(BuildContext context) {
    final preferred = widget.links.isEmpty ? null : widget.links.first;
    final previewUrl = _previewUrlFor(preferred);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.work.titleKo,
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.work.composerNameKo} · ${widget.work.instrumentation}',
            ),
            const SizedBox(height: 16),
            _Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.moment.label,
                    style: Theme.of(context).textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(_formatMomentRange(widget.moment)),
                  const SizedBox(height: 8),
                  Text(widget.moment.prompt),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final tag in widget.moment.tags.take(4))
                        Chip(label: Text(tag)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (previewUrl != null) ...[
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => unawaited(_playPreview(previewUrl)),
                      icon: const Icon(Icons.play_arrow),
                      label: Text(
                        _isPlayingPreview ? 'Preview 재생 중' : 'Preview 재생',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filledTonal(
                    tooltip: 'Preview 일시정지',
                    onPressed: () => unawaited(_pausePreview()),
                    icon: const Icon(Icons.pause),
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            if (preferred != null)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () =>
                      unawaited(_openPreferred(context, preferred)),
                  icon: const Icon(Icons.open_in_new),
                  label: Text(_listenCtaLabel(preferred)),
                ),
              ),
            if (widget.links.length > 1) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final link in widget.links.skip(1))
                    OutlinedButton.icon(
                      onPressed: () => unawaited(_openPreferred(context, link)),
                      icon: const Icon(Icons.open_in_new),
                      label: Text(_listenCtaLabel(link)),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  label: const Text('들었어요'),
                  onPressed: () => unawaited(_complete(context)),
                ),
                ActionChip(
                  label: const Text('좋음'),
                  onPressed: () => unawaited(_react(context, 'liked')),
                ),
                ActionChip(
                  label: const Text('아직 모르겠음'),
                  onPressed: () => unawaited(_react(context, 'unsure')),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openPreferred(BuildContext context, ExternalLink link) async {
    await widget.controller.startMoment(widget.work.id, widget.moment.id);
    if (!context.mounted) {
      return;
    }
    Navigator.of(context).pop('open');
    widget.onOpenLink(link);
  }

  Future<void> _complete(BuildContext context) async {
    await widget.controller.completeMoment(widget.work.id, widget.moment.id);
    if (!context.mounted) {
      return;
    }
    Navigator.of(context).pop('complete');
  }

  Future<void> _react(BuildContext context, String type) async {
    await widget.controller.addReaction(
      widget.work.id,
      type,
      momentId: widget.moment.id,
    );
    if (!context.mounted) {
      return;
    }
    Navigator.of(context).pop('reaction');
  }

  Future<void> _playPreview(String previewUrl) async {
    final result = await _previewPlayer.playUrl(previewUrl);
    if (result.isPlaying) {
      await widget.controller.recordPreviewPlay(
        widget.work.id,
        widget.moment.id,
        previewUrl: previewUrl,
      );
      if (mounted) {
        setState(() => _isPlayingPreview = true);
      }
      return;
    }
    await widget.controller.recordPreviewError(
      widget.work.id,
      widget.moment.id,
      result.message.isEmpty ? result.status.name : result.message,
    );
  }

  Future<void> _pausePreview() async {
    await _previewPlayer.pause();
    await widget.controller.recordPreviewPause(
      widget.work.id,
      widget.moment.id,
    );
    if (mounted) {
      setState(() => _isPlayingPreview = false);
    }
  }

  String? _previewUrlFor(ExternalLink? preferred) {
    if (preferred != null) {
      final review = const ClassicalLinkReviewPolicy().reviewProviderPreview(
        platformId: preferred.platformId,
        label: preferred.label,
        link: preferred,
      );
      if (review.status == ClassicalPreviewReviewStatus.approvedPreview) {
        return review.previewUrl;
      }
    }
    return null;
  }
}

class _HallListeningPointPanel extends StatelessWidget {
  const _HallListeningPointPanel({required this.work});

  final ClassicalWork work;

  @override
  Widget build(BuildContext context) {
    final moment = work.primaryMoment;
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(title: '공연장에서 들을 포인트'),
          const SizedBox(height: 8),
          Text(
            moment == null
                ? '${work.instrumentation} 소리가 어디서 시작되는지만 먼저 찾아보세요.'
                : moment.prompt,
          ),
          const SizedBox(height: 8),
          Text(
            '${work.titleKo}는 프로그램 안에서 ${work.period}의 색과 ${work.instrumentation} 소리를 들려주는 작품입니다.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _MetadataPanel extends StatelessWidget {
  const _MetadataPanel({required this.work});

  final ClassicalWork work;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionTitle(title: '작품 정보'),
          const SizedBox(height: 8),
          _MetadataRow(label: '원제', value: work.titleOriginal),
          _MetadataRow(label: '작곡가', value: work.composerNameOriginal),
          _MetadataRow(label: '시대', value: work.period),
          _MetadataRow(label: '편성', value: work.instrumentation),
          _MetadataRow(
            label: '길이',
            value: _formatDuration(work.durationSeconds),
          ),
          if (work.catalogNumber.isNotEmpty)
            _MetadataRow(label: '작품 번호', value: work.catalogNumber),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final tag in [...work.moodTags, ...work.contextTags].take(6))
                Chip(label: Text(tag)),
            ],
          ),
        ],
      ),
    );
  }
}

class _MomentTile extends StatelessWidget {
  const _MomentTile({
    required this.work,
    required this.moment,
    required this.controller,
  });

  final ClassicalWork work;
  final ListeningMoment moment;
  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: ListTile(
        contentPadding: EdgeInsets.zero,
        leading: const Icon(Icons.graphic_eq),
        title: Text(moment.label),
        subtitle: Text(
          '${_formatDuration(moment.endSeconds)} · ${moment.prompt}',
        ),
        trailing: IconButton(
          tooltip: '완료',
          onPressed: () =>
              unawaited(controller.completeMoment(work.id, moment.id)),
          icon: const Icon(Icons.check_circle_outline),
        ),
      ),
    );
  }
}

class _ExternalLinksWrap extends StatelessWidget {
  const _ExternalLinksWrap({
    required this.work,
    required this.controller,
    required this.onOpenLink,
  });

  final ClassicalWork work;
  final ClassicalDiscoveryController controller;
  final ValueChanged<ExternalLink> onOpenLink;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final link in work.linksForPreferredPlatform(
          controller.preferredPlatformId,
        ))
          OutlinedButton.icon(
            onPressed: () => onOpenLink(link),
            icon: const Icon(Icons.open_in_new),
            label: Text(_listenCtaLabel(link)),
          ),
      ],
    );
  }
}

class _WorkShelf extends StatelessWidget {
  const _WorkShelf({
    required this.shelf,
    required this.onOpenWork,
    this.controller,
  });

  final RecommendationShelf shelf;
  final ValueChanged<ClassicalWork> onOpenWork;
  final ClassicalDiscoveryController? controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(title: shelf.title),
        if (shelf.reason.isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(shelf.reason, style: Theme.of(context).textTheme.bodySmall),
        ],
        const SizedBox(height: 8),
        SizedBox(
          height: 184,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: shelf.works.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final work = shelf.works[index];
              return _WorkMiniCard(
                work: work,
                onTap: () {
                  unawaited(
                    controller?.recordRecommendationClick(shelf.id, work),
                  );
                  onOpenWork(work);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _WorkMiniCard extends StatelessWidget {
  const _WorkMiniCard({required this.work, required this.onTap});

  final ClassicalWork work;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SizedBox(
      width: 172,
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.album_outlined, color: theme.colorScheme.primary),
                const SizedBox(height: 12),
                Text(
                  work.titleKo,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                Text(
                  work.composerNameKo,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelMedium,
                ),
                Text(work.instrumentation, style: theme.textTheme.labelSmall),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _WorkListTile extends StatelessWidget {
  const _WorkListTile({required this.work, required this.onTap});

  final ClassicalWork work;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: ListTile(
        leading: const Icon(Icons.music_note),
        title: Text(work.titleKo),
        subtitle: Text('${work.composerNameKo} · ${work.instrumentation}'),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class _PromotionCard extends StatelessWidget {
  const _PromotionCard({
    required this.view,
    required this.controller,
    required this.onTicket,
    this.onOpenConcert,
  });

  final ClassicalPromotionView view;
  final ClassicalDiscoveryController controller;
  final VoidCallback onTicket;
  final VoidCallback? onOpenConcert;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: onOpenConcert,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Chip(
                    label: Text(view.promotion.sponsorLabel),
                    visualDensity: VisualDensity.compact,
                  ),
                  const Spacer(),
                  IconButton(
                    tooltip: view.isSaved ? '공연 저장 해제' : '공연 저장',
                    onPressed: () => unawaited(
                      controller.toggleSaveConcert(view.concert.id),
                    ),
                    icon: Icon(
                      view.isSaved
                          ? Icons.bookmark
                          : Icons.bookmark_add_outlined,
                    ),
                  ),
                  IconButton(
                    tooltip: '관심 없음',
                    onPressed: () => unawaited(
                      controller.dismissPromotion(view.promotion.id),
                    ),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              Text(
                view.concert.title,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${_formatDateTime(view.concert.startsAt)} · ${view.concert.venue}',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 6),
              Text(view.concert.performers.join(', ')),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onTicket,
                icon: const Icon(Icons.confirmation_number_outlined),
                label: const Text('예매처 보기'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConcertCard extends StatelessWidget {
  const _ConcertCard({
    required this.concert,
    required this.controller,
    required this.onOpenWork,
    required this.onTicket,
  });

  final ClassicalConcert concert;
  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;
  final VoidCallback onTicket;

  @override
  Widget build(BuildContext context) {
    final matchedWorks = concert.programWorkIds
        .map(controller.workById)
        .whereType<ClassicalWork>()
        .toList(growable: false);
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            concert.title,
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text('${_formatDateTime(concert.startsAt)} · ${concert.venue}'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final work in matchedWorks)
                ActionChip(
                  label: Text(work.titleKo),
                  onPressed: () => onOpenWork(work),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: () => unawaited(
                  controller.createPreviewRouteFromConcert(concert.id),
                ),
                icon: const Icon(Icons.route_outlined),
                label: const Text('10분 프리뷰'),
              ),
              OutlinedButton.icon(
                onPressed: onTicket,
                icon: const Icon(Icons.open_in_new),
                label: const Text('예매처 보기'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InterestSummary extends StatelessWidget {
  const _InterestSummary({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    final composers = controller.listenedComposerIds.length;
    final instruments = controller.interestedInstruments.join(', ');
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('들은 작곡가 $composers명'),
          const SizedBox(height: 6),
          Text(instruments.isEmpty ? '관심 악기가 아직 없습니다' : '관심 악기 $instruments'),
          const SizedBox(height: 6),
          Text('기록된 반응 ${controller.state.reactions.length}개'),
        ],
      ),
    );
  }
}

class _TasteMapPanel extends StatelessWidget {
  const _TasteMapPanel({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    final insights = controller.tasteMapInsights();
    return Column(
      children: [
        for (final insight in insights.take(3))
          _Panel(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.radar_outlined),
              title: Text(insight.title),
              subtitle: Text('${insight.description}\n${insight.nextAction}'),
              isThreeLine: true,
            ),
          ),
      ],
    );
  }
}

class _PreviewRouteHistory extends StatelessWidget {
  const _PreviewRouteHistory({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    final routes = controller.state.previewRoutes
        .take(4)
        .toList(growable: false);
    if (routes.isEmpty) {
      return const _EmptyState(
        icon: Icons.route_outlined,
        title: '아직 만든 프리뷰가 없습니다',
        message: '공연 프로그램을 넣으면 여기에 10분 프리뷰가 쌓입니다.',
      );
    }
    return Column(
      children: [
        for (final route in routes)
          _Panel(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.route_outlined),
              title: Text(route.routeTitle),
              subtitle: Text(
                '${route.programWorkIds.length}개 작품 · ${route.totalPreviewMinutes}분',
              ),
              trailing:
                  route.completionState ==
                      ConcertPreviewRouteCompletionState.completed
                  ? const Icon(Icons.check_circle_outline)
                  : null,
            ),
          ),
      ],
    );
  }
}

class _ReflectionHistory extends StatelessWidget {
  const _ReflectionHistory({
    required this.controller,
    required this.onOpenWork,
  });

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;

  @override
  Widget build(BuildContext context) {
    final reflections = controller.postConcertReflections
        .take(5)
        .toList(growable: false);
    if (reflections.isEmpty) {
      return const _EmptyState(
        icon: Icons.rate_review_outlined,
        title: '아직 공연 후 회고가 없습니다',
        message: '공연을 보고 기억난 작품이나 악기를 30초만 남기면 취향 지도가 더 좋아집니다.',
      );
    }
    return Column(
      children: [
        for (final reflection in reflections)
          _Panel(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.rate_review_outlined),
              title: Text(
                controller.workById(reflection.workId)?.titleKo ??
                    reflection.workId,
              ),
              subtitle: Text(
                [
                  _reactionLabels[reflection.reactionType] ??
                      reflection.reactionType,
                  if (reflection.instrument.isNotEmpty) reflection.instrument,
                  if (reflection.note.isNotEmpty) reflection.note,
                ].join(' · '),
              ),
              onTap: () {
                final work = controller.workById(reflection.workId);
                if (work != null) {
                  onOpenWork(work);
                }
              },
            ),
          ),
      ],
    );
  }
}

class _RecentMomentSummary extends StatelessWidget {
  const _RecentMomentSummary({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    final events = controller.state.events
        .where((event) => event.eventType == 'listening_moment_complete')
        .take(4)
        .toList(growable: false);
    if (events.isEmpty) {
      return const _EmptyState(
        icon: Icons.graphic_eq,
        title: '아직 완료한 listening moment가 없습니다',
        message: 'Today에서 30초나 3분 듣기를 완료하면 여기에 쌓입니다.',
      );
    }
    return Column(
      children: [
        for (final event in events)
          _Panel(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.graphic_eq),
              title: Text(
                controller.workById(event.entityId)?.titleKo ?? event.entityId,
              ),
              subtitle: Text(event.context ?? 'listening moment'),
            ),
          ),
      ],
    );
  }
}

class _ReactionHistory extends StatelessWidget {
  const _ReactionHistory({required this.controller, required this.onOpenWork});

  final ClassicalDiscoveryController controller;
  final ValueChanged<ClassicalWork> onOpenWork;

  @override
  Widget build(BuildContext context) {
    final reactions = controller.state.reactions
        .take(5)
        .toList(growable: false);
    if (reactions.isEmpty) {
      return const _EmptyState(
        icon: Icons.favorite_border,
        title: '아직 남긴 반응이 없습니다',
        message: '좋음, 다시 듣기, 아직 모르겠음 같은 신호가 취향을 만듭니다.',
      );
    }
    return Column(
      children: [
        for (final reaction in reactions)
          _Panel(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.favorite_border),
              title: Text(
                controller.workById(reaction.workId)?.titleKo ??
                    reaction.workId,
              ),
              subtitle: Text(_reactionLabels[reaction.type] ?? reaction.type),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                final work = controller.workById(reaction.workId);
                if (work != null) {
                  onOpenWork(work);
                }
              },
            ),
          ),
      ],
    );
  }
}

class _SavedConcertSummary extends StatelessWidget {
  const _SavedConcertSummary({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  Widget build(BuildContext context) {
    final concerts = controller.concerts
        .where(
          (concert) => controller.state.savedConcertIds.contains(concert.id),
        )
        .toList(growable: false);
    if (concerts.isEmpty) {
      return const _EmptyState(
        icon: Icons.event_available_outlined,
        title: '아직 저장한 공연이 없습니다',
        message: '작품 상세이나 Concerts에서 관심 공연을 저장할 수 있습니다.',
      );
    }
    return Column(
      children: [
        for (final concert in concerts)
          _Panel(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.event_available_outlined),
              title: Text(concert.title),
              subtitle: Text(
                '${_formatDateTime(concert.startsAt)} · ${concert.venue}',
              ),
            ),
          ),
      ],
    );
  }
}

class _IntroBand extends StatelessWidget {
  const _IntroBand({
    required this.title,
    required this.subtitle,
    this.trailing,
  });

  final String title;
  final String subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(subtitle),
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 12), trailing!],
        ],
      ),
    );
  }
}

class _LinkTile extends StatelessWidget {
  const _LinkTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.open_in_new),
        onTap: onTap,
      ),
    );
  }
}

class _MetadataRow extends StatelessWidget {
  const _MetadataRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: Text(label, style: Theme.of(context).textTheme.labelMedium),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium
          ?.copyWith(fontWeight: FontWeight.w800),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(padding: const EdgeInsets.all(12), child: child),
    );
  }
}

class _OpsSummaryPanel extends StatelessWidget {
  const _OpsSummaryPanel({required this.rows});

  final List<(String label, String value)> rows;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Column(
        children: [
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 132,
                    child: Text(
                      row.$1,
                      style: Theme.of(context).textTheme.labelMedium,
                    ),
                  ),
                  Expanded(child: Text(row.$2)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _OpsQueuePreview extends StatelessWidget {
  const _OpsQueuePreview({
    required this.title,
    required this.items,
    required this.emptyMessage,
  });

  final String title;
  final List<ClassicalOpsQueueItem> items;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$title · ${items.length}',
            style: Theme.of(context).textTheme.titleSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          if (items.isEmpty)
            Text(emptyMessage)
          else
            for (final item in items.take(3))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${item.title} · ${item.composer}',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    Text('${item.status} · ${item.reason}'),
                    Text(
                      item.nextCommand,
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}

class _PageFrame extends StatelessWidget {
  const _PageFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth >= 840 ? 920.0 : 640.0;
        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: child,
          ),
        );
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return _Panel(
      child: Column(
        children: [
          Icon(icon, size: 42, color: theme.colorScheme.primary),
          const SizedBox(height: 10),
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 4),
          Text(message, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

Future<bool> _launch(
  BuildContext context,
  String value, {
  ClassicalLinkSurface surface = ClassicalLinkSurface.listening,
}) {
  return launchClassicalUrl(context, value, surface: surface);
}

ExternalLink? _fallbackSearchLinkFor(ClassicalWork work, {String? except}) {
  final candidates = work.externalLinks
      .where((link) => link.id != except)
      .where((link) => link.linkType == 'listen_search')
      .toList(growable: false);
  if (candidates.isEmpty) {
    return null;
  }
  candidates.sort((a, b) {
    final aScore = a.platformId == 'youtube' ? 0 : 1;
    final bScore = b.platformId == 'youtube' ? 0 : 1;
    final byProvider = aScore.compareTo(bScore);
    return byProvider != 0 ? byProvider : a.label.compareTo(b.label);
  });
  return candidates.first;
}

String _listenCtaLabel(ExternalLink link) {
  if (link.linkType == 'listen_search') {
    return '${link.label}에서 검색';
  }
  return '${link.label}에서 전체 듣기';
}

String _laneShortLabel(String lane) {
  return switch (lane) {
    'immediate' => '맞',
    'stretch' => '확',
    'later' => '후',
    _ => '다',
  };
}

String _mapStatusLabel(String status) {
  return switch (status) {
    ListeningMapNodeStatus.conquered => '내 곡이 된 길',
    ListeningMapNodeStatus.familiar => '다시 알아본 길',
    ListeningMapNodeStatus.opened => '한 번 잡아본 길',
    ListeningMapNodeStatus.suggested => '다음에 열릴 길',
    _ => '아직 열리지 않은 길',
  };
}

IconData _mapStatusIcon(String status) {
  return switch (status) {
    ListeningMapNodeStatus.conquered => Icons.library_music_outlined,
    ListeningMapNodeStatus.familiar => Icons.check_circle_outline,
    ListeningMapNodeStatus.opened => Icons.radio_button_checked,
    ListeningMapNodeStatus.suggested => Icons.alt_route_outlined,
    _ => Icons.radio_button_unchecked,
  };
}

String _readinessLabel(ClassicalReadinessStatus status) {
  return switch (status) {
    ClassicalReadinessStatus.ready => 'READY',
    ClassicalReadinessStatus.needsContentOps => 'CONTENT OPS GAP',
    ClassicalReadinessStatus.blocked => 'BLOCKED',
  };
}

List<TicketDestination> _sortedTicketDestinations(ClassicalConcert concert) {
  final destinations = concert.ticketDestinations.isEmpty
      ? <TicketDestination>[
          TicketDestination(
            id: '${concert.id}-ticket',
            label: '예매처',
            url: concert.ticketUrl,
          ),
        ]
      : [...concert.ticketDestinations];
  destinations.sort((a, b) {
    final byPriority = a.displayPriority.compareTo(b.displayPriority);
    return byPriority != 0 ? byPriority : a.label.compareTo(b.label);
  });
  return List<TicketDestination>.unmodifiable(destinations);
}

String _formatDuration(int seconds) {
  final minutes = seconds ~/ 60;
  final rest = seconds % 60;
  if (minutes == 0) {
    return '$rest초';
  }
  return rest == 0 ? '$minutes분' : '$minutes분 $rest초';
}

String _formatMomentRange(ListeningMoment moment) {
  return '${_formatDuration(moment.startSeconds)}-${_formatDuration(moment.endSeconds)}';
}

String _formatRate(double value) {
  return '${(value * 100).toStringAsFixed(1)}%';
}

String _formatDateTime(DateTime dateTime) {
  return '${dateTime.month}/${dateTime.day} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
}
