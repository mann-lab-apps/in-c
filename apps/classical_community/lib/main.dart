import 'package:flutter/material.dart';

void main() {
  runApp(const ClassicalCommunityApp());
}

class ClassicalCommunityApp extends StatefulWidget {
  const ClassicalCommunityApp({super.key, this.controller});

  final CommunityController? controller;

  @override
  State<ClassicalCommunityApp> createState() => _ClassicalCommunityAppState();
}

class _ClassicalCommunityAppState extends State<ClassicalCommunityApp> {
  late final CommunityController _controller =
      widget.controller ?? CommunityController.seeded();

  @override
  void dispose() {
    if (widget.controller == null) {
      _controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'in C Community',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff2f6f73),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xfffaf9f3),
        useMaterial3: true,
      ),
      home: CommunityHome(controller: _controller),
    );
  }
}

class CommunityController extends ChangeNotifier {
  CommunityController._({
    required this._posts,
    required this._rooms,
    required this._events,
  });

  factory CommunityController.seeded() {
    return CommunityController._(
      posts: [
        CommunityPost(
          id: 'post-daily-bach',
          category: CommunityCategory.listeningNote,
          author: '오늘의 작품방',
          title: '바흐 첼로 프렐류드, 첫 30초만 같이 들어요',
          body: '계속 올라가는 음형이 숨 고르는 느낌인지, 아니면 앞으로 걷는 느낌인지 궁금해요.',
          workTitle: '무반주 첼로 모음곡 1번 프렐류드',
          composer: '바흐',
          region: '서울',
          likeCount: 18,
          commentCount: 7,
          createdLabel: '오늘 09:20',
        ),
        CommunityPost(
          id: 'post-question-moonlight',
          category: CommunityCategory.question,
          author: '처음 듣는 사람',
          title: '월광 1악장은 왜 이렇게 느리게 시작하나요?',
          body: '멜로디가 크지 않은데 계속 듣게 돼요. 공연 전에 알아두면 좋은 포인트가 있을까요?',
          workTitle: '피아노 소나타 14번 월광',
          composer: '베토벤',
          region: '경기',
          likeCount: 11,
          commentCount: 12,
          createdLabel: '오늘 08:10',
        ),
        CommunityPost(
          id: 'post-after-concert',
          category: CommunityCategory.afterConcert,
          author: '공연 다녀온 사람',
          title: '드보르자크 9번은 현장에서 관악이 훨씬 선명했어요',
          body: '녹음으로 들을 때보다 2악장 도입부가 멀리서 걸어오는 느낌이 강했습니다.',
          workTitle: '교향곡 9번 신세계로부터',
          composer: '드보르자크',
          region: '서울',
          likeCount: 26,
          commentCount: 5,
          createdLabel: '어제',
        ),
      ],
      rooms: [
        WorkRoom(
          id: 'room-bach-cello',
          workTitle: '무반주 첼로 모음곡 1번 프렐류드',
          composer: '바흐',
          prompt: '반복되는 음형이 어디서 긴장을 풀어주는지 같이 표시해요.',
          memberCount: 42,
          postCount: 16,
          tag: '오늘 열림',
        ),
        WorkRoom(
          id: 'room-clair',
          workTitle: '달빛',
          composer: '드뷔시',
          prompt: '선율보다 색채가 먼저 들리는 순간을 모읍니다.',
          memberCount: 31,
          postCount: 11,
          tag: '피아노',
        ),
        WorkRoom(
          id: 'room-new-world',
          workTitle: '교향곡 9번 신세계로부터',
          composer: '드보르자크',
          prompt: '공연 전 10분 프리뷰와 공연 후 후기를 함께 쌓습니다.',
          memberCount: 57,
          postCount: 22,
          tag: '오케스트라',
        ),
      ],
      events: [
        SponsoredEvent(
          id: 'event-piano-night',
          title: '피아노로 시작하는 클래식 나이트',
          venue: '예술의전당 IBK챔버홀',
          region: '서울',
          startsAtLabel: '10/18 19:30',
          sponsor: 'Mann Lab Preview',
          linkedWork: '월광 · 쇼팽 야상곡 · 드뷔시 달빛',
          saved: false,
        ),
        SponsoredEvent(
          id: 'event-symphony',
          title: '처음 듣는 교향곡: 베토벤과 드보르자크',
          venue: '롯데콘서트홀',
          region: '서울',
          startsAtLabel: '10/25 20:00',
          sponsor: 'Community Sponsored',
          linkedWork: '운명 · 합창 · 신세계',
          saved: false,
        ),
      ],
    );
  }

