import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_collaboration_invite_qr.dart';
import 'package:in_c_sheet/sheet_collaboration_session.dart';

void main() {
  testWidgets('collaboration QR view renders matrix and copy fallback action', (
    tester,
  ) async {
    var copied = false;
    final plan = SheetCollaborationInviteQrPlan.forInvite(
      _invite(sessionId: 'session-a'),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SheetCollaborationInviteQrView(
            plan: plan,
            onCopyFallback: () {
              copied = true;
            },
          ),
        ),
      ),
    );

    expect(find.text('초대 QR'), findsOneWidget);
    expect(_qrPaint, findsOneWidget);
    expect(find.textContaining('모듈'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, '코드 복사'), findsOneWidget);

    await tester.tap(find.widgetWithText(OutlinedButton, '코드 복사'));
    expect(copied, isTrue);
  });

  testWidgets('collaboration QR view shows selectable copy payload fallback', (
    tester,
  ) async {
    final invite = _invite(sessionId: 'session-${'x' * 950}');
    final plan = SheetCollaborationInviteQrPlan.forInvite(invite);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: SheetCollaborationInviteQrView(plan: plan)),
      ),
    );

    expect(find.text('초대 코드'), findsOneWidget);
    expect(_qrPaint, findsNothing);
    expect(find.byType(SelectableText), findsOneWidget);
    expect(find.textContaining('코드 복사'), findsOneWidget);
    expect(find.textContaining('session-'), findsOneWidget);
  });
}

final Finder _qrPaint = find.byWidgetPredicate(
  (widget) =>
      widget is CustomPaint &&
      widget.painter is SheetCollaborationInviteQrPainter,
);

SheetCollaborationInvite _invite({required String sessionId}) {
  final now = DateTime.utc(2026, 10, 13, 12);
  return SheetCollaborationInvite(
    sessionId: sessionId,
    leaderDeviceId: 'leader-a',
    setlistId: 'setlist-a',
    createdAt: now,
    expiresAt: now.add(const Duration(minutes: 5)),
  );
}
