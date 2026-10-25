// Documentation fixtures, not an application entry point.
import 'package:flutter/material.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
List<Widget> componentExamples(BuildContext context) => [
  // C01
  DdiroriButton(label: '저장', onPressed: () {}),
  // C02
  DdiroriIconButton(label: '추가', icon: Icons.add, onPressed: () {}),
  // C03
  DdiroriButton(label: '고정', selected: true, onPressed: () {}),
  // C04
  DdiroriInput(label: '제목', value: '연습', onChanged: (_) {}, required: true),
  // C05
  CheckboxListTile(title: const Text('선택'), value: false, onChanged: (_) {}),
  // C06
  RadioGroup<String>(groupValue: 'auto', onChanged: (_) {}, child: const RadioListTile<String>(value: 'auto', title: Text('자동'))),
  // C07
  SwitchListTile(title: const Text('알림'), value: false, onChanged: (_) {}),
  // C08
  InputDecorator(decoration: const InputDecoration(labelText: '정렬'), child: DropdownButtonHideUnderline(child: DropdownButton<String>(isExpanded: true, value: 'recent', items: const [DropdownMenuItem(value: 'recent', child: Text('최근순'))], onChanged: (_) {}))),
  // C09
  DdiroriNumber(label: '빠르기', value: 96, min: 30, max: 240, unit: 'BPM', onChanged: (_) {}),
  // C10
  Slider(value: .5, semanticFormatterCallback: (v) => '${(v * 100).round()}%', onChanged: (_) {}),
  // C11
  DdiroriChoices<String>(options: const {'fav': '즐겨찾기'}, selected: const {}, multiple: true, onChanged: (_) {}),
  // C12
  DdiroriSegments<String>(options: const {'list': '목록'}, selected: const {'list'}, onChanged: (_) {}),
  // C13
  DdiroriTabs(label: '자료', value: 'score', onChanged: (_) {}, tabs: const [DdiroriTab(id: 'score', label: '악보', child: Text('자료'))]),
  // C14
  Semantics(header: true, child: Text('악보함', style: ddiroriTextStyle(DdiroriTextRole.screenTitle))),
  // C15
  const Icon(Icons.music_note, size: 20, semanticLabel: '악보'),
  // C16
  const DdiroriAvatar(name: '김연주'),
  // C17
  const DdiroriStatusBadge(label: '확인 필요', tone: DdiroriStatusTone.warning),
  // C18
  const Divider(thickness: 1),
  // C19
  DdiroriList(label: '악보', children: [DdiroriItem(title: '연습곡', subtitle: '작곡가', flat: true, onTap: () {})]),
  // C20
  const DdiroriSection(title: '최근', children: [Text('자료')]),
  // C21
  DdiroriAccordion(title: '상세', open: false, onChanged: (_) {}, child: const Text('설명')),
  // C22
  SingleChildScrollView(scrollDirection: Axis.horizontal, child: DataTable(columns: const [DataColumn(label: Text('이름'))], rows: const [])),
  // C23
  const DdiroriBanner(message: '불러오지 못했어요', kind: DdiroriNoticeKind.error),
  // C24
  const DdiroriStatePanel(title: '악보가 없어요', message: '파일을 추가해 보세요'),
  // C26
  const DdiroriProgress(label: '가져오는 중'),
  // C28
  DdiroriMenuButton<String>(label: '자료 메뉴', itemBuilder: (_) => const [PopupMenuItem(value: 'open', child: Text('열기'))], onSelected: (_) {}),
  // C29
  DdiroriPopover(label: '설정', builder: (_) => const Text('보조 설명')),
  // C30
  Tooltip(message: '복사본 만들기', child: IconButton(icon: const Icon(Icons.copy), onPressed: () {})),
  // C31
  const DdiroriContainer(child: DdiroriStack(inline: true, children: [Text('자료')])),
  // C32
  DdiroriToolbar(label: '편집', children: [DdiroriButton(label: '저장', onPressed: () {})]),
  // C33
  const DdiroriPageHeader(title: '악보함', subtitle: '연습할 곡을 모아요'),
  // C34
  const DdiroriMetricGroup(metrics: [DdiroriMetricData(label: '악보', value: '12개')]),
  // C35
  const DdiroriProductSignature(product: DdiroriProduct.score, name: '띠로리 스코어', subtitle: '악보와 연습'),
  // C36
  DdiroriPageControls(page: 1, pageCount: 12, onPrevious: null, onNext: () {}),
  // C37
  DdiroriAnnotationTools(tool: 'pen', onToolChanged: (_) {}, color: const Color(0xFF111111), onColorChanged: (_) {}, width: 4, onWidthChanged: (_) {}),
  // C38
  DdiroriTransport(playing: false, onToggle: () {}, duration: const Duration(minutes: 3), onSeek: (_) {}),
  // C39
  const DdiroriTunerMeter(status: DdiroriTunerStatus.noSignal, note: 'A4'),
];
void overlayExamples(BuildContext context) {
  showDdiroriToast(context, message: '저장했어요');
  showDdiroriConfirmDialog(context: context, title: '삭제', message: '선택 자료를 삭제할까요?', confirmLabel: '삭제', danger: true);
}

// PAT-LIST: app-side display data; no PDF/repository types in common UI.
typedef ScoreRowView = ({String id, String title, String subtitle, bool available});
Widget scoreLibraryAdapter({
  required String query, required List<ScoreRowView> rows,
  required Set<String> selectedIds, required bool selecting,
  required bool loading, String? error,
  required ValueChanged<String> onQuery, required ValueChanged<String> onOpen,
  required void Function(String id, bool selected) onSelected,
  required VoidCallback onRetry,
}) => DdiroriStack(children: [
  DdiroriSearch(label: '악보 검색', value: query, onChanged: onQuery),
  if (loading) const DdiroriProgress(label: '악보를 불러오는 중')
  else if (error != null)
    DdiroriStatePanel(error: true, title: '악보를 불러오지 못했어요',
      message: error, action: DdiroriButton(label: '다시 시도', onPressed: onRetry))
  else if (rows.isEmpty)
    DdiroriStatePanel(title: query.isEmpty ? '악보가 없어요' : '검색 결과가 없어요',
      message: query.isEmpty ? '가져온 악보가 여기에 표시돼요' : '검색어를 바꿔 보세요')
  else DdiroriList(label: '악보', children: [
    for (final row in rows) DdiroriItem(key: ValueKey(row.id),
      title: row.title, subtitle: row.available ? row.subtitle : '파일을 찾을 수 없어요',
      flat: true, enabled: row.available, selecting: selecting,
      selected: selectedIds.contains(row.id), onTap: () => onOpen(row.id),
      onSelected: (selected) => onSelected(row.id, selected)),
  ]),
]);