  final List<CommunityPost> _posts;
  final List<WorkRoom> _rooms;
  final List<SponsoredEvent> _events;
  int selectedIndex = 0;
  CommunityCategory selectedCategory = CommunityCategory.all;

  List<CommunityPost> get posts {
    final source = selectedCategory == CommunityCategory.all
        ? _posts
        : _posts.where((post) => post.category == selectedCategory);
    return List<CommunityPost>.unmodifiable(source);
  }

  List<WorkRoom> get rooms => List<WorkRoom>.unmodifiable(_rooms);
  List<SponsoredEvent> get events => List<SponsoredEvent>.unmodifiable(_events);

  int get localPostCount => _posts.where((post) => post.isLocal).length;

  void selectTab(int index) {
    selectedIndex = index;
    notifyListeners();
  }

  void selectCategory(CommunityCategory category) {
    selectedCategory = category;
    notifyListeners();
  }

  void addPost({
    required CommunityCategory category,
    required String body,
    required WorkRoom room,
  }) {
    final trimmed = body.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('A post body is required');
    }
    _posts.insert(
      0,
      CommunityPost(
        id: 'local-${DateTime.now().microsecondsSinceEpoch}',
        category: category,
        author: '나',
        title: category == CommunityCategory.question
            ? '${room.workTitle} 질문'
            : '${room.workTitle} 감상',
        body: trimmed,
        workTitle: room.workTitle,
        composer: room.composer,
        region: '내 공간',
        likeCount: 0,
        commentCount: 0,
        createdLabel: '방금',
        isLocal: true,
      ),
    );
    notifyListeners();
  }

  void toggleSaveEvent(String eventId) {
    final index = _events.indexWhere((event) => event.id == eventId);
    if (index == -1) {
      return;
    }
    final event = _events[index];
    _events[index] = event.copyWith(saved: !event.saved);
    notifyListeners();
  }
}

enum CommunityCategory {
  all('전체', Icons.apps_outlined),
  listeningNote('감상', Icons.hearing_outlined),
  question('질문', Icons.help_outline),
  afterConcert('공연 후', Icons.event_available_outlined);

  const CommunityCategory(this.label, this.icon);

  final String label;
  final IconData icon;
}

class CommunityPost {
  const CommunityPost({
    required this.id,
    required this.category,
    required this.author,
    required this.title,
    required this.body,
    required this.workTitle,
    required this.composer,
    required this.region,
    required this.likeCount,
    required this.commentCount,
    required this.createdLabel,
    this.isLocal = false,
  });

  final String id;
  final CommunityCategory category;
  final String author;
  final String title;
  final String body;
  final String workTitle;
  final String composer;
  final String region;
  final int likeCount;
  final int commentCount;
  final String createdLabel;
  final bool isLocal;
}

class WorkRoom {
  const WorkRoom({
    required this.id,
    required this.workTitle,
    required this.composer,
    required this.prompt,
    required this.memberCount,
    required this.postCount,
    required this.tag,
  });

  final String id;
  final String workTitle;
  final String composer;
  final String prompt;
  final int memberCount;
  final int postCount;
  final String tag;
}

class SponsoredEvent {
  const SponsoredEvent({
    required this.id,
    required this.title,
    required this.venue,
    required this.region,
    required this.startsAtLabel,
    required this.sponsor,
    required this.linkedWork,
    required this.saved,
  });

  final String id;
  final String title;
  final String venue;
  final String region;
  final String startsAtLabel;
  final String sponsor;
  final String linkedWork;
  final bool saved;

  SponsoredEvent copyWith({bool? saved}) {
    return SponsoredEvent(
      id: id,
      title: title,
      venue: venue,
      region: region,
      startsAtLabel: startsAtLabel,
      sponsor: sponsor,
      linkedWork: linkedWork,
      saved: saved ?? this.saved,
    );
  }
}

class CommunityHome extends StatelessWidget {
  const CommunityHome({required this.controller, super.key});

