bool isClassicalSearchUrl(String url) {
  final uri = Uri.tryParse(url);
  if (uri == null) return false;
  final path = uri.path.toLowerCase();
  return path.contains('/search') ||
      path == '/results' ||
      uri.queryParameters.containsKey('search_query');
}

bool classicalProviderHostMatches(String platformId, String url) {
  final uri = Uri.tryParse(url);
  if (uri == null ||
      !const {'https', 'http'}.contains(uri.scheme) ||
      uri.userInfo.isNotEmpty ||
      uri.host.isEmpty) {
    return false;
  }
  final roots = switch (platformId) {
    'youtube' => const ['youtube.com', 'youtu.be'],
    'spotify' => const ['spotify.com'],
    'apple-music' => const ['music.apple.com'],
    'melon' => const ['melon.com'],
    _ => const <String>[],
  };
  final host = uri.host.toLowerCase();
  return roots.any((root) => host == root || host.endsWith('.$root'));
}

bool classicalProviderDirectMatches(String platformId, String url) {
  final uri = Uri.tryParse(url);
  if (uri == null || isClassicalSearchUrl(url)) return false;
  if (platformId == 'spotify' && uri.scheme == 'spotify') {
    final parts = uri.path.split(':');
    return !uri.hasAuthority &&
        !uri.hasQuery &&
        !uri.hasFragment &&
        parts.length == 2 &&
        const {'track', 'album', 'playlist'}.contains(parts[0]) &&
        RegExp(r'^[A-Za-z0-9]+$').hasMatch(parts[1]);
  }
  if (!classicalProviderHostMatches(platformId, url)) return false;
  final segments = uri.pathSegments.where((part) => part.isNotEmpty).toList();
  bool hasId(String name) => (uri.queryParameters[name] ?? '').isNotEmpty;
  return switch (platformId) {
    'youtube' =>
      uri.host == 'youtu.be'
          ? segments.length == 1
          : (uri.path == '/watch' && hasId('v')) ||
                (uri.path == '/playlist' && hasId('list')) ||
                (segments.length == 2 &&
                    const {'embed', 'shorts'}.contains(segments.first)),
    'spotify' =>
      segments.length >= 2 &&
          const {
            'track',
            'album',
            'playlist',
          }.contains(segments[segments.length - 2]),
    'apple-music' => segments.asMap().entries.any(
      (entry) =>
          const {
            'song',
            'album',
            'playlist',
            'music-video',
          }.contains(entry.value) &&
          entry.key < segments.length - 1,
    ),
    'melon' =>
      (uri.path == '/song/detail.htm' && hasId('songId')) ||
          (uri.path == '/album/detail.htm' && hasId('albumId')),
    _ => false,
  };
}
