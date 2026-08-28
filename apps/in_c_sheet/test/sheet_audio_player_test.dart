import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_audio_player.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('sends local audio path through method channel', () async {
    final channel = const MethodChannel('clef/test_audio_player');
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return null;
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    final player = SheetAudioPlayer(channel: channel);
    final result = await player.play(' /tmp/cue-track.mp3 ');
    await player.stop();

    expect(result.isPlaying, isTrue);
    expect(calls.map((call) => call.method), <String>['play', 'stop']);
    expect(calls.first.arguments, <String, Object?>{
      'path': '/tmp/cue-track.mp3',
    });
  });

  test('reports playback errors', () async {
    final channel = const MethodChannel('clef/test_audio_error');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          throw PlatformException(
            code: 'playback_error',
            message: 'Audio playback failed.',
          );
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    final player = SheetAudioPlayer(channel: channel);
    final result = await player.play('/tmp/missing.mp3');

    expect(result.status, SheetAudioPlaybackStatus.failed);
    expect(result.message, 'Audio playback failed.');
  });
}
