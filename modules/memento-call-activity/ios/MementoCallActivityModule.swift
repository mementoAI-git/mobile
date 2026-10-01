import ActivityKit
import ExpoModulesCore

/// Posted by the Live Activity's buttons (see targets/CallActivity/_shared).
let mementoCallActionNotification = Notification.Name("MementoCallActivityAction")

public class MementoCallActivityModule: Module {
  private var actionObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("MementoCallActivity")

    Events("onAction")

    OnStartObserving {
      self.actionObserver = NotificationCenter.default.addObserver(
        forName: mementoCallActionNotification,
        object: nil,
        queue: .main
      ) { [weak self] notification in
        guard let action = notification.userInfo?["action"] as? String else { return }
        self?.sendEvent("onAction", ["action": action])
      }
    }

    OnStopObserving {
      if let observer = self.actionObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      self.actionObserver = nil
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
