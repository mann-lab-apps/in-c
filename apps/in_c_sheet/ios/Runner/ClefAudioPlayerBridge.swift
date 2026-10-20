import AVFoundation
import Flutter
import Foundation

struct ClefAudioLoopRange: Equatable {
  let startMs: Int
  let endMs: Int
}

final class ClefAudioPlayerBridge: NSObject, AVAudioPlayerDelegate {
  static let shared = ClefAudioPlayerBridge()

  private let channelName = "clef/audio_player"
  private let sessionOwner = "clef-linked-audio-player"
  private var channel: FlutterMethodChannel?
  private var player: AVAudioPlayer?
  private var loopRange: ClefAudioLoopRange?
  private var loopTimer: Timer?

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
      guard
        let arguments = call.arguments as? [String: Any],
        let path = arguments["path"] as? String,
        !path.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      else {
        result(
          FlutterError(
            code: "invalid_path",
            message: "No audio file path was provided.",
            details: nil
          ))
        return
      }
      do {
        try play(
          path: path,
          requestedLoopStartMs: Self.integer(arguments["loopStartMs"]),
          requestedLoopEndMs: Self.integer(arguments["loopEndMs"])
        )
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
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private func play(
    path: String,
    requestedLoopStartMs: Int?,
    requestedLoopEndMs: Int?
  ) throws {
    stop()
    let normalizedPath = path.trimmingCharacters(in: .whitespacesAndNewlines)
    guard FileManager.default.fileExists(atPath: normalizedPath) else {
      throw ClefAudioPlayerError.missingFile
    }

    try ClefAudioSessionCoordinator.shared.activate(owner: sessionOwner)

    let nextPlayer = try AVAudioPlayer(contentsOf: URL(fileURLWithPath: normalizedPath))
    nextPlayer.delegate = self
    nextPlayer.prepareToPlay()
    let durationMs = Int((nextPlayer.duration * 1000).rounded())
    let normalizedLoop = Self.normalizeLoop(
      startMs: requestedLoopStartMs,
      endMs: requestedLoopEndMs,
      durationMs: durationMs
    )
    if let normalizedLoop {
      nextPlayer.currentTime = Double(normalizedLoop.startMs) / 1000
    }
    player = nextPlayer
    loopRange = normalizedLoop
    guard nextPlayer.play() else {
      stop()
      throw ClefAudioPlayerError.playbackDidNotStart
    }
    scheduleLoopCheck()
  }

  func stop() {
    loopTimer?.invalidate()
    loopTimer = nil
    player?.stop()
    player = nil
    loopRange = nil
    ClefAudioSessionCoordinator.shared.deactivate(owner: sessionOwner)
  }

  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    guard flag else {
      stop()
      return
    }
    guard let loopRange else {
      stop()
      return
    }
    player.currentTime = Double(loopRange.startMs) / 1000
    if player.play() {
      scheduleLoopCheck()
    } else {
      stop()
    }
  }

  func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    stop()
  }

  private func scheduleLoopCheck() {
    loopTimer?.invalidate()
    guard loopRange != nil else {
      return
    }
    let timer = Timer(timeInterval: 0.04, repeats: true) { [weak self] _ in
      self?.checkLoopBoundary()
    }
    RunLoop.main.add(timer, forMode: .common)
    loopTimer = timer
  }

  private func checkLoopBoundary() {
    guard let player, let loopRange, player.isPlaying else {
      return
    }
    let currentMs = Int((player.currentTime * 1000).rounded())
    if currentMs >= loopRange.endMs {
      player.currentTime = Double(loopRange.startMs) / 1000
      player.play()
    }
  }

  static func normalizeLoop(
    startMs: Int?,
    endMs: Int?,
    durationMs: Int
  ) -> ClefAudioLoopRange? {
    guard
      let requestedStartMs = startMs,
      let requestedEndMs = endMs,
      durationMs > 0
    else {
      return nil
    }
    let normalizedStartMs = min(max(requestedStartMs, 0), durationMs - 1)
    let normalizedEndMs = max(min(requestedEndMs, durationMs), 0)
    guard normalizedEndMs > normalizedStartMs else {
      return nil
    }
    return ClefAudioLoopRange(startMs: normalizedStartMs, endMs: normalizedEndMs)
  }

  private static func integer(_ value: Any?) -> Int? {
    if let value = value as? NSNumber {
      return value.intValue
    }
    if let value = value as? String {
      return Int(value)
    }
    return nil
  }
}

private enum ClefAudioPlayerError: LocalizedError {
  case missingFile
  case playbackDidNotStart

  var errorDescription: String? {
    switch self {
    case .missingFile:
      return "Audio file does not exist."
    case .playbackDidNotStart:
      return "Audio playback did not start."
    }
  }
}
