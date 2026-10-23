import 'package:classical_local_library/catalog_registration_screen.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/library_catalog.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('추론값을 채우고 악장 순서를 바꿔 등록 초안을 만든다', (tester) async {
    tester.view.physicalSize = const Size(1200, 2600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    CatalogRecordingDraft? result;
    final files = [
      _file('first', '01 Allegro.flac'),
      _file('second', '02 Largo.flac'),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => FilledButton(
            onPressed: () async {
              result = await Navigator.of(context).push<CatalogRecordingDraft>(
                MaterialPageRoute(
                  builder: (context) => CatalogRegistrationScreen(
                    library: emptyClassicalLibrary,
                    files: files,
                    candidates: [
                      _candidate(files[0], 'Allegro', 1),
                      _candidate(files[1], 'Largo', 2),
                    ],
                    overrides: const [],
                  ),
                ),
              );
            },
            child: const Text('열기'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(TextFormField, 'Bach'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Suite No. 1'), findsOneWidget);
    await tester.tap(find.byTooltip('위로 이동').last);
    await tester.pump();
    await tester.tap(find.text('라이브러리에 저장'));
    await tester.pumpAndSettle();

    expect(result, isNotNull);
    expect(result!.composerName, 'Bach');
    expect(result!.workTitle, 'Suite No. 1');
    expect(result!.movements.map((movement) => movement.fileId), [
      'second',
      'first',
    ]);
    expect(result!.movements.map((movement) => movement.sequenceNumber), [
      1,
      2,
    ]);
  });

  testWidgets('뒤로 가면 등록 초안을 만들지 않는다', (tester) async {
    CatalogRecordingDraft? result;
    final file = _file('first', '01 Allegro.flac');
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => FilledButton(
            onPressed: () async {
              result = await Navigator.of(context).push<CatalogRecordingDraft>(
                MaterialPageRoute(
                  builder: (context) => CatalogRegistrationScreen(
                    library: emptyClassicalLibrary,
                    files: [file],
                    candidates: [_candidate(file, 'Allegro', 1)],
                    overrides: const [],
                  ),
                ),
              );
            },
            child: const Text('열기'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('열기'));
    await tester.pumpAndSettle();
    await tester.pageBack();
    await tester.pumpAndSettle();

    expect(result, isNull);
  });

  testWidgets('좁은 화면과 큰 글자에서도 등록 폼이 overflow 없이 스크롤된다', (tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final file = _file('narrow', '아주 긴 이름의 교향곡 제1악장 Allegro.flac');

    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(1.8)),
          child: child!,
        ),
        home: CatalogRegistrationScreen(
          library: emptyClassicalLibrary,
          files: [file],
          candidates: [_candidate(file, '아주 긴 이름의 제1악장 Allegro', 1)],
          overrides: const [],
        ),
      ),
    );
    await tester.pump();
    await tester.drag(find.byType(ListView), const Offset(0, -700));
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.text('라이브러리에 저장'), findsOneWidget);
  });
}

LocalAudioFile _file(String id, String name) => LocalAudioFile(
  id: id,
  path: '/music/$name',
  fileName: name,
  format: 'FLAC',
  importStatus: AudioImportStatus.needsReview,
);

MetadataCandidate _candidate(
  LocalAudioFile file,
  String movement,
  int sequence,
) => MetadataCandidate(
  fileId: file.id,
  filePath: file.path,
  fileName: file.fileName!,
  composerText: 'Bach',
  workTitleText: 'Suite No. 1',
  movementText: movement,
  trackNumber: sequence,
);
