import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

import 'theme_recipes.dart';

void main() => runApp(const ThemeReferenceApp());

class ThemeReferenceApp extends StatefulWidget {
  const ThemeReferenceApp({
    super.key,
    this.brightness = Brightness.light,
    this.textScale = 1,
    this.touch = true,
    this.fontFamily,
  });
  final Brightness brightness;
  final double textScale;
  final bool touch;
  final String? fontFamily;
  @override
  State<ThemeReferenceApp> createState() => _ThemeReferenceAppState();
}

class _ThemeReferenceAppState extends State<ThemeReferenceApp> {
  late var brightness = widget.brightness;
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: ddiroriTheme(
      brightness: brightness,
      accent: 'violet',
      fontFamily: widget.fontFamily,
      touch: widget.touch,
    ),
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context)
          .copyWith(textScaler: TextScaler.linear(widget.textScale)),
      child: child!,
    ),
    home: ThemeReferencePage(
      onTheme: () => setState(
        () => brightness = brightness == Brightness.light
            ? Brightness.dark
            : Brightness.light,
      ),
    ),
  );
}

class ThemeReferencePage extends StatefulWidget {
  const ThemeReferencePage({super.key, required this.onTheme});
  final VoidCallback onTheme;
  @override
  State<ThemeReferencePage> createState() => _ThemeReferencePageState();
}

class _ThemeReferencePageState extends State<ThemeReferencePage> {
  var saved = false;
  var value = '연습 구간 A';
  var secondSaved = false;
  var displayName = '';
  var mode = <String>{'bar'};
  String? error;
  var message = '목록 열기와 저장은 서로 독립된 동작이에요.';
  @override
  Widget build(BuildContext context) {
    final c = DdiroriStyle.of(context);
    final gap = DdiroriTokens.spacing['lg']!;
    Widget description(String text) => Text(
      text,
      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: c['muted']),
    );
    Widget section(String title, String detail, Widget child) => DdiroriStack(
      gap: gap,
      children: [
        const Divider(),
        Semantics(
          header: true,
          child: Text(title, style: Theme.of(context).textTheme.titleMedium),
        ),
        description(detail),
        child,
      ],
    );
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: DdiroriContainer(
            child: DdiroriStack(
              gap: DdiroriTokens.layout['sectionGapWide']!,
              children: [
                DdiroriStack(
                  inline: true,
                  children: [
                    const DdiroriMark(size: 32),
                    Text(
                      '띠로리 · 디자인 시스템',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    DdiroriButton(
                      label: '테마 전환',
                      kind: DdiroriButtonKind.quiet,
                      onPressed: widget.onTheme,
                    ),
                  ],
                ),
                Semantics(
                  header: true,
                  child: Text(
                    '화면은 자유롭게, 문법은 같게.',
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                ),
                description(
                  '서비스의 화면 구조는 각자 설계해요. 이 예제는 공통 컴포넌트와 로컬 조합의 기준입니다. 바이올렛은 비교 후보이며 대표색은 미확정입니다.',
                ),
                section(
                  '01 / 내용부터 읽히게',
                  '평평한 행 · 제목 16/600 · 설명 14/400 · 독립된 저장 동작',
                  Column(
                    children: [
                      ExcerptRowExample(
                        title: '프렐류드 · 첫 번째 구간',
                        detail: '피아노 · 1–8마디',
                        saved: saved,
                        onOpen: () => setState(
                          () => message = '구간 열기를 요청했어요. 실제 문서는 열지 않는 예제입니다.',
                        ),
                        onSave: () => setState(() {
                          saved = !saved;
                          message = saved ? '저장했어요.' : '저장을 해제했어요.';
                        }),
                      ),
                      ExcerptRowExample(
                        title: '아주 긴 작품명과 편성, 연습 구간이 함께 표시되어도 제목은 자연스럽게 줄바꿈해요',
                        detail: '현악 사중주 · 16–32마디',
                        saved: secondSaved,
                        onOpen: () =>
                            setState(() => message = '두 번째 구간 열기를 요청했어요.'),
                        onSave: () => setState(() {
                          secondSaved = !secondSaved;
                          message = secondSaved
                              ? '두 번째 항목을 저장했어요.'
                              : '두 번째 항목 저장을 해제했어요.';
                        }),
                      ),
                      ExcerptRowExample(
                        title: '준비 중인 구간',
                        detail: '현재 열 수 없어요',
                        saved: false,
                        enabled: false,
                        onOpen: () {},
                        onSave: () {},
                      ),
                      Semantics(
                        liveRegion: true,
                        child: Padding(
                          padding: EdgeInsets.all(gap),
                          child: description(message),
                        ),
                      ),
                    ],
                  ),
                ),
                section(
                  '02 / 작업 도구도 같은 테마로',
                  '속성 그룹만 컴팩트하게 · 터치 영역은 유지',
                  Theme(
                    data: ddiroriTheme(
                      brightness: Theme.of(context).brightness,
                      accent: 'violet',
                      density: DdiroriDensity.compact,
                      fontFamily: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.fontFamily,
                      touch: c.touch,
                    ),
                    child: PropertyGroupExample(
                      title: '구간 속성',
                      value: value,
                      mode: mode,
                      error: error,
                      onValue: (v) => setState(() {
                        value = v;
                        error = null;
                      }),
                      onMode: (v) => setState(() => mode = v),
                      onApply: () => setState(
                        () =>
                            error = value.trim().isEmpty ? '이름을 입력해주세요.' : null,
                      ),
                    ),
                  ),
                ),
                section(
                  '03 / 색만으로 구분하지 않기',
                  '선택은 체크 · 오류는 문장 · 포커스는 윤곽',
                  DdiroriStack(
                    gap: gap,
                    children: [
                      DdiroriStack(
                        inline: true,
                        children: [
                          DdiroriButton(
                            label: '주요 동작',
                            onPressed: () =>
                                setState(() => message = '주요 동작 예제'),
                          ),
                          DdiroriButton(
                            label: '보조 동작',
                            kind: DdiroriButtonKind.secondary,
                            onPressed: () =>
                                setState(() => message = '보조 동작 예제'),
                          ),
                          const DdiroriButton(label: '사용 불가'),
                        ],
                      ),
                      DdiroriInput(
                        label: '표시 이름',
                        value: displayName,
                        onChanged: (v) => setState(() => displayName = v),
                        error: displayName.isEmpty ? '표시할 이름을 입력해주세요.' : null,
                      ),
                      Text(
                        '12:48 · 120 BPM',
                        style: ddiroriTextStyle(DdiroriTextRole.numeric),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
