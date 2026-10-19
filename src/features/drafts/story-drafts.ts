/**
 * Story drafts: kept on the device for instant display and offline writing,
 * and on the server as memories with status "draft".
 *
 * Cloud operations run through one queue per store, so two autosaves can never
 * both create the same draft, and a delete can't race a save. The server is
 * the source of truth for which drafts exist. A separate device checkpoint queue
 * lets Cancel retain the latest edit without waiting for cloud I/O. The device adds drafts it
 * hasn't uploaded yet and edits newer than the server's.
 */

export interface StoryDraftAttachment {
  fileId: string;
  /** Present for local media that has not finished uploading. */
  clientId?: string;
  uri: string;
  name: string;
  mimeType: string;
  isVoice?: boolean;
  duration?: number;
}

export interface StoryDraft {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
  /** Already-uploaded attachment references, restored when the draft is loaded. */
  attachments?: StoryDraftAttachment[];
}

export type CloudDraftPayload = {
  title: string;
  body: string;
  status: 'draft';
  attachments: string[];
};

export interface DraftDeps {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  isOnline(): Promise<boolean>;
  listCloudDrafts(): Promise<StoryDraft[]>;
  /** Returns the new memory id. */
  createCloudDraft(payload: CloudDraftPayload): Promise<string | undefined>;
  updateCloudDraft(id: string, payload: CloudDraftPayload): Promise<void>;
  /** Must resolve when the draft is already gone on the server. */
  deleteCloudDraft(id: string): Promise<void>;
  log?(message: string, error: unknown): void;
}

export const MAX_DRAFTS = 10;

export const STORY_DRAFTS_KEY = (email?: string | null) => `article_drafts_${email ?? 'anon'}`;
export const PENDING_DRAFT_DELETES_KEY = (email?: string | null) =>
  `article_drafts_pending_deletes_${email ?? 'anon'}`;

/** Drafts created on the device get this prefix until the server assigns an id. */
export const isLocalDraftId = (id: string) => id.startsWith('draft_');

export function toCloudPayload(draft: StoryDraft): CloudDraftPayload {
  return {
    title: draft.title?.trim() || 'Untitled',
    body: draft.body,
    status: 'draft',
    attachments: draft.attachments?.map((a) => a.fileId).filter(Boolean) || [],
  };
}

const newestFirst = (a: StoryDraft, b: StoryDraft) => b.updatedAt - a.updatedAt;

