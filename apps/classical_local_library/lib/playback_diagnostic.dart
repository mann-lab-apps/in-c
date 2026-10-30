import 'dart:io';

import 'package:ddirori_ui/ddirori_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';

import 'just_audio_playback.dart';
import 'local_playback.dart';
import 'playback_diagnostic_report.dart';

export 'playback_diagnostic_report.dart';

abstract class PlaybackDiagnosticRunner {
  Future<PlaybackDiagnosticReport> run();
}

class ExclusivePlaybackDiagnosticRunner implements PlaybackDiagnosticRunner {
  ExclusivePlaybackDiagnosticRunner(this.player, this.delegate);
  final SerializedLocalPlaybackController player;
  final PlaybackDiagnosticRunner delegate;

  @override
  Future<PlaybackDiagnosticReport> run() => player.runDiagnostic(delegate.run);
}

typedef PlaybackDiagnosticControllerFactory =
    LocalPlaybackController Function();
typedef PlaybackDiagnosticAssetLoader = Future<Uint8List> Function(
  String assetPath,
);
typedef PlaybackDiagnosticDirectoryProvider = Future<Directory> Function();

class LocalFixturePlaybackDiagnosticRunner implements PlaybackDiagnosticRunner {
  LocalFixturePlaybackDiagnosticRunner({
    PlaybackDiagnosticControllerFactory? controllerFactory,
    PlaybackDiagnosticAssetLoader? assetLoader,
    PlaybackDiagnosticDirectoryProvider? directoryProvider,
  }) : _controllerFactory =
           controllerFactory ?? (() => JustAudioLocalPlaybackController()),
       _assetLoader = assetLoader ?? _loadAsset,
       _directoryProvider = directoryProvider ?? getTemporaryDirectory;

  final PlaybackDiagnosticControllerFactory _controllerFactory;
  final PlaybackDiagnosticAssetLoader _assetLoader;
  final PlaybackDiagnosticDirectoryProvider _directoryProvider;

  @override
  Future<PlaybackDiagnosticReport> run() async {
    final results = <PlaybackDiagnosticFixtureResult>[];
    for (final fixture in PlaybackDiagnosticFixture.values) {
      results.add(await _runFixture(fixture));
    }
    return PlaybackDiagnosticReport(results, platform: _currentPlatform());
  }

  Future<PlaybackDiagnosticFixtureResult> _runFixture(
    PlaybackDiagnosticFixture fixture,
  ) async {
    final controller = _controllerFactory();
    try {
      final path = await _copyFixture(fixture);
      await controller.loadQueue([
        LocalPlaybackQueueItem(
          trackId: fixture.id,
          recordingId: 'synthetic-diagnostic-recording',
          workId: 'synthetic-diagnostic-work',
          displayTitle: fixture.label,
          path: path,
          usesLinkedFile: true,
          workTitle: '재생 진단',
          recordingTitle: '합성 테스트',
        ),
      ]);
      if (controller.playbackState.playerState == LocalPlayerState.error) {
        return PlaybackDiagnosticFixtureResult(
          fixture: fixture,
          loaded: false,
          positionAdvanced: false,
          paused: false,
          resumed: false,
          stopped: false,
          failureKind: _diagnosticFailureKind(
            controller.playbackState.failure?.kind,
          ),
        );
      }

      await controller.play();
      final started = await _waitFor(
        controller,
        (state) => state.position >= const Duration(milliseconds: 200),
      );
      if (!started) {
        return PlaybackDiagnosticFixtureResult(
          fixture: fixture,
          loaded: true,
          positionAdvanced: false,
          paused: false,
          resumed: false,
          stopped: false,
          failureKind: PlaybackDiagnosticFailureKind.positionNotAdvanced,
        );
      }

      await controller.pause();
      final pausedAt = controller.playbackState.position;
      await Future<void>.delayed(const Duration(milliseconds: 150));
      final paused =
          (controller.playbackState.position - pausedAt).abs() <=
          const Duration(milliseconds: 120);
      await controller.resume();
      final resumed = await _waitFor(
        controller,
        (state) =>
            state.position >= pausedAt + const Duration(milliseconds: 120),
      );
      await controller.stop();
      final stopped =
          controller.playbackState.playerState == LocalPlayerState.stopped;
      if (paused && resumed && stopped) {
        return PlaybackDiagnosticFixtureResult.success(fixture: fixture);
      }
      return PlaybackDiagnosticFixtureResult(
        fixture: fixture,
        loaded: true,
        positionAdvanced: true,
        paused: paused,
        resumed: resumed,
        stopped: stopped,
        failureKind: PlaybackDiagnosticFailureKind.stateTransitionFailed,
      );
    } on Object {
      return PlaybackDiagnosticFixtureResult(
        fixture: fixture,
        loaded: false,
        positionAdvanced: false,
        paused: false,
        resumed: false,
        stopped: false,
        failureKind: PlaybackDiagnosticFailureKind.unexpected,
      );
    } finally {
      await controller.dispose();
    }
  }

  PlaybackDiagnosticPlatform _currentPlatform() {
    if (Platform.isAndroid) {
      return PlaybackDiagnosticPlatform.android;
    }
    if (Platform.isIOS) {
      return PlaybackDiagnosticPlatform.ios;
    }
    return PlaybackDiagnosticPlatform.other;
  }

  PlaybackDiagnosticFailureKind _diagnosticFailureKind(
    LocalPlaybackFailureKind? kind,
  ) {
    return switch (kind) {
      LocalPlaybackFailureKind.emptyQueue =>
        PlaybackDiagnosticFailureKind.emptyQueue,
      LocalPlaybackFailureKind.unlinkedFile =>
        PlaybackDiagnosticFailureKind.unlinkedFile,
      LocalPlaybackFailureKind.missingFile =>
        PlaybackDiagnosticFailureKind.missingFile,
      LocalPlaybackFailureKind.unsupportedFormat =>
        PlaybackDiagnosticFailureKind.unsupportedFormat,
      LocalPlaybackFailureKind.loadFailed =>
        PlaybackDiagnosticFailureKind.loadFailed,
      null => PlaybackDiagnosticFailureKind.unexpected,
    };
  }

