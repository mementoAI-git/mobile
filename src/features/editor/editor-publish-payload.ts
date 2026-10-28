import {
  buildMemoryAudiencePayload,
  type MemoryAudienceSelection,
} from '@/features/memories/memory-audience';
import { isMeaningfulDraftContent } from './autosave';
import type { MemoryMutationPayload } from '@/features/memories/memory-mutation-payload';

interface EditorPublishInput {
  title: string;
  body: string;
  tags?: string[];
  attachmentIds: string[];
  audience: MemoryAudienceSelection;
}

export function buildEditorPublishPayload({
  title,
  body,
  tags = [],
  attachmentIds,
  audience,
}: EditorPublishInput): MemoryMutationPayload {
  const hasBody = isMeaningfulDraftContent('', body);
  const isQuickNote = !title.trim() || !hasBody;
  const escapedTitle = title.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return {
    title: isQuickNote ? 'Quick note' : title.trim(),
    body: isQuickNote && !hasBody ? `<p>${escapedTitle}</p>` : body,
    capture_source: isQuickNote ? 'quick' : 'standard',
    tags,
    status: 'save',
    attachments: attachmentIds.length ? attachmentIds : undefined,
    ...buildMemoryAudiencePayload(audience),
  };
}
