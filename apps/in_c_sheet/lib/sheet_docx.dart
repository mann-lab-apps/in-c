import 'dart:convert';
import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:xml/xml.dart';

class SheetDocxDocument {
  const SheetDocxDocument({
    required this.text,
    this.title = '',
    this.creator = '',
  });

  final String text;
  final String title;
  final String creator;
}

class SheetDocxTextExtractor {
  const SheetDocxTextExtractor._();

  static const maxArchiveBytes = 16 * 1024 * 1024;
  static const maxExpandedBytes = 32 * 1024 * 1024;
  static const maxDocumentXmlBytes = 4 * 1024 * 1024;

  static SheetDocxDocument extract(Uint8List bytes) {
    if (bytes.isEmpty || bytes.length > maxArchiveBytes) {
      throw const FormatException('Invalid DOCX file size.');
    }

    late Archive archive;
    try {
      archive = ZipDecoder().decodeBytes(bytes, verify: true);
    } on Exception catch (error) {
      throw FormatException('Invalid DOCX archive: $error');
    }
    final expandedBytes = archive.files.fold<int>(
      0,
      (total, file) => total + file.size,
    );
    if (expandedBytes > maxExpandedBytes) {
      throw const FormatException('DOCX archive expands beyond the limit.');
    }

    final documentEntry = archive.findFile('word/document.xml');
    if (documentEntry == null ||
        !documentEntry.isFile ||
        documentEntry.size <= 0 ||
        documentEntry.size > maxDocumentXmlBytes) {
      throw const FormatException('DOCX document.xml is missing or invalid.');
    }

    final documentXml = _parseXml(documentEntry.content, 'document.xml');
    XmlElement? body;
    for (final element in documentXml.descendants.whereType<XmlElement>()) {
      if (element.localName == 'body') {
        body = element;
        break;
      }
    }
    final text = body == null ? '' : _blockTexts(body).join('\n').trim();
    if (text.isEmpty) {
      throw const FormatException('DOCX document has no readable text.');
    }

    var title = '';
    var creator = '';
    final coreEntry = archive.findFile('docProps/core.xml');
    if (coreEntry != null &&
        coreEntry.isFile &&
        coreEntry.size > 0 &&
        coreEntry.size <= maxDocumentXmlBytes) {
      try {
        final coreXml = _parseXml(coreEntry.content, 'core.xml');
        title = _firstElementText(coreXml, 'title');
        creator = _firstElementText(coreXml, 'creator');
      } on FormatException {
        // Optional core properties must not block readable score content.
      }
    }

    return SheetDocxDocument(text: text, title: title, creator: creator);
  }

  static XmlDocument _parseXml(List<int> bytes, String label) {
    try {
      return XmlDocument.parse(utf8.decode(bytes));
    } on Exception catch (error) {
      throw FormatException('Invalid DOCX $label: $error');
    }
  }

  static String _paragraphText(XmlElement paragraph) {
    final buffer = StringBuffer();
    for (final element in paragraph.descendants.whereType<XmlElement>()) {
      switch (element.localName) {
        case 't':
          buffer.write(element.innerText);
        case 'tab':
          buffer.write('\t');
        case 'br' || 'cr':
          buffer.write('\n');
      }
    }
    return buffer.toString().trimRight();
  }

  static Iterable<String> _blockTexts(XmlElement container) sync* {
    for (final child in container.children.whereType<XmlElement>()) {
      switch (child.localName) {
        case 'p':
          yield _paragraphText(child);
        case 'tbl':
          yield* _tableRows(child);
        default:
          yield* _blockTexts(child);
      }
    }
  }

  static Iterable<String> _tableRows(XmlElement table) sync* {
    final rows = table.descendants.whereType<XmlElement>().where(
      (element) =>
          element.localName == 'tr' &&
          identical(_nearestAncestor(element, 'tbl'), table),
    );
    for (final row in rows) {
      final cells = row.descendants.whereType<XmlElement>().where(
        (element) =>
            element.localName == 'tc' &&
            identical(_nearestAncestor(element, 'tr'), row),
      );
      final values = <String>[
        for (final cell in cells)
          _blockTexts(cell)
              .map((value) => value.trim())
              .where((value) => value.isNotEmpty)
              .join(' / '),
      ];
      if (values.any((value) => value.isNotEmpty)) {
        yield values.join('\t');
      }
    }
  }

  static XmlElement? _nearestAncestor(XmlElement element, String localName) {
    XmlElement? current = element.parentElement;
    while (current != null) {
      if (current.localName == localName) return current;
      current = current.parentElement;
    }
    return null;
  }

  static String _firstElementText(XmlDocument document, String localName) {
    for (final element in document.descendants.whereType<XmlElement>()) {
      if (element.localName == localName) {
        return element.innerText.trim();
      }
    }
    return '';
  }
}
