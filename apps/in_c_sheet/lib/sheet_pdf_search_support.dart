class SheetPdfSearchSupport {
  const SheetPdfSearchSupport._();

  static const indexFormatVersion = 1;
  static const embeddedTextEngine = 'pdfrx.embeddedText';
  static const ocrUnsupportedEngine = 'ocr.unsupported';
  static const embeddedTextOnlyHelper = 'PDF 내부 텍스트가 있는 파일에서만 검색됩니다.';
  static const unsupportedTextSearchMessage = '이 PDF에서는 본문 텍스트 검색을 사용할 수 없습니다.';
  static const noResultStatus = '결과 없음 · 스캔 PDF는 텍스트가 없을 수 있습니다.';
  static const ocrUnsupportedHint = 'OCR은 v1 범위 밖입니다. 스캔 악보는 파일명/태그/북마크로 찾으세요.';
}

class SheetPdfSearchIndexManifest {
  const SheetPdfSearchIndexManifest({
    required this.version,
    required this.scoreId,
    required this.filePath,
    required this.engine,
    required this.pageCount,
    required this.indexedAt,
    this.requiresOcr = false,
    this.failureReason = '',
  });

  factory SheetPdfSearchIndexManifest.embeddedText({
    required String scoreId,
    required String filePath,
    required int pageCount,
    required DateTime indexedAt,
  }) {
    return SheetPdfSearchIndexManifest(
      version: SheetPdfSearchSupport.indexFormatVersion,
      scoreId: scoreId,
      filePath: filePath,
      engine: SheetPdfSearchSupport.embeddedTextEngine,
      pageCount: pageCount < 0 ? 0 : pageCount,
      indexedAt: indexedAt,
    );
  }

  factory SheetPdfSearchIndexManifest.ocrUnsupported({
    required String scoreId,
    required String filePath,
    required int pageCount,
    required DateTime indexedAt,
  }) {
    return SheetPdfSearchIndexManifest(
      version: SheetPdfSearchSupport.indexFormatVersion,
      scoreId: scoreId,
      filePath: filePath,
      engine: SheetPdfSearchSupport.ocrUnsupportedEngine,
      pageCount: pageCount < 0 ? 0 : pageCount,
      indexedAt: indexedAt,
      requiresOcr: true,
      failureReason: SheetPdfSearchSupport.ocrUnsupportedHint,
    );
  }

  factory SheetPdfSearchIndexManifest.fromJson(Map<String, Object?> json) {
    return SheetPdfSearchIndexManifest(
      version: _intFromJson(
        json['version'],
        fallback: SheetPdfSearchSupport.indexFormatVersion,
      ),
      scoreId: _stringFromJson(json['scoreId']),
      filePath: _stringFromJson(json['filePath']),
      engine: _stringFromJson(json['engine']).isEmpty
          ? SheetPdfSearchSupport.embeddedTextEngine
          : _stringFromJson(json['engine']),
      pageCount: _intFromJson(
        json['pageCount'],
        fallback: 0,
      ).clamp(0, 100000).toInt(),
      indexedAt:
          DateTime.tryParse(_stringFromJson(json['indexedAt'])) ??
          DateTime.fromMillisecondsSinceEpoch(0),
      requiresOcr: json['requiresOcr'] == true,
      failureReason: _stringFromJson(json['failureReason']),
    );
  }

  final int version;
  final String scoreId;
  final String filePath;
  final String engine;
  final int pageCount;
  final DateTime indexedAt;
  final bool requiresOcr;
  final String failureReason;

  bool get isEmbeddedTextIndex {
    return engine == SheetPdfSearchSupport.embeddedTextEngine && !requiresOcr;
  }

  bool get isOcrUnsupported {
    return engine == SheetPdfSearchSupport.ocrUnsupportedEngine && requiresOcr;
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'version': version,
      'scoreId': scoreId,
      'filePath': filePath,
      'engine': engine,
      'pageCount': pageCount,
      'indexedAt': indexedAt.toIso8601String(),
      'requiresOcr': requiresOcr,
      'failureReason': failureReason,
    };
  }
}

String _stringFromJson(Object? value) {
  return value?.toString().trim() ?? '';
}

int _intFromJson(Object? value, {required int fallback}) {
  if (value is int) {
    return value;
  }
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}
