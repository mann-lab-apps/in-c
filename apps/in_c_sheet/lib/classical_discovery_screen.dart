import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'classical_discovery_controller.dart';
import 'classical_discovery_models.dart';
import 'classical_discovery_ops.dart';
import 'classical_discovery_validation.dart';
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
                label: 'Today',
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
    final opened = await _launchUrl(link.url);
    if (opened || link.linkType == 'listen_search') {
      return;
    }
    final fallback = _fallbackSearchLinkFor(work, except: link.id);
    if (fallback == null) {
      return;
    }
    await controller.recordProviderClick(work, fallback, fallback: true);
    await _launchUrl(fallback.url);
  }

  Future<void> _openTicket(ClassicalPromotionView view) async {
    await controller.recordPromotionClick(view.promotion.id);
    await controller.recordTicketDestinationClick(view.concert.id);
    await _launchUrl(view.concert.ticketUrl);
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

  Future<bool> _launchUrl(String value) async {
    final uri = Uri.tryParse(value);
    if (uri == null ||
        !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (!mounted) {
        return false;
      }
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('링크를 열지 못했습니다.')));
      return false;
    }
    return true;
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

class _OnboardingSheet extends StatefulWidget {
  const _OnboardingSheet({required this.controller});

  final ClassicalDiscoveryController controller;

  @override
  State<_OnboardingSheet> createState() => _OnboardingSheetState();
}

class _OnboardingSheetState extends State<_OnboardingSheet> {
  int _step = 0;
  String _experienceLevel = '처음';
  String _platform = 'youtube';
  String _region = '서울';
  final Set<String> _moods = <String>{};
  final Set<String> _contexts = <String>{};
  final Set<String> _instruments = <String>{};
  final Set<String> _notifications = <String>{};

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '오늘 들을 작품을 맞춰볼게요',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: (_step + 1) / 3),
            const SizedBox(height: 16),
            if (_step == 0) _buildExperienceStep(),
            if (_step == 1) _buildInterestStep(),
            if (_step == 2) _buildPlatformStep(),
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
                    if (_step < 2) {
                      setState(() => _step += 1);
                    } else {
                      unawaited(_complete());
                    }
                  },
                  child: Text(_step < 2 ? '다음' : '시작하기'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExperienceStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle(title: '클래식과 얼마나 가까우세요?'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final level in const ['처음', '가끔 들음', '공연도 감'])
              ChoiceChip(
                label: Text(level),
                selected: _experienceLevel == level,
                onSelected: (_) => setState(() => _experienceLevel = level),
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildInterestStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle(title: '끌리는 것만 몇 개 골라주세요'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final item in const ['피아노', '오케스트라', '바이올린', '첼로', '성악'])
              FilterChip(
                label: Text(item),
                selected: _instruments.contains(item),
                onSelected: (_) => _toggle(_instruments, item),
              ),
            for (final item in const ['조용한', '웅장한', '밤', '집중'])
              FilterChip(
                label: Text(item),
                selected: _moods.contains(item),
                onSelected: (_) => _toggle(_moods, item),
              ),
            FilterChip(
              label: const Text('공연 전'),
              selected: _contexts.contains('공연 전'),
              onSelected: (_) => _toggle(_contexts, '공연 전'),
            ),
          ],
        ),
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
        const _SectionTitle(title: '지역'),
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
          title: const Text('오늘의 작품 알림 받기'),
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

  Future<void> _complete() async {
    await widget.controller.completeOnboarding(
      experienceLevel: _experienceLevel,
      preferredMoodTags: _moods,
      preferredContextTags: _contexts,
      preferredInstruments: _instruments,
      preferredPlatformId: _platform,
      region: _region,
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
                        onTap: () => _launch(context, link.url),
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
    final opened = await _launch(context, link.url);
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
    await _launch(context, fallback.url);
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
    await _launch(context, view.concert.ticketUrl);
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
                    await _launch(context, destination.url);
                  },
                ),
            ],
          ),
        ),
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
    return _PageFrame(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
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
              title: '다시 들을 3분',
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
            title: '검색어가 없어도 괜찮아요',
            subtitle: '기분, 악기, 공연 전 맥락으로 다음 작품을 이어갑니다.',
          ),
          const SizedBox(height: 16),
          for (final shelf in controller.discoverShelves()) ...[
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
    final dueWorks = controller.repeatDueWorks();
    return _PageFrame(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          _IntroBand(
            title: '내 클래식이 쌓이는 중',
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
                  await _launch(context, concert.ticketUrl);
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
            Text('오늘의 작품', style: theme.textTheme.labelLarge),
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
                  label: const Text('30초 듣기'),
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
                  label: const Text('3분 듣기'),
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
    if (preferred?.previewUrl?.isNotEmpty == true) {
      return preferred!.previewUrl;
    }
    final recording = widget.work.recordings
        .where(
          (recording) => recording.id == widget.moment.recommendedRecordingId,
        )
        .firstOrNull;
    return recording?.previewUrl;
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
          FilledButton.icon(
            onPressed: onTicket,
            icon: const Icon(Icons.open_in_new),
            label: const Text('예매처 보기'),
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

Future<bool> _launch(BuildContext context, String value) async {
  final uri = Uri.tryParse(value);
  if (uri == null ||
      !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    if (!context.mounted) {
      return false;
    }
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('링크를 열지 못했습니다.')));
    return false;
  }
  return true;
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
