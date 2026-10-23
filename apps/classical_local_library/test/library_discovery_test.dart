import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/library_discovery.dart';
import 'package:classical_local_library/library_discovery_screen.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

void main() {
  const service = LibraryDiscoveryService();

  test('finds other works by composer and recordings by person', () {
    final works = service.otherWorksByComposer(
      sampleClassicalLibrary,
      workId: 'work.beethoven.symphony5',
    );
    final recordings = service.recordingsByPerson(
      sampleClassicalLibrary,
      personId: 'person.carlos-kleiber',
    );

    expect(
      works.map((result) => result.id),
      contains('work.beethoven.moonlight'),
    );
    expect(recordings, isNotEmpty);
    expect(
      recordings.every((result) => result.reason.contains('카를로스')),
      isTrue,
    );
  });

  test('uses corrected metadata when discovering related works for a file', () {
    const file = LocalAudioFile(
      id: 'file-1',
      path: '/private/unknown.flac',
      format: 'flac',
    );
    final override = MetadataOverride(
      fileId: file.id,
      values: const {
        MetadataField.composer: '베토벤',
        MetadataField.workTitle: '교향곡 5번 다단조',
      },
      sources: const {
        MetadataField.composer: MetadataValueSource.user,
        MetadataField.workTitle: MetadataValueSource.musicBrainz,
      },
      updatedAtMillis: 1,
    );

    final results = service.relatedToFile(
      library: sampleClassicalLibrary,
      file: file,
      override: override,
    );

    expect(
      results.map((result) => result.id),
      contains('work.beethoven.symphony5'),
    );
    expect(results.first.reason, contains('교정·승인'));
  });

  test('builds related recordings and works from recent history', () {
    final recording = sampleClassicalLibrary.recordings.firstWhere(
      (item) => item.workId == 'work.beethoven.symphony5',
    );
    final results = service.fromHistory(sampleClassicalLibrary, [
      PlayHistoryEntry(
        playedAt: DateTime.utc(2026, 10, 20),
        recordingId: recording.id,
      ),
    ]);

    expect(results, isNotEmpty);
    expect(results.any((result) => result.id == recording.id), isFalse);
  });

  test('canonical aliases deduplicate discovery results deterministically', () {
    final results = service.otherWorksByComposer(
      sampleClassicalLibrary,
      workId: 'work.beethoven.symphony5',
      workAliases: const {
        'work.beethoven.moonlight': 'work.beethoven.symphony5',
      },
    );

    expect(
      results.where((result) => result.id == 'work.beethoven.symphony5'),
      isEmpty,
    );
    expect(
      results.map((result) => result.title).toList(),
      orderedEquals(results.map((result) => result.title).toList()..sort()),
    );
  });

  testWidgets(
    'discovery screen explains results and selects one on a narrow screen',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      DiscoveryResult? selected;
      const result = DiscoveryResult(
        type: DiscoveryResultType.work,
        id: 'work-1',
        title: '교향곡 5번',
        reason: '최근 감상과 같은 작곡가의 작품',
      );
      await tester.pumpWidget(
        MaterialApp(
          home: LibraryDiscoveryScreen(
            sections: const [
              DiscoverySection(title: '최근 감상에서 이어서', results: [result]),
            ],
            onOpen: (value) => selected = value,
            onPlay: (_) {},
          ),
        ),
      );

      expect(find.text('최근 감상과 같은 작곡가의 작품'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.tap(find.text('교향곡 5번'));
      expect(selected?.id, 'work-1');
    },
  );
}
