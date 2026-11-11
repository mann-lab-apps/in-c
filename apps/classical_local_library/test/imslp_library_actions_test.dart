import 'dart:async';
import 'dart:io';

import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_download.dart';
import 'package:classical_local_library/imslp_library.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/local_audio_scanner.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'recovery list retries stored registration and shows only real completion actions',
    (tester) async {
      final recovery = _RecoveryCoordinator();
      var plays = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: ImslpLibraryScreen(
            library: emptyClassicalLibrary,
            store: MemoryImslpStore(),
            client: _Client(),
            importCoordinator: recovery,
            onPlayImportedFiles: (result) async {
              expect(result.fileIds, ['recovered-id']);
              plays++;
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, find.byTooltip('저장된 자료 등록 재시도'));
      await tester.pumpAndSettle();
      expect(recovery.calls, 0);
      await tester.tap(_button('확인 후 등록 재시도'));
      await tester.pump();
      expect(recovery.calls, 1);
      expect(plays, 0);
      recovery.pending.completeError(
        const ImslpDownloadException('registrationPending', '등록을 다시 시도해 주세요.'),
      );
      await tester.pumpAndSettle();
      expect(find.byTooltip('저장된 자료 등록 재시도'), findsOneWidget);
      await _tap(tester, find.byTooltip('저장된 자료 등록 재시도'));
      await tester.pumpAndSettle();
      recovery.pending = Completer<ImslpImportRecord>();
      await tester.tap(_button('확인 후 등록 재시도'));
      await tester.pump();
      recovery.remaining = false;
      recovery.pending.complete(_recoveredRecord);
      await tester.pumpAndSettle();
      expect(find.byTooltip('저장된 자료 등록 재시도'), findsNothing);
      expect(plays, 0);
      await _tap(tester, _button('가져온 곡 재생'));
      await tester.pumpAndSettle();
      expect(plays, 1);
    },
  );

  testWidgets(
    'leaving screen cancels in-flight recovery and ignores late error',
    (tester) async {
      final recovery = _RecoveryCoordinator();
      await tester.pumpWidget(
        MaterialApp(
          home: ImslpLibraryScreen(
            library: emptyClassicalLibrary,
            store: MemoryImslpStore(),
            client: _Client(),
            importCoordinator: recovery,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, find.byTooltip('저장된 자료 등록 재시도'));
      await tester.pumpAndSettle();
      await tester.tap(_button('확인 후 등록 재시도'));
      await tester.pump();
      expect(recovery.cancellation!.isCancelled, isFalse);
      await tester.pumpWidget(const SizedBox());
      expect(recovery.cancellation!.isCancelled, isTrue);
      recovery.pending.completeError(
        const ImslpDownloadException('cancelled', '취소'),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'recovery list error exposes retry without blocking standalone search',
    (tester) async {
      final recovery = _RecoveryCoordinator()..failList = true;
      await tester.pumpWidget(
        MaterialApp(
          home: ImslpLibraryScreen(
            library: emptyClassicalLibrary,
            store: MemoryImslpStore(),
            client: _Client(),
            importCoordinator: recovery,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await _tap(tester, _button('복구 목록 다시 확인'));
      await tester.pumpAndSettle();
      expect(find.textContaining('복구 목록을 불러오지 못했습니다'), findsOneWidget);
      recovery.failList = false;
      await _tap(tester, _button('복구 목록 다시 확인'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('저장된 자료 등록 재시도'), findsOneWidget);
      expect(find.textContaining('복구 목록을 불러오지 못했습니다'), findsNothing);
    },
  );
  for (final oldFails in [false, true]) {
    testWidgets(
      'new success survives older ${oldFails ? 'failure' : 'success'}',
      (tester) async {
        final client = _Client();
        await _mount(tester, client: client);
        await _search(tester, 'old');
        await _search(tester, 'new');
        client.calls[1].complete([_result('new')]);
        await tester.pumpAndSettle();
        if (oldFails) {
          client.calls[0].completeError(
            const ImslpClientException('networkFailure', 'old failure'),
          );
        } else {
          client.calls[0].complete([_result('old')]);
        }
        await tester.pumpAndSettle();
        expect(
          find.byWidgetPredicate(
            (widget) => widget is Text && widget.data == 'new',
          ),
          findsOneWidget,
        );
        expect(find.text('old'), findsNothing);
        expect(find.text('old failure'), findsNothing);
        expect(_button('검색 다시 시도'), findsNothing);
      },
    );
  }

  testWidgets('new failure after old success surfaces and retry succeeds', (
    tester,
  ) async {
    final client = _Client();
    await _mount(tester, client: client);
    await _search(tester, 'old');
    await _search(tester, 'new');
    client.calls[0].complete([_result('old')]);
    await tester.pump();
    expect(find.text('old'), findsNothing);
    client.calls[1].completeError(
      const ImslpClientException('rateLimited', '잠시 뒤 다시 시도해 주세요.'),
    );
    await tester.pumpAndSettle();
    expect(find.text('잠시 뒤 다시 시도해 주세요.'), findsOneWidget);
    await tester.tap(_button('검색 다시 시도'));
    await tester.pump();
    client.calls[2].complete([_result('retry')]);
    await tester.pumpAndSettle();
    expect(find.text('retry'), findsOneWidget);
    expect(client.queries, ['old', 'new', 'new']);
  });

  testWidgets('cancel, query change and dispose invalidate pending responses', (
    tester,
  ) async {
    final client = _Client();
    await _mount(tester, client: client);
    await _search(tester, 'cancel');
    await tester.tap(_button('검색 취소'));
    await tester.pump();
    client.calls[0].complete([_result('cancelled result')]);
    await tester.pumpAndSettle();
    expect(find.text('cancelled result'), findsNothing);
    expect(find.text('IMSLP 검색을 취소했습니다.'), findsOneWidget);
    await _search(tester, 'changed');
    await tester.enterText(find.byType(TextField).first, 'draft');
    client.calls[1].completeError(StateError('late failure'));
    await tester.pumpAndSettle();
    expect(_button('검색 다시 시도'), findsNothing);
    await _search(tester, 'dispose');
    await tester.pumpWidget(const SizedBox());
    client.calls[2].complete([_result('disposed result')]);
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  for (final lateFailure in [false, true]) {
    testWidgets(
      'load and import ${lateFailure ? 'failure' : 'success'} after dispose is ignored',
      (tester) async {
        final load = Completer<List<ImslpWorkLink>>();
        await tester.pumpWidget(
          MaterialApp(
            home: ImslpLibraryScreen(
              library: emptyClassicalLibrary,
              store: _DelayedLoadStore(load),
              client: _Client(),
            ),
          ),
        );
        await tester.pumpWidget(const SizedBox());
        if (lateFailure) {
          load.completeError(StateError('load'));
        } else {
          load.complete([]);
        }
        await tester.pump();
        expect(tester.takeException(), isNull);
        final imported = Completer<ImslpLocalImportResult?>();
        await _mount(tester, onImport: () => imported.future);
        await _tap(tester, _button('음원 파일 가져오기'));
        await tester.pumpWidget(const SizedBox());
        if (lateFailure) {
          imported.completeError(StateError('import'));
        } else {
          imported.complete(
            const ImslpLocalImportResult(fileIds: ['local'], label: 'local'),
          );
        }
        await tester.pump();
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'opened page and imported files require source confirmation; show and play remain explicit',
    (tester) async {
      final client = _Client();
      final store = MemoryImslpStore();
      final selected = _result('official');
      final imported = Completer<ImslpLocalImportResult?>();
      var imports = 0;
      var shows = 0;
      var plays = 0;
      var associations = 0;
      ImslpWorkSearchResult? associatedSource;
      ImslpLocalImportResult? associatedFiles;
      await _mount(
        tester,
        client: client,
        store: store,
        open: (uri) async {
          expect(uri, selected.pageUrl);
          return true;
        },
        onImport: () {
          imports++;
          return imported.future;
        },
        onShow: (result) async {
          expect(result.fileIds, ['file-a', 'file-b']);
          shows++;
        },
        onPlay: (result) async {
          expect(result.fileIds, ['file-a', 'file-b']);
          plays++;
        },
        onAssociate: (source, result) async {
          associations++;
          associatedSource = source;
          associatedFiles = result;
        },
      );
      await _search(tester, 'official');
      client.calls.single.complete([selected]);
      await tester.pumpAndSettle();
      await _tap(tester, _button('공식 페이지에서 녹음 확인'));
      await tester.pumpAndSettle();
      expect(find.textContaining('보관함에 가져왔습니다'), findsNothing);
      expect(associations, 0);
      expect(plays, 0);
      await _tap(tester, _button('음원 파일 가져오기'));
      await tester.tap(_button('음원 파일 가져오기'));
      await tester.pump();
      expect(imports, 1);
      imported.complete(
        const ImslpLocalImportResult(
          fileIds: ['file-a', 'file-b'],
          label: 'two actual files',
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('가져온 음원 출처 확인'), findsOneWidget);
      expect(associations, 0);
      await tester.tap(_button('취소'));
      await tester.pumpAndSettle();
      expect(associations, 0);
      expect(plays, 0);
      await _tap(tester, _button('출처 연결 확인'));
      await tester.pumpAndSettle();
      await tester.tap(_button('확인한 파일에 출처 연결'));
      await tester.pumpAndSettle();
      expect(associations, 1);
      expect(associatedSource!.externalId, selected.externalId);
      expect(associatedSource!.pageUrl, selected.pageUrl);
      expect(associatedFiles!.fileIds, ['file-a', 'file-b']);
      expect(await store.loadWorkLinks(), isEmpty);
      expect(await store.loadImports(), isEmpty);
      await _tap(tester, _button('가져온 곡 보기'));
      await tester.pumpAndSettle();
      expect(shows, 1);
      expect(plays, 0);
      await _tap(tester, _button('가져온 곡 재생'));
      await tester.pumpAndSettle();
      expect(plays, 1);
    },
  );

  testWidgets(
    'source save failure keeps imported completion and allows retry',
    (tester) async {
      final client = _Client();
      var associations = 0;
      await _mount(
        tester,
        client: client,
        open: (_) async => true,
        onImport: () async =>
            const ImslpLocalImportResult(fileIds: ['actual'], label: 'actual'),
        onAssociate: (_, _) async {
          if (++associations == 1) throw StateError('save');
        },
      );
      await _search(tester, 'official');
      client.calls.single.complete([_result('official')]);
      await tester.pumpAndSettle();
      await _tap(tester, _button('공식 페이지에서 녹음 확인'));
      await tester.pumpAndSettle();
      await _tap(tester, _button('음원 파일 가져오기'));
      await tester.pumpAndSettle();
      await tester.tap(_button('확인한 파일에 출처 연결'));
      await tester.pumpAndSettle();
      expect(find.textContaining('출처 연결을 저장하지 못했습니다'), findsOneWidget);
      await _tap(tester, _button('출처 연결 확인'));
      await tester.pumpAndSettle();
      await tester.tap(_button('확인한 파일에 출처 연결'));
      await tester.pumpAndSettle();
      expect(associations, 2);
      expect(find.text('선택한 음원의 IMSLP 출처를 연결했습니다.'), findsOneWidget);
    },
  );

  for (final result in [
    null,
    const ImslpLocalImportResult(fileIds: [], label: 'no audio'),
  ]) {
    testWidgets(
      'cancelled or empty import has no playback or source: ${result?.label}',
      (tester) async {
        var associated = false;
        await _mount(
          tester,
          onImport: () async => result,
          onAssociate: (_, _) async {
            associated = true;
          },
          onPlay: (_) async {},
        );
        await _tap(tester, _button('음원 파일 가져오기'));
        await tester.pumpAndSettle();
        expect(_button('가져온 곡 재생'), findsNothing);
        expect(associated, isFalse);
        expect(
          find.textContaining(result == null ? '가져오기를 취소' : '등록된 오디오가 없습니다'),
          findsOneWidget,
        );
      },
    );
  }

  testWidgets('page open failure provides no source for local import', (
    tester,
  ) async {
    final client = _Client();
    var associated = false;
    await _mount(
      tester,
      client: client,
      open: (_) async => throw StateError('launch'),
      onImport: () async =>
          const ImslpLocalImportResult(fileIds: ['actual'], label: 'actual'),
      onAssociate: (_, _) async {
        associated = true;
      },
    );
    await _search(tester, 'official');
    client.calls.single.complete([_result('official')]);
    await tester.pumpAndSettle();
    await _tap(tester, _button('공식 페이지에서 녹음 확인'));
    await tester.pumpAndSettle();
    expect(find.text('외부 페이지를 열지 못했습니다.'), findsOneWidget);
    await _tap(tester, _button('음원 파일 가져오기'));
    await tester.pumpAndSettle();
    expect(associated, isFalse);
    expect(find.text('가져온 음원 출처 확인'), findsNothing);
  });

  testWidgets(
    'direct URL dialog waits for save, blocks duplicate and preserves failed draft',
    (tester) async {
      final store = _ResourceStore();
      await _link(store);
      await _mount(tester, store: store, withWorks: true);
      await _tap(tester, find.byTooltip('검증된 직접 URL 등록'));
      await tester.pumpAndSettle();
      expect(find.byType(DdiroriInput), findsNWidgets(3));
      await tester.enterText(
        find.widgetWithText(TextField, '공식 직접 URL'),
        'https://s9.imslp.org/fixture.wav',
      );
      await tester.enterText(
        find.widgetWithText(TextField, '원본 파일명'),
        'fixture.wav',
      );
      await _tap(tester, _button('등록'), dialog: true);
      await tester.tap(_button('등록'));
      await tester.pump();
      expect(store.calls, 1);
      expect(find.text('IMSLP 자료 등록'), findsOneWidget);
      expect(tester.widget<DdiroriButton>(_button('취소')).onPressed, isNull);
      expect(tester.widget<DdiroriButton>(_button('등록')).busy, isTrue);
      await tester.binding.handlePopRoute();
      await tester.pump();
      expect(find.text('IMSLP 자료 등록'), findsOneWidget);
      store.pending.completeError(StateError('store'));
      await tester.pumpAndSettle();
      expect(find.textContaining('자료를 저장하지 못했습니다'), findsOneWidget);
      final fields = tester
          .widgetList<TextField>(
            find.descendant(
              of: find.byType(AlertDialog),
              matching: find.byType(TextField),
            ),
          )
          .toList();
      expect(fields[0].controller!.text, 'https://s9.imslp.org/fixture.wav');
      expect(fields[1].controller!.text, 'fixture.wav');
      final firstId = store.attempts.single.id;
      store.pending = Completer<void>();
      await _tap(tester, _button('등록'), dialog: true);
      expect(store.calls, 2);
      expect(store.attempts.last.id, firstId);
      store.pending.complete();
      await tester.pumpAndSettle();
      expect(find.text('IMSLP 자료 등록'), findsNothing);
      final saved = (await store.loadResources(
        sampleClassicalLibrary.works.first.id,
      )).single;
      expect(saved.rightsStatus, ImslpRightsStatus.reviewRequired);
      expect(
        const ImslpDownloadPolicy().decide(saved),
        ImslpDownloadDecision.externalPageRequired,
      );
    },
  );

  for (final width in [320.0, 390.0, 1024.0]) {
    testWidgets(
      'IMSLP and dialog fit $width at 200% dark, safe area and reduced motion',
      (tester) async {
        tester.view.physicalSize = Size(width, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final store = MemoryImslpStore();
        await _link(store);
        await tester.pumpWidget(
          MaterialApp(
            theme: ddiroriTheme(brightness: Brightness.dark),
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: const TextScaler.linear(2),
                padding: const EdgeInsets.only(top: 24, bottom: 20),
                disableAnimations: true,
              ),
              child: child!,
            ),
            home: ImslpLibraryScreen(
              library: sampleClassicalLibrary,
              store: store,
              client: _Client(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await _tap(tester, find.byTooltip('검증된 직접 URL 등록'));
        await tester.pumpAndSettle();
        await _tap(tester, _button('등록'), dialog: true);
        await tester.pumpAndSettle();
        expect(
          find.textContaining('공식 IMSLP HTTPS 직접 URL과 원본 파일명'),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        await _tap(tester, _button('취소'), dialog: true);
        await tester.pumpAndSettle();
      },
    );
  }
}

Finder _button(String label) => find.byWidgetPredicate(
  (widget) => widget is DdiroriButton && widget.label == label,
);
Future<void> _tap(
  WidgetTester tester,
  Finder finder, {
  bool dialog = false,
}) async {
  final scroll = find
      .descendant(
        of: find.byType(dialog ? AlertDialog : ListView),
        matching: find.byType(Scrollable),
      )
      .first;
  await tester.scrollUntilVisible(finder, 180, scrollable: scroll);
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pump();
}

Future<void> _search(WidgetTester tester, String text) async {
  await tester.enterText(find.byType(TextField).first, text);
  await tester.tap(find.byTooltip('IMSLP 검색'));
  await tester.pump();
}

Future<void> _mount(
  WidgetTester tester, {
  ImslpCatalogClient? client,
  ImslpStore? store,
  bool withWorks = false,
  Future<bool> Function(Uri)? open,
  Future<ImslpLocalImportResult?> Function()? onImport,
  Future<void> Function(ImslpLocalImportResult)? onShow,
  Future<void> Function(ImslpLocalImportResult)? onPlay,
  Future<void> Function(ImslpWorkSearchResult, ImslpLocalImportResult)?
  onAssociate,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: ImslpLibraryScreen(
        library: withWorks ? sampleClassicalLibrary : emptyClassicalLibrary,
        store: store ?? MemoryImslpStore(),
        client: client ?? _Client(),
        openUri: open,
        onImportLocalFiles: onImport,
        onShowImportedFiles: onShow,
        onPlayImportedFiles: onPlay,
        onAssociateSource: onAssociate,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

ImslpWorkSearchResult _result(String title) => ImslpWorkSearchResult(
  externalId: 'external-$title',
  title: title,
  pageUrl: Uri.https('imslp.org', '/wiki/$title'),
);

class _Client implements ImslpCatalogClient {
  final queries = <String>[];
  final calls = <Completer<List<ImslpWorkSearchResult>>>[];
  @override
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 10,
  }) {
    queries.add(query);
    final call = Completer<List<ImslpWorkSearchResult>>();
    calls.add(call);
    return call.future;
  }
}

class _DelayedLoadStore extends MemoryImslpStore {
  _DelayedLoadStore(this.pending);
  final Completer<List<ImslpWorkLink>> pending;
  @override
  Future<List<ImslpWorkLink>> loadWorkLinks() => pending.future;
}

Future<void> _link(ImslpStore store) => store.upsertWorkLink(
  ImslpWorkLink(
    workId: sampleClassicalLibrary.works.first.id,
    externalId: 'official',
    pageUrl: 'https://imslp.org/wiki/Official',
    workTitle: 'Official',
    linkedAtMillis: 1,
  ),
);

class _ResourceStore extends MemoryImslpStore {
  Completer<void> pending = Completer<void>();
  int calls = 0;
  final attempts = <ImslpResource>[];
  @override
  Future<void> saveResources(
    String workId,
    List<ImslpResource> resources,
  ) async {
    calls++;
    attempts.add(resources.last);
    await pending.future;
    await super.saveResources(workId, resources);
  }
}

class _RecoveryCoordinator extends ImslpImportCoordinator {
  _RecoveryCoordinator()
    : super(
        store: MemoryImslpStore(),
        downloadService: const ImslpDownloadService(),
        destination: Directory.systemTemp,
        scanner: const FileSystemAudioFileScanner(),
        scannedAudioRepository: ScannedAudioRepository(
          MemoryScannedAudioStore(),
        ),
        metadataCandidateRepository: MetadataCandidateRepository(
          MemoryMetadataCandidateStore(),
        ),
      );
  bool remaining = true;
  bool failList = false;
  int calls = 0;
  Completer<ImslpImportRecord> pending = Completer<ImslpImportRecord>();
  ImslpDownloadCancellation? cancellation;
  @override
  Future<List<ImslpResource>> recoverableResources() async {
    if (failList) throw StateError('list');
    return remaining
        ? [
            const ImslpResource(
              id: 'recovery',
              workId: 'work',
              pageUrl: 'https://imslp.org/wiki/Fixture',
              directDownloadUrl: 'https://s9.imslp.org/fixture.wav',
              originalFileName: 'fixture.wav',
              kind: ImslpResourceKind.audio,
              rightsStatus: ImslpRightsStatus.freeLicense,
              fetchedAtMillis: 1,
            ),
          ]
        : [];
  }

  @override
  Future<ImslpImportRecord> import(
    ImslpResource resource, {
    required bool rightsConfirmed,
    ImslpDownloadCancellation? cancellation,
    void Function(ImslpDownloadProgress)? onProgress,
    void Function(ImslpTransferStatus)? onStage,
  }) async {
    calls++;
    this.cancellation = cancellation;
    expect(rightsConfirmed, isTrue);
    onStage?.call(ImslpTransferStatus.importing);
    return pending.future;
  }
}

const _recoveredRecord = ImslpImportRecord(
  id: 'import',
  resourceId: 'recovery',
  workId: 'work',
  sourcePageUrl: 'https://imslp.org/wiki/Fixture',
  sourceDownloadUrl: 'https://s9.imslp.org/fixture.wav',
  originalFileName: 'fixture.wav',
  localPath: '/fixture.wav',
  sha256: 'fixture',
  sizeBytes: 44,
  downloadedAtMillis: 1,
  status: ImslpTransferStatus.completed,
  rightsStatus: ImslpRightsStatus.freeLicense,
  fileId: 'recovered-id',
);
