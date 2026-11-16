import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'visibility.dart';

void main() {
  testWidgets('input and disabled layouts remain visible', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              TextField(decoration: InputDecoration(labelText: '검색')),
              ElevatedButton(onPressed: null, child: Text('비활성')),
              IgnorePointer(child: SizedBox(height: 48, child: Text('안내'))),
            ],
          ),
        ),
      ),
    );
    expect(
      visibleCaptureLayout(tester, find.byType(TextField)),
      findsOneWidget,
    );
    expect(visibleCaptureLayout(tester, find.text('비활성')), findsOneWidget);
    expect(visibleCaptureLayout(tester, find.text('안내')), findsOneWidget);
    expect(find.text('안내').hitTestable(), findsNothing);
  });
  testWidgets('offstage and below-viewport layouts are excluded', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: Column(
              children: [
                Offstage(child: Text('숨김')),
                SizedBox(height: 1200),
                Text('화면 밖'),
              ],
            ),
          ),
        ),
      ),
    );
    expect(visibleCaptureLayout(tester, find.text('숨김')), findsNothing);
    expect(visibleCaptureLayout(tester, find.text('화면 밖')), findsNothing);
  });
  testWidgets('modal continues to block action targets', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (_) => const AlertDialog(content: Text('대화상자')),
                ),
                child: const Text('열기'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    expect(find.text('열기').hitTestable(), findsNothing);
    expect(
      visibleCaptureLayout(tester, find.byType(AlertDialog)),
      findsOneWidget,
    );
  });
}
