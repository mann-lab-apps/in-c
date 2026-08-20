enum SheetPdfLinkTapAction {
  blockExternalUrl,
  navigateInternalDestination,
  ignore,
}

SheetPdfLinkTapAction resolveSheetPdfLinkTapAction({
  required Uri? url,
  required bool hasDestination,
}) {
  if (url != null) {
    return SheetPdfLinkTapAction.blockExternalUrl;
  }
  if (hasDestination) {
    return SheetPdfLinkTapAction.navigateInternalDestination;
  }
  return SheetPdfLinkTapAction.ignore;
}
