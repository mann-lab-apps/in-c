import 'package:audio_service/audio_service.dart';
import 'package:classical_local_library/android_system_media.dart';
import 'package:classical_local_library/system_media.dart';
import 'package:flutter_test/flutter_test.dart';

SystemMediaSnapshot value({
  bool playing = true,
  String title = '곡',
  Duration? duration = const Duration(seconds: 10),
  Set<SystemMediaAction>? actions,
}) => SystemMediaSnapshot(
  id: 'opaque-media-id',
  generation: 3,
  title: title,
  artist: '연주 정보',
  album: '앨범',
  position: const Duration(seconds: 2),
  duration: duration,
  rate: playing ? 1 : 0,
  playing: playing,
  index: 1,
  count: 3,
  actions: actions ?? SystemMediaAction.values.toSet(),
);
void main() {
  test(
    'same media ID still updates late duration and corrected metadata',
    () async {
      final handler = PlayAndroidAudioHandler(),
          session = AndroidSystemMediaSession(initialize: () async => handler);
      await session.publish(value(duration: null));
      expect(handler.mediaItem.value!.duration, isNull);
      await session.publish(
        value(title: '교정된 곡', duration: const Duration(seconds: 12)),
      );
      expect(handler.mediaItem.value!.id, 'opaque-media-id');
      expect(handler.mediaItem.value!.title, '교정된 곡');
      expect(handler.mediaItem.value!.duration, const Duration(seconds: 12));
      await session.dispose();
    },
  );
  test(
    'Android observes engine data; all commands return through shared contract',
    () async {
      final handler = PlayAndroidAudioHandler(),
          commands = <SystemMediaCommand>[];
      final session = AndroidSystemMediaSession(
        initialize: () async => handler,
      );
      session.setCommandHandler((c) async => commands.add(c));
      await session.publish(value());
      expect(handler.mediaItem.value!.id, 'opaque-media-id');
      expect(handler.mediaItem.value!.title, '곡');
      expect(handler.playbackState.value.playing, isTrue);
      await handler.pause();
      await handler.play();
      await handler.skipToNext();
      await handler.skipToPrevious();
      await handler.seek(const Duration(seconds: 5));
      await handler.stop();
      expect(commands.map((c) => c.action), [
        SystemMediaAction.pause,
        SystemMediaAction.play,
        SystemMediaAction.next,
        SystemMediaAction.previous,
        SystemMediaAction.seek,
        SystemMediaAction.stop,
      ]);
      expect(
        commands.every((c) => c.id == 'opaque-media-id' && c.generation == 3),
        isTrue,
      );
      expect(
        handler.playbackState.value.playing,
        isTrue,
        reason: 'remote request never publishes optimistic state',
      );
      await session.publish(
        value(playing: false, actions: {SystemMediaAction.play}),
      );
      await handler.pause();
      expect(commands, hasLength(6));
      await handler.play();
      expect(commands, hasLength(7));
      await session.publish(null);
      expect(handler.mediaItem.value, isNull);
      expect(
        handler.playbackState.value.processingState,
        AudioProcessingState.idle,
      );
      await handler.play();
      expect(commands, hasLength(7));
      await session.dispose();
    },
  );
  test('late disposal cannot clear a newer session owner', () async {
    final handler = PlayAndroidAudioHandler();
    final first = AndroidSystemMediaSession(initialize: () async => handler);
    await first.publish(value());
    final second = AndroidSystemMediaSession(initialize: () async => handler);
    await second.publish(value(playing: false));
    await first.dispose();
    expect(handler.mediaItem.value, isNotNull);
    expect(handler.playbackState.value.playing, isFalse);
    await second.dispose();
    expect(handler.mediaItem.value, isNull);
  });
}
