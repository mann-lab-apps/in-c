import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

const _pageWidth = 612.0;
const _pageHeight = 792.0;
const _outputDir = 'test-fixtures/pdfs';

void main() async {
  final output = Directory(_outputDir);
  if (!output.existsSync()) {
    output.createSync(recursive: true);
  }

  _writePdf(
    File('${output.path}/short-score.pdf'),
    _buildDocument(
      title: 'Clef Short Score Fixture',
      pageCount: 3,
      includeWatermarkLink: false,
      complexScanLikeDrawing: false,
    ),
  );
  _writePdf(
    File('${output.path}/long-scan-like-score.pdf'),
    _buildDocument(
      title: 'Clef Long Scan-like Fixture',
      pageCount: 90,
      includeWatermarkLink: false,
      complexScanLikeDrawing: true,
    ),
  );
  _writePdf(
    File('${output.path}/link-annotation-score.pdf'),
    _buildDocument(
      title: 'Clef Link Annotation Fixture',
      pageCount: 3,
      includeWatermarkLink: true,
      complexScanLikeDrawing: false,
    ),
  );

  stdout.writeln('Generated PDF fixtures under ${output.path}');
}

List<int> _buildDocument({
  required String title,
  required int pageCount,
  required bool includeWatermarkLink,
  required bool complexScanLikeDrawing,
}) {
  final pdf = _PdfBuilder();
  final catalogId = pdf.reserve();
  final pagesId = pdf.reserve();
  final fontRegularId = pdf.add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  );
  final fontBoldId = pdf.add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  );
  final pageIds = <int>[];

  for (var index = 1; index <= pageCount; index++) {
    final contentId = pdf.addStream(
      _pageContent(
        title: title,
        pageNumber: index,
        pageCount: pageCount,
        includeWatermarkLink: includeWatermarkLink,
        complexScanLikeDrawing: complexScanLikeDrawing,
      ),
    );
    final annotationId = includeWatermarkLink && index == 1
        ? pdf.add(
            '<< /Type /Annot /Subtype /Link /Rect [410 34 560 62] '
            '/Border [0 0 1] /C [0 0.45 0.65] '
            '/A << /S /URI /URI (${_escapeText('https://camscanner.example.invalid/watermark-link')}) >> >>',
          )
        : null;
    final annotationEntry = annotationId == null
        ? ''
        : ' /Annots [$annotationId 0 R]';
    final pageId = pdf.add(
      '<< /Type /Page /Parent $pagesId 0 R /MediaBox [0 0 $_pageWidth $_pageHeight] '
      '/Resources << /Font << /F1 $fontRegularId 0 R /F2 $fontBoldId 0 R >> >> '
      '/Contents $contentId 0 R$annotationEntry >>',
    );
    pageIds.add(pageId);
  }

  pdf.set(
    pagesId,
    '<< /Type /Pages /Kids [${pageIds.map((id) => '$id 0 R').join(' ')}] /Count $pageCount >>',
  );
  pdf.set(catalogId, '<< /Type /Catalog /Pages $pagesId 0 R >>');
  return pdf.finish(catalogId: catalogId);
}

String _pageContent({
  required String title,
  required int pageNumber,
  required int pageCount,
  required bool includeWatermarkLink,
  required bool complexScanLikeDrawing,
}) {
  final b = StringBuffer()
    ..writeln('q')
    ..writeln('1 1 1 rg 0 0 $_pageWidth $_pageHeight re f')
    ..writeln('Q')
    ..writeln(_text(title, 54, 742, size: 18, font: 'F2'))
    ..writeln(
      _text(
        'Generated local fixture - no copyrighted source material',
        54,
        720,
        size: 10,
      ),
    )
    ..writeln(_text('Page $pageNumber of $pageCount', 466, 34, size: 10));

  if (complexScanLikeDrawing) {
    _drawScanLikeBackground(b, pageNumber);
  }

  _drawStaffSystem(b, top: 650, label: 'A');
  _drawStaffSystem(b, top: 510, label: 'B');
  _drawStaffSystem(b, top: 370, label: 'C');
  _drawMeasureBars(b, top: 650);
  _drawMeasureBars(b, top: 510);
  _drawMeasureBars(b, top: 370);
  _drawNotes(b, top: 650, offset: pageNumber % 5);
  _drawNotes(b, top: 510, offset: (pageNumber + 2) % 5);
  _drawNotes(b, top: 370, offset: (pageNumber + 4) % 5);

  if (includeWatermarkLink && pageNumber == 1) {
    b
      ..writeln('0.90 0.96 0.96 rg 390 24 188 54 re f')
      ..writeln('0.02 0.44 0.50 RG 390 24 188 54 re S')
      ..writeln(_text('LINK ANNOTATION AREA', 402, 56, size: 10, font: 'F2'))
      ..writeln(
        _text('tap target only - no watermark removal', 402, 42, size: 7),
      );
  }

  return b.toString();
}

