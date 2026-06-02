/**
 * Enrichment Score — canonical life categories and API types.
 * Ported from web/src/features/enrichment/enrichment-categories.ts
 * and web/src/features/enrichment/enrichment-api.types.ts
 */

// ─── Category Keys ────────────────────────────────────────────────────────────

export type EnrichmentCategory =
  | 'identity_self'
  | 'relationships_people'
  | 'work_purpose'
  | 'memories_experiences'
  | 'beliefs_worldview'
  | 'passions_interests'
  | 'heritage_roots'
  | 'lessons_wisdom'
  | 'hopes_legacy'
  | 'everyday_life';

export type ChatMode = 'open' | 'deep_dive';

export type LifeDimension = EnrichmentCategory;

export const ALL_ENRICHMENT_CATEGORY_KEYS: readonly EnrichmentCategory[] = [
  'identity_self',
  'relationships_people',
  'work_purpose',
  'memories_experiences',
  'beliefs_worldview',
  'passions_interests',
  'heritage_roots',
  'lessons_wisdom',
  'hopes_legacy',
  'everyday_life',
] as const;

/** Categories not offered during initial onboarding (unlock after sustained use). */
export const DEFERRED_ENRICHMENT_CATEGORIES: ReadonlyArray<EnrichmentCategory> = [
  'lessons_wisdom',
  'hopes_legacy',
];

// ─── Category Metadata ────────────────────────────────────────────────────────

export interface EnrichmentCategoryOption {
  value: EnrichmentCategory;
  label: string;
  sublabel: string;
  icon: string;
}

export const ENRICHMENT_CATEGORY_OPTIONS: EnrichmentCategoryOption[] = [
  {
    value: 'identity_self',
    label: 'Identity & Self',
    sublabel: 'Personality, values, self-perception, growth, pride, and how you handle difficulty.',
    icon: '🪞',
  },
  {
    value: 'relationships_people',
    label: 'Relationships & People',
    sublabel: 'Family, friends, partners, mentors — the people who matter and how those bonds shaped you.',
    icon: '🤝',
  },
  {
    value: 'work_purpose',
    label: 'Work & Purpose',
    sublabel: 'Career arc, what drove your choices, what you built, pivots, and professional identity.',
    icon: '🔨',
  },
  {
    value: 'memories_experiences',
    label: 'Memories & Experiences',
    sublabel: 'Events, places, turning points, firsts, adventures — the stories that make a life feel lived.',
    icon: '📚',
  },
  {
    value: 'beliefs_worldview',
    label: 'Beliefs & Worldview',
    sublabel: 'Faith, philosophy, politics, ethics — ideas you hold, distinct from day-to-day personality.',
    icon: '🕯️',
  },
  {
    value: 'passions_interests',
    label: 'Passions & Interests',
    sublabel: "Hobbies, obsessions, what you make, what you'd talk about for hours.",
    icon: '🌟',
  },
  {
    value: 'heritage_roots',
    label: 'Heritage & Roots',
    sublabel: 'Culture, origin stories, traditions, language, place, and ancestry.',
    icon: '🗺️',
  },
  {
    value: 'lessons_wisdom',
    label: 'Lessons & Wisdom',
    sublabel: "Hard-won realisations, advice you give, mistakes you learned from — unlocks after you've been active a while.",
    icon: '🌊',
  },
  {
    value: 'hopes_legacy',
    label: 'Hopes & Legacy',
    sublabel: "What you want remembered, letters unsaid, what you're still building toward — unlocks after sustained use.",
    icon: '💌',
  },
  {
    value: 'everyday_life',
    label: 'Everyday Life',
    sublabel: 'Routines, food, comfort rituals, pet peeves, small joys — ordinary days that humanise you.',
    icon: '☕',
  },
];

export const ONBOARDING_ENRICHMENT_CATEGORY_OPTIONS = ENRICHMENT_CATEGORY_OPTIONS.filter(
  (o) => !DEFERRED_ENRICHMENT_CATEGORIES.includes(o.value),
);

const OPTION_BY_VALUE = new Map(ENRICHMENT_CATEGORY_OPTIONS.map((o) => [o.value, o]));

export function enrichmentCategoryLabel(key: EnrichmentCategory): string {
  return OPTION_BY_VALUE.get(key)?.label ?? key;
}

export function dimensionLabel(key: LifeDimension): string {
  return enrichmentCategoryLabel(key);
}

// ─── API Types (GET /users/stats → data) ─────────────────────────────────────

export interface CategoryScore {
  key: EnrichmentCategory;
  label: string;
  score: number;
  weight: number;
  itemCount: number;
  unlocked: boolean;
}

export interface MilestoneInfo {
  reached_threshold: number;
  reached_label: string;
  reached_description: string;
  next_threshold: number | null;
  next_label: string | null;
  is_max: boolean;
}

export interface NudgeQuestion {
  category_key: EnrichmentCategory;
  category_label: string;
  question: string;
}

export interface JumpPill {
  category_key: EnrichmentCategory;
  category_label: string;
  starter: string;
}

export interface MemorySpotlight {
  memory_id: string;
  title: string | null;
  excerpt: string;
  source: 'explicit' | 'conversation';
  updated_at: string | null;
}

/** Full shape of GET /users/stats → data */
export interface UserStatsData {
  streak_count: number;
  reflections_count: number;
  stories_count: number;
  pending_insights_count: number;
  enrichment_score: number;
  category_scores: CategoryScore[];
  lowest_category: EnrichmentCategory | null;
  beneficiary_access_unlocked: boolean;
  beneficiary_count: number;
  quick_capture_pending_count: number;
  milestone: MilestoneInfo;
  nudge: NudgeQuestion | null;
  jump_pills: JumpPill[];
  spotlight?: MemorySpotlight | null;
}

/** Shape of GET /memories/:id/enrichment → data */
export interface ConversationEnrichmentData {
  memory_id: string;
  dimensions: EnrichmentCategory[];
  category_labels: Partial<Record<EnrichmentCategory, string>>;
  message_count: number;
  last_active: string | null;
}

// ─── Legacy key migration (from old API / onboarding) ─────────────────────────

const LEGACY_DIMENSION_TO_ENRICHMENT: Record<string, EnrichmentCategory> = {
  people_relationships: 'relationships_people',
  memories_stories: 'memories_experiences',
  beliefs_values: 'beliefs_worldview',
  heritage_roots: 'heritage_roots',
  passions_interests: 'passions_interests',
  work_purpose: 'work_purpose',
  wishes_letters: 'hopes_legacy',
  everyday_life: 'everyday_life',
  hardships_resilience: 'lessons_wisdom',
  humour_personality: 'identity_self',
};

const CANONICAL_SET = new Set<string>(ALL_ENRICHMENT_CATEGORY_KEYS);

export function isEnrichmentCategoryKey(s: string): s is EnrichmentCategory {
  return CANONICAL_SET.has(s);
}

export function migrateLegacyPriorityDimension(raw: string): EnrichmentCategory | null {
  const t = raw.trim();
  if (!t) return null;
  if (isEnrichmentCategoryKey(t)) return t;
  return LEGACY_DIMENSION_TO_ENRICHMENT[t] ?? null;
}
