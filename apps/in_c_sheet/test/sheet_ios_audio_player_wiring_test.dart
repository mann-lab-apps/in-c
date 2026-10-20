import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('iOS runner wires the Clef linked audio and tone method channels', () {
    final appDelegate = File('ios/Runner/AppDelegate.swift').readAsStringSync();
    final audioBridge = File('ios/Runner/ClefAudioPlayerBridge.swift')
        .readAsStringSync();
    final toneBridge = File('ios/Runner/ClefTonePlayerBridge.swift')
        .readAsStringSync();
    final project = File('ios/Runner.xcodeproj/project.pbxproj')
        .readAsStringSync();

    expect(appDelegate, contains('ClefAudioPlayerBridge.shared.configure'));
    expect(appDelegate, contains('ClefTonePlayerBridge.shared.configure'));
    expect(audioBridge, contains('clef/audio_player'));
    expect(audioBridge, contains('case "play"'));
    expect(audioBridge, contains('case "stop"'));
    expect(audioBridge, contains('AVAudioPlayer'));
    expect(toneBridge, contains('clef/tone_player'));
    expect(toneBridge, contains('case "play"'));
    expect(toneBridge, contains('case "stop"'));
    expect(toneBridge, contains('AVAudioEngine'));
    expect(project, contains('ClefAudioPlayerBridge.swift in Sources'));
    expect(project, contains('ClefTonePlayerBridge.swift in Sources'));
  });
}
