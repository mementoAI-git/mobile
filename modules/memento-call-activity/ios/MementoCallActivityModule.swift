import ActivityKit
import ExpoModulesCore
import UIKit

/// Posted by the Live Activity's buttons (see targets/CallActivity/_shared).
let mementoCallActionNotification = Notification.Name("MementoCallActivityAction")
let mementoRecordingActionNotification = Notification.Name("MementoRecordingActivityAction")

public class MementoCallActivityModule: Module {
  /// True while JS listens for the card's buttons. Read and written on the main thread.
  static var isJSListening = false

  private var actionObserver: NSObjectProtocol?
  private var recordingActionObserver: NSObjectProtocol?
  /// Background time held while a recording uploads after the app has left the screen.
  private var backgroundTasks: [Int: UIBackgroundTaskIdentifier] = [:]
  private var nextBackgroundTaskKey = 1

  public func definition() -> ModuleDefinition {
    Name("MementoCallActivity")

    Events("onAction", "onRecordingAction")

    OnStartObserving { [weak self] in
      DispatchQueue.main.async { MementoCallActivityModule.isJSListening = true }
      self?.actionObserver = NotificationCenter.default.addObserver(
        forName: mementoCallActionNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let action = notification.userInfo?["action"] as? String else { return }
        self?.sendEvent("onAction", ["action": action])
      }
      self?.recordingActionObserver = NotificationCenter.default.addObserver(
        forName: mementoRecordingActionNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let action = notification.userInfo?["action"] as? String else { return }
        self?.sendEvent("onRecordingAction", ["action": action])
      }
    }

    OnStopObserving {
      DispatchQueue.main.async { MementoCallActivityModule.isJSListening = false }
      if let observer = self.actionObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      if let observer = self.recordingActionObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      self.actionObserver = nil
      self.recordingActionObserver = nil
    }

    Function("isSupported") { () -> Bool in
      guard #available(iOS 17.0, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("start") { (startedAtMs: Double, status: String, isMuted: Bool) async throws in
      guard #available(iOS 17.0, *) else { return }
      await MementoCallActivities.endAll()
      let attributes = MementoCallAttributes(
        startedAt: Date(timeIntervalSince1970: startedAtMs / 1000)
      )
      let state = MementoCallAttributes.ContentState(status: status, isMuted: isMuted)
      _ = try Activity.request(
        attributes: attributes,
        content: ActivityContent(state: state, staleDate: nil),
        pushType: nil
      )
    }

    AsyncFunction("update") { (status: String, isMuted: Bool) async in
      guard #available(iOS 17.0, *) else { return }
      let state = MementoCallAttributes.ContentState(status: status, isMuted: isMuted)
      for activity in Activity<MementoCallAttributes>.activities {
        await activity.update(ActivityContent(state: state, staleDate: nil))
      }
    }

    AsyncFunction("end") { () async in
      guard #available(iOS 17.0, *) else { return }
      await MementoCallActivities.endAll()
    }

    // The Overview recorder's card: Pause/Resume and Stop on the lock screen and Dynamic Island.
    AsyncFunction("startRecording") { (elapsed: Double, isPaused: Bool) async throws in
      guard #available(iOS 17.0, *) else { return }
      await MementoRecordingActivities.endAll()
      let state = MementoRecordingAttributes.ContentState(isPaused: isPaused, elapsed: elapsed, updatedAt: Date())
      _ = try Activity.request(
        attributes: MementoRecordingAttributes(),
        content: ActivityContent(state: state, staleDate: nil),
        pushType: nil
      )
    }

    AsyncFunction("updateRecording") { (elapsed: Double, isPaused: Bool) async in
      guard #available(iOS 17.0, *) else { return }
      let state = MementoRecordingAttributes.ContentState(isPaused: isPaused, elapsed: elapsed, updatedAt: Date())
      for activity in Activity<MementoRecordingAttributes>.activities {
        await activity.update(ActivityContent(state: state, staleDate: nil))
      }
    }

    AsyncFunction("endRecording") { () async in
      guard #available(iOS 17.0, *) else { return }
      await MementoRecordingActivities.endAll()
    }

    // Asks iOS for time to finish work (an upload) after the app leaves the screen.
    Function("beginBackgroundTask") { () -> Int in
      let key = self.nextBackgroundTaskKey
      self.nextBackgroundTaskKey += 1
      DispatchQueue.main.async {
        let id = UIApplication.shared.beginBackgroundTask(withName: "MementoRecordingUpload") { [weak self] in
          self?.finishBackgroundTask(key)
        }
        self.backgroundTasks[key] = id
      }
      return key
    }

    Function("endBackgroundTask") { (key: Int) in
      DispatchQueue.main.async { self.finishBackgroundTask(key) }
    }
  }

  /// Main thread only.
  private func finishBackgroundTask(_ key: Int) {
    guard let id = backgroundTasks.removeValue(forKey: key), id != .invalid else { return }
    UIApplication.shared.endBackgroundTask(id)
  }
}

enum MementoRecordingActivities {
  @available(iOS 17.0, *)
  static func endAll() async {
    for activity in Activity<MementoRecordingAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}

enum MementoCallActivities {
  @available(iOS 17.0, *)
  static func endAll() async {
    for activity in Activity<MementoCallAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}
