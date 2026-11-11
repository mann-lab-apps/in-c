import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:audio_metadata_reader/audio_metadata_reader.dart' as audio;
import 'package:crypto/crypto.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';

import 'classical_library_models.dart';

const maxArtworkBytes = 8 * 1024 * 1024;
final artworkHashPattern = RegExp(r'^[a-f0-9]{64}$');

class ArtworkReference {
  const ArtworkReference(this.hash, [this.stamp]);
  final String hash;
  final String? stamp;
}

abstract interface class ArtworkReferenceStore {
  Future<Map<String, ArtworkReference>> load();
  Future<void> put(String owner, ArtworkReference? reference);
}

class MemoryArtworkReferenceStore implements ArtworkReferenceStore {
  final values = <String, ArtworkReference>{};
  @override
  Future<Map<String, ArtworkReference>> load() async => {...values};
  @override
  Future<void> put(String owner, ArtworkReference? reference) async {
    if (reference == null) {
      values.remove(owner);
    } else {
      values[owner] = reference;
    }
  }
}

class SqliteArtworkReferenceStore implements ArtworkReferenceStore {
  const SqliteArtworkReferenceStore(this.database);
  final Database database;
  @override
  Future<Map<String, ArtworkReference>> load() async => {
    for (final row in await database.query('library_artwork'))
      row['owner']! as String: ArtworkReference(
        row['image_hash']! as String,
        row['source_stamp'] as String?,
      ),
  };
  @override
  Future<void> put(String owner, ArtworkReference? reference) async {
    if (reference == null) {
      await database.delete(
        'library_artwork',
        where: 'owner = ?',
        whereArgs: [owner],
      );
    } else {
      await database.insert('library_artwork', {
        'owner': owner,
        'image_hash': reference.hash,
        'source_stamp': reference.stamp,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }
  }
}

abstract interface class LibraryArtworkPicker {
  Future<Uint8List?> pick();
}

class PlatformLibraryArtworkPicker implements LibraryArtworkPicker {
  const PlatformLibraryArtworkPicker();
  @override
  Future<Uint8List?> pick() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: ['png', 'jpg', 'jpeg', 'webp'],
    );
    if (file == null) return null;
    if (await file.length() > maxArtworkBytes) {
      throw const FormatException('표지는 8MB 이하의 이미지를 선택해 주세요.');
    }
    final stream = file.readAsByteStream();
    final bytes = BytesBuilder(copy: false);
    await for (final chunk in stream) {
      if (bytes.length + chunk.length > maxArtworkBytes) {
        throw const FormatException('표지는 8MB 이하의 이미지를 선택해 주세요.');
      }
      bytes.add(chunk);
    }
    return bytes.takeBytes();
  }
}

/// Produces a bounded thumbnail; nothing is written to the selected source.
Future<Uint8List> normalizeArtwork(Uint8List bytes) async {
  if (bytes.isEmpty || bytes.length > maxArtworkBytes) {
    throw const FormatException('표지 이미지 크기가 올바르지 않습니다.');
  }
  final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
  ui.ImageDescriptor? descriptor;
  ui.Codec? codec;
  ui.Image? image;
  try {
    descriptor = await ui.ImageDescriptor.encoded(buffer);
    if (descriptor.width <= 0 ||
        descriptor.height <= 0 ||
        descriptor.width * descriptor.height > 16000000 ||
        descriptor.width > 16384 ||
        descriptor.height > 16384) {
      throw const FormatException('표지 이미지의 해상도가 너무 큽니다.');
    }
    final largest = descriptor.width > descriptor.height
        ? descriptor.width
        : descriptor.height;
    final scale = largest > 512 ? 512 / largest : 1.0;
    codec = await descriptor.instantiateCodec(
      targetWidth: (descriptor.width * scale).round().clamp(1, 512),
      targetHeight: (descriptor.height * scale).round().clamp(1, 512),
    );
    image = (await codec.getNextFrame()).image;
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    if (data == null) throw const FormatException('이미지를 처리하지 못했습니다.');
    return data.buffer.asUint8List();
  } finally {
    image?.dispose();
    codec?.dispose();
    descriptor?.dispose();
    buffer.dispose();
  }
}

