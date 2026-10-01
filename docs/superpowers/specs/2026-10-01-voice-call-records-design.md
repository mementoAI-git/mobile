# Voice Call Records, Transcript Clean-up, and Summaries: Design

**Date:** 2026-10-01
**Status:** Approved in conversation
**Replaces:** the post-call debrief sheet, which has been removed.

## Problems

1. **Wrong-language lines.** Voice transcripts show lines in other languages, such as Arabic or German.
   - **Cause:** Gemini's input speech-to-text guesses each utterance's language independently and writes unclear audio in whatever language it resembles.
   - **No setting fixes it.** On 2026-10-01, a language hint sent directly to Gemini was accepted but changed nothing across 22 comparisons.
   - **Memory is polluted.** These lines are saved as the user's words and feed insights.
2. **Approximate call durations.** Call cards show a duration estimated from when turns reached the server.
3. **No summary.** There is no way to summarize a call.

## Decisions

- Voice calls are **English only** for now. During clean-up, any non-English or unintelligible user line is repaired or replaced with `[unclear]`.
- **Summary is an expandable "Summary" row** in the call card. The first expand generates the summary on the server, then saves it. Later expands, on any device, show it instantly.
- **Clean-up runs automatically** after every call. Originals are kept.

## Design

### API

**`VoiceCall` model**, with a unique index on `{user, session_id}`. Fields:
- `user`, `memory`, `session_id`
- `duration_seconds`, `ended_at`
- `cleanup_status`: `pending`, `done`, `failed` or `skipped`
- `cleaned_at`
- `summary`: `{text, key_points[], generated_at, prompt_version}`

**`Message` fields:** `raw_text` holds the original transcript text, and `voice_cleaned` marks cleaned messages.

**`POST /ai/voice/calls/:sessionId/end`** with body `{memory_id?, duration_seconds}`:
- upserts the `VoiceCall` record;
- writes `duration` onto the call's messages, so call cards show the real length;
- starts clean-up in the background.

**Clean-up**, run as `cleanVoiceCallTranscript`:
- **Input:** the whole call in order, both sides.
- **Model output:** JSON listing changed user lines by index.
- **Rules:** fix clear mishearings using the conversation for context; replace non-English or unintelligible user lines with `[unclear]`; never change Memento's lines; never add content.
- **Saving:** only user lines whose text actually changes are written, keeping the original in `raw_text`.
- **Bad model output** changes nothing and marks the call `failed`.
- **Insights:** they are queued here, from the cleaned text. `recordVoiceTurns` no longer queues insights for voice turns.

**`POST /ai/voice/calls/:sessionId/summary`:**
- returns the saved summary if one exists;
- otherwise makes sure clean-up has run, writes 2 to 4 sentences plus up to 4 key points from the cleaned transcript, saves the summary and returns it.

Both endpoints require authentication and only touch the caller's own calls and messages.

### Mobile

- **On hang-up**, after the final turns are saved, the app posts `end` with the real call duration.
- **`groupVoiceCallThreads`** uses the saved `duration` when it is present, and the timestamp estimate otherwise. The synthetic call message keeps `voice_session_id`.
- **`VoiceCallCard`** shows a "Summary" row for calls that have a `voice_session_id`:
  - Expanding it for the first time fetches the summary through React Query, keyed by session ID, and shows a loading state.
  - It then shows the summary text and key points.
  - On failure it shows "Couldn't summarize. Tap to try again."

## Testing

- **API unit tests:** clean-up prompt parsing, including invalid output; the clean-up service with a fake model; the summary service; the end endpoint writing duration; and insights moving from turn time to clean-up.
- **Live Gemini check:** clean-up on a transcript with deliberately garbled and foreign-language lines.
- **Mobile:** the duration in grouping, the summary response parsing, and source contract tests for the card's Summary row.
