import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_external_folder_catalog.dart';
import 'package:in_c_sheet/sheet_external_folder_import_sheet.dart';

void main() {
  testWidgets('preselects safe PDFs and keeps blocked files disabled', (
    tester,
  ) async {
    final preview = SheetExternalFolderCatalogPreview.fromEntries(
      const <SheetExternalFolderEntry>[
        SheetExternalFolderEntry(displayName: 'Ready.pdf'),
        SheetExternalFolderEntry(displayName: 'notes.docx'),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExternalFolderImportSheet(
            folderLabel: 'Recital',
            providerLabel: 'Downloads',
            preview: preview,
          ),
        ),
      ),
    );

    expect(find.text('Recital'), findsOneWidget);
    expect(find.text('Ready.pdf'), findsOneWidget);
    expect(find.text('notes.docx'), findsOneWidget);
    expect(find.text('1개 PDF 복사'), findsOneWidget);
    final checkboxes = tester.widgetList<CheckboxListTile>(
      find.byType(CheckboxListTile),
    );
    expect(checkboxes.first.onChanged, isNotNull);
    expect(checkboxes.last.onChanged, isNull);
  });
}
