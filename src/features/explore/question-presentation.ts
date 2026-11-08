import catalog from './explore-catalog.generated.json';
import { resolveExploreCategorySlug } from './category-identity';
import endpoint from '@/api/endpoint';

export type ExploreQuestionSource = 'starter' | 'ai-generated' | 'legacy';
export type ExploreQuestionStatus = 'unanswered' | 'answered' | 'skipped' | 'not-relevant';

/**
 * Same artwork seed and service as web. Always PNG: the native image view only
 * paints the disco SVG's background, leaving a flat coloured square.
 */
export function getQuestionIdenticonUrl(seed: string): string {
  return `https://api.dicebear.com/10.x/disco/png?seed=${encodeURIComponent(seed)}`;
}

export function getQuestionSourceLabel(source?: ExploreQuestionSource): string {
  return source === 'ai-generated' ? 'Just for you'
    : source === 'legacy' ? 'From your history' : 'Starter question';
}

export function getExploreCategoryTitle(value?: string | null): string {
  const slug = resolveExploreCategorySlug(value);
  return catalog.find(category => category.slug === slug)?.title || value?.trim() || 'Topics';
}

export function getQuestionFeedbackRequest(questionId: string, status: 'skipped' | 'not-relevant') {
  if (!questionId.trim()) throw new Error('Question ID is required');
  return { url: `${endpoint.promptDetails}${encodeURIComponent(questionId)}/feedback`, body: { status } };
}
