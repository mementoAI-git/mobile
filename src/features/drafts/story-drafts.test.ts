import { describe, expect, test } from 'bun:test';

import {
  createDraftStore,
  MAX_DRAFTS,
  type CloudDraftPayload,
  type DraftDeps,
  type StoryDraft,
} from './story-drafts';

const EMAIL = 'host@example.com';

/** In-memory device storage plus a fake server that records every call. */
function fakeWorld(options: { online?: boolean; serverDelayMs?: number } = {}) {
  const storage = new Map<string, string>();
  const server = new Map<string, StoryDraft>();
  const calls: string[] = [];
  let nextId = 1;
  let online = options.online ?? true;
  let failDeletes = false;
  const delay = () => new Promise((resolve) => setTimeout(resolve, options.serverDelayMs ?? 0));

  const deps: DraftDeps = {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => {
      storage.set(key, value);
    },
    isOnline: async () => online,
    listCloudDrafts: async () => {
      calls.push('list');
      await delay();
      return [...server.values()];
    },
    createCloudDraft: async (payload: CloudDraftPayload) => {
      calls.push(`create:${payload.title}`);
      await delay();
      const id = `m${nextId++}`;
      server.set(id, { id, title: payload.title, body: payload.body, updatedAt: Date.now() });
      return id;
    },
    updateCloudDraft: async (id, payload) => {
      calls.push(`update:${id}`);
      await delay();
      const existing = server.get(id);
      if (existing) server.set(id, { ...existing, title: payload.title, body: payload.body });
    },
    deleteCloudDraft: async (id) => {
      calls.push(`delete:${id}`);
      await delay();
      if (failDeletes) throw new Error('network');
      server.delete(id);
    },
  };

  return {
    deps,
    storage,
    server,
    calls,
    setOnline: (value: boolean) => {
      online = value;
    },
    setFailDeletes: (value: boolean) => {
      failDeletes = value;
    },
  };
}

const draft = (id: string, title: string, updatedAt = Date.now()): StoryDraft => ({
  id,
  title,
  body: `${title} body`,
  updatedAt,
});

describe('story drafts', () => {
  test('two quick autosaves of a new draft create it on the server once', async () => {
    const world = fakeWorld({ serverDelayMs: 20 });
    const store = createDraftStore(world.deps);

    const [first, second] = await Promise.all([
      store.upsert(EMAIL, draft('draft_1', 'Farm')),
      store.upsert(EMAIL, draft('draft_1', 'Farm days')),
    ]);

    expect(first).toBe('m1');
    expect(second).toBe('m1');
    expect(world.calls).toEqual(['create:Farm', 'update:m1']);
    expect(world.server.size).toBe(1);
    expect((await store.readLocalDrafts(EMAIL)).map((d) => [d.id, d.title])).toEqual([
      ['m1', 'Farm days'],
    ]);
  });

  test('saving never downloads the draft list', async () => {
    const world = fakeWorld();
    const store = createDraftStore(world.deps);

    const id = await store.upsert(EMAIL, draft('draft_1', 'A'));
    await store.upsert(EMAIL, draft(id, 'A again'));

    expect(world.calls).not.toContain('list');
  });

  test('a delete removes the device copy and the server copy', async () => {
    const world = fakeWorld();
    const store = createDraftStore(world.deps);
    const id = await store.upsert(EMAIL, draft('draft_1', 'Bb'));

    const left = await store.remove(EMAIL, id);

    expect(left).toEqual([]);
    expect(world.server.size).toBe(0);
    expect(await store.sync(EMAIL)).toEqual([]);
  });

  test('a delete made offline is retried on the next sync and never comes back', async () => {
    const world = fakeWorld();
    const store = createDraftStore(world.deps);
    const id = await store.upsert(EMAIL, draft('draft_1', 'Weekend vibes'));

    world.setOnline(false);
    expect(await store.remove(EMAIL, id)).toEqual([]);
    expect(world.server.has(id)).toBe(true);

    world.setOnline(true);
    expect(await store.sync(EMAIL)).toEqual([]);
    expect(world.server.has(id)).toBe(false);
  });

  test('a failed server delete is retried, and the draft stays hidden meanwhile', async () => {
    const world = fakeWorld();
    const store = createDraftStore(world.deps);
    const id = await store.upsert(EMAIL, draft('draft_1', 'Breathe'));

    world.setFailDeletes(true);
    await store.remove(EMAIL, id);
    expect(await store.sync(EMAIL)).toEqual([]);

    world.setFailDeletes(false);
    expect(await store.sync(EMAIL)).toEqual([]);
    expect(world.server.has(id)).toBe(false);
  });

  test('drafts written offline are uploaded once on the next sync', async () => {
    const world = fakeWorld({ online: false });
    const store = createDraftStore(world.deps);
    await store.upsert(EMAIL, draft('draft_1', 'Plane notes'));
    await store.upsert(EMAIL, draft('draft_1', 'Plane notes, more'));
    expect(world.calls).toEqual([]);

    world.setOnline(true);
    const synced = await store.sync(EMAIL);
    expect(world.calls.filter((c) => c.startsWith('create'))).toEqual(['create:Plane notes, more']);
    expect(synced.map((d) => d.id)).toEqual(['m1']);

    expect((await store.sync(EMAIL)).map((d) => d.id)).toEqual(['m1']);
    expect(world.calls.filter((c) => c.startsWith('create'))).toHaveLength(1);
  });

  test('the server decides which drafts exist; newer device edits are pushed', async () => {
    const world = fakeWorld();
    const store = createDraftStore(world.deps);
    world.server.set('m7', draft('m7', 'On server', 1_000));
    world.server.set('m8', draft('m8', 'Edited here', 1_000));
    world.storage.set(
      `article_drafts_${EMAIL}`,
      JSON.stringify([
        draft('m8', 'Edited here, newer', 5_000),
        draft('m9', 'Published elsewhere', 2_000),
      ]),
    );

    const synced = await store.sync(EMAIL);

    expect(synced.map((d) => [d.id, d.title])).toEqual([
      ['m8', 'Edited here, newer'],
      ['m7', 'On server'],
    ]);
    expect(world.calls).toContain('update:m8');
  });

  test('the count is the real number of drafts, not a silent cap', async () => {
    const world = fakeWorld();
    const store = createDraftStore(world.deps);
    for (let i = 0; i < MAX_DRAFTS + 2; i += 1) {
      world.server.set(`m${100 + i}`, draft(`m${100 + i}`, `Old ${i}`, 1_000 + i));
    }

    expect(await store.sync(EMAIL)).toHaveLength(MAX_DRAFTS + 2);
  });

  test('a new draft beyond the limit removes the oldest from the server too', async () => {
    const world = fakeWorld();
    const store = createDraftStore(world.deps);
    for (let i = 0; i < MAX_DRAFTS; i += 1) {
      await store.upsert(EMAIL, draft(`draft_${i}`, `Draft ${i}`, 1_000 + i));
    }

    await store.upsert(EMAIL, draft('draft_new', 'Newest', 9_999));

    const local = await store.readLocalDrafts(EMAIL);
    expect(local).toHaveLength(MAX_DRAFTS);
    expect(local.map((d) => d.title)).not.toContain('Draft 0');
    expect(world.server.size).toBe(MAX_DRAFTS);
    expect(await store.sync(EMAIL)).toHaveLength(MAX_DRAFTS);
  });

  test('a published draft leaves the device list without a server delete', async () => {
    const world = fakeWorld();
    const store = createDraftStore(world.deps);
    const id = await store.upsert(EMAIL, draft('draft_1', 'Ready'));

    expect(await store.remove(EMAIL, id, { skipRemote: true })).toEqual([]);
    expect(world.calls).not.toContain(`delete:${id}`);
  });
});


