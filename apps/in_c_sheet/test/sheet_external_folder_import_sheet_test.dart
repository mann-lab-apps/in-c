import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_external_folder_catalog.dart';
import 'package:in_c_sheet/sheet_external_folder_gateway.dart';
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

  testWidgets('connected folder sheet exposes open add and forget actions', (
    tester,
  ) async {
    SheetExternalFolderConnectionAction? result;
    const connection = SheetExternalFolderConnection(
      folderLabel: 'Recital PDFs',
      providerLabel: 'Downloads',
      folderToken: 'content://provider/tree/recital',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => FilledButton(
              onPressed: () async {
                result = await showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const ExternalFolderConnectionSheet(
                    connections: <SheetExternalFolderConnection>[connection],
                  ),
                );
              },
              child: const Text('열기'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    expect(find.text('연결된 폴더'), findsOneWidget);
    expect(find.text('Recital PDFs'), findsOneWidget);
    expect(find.text('새 폴더 연결'), findsOneWidget);
    expect(find.byTooltip('폴더 연결 해제'), findsOneWidget);

    await tester.tap(find.text('Recital PDFs'));
    await tester.pumpAndSettle();
    expect(result?.type, SheetExternalFolderConnectionActionType.open);
    expect(result?.connection, same(connection));
  });

  testWidgets('unreadable connection can be forgotten on a small screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 480);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SheetExternalFolderConnectionAction? result;
    const connection = SheetExternalFolderConnection(
      folderLabel: '권한이 만료된 폴더',
      folderToken: 'content://provider/tree/stale',
      canRead: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => FilledButton(
              onPressed: () async {
                result = await showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const ExternalFolderConnectionSheet(
                    connections: <SheetExternalFolderConnection>[connection],
                  ),
                );
              },
              child: const Text('열기'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('권한이 없거나 폴더를 찾을 수 없습니다.'), findsOneWidget);

    await tester.tap(find.byTooltip('폴더 연결 해제'));
    await tester.pumpAndSettle();
    expect(result?.type, SheetExternalFolderConnectionActionType.forget);
    expect(result?.connection, same(connection));
  });
}
