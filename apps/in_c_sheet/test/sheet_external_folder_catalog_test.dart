import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_external_folder_catalog.dart';

void main() {
  test('classifies PDF entries as copy candidates without mutating data', () {
    final preview = SheetExternalFolderCatalogPreview.fromEntries(
      <SheetExternalFolderEntry>[
        const SheetExternalFolderEntry(
          displayName: 'Bach Cello Suite.pdf',
          sizeBytes: 1200,
          providerLabel: 'Downloads',
        ),
        const SheetExternalFolderEntry(displayName: 'notes.docx'),
      ],
    );

    expect(preview.status, SheetExternalFolderCatalogStatus.ready);
    expect(preview.isReadOnlyPreview, isTrue);
    expect(preview.scannedCount, 2);
    expect(preview.readyCount, 1);
    expect(preview.blockedCount, 1);
    expect(preview.hasReadyCandidates, isTrue);
    expect(
      preview.candidates.first.status,
      SheetExternalFolderCandidateStatus.readyToCopy,
    );
    expect(preview.candidates.first.message, contains('복사'));
    expect(
      preview.candidates.last.status,
      SheetExternalFolderCandidateStatus.unsupportedFormat,
    );
  });

  test('blocks duplicate file names before copy-on-select import', () {
    final preview = SheetExternalFolderCatalogPreview.fromEntries(
      <SheetExternalFolderEntry>[
        const SheetExternalFolderEntry(displayName: 'Concert Etude.PDF'),
      ],
      existingFileNames: <String>[' concert etude.pdf '],
    );

    expect(preview.readyCount, 0);
    expect(preview.blockedCount, 1);
    expect(
      preview.candidates.single.status,
      SheetExternalFolderCandidateStatus.duplicateName,
    );
    expect(preview.candidates.single.message, contains('이미'));
  });

  test('unreadable entries stay blocked even when the name is a PDF', () {
    final preview = SheetExternalFolderCatalogPreview.fromEntries(
      <SheetExternalFolderEntry>[
        const SheetExternalFolderEntry(
          displayName: 'Cloud Only.pdf',
          canRead: false,
        ),
      ],
    );

    expect(preview.readyCount, 0);
    expect(
      preview.candidates.single.status,
      SheetExternalFolderCandidateStatus.unreadable,
    );
    expect(preview.candidates.single.message, contains('읽을 수'));
  });

  test('empty and permission states do not expose import candidates', () {
    final empty = SheetExternalFolderCatalogPreview.fromEntries(
      const <SheetExternalFolderEntry>[],
    );
    const denied = SheetExternalFolderCatalogPreview.permissionDenied();
    const failed = SheetExternalFolderCatalogPreview.scanFailed();

    expect(empty.status, SheetExternalFolderCatalogStatus.empty);
    expect(empty.hasReadyCandidates, isFalse);
    expect(denied.status, SheetExternalFolderCatalogStatus.permissionDenied);
    expect(denied.candidates, isEmpty);
    expect(denied.message, contains('변경되지'));
    expect(failed.status, SheetExternalFolderCatalogStatus.scanFailed);
    expect(failed.candidates, isEmpty);
  });

  test('caps large folder previews while retaining scanned count', () {
    final preview = SheetExternalFolderCatalogPreview.fromEntries(
      List<SheetExternalFolderEntry>.generate(
        5,
        (index) => SheetExternalFolderEntry(displayName: 'score-$index.pdf'),
      ),
      maxEntries: 3,
    );

    expect(preview.status, SheetExternalFolderCatalogStatus.capped);
    expect(preview.scannedCount, 5);
    expect(preview.candidates, hasLength(3));
    expect(preview.readyCount, 3);
    expect(preview.message, contains('처음 3개'));
  });
}
