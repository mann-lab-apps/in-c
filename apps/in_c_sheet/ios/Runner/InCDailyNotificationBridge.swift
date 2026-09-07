import Flutter
import UIKit
import UserNotifications

final class InCDailyNotificationBridge: NSObject, UNUserNotificationCenterDelegate {
  static let shared = InCDailyNotificationBridge()

  private var channel: FlutterMethodChannel?
  private var launchPayload: String?
  private let notificationIdentifier = "in_c_daily_pick"

  func configure(messenger: FlutterBinaryMessenger) {
    channel = FlutterMethodChannel(
      name: "mannlab.in_c/daily_notifications",
      binaryMessenger: messenger
    )
    UNUserNotificationCenter.current().delegate = self
    channel?.setMethodCallHandler { [weak self] call, result in
      guard let self = self else {
        result(FlutterError(code: "deallocated", message: nil, details: nil))
        return
      }
      switch call.method {
      case "requestPermission":
        self.requestPermission(result: result)
      case "scheduleDailyPick":
        self.scheduleDailyPick(arguments: call.arguments, result: result)
      case "cancelDailyPick":
        self.cancelDailyPick(result: result)
      case "consumeLaunchPayload":
        let payload = self.launchPayload
        self.launchPayload = nil
        result(payload)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private func requestPermission(result: @escaping FlutterResult) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) {
      granted, error in
      DispatchQueue.main.async {
        if let error = error {
          result(FlutterError(code: "permission_error", message: error.localizedDescription, details: nil))
          return
        }
        result(granted ? "granted" : "denied")
      }
    }
  }

  private func scheduleDailyPick(arguments: Any?, result: @escaping FlutterResult) {
    guard let map = arguments as? [String: Any],
          let title = map["title"] as? String,
          let body = map["body"] as? String,
          let payload = map["payload"] as? String else {
      result(FlutterError(code: "bad_args", message: "Missing Daily Pick notification fields.", details: nil))
      return
    }
    let hour = map["hour"] as? Int ?? 9
    let minute = map["minute"] as? Int ?? 0

    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = .default
    content.userInfo = ["payload": payload]

    var dateComponents = DateComponents()
    dateComponents.hour = max(0, min(hour, 23))
    dateComponents.minute = max(0, min(minute, 59))

    let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
    let request = UNNotificationRequest(
      identifier: notificationIdentifier,
      content: content,
      trigger: trigger
    )
    UNUserNotificationCenter.current().removePendingNotificationRequests(
      withIdentifiers: [notificationIdentifier]
    )
    UNUserNotificationCenter.current().add(request) { error in
      DispatchQueue.main.async {
        if let error = error {
          result(FlutterError(code: "schedule_error", message: error.localizedDescription, details: nil))
          return
        }
        result(nil)
      }
    }
  }

  private func cancelDailyPick(result: FlutterResult) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(
      withIdentifiers: [notificationIdentifier]
    )
    result(nil)
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    if let payload = response.notification.request.content.userInfo["payload"] as? String {
      launchPayload = payload
      channel?.invokeMethod("dailyPickNotificationOpen", arguments: payload)
    }
    completionHandler()
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound])
    } else {
      completionHandler([.alert, .sound])
    }
  }
}
