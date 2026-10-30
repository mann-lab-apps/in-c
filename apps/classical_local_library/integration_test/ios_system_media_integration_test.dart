import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:classical_local_library/just_audio_playback.dart';
import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_diagnostic.dart';
import 'package:classical_local_library/system_media.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('app.ddirori.play/system_media');

  testWidgets(
    'public iOS Now Playing center and injected native remote commands follow the engine',
    (tester) async {
      final directory = await (await getTemporaryDirectory()).createTemp(
        'media-qa-',
      );
      final source = (await rootBundle.load('assets/audio_test/movement_1.wav'))
          .buffer
          .asUint8List();
      final short = File('${directory.path}/short.wav');
      await short.writeAsBytes(source);
      // Repeat the repository PCM fixture to exercise the 3-second previous boundary.
      final extended = Uint8List(44 + (source.length - 44) * 4);
      extended.setRange(0, 44, source);
      for (var index = 0; index < 4; index++) {
        extended.setRange(
          44 + index * (source.length - 44),
          44 + (index + 1) * (source.length - 44),
          source,
          44,
        );
      }
      ByteData.sublistView(extended)
          .setUint32(4, extended.length - 8, Endian.little);
      ByteData.sublistView(extended)
          .setUint32(40, extended.length - 44, Endian.little);
      final long = File('${directory.path}/long.wav');
      await long.writeAsBytes(extended);
      final engine = JustAudioLocalPlaybackController();
      final player = SerializedLocalPlaybackController(engine);
      final media = PlaybackSystemMediaCoordinator(
        controller: player,
        session: IOSSystemMediaSession(),
      );
      addTearDown(() async {
        await media.dispose();
        await player.dispose();
        await directory.delete(recursive: true);
      });
      Future<Map> inspect() async {
        await media.flush();
        return (await channel.invokeMapMethod<String, Object?>('inspect'))!;
      }

      Future<void> command(String action, [int? position]) async {
        await media.flush();
        expect(
          await channel.invokeMethod<bool>('testCommand', {
            'action': action,
            'positionMillis': ?position,
          }),
          isTrue,
        );
        await Future<void>.delayed(const Duration(milliseconds: 150));
      }

      await player.loadQueue([
        _item('first', long.path, artist: '테스트 연주자'),
        _item('second', long.path),
      ]);
      expect((await inspect())['artist'], '테스트 연주자');
      expect((await inspect())['rate'], 0);
      await command('play');
      await _wait(() => engine.playbackState.position.inMilliseconds >= 200);
      expect((await inspect())['rate'], 1);
      await command('pause');
      expect(engine.playbackState.playerState, LocalPlayerState.paused);
      await command('next');
      expect(engine.playbackState.currentIndex, 1);
      expect(engine.playbackState.playerState, LocalPlayerState.paused);
      expect((await inspect())['artist'], '');
      await command('seek', 3000);
      expect(
        engine.playbackState.position.inMilliseconds,
        inInclusiveRange(2950, 3150),
      );
      await command('previous');
      expect(engine.playbackState.currentIndex, 1);
      expect(engine.playbackState.position.inMilliseconds, lessThan(100));
      await command('previous');
      expect(engine.playbackState.currentIndex, 0);
      expect((await inspect())['title'], '검증 작품 · first');

      await command('play');
      final position = engine.playbackState.position;
      final diagnostic = ExclusivePlaybackDiagnosticRunner(
        player,
        LocalFixturePlaybackDiagnosticRunner(),
      ).run();
      await _wait(
        () => engine.playbackState.playerState == LocalPlayerState.paused,
      );
      expect((await inspect())['playEnabled'], false);
      expect(
        await channel.invokeMethod<bool>('testCommand', {'action': 'play'}),
        false,
      );
      await diagnostic;
      expect(engine.playbackState.playerState, LocalPlayerState.paused);
      expect(engine.playbackState.currentIndex, 0);
      expect(
        (engine.playbackState.position - position).abs().inMilliseconds,
        lessThan(250),
      );
      expect((await inspect())['title'], '검증 작품 · first');
      expect((await inspect())['playEnabled'], true);

      await player.loadQueue([_item('finish', short.path)]);
      await command('play');
      await _wait(
        () => engine.playbackState.playerState == LocalPlayerState.completed,
      );
      expect(engine.playbackState.currentIndex, 1);
      expect((await inspect())['rate'], 0);
      expect((await inspect())['seekEnabled'], false);
      await command('play');
      expect(engine.playbackState.playerState, LocalPlayerState.playing);
      expect(engine.playbackState.currentIndex, 0);
      await command('stop');
      expect((await inspect())['empty'], true);
      expect(
        await channel.invokeMethod<bool>('testCommand', {'action': 'play'}),
        false,
      );
      await media.dispose();
      expect((await inspect())['empty'], true);
    },
  );
}

LocalPlaybackQueueItem _item(String id, String path, {String? artist}) =>
    LocalPlaybackQueueItem(
      trackId: 'fixture-$id',
      workId: 'work',
      recordingId: 'recording',
      path: path,
      displayTitle: id,
      usesLinkedFile: true,
      workTitle: '검증 작품',
      recordingTitle: '녹음명',
      artist: artist,
    );

Future<void> _wait(bool Function() condition) async {
  final clock = Stopwatch()..start();
  while (!condition()) {
    if (clock.elapsed > const Duration(seconds: 15)) {
      throw TimeoutException('media QA timeout');
    }
    await Future<void>.delayed(const Duration(milliseconds: 50));
  }
}
