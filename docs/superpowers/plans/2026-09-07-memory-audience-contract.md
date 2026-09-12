# Memory Audience Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every mobile memory publishing and editing flow private by default and explicitly map Private, Everyone, and Specific audience choices to the deployed API contract.

**Architecture:** Add one framework-independent audience module that owns initialization, validation, labels, and API payload mapping. UI flows keep their current presentation but consume this shared contract; the publish privacy sheet stages edits locally and commits a complete selection atomically.

**Tech Stack:** TypeScript 6, React Native 0.86, Expo 57, Expo Router, Zustand, TanStack Query, `@gorhom/bottom-sheet`, NativeWind, Bun test.

**Spec:** `docs/superpowers/specs/2026-09-07-memory-audience-contract-design.md`

## Global Constraints

- Newly created stories are Private unless the user explicitly chooses another audience.
- Do not change the deployed API contract or require an API release.
- Everyone must send `visibility: 'everyone'` explicitly.
- Specific must send `visibility: 'private'` and at least one real beneficiary or group identifier.
- Private and Everyone must send empty beneficiary and group arrays so stale sharing cannot survive transitions.
- Missing or malformed legacy visibility resolves to Private.
- Quick Capture remains explicitly Private and exposes no public-audience control.
- Never render sample recipients, invented recent recipients, or arbitrary hardcoded colors.
- Use `COLORS`, `FONTS`, shared UI primitives, haptics, and 44-point minimum touch targets.
- Preserve existing API compatibility, signed-media behavior, draft promotion, and offline replay.
- Follow strict red-green-refactor: every production behavior begins with a focused failing test.

---

## File Structure

- Create `src/features/memories/memory-audience.ts`: pure audience types, normalization, validation, initialization, labels, and payload mapping.
- Create `src/features/memories/memory-audience.test.ts`: table-driven behavioral tests for the shared contract.
- Create `src/features/memories/memory-mutation-payload.ts`: typed, serializable create/update payload boundary shared by online and offline mutations.
- Create `src/features/memories/memory-mutation-payload.test.ts`: JSON round-trip tests for explicit audience fields.
- Create `src/features/editor/editor-publish-payload.ts`: pure story-editor payload composition.
- Create `src/features/editor/editor-publish-payload.test.ts`: editor payload behavior tests.
- Create `src/features/editor/article-publish-payload.ts`: pure article payload composition.
- Create `src/features/editor/article-publish-payload.test.ts`: article payload behavior tests.
- Modify `src/types/index.ts`: expose persisted memory visibility where missing.
- Modify `src/hooks/mutations/use-memory-mutations.ts`: use a typed exported memory mutation payload containing visibility.
- Create `src/store/offline-queue.store.test.ts`: prove visibility survives queue persistence and replay.
- Modify `app/editor.tsx`: initialize Private, derive edits from persisted data, and publish with the shared payload.
- Modify `src/components/sheets/PublishPrivacySheet.tsx`: remove fake data, use real normalized data/tokens, and enforce deterministic draft/apply behavior.
- Modify `src/features/settings/editor-publish-sheet.test.ts`: retain native wiring coverage while removing source assertions that pretend to test business behavior.
- Modify `app/article.tsx`: replace its beneficiary-only selector with the shared audience contract and privacy sheet.
- Modify `src/components/sheets/CreateMemorySheet.tsx`: replace its private audience model and payload construction with the shared contract.
- Modify `src/components/sheets/MemoryActionsSheet.tsx`: initialize and update visibility, beneficiaries, and groups through the shared contract.
- Create `src/features/memories/memory-audience-flow-wiring.test.ts`: narrow integration safeguards for flows that cannot be mounted in Bun.
- Create `docs/testing/memory-audience-smoke.md`: iOS/Android and API verification matrix.

---

### Task 1: Shared Memory Audience Domain Contract

**Files:**
- Create: `src/features/memories/memory-audience.ts`
- Create: `src/features/memories/memory-audience.test.ts`

**Interfaces:**
- Consumes: memory-like values containing optional `visibility`, `beneficiaries`, and `groups`.
- Produces: `MemoryAudienceMode`, `MemoryAudienceSelection`, `MemoryAudiencePayload`, `deriveMemoryAudience`, `buildMemoryAudiencePayload`, `canApplyMemoryAudience`, and `formatMemoryAudienceLabel`.