export function createDraftStore(deps: DraftDeps) {
  let queue: Promise<unknown> = Promise.resolve();
  let checkpointQueue: Promise<unknown> = Promise.resolve();
  const checkpointKey = (email?: string | null) => `article_draft_checkpoints_${email ?? 'anon'}`;
  function checkpointExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = checkpointQueue.then(task, task);
    checkpointQueue = run.catch(() => undefined);
    return run;
  }
  /** Local draft id → server id, so saves of a just-uploaded draft update it. */
  const serverIds = new Map<string, string>();

  function exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  }

  async function readJson<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await deps.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : (parsed as T);
    } catch {
      return fallback;
    }
  }

  const readLocal = (email?: string | null) => readJson<StoryDraft[]>(STORY_DRAFTS_KEY(email), []);
  const writeLocal = (email: string | null | undefined, drafts: StoryDraft[]) =>
    deps.setItem(STORY_DRAFTS_KEY(email), JSON.stringify([...drafts].sort(newestFirst)));
  const readPending = (email?: string | null) =>
    readJson<string[]>(PENDING_DRAFT_DELETES_KEY(email), []);
  const writePending = (email: string | null | undefined, ids: string[]) =>
    deps.setItem(PENDING_DRAFT_DELETES_KEY(email), JSON.stringify([...new Set(ids)]));

  const readCheckpoints = (email?: string | null) => readJson<StoryDraft[]>(checkpointKey(email), []);
  function checkpoint(email: string | null | undefined, draft: StoryDraft) {
    return checkpointExclusive(async () => {
      const drafts = await readCheckpoints(email);
      const id = serverIds.get(draft.id) ?? draft.id;
      const existing = drafts.find(saved => (serverIds.get(saved.id) ?? saved.id) === id);
      if (existing && existing.updatedAt > draft.updatedAt) return;
      const next = drafts.filter(saved => (serverIds.get(saved.id) ?? saved.id) !== id);
      next.push({ ...draft, id });
      await deps.setItem(checkpointKey(email), JSON.stringify(next.sort(newestFirst).slice(0, MAX_DRAFTS)));
    });
  }
  function clearCheckpoint(email: string | null | undefined, draft: StoryDraft) {
    return checkpointExclusive(async () => {
      const drafts = await readCheckpoints(email);
      const id = serverIds.get(draft.id) ?? draft.id;
      const next = drafts.filter(saved => (serverIds.get(saved.id) ?? saved.id) !== id || saved.updatedAt !== draft.updatedAt)
        .map(saved => ({ ...saved, id: serverIds.get(saved.id) ?? saved.id }));
      await deps.setItem(checkpointKey(email), JSON.stringify(next));
    });
  }

  const canReachServer = async (email?: string | null) => !!email && (await deps.isOnline());

  /** Deletes on the server now, or remembers it to retry. */
  async function deleteRemote(email: string | null | undefined, id: string, online: boolean) {
    if (isLocalDraftId(id)) return;
    if (online) {
      try {
        await deps.deleteCloudDraft(id);
        return;
      } catch (error) {
        deps.log?.('Failed to delete cloud draft', error);
      }
    }
    await writePending(email, [...(await readPending(email)), id]);
  }

  /** Drafts on this device, newest first. No network. */
  function readLocalDrafts(email?: string | null): Promise<StoryDraft[]> {
    return Promise.all([readLocal(email), readCheckpoints(email)]).then(([base, checkpoints]) => {
      const merged = new Map(base.map(draft => [draft.id, draft]));
      for (const draft of checkpoints) {
        const id = serverIds.get(draft.id) ?? draft.id;
        // A crash between cloud save and checkpoint cleanup must not duplicate the row.
        const uploaded = base.find(saved => saved.updatedAt === draft.updatedAt && saved.body === draft.body && saved.title === draft.title);
        const resolved = uploaded?.id ?? id;
        merged.set(resolved, { ...draft, id: resolved });
      }
      return [...merged.values()].sort(newestFirst);
    });
  }

  /**
   * Saves one draft and returns its id (the server id once uploaded). Offline
   * or on a server error the draft stays on the device and the next sync
   * uploads it.
   */
  function upsert(email: string | null | undefined, draft: StoryDraft): Promise<string> {
    return checkpoint(email, draft).then(() => exclusive(async () => {
      const drafts = await readLocal(email);
      const uploaded = drafts.find(saved => !isLocalDraftId(saved.id) && saved.updatedAt === draft.updatedAt && saved.title === draft.title && saved.body === draft.body);
      if (uploaded && isLocalDraftId(draft.id)) serverIds.set(draft.id, uploaded.id);
      const knownId = serverIds.get(draft.id) ?? draft.id;
      let id = knownId;

      if (!draft.attachments?.some(attachment => !attachment.fileId) && await canReachServer(email)) {
        try {
          if (isLocalDraftId(id)) {
            const created = await deps.createCloudDraft(toCloudPayload(draft));
            if (created) {
              serverIds.set(draft.id, created);
              id = created;
            }
          } else {
            await deps.updateCloudDraft(id, toCloudPayload(draft));
          }
        } catch (error) {
          deps.log?.('Failed to save cloud draft', error);
        }
      }

      const saved: StoryDraft = { ...draft, id };
      const index = drafts.findIndex((d) => d.id === draft.id || d.id === knownId);
      if (index >= 0) {
        drafts[index] = saved;
      } else {
        drafts.push(saved);
        if (drafts.length > MAX_DRAFTS) {
          drafts.sort(newestFirst);
          const evicted = drafts.splice(MAX_DRAFTS);
          const online = await canReachServer(email);
          for (const old of evicted) await deleteRemote(email, old.id, online);
        }
      }
      await writeLocal(email, drafts);
      if (!draft.attachments?.some(attachment => !attachment.fileId)) await clearCheckpoint(email, draft);
      return id;
    }));
  }

  /**
   * Removes a draft. The device copy goes at once; the server delete happens
   * now or is retried later, so a deleted draft never comes back.
   */
  function remove(
    email: string | null | undefined,
    id: string,
    options: { skipRemote?: boolean } = {},
  ): Promise<StoryDraft[]> {
    return exclusive(async () => {
      const resolvedId = serverIds.get(id) ?? id;
      await checkpointExclusive(async () => {
        const checkpoints = (await readCheckpoints(email)).filter(draft => (serverIds.get(draft.id) ?? draft.id) !== resolvedId);
        await deps.setItem(checkpointKey(email), JSON.stringify(checkpoints));
      });
      const drafts = (await readLocal(email)).filter((d) => d.id !== id && d.id !== resolvedId);
      await writeLocal(email, drafts);
      if (!options.skipRemote) {
        await deleteRemote(email, resolvedId, await canReachServer(email));
      }
      return drafts.sort(newestFirst);
    });
  }

  /**
   * Brings the device and the server together and returns the drafts to show.
   * Offline, returns the device copy unchanged.
   */
  async function sync(email: string | null | undefined): Promise<StoryDraft[]> {
    for (const draft of await readCheckpoints(email)) await upsert(email, draft);
    await exclusive(async () => {
      let local = await readLocal(email);
      if (!(await canReachServer(email))) return local.sort(newestFirst);

      // 1. Retry deletes that couldn't reach the server before.
      const pending = await readPending(email);
      const stillPending: string[] = [];
      for (const id of pending) {
        try {
          await deps.deleteCloudDraft(id);
        } catch {
          stillPending.push(id);
        }
      }
      if (pending.length) await writePending(email, stillPending);

      // 2. Upload drafts written offline.
      for (const draft of local) {
        if (!isLocalDraftId(draft.id) || draft.attachments?.some(attachment => !attachment.fileId)) continue;
        try {
          const created = await deps.createCloudDraft(toCloudPayload(draft));
          if (created) {
            serverIds.set(draft.id, created);
            draft.id = created;
          }
        } catch (error) {
          deps.log?.('Failed to upload offline draft', error);
        }
      }

      let cloud: StoryDraft[];
      try {
        cloud = await deps.listCloudDrafts();
      } catch (error) {
        deps.log?.('Failed to list cloud drafts', error);
        await writeLocal(email, local);
        return local.sort(newestFirst);
      }

      // 3. Merge: the server decides which drafts exist; newer device edits win.
      const deleted = new Set(stillPending);
      const localById = new Map(local.map((d) => [d.id, d]));
      const merged: StoryDraft[] = [];
      for (const remote of cloud) {
        if (deleted.has(remote.id)) continue;
        const mine = localById.get(remote.id);
        if (mine && mine.updatedAt > remote.updatedAt) {
          try {
            await deps.updateCloudDraft(mine.id, toCloudPayload(mine));
          } catch (error) {
            deps.log?.('Failed to push newer draft edit', error);
          }
          merged.push(mine);
        } else {
          merged.push(remote);
        }
      }
      // Drafts the server didn't know yet (uploads that failed just now).
      for (const mine of local) {
        if (isLocalDraftId(mine.id)) merged.push(mine);
      }

      local = merged.sort(newestFirst);
      await writeLocal(email, local);
      return local;
    });
    return readLocalDrafts(email);
  }

  return { readLocalDrafts, checkpoint, upsert, remove, sync };
}
