import Flutter
import UIKit
import XCTest
import UserNotifications
@testable import Runner

class RunnerTests: XCTestCase {

  func testDailyOpenWaitsForEngineAndIsConsumedOnlyOnce() {
    let bridge = InCDailyNotificationBridge()
    bridge.captureOpen(identifier: "in_c_daily_pick", deliveredAt: Date(timeIntervalSince1970: 1),
                       action: UNNotificationDefaultActionIdentifier, payload: "today")
    XCTAssertEqual(bridge.consumeOpenPayload(), "today")
    XCTAssertNil(bridge.consumeOpenPayload())
  }

  func testSceneAndDelegateDuplicateDoesNotReopenButNextDeliveryDoes() {
    let bridge = InCDailyNotificationBridge()
    let date = Date(timeIntervalSince1970: 1)
    bridge.captureOpen(identifier: "in_c_daily_pick", deliveredAt: date,
                       action: UNNotificationDefaultActionIdentifier, payload: "today")
    XCTAssertEqual(bridge.consumeOpenPayload(), "today")
    bridge.captureOpen(identifier: "in_c_daily_pick", deliveredAt: date,
                       action: UNNotificationDefaultActionIdentifier, payload: "today")
    XCTAssertNil(bridge.consumeOpenPayload())
    bridge.captureOpen(identifier: "in_c_daily_pick", deliveredAt: date.addingTimeInterval(86400),
                       action: UNNotificationDefaultActionIdentifier, payload: "tomorrow")
    XCTAssertEqual(bridge.consumeOpenPayload(), "tomorrow")
  }

  func testDismissAndUnrelatedNotificationDoNotNavigate() {
    let bridge = InCDailyNotificationBridge()
    let date = Date(timeIntervalSince1970: 1)
    bridge.captureOpen(identifier: "in_c_daily_pick", deliveredAt: date,
                       action: UNNotificationDismissActionIdentifier, payload: "dismiss")
    bridge.captureOpen(identifier: "clef_other", deliveredAt: date,
                       action: UNNotificationDefaultActionIdentifier, payload: "unrelated")
    bridge.captureOpen(identifier: "in_c_daily_pick", deliveredAt: date,
                       action: UNNotificationDefaultActionIdentifier, payload: " ")
    XCTAssertNil(bridge.consumeOpenPayload())
    bridge.captureOpen(identifier: "in_c_daily_pick", deliveredAt: date,
                       action: UNNotificationDefaultActionIdentifier, payload: "valid")
    XCTAssertEqual(bridge.consumeOpenPayload(), "valid")
  }

  func testExample() {
    // If you add code to the Runner application, consider adding tests here.
    // See https://developer.apple.com/documentation/xctest for more information about using XCTest.
  }

}
