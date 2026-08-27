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

  test('recognizes common external PDF URI text forms', () {
    expect(isSheetExternalPdfUriText('https://example.invalid'), isTrue);
    expect(isSheetExternalPdfUriText('HTTPS://example.invalid'), isTrue);
    expect(isSheetExternalPdfUriText('mailto:player@example.invalid'), isTrue);
    expect(isSheetExternalPdfUriText('javascript:alert(1)'), isTrue);
    expect(isSheetExternalPdfUriText('tel:+15555550100'), isTrue);
    expect(isSheetExternalPdfUriText(' www.example.invalid/score '), isTrue);
    expect(isSheetExternalPdfUriText('//example.invalid/score'), isTrue);
    expect(isSheetExternalPdfUriText(''), isFalse);
    expect(isSheetExternalPdfUriText('#page=2'), isFalse);
    expect(isSheetExternalPdfUriText('relative/page.pdf'), isFalse);
  });

  test('blocks external URI-like links and ignores non-external URI actions', () {
    final protocolRelativeAction = resolveSheetPdfLinkTapAction(
      url: Uri.parse('//example.invalid/score'),
      hasDestination: false,
    );
    final relativeAction = resolveSheetPdfLinkTapAction(
      url: Uri.parse('#page=2'),
      hasDestination: false,
    );

    expect(protocolRelativeAction, SheetPdfLinkTapAction.blockExternalUrl);
    expect(relativeAction, SheetPdfLinkTapAction.ignore);
  });

  test('keeps internal destination links navigable', () {
    final action = resolveSheetPdfLinkTapAction(
      url: null,
      hasDestination: true,
    );

    expect(action, SheetPdfLinkTapAction.navigateInternalDestination);
  });

  test('ignores all embedded PDF links in performance mode', () {
    final externalAction = resolveSheetPdfLinkTapAction(
      url: Uri.parse('https://example.invalid'),
      hasDestination: true,
      isPerformanceMode: true,
    );
    final internalAction = resolveSheetPdfLinkTapAction(
      url: null,
      hasDestination: true,
      isPerformanceMode: true,
    );

    expect(externalAction, SheetPdfLinkTapAction.ignoreInPerformanceMode);
    expect(internalAction, SheetPdfLinkTapAction.ignoreInPerformanceMode);
  });

  test('ignores links without URL or internal destination', () {
    final action = resolveSheetPdfLinkTapAction(
      url: null,
      hasDestination: false,
    );

    expect(action, SheetPdfLinkTapAction.ignore);
  });
}
