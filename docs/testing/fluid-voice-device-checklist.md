# Fluid full-duplex voice device acceptance

Use a physical development device and an authenticated Pro development account. Never paste ephemeral tokens, audio payloads, or transcript content into this record.

## Build under test

- Mobile commit:
- API commit: `da3746e` (`feat(ai): expose authoritative Gemini Live model`)
- API environment: development
- `GEMINI_LIVE_MODEL_VERSION`: `gemini-3.8-live`
- Device / OS:
- App build:
- Tester / date:

## Acceptance targets

- Five-minute healthy-network call has no repeatable clicks or gaps.
- P95 end-of-speech to audible response is below 1,200 ms.
- P95 interruption to silence is below 150 ms.
- No more than one healthy-network underrun per five minutes.
- Interrupted audio never resumes from the stale response.
- A natural pause of approximately 400 ms does not prematurely end the turn.

## Phase 1b acceptance (2026-09-30 strategy)

Run each on one iPhone and one mid-range Android phone, loudspeaker, no headphones.

- [ ] Opened from a conversation with recent text turns, the greeting continues it without recapping
- [ ] Replies are one to three sentences unless asked for more
- [ ] Talking over the model stops it within about a quarter second
- [ ] 10 minutes of normal conversation produces no more than 1 false interruption (log count)
- [ ] No clicks at pauses, interruptions, or after a network hiccup (iOS)
- [ ] Every turn appears as its own message in the chat after the call
- [ ] Killing the app mid-call keeps every turn completed before the kill
- [ ] A 15-minute call survives the Gemini goAway reconnect, and the model still remembers earlier turns
- [ ] Switching Wi-Fi to cellular mid-call reconnects instead of ending the call

## Session record

Create one row per run. Use `n/a` only when the device does not support the route.

| Run | Route | Network | Duration | Connect→open ms | Setup ms | End speech→first output ms | First output→playback ms | Underruns | Interruption→silence ms | Route changes | Close reason | Crackles/gaps | Stale resumed audio | 400 ms pause preserved | Pass |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|
| 1 | Speaker | Wi-Fi | 5 min | pending | pending | pending | pending | pending | pending | 0 | pending | pending | pending | pending | pending |
| 2 | Bluetooth HFP | Wi-Fi | 5 min | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending |
| 3 | Wired audio, if available | Wi-Fi | 5 min | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending | pending |
| 4 | Speaker | Cellular | 5 min | pending | pending | pending | pending | pending | pending | 0 | pending | pending | pending | pending | pending |

## Lifecycle and route scenarios

| Scenario | Expected | Observed | Pass |
|---|---|---|---|
| Background during a call | Session closes once; microphone and playback stop; foreground does not reconnect automatically | pending | pending |
| Foreground after background close | Ready/reconnectable UI; no stale audio | pending | pending |
| Bluetooth disconnect during model speech | Route change recorded; valid fallback continues or call ends with a clear reconnectable error | pending | pending |
| Bluetooth reconnect, then new call | New input/output route works without stale buffers | pending | pending |
| Interrupt model repeatedly | Playback silences within 150 ms and old response never resumes | pending | pending |
| Natural ~400 ms pause | Model waits; user can continue the same turn | pending | pending |

## Aggregate measurements

- Healthy-network response latency P95:
- Interruption-to-silence P95:
- Healthy-network underruns per five minutes:
- Reproducible audible defects:
- Stale audio observed:
- Final result: **pending physical-device verification**

## Evidence-backed tuning log

Change one variable per run. Playback prebuffer may be tuned from 80–240 ms; server VAD silence may be tuned from 500–800 ms.

| Date | Route/network | Variable | Before | After | Before result | After result | Keep/revert |
|---|---|---|---:|---:|---|---|---|
| pending | pending | pending | pending | pending | pending | pending | pending |
