import 'dart:io';

import 'package:audio_metadata_reader/audio_metadata_reader.dart' as audio;

enum AudioTagReadStatus { read, noTags, unsupported, failed }

enum AudioTagFailureKind { unsupported, invalidPath, unreadable, unexpected }

class AudioTagMetadata {
  const AudioTagMetadata({
    this.title,
    this.album,
    this.artist,
    this.albumArtist,
    this.composer,
    this.genre,
    this.year,
    this.trackNumber,
    this.trackTotal,
    this.discNumber,
    this.discTotal,
    this.work,
    this.movementTitle,
    this.movementNumber,
    this.movementTotal,
  });

  final String? title;
  final String? album;
  final String? artist;
  final String? albumArtist;
  final String? composer;
  final String? genre;
  final int? year;
  final int? trackNumber;
  final int? trackTotal;
  final int? discNumber;
  final int? discTotal;
  final String? work;
  final String? movementTitle;
  final int? movementNumber;
  final int? movementTotal;

  bool get isEmpty => [
    title,
    album,
    artist,
    albumArtist,
    composer,
    genre,
    work,
    movementTitle,
  ].every((value) => value == null || value.trim().isEmpty);

  Map<String, Object?> toJson() => {
    'title': title,
    'album': album,
    'artist': artist,
    'albumArtist': albumArtist,
    'composer': composer,
    'genre': genre,
    'year': year,
    'trackNumber': trackNumber,
    'trackTotal': trackTotal,
    'discNumber': discNumber,
    'discTotal': discTotal,
    'work': work,
    'movementTitle': movementTitle,
    'movementNumber': movementNumber,
    'movementTotal': movementTotal,
  };

  factory AudioTagMetadata.fromJson(Map<String, Object?> json) {
    return AudioTagMetadata(
      title: json['title'] as String?,
      album: json['album'] as String?,
      artist: json['artist'] as String?,
      albumArtist: json['albumArtist'] as String?,
      composer: json['composer'] as String?,
      genre: json['genre'] as String?,
      year: json['year'] as int?,
      trackNumber: json['trackNumber'] as int?,
      trackTotal: json['trackTotal'] as int?,
      discNumber: json['discNumber'] as int?,
      discTotal: json['discTotal'] as int?,
      work: json['work'] as String?,
      movementTitle: json['movementTitle'] as String?,
      movementNumber: json['movementNumber'] as int?,
      movementTotal: json['movementTotal'] as int?,
    );
  }
}

class AudioTagReadResult {
  const AudioTagReadResult({
    required this.status,
    this.metadata,
    this.failureKind,
  });

  const AudioTagReadResult.read(AudioTagMetadata this.metadata)
    : status = AudioTagReadStatus.read,
      failureKind = null;

  const AudioTagReadResult.noTags()
    : status = AudioTagReadStatus.noTags,
      metadata = null,
      failureKind = null;

  final AudioTagReadStatus status;
  final AudioTagMetadata? metadata;
  final AudioTagFailureKind? failureKind;
}

abstract class AudioTagReader {
  const AudioTagReader();

  Future<AudioTagReadResult> read(String path);
}

typedef AudioMetadataRead = audio.AudioMetadata Function(
  File track, {
  bool getImage,
});

class AudioMetadataReaderAudioTagReader extends AudioTagReader {
  const AudioMetadataReaderAudioTagReader({
    this.readMetadata = audio.readMetadata,
  });

  final AudioMetadataRead readMetadata;

  @override
  Future<AudioTagReadResult> read(String path) async {
    try {
      final tag = readMetadata(File(path), getImage: false);
      final metadata = AudioTagMetadata(
        title: _clean(tag.title),
        album: _clean(tag.album),
        artist: _clean(tag.artist),
        albumArtist: _clean(tag.albumArtist),
        genre: tag.genres.isEmpty ? null : _clean(tag.genres.first),
        year: tag.year?.year == 0 ? null : tag.year?.year,
        trackNumber: tag.trackNumber,
        trackTotal: tag.trackTotal,
        discNumber: tag.discNumber,
        discTotal: tag.totalDisc,
      );
      return metadata.isEmpty
          ? const AudioTagReadResult.noTags()
          : AudioTagReadResult.read(metadata);
    } on audio.NoMetadataParserException {
      return const AudioTagReadResult(
        status: AudioTagReadStatus.unsupported,
        failureKind: AudioTagFailureKind.unsupported,
      );
    } on audio.MetadataParserException {
      return const AudioTagReadResult(
        status: AudioTagReadStatus.failed,
        failureKind: AudioTagFailureKind.unreadable,
      );
    } on FileSystemException {
      return AudioTagReadResult(
        status: AudioTagReadStatus.failed,
        failureKind: File(path).existsSync()
            ? AudioTagFailureKind.unreadable
            : AudioTagFailureKind.invalidPath,
      );
    } on Object {
      return const AudioTagReadResult(
        status: AudioTagReadStatus.failed,
        failureKind: AudioTagFailureKind.unexpected,
      );
    }
  }

  static String? _clean(String? value) {
    final cleaned = value?.trim();
    return cleaned == null || cleaned.isEmpty ? null : cleaned;
  }
}
