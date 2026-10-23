import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/library_details.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('작품 상세는 별칭과 파일 연결을 반영하고 녹음을 결정론적으로 정렬한다', () {
    final fixture = _linkedFixture(2);
    final detail = LibraryDetailBuilder(
      library: sampleClassicalLibrary,
      scannedFiles: fixture.files,
      links: fixture.links,
      workAliases: const {'work.legacy': 'work.beethoven.symphony5'},
    ).buildWork('work.legacy');

    expect(detail.work.id, 'work.beethoven.symphony5');
    expect(detail.parts.map((part) => part.part.sequenceNumber), [1, 2, 3, 4]);
    expect(detail.parts.where((part) => part.hasLocalFile), hasLength(2));
    expect(detail.recordings.map((item) => item.recording.id), [
      'recording.beethoven5.kleiber',
      'recording.beethoven5.furtwangler',
    ]);
    expect(detail.recordings.first.availableTrackCount, 2);
  });

  test('녹음 상세는 사용자 교정과 역할, 재생 가능 상태를 보존한다', () {
    final fixture = _linkedFixture(2);
    final detail = LibraryDetailBuilder(
      library: sampleClassicalLibrary,
      scannedFiles: fixture.files,
      links: fixture.links,
      overrides: [
        MetadataOverride(
          fileId: fixture.files.first.id,
          values: const {
            MetadataField.composer: '교정 작곡가',
            MetadataField.workTitle: '사용자가 교정한 작품명',
            MetadataField.catalogNumber: '교정 번호 1',
            MetadataField.movementTitle: '사용자가 교정한 1악장',
            MetadataField.conductor: '교정 지휘자',
            MetadataField.ensemble: '교정 앙상블',
            MetadataField.year: 1976,
          },
          sources: const {
            MetadataField.composer: MetadataValueSource.user,
            MetadataField.workTitle: MetadataValueSource.user,
            MetadataField.catalogNumber: MetadataValueSource.user,
            MetadataField.movementTitle: MetadataValueSource.user,
            MetadataField.conductor: MetadataValueSource.user,
            MetadataField.ensemble: MetadataValueSource.user,
            MetadataField.year: MetadataValueSource.user,
          },
          updatedAtMillis: 1,
        ),
      ],
      recordingAliases: const {
        'recording.legacy': 'recording.beethoven5.kleiber',
      },
    ).buildRecording('recording.legacy');

    expect(detail.displayComposerName, '교정 작곡가');
    expect(detail.displayWorkTitle, '사용자가 교정한 작품명');
    expect(detail.year, 1976);
    expect(detail.tracks.first.displayTitle, '사용자가 교정한 1악장');
    expect(detail.availableTrackCount, 2);
    expect(detail.tracks.skip(2).every((track) => !track.hasLocalFile), isTrue);
    expect(detail.credits.single.name, '교정 지휘자');
    expect(detail.credits.single.roleLabel, '지휘');
    expect(detail.ensembleName, '교정 앙상블');
  });
}

({List<LocalAudioFile> files, List<AudioFileTrackLink> links}) _linkedFixture(
  int count,
) {
  final recording = sampleClassicalLibrary.recordings.first;
  final tracks = sampleClassicalLibrary.tracksForRecording(recording.id);
  final files = [
    for (var index = 0; index < count; index += 1)
      LocalAudioFile(
        id: 'detail-file-$index',
        path: '/private/music/detail-$index.flac',
        fileName: 'detail-$index.flac',
        format: 'FLAC',
        importStatus: AudioImportStatus.linked,
      ),
  ];
  return (
    files: files,
    links: [
      for (var index = 0; index < count; index += 1)
        AudioFileTrackLink(
          fileId: files[index].id,
          trackId: tracks[index].id,
          linkedAtMillis: index,
        ),
    ],
  );
}