- [ ] **Step 1: Write failing table-driven payload tests**

```ts
import { describe, expect, test } from 'bun:test';
import {
  buildMemoryAudiencePayload,
  canApplyMemoryAudience,
  type MemoryAudienceSelection,
} from './memory-audience';

describe('memory audience API payload', () => {
  const cases: Array<[string, MemoryAudienceSelection, object]> = [
    ['private clears stale recipients', {
      mode: 'private', beneficiaryIds: ['beneficiary-1'], groupIds: ['group-1'],
    }, {
      visibility: 'private', beneficiaries: [], groups: [],
    }],
    ['everyone is explicitly public and clears stale recipients', {
      mode: 'everyone', beneficiaryIds: ['beneficiary-1'], groupIds: ['group-1'],
    }, {
      visibility: 'everyone', beneficiaries: [], groups: [],
    }],
    ['specific remains private and deduplicates recipients', {
      mode: 'specific',
      beneficiaryIds: ['beneficiary-1', 'beneficiary-1', ''],
      groupIds: ['group-1', 'group-1'],
    }, {
      visibility: 'private', beneficiaries: ['beneficiary-1'], groups: ['group-1'],
    }],
  ];

  for (const [name, selection, expected] of cases) {
    test(name, () => expect(buildMemoryAudiencePayload(selection)).toEqual(expected));
  }

  test('specific requires at least one recipient', () => {
    expect(canApplyMemoryAudience({ mode: 'specific', beneficiaryIds: [], groupIds: [] })).toBe(false);
    expect(canApplyMemoryAudience({ mode: 'specific', beneficiaryIds: ['b1'], groupIds: [] })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module causes RED**

Run: `bun test src/features/memories/memory-audience.test.ts`

Expected: FAIL because `./memory-audience` does not exist.

- [ ] **Step 3: Add failing initialization and label tests**

```ts
import { deriveMemoryAudience, formatMemoryAudienceLabel } from './memory-audience';

describe('memory audience initialization', () => {
  test('missing legacy visibility defaults to private', () => {
    expect(deriveMemoryAudience({})).toEqual({
      mode: 'private', beneficiaryIds: [], groupIds: [],
    });
  });

  test('explicit everyone remains everyone when stale shares exist', () => {
    expect(deriveMemoryAudience({
      visibility: 'everyone',
      beneficiaries: [{ _id: 'stale-beneficiary' }],
      groups: ['stale-group'],
    })).toEqual({ mode: 'everyone', beneficiaryIds: [], groupIds: [] });
  });

  test('private memory with populated recipients derives specific mode', () => {
    expect(deriveMemoryAudience({
      visibility: 'private',
      beneficiaries: [{ _id: 'b1' }, 'b2'],
      groups: [{ _id: 'g1' }],
    })).toEqual({
      mode: 'specific', beneficiaryIds: ['b1', 'b2'], groupIds: ['g1'],
    });
  });

  test('labels every supported mode without consulting UI data', () => {
    expect(formatMemoryAudienceLabel({ mode: 'private', beneficiaryIds: [], groupIds: [] })).toBe('Private · Only me');
    expect(formatMemoryAudienceLabel({ mode: 'everyone', beneficiaryIds: [], groupIds: [] })).toBe('Everyone');
    expect(formatMemoryAudienceLabel({ mode: 'specific', beneficiaryIds: ['b1'], groupIds: ['g1', 'g2'] })).toBe('1 person, 2 groups');
  });
});
```

- [ ] **Step 4: Implement the minimal pure contract**

```ts
export type MemoryVisibility = 'private' | 'everyone';
export type MemoryAudienceMode = 'private' | 'everyone' | 'specific';

export interface MemoryAudienceSelection {
  mode: MemoryAudienceMode;
  beneficiaryIds: string[];
  groupIds: string[];
}

export interface MemoryAudiencePayload {
  visibility: MemoryVisibility;
  beneficiaries: string[];
  groups: string[];
}

type RecipientLike = string | { _id?: unknown; id?: unknown } | null | undefined;
type MemoryAudienceSource = {
  visibility?: unknown;
  beneficiaries?: RecipientLike[] | null;
  groups?: RecipientLike[] | null;
};

