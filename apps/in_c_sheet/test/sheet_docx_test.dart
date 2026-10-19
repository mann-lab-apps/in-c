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

Uint8List _docxBytes({required String documentXml, String? coreXml}) {
  final archive = Archive()
    ..addFile(ArchiveFile.string('word/document.xml', documentXml));
  if (coreXml != null) {
    archive.addFile(ArchiveFile.string('docProps/core.xml', coreXml));
  }
  return Uint8List.fromList(ZipEncoder().encode(archive));
}
