import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:audio_metadata_reader/audio_metadata_reader.dart' as audio;
import 'package:classical_local_library/classical_library_models.dart';
import 'package:classical_local_library/library_artwork.dart';
import 'package:classical_local_library/local_playlists.dart';
import 'package:classical_local_library/presentation/play_artwork.dart';
import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'library_navigation_test.dart' as fixture;

Future<Uint8List> picture({
  int width = 40,
  int height = 20,
  ui.Color color = const ui.Color(0xff1971c2),
}) async {
  final recorder = ui.PictureRecorder();
  ui.Canvas(recorder).drawRect(
    ui.Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
    ui.Paint()..color = color,
  );
  final recorded = recorder.endRecording();
  final image = await recorded.toImage(width, height);
  final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  recorded.dispose();
  return bytes!.buffer.asUint8List();
}

class FailingArtworkStore extends MemoryArtworkReferenceStore {
  bool fail = false;
  @override
  Future<void> put(String owner, ArtworkReference? reference) async {
    if (fail) throw StateError('fixture write error');
    await super.put(owner, reference);
  }
}

class UnreadableArtworkStore extends MemoryArtworkReferenceStore {
  @override
  Future<Map<String, ArtworkReference>> load() async =>
      throw FileSystemException('fixture unavailable artwork');
}

class GatedArtworkStore extends MemoryArtworkReferenceStore {
  final entered = Completer<void>();
  final release = Completer<void>();
  @override
  Future<void> put(String owner, ArtworkReference? reference) async {
    if (reference != null && !entered.isCompleted) {
      entered.complete();
      await release.future;
    }
    await super.put(owner, reference);
  }
}

class FixtureArtworkPicker implements LibraryArtworkPicker {
  Uint8List? value;
  @override
  Future<Uint8List?> pick() async => value;
}

class CountingArtworkRepository extends LibraryArtworkRepository {
  CountingArtworkRepository()
    : super(
        directory: Directory('/unused'),
        store: MemoryArtworkReferenceStore(),
      );
  final requested = <String>{};
  @override
  Future<File?> audioFile(LocalAudioFile file) async {
    requested.add(file.id);
    return null;
  }
}

