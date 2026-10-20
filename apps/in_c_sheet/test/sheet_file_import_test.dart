import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_file_import.dart';
import 'package:pdf_document/pdf_document.dart';

void main() {
  test('recognizes import file types', () {
    expect(SheetFileImportPolicy.isPdfFileName('score.PDF'), isTrue);
    expect(
      SheetFileImportPolicy.isSupportedImageFileName('page-1.jpg'),
      isTrue,
    );
    expect(
      SheetFileImportPolicy.isSupportedImageFileName('page-2.PNG'),
      isTrue,
    );
    expect(
      SheetFileImportPolicy.isKnownButUnsupportedImageFileName('scan.heic'),
      isTrue,
    );
    expect(
      SheetFileImportPolicy.isSupportedImageFileName('scan.heic'),
      isFalse,
    );
    expect(SheetFileImportPolicy.isSupportedImageExtension('.jpeg'), isTrue);
    expect(SheetFileImportPolicy.isSupportedImageExtension('heif'), isFalse);
    expect(
      SheetFileImportPolicy.isSupportedAudioFileName('practice-track.MP3'),
      isTrue,
    );
    expect(SheetFileImportPolicy.isSupportedAudioExtension('.m4a'), isTrue);
    expect(SheetFileImportPolicy.isPlainTextFileName('notes.TXT'), isTrue);
    expect(SheetFileImportPolicy.isPlainTextFileName('chart.md'), isTrue);
    expect(SheetFileImportPolicy.isTextScoreFileName('chart.onsong'), isTrue);
    expect(
      SheetFileImportPolicy.isKnownButUnsupportedTextScoreFileName('notes.txt'),
      isFalse,
    );
    expect(
      SheetFileImportPolicy.isKnownButUnsupportedTextScoreFileName(
        'lead-sheet.chordpro',
      ),
      isTrue,
    );
    expect(
      SheetFileImportPolicy.isKnownButUnsupportedTextScoreFileName(
        'worship-chart.onsong',
      ),
      isTrue,
    );
    expect(
      SheetFileImportPolicy.isKnownButUnsupportedTextScoreFileName(
        'lesson-notes.DOCX',
      ),
      isFalse,
    );
    expect(SheetFileImportPolicy.isDocxFileName('lesson-notes.DOCX'), isTrue);
    expect(SheetFileImportPolicy.isRtfFileName('lesson-notes.RTF'), isTrue);
    for (final name in <String>[
      'score.pdf',
      'notes.txt',
      'chart.onsong',
      'lesson.docx',
      'lesson.rtf',
    ]) {
      expect(
        SheetFileImportPolicy.isSupportedScoreFileName(name),
        isTrue,
        reason: name,
      );
    }
    expect(
      SheetFileImportPolicy.isSupportedScoreFileName('workbook.xlsx'),
      isFalse,
    );
  });

  test('explains known unsupported image types', () {
    expect(
      SheetFileImportPolicy.unsupportedImportMessage(
        'Unsupported image file: page-1.heic',
      ),
      contains('JPG로 저장한 뒤'),
    );
    expect(
      SheetFileImportPolicy.unsupportedImportMessage(
        'Unsupported image file: page-1.tiff',
      ),
      contains('JPG/PNG'),
    );
  });

  test('explains supported and unsupported text score types', () {
    expect(
      SheetFileImportPolicy.unsupportedImportMessage(
        'Unsupported score file: lead-sheet.chordpro',
      ),
      allOf(contains('ChordPro'), contains('파일 선택'), contains('붙여넣기')),
    );
    expect(
      SheetFileImportPolicy.unsupportedTextScoreImportMessage(
        'lesson-notes.docx',
      ),
      allOf(contains('DOCX'), contains('읽기 전용'), contains('가져올 수 있습니다')),
    );
    expect(
      SheetFileImportPolicy.unsupportedTextScoreImportMessage(
        'worship-chart.onsong',
      ),
      allOf(contains('ChordPro'), contains('파일 선택')),
    );
    expect(
      SheetFileImportPolicy.unsupportedTextScoreImportMessage('lyrics.txt'),
      allOf(contains('텍스트 악보'), contains('파일 선택')),
    );
    expect(
      SheetFileImportPolicy.unsupportedTextScoreImportMessage('notes.rtf'),
      allOf(contains('RTF'), contains('읽기 전용'), contains('가져올 수 있습니다')),
    );
    expect(
      SheetFileImportPolicy.unsupportedTextScoreImportMessage('legacy.doc'),
      allOf(contains('DOCX'), contains('RTF'), contains('PDF로 내보낸 뒤')),
    );
  });

  test('cleans scanner-like filenames into readable titles', () {
    expect(
      SheetFileImportPolicy.titleFromFileName(
        'CamScanner_20260823_185455_concert-etude.pdf',
      ),
      'concert etude',
    );
    expect(
      SheetFileImportPolicy.titleFromFileName('___scan.pdf'),
      'Untitled score',
    );
  });

  test('creates safe PDF export filenames', () {
    expect(
      SheetScoreSharePolicy.exportFileName(
        title: 'Concert Etude',
        composer: 'Goedicke',
      ),
      'Goedicke-Concert-Etude.pdf',
    );
    expect(
      SheetScoreSharePolicy.exportFileName(
        title: '아리랑 / trumpet',
        composer: '',
      ),
      '아리랑-trumpet.pdf',
    );
  });

  test('converts multiple PNG images to one PDF document', () async {
    final bytes = await SheetImagePdfConverter.convertImagesToPdf(
      <SheetImportedFile>[
        SheetImportedFile(name: 'page-1.png', bytes: _onePixelPng),
        SheetImportedFile(name: 'page-2.png', bytes: _onePixelPng),
      ],
    );
    final document = PdfDocument.open(bytes);

    expect(bytes.length, greaterThan(1000));
    expect(document.pageCount, 2);
  });

  test('rejects unsupported image conversion input', () async {
    expect(
      () => SheetImagePdfConverter.convertImagesToPdf(<SheetImportedFile>[
        SheetImportedFile(name: 'page-1.heic', bytes: Uint8List(4)),
      ]),
      throwsA(isA<FormatException>()),
    );
  });
}

final Uint8List _onePixelPng = File(
  'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
).readAsBytesSync();