test('clearing all drafts offline removes every row and retries every server delete on sync', async () => {
  const world = fakeWorld();
  const store = createDraftStore(world.deps);
  const ids = await Promise.all([
    store.upsert(EMAIL, draft('draft_1', 'First')),
    store.upsert(EMAIL, draft('draft_2', 'Second')),
    store.upsert(EMAIL, draft('draft_3', 'Third')),
  ]);
  world.setOnline(false);
  await Promise.all(ids.map((id) => store.remove(EMAIL, id)));
  expect(await store.readLocalDrafts(EMAIL)).toEqual([]);
  expect(world.server.size).toBe(3);
  world.setOnline(true);
  expect(await store.sync(EMAIL)).toEqual([]);
  expect(world.server.size).toBe(0);
});

test('Cancel checkpoints immediately even while a cloud autosave is stalled', async () => {
  const world = fakeWorld();
  let release!: (id: string) => void;
  world.deps.createCloudDraft = () => new Promise(resolve => { release = resolve; });
  const store = createDraftStore(world.deps);
  const saving = store.upsert(EMAIL, draft('draft_busy', 'Old body', 1));
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  await store.checkpoint(EMAIL, draft('draft_busy', 'Newest body', 2));
  expect((await store.readLocalDrafts(EMAIL))[0].title).toBe('Newest body');
  release('cloud-id'); await saving;
  expect(await store.readLocalDrafts(EMAIL)).toEqual([draft('cloud-id', 'Newest body', 2)]);
});
test('pending media survives checkpoints and sync without invalid cloud attachment ids', async () => {
  const world = fakeWorld(); const store = createDraftStore(world.deps);
  const pending = { ...draft('draft_media', '', 10), attachments: [{ fileId: '', clientId: 'pending', uri: 'file://saved-photo.jpg', name: 'Photo', mimeType: 'image/jpeg' }] };
  await store.checkpoint(EMAIL, pending);
  expect((await store.sync(EMAIL))[0].attachments).toEqual(pending.attachments);
  expect(world.calls.some(call => call.startsWith('create:'))).toBe(false);
});
test('a checkpoint left after a completed cloud save does not duplicate the draft after restart', async () => {
  const world = fakeWorld();
  const saved = draft('m42', 'Saved words', 100);
  world.server.set('m42', saved);
  world.storage.set(`article_drafts_${EMAIL}`, JSON.stringify([saved]));
  world.storage.set(`article_draft_checkpoints_${EMAIL}`, JSON.stringify([{ ...saved, id: 'draft_original' }]));
  const store = createDraftStore(world.deps);
  expect(await store.sync(EMAIL)).toHaveLength(1);
  expect(world.calls.some(call => call.startsWith('create:'))).toBe(false);
});
