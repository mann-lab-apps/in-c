import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_collaboration_lab.dart';
import 'package:in_c_sheet/sheet_score.dart';
import 'package:in_c_sheet/sheet_setlist.dart';

void main() {
  testWidgets('collaboration lab clearly stays a local developer tool', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: SheetCollaborationLabScreen(setlists: [], scores: []),
      ),
    );

    expect(find.text('협업 준비 실험'), findsOneWidget);
    expect(find.textContaining('실제 태블릿 연결이나 페이지 전송은 하지 않습니다'), findsOneWidget);
    expect(find.text('검증할 세트리스트를 먼저 만들어주세요.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('collaboration lab runs setlist disconnect and recovery', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 10, 20, 12);
    await tester.pumpWidget(
      MaterialApp(
        home: SheetCollaborationLabScreen(
          setlists: [
            _setlist(['score-a', 'score-b']),
          ],
          scores: [_score('score-a', 2), _score('score-b', 4)],
          now: () => now,
        ),
      ),
    );

    expect(find.text('팔로워 기기가 모든 악보를 갖고 있습니다.'), findsOneWidget);
    await tester.ensureVisible(find.text('로컬 시뮬레이션 시작'));
    await tester.tap(find.text('로컬 시뮬레이션 시작'));
    await tester.pumpAndSettle();

    expect(find.text('협업 시뮬레이션 결과'), findsWidgets);
    expect(find.text('리더: score-a 2쪽'), findsNWidgets(2));
    expect(find.text('리더: score-b 4쪽'), findsOneWidget);
    expect(find.text('연결 끊김 시뮬레이션'), findsOneWidget);
    expect(find.text('중간에 확인할 상태가 있었지만 마지막 상태는 동기화되었습니다.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('collaboration lab blocks a setlist with a missing score', (
    tester,
  ) async {
    final now = DateTime.utc(2026, 10, 20, 12);
    await tester.pumpWidget(
      MaterialApp(
        home: SheetCollaborationLabScreen(
          setlists: [
            _setlist(['score-a', 'missing']),
          ],
          scores: [_score('score-a', 1)],
          now: () => now,
        ),
      ),
    );

    expect(find.text('팔로워 기기에 없는 악보 1개'), findsNWidgets(2));
    final start = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, '로컬 시뮬레이션 시작'),
    );
    expect(start.onPressed, isNull);
    expect(tester.takeException(), isNull);
  });
}

SheetSetlist _setlist(List<String> scoreIds) {
  return SheetSetlist(
    id: 'setlist-a',
    title: 'Autumn Recital',
    scoreIds: scoreIds,
    createdAt: DateTime.utc(2026, 10, 20),
    updatedAt: DateTime.utc(2026, 10, 20),
  );
}

SheetScore _score(String id, int lastPage) {
  final now = DateTime.utc(2026, 10, 20);
  return SheetScore(
    id: id,
    title: id,
    composer: '',
    tags: const [],
    note: '',
    filePath: '/tmp/$id.pdf',
    importedAt: now,
    updatedAt: now,
    lastOpenedAt: null,
    lastPage: lastPage,
    isFavorite: false,
    bookmarks: const [],
  );
}
