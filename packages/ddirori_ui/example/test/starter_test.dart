import 'package:ddirori_catalog/starter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('starter exposes failure, preserves draft and retries', (t) async {
    await t.pumpWidget(const DdiroriStarter());
    await t.tap(find.text('예제 추가'));
    await t.pumpAndSettle();
    expect(find.textContaining('예제 오류'), findsOneWidget);
    expect(find.text('새 연습 기록'), findsOneWidget);
    await t.tap(find.text('다시 시도'));
    await t.pumpAndSettle();
    expect(find.byType(ListTile), findsNWidgets(2));
  });
}
