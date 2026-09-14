import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import 'classical_discovery_models.dart';
import 'classical_link_policy.dart';

enum ClassicalLinkSurface { listening, reference, ticket }

LaunchMode preferredClassicalLaunchMode(
  Uri uri, {
  required ClassicalLinkSurface surface,
  bool verifiedDirect = false,
}) {
  if (surface == ClassicalLinkSurface.ticket || verifiedDirect) {
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
  bool verifiedDirect = false,
  bool showFailure = true,
}) async {
  if (!context.mounted) return false;
  final uri = Uri.tryParse(value);
  if (uri == null ||
      (!const {'https', 'http'}.contains(uri.scheme) &&
          !classicalProviderDirectMatches('spotify', value)) ||
      uri.userInfo.isNotEmpty) {
    return showFailure ? _showLaunchFailure(context) : false;
  }

  final preferred = preferredClassicalLaunchMode(
    uri,
    surface: surface,
    verifiedDirect: verifiedDirect,
  );
  if (await _tryLaunch(uri, preferred)) {
    return true;
  }

  if (context.mounted &&
      preferred != LaunchMode.externalApplication &&
      await _tryLaunch(uri, LaunchMode.externalApplication)) {
    return true;
  }

  if (!context.mounted) {
    return false;
  }
  return showFailure ? _showLaunchFailure(context) : false;
}

Future<bool> launchClassicalWorkLink(
  BuildContext context,
  ClassicalWork work,
  ExternalLink selected, {
  required Future<void> Function(ExternalLink link, bool fallback) onAttempt,
}) async {
  final searches = work.externalLinks
      .where((link) => link.isSafeSearch && link.url != selected.url)
      .toList();
  int priority(ExternalLink link) => link.platformId == selected.platformId
      ? 0
      : link.platformId == 'youtube'
      ? 1
      : 2;
  searches.sort((a, b) {
    final order = priority(a).compareTo(priority(b));
    return order != 0 ? order : a.id.compareTo(b.id);
  });
  // One automatic recovery only; never cycle through all of a user's music apps.
  final candidates = [selected, ...searches.take(1)];
  for (var index = 0; index < candidates.length; index++) {
    if (!context.mounted) return false;
    final link = candidates[index];
    if (!link.isVerifiedDirect && !link.isSafeSearch) continue;
    await onAttempt(link, index > 0);
    if (!context.mounted) return false;
    if (await launchClassicalUrl(
      context,
      link.url,
      verifiedDirect: link.isVerifiedDirect,
      showFailure: false,
    )) {
      return true;
    }
  }
  if (!context.mounted) return false;
  final messenger = ScaffoldMessenger.of(context);
  messenger.showSnackBar(
    SnackBar(
      content: const Text('음악 서비스를 열지 못했어요.'),
      action: SnackBarAction(
        label: '검색어 복사',
        onPressed: () async {
          try {
            await Clipboard.setData(
              ClipboardData(
                text:
                    '${work.composerNameOriginal} ${work.titleOriginal} ${work.catalogNumber}'
                        .trim(),
              ),
            );
            if (messenger.mounted) {
              messenger.showSnackBar(
                const SnackBar(content: Text('작품 검색어를 복사했어요.')),
              );
            }
          } catch (_) {
            if (messenger.mounted) {
              messenger.showSnackBar(
                const SnackBar(content: Text('검색어를 복사하지 못했어요.')),
              );
            }
          }
        },
      ),
    ),
  );
  return false;
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
