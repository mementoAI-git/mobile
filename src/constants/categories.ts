import type { ImageSourcePropType } from 'react-native';
import catalog from '@/features/explore/explore-catalog.generated.json';
import { resolveExploreCategorySlug, type ExploreCategorySlug } from '@/features/explore/category-identity';

export type CategoryMeta = {
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
};

const CATEGORY_IMAGES: Record<ExploreCategorySlug, ImageSourcePropType> = {
  'growing-up': require('../../assets/images/categories/growing-up.webp'),
  'people-i-love': require('../../assets/images/categories/people-i-love.webp'),
  'the-life-i-live': require('../../assets/images/categories/the-life-i-live.webp'),
  'things-i-love': require('../../assets/images/categories/things-i-love.webp'),
  'who-i-am': require('../../assets/images/categories/who-i-am.webp'),
  'work-purpose': require('../../assets/images/categories/work-purpose.webp'),
  'beliefs-faith': require('../../assets/images/categories/beliefs-faith.webp'),
  'where-i-come-from': require('../../assets/images/categories/where-i-come-from.webp'),
  'stories-adventures': require('../../assets/images/categories/stories-adventures.webp'),
  'what-life-taught-me': require('../../assets/images/categories/what-life-taught-me.webp'),
  'whats-ahead': require('../../assets/images/categories/whats-ahead.webp'),
};

export const CATEGORY_META = Object.fromEntries(
  catalog.map(category => [category.slug, {
    title: category.title,
    subtitle: category.description,
    image: CATEGORY_IMAGES[category.slug as ExploreCategorySlug],
  }]),
) as Record<ExploreCategorySlug, CategoryMeta>;

export function getCategoryMeta(value?: string | null): CategoryMeta | null {
  const slug = resolveExploreCategorySlug(value);
  return slug ? CATEGORY_META[slug] : null;
}
