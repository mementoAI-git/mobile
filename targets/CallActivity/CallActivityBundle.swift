import SwiftUI
import WidgetKit

@main
struct CallActivityBundle: WidgetBundle {
  var body: some Widget {
    CallLiveActivity()
    RecordingLiveActivity()
  }
}
