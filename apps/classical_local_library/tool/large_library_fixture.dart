import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/file_links.dart';

class LargeLibraryFixture {
  const LargeLibraryFixture({required this.library, required this.links});

  final ClassicalLibrary library;
  final List<AudioFileTrackLink> links;
}

LargeLibraryFixture buildLargeLibraryFixture({
  int composerCount = 100,
  int worksPerComposer = 10,
  int tracksPerWork = 5,
}) {
  final people = <ClassicalPerson>[];
  final works = <Work>[];
  final parts = <WorkPart>[];
  final recordings = <Recording>[];
  final tracks = <Track>[];
  final files = <LocalAudioFile>[];
  final links = <AudioFileTrackLink>[];
  var workIndex = 0;
  var trackIndex = 0;
  for (
    var composerIndex = 0;
    composerIndex < composerCount;
    composerIndex += 1
  ) {
    final personId = 'person-$composerIndex';
    people.add(
      ClassicalPerson(
        id: personId,
        name: LocalizedName(
          ko: '작곡가 $composerIndex',
          sortName: 'composer ${composerIndex.toString().padLeft(3, '0')}',
          original: 'Composer $composerIndex',
        ),
      ),
    );
    for (var localWork = 0; localWork < worksPerComposer; localWork += 1) {
      final workId = 'work-$workIndex';
      final recordingId = 'recording-$workIndex';
      final trackIds = <String>[];
      works.add(
        Work(
          id: workId,
          composerId: personId,
          title: LocalizedName(
            ko: '작품 $workIndex',
            sortName: 'work ${workIndex.toString().padLeft(4, '0')}',
            original: 'Work $workIndex',
          ),
          catalogNumber: 'CAT $workIndex',
        ),
      );
      for (var movement = 1; movement <= tracksPerWork; movement += 1) {
        final partId = 'part-$workIndex-$movement';
        final trackId = 'track-$trackIndex';
        final fileId = 'file-$trackIndex';
        parts.add(
          WorkPart(
            id: partId,
            workId: workId,
            title: LocalizedName(
              ko: '$movement악장',
              sortName: movement.toString().padLeft(2, '0'),
            ),
            sequenceNumber: movement,
          ),
        );
        tracks.add(
          Track(
            id: trackId,
            recordingId: recordingId,
            fileId: fileId,
            sequenceNumber: movement,
            workPartIds: [partId],
            duration: Duration(minutes: 3 + movement),
          ),
        );
        files.add(
          LocalAudioFile(
            id: fileId,
            path: '/fixture/$fileId.flac',
            fileName: '$fileId.flac',
            format: 'FLAC',
            sizeBytes: 1000000 + trackIndex,
          ),
        );
        links.add(
          AudioFileTrackLink(
            fileId: fileId,
            trackId: trackId,
            linkedAtMillis: trackIndex,
          ),
        );
        trackIds.add(trackId);
        trackIndex += 1;
      }
      recordings.add(
        Recording(
          id: recordingId,
          workId: workId,
          title: LocalizedName(
            ko: '녹음 $workIndex',
            sortName: 'recording ${workIndex.toString().padLeft(4, '0')}',
          ),
          trackIds: trackIds,
        ),
      );
      workIndex += 1;
    }
  }
  return LargeLibraryFixture(
    library: ClassicalLibrary(
      people: people,
      instruments: const [],
      ensembles: const [],
      works: works,
      workParts: parts,
      albums: const [],
      recordings: recordings,
      tracks: tracks,
      files: files,
    ),
    links: links,
  );
}