void _readEmbeddedArtwork((String, SendPort) request) {
  try {
    final file = File(request.$1);
    // Artwork is optional. Bound parser allocations independently of playback.
    if (file.lengthSync() > 256 * 1024 * 1024) {
      request.$2.send(null);
      return;
    }
    final pictures = audio.readMetadata(file, getImage: true).pictures;
    final picture =
        pictures
            .where((p) => p.pictureType == audio.PictureType.coverFront)
            .firstOrNull ??
        pictures.firstOrNull;
    request.$2.send(
      picture == null || picture.bytes.length > maxArtworkBytes
          ? null
          : picture.bytes,
    );
  } catch (_) {
    request.$2.send(null);
  }
}

Future<void> _deleteArtworkFile(File file) async {
  await file.delete();
}

class LibraryArtworkRepository extends ChangeNotifier {
  LibraryArtworkRepository({
    required this.directory,
    required this.store,
    this.deleteFile = _deleteArtworkFile,
  });
  final Directory directory;
  final ArtworkReferenceStore store;
  final Future<void> Function(File) deleteFile;
  Map<String, ArtworkReference> _references = {};
  final _jobs = <String, Future<File?>>{};
  final _workers = <Isolate>{};
  final _validated = <String, Future<File?>>{};
  final _pendingReads = <Completer<void>>{};
  Future<void> _tail = Future.value();
  Future<void>? _initialization;
  bool _closed = false;
  Future<void> initialize() => _initialization ??= () async {
    _references = await store.load();
    if (await FileSystemEntity.type(directory.path, followLinks: false) ==
        FileSystemEntityType.link) {
      throw const FileSystemException('표지 저장 위치를 사용할 수 없습니다.');
    }
    await directory.create(recursive: true);
    await _sweepOrphans();
  }();
  String? hashFor(String owner) => _references[owner]?.hash;
  File? _file(String? hash) => hash != null && artworkHashPattern.hasMatch(hash)
      ? File('${directory.path}/$hash.png')
      : null;
  Future<File?> playlist(String id) async {
    await initialize();
    return _verified(_references['playlist:$id']?.hash);
  }

  Future<File?> _verified(String? hash) async {
    final file = _file(hash);
    if (file == null ||
        await FileSystemEntity.type(file.path, followLinks: false) !=
            FileSystemEntityType.file) {
      return null;
    }
    final stat = await file.stat();
    if (stat.size < 24 || stat.size > maxArtworkBytes) return null;
    final key = '$hash:${stat.modified.microsecondsSinceEpoch}:${stat.size}';
    final cached = _validated.remove(key);
    if (cached != null) {
      _validated[key] = cached;
      return cached;
    }
    final result = () async {
      try {
        final bytes = await file.readAsBytes();
        const signature = [137, 80, 78, 71, 13, 10, 26, 10];
        if (!listEquals(bytes.take(8).toList(), signature) ||
            sha256.convert(bytes).toString() != hash) {
          return null;
        }
        return file;
      } on FileSystemException {
        return null;
      }
    }();
    _validated[key] = result;
    while (_validated.length > 128) {
      _validated.remove(_validated.keys.first);
    }
    return result;
  }

  /// Names-only recovery: no audio reads or image decoding at startup.
  Future<void> _sweepOrphans() async {
    final live = _references.values.map((reference) => reference.hash).toSet();
    await for (final entry in directory.list(followLinks: false)) {
      if (_closed) return;
      final name = entry.uri.pathSegments.last;
      final match = RegExp(r'^([a-f0-9]{64})\.png(\.part)?$').firstMatch(name);
      if (entry is! File ||
          match == null ||
          await FileSystemEntity.type(entry.path, followLinks: false) !=
              FileSystemEntityType.file) {
        continue;
      }
      if (match.group(2) != null || !live.contains(match.group(1))) {
        try {
          await deleteFile(entry);
        } on FileSystemException {
          /* Retry recovery next startup. */
        }
      }
    }
  }

  Future<T> _ordered<T>(Future<T> Function() action) {
    final result = _tail.then((_) => action());
    _tail = result.then<void>((_) {}, onError: (Object _, StackTrace _) {});
    return result;
  }

  Future<void> get drained => _tail;

