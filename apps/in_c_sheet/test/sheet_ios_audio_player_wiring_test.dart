import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('iOS runner wires the Clef linked audio method channel', () {
    final appDelegate = File('ios/Runner/AppDelegate.swift').readAsStringSync();
    final bridge = File('ios/Runner/ClefAudioPlayerBridge.swift')
        .readAsStringSync();
    final project = File('ios/Runner.xcodeproj/project.pbxproj')
        .readAsStringSync();

    expect(appDelegate, contains('ClefAudioPlayerBridge.shared.configure'));
    expect(bridge, contains('clef/audio_player'));
    expect(bridge, contains('case "play"'));
    expect(bridge, contains('case "stop"'));
    expect(bridge, contains('AVAudioPlayer'));
    expect(project, contains('ClefAudioPlayerBridge.swift in Sources'));
  });
}
