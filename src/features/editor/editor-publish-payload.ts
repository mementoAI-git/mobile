import {
  buildMemoryAudiencePayload,
  type MemoryAudienceSelection,
} from '@/features/memories/memory-audience';
import type { MemoryMutationPayload } from '@/features/memories/memory-mutation-payload';

interface EditorPublishInput {
  title: string;
  body: string;
  tags: string[];
  attachmentIds: string[];
  audience: MemoryAudienceSelection;
}

export function buildEditorPublishPayload({
  title,
  body,
  tags,
  attachmentIds,
  audience,
}: EditorPublishInput): MemoryMutationPayload {
  return {
    title: title || 'Untitled',
    body,
    tags,
    status: 'save',
    attachments: attachmentIds.length ? attachmentIds : undefined,
    ...buildMemoryAudiencePayload(audience),
  };
}
