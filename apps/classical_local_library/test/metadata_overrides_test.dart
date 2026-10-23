import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('user values override tags and inferred metadata per field', () async {
    final store = MemoryMetadataOverrideStore();
    final repository = MetadataOverrideRepository(
      store,
      clock: () => DateTime.fromMillisecondsSinceEpoch(100),
    );
    await repository.applyMusicBrainzValues(
      fileId: 'file-1',
      values: const {
        MetadataField.composer: 'Ludwig van Beethoven',
        MetadataField.catalogNumber: 'Op. 67',
      },
      recordingId: 'recording-mbid',
      workId: 'work-mbid',
    );
    await repository.saveUserValues('file-1', const {
      MetadataField.composer: '루트비히 판 베토벤',
      MetadataField.movementTitle: '운명 동기',
    });

    final override = await repository.forFile('file-1');
    final effective = EffectiveFileMetadata.resolve(
      candidate: const MetadataCandidate(
        fileId: 'file-1',
        filePath: '/private/path.flac',
        fileName: 'path.flac',
        composerText: 'Beethoven',
        workTitleText: 'Symphony No. 5',
        movementText: 'Allegro con brio',
      ),
      tag: const AudioTagMetadata(
        composer: 'L. v. Beethoven',
        movementTitle: 'Allegro',
      ),
      override: override,
    );

    expect(effective.text(MetadataField.composer), '루트비히 판 베토벤');
    expect(effective.source(MetadataField.composer), MetadataValueSource.user);
    expect(effective.text(MetadataField.catalogNumber), 'Op. 67');
    expect(
      effective.source(MetadataField.catalogNumber),
      MetadataValueSource.musicBrainz,
    );
    expect(effective.text(MetadataField.workTitle), 'Symphony No. 5');
    expect(override?.musicBrainzRecordingId, 'recording-mbid');
  });

  test('clearing user values restores approved external values', () async {
    final repository = MetadataOverrideRepository(
      MemoryMetadataOverrideStore(),
    );
    await repository.applyMusicBrainzValues(
      fileId: 'file-1',
      values: const {MetadataField.composer: 'Beethoven'},
    );
    await repository.saveUserValues('file-1', const {
      MetadataField.composer: '베토벤',
      MetadataField.workTitle: '교향곡 5번',
    });

    await repository.clearUserValues('file-1');

    final restored = await repository.forFile('file-1');
    expect(restored?.text(MetadataField.composer), 'Beethoven');
    expect(
      restored?.source(MetadataField.composer),
      MetadataValueSource.musicBrainz,
    );
    expect(restored?.value(MetadataField.workTitle), isNull);
  });

  test('metadata validation rejects invalid and unsafe values', () {
    expect(
      () => MetadataOverrideValidator.validate(const {
        MetadataField.movementNumber: 0,
      }),
      throwsFormatException,
    );
    expect(
      () => MetadataOverrideValidator.validate(const {MetadataField.year: 999}),
      throwsFormatException,
    );
    expect(
      () => MetadataOverrideValidator.validate({
        MetadataField.workTitle: 'a' * 201,
      }),
      throwsFormatException,
    );
    expect(
      () => MetadataOverrideValidator.validate(const {
        MetadataField.performer: 'name\u0001hidden',
      }),
      throwsFormatException,
    );
  });
}
