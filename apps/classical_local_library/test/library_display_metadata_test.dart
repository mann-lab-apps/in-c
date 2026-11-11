import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/local_file_library.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/file_links.dart';
import 'package:classical_local_library/playback_planner.dart';
import 'package:classical_local_library/sample_classical_library.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const library = LocalFileLibrary();
  const file = LocalAudioFile(
    id: 'file',
    path: '/container/managed_audio/song.wav',
    fileName: 'song.wav',
    format: 'wav',
  );
  const candidate = MetadataCandidate(
    fileId: 'file',
    filePath: '/container/managed_audio/song.wav',
    fileName: 'song.wav',
    composerText: 'container',
    workTitleText: 'managed_audio',
    movementText: 'inferred title',
    artistText: 'inferred artist',
  );
  test('unreviewed and rejected inference stays out of listening metadata', () {
    for (final status in [
      MetadataReviewStatus.needsReview,
      MetadataReviewStatus.rejected,
    ]) {
      final entry = library
          .entries(
            files: [file],
            candidates: [candidate.copyWith(reviewStatus: status)],
          )
          .single;
      expect(entry.title, 'song');
      expect(entry.artist, '아티스트 정보 없음');
      expect(entry.album, '앨범 정보 없음');
      final queue = library.queue([entry]);
      expect(queue.single.artist, isNull);
      expect(queue.single.album, isNull);
    }
  });
  test('linked classical queue follows the listening policy without changing catalog context', () {
    final plan = ClassicalPlaybackPlanner(
      library: sampleClassicalLibrary,
      workSelector: (values) => values.first,
      recordingSelector: (values) => values.first,
    ).createPlan(PlaybackMode.workRandom);
    final links = [
      AudioFileTrackLink(
        fileId: file.id,
        trackId: plan.items.first.track.id,
        linkedAtMillis: 1,
      ),
    ];
    LocalPlaybackQueueItem build(LocalAudioFile source) =>
        const LocalPlaybackQueueBuilder()
            .build(
              plan: plan,
              scannedFiles: [source],
              links: links,
              candidates: [candidate],
            )
            .first;
    final unknown = build(file);
    expect(unknown.displayTitle, plan.items.first.displayTitle);
    expect(unknown.workTitle, plan.work.title.ko);
    expect(unknown.artist, isNull);
    expect(unknown.album, isNull);
    final tagged = build(
      file.copyWith(
        tagMetadata: const AudioTagMetadata(
          title: '태그 곡명',
          album: '별도 앨범',
          albumArtist: '태그 연주자',
          composer: '작곡가',
        ),
      ),
    );
    expect(tagged.displayTitle, '태그 곡명');
    expect(tagged.artist, '태그 연주자');
    expect(tagged.album, '별도 앨범');
    expect(tagged.workTitle, plan.work.title.ko);
    expect(tagged.trackId, unknown.trackId);
    expect(tagged.path, unknown.path);
  });
  test(
    'user correction takes priority over tags, approved candidate fills gaps',
    () {
      final entry = library
          .entries(
            files: [
              file.copyWith(
                tagMetadata: const AudioTagMetadata(
                  title: 'tag title',
                  album: 'tag album',
                  artist: 'tag artist',
                ),
              ),
            ],
            candidates: [
              candidate.copyWith(reviewStatus: MetadataReviewStatus.approved),
            ],
            overrides: [
              MetadataOverride(
                fileId: 'file',
                values: {
                  MetadataField.movementTitle: 'corrected title',
                  MetadataField.workTitle: 'corrected album',
                  MetadataField.performer: 'corrected artist',
                },
                sources: {
                  for (final field in [
                    MetadataField.movementTitle,
                    MetadataField.workTitle,
                    MetadataField.performer,
                  ])
                    field: MetadataValueSource.user,
                },
                updatedAtMillis: 1,
              ),
            ],
          )
          .single;
      expect(entry.title, 'corrected title');
      expect(entry.album, 'corrected album');
      expect(entry.artist, 'corrected artist');
      expect(
        library
            .entries(
              files: [file],
              candidates: [
                candidate.copyWith(reviewStatus: MetadataReviewStatus.approved),
              ],
            )
            .single
            .title,
        'inferred title',
      );
    },
  );

  test('display refresh preserves sources, queue position, playback state and rejects changed paths', () async {
    final player = FakeLocalPlayer();
    final controller = SerializedLocalPlaybackController(player);
    final old = library.queue(library.entries(files: [file]));
    await controller.loadQueue(old);
    await controller.play();
    await controller.seek(const Duration(seconds: 2));
    final before = player.playbackState;
    final updated = library.queue(
      library.entries(
        files: [
          file.copyWith(tagMetadata: const AudioTagMetadata(title: '새 제목')),
        ],
      ),
    );
    await controller.updateMetadata({updated.single.trackId: updated.single});
    expect(player.playbackState.currentItem!.displayTitle, '새 제목');
    expect(player.playbackState.position, before.position);
    expect(player.playbackState.currentIndex, before.currentIndex);
    expect(player.playbackState.playerState, before.playerState);
    final wrong = library.queue(
      library.entries(files: [file.copyWith(path: '/replacement.wav')]),
    );
    await controller.updateMetadata({wrong.single.trackId: wrong.single});
    expect(player.playbackState.currentItem!.path, file.path);
    await controller.dispose();
  });
}
