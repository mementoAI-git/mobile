import ExpoModulesCore
import UIKit

/// A call or a recording never outlives the app, so its Live Activity must not either.
/// Without this, a force-quit leaves the card in the Dynamic Island for hours.
public class MementoCallActivityAppDelegate: ExpoAppDelegateSubscriber {
  private var actionObserver: NSObjectProtocol?
  private var recordingActionObserver: NSObjectProtocol?

  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if #available(iOS 17.0, *) {
      Task {
        await MementoCallActivities.endAll()
        await MementoRecordingActivities.endAll()
      }
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
    recordingActionObserver = NotificationCenter.default.addObserver(
      forName: mementoRecordingActionNotification,
      object: nil,
      queue: .main
    ) { _ in
      guard !MementoCallActivityModule.isJSListening else { return }
      if #available(iOS 17.0, *) {
        Task { await MementoRecordingActivities.endAll() }
      }
    }
    return true
  }

  public func applicationWillTerminate(_ application: UIApplication) {
    guard #available(iOS 17.0, *) else { return }
    let done = DispatchSemaphore(value: 0)
    Task.detached {
      await MementoCallActivities.endAll()
      await MementoRecordingActivities.endAll()
      done.signal()
    }
    _ = done.wait(timeout: .now() + 2)
  }
}
