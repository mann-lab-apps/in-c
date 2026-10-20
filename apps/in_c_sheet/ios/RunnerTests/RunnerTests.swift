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

  func testAudioLoopNormalizationMatchesFlutterContract() {
    XCTAssertEqual(
      ClefAudioPlayerBridge.normalizeLoop(startMs: 1_500, endMs: 8_200, durationMs: 10_000),
      ClefAudioLoopRange(startMs: 1_500, endMs: 8_200)
    )
    XCTAssertEqual(
      ClefAudioPlayerBridge.normalizeLoop(startMs: -500, endMs: 12_000, durationMs: 10_000),
      ClefAudioLoopRange(startMs: 0, endMs: 10_000)
    )
    XCTAssertNil(
      ClefAudioPlayerBridge.normalizeLoop(startMs: 9_000, endMs: 8_000, durationMs: 10_000)
    )
    XCTAssertNil(
      ClefAudioPlayerBridge.normalizeLoop(startMs: nil, endMs: nil, durationMs: 10_000)
    )
  }

  func testExample() {
    // If you add code to the Runner application, consider adding tests here.
    // See https://developer.apple.com/documentation/xctest for more information about using XCTest.
  }

}
