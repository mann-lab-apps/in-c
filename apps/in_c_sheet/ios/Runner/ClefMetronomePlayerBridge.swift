import AVFoundation
import Flutter
import Foundation

final class ClefMetronomePlayerBridge {
  static let shared = ClefMetronomePlayerBridge()

  private static let sampleRate = 44_100.0
  private static let clickDurationSeconds = 0.045
  private let channelName = "clef/metronome_player"
  private let sessionOwner = "clef-metronome-player"
  private var channel: FlutterMethodChannel?
  private var engine: AVAudioEngine?
  private var regularNode: AVAudioPlayerNode?
  private var accentNode: AVAudioPlayerNode?
  private var regularBuffer: AVAudioPCMBuffer?
  private var accentBuffer: AVAudioPCMBuffer?
  private var idleTimer: Timer?

  func configure(messenger: FlutterBinaryMessenger) {
    channel?.setMethodCallHandler(nil)
    let nextChannel = FlutterMethodChannel(name: channelName, binaryMessenger: messenger)
    nextChannel.setMethodCallHandler { [weak self] call, result in
      self?.handle(call: call, result: result)
    }
    channel = nextChannel
  }

  private func handle(call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "prepare":
      do {
        try prepare()
        result(nil)
      } catch {
        stop()
        result(playbackError(error))
      }
    case "playClick":
      let arguments = call.arguments as? [String: Any]
      let accent = arguments?["accent"] as? Bool ?? false
      let volume = Self.normalizeVolume(arguments?["volume"])
      guard volume > 0 else {
        result(nil)
        return
      }
      do {
        try playClick(accent: accent, volume: volume)
        result(nil)
      } catch {
        stop()
        result(playbackError(error))
      }
    case "stop":
      stop()
      result(nil)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func prepare() throws {
    guard engine == nil else {
      return
    }
    guard
      let format = AVAudioFormat(
        standardFormatWithSampleRate: Self.sampleRate,
        channels: 1
      )
    else {
      throw ClefMetronomePlayerError.audioFormatUnavailable
    }
    let engine = AVAudioEngine()
    let regularNode = AVAudioPlayerNode()
    let accentNode = AVAudioPlayerNode()
    let regularBuffer = try Self.makeClickBuffer(accent: false, format: format)
    let accentBuffer = try Self.makeClickBuffer(accent: true, format: format)
    engine.attach(regularNode)
    engine.attach(accentNode)
    engine.connect(regularNode, to: engine.mainMixerNode, format: format)
    engine.connect(accentNode, to: engine.mainMixerNode, format: format)
    self.engine = engine
    self.regularNode = regularNode
    self.accentNode = accentNode
    self.regularBuffer = regularBuffer
    self.accentBuffer = accentBuffer
  }

  private func playClick(accent: Bool, volume: Double) throws {
    try prepare()
    guard
      let engine,
      let node = accent ? accentNode : regularNode,
      let buffer = accent ? accentBuffer : regularBuffer
    else {
      throw ClefMetronomePlayerError.audioBufferUnavailable
    }
    try ClefAudioSessionCoordinator.shared.activate(owner: sessionOwner)
    if !engine.isRunning {
      engine.prepare()
      try engine.start()
    }
    node.stop()
    node.volume = Float(volume)
    node.scheduleBuffer(buffer)
    node.play()
    scheduleIdleStop()
  }

  func stop() {
    idleTimer?.invalidate()
    idleTimer = nil
    regularNode?.stop()
    accentNode?.stop()
    engine?.stop()
    ClefAudioSessionCoordinator.shared.deactivate(owner: sessionOwner)
  }

  private func scheduleIdleStop() {
    idleTimer?.invalidate()
    let timer = Timer(timeInterval: 2, repeats: false) { [weak self] _ in
      self?.stop()
    }
    RunLoop.main.add(timer, forMode: .common)
    idleTimer = timer
  }

  static func normalizeVolume(_ value: Any?) -> Double {
    let volume: Double
    if let number = value as? NSNumber {
      volume = number.doubleValue
    } else if let text = value as? String, let parsed = Double(text) {
      volume = parsed
    } else {
      volume = 0.85
    }
    guard volume.isFinite else {
      return 0.85
    }
    return max(0, min(1, volume))
  }

  static func makeClickSamples(accent: Bool) -> [Float] {
    let sampleCount = Int((sampleRate * clickDurationSeconds).rounded())
    let frequency = accent ? 1_760.0 : 1_240.0
    let gain = accent ? 0.82 : 0.58
    let phaseStep = 2 * Double.pi * frequency / sampleRate
    return (0..<sampleCount).map { index in
      let fade = 1 - Double(index) / Double(sampleCount)
      return Float(sin(Double(index) * phaseStep) * fade * fade * fade * gain)
    }
  }

  private static func makeClickBuffer(
    accent: Bool,
    format: AVAudioFormat
  ) throws -> AVAudioPCMBuffer {
    let samples = makeClickSamples(accent: accent)
    let frameCount = AVAudioFrameCount(samples.count)
    guard
      let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount),
      let channel = buffer.floatChannelData?[0]
    else {
      throw ClefMetronomePlayerError.audioBufferUnavailable
    }
    buffer.frameLength = frameCount
    for (index, sample) in samples.enumerated() {
      channel[index] = sample
    }
    return buffer
  }

  private func playbackError(_ error: Error) -> FlutterError {
    FlutterError(
      code: "playback_error",
      message: error.localizedDescription,
      details: nil
    )
  }
}

private enum ClefMetronomePlayerError: LocalizedError {
  case audioFormatUnavailable
  case audioBufferUnavailable

  var errorDescription: String? {
    switch self {
    case .audioFormatUnavailable:
      return "Metronome audio format is unavailable."
    case .audioBufferUnavailable:
      return "Metronome click buffer could not be created."
    }
  }
}
