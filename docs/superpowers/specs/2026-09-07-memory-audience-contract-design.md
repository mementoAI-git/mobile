# Memory Audience Contract Design

**Date:** 2026-09-07

**Status:** Approved for implementation planning

## Objective

Make story visibility explicit, private by default, consistent across every mobile publishing and editing flow, and compatible with the API currently deployed to development and production.

This work must not change the backend contract. It corrects mobile clients so they use that contract accurately.

## Product Rules

1. A newly created story is private unless the user explicitly chooses another audience.
2. Private means only the story owner can read the story.
3. Everyone means the story is publicly readable through the API's public-memory contract.
4. Specific means the story remains private from the public while selected beneficiaries or groups receive access.
5. The app always sends visibility explicitly when creating or updating a story.
6. The app never displays sample people, sample groups, or invented recent recipients in a production audience picker.
7. Existing stories initialize the audience controls from the story's persisted `visibility`, `beneficiaries`, and `groups` fields.

## Shared Domain Model

Audience behavior will be centralized in a small, framework-independent module under `src/features/memories/`.

```ts
export type MemoryAudienceMode = 'private' | 'everyone' | 'specific';

export interface MemoryAudienceSelection {
  mode: MemoryAudienceMode;
  beneficiaryIds: string[];
  groupIds: string[];
}

export interface MemoryAudiencePayload {
  visibility: 'private' | 'everyone';
  beneficiaries: string[];
  groups: string[];
}
```

The module will expose pure functions for:

- deriving an audience selection from API memory data;
- normalizing and deduplicating selected identifiers;
- converting a selection into an explicit API payload;
- determining whether a selection can be applied;
- producing the compact audience label used by trigger controls.

The payload mapping is fixed:

| UI mode | API visibility | Beneficiaries | Groups |
|---|---|---|---|
| Private | `private` | `[]` | `[]` |
| Everyone | `everyone` | `[]` | `[]` |
| Specific | `private` | selected IDs | selected IDs |

Specific mode is invalid when both selected-ID arrays are empty.

## Compatibility Rules

- The API already accepts optional `visibility: 'private' | 'everyone'`; adding it to the mobile request is additive and non-breaking.
- Mobile mutation types and offline queue payloads will retain the same request shape while adding the optional visibility field at their shared boundary.
- All newly changed publishing code will provide visibility explicitly.
- Legacy memories without a visibility value initialize as private, matching the backend default.
- Populated API objects and identifier strings are both accepted when deriving recipient IDs.
- Selecting Private or Everyone clears recipient arrays in the outgoing payload so stale access lists cannot survive a mode transition.
- Selecting Specific always sends `visibility: 'private'` so specific sharing cannot accidentally create a public story.

## Audience Sheet Behavior

The publish audience sheet keeps the approved reference layout while using real application data and Memento design tokens.

### Opening and draft state

- Opening the sheet copies the committed audience into local draft state.
- Changes inside the sheet do not mutate the publish form until Apply changes is pressed.
- Dismiss, the close button, backdrop press, or swipe-down discards the draft.
- Reopening always reflects the last committed selection.

### Mode transitions

- Pressing Private sets draft mode to `private`.
- Pressing Everyone sets draft mode to `everyone`.
- Pressing any real beneficiary or group toggles that identifier and sets draft mode to `specific`.
- In Specific mode, Apply changes is disabled when no recipient is selected.
- Previously selected recipient IDs may remain in local draft memory while switching top-level cards, but Private and Everyone payloads always clear them. After applying either mode, committed recipient arrays are empty.

### Recipient data

- Beneficiaries come from `useBeneficiaries`.
- Groups come from `useGroups`.
- Both response shapes are normalized through the existing `normalizeCollection` helper.
- Search filters both collections by display name and beneficiary email.
- The list shows real beneficiaries first and real groups second, matching the reference composition.
- When both collections are empty, the sheet displays a warm empty state that directs the user to add trusted people in Settings.
- “Recently used” is hidden until the product has durable, real usage data. It must not be synthesized from names or collection order.

### Presentation

