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

      final files = await gateway.copySelected(
        const <SheetExternalFolderCopySource>[
          SheetExternalFolderCopySource(
            displayName: 'Etude.pdf',
            documentToken: 'content://provider/document/etude',
          ),
          SheetExternalFolderCopySource(displayName: 'No token.pdf'),
        ],
      );

      expect(files.single.path, '/cache/etude.pdf');
      expect(calls.single.method, 'copySelected');
      expect(calls.single.arguments, <String, Object?>{
        'documentTokens': <String>['content://provider/document/etude'],
      });
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
