import 'dart:convert';
import 'dart:io';

import 'classical_library_models.dart';

class AudioFileTrackLink {
  const AudioFileTrackLink({
    required this.fileId,
    required this.trackId,
    required this.linkedAtMillis,
  });

  final String fileId;
  final String trackId;
  final int linkedAtMillis;

  Map<String, Object?> toJson() {
    return {
      'fileId': fileId,
      'trackId': trackId,
      'linkedAtMillis': linkedAtMillis,
    };
  }

  factory AudioFileTrackLink.fromJson(Map<String, Object?> json) {
    return AudioFileTrackLink(
      fileId: json['fileId'] as String,
      trackId: json['trackId'] as String,
      linkedAtMillis: json['linkedAtMillis'] as int,
    );
  }
}

abstract class AudioFileTrackLinkStore {
  Future<List<AudioFileTrackLink>> load();

  Future<void> save(List<AudioFileTrackLink> links);
}

class MemoryAudioFileTrackLinkStore implements AudioFileTrackLinkStore {
  MemoryAudioFileTrackLinkStore([List<AudioFileTrackLink> seed = const []])
    : _links = [...seed];

  List<AudioFileTrackLink> _links;

  @override
  Future<List<AudioFileTrackLink>> load() async {
    return [..._links];
  }

  @override
  Future<void> save(List<AudioFileTrackLink> links) async {
    _links = [...links];
  }
}

class JsonAudioFileTrackLinkStore implements AudioFileTrackLinkStore {
  const JsonAudioFileTrackLinkStore(this.file);

  final File file;

  @override
  Future<List<AudioFileTrackLink>> load() async {
    if (!await file.exists()) {
      return [];
    }

    final decoded =
        jsonDecode(await file.readAsString()) as Map<String, Object?>;
    return [
      for (final item in decoded['links'] as List<Object?>? ?? const [])
        AudioFileTrackLink.fromJson(item! as Map<String, Object?>),
    ];
  }

  @override
  Future<void> save(List<AudioFileTrackLink> links) async {
    await file.parent.create(recursive: true);
    final payload = {
      'schemaVersion': 1,
      'links': [for (final link in links) link.toJson()],
    };
    const encoder = JsonEncoder.withIndent('  ');
    await file.writeAsString(encoder.convert(payload));
  }
}

class AudioFileTrackLinkRepository {
  const AudioFileTrackLinkRepository(this.store);

  final AudioFileTrackLinkStore store;

  Future<List<AudioFileTrackLink>> load() => store.load();

  Future<List<AudioFileTrackLink>> linkFileToTrack({
    required String fileId,
    required String trackId,
    required DateTime linkedAt,
  }) async {
    final byTrackId = <String, AudioFileTrackLink>{};
    for (final link in await store.load()) {
      if (link.trackId != trackId && link.fileId != fileId) {
        byTrackId[link.trackId] = link;
      }
    }
    byTrackId[trackId] = AudioFileTrackLink(
      fileId: fileId,
      trackId: trackId,
      linkedAtMillis: linkedAt.millisecondsSinceEpoch,
    );

    final sorted = byTrackId.values.toList()
      ..sort((a, b) => a.trackId.compareTo(b.trackId));
    await store.save(sorted);
    return sorted;
  }

  Future<List<AudioFileTrackLink>> unlinkFile(String fileId) async {
    final links = [
      for (final link in await store.load())
        if (link.fileId != fileId) link,
    ];
    await store.save(links);
    return links;
  }
}

class LinkedAudioFileResolver {
  const LinkedAudioFileResolver();

  LinkedAudioFileIndex index({
    required List<LocalAudioFile> scannedFiles,
    required List<AudioFileTrackLink> links,
  }) => LinkedAudioFileIndex(scannedFiles: scannedFiles, links: links);

  LocalAudioFile? fileForTrack({
    required Track track,
    required List<LocalAudioFile> scannedFiles,
    required List<AudioFileTrackLink> links,
  }) {
    final link = links.cast<AudioFileTrackLink?>().firstWhere(
      (candidate) => candidate?.trackId == track.id,
      orElse: () => null,
    );
    if (link == null) {
      return null;
    }

    return scannedFiles.cast<LocalAudioFile?>().firstWhere(
      (file) =>
          file?.id == link.fileId &&
          file?.availability == AudioFileAvailability.present,
      orElse: () => null,
    );
  }
}

class LinkedAudioFileIndex {
  LinkedAudioFileIndex({
    required List<LocalAudioFile> scannedFiles,
    required List<AudioFileTrackLink> links,
  }) : _filesById = {
         for (final file in scannedFiles)
           if (file.availability == AudioFileAvailability.present)
             file.id: file,
       },
       _linksByTrackId = {for (final link in links) link.trackId: link};

  final Map<String, LocalAudioFile> _filesById;
  final Map<String, AudioFileTrackLink> _linksByTrackId;

  LocalAudioFile? fileForTrack(Track track) {
    final link = _linksByTrackId[track.id];
    return link == null ? null : _filesById[link.fileId];
  }
}
