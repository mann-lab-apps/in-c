import 'dart:io';

import 'package:classical_local_library/app_settings.dart';
import 'package:classical_local_library/local_data_control.dart';
import 'package:classical_local_library/library_backup.dart';
import 'package:classical_local_library/library_backup_io.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/sqlite_database.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  late Directory tempDirectory;

  setUpAll(sqfliteFfiInit);
  setUp(() async {
    tempDirectory = await Directory.systemTemp.createTemp('data_control_test_');
  });
  tearDown(() async {
    if (await tempDirectory.exists()) {
      await tempDirectory.delete(recursive: true);
    }
  });

  test('공개 지원 링크는 자격 정보 없는 HTTPS URL만 허용한다', () {
    expect(
      parsePublicHttpsUrl('https://support.example.org/play'),
      Uri.parse('https://support.example.org/play'),
    );
    expect(parsePublicHttpsUrl('http://support.example.org/play'), isNull);
    expect(parsePublicHttpsUrl('file:///Users/private/policy.html'), isNull);
    expect(parsePublicHttpsUrl('https://user:secret@example.org'), isNull);
    expect(parsePublicHttpsUrl('not a url'), isNull);
  });

  test(
    'summary and reset remove managed copies but preserve external original',
    () async {
      final database = await _openDatabase(tempDirectory);
      addTearDown(database.close);
      final managed = Directory('${tempDirectory.path}/managed_audio');
      final imslp = Directory('${tempDirectory.path}/imslp_imports');
      final external = File('${tempDirectory.path}/external.flac');
      await managed.create();
      await imslp.create();
      await File('${managed.path}/one.flac').writeAsBytes(List.filled(10, 1));
      await File('${imslp.path}/two.mp3').writeAsBytes(List.filled(20, 2));
      await external.writeAsBytes([1, 2, 3]);
      await database.insert('scan_locations', {
        'id': 'location',
        'path': external.parent.path,
        'display_name': '외부 폴더',
        'is_active': 1,
        'created_at_millis': 1,
        'last_scanned_at_millis': null,
        'last_scan_file_count': 0,
      });
      final service = LocalDataControlService(
        database: database,
        managedDirectories: [managed, imslp],
      );
      await SqlitePlaybackQueueSnapshotStore(database).save(
        const PlaybackQueueSnapshot(
          trackIds: ['private-track'],
          currentTrackId: 'private-track',
          savedAtMillis: 1,
        ),
      );

      final summary = await service.summary();
      expect(summary.managedFileCount, 2);
      expect(summary.managedBytes, 30);
      await service.reset();

      expect(await managed.exists(), isFalse);
      expect(await imslp.exists(), isFalse);
      expect(await external.exists(), isTrue);
      expect(await database.query('scan_locations'), isEmpty);
      expect(await database.query('app_reset_state'), isEmpty);
      expect(await SqlitePlaybackQueueSnapshotStore(database).load(), isNull);
    },
  );

  test('pending reset retries file cleanup after a partial failure', () async {
    final database = await _openDatabase(tempDirectory);
    addTearDown(database.close);
    final managed = Directory('${tempDirectory.path}/managed_audio');
    await managed.create();
    await File('${managed.path}/one.flac').writeAsBytes([1]);
    final failing = LocalDataControlService(
      database: database,
      managedDirectories: [managed],
      directoryCleaner: (_) async {
        throw const FileSystemException('injected failure');
      },
    );

    await expectLater(
      failing.reset,
      throwsA(
        isA<LocalDataResetException>()
            .having(
              (error) => error.message,
              'message',
              isNot(contains('injected failure')),
            )
            .having(
              (error) => error.message,
              'message',
              isNot(contains(tempDirectory.path)),
            ),
      ),
    );
    expect(await database.query('app_reset_state'), hasLength(1));
    expect(await managed.exists(), isTrue);

    final recovered = LocalDataControlService(
      database: database,
      managedDirectories: [managed],
    );
    expect(await recovered.recoverPendingReset(), isTrue);
    expect(await managed.exists(), isFalse);
    expect(await database.query('app_reset_state'), isEmpty);
    expect(await recovered.recoverPendingReset(), isFalse);
  });

  for (final failsPreparation in [false, true]) {
    testWidgets(
      'reset awaits preparation before deletion (failure=$failsPreparation)',
      (tester) async {
        final database = (await tester.runAsync(
          () => _openDatabase(tempDirectory),
        ))!;
        addTearDown(database.close);
        final events = <String>[];
        await tester.pumpWidget(
          MaterialApp(
            home: AppSettingsScreen(
              dataControl: _RecordingDataControl(database, events),
              onBeforeReset: () async {
                events.add('prepare');
                await Future<void>.value();
                if (failsPreparation) throw StateError('/Users/private/test');
                events.add('drained');
              },
              onResetComplete: () async => events.add('complete'),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.text('초기화'),
          300,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.text('초기화'));
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextField), '초기화');
        await tester.pumpAndSettle();
        await tester.tap(find.text('모두 삭제'));
        await tester.pumpAndSettle();
        expect(
          events,
          failsPreparation
              ? ['prepare']
              : ['prepare', 'drained', 'delete', 'complete'],
        );
        expect(find.textContaining('/Users/'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('settings explains local data and external original boundaries', (
    tester,
  ) async {
    final database = (await tester.runAsync(
      () => _openDatabase(tempDirectory),
    ))!;
    addTearDown(database.close);
    final managed = Directory('${tempDirectory.path}/managed_audio');
    await tester.runAsync(() async {
      await managed.create();
      await File('${managed.path}/one.flac').writeAsBytes([1]);
    });
    await tester.pumpWidget(
      MaterialApp(
        home: AppSettingsScreen(
          dataControl: LocalDataControlService(
            database: database,
            managedDirectories: [managed],
          ),
          onResetComplete: () async {},
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('로컬 데이터와 개인정보'), findsOneWidget);
    expect(find.text('개인정보 처리 안내'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pump();
    expect(find.textContaining('외부 원본은 유지'), findsOneWidget);
    expect(find.text('오픈소스 라이선스'), findsOneWidget);
  });

  testWidgets(
    'settings exports, previews, and imports a path-free logical backup',
    (tester) async {
      final database = (await tester.runAsync(
        () => _openDatabase(tempDirectory),
      ))!;
      addTearDown(database.close);
      final service = LibraryBackupService(database: database);
      final transport = _FakeBackupTransport();
      var imported = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: AppSettingsScreen(
            dataControl: LocalDataControlService(
              database: database,
              managedDirectories: const [],
            ),
            onResetComplete: () async {},
            backupService: service,
            backupTransport: transport,
            onBackupImported: () async => imported += 1,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('내보내기'));
      await tester.pumpAndSettle();

      final exportButton = tester.widget<DdiroriButton>(
        find.widgetWithText(DdiroriButton, '내보내기'),
      );
      await tester.runAsync(() async => await exportButton.onPressed!());
      await tester.pumpAndSettle();
      expect(transport.exported, contains(libraryBackupFormat));
      expect(transport.exported, isNot(contains('/Users/')));

      transport.importSource = transport.exported;
      final importButton = tester.widget<DdiroriButton>(
        find.widgetWithText(DdiroriButton, '가져오기'),
      );
      late Future<void> importFuture;
      await tester.runAsync(() async {
        importFuture = Future<void>.sync(importButton.onPressed!);
        await Future<void>.delayed(const Duration(milliseconds: 100));
      });
      await tester.pumpAndSettle();
      expect(find.text('라이브러리 백업 가져오기'), findsOneWidget);
      expect(find.textContaining('음원 파일과 원래 폴더 위치는'), findsOneWidget);
      Navigator.of(tester.element(find.text('라이브러리 백업 가져오기'))).pop(true);
      await tester.pump();
      await tester.runAsync(
        () => importFuture.timeout(const Duration(seconds: 5)),
      );
      await tester.pumpAndSettle();
      expect(imported, 1);
      await tester.drag(find.byType(ListView), const Offset(0, -1000));
      await tester.pumpAndSettle();
      expect(find.textContaining('백업을 가져왔습니다.'), findsOneWidget);
    },
  );

  testWidgets('backup controls do not overflow at 320px and 200% text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 720);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final database = (await tester.runAsync(
      () => _openDatabase(tempDirectory),
    ))!;
    addTearDown(database.close);
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(textScaler: TextScaler.linear(2)),
        child: MaterialApp(
          home: AppSettingsScreen(
            dataControl: LocalDataControlService(
              database: database,
              managedDirectories: const [],
            ),
            onResetComplete: () async {},
            backupService: LibraryBackupService(database: database),
            backupTransport: _FakeBackupTransport(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('내보내기'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(tester.takeException(), isNull);
    expect(find.text('내보내기'), findsOneWidget);
    expect(find.text('가져오기'), findsOneWidget);
  });
}

Future<Database> _openDatabase(Directory directory) => ClassicalLocalDatabase(
  path: '${directory.path}/data.sqlite',
  factory: databaseFactoryFfi,
).open();

class _FakeBackupTransport implements LibraryBackupTransport {
  String? importSource;
  String? exported;

  @override
  Future<LibraryBackupExportResult> export(
    String json, {
    Rect? sharePositionOrigin,
  }) async {
    exported = json;
    return const LibraryBackupExportResult(
      LibraryBackupExportOutcome.success,
      '라이브러리 백업을 내보냈습니다.',
    );
  }

  @override
  Future<String?> pickImport() async => importSource;
}

class _RecordingDataControl extends LocalDataControlService {
  _RecordingDataControl(Database database, this.events)
    : super(database: database, managedDirectories: const []);
  final List<String> events;

  @override
  Future<void> reset() async => events.add('delete');
}
