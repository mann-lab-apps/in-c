import 'dart:async';
import 'dart:typed_data';

import 'package:record/record.dart';

import 'sheet_tuner.dart';

class SheetTunerInputService {
  SheetTunerInputService({
    AudioRecorder? recorder,
    SheetTunerPitchDetector? detector,
    SheetTunerReadingStabilizer? stabilizer,
    int sampleRate = 44100,
  }) : _recorder = recorder ?? AudioRecorder(),
       _detector = detector ?? SheetTunerPitchDetector(sampleRate: sampleRate),
       _stabilizer = stabilizer ?? SheetTunerReadingStabilizer(),
       sampleRate = sampleRate;

  final AudioRecorder _recorder;
  final SheetTunerPitchDetector _detector;
  final SheetTunerReadingStabilizer _stabilizer;
  final int sampleRate;
  final StreamController<SheetTunerState> _states =
      StreamController<SheetTunerState>.broadcast();

  StreamSubscription<Uint8List>? _subscription;
  SheetTunerSettings _settings = SheetTunerSettings.defaultSettings;
  bool _isListening = false;
  bool _isDisposed = false;

  Stream<SheetTunerState> get states => _states.stream;
  bool get isListening => _isListening;
  SheetTunerDetectionDebugInfo? get detectionDebugInfo =>
      _detector.lastDebugInfo;

  Future<void> start({required SheetTunerSettings settings}) async {
    if (_isDisposed || _isListening) {
      return;
    }

    try {
      _applySettings(settings);
      final hasPermission = await _recorder.hasPermission();
      if (!hasPermission) {
        _emit(
          const SheetTunerState(
            isListening: false,
            reading: null,
            inputStatus: SheetTunerInputStatus.permissionDenied,
          ),
        );
        return;
      }

      _detector.reset();
      _stabilizer.reset();
      final stream = await _recorder.startStream(
        RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: sampleRate,
          numChannels: 1,
          streamBufferSize: 4096,
          autoGain: false,
          echoCancel: false,
          noiseSuppress: false,
        ),
      );
      _isListening = true;
      _emit(
        const SheetTunerState(
          isListening: true,
          reading: null,
          inputStatus: SheetTunerInputStatus.noSignal,
        ),
      );
      _subscription = stream.listen(
        _handleChunk,
        onError: (_) {
          _isListening = false;
          _emit(
            const SheetTunerState(
              isListening: false,
              reading: null,
              inputStatus: SheetTunerInputStatus.error,
            ),
          );
        },
        onDone: () {
          _isListening = false;
          _emit(SheetTunerState.idle);
        },
        cancelOnError: false,
      );
    } catch (_) {
      _isListening = false;
      _emit(
        const SheetTunerState(
          isListening: false,
          reading: null,
          inputStatus: SheetTunerInputStatus.audioPipelineUnavailable,
        ),
      );
      await _subscription?.cancel();
      _subscription = null;
      try {
        await _recorder.cancel();
      } catch (_) {}
    }
  }

  void updateSettings(SheetTunerSettings settings) {
    _applySettings(settings);
  }

  Future<void> stop() async {
    if (_isDisposed) {
      return;
    }

    await _subscription?.cancel();
    _subscription = null;
    if (_isListening) {
      try {
        await _recorder.stop();
      } catch (_) {
        await _recorder.cancel();
      }
    }
    _isListening = false;
    _detector.reset();
    _stabilizer.reset();
    _emit(SheetTunerState.idle);
  }

  Future<void> dispose() async {
    if (_isDisposed) {
      return;
    }
    await stop();
    await _recorder.dispose();
    await _states.close();
    _isDisposed = true;
  }

  void _handleChunk(Uint8List chunk) {
    final rawReading = _detector.addPcm16Chunk(
      chunk,
      referencePitchA4: _settings.referencePitchA4,
    );
    final reading = _stabilizer.add(
      rawReading,
      referencePitchA4: _settings.referencePitchA4,
    );
    _emit(
      SheetTunerState(
        isListening: true,
        reading: reading,
        inputStatus: reading == null
            ? SheetTunerInputStatus.noSignal
            : SheetTunerInputStatus.listening,
      ),
    );
  }

  void _emit(SheetTunerState state) {
    if (!_states.isClosed) {
      _states.add(state);
    }
  }

  void _applySettings(SheetTunerSettings settings) {
    final didChangeProfile =
        _settings.detectionProfile != settings.detectionProfile;
    final didChangeAlgorithm =
        _settings.detectionAlgorithm != settings.detectionAlgorithm;
    _settings = settings;
    _detector.configureForProfile(settings.detectionProfile);
    _detector.configureAlgorithm(settings.detectionAlgorithm);
    _stabilizer.configureForProfile(settings.detectionProfile);
    if (didChangeProfile || didChangeAlgorithm) {
      _detector.reset();
      _stabilizer.reset();
    }
  }
}
