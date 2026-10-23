import 'dart:io';
import 'dart:typed_data';

import 'package:classical_local_library/local_playback.dart';
import 'package:classical_local_library/playback_diagnostic.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'synthetic diagnostic runner checks transport without exposing file paths',
    () async {
      final tempDir = await Directory.systemTemp.createTemp(
        'playback_diagnostic_',
      );
      addTearDown(() async {
        if (await tempDir.exists()) {
          await tempDir.delete(recursive: true);
        }
      });
      final players = <_AdvancingFakePlayer>[];
      final runner = LocalFixturePlaybackDiagnosticRunner(
        controllerFactory: () {
          final player = _AdvancingFakePlayer();
          players.add(player);
          return player;
        },
        assetLoader: (_) async => Uint8List.fromList([1, 2, 3]),
        directoryProvider: () async => tempDir,
      );

      final report = await runner.run();

      expect(report.isSuccess, isTrue);
      expect(report.results, hasLength(3));
      expect(players, hasLength(3));
      expect(
        players.map((player) => player.playbackState.playerState),
        everyElement(LocalPlayerState.stopped),
      );
      final summary = report.summary(
        PlaybackDiagnosticListeningFeedback.notChecked,
      );
      expect(summary, contains('synthetic-wav'));
      expect(summary, contains('synthetic-aac-m4a'));
      expect(summary, contains('synthetic-alac-m4a'));
      expect(summary, isNot(contains(tempDir.path)));
      expect(summary, isNot(contains('/')));
    },
  );

  test('diagnostic report round-trips without personal data', () {
    const codec = PlaybackDiagnosticReportCodec();
    const report = PlaybackDiagnosticReport(
      [
        PlaybackDiagnosticFixtureResult.success(
          fixture: PlaybackDiagnosticFixture.wav,
        ),
        PlaybackDiagnosticFixtureResult(
          fixture: PlaybackDiagnosticFixture.aacM4a,
          loaded: true,
          positionAdvanced: false,
          paused: false,
          resumed: false,
          stopped: true,
          failureKind: PlaybackDiagnosticFailureKind.positionNotAdvanced,
        ),
        PlaybackDiagnosticFixtureResult.success(
          fixture: PlaybackDiagnosticFixture.alacM4a,
        ),
      ],
      platform: PlaybackDiagnosticPlatform.android,
      listeningFeedback: PlaybackDiagnosticListeningFeedback.issue,
    );

    final encoded = codec.encode(report);
    final decoded = codec.decode(encoded);

    expect(decoded.schemaVersion, playbackDiagnosticReportSchemaVersion);
    expect(decoded.platform, PlaybackDiagnosticPlatform.android);
    expect(
      decoded.listeningFeedback,
      PlaybackDiagnosticListeningFeedback.issue,
    );
    expect(decoded.results, hasLength(3));
    expect(decoded.results.first.isSuccess, isTrue);
    expect(
      decoded.results[1].failureKind,
      PlaybackDiagnosticFailureKind.positionNotAdvanced,
    );
    expect(encoded, isNot(contains('assetPath')));
    expect(encoded, isNot(contains('/Users/')));
  });

  test('diagnostic report rejects unknown schemas and fields', () {
    const codec = PlaybackDiagnosticReportCodec();
    final valid = codec.encode(
      const PlaybackDiagnosticReport([
        PlaybackDiagnosticFixtureResult.success(
          fixture: PlaybackDiagnosticFixture.wav,
        ),
      ], platform: PlaybackDiagnosticPlatform.android),
    );

    expect(
      () => codec.decode(
        valid.replaceFirst('"schemaVersion": 1', '"schemaVersion": 2'),
      ),
      throwsFormatException,
    );
    expect(
      () => codec.decode(
        valid.replaceFirst(
          '"platform":',
          '"deviceId": "private",\n  "platform":',
        ),
      ),
      throwsFormatException,
    );
    expect(
      () => codec.decode(valid.replaceFirst('  "platform": "android",\n', '')),
      throwsFormatException,
    );
    expect(
      () => codec.decode(
        valid.replaceFirst(
          '"fixtures":',
          '"path": "/Users/test/Music",\n  "fixtures":',
        ),
      ),
      throwsFormatException,
    );
  });

  test('offline reviewer reports fixture-scoped follow-up', () {
    const codec = PlaybackDiagnosticReportCodec();
    const reviewer = PlaybackDiagnosticReportReviewer();
    final source = codec.encode(
      const PlaybackDiagnosticReport([
        PlaybackDiagnosticFixtureResult(
          fixture: PlaybackDiagnosticFixture.wav,
          loaded: true,
          positionAdvanced: false,
          paused: false,
          resumed: false,
          stopped: false,
          failureKind: PlaybackDiagnosticFailureKind.positionNotAdvanced,
        ),
      ], platform: PlaybackDiagnosticPlatform.android),
    );

    expect(reviewer.review(source), contains('fixture regression test'));
    expect(reviewer.review(source), contains('automated-native-passed'));
    expect(reviewer.review(source), contains('not a codec-wide conclusion'));
    expect(() => reviewer.review('{broken'), throwsFormatException);
  });

  testWidgets('diagnostic screen copies selected anonymous JSON report', (
    tester,
  ) async {
    String? copied;
    await tester.pumpWidget(
      MaterialApp(
        home: PlaybackDiagnosticScreen(
          runner: _SuccessfulDiagnosticRunner(),
          clipboardWriter: (text) async {
            copied = text;
          },
        ),
      ),
    );

    await tester.tap(find.text('진단 실행'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('소리가 들림'));
    await tester.drag(find.byType(ListView), const Offset(0, -300));
    await tester.pumpAndSettle();
    await tester.tap(find.text('진단 결과 복사'));
    await tester.pumpAndSettle();

    expect(copied, isNotNull);
    final report = const PlaybackDiagnosticReportCodec().decode(copied!);
    expect(report.listeningFeedback, PlaybackDiagnosticListeningFeedback.heard);
    expect(find.text('익명 진단 결과를 복사했습니다.'), findsOneWidget);
  });

  testWidgets('rerun does not inherit listening feedback from a previous run', (
    tester,
  ) async {
    String? copied;
    await tester.pumpWidget(
      MaterialApp(
        home: PlaybackDiagnosticScreen(
          runner: _SuccessfulDiagnosticRunner(),
          clipboardWriter: (text) async => copied = text,
        ),
      ),
    );
    await tester.tap(find.text('진단 실행'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('소리가 들림'));
    await tester.tap(find.text('진단 실행'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('진단 결과 복사'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('진단 결과 복사'));
    await tester.pumpAndSettle();
    expect(
      const PlaybackDiagnosticReportCodec().decode(copied!).listeningFeedback,
      PlaybackDiagnosticListeningFeedback.notChecked,
    );
  });

  testWidgets('runner failure is path-free and can be retried', (tester) async {
    final runner = _FailOnceDiagnosticRunner();
    await tester.pumpWidget(
      MaterialApp(home: PlaybackDiagnosticScreen(runner: runner)),
    );
    await tester.tap(find.text('진단 실행'));
    await tester.pumpAndSettle();
    expect(find.text('재생 진단을 완료하지 못했습니다. 다시 시도해 주세요.'), findsOneWidget);
    expect(find.textContaining('/Users/'), findsNothing);
    expect(find.text('진단 결과 복사'), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('진단 실행'));
    await tester.pumpAndSettle();
    expect(find.text('자동 확인 통과'), findsOneWidget);
  });
}

class _FailOnceDiagnosticRunner extends _SuccessfulDiagnosticRunner {
  var failed = false;
  @override
  Future<PlaybackDiagnosticReport> run() async {
    if (!failed) {
      failed = true;
      throw StateError('/Users/private/audio.wav');
    }
    return super.run();
  }
}

class _SuccessfulDiagnosticRunner implements PlaybackDiagnosticRunner {
  @override
  Future<PlaybackDiagnosticReport> run() async {
    return const PlaybackDiagnosticReport([
      PlaybackDiagnosticFixtureResult.success(
        fixture: PlaybackDiagnosticFixture.wav,
      ),
      PlaybackDiagnosticFixtureResult.success(
        fixture: PlaybackDiagnosticFixture.aacM4a,
      ),
      PlaybackDiagnosticFixtureResult.success(
        fixture: PlaybackDiagnosticFixture.alacM4a,
      ),
    ]);
  }
}

class _AdvancingFakePlayer extends FakeLocalPlayer {
  @override
  Future<void> play() async {
    await super.play();
    await updatePosition(
      playbackState.position + const Duration(milliseconds: 250),
    );
  }
}
