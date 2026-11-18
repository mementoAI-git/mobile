import AppIntents
import Foundation

// Linked into both the app and the widget. A LiveActivityIntent runs in the
// app's process, where the MementoCallActivity module forwards it to JS.

@available(iOS 17.0, *)
struct ToggleRecordingPauseIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Pause or resume the Memento recording"
  static let isDiscoverable = false

  func perform() async throws -> some IntentResult {
    await postRecordingAction("togglePause")
    return .result()
  }
}

@available(iOS 17.0, *)
struct StopRecordingIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Stop and save the Memento recording"
  static let isDiscoverable = false

  func perform() async throws -> some IntentResult {
    await postRecordingAction("stop")
    return .result()
  }
}

@MainActor
private func postRecordingAction(_ action: String) {
  NotificationCenter.default.post(
    name: Notification.Name("MementoRecordingActivityAction"),
    object: nil,
    userInfo: ["action": action]
  )
}