Future<void> settleArtwork(WidgetTester tester, bool Function() ready) async {
  for (var i = 0; i < 80; i++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 20)),
    );
    await tester.pump(const Duration(milliseconds: 20));
    if (ready()) {
      await tester.pumpAndSettle();
      return;
    }
  }
  fail('Artwork action did not settle');
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'cleanup failure does not turn a committed cover into a failed save',
    () async {
      final root = await Directory.systemTemp.createTemp('artwork-cleanup-');
      addTearDown(() => root.delete(recursive: true));
      File? old;
      final store = MemoryArtworkReferenceStore();
      final repo = LibraryArtworkRepository(
        directory: root,
        store: store,
        deleteFile: (file) async {
          if (file.path == old?.path) {
            throw const FileSystemException('fixture cleanup denied');
          }
          await file.delete();
        },
      );
      addTearDown(repo.dispose);
      old = await repo.setPlaylist('a', await picture());
      final next = await repo.setPlaylist(
        'a',
        await picture(color: const ui.Color(0xffe03131)),
      );
      expect(next!.path, isNot(old!.path));
      expect(
        store.values['playlist:a']!.hash,
        sha256.convert(await next.readAsBytes()).toString(),
      );
      expect(await old.exists(), isTrue);
    },
  );

  test('clear waits for an in-flight reference commit and leaves no dangling files', () async {
    final root = await Directory.systemTemp.createTemp('artwork-clear-race-');
    addTearDown(() => root.delete(recursive: true));
    final store = GatedArtworkStore();
    final repo = LibraryArtworkRepository(directory: root, store: store);
    addTearDown(repo.dispose);
    final saving = repo.setPlaylist('a', await picture());
    await store.entered.future;
    final clearing = repo.clear();
    store.release.complete();
    await saving;
    await clearing;
    expect(store.values, isEmpty);
    expect(await root.list().toList(), isEmpty);
  });

  test('dispose drains a reference write already in progress without losing the committed cover', () async {
    final root = await Directory.systemTemp.createTemp(
      'artwork-dispose-commit-',
    );
    addTearDown(() => root.delete(recursive: true));
    final store = GatedArtworkStore();
    final repo = LibraryArtworkRepository(directory: root, store: store);
    final saving = repo.setPlaylist('a', await picture());
    await store.entered.future;
    repo.dispose();
    store.release.complete();
    final saved = await saving;
    await repo.drained;
    expect(await saved!.exists(), isTrue);
    final reopened = LibraryArtworkRepository(directory: root, store: store);
    addTearDown(reopened.dispose);
    expect((await reopened.playlist('a'))!.path, saved.path);
  });
  test('startup removes only owned orphan/part files and keeps shared covers and symlinks', () async {
    final root = await Directory.systemTemp.createTemp('artwork-recovery-');
    addTearDown(() => root.delete(recursive: true));
    final owned = Directory('${root.path}/owned');
    await owned.create();
    final bytes = await picture();
    final hash = sha256.convert(bytes).toString();
    final store = MemoryArtworkReferenceStore();
    await store.put('playlist:a', ArtworkReference(hash));
    await store.put('playlist:b', ArtworkReference(hash));
    final referenced = File('${owned.path}/$hash.png');
    await referenced.writeAsBytes(bytes);
    final orphan = File('${owned.path}/${'b' * 64}.png');
    await orphan.writeAsString('interrupted after rename');
    final part = File('${owned.path}/${'c' * 64}.png.part');
    await part.writeAsString('interrupted before rename');
    final unknown = File('${owned.path}/keep.txt');
    await unknown.writeAsString('unknown file');
    final original = File('${root.path}/original.png');
    await original.writeAsBytes(bytes);
    final link = Link('${owned.path}/${'d' * 64}.png');
    await link.create(original.path);
    final repo = LibraryArtworkRepository(directory: owned, store: store);
    addTearDown(repo.dispose);
    await repo.initialize();
    expect(await orphan.exists(), isFalse);
    expect(await part.exists(), isFalse);
    expect(await unknown.exists(), isTrue);
    expect(await link.exists(), isTrue);
    expect(await original.readAsBytes(), bytes);
    await repo.setPlaylist('a', null);
    expect(await referenced.exists(), isTrue);
    await repo.setPlaylist('b', null);
    expect(await referenced.exists(), isFalse);
  });

  test(
    'corrupt referenced image falls back and replacement repairs owned data',
    () async {
      final root = await Directory.systemTemp.createTemp('artwork-corrupt-');
      addTearDown(() => root.delete(recursive: true));
      final bytes = await picture();
      final hash = sha256.convert(bytes).toString();
      final store = MemoryArtworkReferenceStore();
      await store.put('playlist:a', ArtworkReference(hash));
      await File('${root.path}/$hash.png').writeAsString('corrupt');
      final repo = LibraryArtworkRepository(directory: root, store: store);
      addTearDown(repo.dispose);
      expect(await repo.playlist('a'), isNull);
      expect(await repo.playlist('a'), isNull);
      final repaired = await repo.setPlaylist('a', bytes);
      expect(sha256.convert(await repaired!.readAsBytes()).toString(), hash);
    },
  );

  test(
    'hash or temporary symlink cannot overwrite an external image',
    () async {
      final root = await Directory.systemTemp.createTemp('artwork-links-');
      addTearDown(() => root.delete(recursive: true));
      final bytes = await picture();
      final normalized = await normalizeArtwork(bytes);
      final hash = sha256.convert(normalized).toString();
      final original = File('${root.path}/original.png');
      await original.writeAsString('keep original');
      final owned = Directory('${root.path}/owned');
      await owned.create();
      final repo = LibraryArtworkRepository(
        directory: owned,
        store: MemoryArtworkReferenceStore(),
      );
      addTearDown(repo.dispose);
      await repo.initialize();
      final link = Link('${owned.path}/$hash.png.part');
      await link.create(original.path);
      await expectLater(repo.setPlaylist('a', bytes), throwsA(anything));
      expect(await original.readAsString(), 'keep original');
      await link.delete();
      await Link('${owned.path}/$hash.png').create(original.path);
      await expectLater(repo.setPlaylist('a', bytes), throwsA(anything));
      expect(await original.readAsString(), 'keep original');
      expect(repo.hashFor('playlist:a'), isNull);
    },
  );
  testWidgets('artwork initialization failure keeps the music library usable', (
    tester,
  ) async {
    final repo = LibraryArtworkRepository(
      directory: Directory('/unused'),
      store: UnreadableArtworkStore(),
    );
    await tester.pumpWidget(fixture.libraryApp(artworkRepository: repo));
    await tester.pumpAndSettle();
    expect(find.textContaining('표지를 불러오지 못했습니다'), findsOneWidget);
    await fixture.openCategory(tester, 'songs');
    await tester.tap(find.text('Alpha'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('재생 상세 열기'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  test('JPEG EXIF orientation is applied to the normalized thumbnail', () async {
    // Own 20x10 red/blue image, EXIF orientation=6, no personal image metadata.
    final input = await File('test/fixtures/artwork-rotate6.jpg').readAsBytes();
    final output = await normalizeArtwork(input);
    final buffer = await ui.ImmutableBuffer.fromUint8List(output);
    final descriptor = await ui.ImageDescriptor.encoded(buffer);
    expect((descriptor.width, descriptor.height), (10, 20));
    descriptor.dispose();
    buffer.dispose();
  });
  testWidgets(
    'large artwork list reads only visible covers and scroll reveals new requests',
    (tester) async {
      final repo = CountingArtworkRepository();
      addTearDown(repo.dispose);
      await tester.pumpWidget(
        MaterialApp(
          theme: ddiroriTheme(),
          home: LibraryArtworkScope(
            repository: repo,
            fileForTrack: (_) => null,
            child: Scaffold(
              body: SingleChildScrollView(
                child: Column(
                  children: [
                    for (var i = 0; i < 1000; i++)
                      PlayArtwork(
                        file: LocalAudioFile(
                          id: '$i',
                          path: '/fixture/$i.flac',
                          format: 'flac',
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(repo.requested.length, inInclusiveRange(1, 20));
      final before = repo.requested.length;
      await tester.drag(
        find.byType(SingleChildScrollView),
        const Offset(0, -1200),
      );
      await tester.pumpAndSettle();
      expect(repo.requested.length, greaterThan(before));
      expect(repo.requested.length, lessThan(60));
      expect(tester.takeException(), isNull);
    },
  );

  test('restored hash without image falls back and late jobs cannot write after dispose', () async {
    final root = await Directory.systemTemp.createTemp('artwork-restore-');
    addTearDown(() => root.delete(recursive: true));
    final store = MemoryArtworkReferenceStore();
    await store.put('playlist:restored', ArtworkReference('a' * 64));
    final repo = LibraryArtworkRepository(directory: root, store: store);
    expect(await repo.playlist('restored'), isNull);
    final pending = repo.audioFile(
      const LocalAudioFile(id: 'late', path: '/missing.flac', format: 'flac'),
    );
    repo.dispose();
    expect(await pending, isNull);
    await repo.drained;
    expect(store.values.keys, ['playlist:restored']);
  });
  test('normalization bounds dimensions and keeps aspect ratio without touching source', () async {
    final source = await picture(width: 1000, height: 200);
    final before = sha256.convert(source);
    final normalized = await normalizeArtwork(source);
    final buffer = await ui.ImmutableBuffer.fromUint8List(normalized);
    final descriptor = await ui.ImageDescriptor.encoded(buffer);
    expect(descriptor.width, 512);
    expect(descriptor.height, 102);
    descriptor.dispose();
    buffer.dispose();
    expect(sha256.convert(source), before);
    await expectLater(
      normalizeArtwork(Uint8List(maxArtworkBytes + 1)),
      throwsFormatException,
    );
    await expectLater(
      normalizeArtwork(Uint8List.fromList([0, 1, 2])),
      throwsA(anything),
    );
  });

  test('owned cover replacement, shared hashes, failed write and cleanup preserve source', () async {
    final root = await Directory.systemTemp.createTemp('artwork-owned-');
    addTearDown(() => root.delete(recursive: true));
    final store = FailingArtworkStore();
    final repo = LibraryArtworkRepository(
      directory: Directory('${root.path}/owned'),
      store: store,
    );
    addTearDown(repo.dispose);
    final image = await picture();
    final source = File('${root.path}/original.png');
    await source.writeAsBytes(image);
    final originalHash = sha256.convert(await source.readAsBytes());
    final first = await repo.setPlaylist('a', image);
    await repo.setPlaylist('b', image);
    await repo.setPlaylist('a', null);
    expect(await first!.exists(), isTrue);
    store.fail = true;
    await expectLater(
      repo.setPlaylist('b', await picture(color: const ui.Color(0xffe03131))),
      throwsStateError,
    );
    expect((await repo.playlist('b'))!.path, first.path);
    store.fail = false;
    await repo.setPlaylist('b', null);
    expect(await first.exists(), isFalse);
    expect(sha256.convert(await source.readAsBytes()), originalHash);
    await repo.clear();
    expect(await source.exists(), isTrue);
  });

  test(
    'embedded FLAC art is extracted from a temporary fixture and cached',
    () async {
      final root = await Directory.systemTemp.createTemp('artwork-embedded-');
      addTearDown(() => root.delete(recursive: true));
      final source = File('assets/audio_test/movement_1.flac');
      final hash = sha256.convert(await source.readAsBytes());
      final tagged = await source.copy('${root.path}/fixture.flac');
      final png = await picture();
      // Only the disposable fixture copy is tagged; production has no writer.
      audio.updateMetadata(
        tagged,
        (metadata) => metadata.setPictures([
          audio.Picture(png, 'image/png', audio.PictureType.coverFront),
        ]),
      );
      final repo = LibraryArtworkRepository(
        directory: Directory('${root.path}/owned'),
        store: MemoryArtworkReferenceStore(),
      );
      addTearDown(repo.dispose);
      final file = LocalAudioFile(
        id: 'fixture',
        path: tagged.path,
        format: 'flac',
        sizeBytes: await tagged.length(),
      );
      final first = repo.audioFile(file);
      final second = repo.audioFile(file);
      expect(identical(first, second), isTrue);
      expect(await first, isNotNull);
      expect(sha256.convert(await source.readAsBytes()), hash);
      final missing = await repo.audioFile(
        const LocalAudioFile(
          id: 'missing',
          path: '/not-present.flac',
          format: 'flac',
        ),
      );
      expect(missing, isNull);
    },
  );

  testWidgets(
    'playlist cover picker cancel, success, invalid replacement and removal',
    (tester) async {
      final root = await tester.runAsync(
        () => Directory.systemTemp.createTemp('artwork-ui-'),
      );
      addTearDown(() => root!.delete(recursive: true));
      final store = MemoryArtworkReferenceStore();
      final repo = LibraryArtworkRepository(
        directory: Directory('${root!.path}/owned'),
        store: store,
      );
      final picker = FixtureArtworkPicker();
      await tester.runAsync(repo.initialize);
      await tester.pumpWidget(
        fixture.libraryApp(
          playlists: LocalPlaylistRepository(
            MemoryLocalPlaylistStore([fixture.playlist()]),
          ),
          artworkRepository: repo,
          artworkPicker: picker,
        ),
      );
      await settleArtwork(
        tester,
        () => find
            .byKey(const ValueKey('file-category-playlists'))
            .evaluate()
            .isNotEmpty,
      );
      await fixture.openCategory(tester, 'playlists');
      await tester.tap(find.byKey(const ValueKey('playlist-evening')));
      await tester.pumpAndSettle();
      expect(
        tester.getSize(find.byType(PlayArtwork).first),
        const Size(80, 80),
      );
      Future<void> menu(String label) async {
        await tester.tap(find.byTooltip('재생목록 더보기'));
        await tester.pumpAndSettle();
        await tester.tap(find.text(label));
        await tester.pump();
      }

      await menu('표지 선택');
      await tester.pumpAndSettle();
      expect(repo.hashFor('playlist:evening'), isNull);
      picker.value = await tester.runAsync(picture);
      await menu('표지 선택');
      await settleArtwork(
        tester,
        () => find.text('표지를 저장했습니다.').evaluate().isNotEmpty,
      );
      final saved = repo.hashFor('playlist:evening');
      expect(saved, isNotNull);
      picker.value = Uint8List.fromList([0, 1, 2]);
      await menu('표지 선택');
      await settleArtwork(
        tester,
        () => find.textContaining('표지를 저장하지 못했습니다').evaluate().isNotEmpty,
      );
      expect(repo.hashFor('playlist:evening'), saved);
      await menu('표지 제거');
      await settleArtwork(
        tester,
        () => repo.hashFor('playlist:evening') == null,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      var drained = false;
      repo.drained.then((_) => drained = true);
      await settleArtwork(tester, () => drained);
    },
  );
}
