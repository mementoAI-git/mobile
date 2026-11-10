import type { IMemory } from '@/types';
import { buildMemoryAudiencePayload } from './memory-audience';

/**
 * What sharing a story's link needs first. The API only opens a link for a
 * saved story visible to everyone, so a private one must be made public, with
 * the host's say-so, before the link is worth sending.
 */
export type StorySharePlan = 'share' | 'confirm-public' | 'publish-first' | 'unavailable';

export function planStoryShare(
  memory: Pick<IMemory, 'visibility' | 'status'> | null | undefined,
): StorySharePlan {
  if (!memory || memory.status === 'deleted') return 'unavailable';
  if (memory.status === 'draft') return 'publish-first';
  return memory.visibility === 'everyone' ? 'share' : 'confirm-public';
}

/** Public to anyone with the link. The API drops specific shares for public stories. */
export const PUBLIC_STORY_AUDIENCE = buildMemoryAudiencePayload({
  mode: 'everyone',
  beneficiaryIds: [],
  groupIds: [],
});
