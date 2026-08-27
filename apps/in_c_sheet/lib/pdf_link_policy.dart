enum SheetPdfLinkTapAction {
  blockExternalUrl,
  navigateInternalDestination,
  ignoreInPerformanceMode,
  ignore,
}

bool isSheetExternalPdfUriText(String? value) {
  final text = value?.trim();
  if (text == null || text.isEmpty) {
    return false;
  }

  final uri = Uri.tryParse(text);
  if (uri?.hasScheme == true) {
    return true;
  }

  final lowerText = text.toLowerCase();
  return lowerText.startsWith('www.') || lowerText.startsWith('//');
}

SheetPdfLinkTapAction resolveSheetPdfLinkTapAction({
  required Uri? url,
  required bool hasDestination,
  bool isPerformanceMode = false,
}) {
  if (isPerformanceMode) {
    return SheetPdfLinkTapAction.ignoreInPerformanceMode;
  }
  if (url != null && isSheetExternalPdfUriText(url.toString())) {
    return SheetPdfLinkTapAction.blockExternalUrl;
  }
  if (hasDestination) {
    return SheetPdfLinkTapAction.navigateInternalDestination;
  }
  return SheetPdfLinkTapAction.ignore;
}
