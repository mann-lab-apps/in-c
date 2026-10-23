import 'package:classical_local_library/imslp.dart';
import 'package:classical_local_library/imslp_library.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('empty catalog shows a safe IMSLP prerequisite state', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ImslpLibraryScreen(
          library: emptyClassicalLibrary,
          store: MemoryImslpStore(),
          client: const _FakeClient(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('IMSLP 자료'), findsOneWidget);
    expect(find.textContaining('먼저 음원 파일을 작품과 녹음에 정리'), findsOneWidget);
    expect(find.byTooltip('IMSLP 검색'), findsNothing);
  });

  testWidgets('search candidate is linked only after confirmation', (
    tester,
  ) async {
    final store = MemoryImslpStore();
    await tester.pumpWidget(
      MaterialApp(
        home: ImslpLibraryScreen(
          library: sampleClassicalLibrary,
          store: store,
          client: const _FakeClient(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('IMSLP 검색'));
    await tester.pumpAndSettle();
    expect(find.text('Symphony No.5, Op.67'), findsOneWidget);

    await tester.tap(find.byTooltip('이 작품 연결'));
    await tester.pumpAndSettle();
    expect(find.text('IMSLP 작품 연결'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, '연결'));
    await tester.pumpAndSettle();

    expect(await store.loadWorkLinks(), hasLength(1));
    expect(find.textContaining('자료별 권리'), findsOneWidget);
  });

  testWidgets('regional resource is shown with external-page fallback', (
    tester,
  ) async {
    final store = MemoryImslpStore();
    final work = sampleClassicalLibrary.works.first;
    await store.upsertWorkLink(
      ImslpWorkLink(
        workId: work.id,
        externalId: 'Symphony No.5, Op.67 (Beethoven, Ludwig van)',
        pageUrl: 'https://imslp.org/wiki/Symphony_No.5,_Op.67_(Beethoven,_Ludwig_van)',
        workTitle: 'Symphony No.5, Op.67',
        linkedAtMillis: 1,
      ),
    );
    await store.saveResources(work.id, [
      ImslpResource(
        id: 'resource-1',
        workId: work.id,
        pageUrl: 'https://imslp.org/wiki/Symphony_No.5,_Op.67_(Beethoven,_Ludwig_van)',
        kind: ImslpResourceKind.audio,
        rightsStatus: ImslpRightsStatus.regionalRestriction,
        fetchedAtMillis: 1,
        directDownloadUrl: 'https://s9.imslp.org/files/test.mp3',
        originalFileName: 'test.mp3',
        isSoundRecording: true,
      ),
    ]);
    Uri? opened;
    await tester.pumpWidget(
      MaterialApp(
        home: ImslpLibraryScreen(
          library: sampleClassicalLibrary,
          store: store,
          client: const _FakeClient(),
          openUri: (uri) async {
            opened = uri;
            return true;
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('국가별 이용 조건'), findsOneWidget);
    expect(find.textContaining('녹음·실연 권리'), findsOneWidget);
    expect(find.byTooltip('확인 후 다운로드'), findsNothing);
    await tester.tap(find.byTooltip('IMSLP 페이지에서 확인'));
    await tester.pump();
    expect(opened?.host, 'imslp.org');
  });
}

class _FakeClient implements ImslpCatalogClient {
  const _FakeClient();

  @override
  Future<List<ImslpWorkSearchResult>> searchWorks(
    String query, {
    int limit = 10,
  }) async => [
    ImslpWorkSearchResult(
      externalId: 'Symphony No.5, Op.67 (Beethoven, Ludwig van)',
      title: 'Symphony No.5, Op.67',
      composerName: 'Beethoven, Ludwig van',
      pageUrl: Uri.parse(
        'https://imslp.org/wiki/Symphony_No.5,_Op.67_(Beethoven,_Ludwig_van)',
      ),
    ),
  ];
}
