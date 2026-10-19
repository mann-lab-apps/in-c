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
  static const maxNumberingXmlBytes = 1024 * 1024;

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
    final listState = _DocxListState(_readNumberingCatalog(archive));
    final text = body == null
        ? ''
        : _blockTexts(body, listState).join('\n').trim();
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

  static _DocxNumberingCatalog? _readNumberingCatalog(Archive archive) {
    final entry = archive.findFile('word/numbering.xml');
    if (entry == null ||
        !entry.isFile ||
        entry.size <= 0 ||
        entry.size > maxNumberingXmlBytes) {
      return null;
    }
    try {
      return _DocxNumberingCatalog.parse(
        _parseXml(entry.content, 'numbering.xml'),
      );
    } on FormatException {
      // Broken optional numbering must not hide otherwise readable content.
      return null;
    }
  }

  static String _paragraphText(XmlElement paragraph, _DocxListState listState) {
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
    final text = buffer.toString().trimRight();
    if (text.isEmpty) return text;
    final prefix = listState.prefixFor(paragraph);
    return prefix == null ? text : '$prefix$text';
  }

  static Iterable<String> _blockTexts(
    XmlElement container,
    _DocxListState listState,
  ) sync* {
    for (final child in container.children.whereType<XmlElement>()) {
      switch (child.localName) {
        case 'p':
          yield _paragraphText(child, listState);
        case 'tbl':
          yield* _tableRows(child, listState);
        default:
          yield* _blockTexts(child, listState);
      }
    }
  }

  static Iterable<String> _tableRows(
    XmlElement table,
    _DocxListState listState,
  ) sync* {
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
          _blockTexts(cell, listState)
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

class _DocxNumberingCatalog {
  const _DocxNumberingCatalog({
    required this.abstractIdByNumId,
    required this.levelsByAbstractId,
  });

  factory _DocxNumberingCatalog.parse(XmlDocument document) {
    final levelsByAbstractId = <String, Map<int, _DocxNumberingLevel>>{};
    for (final abstract in document.descendants.whereType<XmlElement>().where(
      (element) => element.localName == 'abstractNum',
    )) {
      final abstractId = _attributeValue(abstract, 'abstractNumId');
      if (abstractId == null || abstractId.isEmpty) continue;
      final levels = <int, _DocxNumberingLevel>{};
      for (final levelElement
          in abstract.descendants.whereType<XmlElement>().where(
            (element) =>
                element.localName == 'lvl' &&
                identical(
                  SheetDocxTextExtractor._nearestAncestor(
                    element,
                    'abstractNum',
                  ),
                  abstract,
                ),
          )) {
        final level = int.tryParse(_attributeValue(levelElement, 'ilvl') ?? '');
        if (level == null || level < 0 || level > 8) continue;
        final formatElement = _firstDescendant(levelElement, 'numFmt');
        final textElement = _firstDescendant(levelElement, 'lvlText');
        final startElement = _firstDescendant(levelElement, 'start');
        levels[level] = _DocxNumberingLevel(
          format: _attributeValue(formatElement, 'val') ?? 'decimal',
          text: _attributeValue(textElement, 'val') ?? '',
          start: int.tryParse(_attributeValue(startElement, 'val') ?? '') ?? 1,
        );
      }
      if (levels.isNotEmpty) levelsByAbstractId[abstractId] = levels;
    }

    final abstractIdByNumId = <String, String>{};
    for (final number in document.descendants.whereType<XmlElement>().where(
      (element) => element.localName == 'num',
    )) {
      final numId = _attributeValue(number, 'numId');
      final abstractIdElement = _firstDescendant(number, 'abstractNumId');
      final abstractId = _attributeValue(abstractIdElement, 'val');
      if (numId != null &&
          numId.isNotEmpty &&
          abstractId != null &&
          levelsByAbstractId.containsKey(abstractId)) {
        abstractIdByNumId[numId] = abstractId;
      }
    }
    return _DocxNumberingCatalog(
      abstractIdByNumId: abstractIdByNumId,
      levelsByAbstractId: levelsByAbstractId,
    );
  }

  final Map<String, String> abstractIdByNumId;
  final Map<String, Map<int, _DocxNumberingLevel>> levelsByAbstractId;

  _DocxNumberingLevel? levelFor(String numId, int level) {
    final abstractId = abstractIdByNumId[numId];
    return abstractId == null ? null : levelsByAbstractId[abstractId]?[level];
  }
}

class _DocxNumberingLevel {
  const _DocxNumberingLevel({
    required this.format,
    required this.text,
    required this.start,
  });

  final String format;
  final String text;
  final int start;
}

class _DocxListState {
  _DocxListState(this.catalog);

  final _DocxNumberingCatalog? catalog;
  final Map<String, Map<int, int>> _counters = {};

  String? prefixFor(XmlElement paragraph) {
    final numbering = catalog;
    if (numbering == null) return null;
    final properties = _directChild(paragraph, 'pPr');
    final numberProperties = _directChild(properties, 'numPr');
    final numId = _attributeValue(
      _directChild(numberProperties, 'numId'),
      'val',
    );
    if (numId == null || numId.isEmpty || numId == '0') return null;
    final level =
        int.tryParse(
          _attributeValue(_directChild(numberProperties, 'ilvl'), 'val') ?? '0',
        ) ??
        0;
    final definition = numbering.levelFor(numId, level);
    if (definition == null) return null;

    final counters = _counters.putIfAbsent(numId, () => <int, int>{});
    counters.removeWhere((key, _) => key > level);
    counters[level] = (counters[level] ?? (definition.start - 1)) + 1;

    var marker = definition.text;
    if (marker.isEmpty) {
      marker = definition.format == 'bullet' ? '•' : '%${level + 1}.';
    }
    for (var index = 0; index < 9; index += 1) {
      final placeholder = '%${index + 1}';
      if (!marker.contains(placeholder)) continue;
      final levelDefinition = numbering.levelFor(numId, index);
      final value = counters[index] ?? levelDefinition?.start ?? 1;
      marker = marker.replaceAll(
        placeholder,
        _formatNumber(value, levelDefinition?.format ?? 'decimal'),
      );
    }
    if (marker.isEmpty) return null;
    return '${'  ' * level}$marker ';
  }

  static String _formatNumber(int value, String format) {
    return switch (format) {
      'lowerLetter' => _letters(value).toLowerCase(),
      'upperLetter' => _letters(value),
      'lowerRoman' => _roman(value).toLowerCase(),
      'upperRoman' => _roman(value),
      _ => '$value',
    };
  }

  static String _letters(int value) {
    if (value <= 0) return '$value';
    final result = StringBuffer();
    var remaining = value;
    while (remaining > 0) {
      remaining -= 1;
      result.writeCharCode(65 + (remaining % 26));
      remaining ~/= 26;
    }
    return result.toString().split('').reversed.join();
  }

  static String _roman(int value) {
    if (value <= 0 || value > 3999) return '$value';
    const values = <int>[1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const numerals = <String>[
      'M',
      'CM',
      'D',
      'CD',
      'C',
      'XC',
      'L',
      'XL',
      'X',
      'IX',
      'V',
      'IV',
      'I',
    ];
    final result = StringBuffer();
    var remaining = value;
    for (var index = 0; index < values.length; index += 1) {
      while (remaining >= values[index]) {
        result.write(numerals[index]);
        remaining -= values[index];
      }
    }
    return result.toString();
  }
}

XmlElement? _directChild(XmlElement? element, String localName) {
  if (element == null) return null;
  for (final child in element.children.whereType<XmlElement>()) {
    if (child.localName == localName) return child;
  }
  return null;
}

XmlElement? _firstDescendant(XmlElement element, String localName) {
  for (final child in element.descendants.whereType<XmlElement>()) {
    if (child.localName == localName) return child;
  }
  return null;
}

String? _attributeValue(XmlElement? element, String localName) {
  if (element == null) return null;
  for (final attribute in element.attributes) {
    if (attribute.localName == localName) return attribute.value;
  }
  return null;
}