- Use `COLORS`, `FONTS`, and existing shared UI primitives.
- Use the warm Memento sheet background rather than a pure-white full sheet.
- Preserve the two audience cards, search field, selectable rows, group badge, fixed Dismiss button, and fixed Apply changes button.
- All touch targets meet the 44-point minimum.
- Mode changes, recipient toggles, dismissals, and apply actions emit the required haptic feedback.
- The sheet remains a nested `@gorhom/bottom-sheet` modal with push behavior.

## Flow Integration

The shared audience model will be adopted wherever a memory is created, published, or has access changed:

1. Story editor publish sheet (`app/editor.tsx`).
2. Article publish flow (`app/article.tsx`).
3. Create-memory sheet (`src/components/sheets/CreateMemorySheet.tsx`).
4. Memory-actions editing flow (`src/components/sheets/MemoryActionsSheet.tsx`).
5. Any shared create/update mutation and offline queue types that carry memory payloads.

Quick Capture remains private-only. It will send or normalize to `visibility: 'private'` and will not expose public audience controls.

Each flow may keep its existing screen layout, but audience initialization, validation, labels, and payload mapping must come from the shared domain module.

## Error Handling

- Query loading keeps the sheet usable for Private and Everyone while recipient selection indicates that trusted people are loading.
- Query failure shows a concise inline error for the recipient area without blocking Private or Everyone.
- Specific mode cannot be committed while recipient data is unavailable or the selection is empty.
- Publish mutation errors continue through the existing toast/error path.
- Invalid or missing legacy visibility values resolve to Private rather than Everyone.

## Testing Strategy

Implementation follows test-driven development.

### Pure behavior tests

Tests will exercise real domain functions and cover:

- Private, Everyone, and Specific payload mapping.
- Empty Specific validation.
- Identifier normalization and deduplication.
- Initialization from private, public, specific, and legacy memories.
- Stale recipient clearing during mode changes.
- Compact audience labels.

### Flow contract tests

Tests will verify that:

- the editor includes the explicit audience payload for create and update;
- article publishing uses the same helper;
- create-memory and memory-actions use the same helper;
- Quick Capture remains explicitly private;
- offline create and update payloads preserve visibility;
- the privacy sheet contains no sample recipients or hardcoded recent identities;
- Dismiss and Apply have separate draft/commit behavior.

Source-string tests may remain for native wiring that cannot reasonably mount in the Bun environment, but business behavior must be tested through imported production functions.

### Repository verification

- Focused audience tests.
- Relevant editor, memory, offline, and signed-media regression tests.
- `bun run lint`.
- `bun run typecheck`.
- `bun run test`.
- `bun run check:prod`.
- `bun run doctor` when the Expo schema service is available; the existing retry wrapper handles transient remote failures.

### Manual device verification

On both iOS and Android:

1. Create a story without opening audience settings and confirm it is private.
2. Explicitly select Everyone and confirm public access works.
3. Select one beneficiary and one group and confirm only those recipients receive access.
4. Edit Private → Everyone, Everyone → Private, Everyone → Specific, and Specific → Private.
5. Confirm Dismiss, close, backdrop, and swipe do not commit draft changes.
6. Confirm empty, loading, error, search, keyboard, and long-list states.
7. Create and update while offline, then confirm replay preserves the chosen visibility.

## Rollout and Safety

The change is mobile-only and uses the existing deployed API. It can ship without coordinating a backend release.

The rollout should be split into reviewable commits:

1. Shared audience contract and behavior tests.
2. Mutation/offline visibility support and editor integration.
3. Production-safe privacy sheet cleanup.
4. Remaining publishing-flow consolidation.
5. Full verification and manual test checklist updates.

No migration is required for stored memories. Missing legacy visibility is treated as private, and existing explicit values remain authoritative.

## Completion Criteria

The work is complete when:

- every mobile memory publishing/editing flow uses the shared audience contract;
- newly created stories are private by default;
- Everyone always sends `visibility: 'everyone'` explicitly;
- Specific always sends private visibility and at least one real recipient;
- fake recipient data and invented recent chips are removed;
- the sheet follows Memento tokens and interaction rules;
- online and offline behavior are tested;
- automated verification passes;
- the manual device matrix passes on iOS and Android.
