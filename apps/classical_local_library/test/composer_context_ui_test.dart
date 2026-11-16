import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/composer_management.dart';
import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_library.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/main.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/scanned_audio_store.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/scan_locations.dart';
import 'package:classical_local_library/presentation/composer_management_screen.dart';

import 'composer_context_test.dart' as data;
import 'composer_library_ui_test.dart' as capture;
import 'library_navigation_test.dart' as nav;

class ContextClient implements ImslpCatalogClient {
  String? lastQuery;
  Completer<List<ImslpWorkSearchResult>>? gate;
  @override
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 10,
  }) async {
    lastQuery = query;
    if (gate != null) return gate!.future;
    return [
      ImslpWorkSearchResult(
        externalId: 'Suite',
        title: 'Suite',
        composerName: 'J. S. Bach',
        pageUrl: Uri.parse('https://imslp.org/wiki/Suite'),
      ),
      ImslpWorkSearchResult(
        externalId: 'Other',
        title: 'Other',
        composerName: 'Other Bach',
        pageUrl: Uri.parse('https://imslp.org/wiki/Other'),
      ),
    ];
  }
}

Widget app({
  required FakeLocalPlayer player,
  required ClassicalCatalogRepository catalog,
}) => ClassicalLocalLibraryApp(
  fontFamily: 'DdiroriLibraryCapture',
  initialLibrary: emptyClassicalLibrary,
  enableDemoFeatures: false,
  catalogRepository: catalog,
  playbackController: player,
  scanRepository: ScannedAudioRepository(
    MemoryScannedAudioStore(data.contextFiles),
  ),
  metadataCandidateRepository: MetadataCandidateRepository(
    MemoryMetadataCandidateStore(),
  ),
  scanLocationRepository: ScanLocationRepository(MemoryScanLocationStore()),
  fileTrackLinkRepository: AudioFileTrackLinkRepository(
    MemoryAudioFileTrackLinkStore(),
  ),
  supportsFolderScan: false,
);

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    for (final f in [
      ('DdiroriLibraryCapture', 'DDIRORI_CAPTURE_FONT'),
      ('MaterialIcons', 'DDIRORI_MATERIAL_FONT'),
    ]) {
      final p = Platform.environment[f.$2];
      if (p != null) {
        await (FontLoader(
          f.$1,
        )..addFont(File(p).readAsBytes().then(ByteData.sublistView))).load();
      }
    }
  });
  testWidgets(
    'composer save awaits, blocks duplicate/back, preserves failure draft then closes',
    (t) async {
      final gate = Completer<void>();
      int saves = 0;
      await t.pumpWidget(
        MaterialApp(
          theme: ddiroriTheme(),
          home: Builder(
            builder: (c) => Scaffold(
              body: DdiroriButton(
                label: '정보 열기',
                onPressed: () => showDialog<void>(
                  context: c,
                  builder: (_) => ComposerEditor(
                    onSave: (a, b, c, d, e) async {
                      saves++;
                      if (saves == 1) {
                        await gate.future;
                        throw StateError('fixture');
                      }
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await capture.tap(t, find.text('정보 열기'));
      await t.enterText(find.widgetWithText(TextField, '표시 이름 (한글)'), '새 작곡가');
      await t.enterText(
        find.widgetWithText(TextField, '이름·별칭 확인 출처'),
        '사용자 확인',
      );
      await t.ensureVisible(find.text('저장'));
      await t.tap(find.text('저장'));
      await t.pump();
      expect(saves, 1);
      final saving = t.widget<DdiroriButton>(
        find.byWidgetPredicate((w) => w is DdiroriButton && w.label == '저장'),
      );
      expect(saving.busy, isTrue);
      saving.onPressed?.call();
      await t.pump();
      expect(saves, 1);
      final dialog = t.widget<PopScope>(
        find
            .ancestor(
              of: find.byType(AlertDialog),
              matching: find.byType(PopScope),
            )
            .first,
      );
      expect(dialog.canPop, isFalse);
      gate.complete();
      await t.pumpAndSettle();
      expect(find.textContaining('입력은 유지'), findsOneWidget);
      expect(find.text('새 작곡가'), findsOneWidget);
      await capture.tap(t, find.text('저장'));
      expect(saves, 2);
      expect(find.byType(AlertDialog), findsNothing);
    },
  );
  testWidgets(
    'period filter and composer edits preserve engine queue/position and visit on back',
    (t) async {
      final player = FakeLocalPlayer();
      final catalog = ClassicalCatalogRepository(
        MemoryClassicalCatalogStore(data.contextLibrary(withWork: false)),
      );
      await t.pumpWidget(app(player: player, catalog: catalog));
      await t.pumpAndSettle();
      await nav.openCategory(t, 'songs');
      await capture.tap(t, find.byKey(const ValueKey('lazy:file-row-f')));
      await player.seek(const Duration(seconds: 7));
      await t.pumpAndSettle();
      final queue = player.queue;
      await capture.tap(t, find.byTooltip('시대: 전체'));
      await capture.tap(t, find.text('시대 미분류'));
      expect(find.byKey(const ValueKey('lazy:file-row-f')), findsNothing);
      expect(player.queue, same(queue));
      expect(player.playbackState.position, const Duration(seconds: 7));
      await capture.tap(t, find.byTooltip('시대: 미분류'));
      await capture.tap(t, find.text('바로크'));
      expect(find.byKey(const ValueKey('lazy:file-row-f')), findsOneWidget);
      await capture.tap(t, find.byTooltip('뒤로'));
      await t.pumpAndSettle();
      await nav.openCategory(t, 'composers');
      await capture.tap(t, find.text('작곡가 관리'));
      expect(find.text('작곡가 등록'), findsOneWidget);
      await t.pageBack();
      await t.pumpAndSettle();
      expect(find.byTooltip('시대: 전체'), findsOneWidget);
      expect(player.queue, same(queue));
      expect(player.playbackState.position, const Duration(seconds: 7));
    },
  );
  testWidgets(
    'IMSLP composer context, mismatch evidence and cancellation require explicit confirmation',
    (t) async {
      final client = ContextClient(), store = MemoryImslpStore();
      await t.pumpWidget(
        MaterialApp(
          theme: ddiroriTheme(),
          home: ImslpLibraryScreen(
            library: data.contextLibrary(),
            store: store,
            client: client,
            contextComposer: data.contextLibrary().people.single,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Johann Sebastian Bach'), findsOneWidget);
      await capture.tap(t, find.byTooltip('IMSLP 검색'));
      expect(client.lastQuery, 'Johann Sebastian Bach');
      expect(find.textContaining('작곡가 이름 다름'), findsOneWidget);
      expect(
        find.byTooltip('이 작품 연결'),
        findsNothing,
      ); // no implicit first Work selection
      await capture.tap(t, find.byType(DropdownButtonFormField<Work>));
      await capture.tap(t, find.text('모음곡').last);
      await capture.tap(t, find.byTooltip('IMSLP 검색'));
      await capture.tap(t, find.byTooltip('이 작품 연결').last);
      expect(find.textContaining('작곡가 이름 다름'), findsNWidgets(2));
      await capture.tap(t, find.text('취소'));
      expect(await store.loadWorkLinks(), isEmpty);
    },
  );
  testWidgets(
    'late IMSLP success cannot replace results after context changes or cancellation',
    (t) async {
      final client = ContextClient()..gate = Completer();
      await t.pumpWidget(
        MaterialApp(
          theme: ddiroriTheme(),
          home: ImslpLibraryScreen(
            library: data.contextLibrary(),
            store: MemoryImslpStore(),
            client: client,
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('IMSLP 검색'));
      await t.pump();
      await t.ensureVisible(find.text('검색 취소'));
      await t.tap(find.text('검색 취소'));
      await t.pumpAndSettle();
      client.gate!.complete([
        ImslpWorkSearchResult(
          externalId: 'stale',
          title: 'Stale',
          pageUrl: Uri.parse('https://imslp.org/wiki/Stale'),
        ),
      ]);
      await t.pumpAndSettle();
      expect(find.text('Stale'), findsNothing);
    },
  );
  testWidgets(
    'merged Work context writes only canonical ID and unlink preserves local catalog',
    (t) async {
      final base = data.contextLibrary();
      final library = copyCatalog(
        base,
        works: [
          ...base.works,
          const Work(
            id: 'canonical',
            composerId: 'bach',
            title: LocalizedName(
              ko: '대표 모음곡',
              sortName: 'Suite',
              english: 'Suite',
            ),
          ),
        ],
      );
      final store = MemoryImslpStore();
      await t.pumpWidget(
        MaterialApp(
          theme: ddiroriTheme(),
          home: ImslpLibraryScreen(
            library: library,
            store: store,
            client: ContextClient(),
            initialWorkId: 'work',
            canonicalWorkId: (id) => id == 'work' ? 'canonical' : id,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('대표 모음곡'), findsOneWidget);
      expect(find.text('모음곡'), findsNothing);
      await capture.tap(t, find.byTooltip('IMSLP 검색'));
      await capture.tap(t, find.byTooltip('이 작품 연결').first);
      expect(await store.loadWorkLinks(), isEmpty);
      await capture.tap(t, find.text('연결'));
      expect((await store.loadWorkLinks()).single.workId, 'canonical');
      await capture.tap(t, find.byTooltip('연결 해제'));
      await capture.tap(t, find.text('해제'));
      expect(await store.loadWorkLinks(), isEmpty);
      expect(library.works, hasLength(2));
    },
  );
  testWidgets(
    'composer file connect cancellation never writes and confirmation/unlink do',
    (t) async {
      final lib = data.contextLibrary(withWork: false);
      final catalog = ClassicalCatalogRepository(
        MemoryClassicalCatalogStore(lib),
      );
      await t.pumpWidget(
        MaterialApp(
          theme: ddiroriTheme(),
          home: ComposerManagementScreen(
            repository: ComposerRepository(catalog),
            library: lib,
            files: data.contextFiles,
            file: data.contextFiles.single,
            onChanged: (_) {},
          ),
        ),
      );
      await t.pumpAndSettle();
      await capture.tap(t, find.text('바흐'));
      await capture.tap(t, find.text('취소'));
      expect(
        (await catalog.load(data.contextFiles))
            .people
            .single
            .composerProfile!
            .confirmedFileIds,
        isEmpty,
      );
      await capture.tap(t, find.text('바흐'));
      await capture.tap(t, find.text('확인 후 연결'));
      expect(
        (await catalog.load(data.contextFiles))
            .people
            .single
            .composerProfile!
            .confirmedFileIds,
        ['f'],
      );
      await capture.tap(t, find.text('작곡가 ID 연결 해제'));
      await capture.tap(t, find.text('연결 해제'));
      expect(
        (await catalog.load(data.contextFiles))
            .people
            .single
            .composerProfile!
            .excludedFileIds,
        ['f'],
      );
    },
  );
  for (final width in [320.0, 390.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      for (final dark in [false, true]) {
        final profile =
            '${width.toInt()}-${scale.toInt()}-${dark ? 'dark' : 'light'}';
        testWidgets('composer context accessible $profile', (t) async {
          t.view.physicalSize = Size(width, 1000);
          t.view.devicePixelRatio = 1;
          addTearDown(t.view.resetPhysicalSize);
          addTearDown(t.view.resetDevicePixelRatio);
          final lib = data.contextLibrary();
          final repo = ComposerRepository(
            ClassicalCatalogRepository(MemoryClassicalCatalogStore(lib)),
          );
          final key = GlobalKey();
          final semantics = t.ensureSemantics();
          Widget shell(Widget child) => MaterialApp(
            theme: ddiroriTheme(
              brightness: dark ? Brightness.dark : Brightness.light,
              fontFamily: 'DdiroriLibraryCapture',
            ),
            builder: (context, c) => MediaQuery(
              data: MediaQuery.of(context).copyWith(
                textScaler: TextScaler.linear(scale),
                disableAnimations: true,
              ),
              child: RepaintBoundary(key: key, child: c!),
            ),
            home: child,
          );
          await t.pumpWidget(
            shell(
              ComposerManagementScreen(
                repository: repo,
                library: lib,
                files: data.contextFiles,
                onChanged: (_) {},
              ),
            ),
          );
          await t.pumpAndSettle();
          expect(t.takeException(), isNull);
          expect(
            t.getSize(find.widgetWithText(DdiroriButton, '작곡가 등록')).height,
            greaterThanOrEqualTo(48),
          );
          expect(find.bySemanticsLabel('작곡가 등록'), findsOneWidget);
          semantics.dispose();
          await capture.capture(t, key, 'composer-management-$profile');
          await capture.tap(t, find.text('작곡가 등록'));
          expect(find.byType(AlertDialog), findsOneWidget);
          await t.enterText(
            find.widgetWithText(TextField, '표시 이름 (한글)'),
            '매우 긴 한글 작곡가 이름 Original Name',
          );
          await t.pumpAndSettle();
          expect(t.takeException(), isNull);
          await capture.capture(t, key, 'composer-editor-$profile');
          final label = find
              .descendant(
                of: find.widgetWithText(TextField, '표시 이름 (한글)'),
                matching: find.text('표시 이름 (한글)'),
              )
              .first;
          final viewport = find
              .descendant(
                of: find.byType(AlertDialog),
                matching: find.byType(SingleChildScrollView),
              )
              .first;
          expect(
            t.getTopLeft(label).dy,
            greaterThanOrEqualTo(t.getTopLeft(viewport).dy),
          );
          await capture.tap(t, find.text('취소'));
          await t.pumpWidget(
            shell(
              ImslpLibraryScreen(
                library: lib,
                store: MemoryImslpStore(),
                client: ContextClient(),
                contextComposer: lib.people.single,
              ),
            ),
          );
          await t.pumpAndSettle();
          await capture.tap(t, find.byTooltip('IMSLP 검색'));
          await capture.capture(t, key, 'composer-imslp-$profile');
          expect(t.takeException(), isNull);
          await t.pumpWidget(
            shell(
              WorkPeriodEditor(work: lib.works.single, onSave: (_) async {}),
            ),
          );
          await t.pumpAndSettle();
          await t.enterText(
            find.widgetWithText(TextField, '시대 확인 출처'),
            '사용자 확인 · 작품 자료',
          );
          await t.pumpAndSettle();
          await capture.capture(t, key, 'composer-period-$profile');
          expect(t.takeException(), isNull);
        });
      }
    }
  }
}
