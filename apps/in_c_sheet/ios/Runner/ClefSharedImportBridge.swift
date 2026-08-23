import Flutter
import UIKit
import UniformTypeIdentifiers

final class ClefSharedImportBridge {
  static let shared = ClefSharedImportBridge()

  private let channelName = "clef/shared_imports"
  private let fileManager = FileManager.default
  private var channel: FlutterMethodChannel?
  private var pendingFiles: [[String: String]] = []
  private var handledKeys: Set<String> = []

  private init() {}

  func configure(messenger: FlutterBinaryMessenger) {
    channel = FlutterMethodChannel(name: channelName, binaryMessenger: messenger)
    channel?.setMethodCallHandler { [weak self] call, result in
      guard call.method == "getInitialSharedFiles" else {
        result(FlutterMethodNotImplemented)
        return
      }
      result(self?.drainPendingFiles() ?? [])
    }
    flushPendingFiles()
  }

  func handle(urlContexts: Set<UIOpenURLContext>) {
    handle(urls: urlContexts.map { $0.url })
  }

  func handle(urls: [URL]) {
    let files = urls.compactMap { copySharedPdfToCache($0) }
    guard !files.isEmpty else { return }
    pendingFiles.append(contentsOf: files)
    flushPendingFiles()
  }

  private func flushPendingFiles() {
    guard let channel = channel else { return }
    let files = drainPendingFiles()
    guard !files.isEmpty else { return }
    channel.invokeMethod("sharedFiles", arguments: files)
  }

  private func drainPendingFiles() -> [[String: String]] {
    let files = pendingFiles
    pendingFiles.removeAll()
    return files
  }

  private func copySharedPdfToCache(_ url: URL) -> [String: String]? {
    guard isPdf(url) else { return nil }
    let key = url.absoluteString
    guard !handledKeys.contains(key) else { return nil }
    handledKeys.insert(key)

    let didAccess = url.startAccessingSecurityScopedResource()
    defer {
      if didAccess {
        url.stopAccessingSecurityScopedResource()
      }
    }

    do {
      let displayName = displayName(for: url)
      let directory = try sharedImportsDirectory()
      let fileName = "\(Int(Date().timeIntervalSince1970 * 1000))-\(safeFileName(displayName))"
      let destination = directory.appendingPathComponent(fileName)
      if fileManager.fileExists(atPath: destination.path) {
        try fileManager.removeItem(at: destination)
      }
      try fileManager.copyItem(at: url, to: destination)
      return ["path": destination.path, "name": displayName]
    } catch {
      return nil
    }
  }

  private func isPdf(_ url: URL) -> Bool {
    if url.pathExtension.lowercased() == "pdf" {
      return true
    }
    if #available(iOS 14.0, *) {
      let values = try? url.resourceValues(forKeys: [.contentTypeKey])
      return values?.contentType?.conforms(to: .pdf) == true
    }
    return false
  }

  private func displayName(for url: URL) -> String {
    let rawName = url.lastPathComponent.isEmpty ? "shared-score.pdf" : url.lastPathComponent
    return rawName.lowercased().hasSuffix(".pdf") ? rawName : "\(rawName).pdf"
  }

  private func sharedImportsDirectory() throws -> URL {
    let caches = try fileManager.url(
      for: .cachesDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let directory = caches.appendingPathComponent("shared-imports", isDirectory: true)
    if !fileManager.fileExists(atPath: directory.path) {
      try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    }
    return directory
  }

  private func safeFileName(_ name: String) -> String {
    let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789가-힣._-")
    let scalars = name.unicodeScalars.map { allowed.contains($0) ? Character($0) : "-" }
    let sanitized = String(scalars).replacingOccurrences(
      of: "-+",
      with: "-",
      options: .regularExpression
    )
    let trimmed = sanitized.trimmingCharacters(in: CharacterSet(charactersIn: "-."))
    return trimmed.isEmpty ? "shared-score.pdf" : trimmed
  }
}
