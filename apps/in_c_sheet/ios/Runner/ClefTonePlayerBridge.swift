import AVFoundation
import Flutter
import Foundation

final class ClefAudioSessionCoordinator {
  static let shared = ClefAudioSessionCoordinator()

  private var activeOwners = Set<String>()

  func activate(owner: String) throws {
    if activeOwners.isEmpty {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
      try session.setActive(true)
    }
    activeOwners.insert(owner)
  }

  func deactivate(owner: String) {
    guard activeOwners.remove(owner) != nil, activeOwners.isEmpty else {
      return
    }
    try? AVAudioSession.sharedInstance().setActive(
      false,
      options: [.notifyOthersOnDeactivation]
    )
  }
}

final class ClefTonePlayerBridge {
  static let shared = ClefTonePlayerBridge()

  static let maximumFrequencyCount = 8
  private static let sampleRate = 44_100.0
  private static let loopDurationSeconds = 10.0
  private let channelName = "clef/tone_player"
  private let sessionOwner = "clef-tone-player"
  private var channel: FlutterMethodChannel?
  private var engine: AVAudioEngine?
  private var playerNode: AVAudioPlayerNode?

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
    case "play":
      guard let arguments = call.arguments as? [String: Any] else {
        result(invalidFrequenciesError())
        return
      }
      let frequencies = Self.normalizeFrequencies(arguments["frequencies"])
      guard !frequencies.isEmpty else {
        result(invalidFrequenciesError())
        return
      }
      let volume = Self.normalizeVolume(arguments["volume"])
      do {
        try play(frequencies: frequencies, volume: volume)
        result(nil)
      } catch {
        stop()
        result(
          FlutterError(
            code: "playback_error",
            message: error.localizedDescription,
            details: nil
          ))
      }
    case "stop":
      stop()
      result(nil)
    case "routeInfo":
      let session = AVAudioSession.sharedInstance()
      result([
        "outputs": session.currentRoute.outputs.map { $0.portType.rawValue },
        "systemVolume": session.outputVolume,
      ])
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func play(frequencies: [Double], volume: Double) throws {
    stop()
    try ClefAudioSessionCoordinator.shared.activate(owner: sessionOwner)

    let engine = AVAudioEngine()
    let node = AVAudioPlayerNode()
    guard
      let format = AVAudioFormat(
        standardFormatWithSampleRate: Self.sampleRate,
        channels: 1
      )
    else {
      throw ClefTonePlayerError.audioFormatUnavailable
    }
    let frameCount = AVAudioFrameCount(Self.sampleRate * Self.loopDurationSeconds)
    guard
      let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount),
      let samples = buffer.floatChannelData?[0]
    else {
      throw ClefTonePlayerError.audioBufferUnavailable
    }
    buffer.frameLength = frameCount
    let cycles = frequencies.map { frequency in
      max(1, Int((frequency * Self.loopDurationSeconds).rounded()))
    }
    let gain = volume * 0.65 / Double(frequencies.count)
    for frame in 0..<Int(frameCount) {
      var sample = 0.0
      let progress = Double(frame) / Double(frameCount)
      for cycleCount in cycles {
        sample += sin(2 * Double.pi * Double(cycleCount) * progress)
      }
      samples[frame] = Float(max(-1, min(1, sample * gain)))
    }

    engine.attach(node)
    engine.connect(node, to: engine.mainMixerNode, format: format)
    node.scheduleBuffer(buffer, at: nil, options: [.loops])
    engine.prepare()
    try engine.start()
    node.play()
    self.engine = engine
    playerNode = node
  }

  func stop() {
    playerNode?.stop()
    if let engine, let playerNode {
      engine.disconnectNodeOutput(playerNode)
      engine.detach(playerNode)
    }
    engine?.stop()
    playerNode = nil
    engine = nil
    ClefAudioSessionCoordinator.shared.deactivate(owner: sessionOwner)
  }

  static func normalizeFrequencies(_ value: Any?) -> [Double] {
    guard let values = value as? [Any] else {
      return []
    }
    return values.compactMap { value in
      let frequency: Double?
      if let number = value as? NSNumber {
        frequency = number.doubleValue
      } else if let text = value as? String {
        frequency = Double(text)
      } else {
        frequency = nil
      }
      guard let frequency, frequency.isFinite, (20...20_000).contains(frequency) else {
        return nil
      }
      return frequency
    }.prefix(maximumFrequencyCount).map { $0 }
  }

  static func normalizeVolume(_ value: Any?) -> Double {
    let volume: Double
    if let number = value as? NSNumber {
      volume = number.doubleValue
    } else if let text = value as? String, let parsed = Double(text) {
      volume = parsed
    } else {
      volume = 0.35
    }
    guard volume.isFinite else {
      return 0.35
    }
    return max(0, min(1, volume))
  }

  private func invalidFrequenciesError() -> FlutterError {
    FlutterError(
      code: "invalid_frequencies",
      message: "No playable frequencies were provided.",
      details: nil
    )
  }
}

private enum ClefTonePlayerError: LocalizedError {
  case audioFormatUnavailable
  case audioBufferUnavailable

  var errorDescription: String? {
    switch self {
    case .audioFormatUnavailable:
      return "Tone audio format is unavailable."
    case .audioBufferUnavailable:
      return "Tone audio buffer could not be created."
    }
  }
}
