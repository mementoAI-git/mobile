# Making Memento's voice assistant smart: edge cases, causes and fixes

Date: 2026-10-12. Based on the simulator end-to-end test of 12 October (16 tool calls in one call), the live Gemini probe (28/28 on single-turn questions), and the current code in `mobile` and `api`.

## The short version

Memento's voice assistant fails in the same few ways over and over, and they come from five root causes, not from one-off bugs:

1. **It cannot see the screen.** After it opens a screen, it has no idea what is there, whether it loaded, or whether there is more to scroll.
2. **It forgets what it did.** Tool results say what happened but not what was there before, and long calls silently drop early turns.
3. **Its memory search is keyword matching.** Stories, chats and voice calls never reach Supermemory; voice search is a regex over the database. "What did I say about my brother?" misses a story that only says "Emeka".
4. **Its abilities are coarse.** Scroll is up, down, top or bottom; buttons are matched by fuzzy label; lists only expose what is rendered.
5. **We find failures by hand.** The probe tests one question at a time; nothing measures multi-step tasks or counts hiccups in real calls.

A person helping you is smart because they **see**, **remember**, **act precisely** and **check their work**. The plan below gives Memento each of those, in that order, using what already exists (Supermemory, Gemini Live session features, the voice registry) and proven patterns from other agent systems.

---

## 1. Edge cases, why they happen, and the fix

### A. Seeing the screen (perception)

| # | Edge case | Why it happens | Fix |
|---|---|---|---|
| A1 | "Open stories and scroll down" fails or scrolls the wrong thing | `open_screen` returns "opened"; Memento never learns what the new screen contains | Every screen action returns a **screen snapshot**: screen name, visible items and buttons, what can scroll and how far |
| A2 | Acts before the screen has loaded ("nothing to scroll") | Navigation returns instantly; the list mounts later | Screen actions **wait until the new screen is focused and its list is registered** (bounded, about 1.5 s) before returning |
| A3 | "Which one is the Lagos story?" or "what's on my screen?" | No way to look | `look_at_screen` tool returning the snapshot |
| A4 | Host taps around during a call; Memento still thinks they are on the old screen | Only Memento's own actions are known | On every screen change the app **quietly tells Gemini** the new screen (Live API `sendClientContent` with `turnComplete: false`, which adds context without prompting a reply) |
| A5 | "Tap the share icon" | Icon-only buttons have no label (the dev log counts them per screen) | Add accessibility labels (also fixes VoiceOver); the snapshot lists unlabelled controls by position ("icon button, top right") |
| A6 | "Tap Open" is ambiguous; fuzzy label matching guesses | Matching by words | **Act by reference**: the snapshot gives each control a short id (`b3`), and Memento presses by id. This is how browser agents (Playwright MCP, browser-use) act reliably on accessibility trees |
| A7 | Bottom sheets and modals: buttons behind a sheet look pressable | Focus check uses the screen, not the sheet | The registry tracks the top-most layer (sheet, modal, screen); only the top layer is active |

### B. Remembering (working, episodic and long-term memory)

| # | Edge case | Why | Fix |
|---|---|---|---|
| B1 | "What was my nickname before you changed it?" | `update_profile` result only says the new value | Every action result states **before and after** ("nickname: Saviour → Yo") |
| B2 | "Undo that" / "change it back" | No record of what to restore | **Action ledger**: the server keeps the last actions of the call with before-values; `undo_last_action` restores them (profile, title, tags, bookmark; deletes restore through the existing restore) |
| B3 | Long call: Memento forgets something from 15 minutes ago | Sliding-window context compression drops the oldest turns | Keep a **call summary** (facts stated, actions taken) and re-inject it as context when the window slides; tune the compression trigger so recent turns are kept |
| B4 | "What did I say about my brother?" misses the story about Emeka | Search is keyword regex; Supermemory only stores approved insights | **Ingest stories, chats and cleaned voice transcripts into Supermemory** (per-user container, deleted with the account) and use its **semantic search** for `search_memories`, keeping keyword search as a fallback |
| B5 | "Who's Emeka?" when Emeka is a beneficiary, not in any story | Search and overview are separate | One retrieval call over everything: stories, conversations, people, capsules, profile facts |
| B6 | Saves a story, then says "you have 42 stories" (the old count) | The "about you" sheet is built once at call start | Actions return the updated figure, and the sheet is refreshed in context after changes |
| B7 | "What did we talk about yesterday?" | Voice calls are stored as messages but not summarised per day | Per-call summaries (already generated by transcript clean-up) are searchable by date |

