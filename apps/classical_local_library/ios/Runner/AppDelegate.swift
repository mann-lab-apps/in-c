import Flutter
import MediaPlayer
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private var systemMedia: LocalSystemMediaBridge?
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    if let media = engineBridge.pluginRegistry.registrar(forPlugin: "LocalSystemMedia") {
      systemMedia = LocalSystemMediaBridge(messenger: media.messenger())
    }
    guard let registrar = engineBridge.pluginRegistry.registrar(
      forPlugin: "LocalBackupPolicy"
    ) else { return }
    let channel = FlutterMethodChannel(
      name: "app.inc.classical_local_library/backup_policy",
      binaryMessenger: registrar.messenger()
    )
    channel.setMethodCallHandler { call, result in
      guard call.method == "excludeFromBackup",
            let arguments = call.arguments as? [String: Any],
            let path = arguments["path"] as? String else {
        result(FlutterMethodNotImplemented)
        return
      }
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      var url = URL(fileURLWithPath: path)
      do {
        try url.setResourceValues(values)
        result(nil)
      } catch {
        result(
          FlutterError(
            code: "backup_exclusion_failed",
            message: error.localizedDescription,
            details: path
          )
        )
      }
    }
  }
}

/// iOS-only system presentation. Audio and command ordering remain in Dart.
private final class LocalSystemMediaBridge {
  private let channel: FlutterMethodChannel
  private var payload: [String: Any]?
  private var targets: [(MPRemoteCommand, Any)] = []
  private let center = MPRemoteCommandCenter.shared()

  init(messenger: FlutterBinaryMessenger) {
    channel = FlutterMethodChannel(name: "app.ddirori.play/system_media", binaryMessenger: messenger)
    channel.setMethodCallHandler { [weak self] call, result in
      guard let self = self else { result(nil); return }
      switch call.method {
      case "publish":
        if let value = call.arguments as? [String: Any] { self.publish(value) }
        else { self.clear() }
        result(nil)
      case "clear": self.clear(); result(nil)
      #if DEBUG
      case "inspect":
        // QA reads the real public Now Playing center, never private APIs.
        let info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        result([
          "title": info[MPMediaItemPropertyTitle] as? String ?? "",
          "artist": info[MPMediaItemPropertyArtist] as? String ?? "",
          "album": info[MPMediaItemPropertyAlbumTitle] as? String ?? "",
          "position": info[MPNowPlayingInfoPropertyElapsedPlaybackTime] as? Double ?? 0,
          "rate": info[MPNowPlayingInfoPropertyPlaybackRate] as? Double ?? 0,
          "seekEnabled": self.center.changePlaybackPositionCommand.isEnabled,
          "playEnabled": self.center.playCommand.isEnabled,
          "nextEnabled": self.center.nextTrackCommand.isEnabled,
          "previousEnabled": self.center.previousTrackCommand.isEnabled,
          "empty": info.isEmpty
        ])
      case "testCommand":
        // Explicit event injection for integration QA; this is not an OS button press.
        let args = call.arguments as? [String: Any] ?? [:]
        result(self.dispatch(args["action"] as? String ?? "", positionMillis: args["positionMillis"] as? Int))
      #endif
      default: result(FlutterMethodNotImplemented)
      }
    }
  }

  private func commands() -> [(String, MPRemoteCommand)] {
    return [("play", center.playCommand), ("pause", center.pauseCommand),
            ("toggle", center.togglePlayPauseCommand), ("next", center.nextTrackCommand),
            ("previous", center.previousTrackCommand), ("seek", center.changePlaybackPositionCommand),
            ("stop", center.stopCommand)]
  }

  deinit { clear() }

  private func register() {
    guard targets.isEmpty else { return }
    for (name, command) in commands() {
      let token = command.addTarget { [weak self] event in
        guard let self = self else { return .commandFailed }
        let perform = { () -> MPRemoteCommandHandlerStatus in
          var position: Int?
          if name == "seek" {
            guard let seek = event as? MPChangePlaybackPositionCommandEvent,
                  seek.positionTime.isFinite, seek.positionTime >= 0,
                  seek.positionTime < Double(Int.max / 1000) else { return .commandFailed }
            position = Int(seek.positionTime * 1000)
          }
          return self.dispatch(name, positionMillis: position) ? .success : .commandFailed
        }
        return Thread.isMainThread ? perform() : DispatchQueue.main.sync(execute: perform)
      }
      targets.append((command, token))
    }
  }

  private func dispatch(_ action: String, positionMillis: Int?) -> Bool {
    guard let value = payload, let actions = value["actions"] as? [String],
          actions.contains(action), let id = value["id"] as? String,
          let generation = value["generation"] as? Int else { return false }
    if action == "seek" && (positionMillis == nil || positionMillis! < 0) { return false }
    var args: [String: Any] = ["action": action, "id": id, "generation": generation]
    if let position = positionMillis { args["positionMillis"] = position }
    channel.invokeMethod("command", arguments: args)
    return true
  }

  private func publish(_ value: [String: Any]) {
    guard let title = value["title"] as? String,
          let id = value["id"] as? String else { clear(); return }
    register()
    payload = value
    let actions = value["actions"] as? [String] ?? []
    for (name, command) in commands() { command.isEnabled = actions.contains(name) }
    var info: [String: Any] = [
      MPMediaItemPropertyTitle: title,
      MPNowPlayingInfoPropertyExternalContentIdentifier: id,
      MPNowPlayingInfoPropertyElapsedPlaybackTime: Double(value["positionMillis"] as? Int ?? 0) / 1000,
      MPNowPlayingInfoPropertyPlaybackRate: value["rate"] as? Double ?? 0,
      MPNowPlayingInfoPropertyDefaultPlaybackRate: 1.0,
      MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue,
      MPNowPlayingInfoPropertyIsLiveStream: false,
      MPNowPlayingInfoPropertyPlaybackQueueIndex: value["index"] as? Int ?? 0,
      MPNowPlayingInfoPropertyPlaybackQueueCount: value["count"] as? Int ?? 0
    ]
    if let artist = value["artist"] as? String { info[MPMediaItemPropertyArtist] = artist }
    if let album = value["album"] as? String { info[MPMediaItemPropertyAlbumTitle] = album }
    if let duration = value["durationMillis"] as? Int, duration > 0 {
      info[MPMediaItemPropertyPlaybackDuration] = Double(duration) / 1000
    }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func clear() {
    payload = nil
    for (command, token) in targets { command.removeTarget(token) }
    targets.removeAll()
    for (_, command) in commands() { command.isEnabled = false }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
  }
}
