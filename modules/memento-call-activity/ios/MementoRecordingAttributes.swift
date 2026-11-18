import ActivityKit
import Foundation

// Keep in sync with targets/CallActivity/MementoRecordingAttributes.swift.
// ActivityKit matches the app and the widget by this type's name and shape.
struct MementoRecordingAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var isPaused: Bool
    /// Seconds recorded when this state was sent.
    var elapsed: Double
    /// When this state was sent; while recording, the timer counts up from `updatedAt - elapsed`.
    var updatedAt: Date
  }
}