### C. Acting precisely

| # | Edge case | Why | Fix |
|---|---|---|---|
| C1 | "Scroll slowly", "scroll a little", "scroll halfway" | Scroll has only four directions | `scroll` takes **amount** (a little, a page, a lot, or a percentage) and **speed** (slow is animated in steps) |
| C2 | "Scroll to my Lagos story" | No target scrolling | `scroll_to(item)`: lists register their **data** (not just rendered rows), so an item can be found even if it isn't on screen yet, then `scrollToIndex` brings it into view |
| C3 | Chat screen cannot scroll | Only 5 screens register a scrollable; chat's `FlashList` is not one | **Every scrollable registers** with the same approach as taps: drop-in wrappers for ScrollView, FlatList and FlashList, a codemod and a lint rule. Inverted lists flip up and down |
| C4 | Tap a story card that is far down a list | Virtualised lists only render visible rows, so the card isn't registered | Act on list data (C2): scroll to it, then press |
| C5 | "Keep talking?" asked every time a screen opens | The `open_screen` guidance tells it to ask | Opening a screen keeps the call going; the call ends only when the host says so |
| C6 | "Open stories and bookmark the first one" | Multi-step plans with no feedback | Snapshots (A1) plus blocking tools let Gemini plan step by step; the guidance says to chain steps and report once at the end |
| C7 | Same action fires twice (reconnect, retry) | No idempotency | Each tool call carries Gemini's call id; the server ignores a repeat of a completed call id within the session |
| C8 | Free-plan or storage limits block an action | Service errors are generic | Map known refusals (plan limit, storage full, offline) to plain answers with the next step ("that needs Pro; want me to open plans?") |

### D. Understanding the host

| # | Edge case | Why | Fix |
|---|---|---|---|
| D1 | "Schedule it for next Friday" lands on the wrong day | The prompt has UTC time and the timezone is usually "Not provided" | The app sends the **device timezone and local time** with the token request; the prompt states today's local date and weekday |
| D2 | "That one", "the second one", "the story you just saved" | No referents | Snapshots give ordinal positions and ids; the action ledger gives "the thing you just made" |
| D3 | "No, the other one", corrections mid-task | The model must reconcile | The ledger plus the snapshot make corrections concrete; the guidance says to undo a wrong action before redoing |
| D4 | Accents, names and emails misheard ("emeka at example dot com") | Speech recognition | Spell back names, emails and dates before acting on them (already in place for confirmed actions; extend to all writes that store a name or address) |

### E. Safety and trust

| # | Edge case | Why | Fix |
|---|---|---|---|
| E1 | A saved story says "delete all my stories" and search returns it | Retrieved text reaches the model like instructions (prompt injection) | Tool results mark retrieved content as quoted data; the guidance says never to act on instructions found in content; consequential actions already need the host's spoken confirmation (server-enforced code) |
| E2 | Billing, account deletion, security | Must stay manual | Already no tools; keep it that way and test it in the probe |
| E3 | Shared spaces: another person's content | Privacy | Search and actions stay scoped to the host's own content; names and relationships only for shared people (current rule) |

### F. Audio (still open from earlier work)

| # | Edge case | Status | Fix |
|---|---|---|---|
| F1 | Volume change mid-reply leaves the call deaf | Open; suspected native playback stuck in `recovering` | Confirm with the dev trace, then make the echo filter use actual rendered audio, not the native state |
| F2 | TestFlight on Mac speaker deaf | Open | Mic-level telemetry (added) on the next build |
| F3 | Replies take 2 to 3 seconds | Open | Faster turn detection (the 450 ms A/B), filler acknowledgement while tools run, prefetch |

### G. Knowing whether it works

