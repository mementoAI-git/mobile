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
