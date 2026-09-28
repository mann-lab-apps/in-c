class SheetSetlistShareManifest {
  const SheetSetlistShareManifest({
    required this.title,
    required this.expectedScoreCount,
    required this.items,
    this.totalDurationLabel = '',
    this.transitionLabel = '',
    this.warnings = const <String>[],
  });

  final String title;
  final int expectedScoreCount;
  final String totalDurationLabel;
  final String transitionLabel;
  final List<SheetSetlistShareItem> items;
  final List<String> warnings;

  bool get hasCountMismatch => expectedScoreCount != items.length;

  bool get canPreviewImport {
    return title.trim().isNotEmpty && items.isNotEmpty && !hasCountMismatch;
  }

  static SheetSetlistShareManifest? tryParse(String text) {
    final lines = text.replaceAll('\r\n', '\n').split('\n');
    final firstContent = lines
        .map((line) => line.trim())
        .firstWhere((line) => line.isNotEmpty, orElse: () => '');
    if (firstContent != 'Clef & Staff 세트리스트') {
      return null;
    }

    var title = '';
    var expectedCount = 0;
    var totalDurationLabel = '';
    var transitionLabel = '';
    final items = <SheetSetlistShareItem>[];
    final warnings = <String>[];
    var currentDetails = <String, String>{};
    String? currentTitle;

    void flushCurrentItem() {
      final itemTitle = currentTitle?.trim();
      if (itemTitle == null || itemTitle.isEmpty) {
        return;
      }
      items.add(
        SheetSetlistShareItem(
          title: itemTitle,
          details: Map<String, String>.unmodifiable(currentDetails),
        ),
      );
      currentTitle = null;
      currentDetails = <String, String>{};
    }

    for (final rawLine in lines.skip(1)) {
      final line = rawLine.trimRight();
      final trimmed = line.trim();
      if (trimmed.isEmpty) {
        continue;
      }
      final itemMatch = RegExp(r'^(\d+)\.\s+(.+)$').firstMatch(trimmed);
      if (itemMatch != null) {
        flushCurrentItem();
        currentTitle = itemMatch.group(2)?.trim() ?? '';
        continue;
      }
      if (currentTitle != null && rawLine.startsWith('   ')) {
        final separator = trimmed.indexOf(':');
        if (separator <= 0) {
          warnings.add('읽을 수 없는 항목 세부 정보: $trimmed');
          continue;
        }
        final key = trimmed.substring(0, separator).trim();
        final value = trimmed.substring(separator + 1).trim();
        if (key.isNotEmpty && value.isNotEmpty) {
          currentDetails[key] = value;
        }
        continue;
      }
      if (trimmed.startsWith('제목:')) {
        title = trimmed.substring('제목:'.length).trim();
        continue;
      }
      if (trimmed.startsWith('곡 수:')) {
        final countMatch = RegExp(r'곡 수:\s*(\d+)곡').firstMatch(trimmed);
        expectedCount = int.tryParse(countMatch?.group(1) ?? '') ?? 0;
        final durationMatch = RegExp(r'총\s+(.+)$').firstMatch(trimmed);
        totalDurationLabel = durationMatch?.group(1)?.trim() ?? '';
        continue;
      }
      if (trimmed.startsWith('전환 ')) {
        transitionLabel = trimmed.substring('전환 '.length).trim();
        continue;
      }
      warnings.add('읽을 수 없는 줄: $trimmed');
    }
    flushCurrentItem();

    if (title.isEmpty) {
      warnings.add('세트리스트 제목이 없습니다.');
    }
    if (expectedCount != items.length) {
      warnings.add('곡 수와 항목 수가 다릅니다.');
    }
    return SheetSetlistShareManifest(
      title: title,
      expectedScoreCount: expectedCount,
      totalDurationLabel: totalDurationLabel,
      transitionLabel: transitionLabel,
      items: List<SheetSetlistShareItem>.unmodifiable(items),
      warnings: List<String>.unmodifiable(warnings),
    );
  }
}

class SheetSetlistShareItem {
  const SheetSetlistShareItem({required this.title, required this.details});

  final String title;
  final Map<String, String> details;

  String get fileName => details['파일'] ?? '';
  String get composer => details['작곡가'] ?? '';
  String get startPageLabel => details['시작'] ?? '';
  String get setlistNote => details['세트 메모'] ?? '';
}
