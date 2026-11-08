# Milestones plan

Status as of 2026-11-08. The Milestones tab (Insights) reads its list from
`MILESTONE_CATALOGUE` in `src/features/insights/milestone-celebrations.ts`.
A milestone is one row there: a title, a description, the figure it measures
(`metric`) and a target. Adding a milestone on an existing figure is one row;
a new figure also needs a field in `MilestoneStatsInput`, usually from
`GET /user/stats`.

## Live now

| Milestone | Measures | Target | Source |
|---|---|---|---|
| First Story | stories saved | 1 | `memories/stats.stories_count` |
| Archive Keeper | stories saved | 10 | same |
| Storyteller | stories saved | 20 | same |
| First Reflection | reflections answered | 1 | `user/stats.reflections_count` |
| Reflective Habit | streak | 7 days | `user.streak` |
| Monthly Rhythm | streak | 30 days | same |
| Well Known | enrichment score | Strong (70) | `user/stats.enrichment_score` |
| Trusted Circle | beneficiaries | 1 | `/beneficiaries` |
| Future Messenger | capsules sent | 1 | disabled while capsules are paused (`TIME_CAPSULES_AVAILABLE`) |

Display rules: closest unreached first, then reached, then unavailable.
One-step goals read "Not yet"; multi-step goals show a count.

## Proposed next

Each needs one new figure from the API. All of them can come from
`getUserStats` in `Web/api/src/module/api/user/service.ts`, so mobile and web
read the same numbers.

| Milestone | Measures | Target | New stat | How the API computes it |
|---|---|---|---|---|
| First Conversation | voice mode time | first call | `voice_seconds` | sum `VoiceCall.duration_seconds` for the user |
| Voice Hour | voice mode time | 60 min | `voice_seconds` | same; mobile shows `n / 60 min` |
| Topic Explorer | topics answered | 5 | `topics_answered_count` | distinct prompt ids from `getAnsweredPromptIds` (`prompt/answered-memories.ts`) |
| Well Travelled | topic categories answered in | 3 categories | `topic_categories_answered_count` | categories of those prompts (`explore-taxonomy.ts`) |
| Organizer | stories with tags | 10 | `tagged_stories_count` | count stories in `storyScope()` with non-empty `tags` |
| Storyteller II | stories saved | 50 | none | catalogue row only |

### Decisions needed

- **Goalsetter.** Memento has no person-set goals today:
  `goals_and_aspirations` is filled in by the AI from conversations, so it
  isn't something a person does. Options: (a) set a daily reflection reminder
  (local; its settings entry needs a new home after leaving Milestones),
  (b) add a "my goals" field to About me and count it, (c) drop it.
- **Organizer.** Tagging 10 stories is the proposal; creating a people group
  is the alternative.
- **`reflections_count` scope.** It counts every memory with a prompt,
  including drafts and deleted ones. Narrow it with `liveAnswerFilter` from
  `answered-memories.ts` so First Reflection can't unlock from a draft.

## Later

- Celebrate a milestone when it's reached, using `CelebrationSheet` (the first
  story and Pro upgrade sheets). Track the ids already celebrated per account,
  as `celebrateFirstStory` does.
- Mirror the catalogue on web (`milestones-panel.tsx`, `milestones.ts`) once
  the API figures exist.
