import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let brand = Color(red: 233 / 255, green: 130 / 255, blue: 70 / 255)
private let live = Color(red: 52 / 255, green: 199 / 255, blue: 89 / 255)
private let recorderURL = URL(string: "memento://overview")

/// Counts up while recording; holds the recorded length while paused. The app only
/// sends an update on pause and resume.
private struct RecordingTimer: View {
  let state: MementoRecordingAttributes.ContentState

  var body: some View {
    if state.isPaused {
      Text(Duration.seconds(state.elapsed), format: .time(pattern: .minuteSecond))
        .monospacedDigit()
    } else {
      Text(timerInterval: state.updatedAt.addingTimeInterval(-state.elapsed)...Date.distantFuture, countsDown: false)
        .monospacedDigit()
    }
  }
}

private struct PauseButton: View {
  let isPaused: Bool

  var body: some View {
    Button(intent: ToggleRecordingPauseIntent()) {
      Image(systemName: isPaused ? "play.fill" : "pause.fill")
        .font(.system(size: 17, weight: .semibold))
        .frame(width: 44, height: 44)
        .foregroundStyle(.white)
        .background(Circle().fill(.white.opacity(0.16)))
    }
    .buttonStyle(.plain)
    .accessibilityLabel(isPaused ? "Resume recording" : "Pause recording")
  }
}

private struct StopButton: View {
  var body: some View {
    Button(intent: StopRecordingIntent()) {
      Image(systemName: "stop.fill")
        .font(.system(size: 17, weight: .semibold))
        .frame(width: 44, height: 44)
        .foregroundStyle(.white)
        .background(Circle().fill(brand))
    }
    .buttonStyle(.plain)
    .accessibilityLabel("Stop and save recording")
  }
}

private func statusColor(_ state: MementoRecordingAttributes.ContentState) -> Color {
  state.isPaused ? .white.opacity(0.6) : live
}

private struct LockScreenRecordingView: View {
  let context: ActivityViewContext<MementoRecordingAttributes>

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: context.state.isPaused ? "pause.circle.fill" : "waveform")
        .font(.system(size: 20, weight: .semibold))
        .foregroundStyle(context.state.isPaused ? .white.opacity(0.7) : brand)
        .frame(width: 40, height: 40)
        .background(Circle().fill(brand.opacity(0.18)))
      VStack(alignment: .leading, spacing: 2) {
        Text("Memento recording")
          .font(.headline)
          .foregroundStyle(.white)
        HStack(spacing: 6) {
          Circle().fill(statusColor(context.state)).frame(width: 7, height: 7)
          RecordingTimer(state: context.state)
          if context.state.isPaused {
            Text("· Paused")
          }
        }
        .font(.subheadline)
        .foregroundStyle(.white.opacity(0.7))
      }
      Spacer(minLength: 8)
      PauseButton(isPaused: context.state.isPaused)
      StopButton()
    }
    .padding(16)
  }
}

struct RecordingLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: MementoRecordingAttributes.self) { context in
      LockScreenRecordingView(context: context)
        .activityBackgroundTint(Color.black.opacity(0.82))
        .activitySystemActionForegroundColor(.white)
        .widgetURL(recorderURL)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label {
            Text(context.state.isPaused ? "Paused" : "Recording")
          } icon: {
            Image(systemName: context.state.isPaused ? "pause.fill" : "waveform")
          }
          .font(.headline)
          .foregroundStyle(context.state.isPaused ? .white.opacity(0.7) : brand)
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          RecordingTimer(state: context.state)
            .font(.headline)
            .foregroundStyle(.white)
            .multilineTextAlignment(.trailing)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack(spacing: 12) {
            Text("Memento")
              .font(.subheadline)
              .foregroundStyle(.white.opacity(0.75))
            Spacer(minLength: 8)
            PauseButton(isPaused: context.state.isPaused)
            StopButton()
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        Image(systemName: context.state.isPaused ? "pause.fill" : "waveform")
          .foregroundStyle(context.state.isPaused ? .white.opacity(0.7) : brand)
      } compactTrailing: {
        RecordingTimer(state: context.state)
          .foregroundStyle(brand)
          .frame(maxWidth: 48)
          .multilineTextAlignment(.trailing)
      } minimal: {
        Image(systemName: context.state.isPaused ? "pause.fill" : "waveform")
          .foregroundStyle(brand)
      }
      .widgetURL(recorderURL)
      .keylineTint(brand)
    }
  }
}
