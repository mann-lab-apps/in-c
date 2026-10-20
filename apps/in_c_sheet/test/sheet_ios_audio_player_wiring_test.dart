import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('iOS runner wires Clef linked audio, tone, and metronome channels', () {
    final appDelegate = File('ios/Runner/AppDelegate.swift').readAsStringSync();
    final audioBridge = File('ios/Runner/ClefAudioPlayerBridge.swift')
        .readAsStringSync();
    final toneBridge = File('ios/Runner/ClefTonePlayerBridge.swift')
        .readAsStringSync();
    final metronomeBridge = File('ios/Runner/ClefMetronomePlayerBridge.swift')
        .readAsStringSync();
    final project = File('ios/Runner.xcodeproj/project.pbxproj')
        .readAsStringSync();

    expect(appDelegate, contains('ClefAudioPlayerBridge.shared.configure'));
    expect(appDelegate, contains('ClefTonePlayerBridge.shared.configure'));
    expect(appDelegate, contains('ClefMetronomePlayerBridge.shared.configure'));
    expect(audioBridge, contains('clef/audio_player'));
    expect(audioBridge, contains('case "position"'));
    expect(audioBridge, contains('case "routeInfo"'));
    expect(audioBridge, contains('currentRoute.outputs'));
    expect(audioBridge, contains('case "inspect"'));
    expect(audioBridge, contains('case "play"'));
    expect(audioBridge, contains('case "stop"'));
    expect(audioBridge, contains('AVAudioPlayer'));
    expect(toneBridge, contains('clef/tone_player'));
    expect(toneBridge, contains('case "play"'));
    expect(toneBridge, contains('case "stop"'));
    expect(toneBridge, contains('case "routeInfo"'));
    expect(toneBridge, contains('currentRoute.outputs'));
    expect(toneBridge, contains('AVAudioEngine'));
    expect(metronomeBridge, contains('clef/metronome_player'));
    expect(metronomeBridge, contains('case "prepare"'));
    expect(metronomeBridge, contains('case "playClick"'));
    expect(metronomeBridge, contains('case "stop"'));
    expect(metronomeBridge, contains('AVAudioEngine'));
    expect(project, contains('ClefAudioPlayerBridge.swift in Sources'));
    expect(project, contains('ClefTonePlayerBridge.swift in Sources'));
    expect(project, contains('ClefMetronomePlayerBridge.swift in Sources'));
  });
}