void _drawStaffSystem(
  StringBuffer b, {
  required double top,
  required String label,
}) {
  b
    ..writeln('0 0 0 RG')
    ..writeln('0.8 w')
    ..writeln(_text(label, 38, top - 14, size: 12, font: 'F2'));
  for (var line = 0; line < 5; line++) {
    final y = top - (line * 10);
    b.writeln('54 $y m 558 $y l S');
  }
}

void _drawMeasureBars(StringBuffer b, {required double top}) {
  b.writeln('1.1 w');
  for (final x in <double>[164, 274, 384, 494, 558]) {
    b.writeln('$x $top m $x ${top - 40} l S');
  }
}

void _drawNotes(StringBuffer b, {required double top, required int offset}) {
  const xs = <double>[92, 124, 196, 232, 304, 338, 414, 450, 520];
  for (var i = 0; i < xs.length; i++) {
    final y = top - 6 - (((i + offset) % 5) * 7);
    b
      ..writeln('0 0 0 rg')
      ..writeln(
        '${xs[i] - 5} $y m ${xs[i]} ${y + 4} l ${xs[i] + 8} $y l ${xs[i]} ${y - 4} l h f',
      )
      ..writeln('${xs[i] + 5} ${y + 2} m ${xs[i] + 5} ${y + 40} l S');
  }
}

void _drawScanLikeBackground(StringBuffer b, int pageNumber) {
  final random = Random(pageNumber * 9973);
  b
    ..writeln('0.95 0.95 0.92 rg 42 84 528 628 re f')
    ..writeln('0.82 0.82 0.78 RG 42 84 528 628 re S')
    ..writeln('0.35 w');

  for (var i = 0; i < 180; i++) {
    final gray = 0.70 + random.nextDouble() * 0.20;
    final x1 = 54 + random.nextDouble() * 500;
    final y1 = 100 + random.nextDouble() * 590;
    final x2 = x1 + random.nextDouble() * 50 - 25;
    final y2 = y1 + random.nextDouble() * 50 - 25;
    b
      ..writeln(
        '${gray.toStringAsFixed(2)} ${gray.toStringAsFixed(2)} ${gray.toStringAsFixed(2)} RG',
      )
      ..writeln(
        '${x1.toStringAsFixed(1)} ${y1.toStringAsFixed(1)} m '
        '${x2.toStringAsFixed(1)} ${y2.toStringAsFixed(1)} l S',
      );
  }
}

String _text(
  String value,
  double x,
  double y, {
  double size = 12,
  String font = 'F1',
}) {
  return '0 0 0 rg BT /$font $size Tf $x $y Td (${_escapeText(value)}) Tj ET';
}

String _escapeText(String value) {
  return value
      .replaceAll(r'\', r'\\')
      .replaceAll('(', r'\(')
      .replaceAll(')', r'\)');
}

void _writePdf(File file, List<int> bytes) {
  file.writeAsBytesSync(bytes, flush: true);
  stdout.writeln('${file.path} (${bytes.length} bytes)');
}

class _PdfBuilder {
  final List<String?> _objects = <String?>[];

  int reserve() {
    _objects.add(null);
    return _objects.length;
  }

  int add(String object) {
    _objects.add(object);
    return _objects.length;
  }

  int addStream(String content) {
    final bytes = ascii.encode(content);
    return add('<< /Length ${bytes.length} >>\nstream\n$content\nendstream');
  }

  void set(int id, String object) {
    _objects[id - 1] = object;
  }

  List<int> finish({required int catalogId}) {
    final output = BytesBuilder();
    final offsets = <int>[0];
    output.add(ascii.encode('%PDF-1.7\n'));

    for (var i = 0; i < _objects.length; i++) {
      final object = _objects[i];
      if (object == null) {
        throw StateError('PDF object ${i + 1} was reserved but never set.');
      }
      offsets.add(output.length);
      output.add(ascii.encode('${i + 1} 0 obj\n$object\nendobj\n'));
    }

    final xrefOffset = output.length;
    output.add(ascii.encode('xref\n0 ${_objects.length + 1}\n'));
    output.add(ascii.encode('0000000000 65535 f\n'));
    for (final offset in offsets.skip(1)) {
      output.add(
        ascii.encode('${offset.toString().padLeft(10, '0')} 00000 n\n'),
      );
    }
    output.add(
      ascii.encode(
        'trailer\n<< /Size ${_objects.length + 1} /Root $catalogId 0 R >>\n'
        'startxref\n$xrefOffset\n%%EOF\n',
      ),
    );

    return output.takeBytes();
  }
}