  Future<File?> audioFile(LocalAudioFile file) {
    final stamp = sha256
        .convert(
          utf8.encode(
            '${file.path}:${file.modifiedAtMillis}:${file.sizeBytes}',
          ),
        )
        .toString();
    final key = '${file.id}:$stamp';
    final existing = _jobs.remove(key);
    if (existing != null) {
      _jobs[key] = existing;
      return existing;
    }
    final result = _ordered<File?>(() async {
      if (_closed) return null;
      await initialize();
      final owner = 'file:${file.id}';
      final reference = _references[owner];
      final cached = await _verified(
        reference?.stamp == stamp ? reference?.hash : null,
      );
      if (cached != null) return cached;
      final port = ReceivePort();
      final cancelled = Completer<void>();
      _pendingReads.add(cancelled);
      Isolate? worker;
      try {
        worker = await Isolate.spawn(_readEmbeddedArtwork, (
          file.path,
          port.sendPort,
        ));
        if (_closed) return null;
        _workers.add(worker);
        final bytes = await Future.any([
          port.first,
          cancelled.future.then<Object?>((_) => null),
        ]).timeout(const Duration(seconds: 3));
        if (_closed || bytes is! Uint8List) return null;
        final normalized = await normalizeArtwork(bytes);
        if (_closed) return null;
        return await _commit(owner, normalized, stamp);
      } catch (_) {
        return null;
      } finally {
        worker?.kill(priority: Isolate.immediate);
        _workers.remove(worker);
        _pendingReads.remove(cancelled);
        port.close();
      }
    });
    _jobs[key] = result;
    while (_jobs.length > 128) {
      _jobs.remove(_jobs.keys.first);
    }
    return result;
  }

  Future<File?> setPlaylist(String id, Uint8List? bytes) => _ordered(() async {
    if (_closed) return null;
    await initialize();
    final owner = 'playlist:$id';
    if (bytes == null) {
      final previous = _references[owner]?.hash;
      await store.put(owner, null);
      _references.remove(owner);
      await _removeUnreferenced(previous);
      if (!_closed) notifyListeners();
      return null;
    }
    final normalized = await normalizeArtwork(bytes);
    if (_closed) return null;
    return _commit(owner, normalized, null);
  });

  Future<File> _commit(String owner, Uint8List bytes, String? stamp) async {
    final hash = sha256.convert(bytes).toString();
    final target = _file(hash)!;
    final targetType = await FileSystemEntity.type(
      target.path,
      followLinks: false,
    );
    if (targetType != FileSystemEntityType.file &&
        targetType != FileSystemEntityType.notFound) {
      throw const FileSystemException('표지 사본을 저장할 수 없습니다.');
    }
    if (await _verified(hash) == null) {
      final temporary = File('${target.path}.part');
      final temporaryType = await FileSystemEntity.type(
        temporary.path,
        followLinks: false,
      );
      if (temporaryType != FileSystemEntityType.file &&
          temporaryType != FileSystemEntityType.notFound) {
        throw const FileSystemException('표지 임시 사본을 저장할 수 없습니다.');
      }
      await temporary.writeAsBytes(bytes, flush: true);
      await temporary.rename(target.path);
    }
    _validated.clear();
    if (_closed) {
      await _removeUnreferenced(hash);
      throw StateError('표지 작업이 종료되었습니다.');
    }
    final previous = _references[owner]?.hash;
    try {
      await store.put(owner, ArtworkReference(hash, stamp));
    } catch (_) {
      await _removeUnreferenced(hash);
      rethrow;
    }
    _references[owner] = ArtworkReference(hash, stamp);
    await _removeUnreferenced(previous);
    if (!_closed) notifyListeners();
    return target;
  }

  Future<void> _removeUnreferenced(String? hash) async {
    if (hash == null || _references.values.any((r) => r.hash == hash)) return;
    final file = _file(hash);
    try {
      if (file != null &&
          await FileSystemEntity.type(file.path, followLinks: false) ==
              FileSystemEntityType.file) {
        await deleteFile(file);
      }
    } on FileSystemException {
      /* A committed reference remains valid if old-cache cleanup fails. */
    }
  }

  Future<void> clear() => _ordered(() async {
    await initialize();
    await directory.create(recursive: true);
    for (final owner in _references.keys.toList()) {
      await store.put(owner, null);
    }
    _references.clear();
    _jobs.clear();
    _validated.clear();
    await for (final entry in directory.list(followLinks: false)) {
      final name = entry.uri.pathSegments.last;
      if (entry is File &&
          RegExp(r'^[a-f0-9]{64}\.png(?:\.part)?$').hasMatch(name)) {
        await entry.delete();
      }
    }
    if (!_closed) notifyListeners();
  });
  @override
  void dispose() {
    _closed = true;
    for (final cancelled in _pendingReads) {
      cancelled.complete();
    }
    _pendingReads.clear();
    for (final worker in _workers) {
      worker.kill(priority: Isolate.immediate);
    }
    _workers.clear();
    _jobs.clear();
    super.dispose();
  }
}
