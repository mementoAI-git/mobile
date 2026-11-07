import type { EnrichmentCategory, UserStatsData } from '@/constants/enrichment';

export const CATEGORY_TO_ENRICHMENT_MAP: Record<string, EnrichmentCategory> = {
  'growing-up': 'memories_experiences',
  'people-i-love': 'relationships_people',
  'the-life-i-live': 'everyday_life',
  'things-i-love': 'passions_interests',
  'who-i-am': 'identity_self',
  'work-purpose': 'work_purpose',
  'beliefs-faith': 'beliefs_worldview',
  'where-i-come-from': 'heritage_roots',
  'stories-adventures': 'memories_experiences',
  'what-life-taught-me': 'lessons_wisdom',
  'whats-ahead': 'hopes_legacy',
  career: 'work_purpose',
  family: 'relationships_people',
  relationship: 'relationships_people',
  belief: 'beliefs_worldview',
  purpose: 'work_purpose',
  'life-transition': 'memories_experiences',
  wellbeing: 'everyday_life',
  identity: 'identity_self',
};

export const ENRICHMENT_TO_CATEGORY_SLUG: Record<EnrichmentCategory, string> = {
  identity_self: 'who-i-am',
  relationships_people: 'people-i-love',
  work_purpose: 'work-purpose',
  memories_experiences: 'stories-adventures',
  beliefs_worldview: 'beliefs-faith',
  passions_interests: 'things-i-love',
  heritage_roots: 'where-i-come-from',
  lessons_wisdom: 'what-life-taught-me',
  hopes_legacy: 'whats-ahead',
  everyday_life: 'the-life-i-live',
};

export interface PrioritizedTopicPrompt {
  prompt: any;
  categorySlug: string;
  enrichmentCategory: EnrichmentCategory;
  score: number;
  isLowestDimension: boolean;
}

/**
 * Ranks prompt topics by user's lowest enrichment scores so that
 * under-represented life areas are shown first.
 */
export function prioritizePromptsByEnrichment(
  prompts: any[],
  stats: UserStatsData | null | undefined
): PrioritizedTopicPrompt[] {
  if (!prompts || prompts.length === 0) return [];

  const scoreMap: Record<string, number> = {};
  if (Array.isArray(stats?.category_scores)) {
    stats.category_scores.forEach((item) => {
      if (item && item.key && typeof item.score === 'number') {
        scoreMap[item.key] = item.score;
      }
    });
  } else if (stats?.category_scores && typeof stats.category_scores === 'object') {
    Object.entries(stats.category_scores as Record<string, number>).forEach(([k, v]) => {
      if (typeof v === 'number') {
        scoreMap[k] = v;
      }
    });
  }

  // Find the lowest score among all categories
  let lowestScore = 100;
  let hasScores = false;
  Object.values(scoreMap).forEach((score) => {
    hasScores = true;
    if (score < lowestScore) {
      lowestScore = score;
    }
  });

  const prioritized = prompts.map((prompt) => {
    const rawCategory = (prompt.category || '').toLowerCase().trim();
    const enrichmentCat = CATEGORY_TO_ENRICHMENT_MAP[rawCategory] || 'everyday_life';
    const score = scoreMap[enrichmentCat] ?? 0;
    const isLowestDimension = hasScores && score === lowestScore && lowestScore < 80;

    return {
      prompt,
      categorySlug: rawCategory || 'wellbeing',
      enrichmentCategory: enrichmentCat,
      score,
      isLowestDimension,
    };
  });

  // Sort ascending by score (lowest score first)
  return prioritized.sort((a, b) => a.score - b.score);
}
