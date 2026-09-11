import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

enum ClassicalLinkSurface { listening, reference, ticket }

LaunchMode preferredClassicalLaunchMode(
  Uri uri, {
  required ClassicalLinkSurface surface,
}) {
  if (surface == ClassicalLinkSurface.ticket) {
    return LaunchMode.externalApplication;
  }
  if (uri.scheme == 'http' || uri.scheme == 'https') {
    return LaunchMode.inAppWebView;
  }
  return LaunchMode.externalApplication;
}

Future<bool> launchClassicalUrl(
  BuildContext context,
  String value, {
  ClassicalLinkSurface surface = ClassicalLinkSurface.listening,
}) async {
  final uri = Uri.tryParse(value);
  if (uri == null || !uri.hasScheme) {
    return _showLaunchFailure(context);
  }

  final preferred = preferredClassicalLaunchMode(uri, surface: surface);
  if (await _tryLaunch(uri, preferred)) {
    return true;
  }

  if (preferred != LaunchMode.externalApplication &&
      await _tryLaunch(uri, LaunchMode.externalApplication)) {
    return true;
  }

  if (!context.mounted) {
    return false;
  }
  return _showLaunchFailure(context);
}

Future<bool> _tryLaunch(Uri uri, LaunchMode mode) async {
  try {
    return await launchUrl(
      uri,
      mode: mode,
      webViewConfiguration: const WebViewConfiguration(
        enableJavaScript: true,
        enableDomStorage: true,
      ),
      browserConfiguration: const BrowserConfiguration(showTitle: true),
    );
  } on Object {
    return false;
  }
}

bool _showLaunchFailure(BuildContext context) {
  if (context.mounted) {
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('링크를 열지 못했습니다.')));
  }
  return false;
}