  final CommunityController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) => Scaffold(
        appBar: AppBar(
          title: const Text('in C Community'),
          actions: [
            IconButton(
              tooltip: '글쓰기',
              onPressed: () => _showComposer(context),
              icon: const Icon(Icons.edit_outlined),
            ),
          ],
        ),
        body: SafeArea(
          child: switch (controller.selectedIndex) {
            0 => CommunityFeed(controller: controller),
            1 => RoomsView(controller: controller),
            2 => EventsView(controller: controller),
            _ => ProfileView(controller: controller),
          },
        ),
        floatingActionButton: controller.selectedIndex == 0
            ? FloatingActionButton.extended(
                onPressed: () => _showComposer(context),
                icon: const Icon(Icons.edit_outlined),
                label: const Text('글쓰기'),
              )
            : null,
        bottomNavigationBar: NavigationBar(
          selectedIndex: controller.selectedIndex,
          onDestinationSelected: controller.selectTab,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.dynamic_feed_outlined),
              selectedIcon: Icon(Icons.dynamic_feed),
              label: 'Feed',
            ),
            NavigationDestination(
              icon: Icon(Icons.forum_outlined),
              selectedIcon: Icon(Icons.forum),
              label: 'Rooms',
            ),
            NavigationDestination(
              icon: Icon(Icons.event_outlined),
              selectedIcon: Icon(Icons.event),
              label: 'Events',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Mine',
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showComposer(BuildContext context) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => ComposerSheet(controller: controller),
    );
  }
}

class CommunityFeed extends StatelessWidget {
  const CommunityFeed({required this.controller, super.key});

  final CommunityController controller;

  @override
  Widget build(BuildContext context) {
    final posts = controller.posts;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
      children: [
        const CommunityPulse(),
        const SizedBox(height: 12),
        CategorySelector(controller: controller),
        const SizedBox(height: 12),
        const SectionTitle(title: '지금 이야기 중'),
        const SizedBox(height: 8),
        for (var index = 0; index < posts.length; index += 1) ...[
          if (index == 2 && controller.events.isNotEmpty)
            SponsoredEventCard(
              event: controller.events.first,
              onSave: () =>
                  controller.toggleSaveEvent(controller.events.first.id),
            ),
          PostCard(post: posts[index]),
        ],
      ],
    );
  }
}

class CommunityPulse extends StatelessWidget {
  const CommunityPulse({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.waves_outlined, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  '오늘 열린 작품방',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text('하루 한 곡에서 나온 감상, 질문, 공연 후기가 같은 피드로 모입니다.'),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: const [
              Chip(label: Text('작품방 3')),
              Chip(label: Text('감상글 18')),
              Chip(label: Text('질문 12')),
              Chip(label: Text('Sponsored 포함')),
            ],
          ),
        ],
      ),
    );
  }
}

class CategorySelector extends StatelessWidget {
  const CategorySelector({required this.controller, super.key});

  final CommunityController controller;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final category in CommunityCategory.values) ...[
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                avatar: Icon(category.icon, size: 18),
                label: Text(category.label),
                selected: controller.selectedCategory == category,
                onSelected: (_) => controller.selectCategory(category),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class PostCard extends StatelessWidget {
  const PostCard({required this.post, super.key});

  final CommunityPost post;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Chip(
                avatar: Icon(post.category.icon, size: 18),
                label: Text(post.category.label),
                visualDensity: VisualDensity.compact,
              ),
              Text(post.author, style: theme.textTheme.labelLarge),
              Text(post.createdLabel, style: theme.textTheme.labelSmall),
              if (post.isLocal) const Chip(label: Text('내 글')),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            post.title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text(post.body),
          const SizedBox(height: 10),
          ActionChip(
            avatar: const Icon(Icons.album_outlined, size: 18),
            label: Text('${post.workTitle} · ${post.composer}'),
            onPressed: () {},
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              Chip(label: Text(post.region)),
              Chip(label: Text('좋아요 ${post.likeCount}')),
              Chip(label: Text('댓글 ${post.commentCount}')),
            ],
          ),
        ],
      ),
    );
  }
}

class RoomsView extends StatelessWidget {
  const RoomsView({required this.controller, super.key});

  final CommunityController controller;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        const SectionTitle(title: '작품방'),
        const SizedBox(height: 8),
        for (final room in controller.rooms) WorkRoomCard(room: room),
      ],
    );
  }
}

class WorkRoomCard extends StatelessWidget {
  const WorkRoomCard({required this.room, super.key});

  final WorkRoom room;

  @override
  Widget build(BuildContext context) {
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Chip(label: Text(room.tag)),
              Text('${room.memberCount}명 참여'),
              Text('글 ${room.postCount}'),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            room.workTitle,
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          Text(room.composer),
          const SizedBox(height: 8),
          Text(room.prompt),
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: () {},
            icon: const Icon(Icons.forum_outlined),
            label: const Text('작품방 열기'),
          ),
        ],
      ),
    );
  }
}

