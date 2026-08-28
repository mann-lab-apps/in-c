import 'dart:io';
import 'dart:typed_data';

import 'package:pdf_document/pdf_document.dart';

import 'pdf_link_policy.dart';

class SheetPdfLinkInfo {
  const SheetPdfLinkInfo({
    required this.pageNumber,
    required this.rect,
    required this.url,
  });

  final int pageNumber;
  final PdfRect rect;
  final Uri url;
}

class SheetPdfLinkInspection {
  const SheetPdfLinkInspection({
    required this.pageCount,
    required this.urlLinks,
    required this.internalLinkCount,
  });

  final int pageCount;
  final List<SheetPdfLinkInfo> urlLinks;
  final int internalLinkCount;

  int get urlLinkCount => urlLinks.length;
  int get totalLinkCount => urlLinks.length + internalLinkCount;
}

class SheetPdfLinkSanitizationResult {
  const SheetPdfLinkSanitizationResult({
    required this.inputPath,
    required this.outputPath,
    required this.pageCount,
    required this.originalUrlLinkCount,
    required this.removedUrlLinkCount,
    required this.remainingUrlLinkCount,
    required this.didWrite,
    this.failureReason,
  });

  final String inputPath;
  final String? outputPath;
  final int pageCount;
  final int originalUrlLinkCount;
  final int removedUrlLinkCount;
  final int remainingUrlLinkCount;
  final bool didWrite;
  final String? failureReason;

  bool get removedAllUrlLinks =>
      didWrite && originalUrlLinkCount > 0 && remainingUrlLinkCount == 0;
}

class SheetPdfLinkSanitizer {
  const SheetPdfLinkSanitizer._();

  static Future<SheetPdfLinkInspection> inspectFile(String path) async {
    return inspectBytes(await File(path).readAsBytes());
  }

  static SheetPdfLinkInspection inspectBytes(Uint8List bytes) {
    final document = PdfDocument.open(bytes);
    return _inspectDocument(document);
  }

  static Future<SheetPdfLinkSanitizationResult> createSanitizedCopy({
    required String inputPath,
    required String outputPath,
  }) async {
    final outputFile = File(outputPath);
    try {
      final inputFile = File(inputPath);
      if (!inputFile.existsSync()) {
        return SheetPdfLinkSanitizationResult(
          inputPath: inputPath,
          outputPath: null,
          pageCount: 0,
          originalUrlLinkCount: 0,
          removedUrlLinkCount: 0,
          remainingUrlLinkCount: 0,
          didWrite: false,
          failureReason: 'Input PDF does not exist.',
        );
      }
      final originalBytes = await inputFile.readAsBytes();
      if (!_looksLikePdf(originalBytes)) {
        return SheetPdfLinkSanitizationResult(
          inputPath: inputPath,
          outputPath: null,
          pageCount: 0,
          originalUrlLinkCount: 0,
          removedUrlLinkCount: 0,
          remainingUrlLinkCount: 0,
          didWrite: false,
          failureReason: 'Input file is not a readable PDF.',
        );
      }
      final document = PdfDocument.open(originalBytes);
      final before = _inspectDocument(document);
      if (before.urlLinks.isEmpty) {
        return SheetPdfLinkSanitizationResult(
          inputPath: inputPath,
          outputPath: null,
          pageCount: before.pageCount,
          originalUrlLinkCount: 0,
          removedUrlLinkCount: 0,
          remainingUrlLinkCount: 0,
          didWrite: false,
        );
      }

      final editor = PdfEditor(document);
      for (var pageIndex = 0; pageIndex < document.pageCount; pageIndex += 1) {
        final urlLinks = document
            .page(pageIndex)
            .annotations
            .whereType<PdfLinkAnnotation>()
            .where(_isUrlLink)
            .toList(growable: false);
        if (urlLinks.isNotEmpty) {
          editor.removeAnnotations(pageIndex, urlLinks);
        }
      }

      final sanitizedBytes = editor.save();
      await outputFile.parent.create(recursive: true);
      await outputFile.writeAsBytes(sanitizedBytes, flush: true);
      final after = inspectBytes(sanitizedBytes);
      if (after.pageCount != before.pageCount) {
        throw StateError(
          'Sanitized PDF page count changed from ${before.pageCount} '
          'to ${after.pageCount}.',
        );
      }
      final removedUrlLinkCount = before.urlLinkCount - after.urlLinkCount;
      return SheetPdfLinkSanitizationResult(
        inputPath: inputPath,
        outputPath: outputPath,
        pageCount: after.pageCount,
        originalUrlLinkCount: before.urlLinkCount,
        removedUrlLinkCount: removedUrlLinkCount < 0 ? 0 : removedUrlLinkCount,
        remainingUrlLinkCount: after.urlLinkCount,
        didWrite: true,
      );
    } catch (error) {
      await _deletePartialOutput(outputFile);
      return SheetPdfLinkSanitizationResult(
        inputPath: inputPath,
        outputPath: null,
        pageCount: 0,
        originalUrlLinkCount: 0,
        removedUrlLinkCount: 0,
        remainingUrlLinkCount: 0,
        didWrite: false,
        failureReason: error.toString(),
      );
    }
  }

  static SheetPdfLinkInspection _inspectDocument(PdfDocument document) {
    final urlLinks = <SheetPdfLinkInfo>[];
    var internalLinkCount = 0;
    for (var pageIndex = 0; pageIndex < document.pageCount; pageIndex += 1) {
      for (final annotation
          in document
              .page(pageIndex)
              .annotations
              .whereType<PdfLinkAnnotation>()) {
        final action = annotation.action;
        if (action is PdfUriAction) {
          final url = Uri.tryParse(action.uri);
          if (url != null && isSheetExternalPdfUriText(action.uri)) {
            urlLinks.add(
              SheetPdfLinkInfo(
                pageNumber: pageIndex + 1,
                rect: annotation.rect,
                url: url,
              ),
            );
          }
        } else if (action is PdfGoToAction) {
          internalLinkCount += 1;
        }
      }
    }
    return SheetPdfLinkInspection(
      pageCount: document.pageCount,
      urlLinks: List<SheetPdfLinkInfo>.unmodifiable(urlLinks),
      internalLinkCount: internalLinkCount,
    );
  }

  static bool _isUrlLink(PdfLinkAnnotation annotation) {
    final action = annotation.action;
    return action is PdfUriAction && isSheetExternalPdfUriText(action.uri);
  }

  static bool _looksLikePdf(Uint8List bytes) {
    if (bytes.length < 5) {
      return false;
    }
    final scanLength = bytes.length < 1024 ? bytes.length : 1024;
    for (var index = 0; index <= scanLength - 5; index += 1) {
      if (bytes[index] == 0x25 &&
          bytes[index + 1] == 0x50 &&
          bytes[index + 2] == 0x44 &&
          bytes[index + 3] == 0x46 &&
          bytes[index + 4] == 0x2d) {
        return true;
      }
    }
    return false;
  }

  static Future<void> _deletePartialOutput(File outputFile) async {
    try {
      if (await outputFile.exists()) {
        await outputFile.delete();
      }
    } catch (_) {
      // Best-effort cleanup only; preserve the sanitizer failure reason.
    }
  }
}
