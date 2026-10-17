export const EXPLORE_CATEGORY_SLUGS = [
  "growing-up",
  "people-i-love",
  "the-life-i-live",
  "things-i-love",
  "who-i-am",
  "work-purpose",
  "beliefs-faith",
  "where-i-come-from",
  "stories-adventures",
  "what-life-taught-me",
  "whats-ahead",
] as const;

export type ExploreCategorySlug = (typeof EXPLORE_CATEGORY_SLUGS)[number];

export const LEGACY_EXPLORE_CATEGORY_ALIASES: Record<
  string,
  ExploreCategorySlug
> = {
  childhood: "growing-up",
  love: "people-i-love",
  relationships: "people-i-love",
  changes: "what-life-taught-me",
  career: "work-purpose",
  family: "people-i-love",
  relationship: "people-i-love",
  region: "beliefs-faith",
  belief: "beliefs-faith",
  purpose: "work-purpose",
  "life-transition": "what-life-taught-me",
  wellbeing: "the-life-i-live",
  identity: "who-i-am",
  "experience-culture": "stories-adventures",
};

const canonicalSlugs = new Set<string>(EXPLORE_CATEGORY_SLUGS);

export function resolveExploreCategorySlug(value?: string | null): ExploreCategorySlug | null {
  const normalized = String(value || '').trim().toLowerCase();
  if (canonicalSlugs.has(normalized)) return normalized as ExploreCategorySlug;
  return Object.prototype.hasOwnProperty.call(LEGACY_EXPLORE_CATEGORY_ALIASES, normalized)
    ? LEGACY_EXPLORE_CATEGORY_ALIASES[normalized]
    : null;
}

export type PromptCategoryIdentity =
  | string
  | {
      _id?: unknown;
      slug?: unknown;
      name?: unknown;
    };

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

export function getPromptCategorySlug(
  category: PromptCategoryIdentity,
): string {
  if (typeof category === 'string') return category.trim();

  return (
    nonEmptyString(category.slug) ??
    nonEmptyString(category._id) ??
    nonEmptyString(category.name) ??
    ''
  );
}
