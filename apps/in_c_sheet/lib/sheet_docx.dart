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
    final paragraphs = documentXml.descendants
        .whereType<XmlElement>()
        .where((element) => element.localName == 'p')
        .map(_paragraphText)
        .toList(growable: false);
    final text = paragraphs.join('\n').trim();
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

  static String _firstElementText(XmlDocument document, String localName) {
    for (final element in document.descendants.whereType<XmlElement>()) {
      if (element.localName == localName) {
        return element.innerText.trim();
      }
    }
    return '';
  }
}
