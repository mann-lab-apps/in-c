import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_external_folder_catalog.dart';
import 'package:in_c_sheet/sheet_external_folder_gateway.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('clef/test_external_folder');

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  test(
    'reads transient Android folder candidates without persisting tokens',
    () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            expect(call.method, 'pickFolder');
            return <String, Object?>{
              'folderLabel': 'Recital PDFs',
              'providerLabel': 'Downloads',
              'entries': <Map<String, Object?>>[
                <String, Object?>{
                  'displayName': 'Etude.pdf',
                  'documentId': 'content://provider/secret/etude',
                  'sizeBytes': 512,
                  'modifiedAt': 1,
                  'canRead': true,
                },
              ],
            };
          });
      final gateway = MethodChannelSheetExternalFolderGateway(channel: channel);

      final selection = await gateway.pickFolder();

      expect(selection, isNotNull);
      expect(selection!.folderLabel, 'Recital PDFs');
      expect(selection.entries.single.displayName, 'Etude.pdf');
      expect(
        selection.entries.single.modifiedAt,
        DateTime.fromMillisecondsSinceEpoch(1),
      );
      final preview = SheetExternalFolderCatalogPreview.fromEntries(
        selection.entries,
      );
      final source = preview
          .copyPlanForSelection(<String>[preview.candidates.single.selectionId])
          .copySources(folderLabel: selection.folderLabel)
          .single;
      expect(source.documentToken, contains('secret'));
      expect(source.toBackupJson().values.join(' '), isNot(contains('secret')));
    },
  );

  test(
    'sends only selected transient document tokens for native copies',
    () async {
      final calls = <MethodCall>[];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (call) async {
            calls.add(call);
            return <Map<String, String>>[
              <String, String>{'path': '/cache/etude.pdf', 'name': 'Etude.pdf'},
            ];
          });
      final gateway = MethodChannelSheetExternalFolderGateway(channel: channel);

      final files = await gateway.copySelected(<SheetExternalFolderCopySource>[
        SheetExternalFolderCopySource(
          displayName: 'Etude.pdf',
          documentToken: 'content://provider/document/etude',
          folderLabel: 'Recital PDFs',
          providerLabel: 'Downloads',
          sizeBytes: 512,
          modifiedAt: DateTime.utc(2026, 10, 19),
        ),
        const SheetExternalFolderCopySource(displayName: 'No token.pdf'),
      ]);

      expect(files.single.path, '/cache/etude.pdf');
      expect(
        files.single.importSource?.locationLabel,
        'Recital PDFs · Downloads',
      );
      expect(files.single.importSource?.displayName, 'Etude.pdf');
      expect(files.single.importSource?.sizeBytes, 512);
      expect(
        files.single.importSource!.toJson().values.join(' '),
        isNot(contains('content://')),
      );
      expect(calls.single.method, 'copySelected');
      expect(calls.single.arguments, <String, Object?>{
        'documentTokens': <String>['content://provider/document/etude'],
      });
    },
  );

  test(
    'does not guess provenance when native copy names do not match',
    () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (_) async {
            return <Map<String, String>>[
              <String, String>{
                'path': '/cache/renamed.pdf',
                'name': 'Renamed.pdf',
              },
            ];
          });
      final gateway = MethodChannelSheetExternalFolderGateway(channel: channel);

      final files = await gateway.copySelected(
        const <SheetExternalFolderCopySource>[
          SheetExternalFolderCopySource(
            displayName: 'Original.pdf',
            documentToken: 'content://provider/document/original',
          ),
        ],
      );

      expect(files.single.importSource, isNull);
    },
  );

  test(
    'reports native picker failures as user-facing gateway errors',
    () async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, (_) async {
            throw PlatformException(
              code: 'permission_denied',
              message: '권한 없음',
            );
          });
      final gateway = MethodChannelSheetExternalFolderGateway(channel: channel);

      expect(
        gateway.pickFolder(),
        throwsA(
          isA<SheetExternalFolderGatewayException>().having(
            (error) => error.message,
            'message',
            '권한 없음',
          ),
        ),
      );
    },
  );
}
