import 'package:classical_community/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('community feed shows posts and sponsored events', (
    tester,
  ) async {
    final controller = CommunityController.seeded();
    await tester.pumpWidget(ClassicalCommunityApp(controller: controller));

    expect(find.text('in C Community'), findsOneWidget);
    expect(find.text('지금 이야기 중'), findsOneWidget);
    expect(find.text('Sponsored 포함'), findsOneWidget);
    expect(find.text('바흐 첼로 프렐류드, 첫 30초만 같이 들어요'), findsOneWidget);

    controller.dispose();
  });

  testWidgets('composer adds a local community post', (tester) async {
    final controller = CommunityController.seeded();
    await tester.pumpWidget(ClassicalCommunityApp(controller: controller));

    await tester.tap(find.text('글쓰기').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), '현악이 들어오는 순간이 좋았어요.');
    await tester.tap(find.text('올리기'));
    await tester.pumpAndSettle();

    expect(find.text('현악이 들어오는 순간이 좋았어요.'), findsOneWidget);
    expect(controller.localPostCount, 1);

    controller.dispose();
  });

  testWidgets('events tab saves a sponsored event', (tester) async {
    final controller = CommunityController.seeded();
    await tester.pumpWidget(ClassicalCommunityApp(controller: controller));

    await tester.tap(find.text('Events'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('저장').first);
    await tester.pumpAndSettle();

    expect(find.text('저장됨'), findsOneWidget);

    controller.dispose();
  });
}
