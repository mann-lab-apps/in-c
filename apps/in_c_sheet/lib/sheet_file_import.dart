import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

class SheetImportedFile {
  const SheetImportedFile({
    required this.name,
    required this.bytes,
    this.mimeType,
  });

  final String name;
  final Uint8List bytes;
  final String? mimeType;
}

class SheetFileImportPolicy {
  const SheetFileImportPolicy._();

  static const pdfExtensions = <String>{'pdf'};
  static const imageExtensions = <String>{'jpg', 'jpeg', 'png'};
  static const unsupportedImageExtensions = <String>{'heic', 'heif'};

  static bool isPdfFileName(String name) {
    return pdfExtensions.contains(extensionOf(name));
  }

  static bool isSupportedImageFileName(String name) {
    return imageExtensions.contains(extensionOf(name));
  }

  static bool isKnownButUnsupportedImageFileName(String name) {
    return unsupportedImageExtensions.contains(extensionOf(name));
  }

  static String extensionOf(String name) {
    final normalized = name.trim().toLowerCase();
    final dot = normalized.lastIndexOf('.');
    if (dot == -1 || dot == normalized.length - 1) {
      return '';
    }
    return normalized.substring(dot + 1);
  }

  static String titleFromFileName(String name) {
    final withoutExtension = name.replaceFirst(RegExp(r'\.[^.]+$'), '');
    final withoutScannerNoise = withoutExtension
        .replaceAll(
          RegExp(r'(camscanner|scanned|scan|document)', caseSensitive: false),
          ' ',
        )
        .replaceAll(RegExp(r'\b20\d{2}[-_.]?\d{2}[-_.]?\d{2}\b'), ' ')
        .replaceAll(RegExp(r'\d{8}[_-]?\d{4,6}'), ' ');
    final normalized = withoutScannerNoise
        .replaceAll(RegExp(r'[_-]+'), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    return normalized.isEmpty ? 'Untitled score' : normalized;
  }

  static String imageBundleTitle(List<SheetImportedFile> files) {
    if (files.isEmpty) {
      return 'Scanned score';
    }
    final firstTitle = titleFromFileName(files.first.name);
    if (files.length == 1) {
      return firstTitle;
    }
    return '$firstTitle 외 ${files.length - 1}장';
  }

  static String safeFileName(String name, {String fallback = 'score.pdf'}) {
    final sanitized = name
        .replaceAll(RegExp(r'[/\\:*?"<>|]+'), '-')
        .replaceAll(RegExp(r'\s+'), '-')
        .replaceAll(RegExp(r'[^A-Za-z0-9가-힣._-]+'), '-');
    final collapsed = sanitized.replaceAll(RegExp(r'-+'), '-').trim();
    final trimmed = collapsed.replaceAll(RegExp(r'^[-.]+|[-.]+$'), '');
    return trimmed.isEmpty ? fallback : trimmed;
  }

  static String exportPdfFileName({
    required String title,
    String composer = '',
  }) {
    final parts = <String>[
      if (composer.trim().isNotEmpty) composer.trim(),
      title.trim().isEmpty ? 'Untitled score' : title.trim(),
    ];
    final base = safeFileName(parts.join(' - '), fallback: 'score');
    return base.toLowerCase().endsWith('.pdf') ? base : '$base.pdf';
  }
}

class SheetImagePdfConverter {
  const SheetImagePdfConverter._();

  static Future<Uint8List> convertImagesToPdf(
    List<SheetImportedFile> images,
  ) async {
    if (images.isEmpty) {
      throw const FormatException('No images selected.');
    }

    final document = pw.Document();
    for (final image in images) {
      if (!SheetFileImportPolicy.isSupportedImageFileName(image.name)) {
        throw FormatException('Unsupported image type: ${image.name}');
      }
      final pageImage = pw.MemoryImage(image.bytes);
      document.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(18),
          build: (context) => pw.Container(
            color: PdfColors.white,
            alignment: pw.Alignment.center,
            child: pw.Image(pageImage, fit: pw.BoxFit.contain),
          ),
        ),
      );
    }
    return document.save();
  }
}

class SheetScoreSharePolicy {
  const SheetScoreSharePolicy._();

  static String exportFileName({required String title, String composer = ''}) {
    return SheetFileImportPolicy.exportPdfFileName(
      title: title,
      composer: composer,
    );
  }
}
