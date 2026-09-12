import {
  buildMemoryAudiencePayload,
  type MemoryAudienceSelection,
} from '@/features/memories/memory-audience';
import type { MemoryMutationPayload } from '@/features/memories/memory-mutation-payload';

interface ArticlePublishInput {
  title: string;
  subtitle: string;
  body: string;
  tags: string[];
  audience: MemoryAudienceSelection;
}

export function buildArticlePublishPayload({
  title,
  subtitle,
  body,
  tags,
  audience,
}: ArticlePublishInput): MemoryMutationPayload {
  return {
    title: title || 'Untitled',
    body: [subtitle, body].filter(Boolean).join('\n\n').trim(),
    tags,
    status: 'save',
    ...buildMemoryAudiencePayload(audience),
  };
}
