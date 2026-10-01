import ActivityKit
import Foundation

// Keep in sync with targets/CallActivity/MementoCallAttributes.swift.
// ActivityKit matches the app and the widget by this type's name and shape.
struct MementoCallAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// "listening", "speaking" or "muted".
    var status: String
    var isMuted: Bool
  }

  /// When the call started; the widget counts up from it.
  var startedAt: Date
}
