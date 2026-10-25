import 'package:flutter/material.dart';
import 'package:ddirori_ui/ddirori_ui.dart';

class DdiroriBasicSet extends StatefulWidget {
  const DdiroriBasicSet({
    super.key,
    this.initialDark = false,
    this.initialExample = '악보함',
  });
  final bool initialDark;
  final String initialExample;
  @override
  State<DdiroriBasicSet> createState() => _BasicSetState();
}

class _BasicSetState extends State<DdiroriBasicSet> {
  late bool dark = widget.initialDark;
  late String example = widget.initialExample;
  bool compact = false, touch = true;
  String accent = 'lime', query = '', category = '전체';
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ddiroriTheme(
      brightness: dark ? Brightness.dark : Brightness.light,
      density: compact ? DdiroriDensity.compact : DdiroriDensity.comfortable,
      touch: touch,
      accent: accent,
    ),
    home: Builder(
      builder: (context) => Scaffold(
        body: SafeArea(
          child: SingleChildScrollView(
            child: DdiroriContainer(
              child: DdiroriStack(
                gap: 24,
                children: [
                  const DdiroriPageHeader(
                    title: '기본 컴포넌트',
                    subtitle: '실제 Flutter 패키지와 네이티브 위젯을 연결한 디자인 세트',
                  ),
                  Wrap(
                    spacing: 16,
                    runSpacing: 8,
                    children: [
                      FilterChip(
                        label: const Text('다크 모드'),
                        selected: dark,
                        onSelected: (v) => setState(() => dark = v),
                      ),
                      FilterChip(
                        label: const Text('Compact'),
                        selected: compact,
                        onSelected: (v) => setState(() => compact = v),
                      ),
                      FilterChip(
                        label: const Text('터치 영역 48'),
                        selected: touch,
                        onSelected: (v) => setState(() => touch = v),
                      ),
                      DropdownButton<String>(
                        value: accent,
                        items: [
                          for (final key in DdiroriTokens.accents.keys)
                            DropdownMenuItem(value: key, child: Text(key)),
                        ],
                        onChanged: (v) => setState(() => accent = v!),
                        hint: const Text('강조색 · 임시'),
                      ),
                    ],
                  ),
                  DdiroriSearch(
                    label: '컴포넌트 검색',
                    value: query,
                    onChanged: (v) => setState(() => query = v),
                  ),
                  DdiroriChoices(
                    options: const {
                      '전체': '전체',
                      '실행': '실행',
                      '입력·선택': '입력·선택',
                      '정보 표시': '정보 표시',
                      '피드백': '피드백',
                      '일시적 UI': '일시적 UI',
                      '배치·탐색': '배치·탐색',
                    },
                    selected: {category},
                    onChanged: (v) {
                      if (v.isNotEmpty) setState(() => category = v.first);
                    },
                  ),
                  BasicExamples(query: query, category: category),
                  const Divider(),
                  const Text(
                    '화면으로 조합해보기',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                  ),
                  const Text('실제 파일·오디오·편집 엔진에 연결하지 않은 독립 예제입니다.'),
                  DdiroriTabs(
                    label: '조합 화면',
                    value: example,
                    onChanged: (v) => setState(() => example = v),
                    tabs: [
                      for (final name in ['악보함', '작품·녹음', '설정', '사보 패널'])
                        DdiroriTab(
                          id: name,
                          label: name,
                          child: BasicComposition(
                            key: ValueKey(name),
                            kind: name,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class _Spec extends StatelessWidget {
  const _Spec({
    required this.title,
    required this.description,
    required this.code,
    required this.child,
  });
  final String title, description, code;
  final Widget child;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 16),
    child: DdiroriStack(
      gap: 16,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            const DdiroriStatusBadge(label: '구현'),
          ],
        ),
        Text(description, style: Theme.of(context).textTheme.bodySmall),
        child,
        ExpansionTile(
          tilePadding: EdgeInsets.zero,
          title: const Text('사용 코드'),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: SelectableText(
                code,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 14),
              ),
            ),
          ],
        ),
        const Divider(height: 1),
      ],
    ),
  );
}

class BasicExamples extends StatefulWidget {
  const BasicExamples({super.key, required this.query, required this.category});
  final String query, category;
  @override
  State<BasicExamples> createState() => _BasicExamplesState();
}

class _BasicExamplesState extends State<BasicExamples> {
  String text = '오늘의 연습',
      radio = '자동',
      sort = '최근순',
      tab = '악보',
      message = '선택한 동작이 여기에 표시됩니다.';
  bool checked = true, enabled = true, open = false, ascending = true;
  double bpm = 96, volume = .65;
  Set<String> segments = {'목록'}, filters = {'즐겨찾기'};
  void change(VoidCallback fn) => setState(fn);
  @override
  Widget build(BuildContext context) {
    final entries =
        <
          ({
            String title,
            String group,
            String description,
            String code,
            Widget child,
          })
        >[
          (
            title: 'Button · IconButton · Toggle · Group',
            group: '실행',
            description: 'Wrap과 공통 버튼으로 명령을 묶습니다. 선택·로딩·비활성은 구분합니다.',
            code: 'DdiroriButton(label: "저장", onPressed: save)\nDdiroriButton(selected: pinned, onPressed: toggle)',
            child: DdiroriStack(
              inline: true,
              children: [
                DdiroriButton(
                  label: '저장',
                  onPressed: () =>
                      showDdiroriToast(context, message: '예제 설정을 저장했어요'),
                ),
                DdiroriButton(
                  label: '사본 만들기',
                  kind: DdiroriButtonKind.secondary,
                  onPressed: () => change(() => message = '사본 요청'),
                ),
                DdiroriButton(
                  label: '취소',
                  kind: DdiroriButtonKind.quiet,
                  onPressed: () => change(() => message = '취소'),
                ),
                DdiroriButton(
                  label: '즐겨찾기',
                  selected: checked,
                  kind: DdiroriButtonKind.secondary,
                  onPressed: () => change(() => checked = !checked),
                ),
                const DdiroriButton(label: '처리 중', busy: true),
                const DdiroriButton(label: '실행 불가'),
                DdiroriIconButton(
                  label: '악보 추가',
                  icon: Icons.add,
                  onPressed: () => change(() => message = '추가 요청'),
                ),
              ],
            ),
          ),
          (
            title: 'Field · TextInput · Textarea · Search',
            group: '입력·선택',
            description:
                '공통 Input이 label·help·error·required·readOnly·maxLines를 제공합니다.',
            code: 'DdiroriInput(label:"메모", value:memo, maxLines:3, onChanged:setMemo)\nDdiroriInput(label:"작품 번호", value:"BWV 846", readOnly:true, onChanged:ignore)',
            child: DdiroriStack(
              children: [
                DdiroriInput(
                  label: '연습 이름',
                  value: text,
                  onChanged: (v) => change(() => text = v),
                  required: true,
                  help: '나중에 바꿀 수 있어요',
                ),
                DdiroriInput(
                  label: '메모',
                  value: text,
                  onChanged: (v) => change(() => text = v),
                  maxLines: 3,
                ),
                DdiroriInput(
                  label: '작품 번호',
                  value: 'BWV 846',
                  readOnly: true,
                  clearable: true,
                  onChanged: (_) {},
                ),
                DdiroriInput(
                  label: '오류 예제',
                  value: '',
                  error: '이름을 입력해 주세요',
                  onChanged: (_) {},
                ),
                DdiroriSearch(
                  label: '작품 검색 예제',
                  value: text,
                  onChanged: (v) => change(() => text = v),
                ),
              ],
            ),
          ),
          (
            title: 'Checkbox · RadioGroup · Switch · Select',
            group: '입력·선택',
            description: 'ddiroriTheme 아래에서 Material 입력을 사용합니다. 기본 플랫폼 semantics와 키보드 동작을 유지합니다.',
            code: 'CheckboxListTile(value: selected, onChanged: setSelected, title: Text("선택"))\nRadioGroup<String>(groupValue: mode, onChanged: setMode, child: ...)\nSwitchListTile(value: enabled, onChanged: setEnabled, title: Text("알림"))',
            child: DdiroriStack(
              children: [
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('오프라인에서 보관'),
                  value: checked,
                  onChanged: (v) => change(() => checked = v!),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('일부 선택'),
                  tristate: true,
                  value: null,
                  onChanged: (_) {},
                ),
                const CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('비활성 선택'),
                  value: true,
                  onChanged: null,
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('연습 알림'),
                  value: enabled,
                  onChanged: (v) => change(() => enabled = v),
                ),
                RadioGroup<String>(
                  groupValue: radio,
                  onChanged: (v) => change(() => radio = v!),
                  child: Column(
                    children: [
                      for (final v in ['자동', '직접 선택'])
                        RadioListTile<String>(
                          contentPadding: EdgeInsets.zero,
                          title: Text(v),
                          value: v,
                        ),
                    ],
                  ),
                ),
                InputDecorator(
                  decoration: const InputDecoration(labelText: '정렬'),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: sort,
                      items: [
                        for (final s in ['최근순', '이름순'])
                          DropdownMenuItem(value: s, child: Text(s)),
                      ],
                      onChanged: (v) => change(() => sort = v!),
                    ),
                  ),
                ),
              ],
            ),
          ),
          (
            title: 'Number · Slider · FilterChip · Segmented',
            group: '입력·선택',
            description: '숫자의 범위와 다중 필터를 구분합니다. 분할 선택은 한 값의 선택입니다.',
            code: 'DdiroriNumber(label:"빠르기",value:bpm,min:40,max:240,onChanged:setBpm)\nDdiroriSegments(options:options,selected:selected,onChanged:setSelected)',
            child: DdiroriStack(
              children: [
                DdiroriNumber(
                  label: '빠르기',
                  unit: 'BPM',
                  value: bpm,
                  min: 40,
                  max: 240,
                  onChanged: (v) => change(() => bpm = v),
                ),
                Text('음량 표시 예제 ${(volume * 100).round()}%'),
                Slider(
                  value: volume,
                  onChanged: (v) => change(() => volume = v),
                  semanticFormatterCallback: (v) => '${(v * 100).round()}%',
                ),
                DdiroriChoices(
                  options: const {'즐겨찾기': '즐겨찾기', '다운로드': '다운로드'},
                  selected: filters,
                  multiple: true,
                  onChanged: (v) => change(() => filters = v),
                ),
                DdiroriSegments(
                  options: const {'목록': '목록', '격자': '격자'},
                  selected: segments,
                  onChanged: (v) => change(() => segments = v),
                ),
              ],
            ),
          ),
          (
            title: 'Tabs · Panel',
            group: '입력·선택',
            description: '방향키·Home·End로 이동하며 비활성 탭을 건너뜁니다. 선택과 포커스는 별개입니다.',
            code: 'DdiroriTabs(label:"자료",value:tab,onChanged:setTab,tabs:[DdiroriTab(id:"score",label:"악보",child:Library())])',
            child: DdiroriTabs(
              label: '자료 분류',
              value: tab,
              onChanged: (v) => change(() => tab = v),
              tabs: const [
                DdiroriTab(
                  id: '악보',
                  label: '악보',
                  child: Text('연습할 악보를 골라보세요.'),
                ),
                DdiroriTab(
                  id: '녹음',
                  label: '녹음',
                  child: Text('서로 다른 해석을 들어보세요.'),
                ),
                DdiroriTab(
                  id: '협업',
                  label: '협업 · 준비 중',
                  enabled: false,
                  child: SizedBox.shrink(),
                ),
              ],
            ),
          ),
          (
            title: 'Typography · Icon · Avatar · Badge',
            group: '정보 표시',
            description: 'TextTheme과 의미 스타일을 사용합니다. 이미지 실패 시 이름으로 식별합니다.',
            code: 'Text("최근 연습",style:ddiroriTextStyle(DdiroriTextRole.sectionTitle))\nDdiroriAvatar(name:"김연주")\nDdiroriStatusBadge(label:"준비됨",tone:DdiroriStatusTone.success)',
            child: DdiroriStack(
              children: [
                Text(
                  '음악을 위한 명확한 도구',
                  style: ddiroriTextStyle(DdiroriTextRole.screenTitle),
                ),
                const Text('긴 한국어와 English titles가 자연스럽게 이어지는 본문입니다.'),
                DdiroriStack(
                  inline: true,
                  children: const [
                    Icon(Icons.music_note, semanticLabel: '연주'),
                    DdiroriAvatar(name: '김연주'),
                    Badge(label: Text('12'), child: Icon(Icons.library_music)),
                    DdiroriStatusBadge(
                      label: '준비됨',
                      tone: DdiroriStatusTone.success,
                    ),
                    DdiroriStatusBadge(
                      label: '파일 없음',
                      tone: DdiroriStatusTone.error,
                    ),
                  ],
                ),
              ],
            ),
          ),
          (
            title: 'List · Item · Divider · Card · Section',
            group: '정보 표시',
            description: 'flat 옵션으로 평면 목록을 구성합니다. 선택과 보조 행동은 별도 조작입니다.',
            code: 'DdiroriList(label:"악보",children:[DdiroriItem(flat:true,title:title,onTap:open)])',
            child: DdiroriSection(
              title: '최근 연습',
              children: [
                DdiroriStack(
                  children: [
                    DdiroriList(
                      label: '최근 악보',
                      children: [
                        for (final title in sampleTitles)
                          DdiroriItem(
                            flat: true,
                            title: title,
                            subtitle: 'J. S. Bach · 6페이지',
                            selecting: true,
                            selected: checked,
                            onSelected: (v) => change(() => checked = v),
                            onTap: () => change(() => message = title),
                            actions: [
                              DdiroriIconButton(
                                label: '작품 정보',
                                icon: Icons.info_outline,
                                onPressed: () =>
                                    change(() => message = '작품 정보'),
                              ),
                            ],
                          ),
                      ],
                    ),
                    const Divider(),
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('파일과 연습 기록은 제품에서 연결합니다.'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          (
            title: 'Accordion · Table',
            group: '정보 표시',
            description: '표는 native DataTable, 정렬과 데이터는 호스트가 소유합니다. 좁은 폭에서는 표 영역만 스크롤합니다.',
            code: 'DdiroriAccordion(title:"파일 정보",open:open,onChanged:setOpen,child:content)\nSingleChildScrollView(scrollDirection:Axis.horizontal,child:DataTable(...))',
            child: DdiroriStack(
              children: [
                DdiroriAccordion(
                  title: '파일 정보',
                  open: open,
                  onChanged: (v) => change(() => open = v),
                  child: const Text('원본 파일을 읽지 않는 예제입니다.'),
                ),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    dataRowMinHeight: 48,
                    dataRowMaxHeight: double.infinity,
                    sortColumnIndex: 0,
                    sortAscending: ascending,
                    columns: [
                      DataColumn(
                        label: const Text('자료'),
                        onSort: (_, v) => change(() => ascending = v),
                      ),
                      const DataColumn(label: Text('페이지'), numeric: true),
                    ],
                    rows: [
                      for (final title
                          in (ascending ? sampleTitles : sampleTitles.reversed))
                        DataRow(
                          cells: [
                            DataCell(SizedBox(width: 220, child: Text(title))),
                            const DataCell(Text('6')),
                          ],
                        ),
                    ],
                  ),
                ),
                const DdiroriInlineMessage(
                  message: '빈 표에서는 “표시할 항목이 없어요”를 본문으로 제공합니다.',
                ),
              ],
            ),
          ),
          (
            title: 'Banner · InlineMessage · Empty / Error',
            group: '피드백',
            description: '오류에는 복구 행동을 제공하며 바흐는 보조 위치에서만 사용합니다.',
            code: 'DdiroriBanner(message:"읽지 못했어요",kind:DdiroriNoticeKind.error,action:retry)\nDdiroriStatePanel(title:"첫 악보를 추가해보세요",message:"오늘 연습할 곡부터 시작해요")',
            child: DdiroriStack(
              children: [
                const DdiroriBanner(message: '샘플 데이터로 구성한 화면입니다.'),
                DdiroriBanner(
                  message: '파일을 읽지 못했어요',
                  kind: DdiroriNoticeKind.error,
                  action: DdiroriButton(
                    label: '다시 시도',
                    onPressed: () => change(() => message = '재시도 요청'),
                  ),
                ),
                const DdiroriInlineMessage(message: '설정은 언제든 바꿀 수 있어요.'),
                const DdiroriStatePanel(
                  title: '첫 악보를 추가해보세요',
                  message: '오늘 연습할 곡부터 시작해요.',
                  bach: true,
                ),
              ],
            ),
          ),
          (
            title: 'Toast · Progress · Skeleton',
            group: '피드백',
            description: '진행률은 실제 값입니다. 알림은 자동으로 포커스를 옮기지 않습니다.',
            code: 'showDdiroriToast(context,message:"저장했어요")\nDdiroriProgress(value:.6,label:"자료 준비 60%")\nDdiroriSkeleton()',
            child: DdiroriStack(
              children: [
                const DdiroriProgress(value: .6, label: '자료 준비 60%'),
                const DdiroriProgress(label: '자료를 읽는 중'),
                const DdiroriSkeleton(),
                DdiroriButton(
                  label: '저장 알림 보기',
                  onPressed: () =>
                      showDdiroriToast(context, message: '예제 설정을 저장했어요'),
                ),
              ],
            ),
          ),
          (
            title: 'Dialog · Sheet · Menu · Popover · Tooltip',
            group: '일시적 UI',
            description:
                '메뉴는 PopupMenuButton, 팝오버는 테마를 유지하는 anchored dialog로 연결합니다.',
            code: 'showDdiroriConfirmDialog(context:context,title:"예제 삭제",message:"실제 파일을 삭제하지 않아요")\nDdiroriPopover(label:"설정",builder:(context)=>settings)',
            child: DdiroriStack(
              children: [
                DdiroriStack(
                  inline: true,
                  children: [
                    DdiroriButton(
                      label: '삭제 확인',
                      onPressed: () async {
                        final result = await showDdiroriConfirmDialog(
                          context: context,
                          title: '예제 삭제',
                          confirmLabel: '삭제',
                          message: '실제 파일을 삭제하지 않습니다.',
                        );
                        if (mounted) {
                          change(() => message = result ? '삭제 요청' : '취소');
                        }
                      },
                    ),
                    DdiroriButton(
                      label: '설정 시트',
                      kind: DdiroriButtonKind.secondary,
                      onPressed: () => showDdiroriSheet<void>(
                        context: context,
                        title: '연습 설정',
                        child: DdiroriInput(
                          label: '연습 이름',
                          value: text,
                          onChanged: (v) => text = v,
                        ),
                      ),
                    ),
                    DdiroriMenuButton<String>(
                      label: '자료 메뉴',
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: '열기', child: Text('열기')),
                        PopupMenuItem(
                          value: '준비',
                          enabled: false,
                          child: Text('내보내기 · 준비 중'),
                        ),
                        PopupMenuItem(value: '사본 만들기', child: Text('사본 만들기')),
                      ],
                      onSelected: (v) => change(() => message = v),
                    ),
                    DdiroriPopover(
                      label: '표시 설정',
                      builder: (ctx) => DdiroriStack(
                        children: [
                          DdiroriInput(
                            label: '표시 이름',
                            value: text,
                            onChanged: (v) => text = v,
                          ),
                          DdiroriButton(
                            label: '적용',
                            onPressed: () => Navigator.of(ctx).pop(),
                          ),
                        ],
                      ),
                    ),
                    Tooltip(
                      message: '원본을 유지하고 사본을 만듭니다.',
                      child: DdiroriButton(
                        label: '사본 안내',
                        kind: DdiroriButtonKind.quiet,
                        onPressed: () => change(() => message = '사본 요청'),
                      ),
                    ),
                  ],
                ),
                DdiroriInlineMessage(message: message),
              ],
            ),
          ),
          (
            title: 'Layout · Header · Navigation · Services',
            group: '배치·탐색',
            description: '간격은 Stack/Wrap, 화면은 Container, 헤더는 PageHeader로 구성합니다. NavigationBar/Rail은 같은 테마를 사용합니다.',
            code: 'DdiroriContainer(child:DdiroriStack(children:...))\nDdiroriPageHeader(title:"나의 악보함")\nNavigationBar(selectedIndex:index,onDestinationSelected:setIndex,destinations:...)',
            child: DdiroriStack(
              children: [
                const DdiroriPageHeader(
                  title: '나의 악보함',
                  subtitle: '연습할 곡을 가장 편한 자리에',
                ),
                LayoutBuilder(
                  builder: (context, constraints) =>
                      constraints.maxWidth >= DdiroriTokens.breakpoints['wide']!
                      ? SizedBox(
                          height: 240,
                          child: Row(
                            children: [
                              NavigationRail(
                                labelType: NavigationRailLabelType.all,
                                selectedIndex: segments.contains('목록') ? 0 : 1,
                                onDestinationSelected: (i) => change(
                                  () => segments = {i == 0 ? '목록' : '격자'},
                                ),
                                destinations: const [
                                  NavigationRailDestination(
                                    icon: Icon(Icons.library_music),
                                    label: Text('악보'),
                                  ),
                                  NavigationRailDestination(
                                    icon: Icon(Icons.headphones),
                                    label: Text('녹음'),
                                  ),
                                ],
                              ),
                              const Expanded(
                                child: Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Text('넓은 화면의 탐색 영역 예제'),
                                ),
                              ),
                            ],
                          ),
                        )
                      : NavigationBar(
                          selectedIndex: segments.contains('목록') ? 0 : 1,
                          onDestinationSelected: (i) =>
                              change(() => segments = {i == 0 ? '목록' : '격자'}),
                          destinations: const [
                            NavigationDestination(
                              icon: Icon(Icons.library_music),
                              label: '악보',
                            ),
                            NavigationDestination(
                              icon: Icon(Icons.headphones),
                              label: '녹음',
                            ),
                          ],
                        ),
                ),
                const DdiroriProductSignature(
                  product: DdiroriProduct.studio,
                  name: '띠로리 스튜디오',
                  subtitle: '악보를 만드는 도구',
                ),
              ],
            ),
          ),
        ];
    final visible = entries
        .where(
          (e) =>
              (widget.category == '전체' || e.group == widget.category) &&
              ('${e.title} ${e.description}').toLowerCase().contains(
                widget.query.toLowerCase(),
              ),
        )
        .toList();
    return DdiroriStack(
      children: [
        for (final entry in visible)
          _Spec(
            title: entry.title,
            description: entry.description,
            code: entry.code,
            child: entry.child,
          ),
        if (visible.isEmpty)
          const DdiroriStatePanel(
            title: '검색 결과가 없어요',
            message: '다른 이름으로 검색해보세요.',
          ),
      ],
    );
  }
}

const sampleTitles = [
  '평균율 클라비어곡집 제1권 전주곡과 푸가 다장조 BWV 846',
  'Images, Book I — Reflets dans l’eau / 영상 제1집 · 물의 반영',
  '인벤션 1번 BWV 772',
];

class BasicComposition extends StatefulWidget {
  const BasicComposition({super.key, required this.kind});
  final String kind;
  @override
  State<BasicComposition> createState() => _BasicCompositionState();
}

class _BasicCompositionState extends State<BasicComposition> {
  String query = '',
      name = '나의 연습',
      memo = '',
      error = '',
      instrument = '피아노',
      message = '',
      mode = '자동';
  bool notify = true, playing = false;
  double bpm = 96;
  Set<String> selected = {}, filter = {}, voice = {'1'};
  @override
  Widget build(BuildContext context) {
    void change(VoidCallback fn) => setState(fn);
    if (widget.kind == '설정') {
      return Align(
        alignment: Alignment.topLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: DdiroriTokens.layout['dialogWidth']!,
          ),
          child: DdiroriStack(
            children: [
              DdiroriInput(
                label: '프로필 이름',
                value: name,
                onChanged: (v) => change(() => name = v),
                required: true,
                error: error.isEmpty ? null : error,
              ),
              DdiroriInput(
                label: '연습 메모',
                value: memo,
                onChanged: (v) => change(() => memo = v),
                maxLines: 3,
              ),
              SwitchListTile(
                title: const Text('연습 알림'),
                value: notify,
                onChanged: (v) => change(() => notify = v),
              ),
              RadioGroup<String>(
                groupValue: mode,
                onChanged: (v) => change(() => mode = v!),
                child: Column(
                  children: [
                    for (final v in ['자동', '직접 선택'])
                      RadioListTile<String>(title: Text(v), value: v),
                  ],
                ),
              ),
              InputDecorator(
                decoration: const InputDecoration(labelText: '기본 악기'),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    style: Theme.of(context).textTheme.bodyLarge,
                    value: instrument,
                    items: [
                      for (final v in ['피아노', '현악', '관악'])
                        DropdownMenuItem(value: v, child: Text(v)),
                    ],
                    onChanged: (v) => change(() => instrument = v!),
                  ),
                ),
              ),
              DdiroriButton(
                label: '변경 저장',
                onPressed: () async {
                  if (name.trim().isEmpty) {
                    change(() => error = '이름을 입력해 주세요');
                    return;
                  }
                  change(() => error = '');
                  final result = await showDdiroriConfirmDialog(
                    context: context,
                    title: '설정을 저장할까요?',
                    confirmLabel: '저장',
                    message: '$name · $instrument',
                  );
                  if (result && context.mounted) {
                    showDdiroriToast(context, message: '예제 설정을 저장했어요');
                  }
                },
              ),
            ],
          ),
        ),
      );
    }
    if (widget.kind == '사보 패널') {
      return Theme(
        data: Theme.of(context).copyWith(
          extensions: [
            ...Theme.of(context).extensions.values
                .where((e) => e is! DdiroriStyle),
            DdiroriStyle.of(context).copyWith(density: DdiroriDensity.compact),
          ],
        ),
        child: DdiroriStack(
          children: [
            DdiroriToolbar(
              children: [
                Tooltip(
                  message: '편집 엔진에 연결하지 않은 예제',
                  child: DdiroriButton(
                    label: '실행 취소',
                    kind: DdiroriButtonKind.quiet,
                    onPressed: () => change(() => message = '실행 취소 요청'),
                  ),
                ),
                DdiroriButton(
                  label: '저장',
                  onPressed: () => change(() => message = '저장 요청'),
                ),
              ],
            ),
            DdiroriSegments(
              options: const {'1': '성부 1', '2': '성부 2', '3': '성부 3'},
              selected: voice,
              onChanged: (v) => change(() => voice = v),
            ),
            DdiroriNumber(
              label: '빠르기',
              unit: 'BPM',
              value: bpm,
              min: 40,
              max: 240,
              onChanged: (v) => change(() => bpm = v),
            ),
            DdiroriInlineMessage(
              message: message.isEmpty ? '선택한 도구의 속성을 표시합니다.' : message,
            ),
          ],
        ),
      );
    }
    final visible = sampleTitles
        .where(
          (t) =>
              t.toLowerCase().contains(query.toLowerCase()) &&
              (filter.isEmpty || t == sampleTitles.first),
        )
        .toList();
    return DdiroriStack(
      children: [
        DdiroriPageHeader(title: widget.kind == '악보함' ? '나의 악보함' : '작품과 녹음'),
        DdiroriSearch(
          label: '작품 검색',
          value: query,
          onChanged: (v) => change(() => query = v),
        ),
        DdiroriChoices(
          options: const {'즐겨찾기': '즐겨찾기'},
          selected: filter,
          onChanged: (v) => change(() => filter = v),
        ),
        if (visible.isEmpty)
          DdiroriStatePanel(
            title: '검색 결과가 없어요',
            message: '검색어나 필터를 바꿔보세요.',
            action: DdiroriButton(
              label: '검색 초기화',
              onPressed: () => change(() {
                query = '';
                filter = {};
              }),
            ),
          )
        else
          DdiroriList(
            label: '자료 목록',
            children: [
              for (final title in visible)
                DdiroriItem(
                  flat: true,
                  title: title,
                  subtitle: widget.kind == '악보함'
                      ? 'J. S. Bach · 6페이지'
                      : '연주자 김연주 · 2024 · 로컬 녹음',
                  selecting: true,
                  selected: selected.contains(title),
                  onSelected: (v) => change(
                    () => v ? selected.add(title) : selected.remove(title),
                  ),
                  onTap: () => change(() => message = '$title 선택'),
                  actions: [
                    const DdiroriStatusBadge(
                      label: '준비됨',
                      tone: DdiroriStatusTone.success,
                    ),
                    DdiroriMenuButton<String>(
                      label: '$title 메뉴',
                      itemBuilder: (_) => const [
                        PopupMenuItem(value: '정보', child: Text('정보 보기')),
                        PopupMenuItem(value: '사본', child: Text('사본 만들기')),
                      ],
                      onSelected: (v) => change(() => message = v),
                    ),
                  ],
                ),
            ],
          ),
        DdiroriInlineMessage(message: '${selected.length}개 선택 · $message'),
        if (widget.kind == '작품·녹음')
          DdiroriButton(
            label: playing ? '일시정지' : '재생',
            onPressed: () => change(() => playing = !playing),
          ),
      ],
    );
  }
}
