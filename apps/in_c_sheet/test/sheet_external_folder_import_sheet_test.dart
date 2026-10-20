import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_external_folder_catalog.dart';
import 'package:in_c_sheet/sheet_external_folder_gateway.dart';
import 'package:in_c_sheet/sheet_external_folder_import_sheet.dart';
import 'package:in_c_sheet/sheet_score.dart';

void main() {
  testWidgets('preselects supported scores and keeps blocked files disabled', (
    tester,
  ) async {
    final preview = SheetExternalFolderCatalogPreview.fromEntries(
      const <SheetExternalFolderEntry>[
        SheetExternalFolderEntry(displayName: 'Ready.pdf'),
        SheetExternalFolderEntry(displayName: 'notes.docx'),
        SheetExternalFolderEntry(displayName: 'blocked.xlsx'),
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
    expect(find.text('2개 악보 복사'), findsOneWidget);
    final checkboxes = tester.widgetList<CheckboxListTile>(
      find.byType(CheckboxListTile),
    );
    expect(checkboxes.first.onChanged, isNotNull);
    expect(checkboxes.elementAt(1).onChanged, isNotNull);
    expect(checkboxes.last.onChanged, isNull);
  });

  testWidgets('copy button returns a typed import action', (tester) async {
    SheetExternalFolderImportAction? result;
    final preview = SheetExternalFolderCatalogPreview.fromEntries(
      const <SheetExternalFolderEntry>[
        SheetExternalFolderEntry(displayName: 'Ready.pdf'),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => FilledButton(
              onPressed: () async {
                result =
                    await showModalBottomSheet<SheetExternalFolderImportAction>(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) => ExternalFolderImportSheet(
                        folderLabel: 'Recital',
                        preview: preview,
                      ),
                    );
              },
              child: const Text('폴더 열기'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('폴더 열기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('1개 악보 복사'));
    await tester.pumpAndSettle();

    expect(result?.type, SheetExternalFolderImportActionType.copy);
    expect(result?.copyPlan?.copyCount, 1);
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

  testWidgets('changed folder sources stay blocked and explain no overwrite', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    SheetExternalFolderImportAction? result;
    final preview = SheetExternalFolderCatalogPreview.fromEntries(
      <SheetExternalFolderEntry>[
        SheetExternalFolderEntry(
          displayName: 'Changed concert score with a very long title.pdf',
          sizeBytes: 2048,
          modifiedAt: DateTime.utc(2026, 10, 20),
        ),
      ],
      existingFileNames: const <String>[
        'Changed concert score with a very long title.pdf',
      ],
      existingImports: <SheetExternalFolderImportedScore>[
        SheetExternalFolderImportedScore(
          scoreId: 'score-changed',
          source: SheetScoreImportSource.create(
            platform: 'android-saf-copy',
            displayName: 'Changed concert score with a very long title.pdf',
            folderLabel: 'Recital',
            sizeBytes: 1024,
            modifiedAt: DateTime.utc(2026, 10, 19),
          )!,
        ),
      ],
      folderLabel: 'Recital',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => FilledButton(
              onPressed: () async {
                result =
                    await showModalBottomSheet<SheetExternalFolderImportAction>(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) => ExternalFolderImportSheet(
                        folderLabel: 'Recital',
                        preview: preview,
                      ),
                    );
              },
              child: const Text('폴더 열기'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('폴더 열기'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.textContaining('원본 변경 1개'), findsOneWidget);
    expect(find.textContaining('자동으로 덮어쓰지'), findsNWidgets(2));
    expect(find.byType(CheckboxListTile), findsNothing);
    expect(find.text('기존 악보 열기'), findsOneWidget);
    expect(find.text('변경 PDF 적용'), findsOneWidget);
    expect(find.text('0개 악보 복사'), findsOneWidget);

    await tester.tap(find.text('기존 악보 열기'));
    await tester.pumpAndSettle();
    expect(result?.type, SheetExternalFolderImportActionType.openExisting);
    expect(result?.scoreId, 'score-changed');

    result = null;
    await tester.tap(find.text('폴더 열기'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('변경 PDF 적용'));
    await tester.pumpAndSettle();
    expect(
      result?.type,
      SheetExternalFolderImportActionType.replaceExistingPdf,
    );
    expect(result?.scoreId, 'score-changed');
    expect(
      result?.candidate?.entry.displayName,
      'Changed concert score with a very long title.pdf',
    );
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