class EventsView extends StatelessWidget {
  const EventsView({required this.controller, super.key});

  final CommunityController controller;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        const SectionTitle(title: '후원 공연'),
        const SizedBox(height: 4),
        const Text('광고는 Sponsored로 표시하고, 작품방 맥락이 있는 공연만 노출합니다.'),
        const SizedBox(height: 12),
        for (final event in controller.events)
          SponsoredEventCard(
            event: event,
            onSave: () => controller.toggleSaveEvent(event.id),
          ),
      ],
    );
  }
}

class SponsoredEventCard extends StatelessWidget {
  const SponsoredEventCard({
    required this.event,
    required this.onSave,
    super.key,
  });

  final SponsoredEvent event;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const Chip(label: Text('Sponsored 공연')),
              Chip(label: Text(event.region)),
              Text(event.startsAtLabel, style: theme.textTheme.labelLarge),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            event.title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 6),
          Text('${event.venue} · ${event.sponsor}'),
          const SizedBox(height: 6),
          Text('연결 작품: ${event.linkedWork}'),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.route_outlined),
                label: const Text('10분 프리뷰'),
              ),
              OutlinedButton.icon(
                onPressed: onSave,
                icon: Icon(
                  event.saved ? Icons.bookmark : Icons.bookmark_add_outlined,
                ),
                label: Text(event.saved ? '저장됨' : '저장'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class ProfileView extends StatelessWidget {
  const ProfileView({required this.controller, super.key});

  final CommunityController controller;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '내 커뮤니티',
                style: Theme.of(context).textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text('내가 쓴 글 ${controller.localPostCount}개'),
              const SizedBox(height: 12),
              const Text('닉네임, 계정, 서버 동기화는 아직 연결하지 않은 로컬 프로토타입입니다.'),
            ],
          ),
        ),
        const SectionTitle(title: '운영 원칙'),
        const SizedBox(height: 8),
        const Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('광고는 Sponsored로 표시합니다.'),
              SizedBox(height: 6),
              Text('작품, 공연, 질문이 없는 일반 홍보는 피드에 섞지 않습니다.'),
              SizedBox(height: 6),
              Text('감상 수준으로 사람을 평가하지 않고, 듣는 지점을 함께 찾습니다.'),
            ],
          ),
        ),
      ],
    );
  }
}

class ComposerSheet extends StatefulWidget {
  const ComposerSheet({required this.controller, super.key});

  final CommunityController controller;

  @override
  State<ComposerSheet> createState() => _ComposerSheetState();
}

class _ComposerSheetState extends State<ComposerSheet> {
  CommunityCategory _category = CommunityCategory.listeningNote;
  late WorkRoom _room = widget.controller.rooms.first;
  final TextEditingController _bodyController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _bodyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 8,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('커뮤니티 글쓰기', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            SegmentedButton<CommunityCategory>(
              selected: {_category},
              segments: const [
                ButtonSegment(
                  value: CommunityCategory.listeningNote,
                  icon: Icon(Icons.hearing_outlined),
                  label: Text('감상'),
                ),
                ButtonSegment(
                  value: CommunityCategory.question,
                  icon: Icon(Icons.help_outline),
                  label: Text('질문'),
                ),
                ButtonSegment(
                  value: CommunityCategory.afterConcert,
                  icon: Icon(Icons.event_available_outlined),
                  label: Text('공연 후'),
                ),
              ],
              onSelectionChanged: (value) =>
                  setState(() => _category = value.single),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<WorkRoom>(
              initialValue: _room,
              decoration: const InputDecoration(
                labelText: '작품방',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final room in widget.controller.rooms)
                  DropdownMenuItem(
                    value: room,
                    child: Text(
                      room.workTitle,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _room = value);
                }
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _bodyController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: '무엇을 들었나요?',
                hintText: '예: 첫 30초에서 첼로가 숨 쉬는 느낌이 났어요.',
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _submit,
                icon: const Icon(Icons.send_outlined),
                label: const Text('올리기'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _submit() {
    try {
      widget.controller.addPost(
        category: _category,
        body: _bodyController.text,
        room: _room,
      );
      Navigator.of(context).pop();
    } on ArgumentError {
      setState(() => _error = '한 줄 이상 적어 주세요.');
    }
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle({required this.title, super.key});

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

class Panel extends StatelessWidget {
  const Panel({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(padding: const EdgeInsets.all(12), child: child),
    );
  }
}
