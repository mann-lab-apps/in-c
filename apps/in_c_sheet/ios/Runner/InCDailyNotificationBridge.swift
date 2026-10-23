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
      case "permissionStatus":
        UNUserNotificationCenter.current().getNotificationSettings { settings in
          let status: String
          switch settings.authorizationStatus {
          case .authorized: status = "authorized"
          case .provisional, .ephemeral: status = "provisional"
          case .denied: status = "denied"
          case .notDetermined: status = "not-determined"
          @unknown default: status = "unknown"
          }
          DispatchQueue.main.async { result(status) }
        }
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
#if targetEnvironment(simulator)
      case "inspectPendingDailyPick":
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
          let rows = requests.filter { $0.identifier == self.notificationIdentifier }.map { request -> [String: Any] in
            let trigger = request.trigger as? UNCalendarNotificationTrigger
            return [
              "title": request.content.title,
              "body": request.content.body,
              "payload": request.content.userInfo["payload"] as? String ?? "",
              "hour": trigger?.dateComponents.hour ?? -1,
              "minute": trigger?.dateComponents.minute ?? -1,
              "repeats": trigger?.repeats ?? false,
              "hasFixedTimeZone": trigger?.dateComponents.timeZone != nil
            ]
          }
          DispatchQueue.main.async { result(rows) }
        }
#endif
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
    guard let hour = map["hour"] as? Int, (0...23).contains(hour),
          let minute = map["minute"] as? Int, (0...59).contains(minute) else {
      result(FlutterError(code: "bad_args", message: "Invalid reminder time.", details: nil))
      return
    }

    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = .default
    content.userInfo = ["payload": payload]

    var dateComponents = DateComponents()
    // No fixed time zone: follow the user's local wall-clock time.
    dateComponents.hour = hour
    dateComponents.minute = minute

    let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
    let request = UNNotificationRequest(
      identifier: notificationIdentifier,
      content: content,
      trigger: trigger
    )
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
      guard settings.authorizationStatus == .authorized ||
              settings.authorizationStatus == .provisional ||
              settings.authorizationStatus == .ephemeral else {
        DispatchQueue.main.async {
          result(FlutterError(code: "permission_denied", message: "Notification authorization is required.", details: nil))
        }
        return
      }
      // Adding the same identifier replaces the pending request without a removal gap.
      center.add(request) { error in
        DispatchQueue.main.async {
          if let error = error {
            result(FlutterError(code: "schedule_error", message: error.localizedDescription, details: nil))
            return
          }
          result(nil)
        }
      }
    }
  }

  private func cancelDailyPick(result: FlutterResult) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(
      withIdentifiers: [notificationIdentifier]
    )
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [notificationIdentifier])
    result(nil)
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    if let payload = response.notification.request.content.userInfo["payload"] as? String {
      DispatchQueue.main.async {
        self.launchPayload = payload
        self.channel?.invokeMethod("dailyPickNotificationOpen", arguments: nil)
      }
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
