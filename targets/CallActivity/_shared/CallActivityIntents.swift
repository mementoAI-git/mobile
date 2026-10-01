import AppIntents
import Foundation

// Linked into both the app and the widget. A LiveActivityIntent runs in the
// app's process, where the MementoCallActivity module forwards it to JS.

@available(iOS 17.0, *)
struct ToggleCallMuteIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Mute or unmute the Memento call"
  static let isDiscoverable = false

  func perform() async throws -> some IntentResult {
    await postCallAction("toggleMute")
    return .result()
  }
}

@available(iOS 17.0, *)
struct EndCallIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "End the Memento call"
  static let isDiscoverable = false

  func perform() async throws -> some IntentResult {
    await postCallAction("end")
    return .result()
  }
}

@MainActor
private func postCallAction(_ action: String) {
  NotificationCenter.default.post(
    name: Notification.Name("MementoCallActivityAction"),
    object: nil,
    userInfo: ["action": action]
  )
}
