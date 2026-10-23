import 'package:flutter/material.dart';
import 'package:ddirori_ui/ddirori_ui.dart';

void main() => runApp(
  DdiroriCatalog(
    initialView: (int.tryParse(Uri.base.queryParameters['page'] ?? '') ?? 0)
        .clamp(0, 5),
    initialDark: Uri.base.queryParameters['theme'] == 'dark',
  ),
);

class DdiroriCatalog extends StatefulWidget {
  const DdiroriCatalog({
    super.key,
    this.initialView = 0,
    this.initialDark = false,
  });
  final int initialView;
  final bool initialDark;
  @override
  State<DdiroriCatalog> createState() => _CatalogState();
}

class _CatalogState extends State<DdiroriCatalog> {
  late int _view = widget.initialView;
  late bool _dark = widget.initialDark;
  bool _compact = false,
      _selecting = false,
      _favorites = false,
      _grid = false,
      _performance = false,
      _playing = false,
      _running = false,
      _saved = false;
  String _query = '', _tool = 'pen', _category = 'note';
  String _sort = 'recent', _instrument = 'all';
  final List<int> _recent = [0, 1];
  final Set<int> _selected = {};
  final Set<int> _favoriteIds = {1};
  int _page = 1, _beat = 1, _voice = 1, _meter = 4;
  double _bpm = 96, _width = 4, _cents = -12, _position = 0;
  Color _ink = Color(DdiroriTokens.score['annotationInk']!);
  DdiroriTunerStatus _tuner = DdiroriTunerStatus.flat;
  static const _views = ['컴포넌트', '악보함', '악보 보기', '연습 도구', '사보 작업', '플레이'];
  void _change(VoidCallback f) => setState(f);
  void _openSample(int id) => _change(() {
    _recent.remove(id);
    _recent.insert(0, id);
    if (_recent.length > 3) _recent.removeLast();
    _view = 2;
  });
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: '띠로리 공통 UI 카탈로그',
    theme: ddiroriTheme(
      brightness: _dark ? Brightness.dark : Brightness.light,
      density: _compact ? DdiroriDensity.compact : DdiroriDensity.comfortable,
      touch:
          View.of(context).physicalSize.width /
              View.of(context).devicePixelRatio <
          800,
    ),
    home: Builder(
      builder: (context) => Scaffold(
        appBar: AppBar(
          title: const Text('띠로리 UI'),
          actions: [
            IconButton(
              tooltip: '밝은/다크 전환',
              onPressed: () => _change(() => _dark = !_dark),
              icon: Icon(_dark ? Icons.light_mode : Icons.dark_mode),
            ),
            IconButton(
              tooltip: '밀도 전환',
              onPressed: () => _change(() => _compact = !_compact),
              icon: Icon(_compact ? Icons.density_small : Icons.density_medium),
            ),
          ],
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1100),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Wrap(
                      spacing: 16,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        PopupMenuButton<int>(
                          tooltip: '예제 선택',
                          initialValue: _view,
                          onSelected: (v) => _change(() => _view = v),
                          itemBuilder: (context) => List.generate(
                            _views.length,
                            (i) =>
                                PopupMenuItem(value: i, child: Text(_views[i])),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(
                              '${_views[_view]} ▾',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                        ),
                        Text(
                          '${_dark ? '다크' : '밝은'} · ${_compact ? 'compact' : 'comfortable'} · 터치 48dp / 포인터 compact 32px',
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const DdiroriBanner(
                      message: '독립 컴포넌트 카탈로그 · 파일·오디오 엔진을 연결하지 않은 데모입니다.',
                    ),
                    const SizedBox(height: 24),
                    ..._content(context),
                    const SizedBox(height: 36),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  Widget _section(BuildContext _, String title, List<Widget> children) =>
      DdiroriSection(title: title, spacing: 16, children: children);
  List<Widget> _content(BuildContext context) => switch (_view) {
    1 => _library(context),
    2 => _reader(context),
    3 => _practice(context),
    4 => _studio(context),
    5 => _play(context),
    _ => _core(context),
  };
  List<Widget> _core(BuildContext context) => [
    DdiroriPageHeader(
      title: '공통 컴포넌트',
      subtitle: '값과 callback만으로 상태·동작·반응형 배치를 확인합니다.',
      actions: [
        DdiroriButton(
          label: '확인창',
          kind: DdiroriButtonKind.secondary,
          onPressed: () => showDdiroriConfirmDialog(
            context: context,
            title: '변경 확인',
            message: '실제 데이터는 변경하지 않는 카탈로그 예제입니다.',
            confirmLabel: '확인',
          ),
        ),
      ],
    ),
    const SizedBox(height: 16),
    _section(context, '행동과 입력', [
      DdiroriAdaptiveActions(
        label: '버튼 상태',
        children: [
          DdiroriButton(
            label: _saved ? '저장됨' : '저장 예제',
            icon: Icons.check,
            onPressed: () async {
              await Future<void>.delayed(const Duration(milliseconds: 400));
              if (mounted) _change(() => _saved = true);
            },
          ),
          DdiroriButton(
            label: '보조 행동',
            kind: DdiroriButtonKind.secondary,
            onPressed: () {},
          ),
          const DdiroriButton(label: '사용할 수 없음'),
          DdiroriButton(
            label: '위험 행동',
            kind: DdiroriButtonKind.danger,
            onPressed: () => showDdiroriDialog<void>(
              context: context,
              title: '삭제 예제',
              child: const Text('실제 데이터는 삭제하지 않습니다.'),
              actions: [
                DdiroriButton(
                  label: '닫기',
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
        ],
      ),
      const SizedBox(height: 20),
      DdiroriSearch(value: _query, onChanged: (v) => _change(() => _query = v)),
      const SizedBox(height: 12),
      DdiroriSettingsRow(
        title: '정렬 방식',
        description: '선택 상태는 화면이 소유합니다.',
        control: DdiroriSegments<String>(
          options: const {'recent': '최근', 'name': '이름'},
          selected: {_category == 'name' ? 'name' : 'recent'},
          onChanged: (s) => _change(() => _category = s.first),
        ),
      ),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          DdiroriButton(
            label: '설정 시트',
            kind: DdiroriButtonKind.secondary,
            onPressed: () => showDdiroriSheet<void>(
              context: context,
              title: '연습 설정',
              child: const Text('시트 본문은 스크롤되고 키보드 높이만큼 여백을 가집니다.'),
              actions: [
                DdiroriButton(
                  label: '완료',
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
        ],
      ),
    ]),
    _section(context, '상태와 복구', [
      const Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          DdiroriStatusBadge(label: '대기'),
          DdiroriStatusBadge(label: '재생 중', tone: DdiroriStatusTone.success),
          DdiroriStatusBadge(label: '확인 필요', tone: DdiroriStatusTone.warning),
          DdiroriStatusBadge(label: '파일 없음', tone: DdiroriStatusTone.error),
        ],
      ),
      const DdiroriMetricGroup(
        metrics: [
          DdiroriMetricData(label: '작품', value: '128'),
          DdiroriMetricData(label: '녹음', value: '42'),
          DdiroriMetricData(label: '정리 필요', value: '3'),
        ],
      ),
      const DdiroriProgress(label: '악보 준비 중'),
      const SizedBox(height: 24),
      const DdiroriProgress(value: .65, label: '가져오기 65% · 데모'),
      const SizedBox(height: 16),
      for (final kind in DdiroriNoticeKind.values)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: DdiroriBanner(
            message: '${kind.name} 상태 · 글자와 아이콘을 함께 사용합니다.',
            kind: kind,
          ),
        ),
      DdiroriStatePanel(
        title: '파일을 열지 못했어요',
        message: '다시 가져오거나 다른 파일을 선택해주세요.',
        error: true,
        diagnostic: '카탈로그용 오류 예제',
        action: DdiroriButton(
          label: '다시 시도',
          onPressed: () => _change(() => _saved = false),
        ),
      ),
    ]),
  ];
  List<Widget> _library(BuildContext context) {
    const titles = [
      '인벤션 1번 BWV 772',
      '평균율 클라비어곡집 제1권 전주곡과 푸가 다장조 BWV 846',
      '현악 사중주를 위한 연습 악보',
    ];
    final ids = List.generate(titles.length, (i) => i)
        .where(
          (i) =>
              (!_favorites || _favoriteIds.contains(i)) &&
              (_instrument == 'all' ||
                  (_instrument == 'piano' ? i < 2 : i == 2)) &&
              titles[i].contains(_query),
        )
        .toList();
    ids.sort(
      (a, b) => _sort == 'title'
          ? titles[a].compareTo(titles[b])
          : (_recent.contains(a) ? _recent.indexOf(a) : 99).compareTo(
              _recent.contains(b) ? _recent.indexOf(b) : 99,
            ),
    );
    return [
      Text('나의 악보함', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 12),
      Text('최근 연습', style: Theme.of(context).textTheme.titleMedium),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: _recent
            .map(
              (i) => ActionChip(
                label: Text(titles[i]),
                onPressed: () => _openSample(i),
              ),
            )
            .toList(),
      ),
      const SizedBox(height: 16),
      DdiroriSearch(value: _query, onChanged: (v) => _change(() => _query = v)),
      const SizedBox(height: 12),
      DdiroriToolbar(
        label: '악보함 필터',
        children: [
          FilterChip(
            label: const Text('즐겨찾기'),
            selected: _favorites,
            onSelected: (v) => _change(() => _favorites = v),
          ),
          FilterChip(
            label: const Text('다중 선택'),
            selected: _selecting,
            onSelected: (v) => _change(() => _selecting = v),
          ),
          DdiroriIconButton(
            label: '목록/그리드 전환',
            icon: _grid ? Icons.view_list : Icons.grid_view,
            onPressed: () => _change(() => _grid = !_grid),
          ),
          DdiroriChoices<String>(
            options: const {'recent': '최근순', 'title': '제목순'},
            selected: {_sort},
            onChanged: (v) {
              if (v.isNotEmpty) _change(() => _sort = v.first);
            },
          ),
          DdiroriChoices<String>(
            options: const {'all': '전체 악기', 'piano': '피아노', 'strings': '현악'},
            selected: {_instrument},
            onChanged: (v) {
              if (v.isNotEmpty) _change(() => _instrument = v.first);
            },
          ),
        ],
      ),
      const SizedBox(height: 16),
      if (ids.isEmpty)
        DdiroriStatePanel(
          title: '찾는 악보가 없어요',
          message: '검색어나 필터를 바꿔보세요.',
          bach: true,
          action: DdiroriButton(
            label: '검색 초기화',
            onPressed: () => _change(() {
              _query = '';
              _favorites = false;
              _instrument = 'all';
            }),
          ),
        )
      else
        LayoutBuilder(
          builder: (context, c) => Wrap(
            spacing: 12,
            runSpacing: 12,
            children: ids
                .map(
                  (i) => SizedBox(
                    width: _grid && c.maxWidth > 700
                        ? (c.maxWidth - 12) / 2
                        : c.maxWidth,
                    child: DdiroriItem(
                      title: titles[i],
                      subtitle: 'J. S. Bach · 연습 모음 · ${i + 3}페이지',
                      leading: const DdiroriMark(size: 44),
                      selecting: _selecting,
                      selected: _selected.contains(i),
                      onSelected: (v) => _change(() {
                        if (v) {
                          _selected.add(i);
                        } else {
                          _selected.remove(i);
                        }
                      }),
                      onTap: () => _openSample(i),
                      actions: [
                        DdiroriIconButton(
                          label: '${titles[i]} 즐겨찾기',
                          icon: _favoriteIds.contains(i)
                              ? Icons.star
                              : Icons.star_outline,
                          selected: _favoriteIds.contains(i),
                          onPressed: () => _change(() {
                            if (!_favoriteIds.add(i)) _favoriteIds.remove(i);
                          }),
                        ),
                        DdiroriIconButton(
                          label: '${titles[i]} 정보',
                          icon: Icons.info_outline,
                          onPressed: () => showDdiroriSheet<void>(
                            context: context,
                            title: titles[i],
                            child: const Text('메타정보 편집은 앱 adapter에서 연결합니다.'),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      Text('${_selected.length}개 선택됨'),
    ];
  }

  Widget _score(BuildContext context) => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: Color(DdiroriTokens.score['paper']!),
      border: Border.all(color: Theme.of(context).dividerColor),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Invention · 연습 예제',
          style: TextStyle(
            color: Color(DdiroriTokens.score['notation']!),
            fontSize: 22,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(height: 180, child: CustomPaint(painter: _StaffPainter())),
        const Text(
          '카탈로그용 악보 자리 영역 · 실제 PDF 아님',
          style: TextStyle(color: Colors.black87, fontSize: 12),
        ),
      ],
    ),
  );
  List<Widget> _reader(BuildContext context) => [
    Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        Text('인벤션 1번', style: Theme.of(context).textTheme.headlineMedium),
        FilterChip(
          label: const Text('공연 모드'),
          selected: _performance,
          onSelected: (v) => _change(() => _performance = v),
        ),
      ],
    ),
    if (!_performance) ...[
      const SizedBox(height: 16),
      DdiroriAnnotationTools(
        tool: _tool,
        onToolChanged: (v) => _change(() => _tool = v),
        color: _ink,
        onColorChanged: (v) => _change(() => _ink = v),
        width: _width,
        onWidthChanged: (v) => _change(() => _width = v),
        onUndo: () {},
      ),
      const SizedBox(height: 16),
    ],
    _score(context),
    const SizedBox(height: 16),
    DdiroriPageControls(
      page: _page,
      pageCount: 4,
      performance: _performance,
      onPrevious: () => _change(() => _page--),
      onNext: () => _change(() => _page++),
    ),
    if (!_performance) ...[
      const SizedBox(height: 16),
      const DdiroriBanner(message: '주석 색과 악보 지면은 브랜드 테마에 따라 바뀌지 않습니다.'),
    ],
  ];
  List<Widget> _practice(BuildContext context) => [
    _section(context, '박자를 맞춰볼까요', [
      DdiroriNumber(
        label: '빠르기',
        value: _bpm,
        min: 40,
        max: 240,
        unit: 'BPM',
        onChanged: (v) => _change(() => _bpm = v),
      ),
      DdiroriChoices<int>(
        options: const {2: '2/4', 3: '3/4', 4: '4/4', 6: '6/8'},
        selected: {_meter},
        onChanged: (v) {
          if (v.isNotEmpty) {
            _change(() {
              _meter = v.first;
              _beat = 1;
            });
          }
        },
      ),
      const SizedBox(height: 12),
      DdiroriBeatIndicator(
        beats: _meter,
        currentBeat: _beat,
        running: _running,
      ),
      const SizedBox(height: 16),
      Wrap(
        spacing: 12,
        runSpacing: 8,
        children: [
          DdiroriButton(
            label: _running ? '정지' : '시작',
            icon: _running ? Icons.stop : Icons.play_arrow,
            onPressed: () => _change(() => _running = !_running),
          ),
          DdiroriButton(
            label: '다음 박 · 데모',
            kind: DdiroriButtonKind.secondary,
            onPressed: _running
                ? () => _change(() => _beat = _beat % _meter + 1)
                : null,
          ),
        ],
      ),
      const Text('타이밍·소리는 연결하지 않은 표시 예제입니다.'),
    ]),
    _section(context, '음정을 살펴볼까요', [
      DdiroriChoices<DdiroriTunerStatus>(
        options: const {
          DdiroriTunerStatus.flat: '낮음',
          DdiroriTunerStatus.centered: '정확',
          DdiroriTunerStatus.sharp: '높음',
          DdiroriTunerStatus.noSignal: '신호 없음',
          DdiroriTunerStatus.lowConfidence: '신뢰도 낮음',
        },
        selected: {_tuner},
        onChanged: (v) {
          if (v.isNotEmpty) _change(() => _tuner = v.first);
        },
      ),
      const SizedBox(height: 16),
      DdiroriTunerMeter(status: _tuner, cents: _cents),
      Slider(
        label: '데모 음정 편차',
        value: _cents,
        min: -50,
        max: 50,
        onChanged: (v) => _change(() => _cents = v),
      ),
      const Text('마이크를 사용하지 않는 시뮬레이션입니다.'),
    ]),
  ];
  List<Widget> _studio(BuildContext context) => [
    DdiroriToolbar(
      label: '사보 도구 분류',
      children: [
        DdiroriChoices<String>(
          options: const {'note': '음표 입력', 'objects': '표기 객체'},
          selected: {_category == 'objects' ? 'objects' : 'note'},
          onChanged: (v) {
            if (v.isNotEmpty) _change(() => _category = v.first);
          },
        ),
        DdiroriIconButton(
          label: '실행 취소',
          icon: Icons.undo,
          onPressed: _saved ? () => _change(() => _saved = false) : null,
        ),
        DdiroriButton(
          label: '변경 예제',
          onPressed: () => _change(() => _saved = true),
        ),
      ],
    ),
    const SizedBox(height: 16),
    LayoutBuilder(
      builder: (context, c) {
        final panel = _section(context, '선택 속성', [
          DdiroriChoices<int>(
            options: const {1: '1성부', 2: '2성부'},
            selected: {_voice},
            onChanged: (v) {
              if (v.isNotEmpty) _change(() => _voice = v.first);
            },
          ),
          const SizedBox(height: 16),
          DdiroriNumber(
            label: '높이',
            value: _width,
            min: 1,
            max: 10,
            enabled: _category == 'objects',
            onChanged: (v) => _change(() => _width = v),
          ),
          const Text('속성 패널과 도구 상태만 확인하는 예제입니다.'),
        ]);
        return c.maxWidth > 850
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 2, child: _score(context)),
                  const SizedBox(width: 16),
                  Expanded(child: panel),
                ],
              )
            : Column(children: [_score(context), panel]);
      },
    ),
  ];
  List<Widget> _play(BuildContext context) => [
    const DdiroriPageHeader(
      title: '다시 듣고 싶은 연주',
      subtitle: '작품·녹음 정보와 재생 상태를 같은 문법으로 표시합니다.',
    ),
    const SizedBox(height: 16),
    DdiroriItem(
      title: '골드베르크 변주곡 · 아리아',
      subtitle: 'J. S. Bach · 녹음과 작품을 구분하는 목록 예제',
      leading: const DdiroriMark(),
      trailing: DdiroriStatusBadge(
        label: _playing ? '재생 중' : '대기',
        tone: _playing ? DdiroriStatusTone.success : DdiroriStatusTone.neutral,
      ),
      onTap: () => _change(() => _playing = !_playing),
      actions: [
        DdiroriIconButton(
          label: '연주 즐겨찾기',
          icon: Icons.star_outline,
          onPressed: () {},
        ),
      ],
    ),
    _section(context, '재생 조작', [
      DdiroriTransport(
        playing: _playing,
        onToggle: () => _change(() => _playing = !_playing),
        position: Duration(seconds: _position.round()),
        duration: const Duration(minutes: 3),
        bufferedPosition: const Duration(minutes: 1, seconds: 10),
        statusLabel: _playing ? '재생 중' : '재생 대기',
        onSeek: (v) => _change(() => _position = v.inSeconds.toDouble()),
        onPrevious: () {},
        onNext: () {},
      ),
      const DdiroriTransport(
        playing: false,
        onToggle: null,
        variant: DdiroriTransportVariant.compact,
        statusLabel: 'compact · 사용할 수 없음',
      ),
      const Text('실제 음원은 재생하지 않습니다.'),
    ]),
  ];
}

class _StaffPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = Color(DdiroriTokens.score['notation']!)
      ..strokeWidth = 1;
    for (var system = 0; system < 2; system++) {
      for (var i = 0; i < 5; i++) {
        final y = 20.0 + system * 80 + i * 9;
        canvas.drawLine(Offset(0, y), Offset(size.width, y), p);
      }
      for (var i = 1; i < 6; i++) {
        final x = size.width * i / 7;
        final y = 38.0 + system * 80 + (i % 3 - 1) * 9;
        canvas.drawOval(
          Rect.fromCenter(center: Offset(x, y), width: 12, height: 8),
          p..style = PaintingStyle.fill,
        );
        canvas.drawLine(
          Offset(x + 6, y),
          Offset(x + 6, y - 24),
          p..style = PaintingStyle.stroke,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _StaffPainter old) => false;
}
