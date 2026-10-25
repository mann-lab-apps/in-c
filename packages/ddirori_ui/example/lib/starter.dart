import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';

class DdiroriStarter extends StatefulWidget {
  const DdiroriStarter({super.key});
  @override
  State<DdiroriStarter> createState() => _StarterState();
}

class _StarterState extends State<DdiroriStarter> {
  bool dark = false, compact = false, fail = true, busy = false;
  String query = '', draft = '새 연습 기록', error = '';
  final items = ['평균율 클라비어곡집'];
  @override
  Widget build(BuildContext context) => MaterialApp(
    theme: ddiroriTheme(
      brightness: dark ? Brightness.dark : Brightness.light,
      density: compact ? DdiroriDensity.compact : DdiroriDensity.comfortable,
    ),
    home: Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text('도입 예제'),
            const Text('메모리 예제입니다. 첫 추가는 실패하며 앱 재시작 시 초기화됩니다.'),
            DdiroriButton(
              label: '테마 전환',
              onPressed: () => setState(() => dark = !dark),
            ),
            DdiroriButton(
              label: '밀도 전환',
              onPressed: () => setState(() => compact = !compact),
            ),
            DdiroriSearch(
              value: query,
              onChanged: (v) => setState(() => query = v),
            ),
            if (!items.any((v) => v.contains(query))) const Text('검색 결과 없음'),
            for (final item in items.where((v) => v.contains(query)))
              ListTile(title: Text(item)),
            DdiroriInput(
              label: '추가할 제목',
              value: draft,
              readOnly: busy,
              onChanged: (v) => setState(() => draft = v),
            ),
            if (error.isNotEmpty)
              DdiroriBanner(message: error, kind: DdiroriNoticeKind.error),
            DdiroriButton(
              label: error.isEmpty ? '예제 추가' : '다시 시도',
              busy: busy,
              onPressed: draft.trim().isEmpty
                  ? null
                  : () async {
                      setState(() => busy = true);
                      final value = draft.trim();
                      await Future<void>.delayed(
                        const Duration(milliseconds: 400),
                      );
                      if (!mounted) return;
                      setState(() {
                        busy = false;
                        if (fail) {
                          fail = false;
                          error = '예제 오류: 입력을 유지했습니다. 다시 시도해 주세요.';
                        } else {
                          items.add(value);
                          error = '';
                        }
                      });
                    },
            ),
          ],
        ),
      ),
    ),
  );
}