function recipientId(value: RecipientLike): string | null {
  const candidate = typeof value === 'string'
    ? value
    : value && typeof value === 'object'
      ? value._id ?? value.id
      : null;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

export function normalizeAudienceIds(values?: RecipientLike[] | null): string[] {
  return [...new Set((values ?? []).map(recipientId).filter((id): id is string => Boolean(id)))];
}

export function deriveMemoryAudience(source: MemoryAudienceSource): MemoryAudienceSelection {
  if (source.visibility === 'everyone') {
    return { mode: 'everyone', beneficiaryIds: [], groupIds: [] };
  }
  const beneficiaryIds = normalizeAudienceIds(source.beneficiaries);
  const groupIds = normalizeAudienceIds(source.groups);
  return {
    mode: beneficiaryIds.length || groupIds.length ? 'specific' : 'private',
    beneficiaryIds,
    groupIds,
  };
}

export function canApplyMemoryAudience(selection: MemoryAudienceSelection): boolean {
  return selection.mode !== 'specific' || selection.beneficiaryIds.length + selection.groupIds.length > 0;
}

export function buildMemoryAudiencePayload(selection: MemoryAudienceSelection): MemoryAudiencePayload {
  if (selection.mode === 'everyone') return { visibility: 'everyone', beneficiaries: [], groups: [] };
  if (selection.mode === 'private') return { visibility: 'private', beneficiaries: [], groups: [] };
  return {
    visibility: 'private',
    beneficiaries: normalizeAudienceIds(selection.beneficiaryIds),
    groups: normalizeAudienceIds(selection.groupIds),
  };
}

export function formatMemoryAudienceLabel(selection: MemoryAudienceSelection): string {
  if (selection.mode === 'private') return 'Private · Only me';
  if (selection.mode === 'everyone') return 'Everyone';
  const people = selection.beneficiaryIds.length;
  const groups = selection.groupIds.length;
  const parts = [
    people ? `${people} ${people === 1 ? 'person' : 'people'}` : '',
    groups ? `${groups} ${groups === 1 ? 'group' : 'groups'}` : '',
  ].filter(Boolean);
  return parts.join(', ') || 'Choose people or groups';
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `bun test src/features/memories/memory-audience.test.ts`

Expected: all audience tests pass.

- [ ] **Step 6: Run typecheck and commit**

Run: `bun run typecheck`

Commit:

```bash
git add src/features/memories/memory-audience.ts src/features/memories/memory-audience.test.ts
git commit -m "feat(mobile): centralize memory audience contract"
```

---

### Task 2: Typed Mutation and Offline Replay Support

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/hooks/mutations/use-memory-mutations.ts`
- Modify: `src/store/offline-queue.store.ts`
- Create: `src/features/memories/memory-mutation-payload.ts`
- Create: `src/features/memories/memory-mutation-payload.test.ts`

**Interfaces:**
- Consumes: `MemoryVisibility` from `memory-audience.ts`.
- Produces: exported `MemoryMutationPayload`, `serializeMemoryMutationPayload`, and a typed `OfflineMutation` payload union that preserves `visibility` unchanged.

- [ ] **Step 1: Write the failing offline serialization/replay test**

```ts
import { describe, expect, test } from 'bun:test';
import { serializeMemoryMutationPayload } from './memory-mutation-payload';

describe('offline memory audience payload', () => {
  test('preserves explicit everyone visibility and cleared shares', () => {
    expect(serializeMemoryMutationPayload({
      title: 'Public story',
      body: 'Body',
      status: 'save',
      visibility: 'everyone',
      beneficiaries: [],
      groups: [],
    })).toEqual({
      title: 'Public story',
      body: 'Body',
      status: 'save',
      visibility: 'everyone',
      beneficiaries: [],
      groups: [],
    });
  });

  test('preserves private specific sharing', () => {
    expect(serializeMemoryMutationPayload({
      title: 'Family story',
      body: 'Body',
      visibility: 'private',
      beneficiaries: ['b1'],
      groups: ['g1'],
    })).toMatchObject({
      visibility: 'private', beneficiaries: ['b1'], groups: ['g1'],
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test src/features/memories/memory-mutation-payload.test.ts`

Expected: FAIL because `memory-mutation-payload.ts` does not exist.

- [ ] **Step 3: Add visibility to persisted and mutation types**

Add to `IMemory` in `src/types/index.ts`:

```ts
visibility?: 'private' | 'everyone';
```

Export the mutation interface:

```ts
export interface MemoryMutationPayload {
  title: string;
  body: string;
  tags?: string[];
  status?: 'draft' | 'save' | string;
  level?: number;
  attachments?: string[];
  groups?: string[];
  beneficiaries?: string[];
  visibility?: MemoryVisibility;
  daily_prompt?: IDailyPromptCapture;
}
```

Use `MemoryMutationPayload` for create, update, and offline queue payloads.

- [ ] **Step 4: Add a pure serialization boundary and retain queue behavior**

```ts
export function serializeMemoryMutationPayload(payload: MemoryMutationPayload): MemoryMutationPayload {
  return {
    ...payload,
    ...(payload.beneficiaries ? { beneficiaries: [...payload.beneficiaries] } : {}),
    ...(payload.groups ? { groups: [...payload.groups] } : {}),
    ...(payload.attachments ? { attachments: [...payload.attachments] } : {}),
    ...(payload.tags ? { tags: [...payload.tags] } : {}),
  };
}
```

Call it inside the online mutation hooks before posting/enqueuing and inside `enqueueMutation` before storing a memory payload. Do not rewrite already persisted queue entries; they remain compatible.

- [ ] **Step 5: Run focused and regression tests**

Run:

```bash
bun test src/features/memories/memory-mutation-payload.test.ts src/features/editor/draft-publish-lifecycle.test.ts
bun run typecheck
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/features/memories/memory-mutation-payload.ts src/features/memories/memory-mutation-payload.test.ts src/hooks/mutations/use-memory-mutations.ts src/store/offline-queue.store.ts
git commit -m "feat(mobile): preserve story visibility offline"
```

---

### Task 3: Correct the Story Editor Publish Contract

**Files:**
- Modify: `app/editor.tsx`
- Modify: `src/features/settings/editor-publish-sheet.test.ts`
- Create: `src/features/editor/editor-publish-payload.ts`
- Create: `src/features/editor/editor-publish-payload.test.ts`
- Create: `src/features/memories/memory-audience-flow-wiring.test.ts`

**Interfaces:**
- Consumes: `deriveMemoryAudience`, `buildMemoryAudiencePayload`, and `formatMemoryAudienceLabel`.
- Produces: editor create/update requests with explicit visibility and a Private initial state.

- [ ] **Step 1: Add a failing editor payload boundary test**

Because the native editor cannot be mounted reliably under Bun, create `src/features/editor/editor-publish-payload.ts`, export `buildEditorPublishPayload`, and test its returned object directly in `src/features/editor/editor-publish-payload.test.ts`:

```ts
test('editor publish payload is private by default', () => {
  expect(buildEditorPublishPayload({
    title: 'A story', body: '<p>Body</p>', tags: [], attachmentIds: [],
    audience: { mode: 'private', beneficiaryIds: [], groupIds: [] },
  })).toMatchObject({
    status: 'save', visibility: 'private', beneficiaries: [], groups: [],
  });
});

test('editor publish payload makes everyone explicit', () => {
  expect(buildEditorPublishPayload({
    title: 'A story', body: '<p>Body</p>', tags: [], attachmentIds: [],
    audience: { mode: 'everyone', beneficiaryIds: ['stale'], groupIds: ['stale'] },
  })).toMatchObject({
    visibility: 'everyone', beneficiaries: [], groups: [],
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `bun test src/features/editor/editor-publish-payload.test.ts`

Expected: FAIL because the editor payload builder is missing.

- [ ] **Step 3: Implement editor initialization and payload composition**

Replace the three separate audience states with one selection:

```ts
const [audience, setAudience] = useState<MemoryAudienceSelection>(() =>
  deriveMemoryAudience({
    visibility: initialVisibility,
    beneficiaries: initialBeneficiaryIds,
    groups: initialGroupIds,
  })
);
```

Add `initialVisibility` to `PublishModalInner`, pass it from parsed edit data, default absent values to Private through `deriveMemoryAudience`, and spread the explicit audience payload into every publish request:

```ts
const payload = buildEditorPublishPayload({
  title,
  body,
  tags: tagList,
  attachmentIds,
  audience,
});
```

The sheet `onApply` becomes:

```ts
onApply={(mode, beneficiaryIds, groupIds) =>
  setAudience({ mode, beneficiaryIds, groupIds })
}
```

- [ ] **Step 4: Update only native wiring assertions that remain necessary**

Keep assertions that the nested sheet is present and its `onApply` commits an audience object. Remove assertions that merely search for payload branches now covered by real function tests.

- [ ] **Step 5: Run editor, domain, draft, and type checks**

Run:

```bash
bun test src/features/memories/memory-audience.test.ts src/features/editor/editor-publish-payload.test.ts src/features/memories/memory-audience-flow-wiring.test.ts src/features/settings/editor-publish-sheet.test.ts src/features/editor/draft-publish-lifecycle.test.ts
bun run typecheck
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/editor.tsx src/features/editor/editor-publish-payload.ts src/features/editor/editor-publish-payload.test.ts src/features/settings/editor-publish-sheet.test.ts src/features/memories/memory-audience-flow-wiring.test.ts
git commit -m "fix(editor): publish private stories explicitly"
```

---

### Task 4: Make the Privacy Sheet Production-Safe

**Files:**
- Modify: `src/components/sheets/PublishPrivacySheet.tsx`
- Modify: `src/features/memories/memory-audience-flow-wiring.test.ts`

**Interfaces:**
- Consumes: committed `MemoryAudienceSelection`, beneficiaries/groups queries, `normalizeCollection`, and `canApplyMemoryAudience`.
- Produces: `onApply(mode, beneficiaryIds, groupIds)` only after a valid explicit user action.

- [ ] **Step 1: Write failing production-safety contract tests**

Add a pure exported `buildAudienceRecipientItems` helper and test real behavior:

```ts
test('recipient items contain only normalized API entities', () => {
  expect(buildAudienceRecipientItems(
    [{ _id: 'b1', name: 'Ada', email: 'ada@example.com' }],
    [{ _id: 'g1', name: 'Family' }],
    ''
  )).toEqual([
    { id: 'b1', name: 'Ada', secondaryText: 'ada@example.com', kind: 'beneficiary', initial: 'A' },
    { id: 'g1', name: 'Family', kind: 'group', initial: 'F' },
  ]);
});

test('recipient search checks beneficiary email and names case-insensitively', () => {
  expect(buildAudienceRecipientItems(
    [{ _id: 'b1', name: 'Ada', email: 'ada@example.com' }],
    [{ _id: 'g1', name: 'Family' }],
    'EXAMPLE.COM'
  ).map((item) => item.id)).toEqual(['b1']);
});
```

Add a narrow source safety assertion only for forbidden production fixtures:

```ts
test('privacy sheet does not ship invented identities', () => {
  const source = readFileSync('src/components/sheets/PublishPrivacySheet.tsx', 'utf8');
  for (const forbidden of ['SAMPLE_BENEFICIARIES', 'SAMPLE_GROUPS', 'Alexander Wang', '@Church', '@Victor']) {
    expect(source.includes(forbidden)).toBe(false);
  }
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `bun test src/features/memories/memory-audience-flow-wiring.test.ts`

Expected: FAIL because sample identities remain and the helper is absent.

- [ ] **Step 3: Remove fixtures and normalize real query data**

Delete `SAMPLE_BENEFICIARIES`, `SAMPLE_GROUPS`, and `RECENT_PILLS`. Use:

```ts
const beneficiaries = useMemo(
  () => normalizeCollection<IBeneficiary>(beneficiariesRaw),
  [beneficiariesRaw]
);
const groups = useMemo(
  () => normalizeCollection<IGroup>(groupsRaw),
  [groupsRaw]
);
```

Hide the Recently used section entirely. Render loading, query-error, and warm empty states in the recipient region.

- [ ] **Step 4: Make draft transitions deterministic**

Use one draft selection object. Recipient presses always set `mode: 'specific'`. Private/Everyone Apply produces cleared arrays. Wire `onDismiss={resetDraft}` so X, Dismiss, backdrop, and pan close converge on the same rollback behavior. Disable Apply when `canApplyMemoryAudience(draft)` is false.

- [ ] **Step 5: Replace arbitrary colors and undersized controls**

Replace hardcoded white/gray/red/blue/green literals with semantic `COLORS` tokens or existing beneficiary-group palette tokens. Use `COLORS.background` for the sheet surface, `COLORS.textStrong/textBase/textWeak`, `COLORS.strokeWeak/strokeWeaker`, `COLORS.error/info/success`, and `COLORS.brand`. Increase the close control to at least 44×44 and retain the fixed safe-area footer.

- [ ] **Step 6: Run focused tests, lint, and typecheck**

Run:

```bash
bun test src/features/memories/memory-audience.test.ts src/features/memories/memory-audience-flow-wiring.test.ts src/features/settings/editor-publish-sheet.test.ts
bun run lint
bun run typecheck
```

Expected: all pass with no lint warnings.

- [ ] **Step 7: Commit**

```bash
git add src/components/sheets/PublishPrivacySheet.tsx src/features/memories/memory-audience-flow-wiring.test.ts
git commit -m "fix(mobile): remove fake publish recipients"
```

---

### Task 5: Consolidate Article Publishing

**Files:**
- Modify: `app/article.tsx`
- Create: `src/features/editor/article-publish-payload.ts`
- Create: `src/features/editor/article-publish-payload.test.ts`
- Modify: `src/features/memories/memory-audience-flow-wiring.test.ts`

**Interfaces:**
- Consumes: shared audience selection/payload helpers and `PublishPrivacySheet`.
- Produces: article-created memories that are Private by default and support explicit Everyone/Specific choices.

- [ ] **Step 1: Write a failing article payload test**

```ts
import { buildArticlePublishPayload } from './article-publish-payload';

test('article payload uses the shared private-by-default audience contract', () => {
  expect(buildArticlePublishPayload({
    title: 'Title', subtitle: 'Subtitle', body: 'Body', tags: [],
    audience: { mode: 'private', beneficiaryIds: [], groupIds: [] },
  })).toEqual({
    title: 'Title',
    body: 'Subtitle\n\nBody',
    tags: [],
    status: 'save',
    visibility: 'private',
    beneficiaries: [],
    groups: [],
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `bun test src/features/editor/article-publish-payload.test.ts`

Expected: FAIL because the article payload builder is missing.

- [ ] **Step 3: Replace article beneficiary-only state**

Initialize `audience` to `deriveMemoryAudience({})`, use `formatMemoryAudienceLabel`, present `PublishPrivacySheet` from the visibility trigger, and build the request with `buildMemoryAudiencePayload(audience)`. Remove the inline beneficiary dropdown and its duplicate normalization code.

- [ ] **Step 4: Run article/audience checks**

Run:

```bash
bun test src/features/memories/memory-audience.test.ts src/features/editor/article-publish-payload.test.ts src/features/memories/memory-audience-flow-wiring.test.ts
bun run typecheck
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/article.tsx src/features/editor/article-publish-payload.ts src/features/editor/article-publish-payload.test.ts src/features/memories/memory-audience-flow-wiring.test.ts
git commit -m "fix(article): adopt explicit story audiences"
```

---

### Task 6: Consolidate Create-Memory and Memory-Actions Flows

**Files:**
- Modify: `src/components/sheets/CreateMemorySheet.tsx`
- Modify: `src/components/sheets/MemoryActionsSheet.tsx`
- Modify: `src/features/memories/memory-audience-flow-wiring.test.ts`

**Interfaces:**
- Consumes: shared derivation, validation, label, and payload helpers.
- Produces: consistent create/edit transitions for visibility, beneficiaries, and groups.

- [ ] **Step 1: Write failing transition tests against the shared payload boundary**

```ts
test('editing everyone to private clears all access fields', () => {
  const initial = deriveMemoryAudience({ visibility: 'everyone' });
  expect(initial.mode).toBe('everyone');
  expect(buildMemoryAudiencePayload({
    ...initial,
    mode: 'private',
    beneficiaryIds: ['stale-b'],
    groupIds: ['stale-g'],
  })).toEqual({ visibility: 'private', beneficiaries: [], groups: [] });
});

test('editing specific to everyone clears recipient lists', () => {
  const initial = deriveMemoryAudience({
    visibility: 'private', beneficiaries: ['b1'], groups: ['g1'],
  });
  expect(buildMemoryAudiencePayload({ ...initial, mode: 'everyone' })).toEqual({
    visibility: 'everyone', beneficiaries: [], groups: [],
  });
});
```

- [ ] **Step 2: Run tests and verify RED against current flow expectations**

Add wiring expectations that both flows call `buildMemoryAudiencePayload`; run:

`bun test src/features/memories/memory-audience-flow-wiring.test.ts`

Expected: FAIL because both screens still construct beneficiary-only payloads independently.

- [ ] **Step 3: Refactor CreateMemorySheet**

Initialize with:

```ts
const [audience, setAudience] = useState<MemoryAudienceSelection>(() =>
  deriveMemoryAudience(editData ?? {})
);
```

Use the shared label and spread `buildMemoryAudiencePayload(audience)` into create/update. Reuse `PublishPrivacySheet` instead of maintaining a second `PrivacyModal` implementation.

- [ ] **Step 4: Refactor MemoryActionsSheet**

Initialize from `deriveMemoryAudience(memory)`. Include the full audience payload when the committed selection differs from the original. Use `PublishPrivacySheet` for changes and retain tag autosave behavior. Do not infer Everyone from empty recipients.

- [ ] **Step 5: Make Quick Capture explicitly private**

At every Quick Capture memory request boundary, include:

```ts
visibility: 'private',
```

Quick Capture must not import or display `PublishPrivacySheet`.

- [ ] **Step 6: Run all audience and memory regressions**

Run:

```bash
bun test src/features/memories/memory-audience.test.ts src/features/memories/memory-audience-flow-wiring.test.ts src/features/editor/draft-publish-lifecycle.test.ts src/features/editor/autosave.test.ts src/features/memories/cache.test.ts
bun run lint
bun run typecheck
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/sheets/CreateMemorySheet.tsx src/components/sheets/MemoryActionsSheet.tsx app/editor.tsx app/create.tsx src/features/memories/memory-audience-flow-wiring.test.ts
git commit -m "refactor(mobile): unify memory audience flows"
```

---

### Task 7: Full Verification and Device Handoff

**Files:**
- Create: `docs/testing/memory-audience-smoke.md`
- Modify only if a failing verification exposes a defect: files owned by Tasks 1–6, with a new failing regression test first.

**Interfaces:**
- Consumes: completed audience contract and integrated flows.
- Produces: reproducible automated and manual release evidence.

- [ ] **Step 1: Create the manual verification checklist**

Document exact setup, expected request payload, expected owner/public/beneficiary access, and pass/fail fields for:

```text
Platform: iOS | Android
Network: online | offline then replayed
Operation: create | edit
Transition: default→private | private→everyone | everyone→private |
            everyone→specific | specific→private | specific→everyone
Dismissal: X | Dismiss | backdrop | swipe
Recipient state: loading | error | empty | one person | one group | mixed | search
```

Include API expectations:

```json
{"visibility":"private","beneficiaries":[],"groups":[]}
{"visibility":"everyone","beneficiaries":[],"groups":[]}
{"visibility":"private","beneficiaries":["b1"],"groups":["g1"]}
```

- [ ] **Step 2: Run the complete mobile quality gate**

Run: `bun run verify`

Expected: lint, TypeScript, all tests, and production-readiness checks pass.

- [ ] **Step 3: Run Expo dependency diagnostics**

Run: `bun run doctor`

Expected: pass. If the remote Expo schema is unavailable, retain the wrapper’s captured outage evidence and rerun when available; do not change dependencies to silence a network outage.

- [ ] **Step 4: Inspect the final diff for prohibited data and colors**

Run:

```bash
rg -n "SAMPLE_BENEFICIARIES|SAMPLE_GROUPS|Alexander Wang|Bojanovic|@Church|@Victor|@Fela" app src
git diff --check
git status --short
```

Expected: no invented recipient matches, no whitespace errors, and only intended files changed.

- [ ] **Step 5: Execute the manual iOS/Android checklist**

Capture pass/fail results in `docs/testing/memory-audience-smoke.md`. Verify API responses rather than trusting only the selected UI label.

- [ ] **Step 6: Commit verification documentation**

```bash
git add docs/testing/memory-audience-smoke.md
git commit -m "docs(mobile): add audience release verification"
```

- [ ] **Step 7: Review the branch before integration**

Run:

```bash
git log --oneline origin/thesavioureking/enhancements..HEAD
git diff --stat origin/thesavioureking/enhancements...HEAD
```

Confirm that no API or web files are included and that the mobile branch is ready for its normal PR/merge workflow.
