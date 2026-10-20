import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:in_c_sheet/sheet_audio_player.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('reads anonymous linked-audio output route info', () async {
    const channel = MethodChannel('clef/test_audio_route');
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(channel, (call) async {
      expect(call.method, 'routeInfo');
      return <String, Object?>{
        'outputs': <String>['builtInSpeaker'],
        'systemVolume': 0.5,
      };
    });
    addTearDown(() => messenger.setMockMethodCallHandler(channel, null));

    final route = await SheetAudioPlayer(channel: channel).readRouteInfo();

    expect(route?['outputs'], <String>['builtInSpeaker']);
    expect(route?['systemVolume'], 0.5);
  });

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

  test('sends optional A-B loop points through method channel', () async {
    final channel = const MethodChannel('clef/test_audio_loop');
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
    final result = await player.play(
      '/tmp/backing-track.m4a',
      loop: SheetAudioLoop(
        start: Duration(milliseconds: 1500),
        end: Duration(milliseconds: 8200),
      ),
    );

    expect(result.isPlaying, isTrue);
    expect(calls.single.method, 'play');
    expect(calls.single.arguments, <String, Object?>{
      'path': '/tmp/backing-track.m4a',
      'loopStartMs': 1500,
      'loopEndMs': 8200,
    });
  });

  test('inspects local audio duration through method channel', () async {
    final channel = const MethodChannel('clef/test_audio_inspection');
    final calls = <MethodCall>[];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call);
          return <String, Object?>{'durationMs': 125400};
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    final info = await SheetAudioPlayer(channel: channel)
        .inspect(' /tmp/cue-track.mp3 ');

    expect(info?.duration, const Duration(milliseconds: 125400));
    expect(calls.single.method, 'inspect');
    expect(calls.single.arguments, <String, Object?>{
      'path': '/tmp/cue-track.mp3',
    });
  });

  test('reads current linked audio position through method channel', () async {
    final channel = const MethodChannel('clef/test_audio_position');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          expect(call.method, 'position');
          return <String, Object?>{
            'positionMs': 12340,
            'durationMs': 125400,
            'isPlaying': true,
          };
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    final position = await SheetAudioPlayer(channel: channel).readPosition();

    expect(position?.position, const Duration(milliseconds: 12340));
    expect(position?.duration, const Duration(milliseconds: 125400));
    expect(position?.isPlaying, isTrue);
  });

  test('keeps playback available when audio inspection fails', () async {
    final channel = const MethodChannel('clef/test_audio_inspection_error');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          throw PlatformException(code: 'inspection_error');
        });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
    });

    final info = await SheetAudioPlayer(channel: channel).inspect('/tmp/a.m4a');

    expect(info, isNull);
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
