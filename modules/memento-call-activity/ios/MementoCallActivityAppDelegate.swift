import ExpoModulesCore
import UIKit

/// A call never outlives the app, so its Live Activity must not either.
/// Without this, a force-quit leaves the call in the Dynamic Island for hours.
public class MementoCallActivityAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if #available(iOS 17.0, *) {
      Task { await MementoCallActivities.endAll() }
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
