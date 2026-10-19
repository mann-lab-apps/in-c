import 'dart:typed_data';

import 'package:archive/archive.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_docx.dart';

void main() {
  test('extracts DOCX paragraphs, tabs, breaks and core metadata', () {
    final document = SheetDocxTextExtractor.extract(
      _docxBytes(
        documentXml: '''
<w:document xmlns:w="urn:word">
  <w:body>
    <w:p><w:r><w:t>첫 문장</w:t></w:r></w:p>
    <w:p><w:r><w:t>둘째</w:t><w:tab/><w:t>마디</w:t><w:br/><w:t>계속</w:t></w:r></w:p>
  </w:body>
</w:document>
''',
        coreXml: '''
<cp:coreProperties xmlns:cp="urn:core" xmlns:dc="urn:dc">
  <dc:title>Autumn Notes</dc:title>
  <dc:creator>Kim</dc:creator>
</cp:coreProperties>
''',
      ),
    );

    expect(document.text, '첫 문장\n둘째\t마디\n계속');
    expect(document.title, 'Autumn Notes');
    expect(document.creator, 'Kim');
  });

  test('ignores malformed optional core metadata', () {
    final document = SheetDocxTextExtractor.extract(
      _docxBytes(
        documentXml: '<w:document xmlns:w="urn:word"><w:body><w:p><w:r><w:t>Music</w:t></w:r></w:p></w:body></w:document>',
        coreXml: '<broken',
      ),
    );

    expect(document.text, 'Music');
    expect(document.title, isEmpty);
    expect(document.creator, isEmpty);
  });

  test('keeps DOCX table rows and columns readable', () {
    final document = SheetDocxTextExtractor.extract(
      _docxBytes(
        documentXml: '''
<w:document xmlns:w="urn:word">
  <w:body>
    <w:p><w:r><w:t>Rehearsal order</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Section</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Tempo</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:p><w:r><w:t>Verse</w:t></w:r></w:p>
          <w:p><w:r><w:t>Repeat twice</w:t></w:r></w:p>
        </w:tc>
        <w:tc><w:p><w:r><w:t>96 BPM</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:t>End note</w:t></w:r></w:p>
  </w:body>
</w:document>
''',
      ),
    );

    expect(
      document.text,
      'Rehearsal order\nSection\tTempo\nVerse / Repeat twice\t96 BPM\nEnd note',
    );
  });

  test('keeps DOCX numbered and bulleted list markers readable', () {
    final document = SheetDocxTextExtractor.extract(
      _docxBytes(
        documentXml: '''
<w:document xmlns:w="urn:word">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t>Verse</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t>Repeat twice</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t>Chorus</w:t></w:r></w:p>
  </w:body>
</w:document>
''',
        numberingXml: '''
<w:numbering xmlns:w="urn:word">
  <w:abstractNum w:abstractNumId="2">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="5"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>
''',
      ),
    );

    expect(document.text, '1. Verse\n  • Repeat twice\n2. Chorus');
  });

  test('formats DOCX list starts, letters and Roman numerals', () {
    final document = SheetDocxTextExtractor.extract(
      _docxBytes(
        documentXml: '''
<w:document xmlns:w="urn:word">
  <w:body>
    <w:p><w:pPr><w:numPr><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t>Second ending</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:numId w:val="6"/></w:numPr></w:pPr><w:r><w:t>Bridge</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:numId w:val="7"/></w:numPr></w:pPr><w:r><w:t>Coda</w:t></w:r></w:p>
  </w:body>
</w:document>
''',
        numberingXml: '''
<w:numbering xmlns:w="urn:word">
  <w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:start w:val="2"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1)"/></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="3"><w:lvl w:ilvl="0"><w:start w:val="2"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="4"><w:lvl w:ilvl="0"><w:start w:val="4"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
  <w:num w:numId="5"><w:abstractNumId w:val="2"/></w:num>
  <w:num w:numId="6"><w:abstractNumId w:val="3"/></w:num>
  <w:num w:numId="7"><w:abstractNumId w:val="4"/></w:num>
</w:numbering>
''',
      ),
    );

    expect(document.text, '2) Second ending\nB. Bridge\niv. Coda');
  });

  test('ignores malformed optional DOCX numbering metadata', () {
    final document = SheetDocxTextExtractor.extract(
      _docxBytes(
        documentXml: '''
<w:document xmlns:w="urn:word">
  <w:body>
    <w:p><w:pPr><w:numPr><w:numId w:val="5"/></w:numPr></w:pPr><w:r><w:t>Verse</w:t></w:r></w:p>
  </w:body>
</w:document>
''',
        numberingXml: '<broken',
      ),
    );

    expect(document.text, 'Verse');
  });

  test('rejects malformed archives, missing XML and empty documents', () {
    expect(
      () => SheetDocxTextExtractor.extract(Uint8List.fromList(<int>[1, 2, 3])),
      throwsFormatException,
    );
    expect(
      () => SheetDocxTextExtractor.extract(
        Uint8List.fromList(
          ZipEncoder().encode(Archive()..addFile(ArchiveFile.string('x', 'y'))),
        ),
      ),
      throwsFormatException,
    );
    expect(
      () => SheetDocxTextExtractor.extract(
        _docxBytes(
          documentXml: '<w:document xmlns:w="urn:word"><w:body><w:p/></w:body></w:document>',
        ),
      ),
      throwsFormatException,
    );
  });
}

Uint8List _docxBytes({
  required String documentXml,
  String? coreXml,
  String? numberingXml,
}) {
  final archive = Archive()
    ..addFile(ArchiveFile.string('word/document.xml', documentXml));
  if (coreXml != null) {
    archive.addFile(ArchiveFile.string('docProps/core.xml', coreXml));
  }
  if (numberingXml != null) {
    archive.addFile(ArchiveFile.string('word/numbering.xml', numberingXml));
  }
  return Uint8List.fromList(ZipEncoder().encode(archive));
}