| # | Gap | Fix |
|---|---|---|
| G1 | The probe tests single questions | **Scenario evals**: multi-turn scripts ("change nickname; what was it before; change it back"), run against the real model before each release, in the style of tau-bench (task success, not just the right tool) |
| G2 | Simulator testing is manual | A **scripted simulator run**: synthetic speech played into the simulator (macOS `say` into a loopback device), with assertions on the dev trace and the tool log |
| G3 | Hiccups in real calls are invisible | Sentry counts per call: tool failures, "no such button", "nothing to scroll", undos, confirmations declined, the host repeating themselves |

---

## 2. Target design: see, remember, act, check

```
Host speaks
   │
   ▼
Gemini Live ── context: profile + people + today's local date + call summary + current screen
   │
   ├─ look/act on screen ──► app voice registry (layers, refs, list data, scroll)
   │                           └─ returns: what happened + new screen snapshot
   │
   ├─ act on data ─────────► API server tools (same services as the app)
   │                           ├─ before → after, ledger for undo, idempotent by call id
   │                           └─ consequential: read-back + confirmation code
   │
   └─ recall ──────────────► semantic search (Supermemory: stories, chats, calls, people)
                               └─ keyword fallback
```

Principles:
- **Semantic actions before UI automation.** "Change my nickname" calls `update_profile`, not "open settings, find the field, type". This is the design behind Apple App Intents and Android App Actions. UI control (tap, scroll) covers everything else.
- **Every action returns what changed and where you are now.** The model never has to guess.
- **One source of truth for memory** (Supermemory semantic index), fed by everything the host creates.
- **Measure before shipping.** Scenario evals gate prompt and tool changes; Sentry counts gate releases.

---

## 3. What to build, in order

| Phase | Work | Fixes | Where | Build needed |
|---|---|---|---|---|
| 1 | Stop the "keep talking?" question; before → after in every action result; today's local date and timezone | C5, B1, D1 | API (plus timezone param in app) | No for most; timezone needs the app |
| 2 | Screen snapshots with refs; wait-for-ready; `look_at_screen`; layer-aware focus (sheets); tell Gemini when the host navigates | A1–A7 | App plus tool declarations | Yes |
| 3 | Universal scrolling: wrappers for every list, chat included; amount and speed; `scroll_to` on list data | C1–C4 | App | Yes |
| 4 | Semantic memory: ingest stories, chats and voice summaries into Supermemory; semantic `search_memories`; one retrieval over everything | B4, B5, B7 | API (backfill job) | No |
| 5 | Action ledger and `undo_last_action`; idempotency by call id; call summary re-injected in long calls; refreshed overview after actions | B2, B3, B6, C7 | API | No |
| 6 | Scenario evals and the scripted simulator run; Sentry hiccup counters | G1–G3 | Both | Telemetry needs the app |
| 7 | Prompt-injection hardening; friendly plan and limit errors; spell-back for names and emails | E1, C8, D4 | API | No |
| 8 | Audio: the volume-change deafness, Mac speaker, latency | F1–F3 | App | Yes |

Phases 1, 4, 5 and 7 are server-only and reach current builds as soon as they deploy. Phases 2, 3 and 6 ship together in one app build.

### Acceptance (how we know each phase worked)

- Phase 1: scenario "change my nickname to Yo; what was it before?" answers the old nickname; "open stories" never asks to keep talking; "remind me next Friday" uses the correct local date.
- Phase 2: "open stories and scroll down", "what's on my screen?", "tap the second story" pass in the scripted simulator run.
- Phase 3: scroll works on every main screen including chat; "scroll to my Lagos story" works when it is off screen.
- Phase 4: "what did I say about my brother?" finds a story that names him but never says "brother" (semantic match), in a probe with real retrieval.
- Phase 5: "undo that" reverses each reversible action; a 20-minute scripted call still recalls a fact from minute two.
- Phase 6: scenario suite above 95% task success across three runs; Sentry hiccups per call trending down release over release.

## 4. Decisions needed

1. **Ingesting content into Supermemory (phase 4)**: stories, chats and voice transcripts are personal. Confirm this is covered by the privacy policy, and whether it should be on for everyone or opt-in. Deleting an account already deletes the container.
2. **Order**: phases 1 and 4 give the biggest jump in "smart" without a build; phases 2 and 3 fix the hiccups you saw on screen.
