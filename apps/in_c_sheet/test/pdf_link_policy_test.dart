import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/pdf_link_policy.dart';

void main() {
  test('blocks URL links before any navigation behavior', () {
    final action = resolveSheetPdfLinkTapAction(
      url: Uri.parse('https://camscanner.example.invalid/watermark-link'),
      hasDestination: true,
    );

    expect(action, SheetPdfLinkTapAction.blockExternalUrl);
  });

  test('keeps internal destination links navigable', () {
    final action = resolveSheetPdfLinkTapAction(
      url: null,
      hasDestination: true,
    );

    expect(action, SheetPdfLinkTapAction.navigateInternalDestination);
  });

  test('ignores links without URL or internal destination', () {
    final action = resolveSheetPdfLinkTapAction(
      url: null,
      hasDestination: false,
    );

    expect(action, SheetPdfLinkTapAction.ignore);
  });
}
