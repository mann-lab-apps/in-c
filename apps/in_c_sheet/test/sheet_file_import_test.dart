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
  });

  test('explains known unsupported image types', () {
    expect(
      SheetFileImportPolicy.unsupportedImportMessage(
        'Unsupported image file: page-1.heic',
      ),
      contains('JPG로 내보낸 뒤'),
    );
    expect(
      SheetFileImportPolicy.unsupportedImportMessage(
        'Unsupported image file: page-1.tiff',
      ),
      contains('JPG/PNG'),
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
