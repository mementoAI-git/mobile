import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let brand = Color(red: 233 / 255, green: 130 / 255, blue: 70 / 255)
private let danger = Color(red: 199 / 255, green: 58 / 255, blue: 58 / 255)
private let callURL = URL(string: "memento://voice-call")

private func statusText(_ state: MementoCallAttributes.ContentState) -> String {
  if state.isMuted { return "Muted" }
  return state.status == "speaking" ? "Memento is speaking" : "Listening"
}

private func statusSymbol(_ state: MementoCallAttributes.ContentState) -> String {
  state.isMuted ? "mic.slash.fill" : "waveform"
}

/// Counts up from the call start without the app sending updates.
private struct CallTimer: View {
  let startedAt: Date

  var body: some View {
    Text(timerInterval: startedAt...Date.distantFuture, countsDown: false)
      .monospacedDigit()
  }
}

private struct MuteButton: View {
  let isMuted: Bool

  var body: some View {
    Button(intent: ToggleCallMuteIntent()) {
      Image(systemName: isMuted ? "mic.slash.fill" : "mic.fill")
        .font(.system(size: 17, weight: .semibold))
        .frame(width: 44, height: 44)
        .foregroundStyle(isMuted ? danger : .white)
        .background(Circle().fill(.white.opacity(0.16)))
    }
    .buttonStyle(.plain)
    .accessibilityLabel(isMuted ? "Unmute" : "Mute")
  }
}

private struct EndButton: View {
  var body: some View {
    Button(intent: EndCallIntent()) {
      Image(systemName: "phone.down.fill")
        .font(.system(size: 17, weight: .semibold))
        .frame(width: 44, height: 44)
        .foregroundStyle(.white)
        .background(Circle().fill(danger))
    }
    .buttonStyle(.plain)
    .accessibilityLabel("End call")
  }
}

private struct LockScreenCallView: View {
  let context: ActivityViewContext<MementoCallAttributes>

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: statusSymbol(context.state))
        .font(.system(size: 20, weight: .semibold))
        .foregroundStyle(context.state.isMuted ? danger : brand)
        .frame(width: 40, height: 40)
        .background(Circle().fill(brand.opacity(0.18)))
      VStack(alignment: .leading, spacing: 2) {
        Text("Memento call")
          .font(.headline)
          .foregroundStyle(.white)
        HStack(spacing: 6) {
          CallTimer(startedAt: context.attributes.startedAt)
          Text("·")
          Text(statusText(context.state))
        }
        .font(.subheadline)
        .foregroundStyle(.white.opacity(0.7))
      }
      Spacer(minLength: 8)
      MuteButton(isMuted: context.state.isMuted)
      EndButton()
    }
    .padding(16)
  }
}

struct CallLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: MementoCallAttributes.self) { context in
      LockScreenCallView(context: context)
        .activityBackgroundTint(Color.black.opacity(0.82))
        .activitySystemActionForegroundColor(.white)
        .widgetURL(callURL)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label {
            Text("Memento")
          } icon: {
            Image(systemName: statusSymbol(context.state))
          }
          .font(.headline)
          .foregroundStyle(context.state.isMuted ? danger : brand)
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          CallTimer(startedAt: context.attributes.startedAt)
            .font(.headline)
            .foregroundStyle(.white)
            .multilineTextAlignment(.trailing)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack(spacing: 12) {
            Text(statusText(context.state))
              .font(.subheadline)
              .foregroundStyle(.white.opacity(0.75))
            Spacer(minLength: 8)
            MuteButton(isMuted: context.state.isMuted)
            EndButton()
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        Image(systemName: statusSymbol(context.state))
          .foregroundStyle(context.state.isMuted ? danger : brand)
      } compactTrailing: {
        CallTimer(startedAt: context.attributes.startedAt)
          .foregroundStyle(brand)
          .frame(maxWidth: 48)
          .multilineTextAlignment(.trailing)
      } minimal: {
        Image(systemName: statusSymbol(context.state))
          .foregroundStyle(context.state.isMuted ? danger : brand)
      }
      .widgetURL(callURL)
      .keylineTint(brand)
    }
  }
}