  Future<String> _copyFixture(PlaybackDiagnosticFixture fixture) async {
    final bytes = await _assetLoader(fixture.assetPath);
    final directory = Directory(
      '${(await _directoryProvider()).path}/classical_local_library_diagnostic',
    );
    await directory.create(recursive: true);
    final target = File(
      '${directory.path}/${fixture.assetPath.split('/').last}',
    );
    await target.writeAsBytes(bytes, flush: true);
    return target.path;
  }

  static Future<Uint8List> _loadAsset(String assetPath) async {
    final asset = await rootBundle.load(assetPath);
    return asset.buffer.asUint8List(asset.offsetInBytes, asset.lengthInBytes);
  }

  Future<bool> _waitFor(
    LocalPlaybackController controller,
    bool Function(LocalPlaybackState state) predicate,
  ) async {
    final deadline = DateTime.now().add(const Duration(seconds: 3));
    while (!predicate(controller.playbackState)) {
      if (controller.playbackState.playerState == LocalPlayerState.error ||
          DateTime.now().isAfter(deadline)) {
        return false;
      }
      await Future<void>.delayed(const Duration(milliseconds: 50));
    }
    return true;
  }
}

typedef PlaybackDiagnosticClipboardWriter = Future<void> Function(String text);

class PlaybackDiagnosticScreen extends StatefulWidget {
  const PlaybackDiagnosticScreen({
    super.key,
    required this.runner,
    this.clipboardWriter,
  });

  final PlaybackDiagnosticRunner runner;
  final PlaybackDiagnosticClipboardWriter? clipboardWriter;

  @override
  State<PlaybackDiagnosticScreen> createState() =>
      _PlaybackDiagnosticScreenState();
}

class _PlaybackDiagnosticScreenState extends State<PlaybackDiagnosticScreen> {
  PlaybackDiagnosticReport? report;
  PlaybackDiagnosticListeningFeedback feedback =
      PlaybackDiagnosticListeningFeedback.notChecked;
  bool isRunning = false;
  String? errorMessage;

  Future<void> _run() async {
    if (isRunning) return;
    setState(() {
      isRunning = true;
      report = null;
      errorMessage = null;
      feedback = PlaybackDiagnosticListeningFeedback.notChecked;
    });
    try {
      final nextReport = await widget.runner.run();
      if (!mounted) {
        return;
      }
      setState(() {
        report = nextReport;
      });
    } catch (_) {
      if (mounted) {
        setState(() => errorMessage = '재생 진단을 완료하지 못했습니다. 다시 시도해 주세요.');
      }
    } finally {
      if (mounted) {
        setState(() {
          isRunning = false;
        });
      }
    }
  }

  Future<void> _copyReport() async {
    final currentReport = report;
    if (currentReport == null) {
      return;
    }
    final encoded = const PlaybackDiagnosticReportCodec().encode(
      currentReport.withListeningFeedback(feedback),
    );
    await (widget.clipboardWriter ?? _writeClipboard)(encoded);
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('익명 진단 결과를 복사했습니다.')));
  }

  static Future<void> _writeClipboard(String text) {
    return Clipboard.setData(ClipboardData(text: text));
  }

  @override
  Widget build(BuildContext context) {
    final currentReport = report;
    return Scaffold(
      appBar: AppBar(title: const Text('재생 진단')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('합성 WAV와 AAC·ALAC-in-M4A 테스트 파일만 사용합니다.'),
            const SizedBox(height: 8),
            const Text('개인 음악 파일, 감상 이력, 기기 식별자, 네트워크 전송은 포함하지 않습니다.'),
            const SizedBox(height: 8),
            const Text('진단을 실행하면 감상 중인 음악을 일시정지합니다. 진단 후 재생 버튼으로 다시 시작해 주세요.'),
            const SizedBox(height: 20),
            DdiroriButton(
              label: '진단 실행',
              icon: Icons.play_circle_outline,
              busy: isRunning,
              onPressed: isRunning ? null : _run,
            ),
            const SizedBox(height: 24),
            if (errorMessage != null)
              DdiroriBanner(
                message: errorMessage!,
                kind: DdiroriNoticeKind.error,
              ),
            Text('청감 확인', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            DdiroriSegments<PlaybackDiagnosticListeningFeedback>(
              options: {
                for (final option in PlaybackDiagnosticListeningFeedback.values)
                  option: option.label,
              },
              selected: {feedback},
              onChanged: (selection) {
                setState(() {
                  feedback = selection.first;
                });
              },
            ),
            if (currentReport != null) ...[
              const SizedBox(height: 24),
              DdiroriBanner(
                message: currentReport.isSuccess ? '자동 확인 통과' : '자동 확인 실패',
                kind: currentReport.isSuccess
                    ? DdiroriNoticeKind.success
                    : DdiroriNoticeKind.error,
              ),
              const SizedBox(height: 8),
              for (final result in currentReport.results)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    result.isSuccess
                        ? Icons.check_circle_outline
                        : Icons.error_outline,
                  ),
                  title: Text(result.fixture.label),
                  subtitle: Text(result.message),
                ),
              SelectableText(currentReport.summary(feedback)),
              const SizedBox(height: 12),
              DdiroriButton(
                label: '진단 결과 복사',
                icon: Icons.copy_outlined,
                kind: DdiroriButtonKind.secondary,
                onPressed: _copyReport,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
