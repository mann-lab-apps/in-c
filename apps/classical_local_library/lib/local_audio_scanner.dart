import 'dart:convert';
import 'dart:io';

import 'audio_tags.dart';
import 'classical_library_models.dart';

const supportedAudioExtensions = {
  'flac',
  'mp3',
  'm4a',
  'alac',
  'ogg',
  'opus',
  'wav',
};

abstract class AudioFileScanner {
  Future<List<LocalAudioFile>> scan(String rootPath);
}

class FileSystemAudioFileScanner implements AudioFileScanner {
  const FileSystemAudioFileScanner({
    this.tagReader = const AudioMetadataReaderAudioTagReader(),
    this.clock = DateTime.now,
  });

  final AudioTagReader tagReader;
  final DateTime Function() clock;

  @override
  Future<List<LocalAudioFile>> scan(String rootPath) async {
    final root = Directory(rootPath);
    if (!await root.exists()) {
      return [];
    }

    final candidates = <LocalAudioFile>[];
    await for (final entity in root.list(recursive: true, followLinks: false)) {
      if (entity is! File) {
        continue;
      }

      final extension = audioExtensionForPath(entity.path);
      if (extension == null) {
        continue;
      }

      FileStat stat;
      try {
        stat = await entity.stat();
      } on FileSystemException {
        continue;
      }
      final tagResult = await tagReader.read(entity.path);
      candidates.add(
        LocalAudioFile(
          id: scannedAudioId(entity.path),
          path: entity.path,
          fileName: fileNameForPath(entity.path),
          format: extension.toUpperCase(),
          sizeBytes: stat.size,
          modifiedAtMillis: stat.modified.millisecondsSinceEpoch,
          lastSeenAtMillis: clock().millisecondsSinceEpoch,
          lightweightFingerprint:
              '${stat.size}:${stat.modified.millisecondsSinceEpoch}',
          tagReadStatus: tagResult.status,
          tagMetadata: tagResult.metadata,
          tagFailureKind: tagResult.failureKind,
          importStatus: AudioImportStatus.needsReview,
          sourceReferences: const [SourceReference(kind: SourceKind.localTag)],
        ),
      );
    }

    candidates.sort((a, b) => a.path.compareTo(b.path));
    return candidates;
  }
}

String? audioExtensionForPath(String path) {
  final fileName = fileNameForPath(path);
  final dot = fileName.lastIndexOf('.');
  if (dot < 0 || dot == fileName.length - 1) {
    return null;
  }

  final extension = fileName.substring(dot + 1).toLowerCase();
  return supportedAudioExtensions.contains(extension) ? extension : null;
}

String fileNameForPath(String path) {
  final normalized = path.replaceAll('\\', '/');
  final slash = normalized.lastIndexOf('/');
  return slash < 0 ? normalized : normalized.substring(slash + 1);
}

String scannedAudioId(String path) {
  return 'scan.${base64Url.encode(utf8.encode(path))}';
}
