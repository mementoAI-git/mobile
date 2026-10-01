import ExpoModulesCore
import UIKit

/// A call never outlives the app, so its Live Activity must not either.
/// Without this, a force-quit leaves the call in the Dynamic Island for hours.
public class MementoCallActivityAppDelegate: ExpoAppDelegateSubscriber {
  private var actionObserver: NSObjectProtocol?

  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if #available(iOS 17.0, *) {
      Task { await MementoCallActivities.endAll() }
    }
    // A button pressed while JS isn't listening has no live call behind it,
    // for example during launch. Clear the card instead of losing the press.
    actionObserver = NotificationCenter.default.addObserver(
      forName: mementoCallActionNotification,
      object: nil,
      queue: .main
    ) { _ in
      guard !MementoCallActivityModule.isJSListening else { return }
      if #available(iOS 17.0, *) {
        Task { await MementoCallActivities.endAll() }
      }
    }
    return true
  }

  public func applicationWillTerminate(_ application: UIApplication) {
    guard #available(iOS 17.0, *) else { return }
    let done = DispatchSemaphore(value: 0)
    Task.detached {
      await MementoCallActivities.endAll()
      done.signal()
    }
    _ = done.wait(timeout: .now() + 2)
  }
}
