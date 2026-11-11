import 'package:classical_local_library/audio_tags.dart';
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/metadata_candidates.dart';
import 'package:classical_local_library/metadata_overrides.dart';

const searchQueries = [
  '',
  '베토벤 5번',
  'Beethoven Symphony 5',
  'Op.67',
  '운명',
  '월광 1악장',
  'ㅂㅌㅂ',
  'ㄱㅎㄱ 5',
  'Beethovn',
  'Bth',
  'Dvorak',
  'Dvořák',
  'duplicate',
  'corrected',
  'unapproved-directory',
  'FILE 17',
  'zzzzzz-not-found',
  '아티스트',
  '00000',
  'a very long impossible query without matching fields',
];

List<LocalAudioFile> searchFixtureFiles() => [
  for (var i = 0; i < 24; i++)
    LocalAudioFile(
      id: 'contract-$i',
      path: '/fixture/file-$i.flac',
      fileName: 'file-$i.flac',
      format: 'flac',
      tagMetadata: AudioTagMetadata(
        title: i < 18 ? 'duplicate' : 'Dvořák',
        album: '앨범 ${i % 3}',
        artist: '아티스트 ${i % 4}',
        composer: 'Antonín Dvořák',
      ),
    ),
  const LocalAudioFile(
    id: 'tagless',
    path: '/fixture/tagless.mp3',
    fileName: 'tagless.mp3',
    format: 'mp3',
  ),
];

const searchFixtureCandidates = [
  MetadataCandidate(
    fileId: 'tagless',
    filePath: '/fixture/tagless.mp3',
    fileName: 'tagless.mp3',
    workTitleText: 'unapproved-directory',
  ),
];
final searchFixtureOverrides = [
  MetadataOverride(
    fileId: 'contract-23',
    values: {MetadataField.movementTitle: 'corrected'},
    sources: {MetadataField.movementTitle: MetadataValueSource.user},
    updatedAtMillis: 1,
  ),
];
const searchFixtureAliases = {
  'work.beethoven.moonlight': 'work.beethoven.symphony5',
};
