import type {
  CategoryScore,
  EnrichmentCategory,
} from '@/constants/enrichment';
import { enrichmentCategoryLabel } from '@/constants/enrichment';

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

const INSIGHTS_DIMENSION_ORDER: readonly EnrichmentCategory[] = [
  'memories_experiences',
  'heritage_roots',
  'lessons_wisdom',
  'relationships_people',
  'beliefs_worldview',
  'passions_interests',
  'hopes_legacy',
  'work_purpose',
  'everyday_life',
  'identity_self',
] as const;

export interface AccountWeekDay {
  key: string;
  label: string;
  date: number;
  isToday: boolean;
  isCompleted: boolean;
  /** "November 7", for screen readers. */
  fullDate?: string;
}

export interface EnrichmentDimension {
  key: EnrichmentCategory;
  label: string;
  score: number;
}

export function clampEnrichmentScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function toMondayFirstIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export function deriveAccountWeek(today: Date, streakCount: number): AccountWeekDay[] {
  const todayIndex = toMondayFirstIndex(today.getDay());
  const completedStart = Math.max(0, todayIndex - Math.max(0, streakCount - 1));

  return WEEK_LABELS.map((label, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index - todayIndex);

    return {
      key: day.toISOString().slice(0, 10),
      label,
      date: day.getDate(),
      isToday: index === todayIndex,
      isCompleted: streakCount > 0 && index < todayIndex && index >= completedStart,
    };
  });
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * The current week for the web streak card (`streak-tracker.tsx`, card B):
 * a day is active when it falls in the streak that ends on the last active day.
 * Without a last active day, the streak is taken to end yesterday.
 */
export function deriveStreakWeek(
  today: Date,
  streakCount: number,
  lastActive?: string | null,
): AccountWeekDay[] {
  const startOfToday = startOfDay(today);
  const todayIndex = toMondayFirstIndex(startOfToday.getDay());
  const parsed = lastActive ? new Date(lastActive) : null;
  const end = parsed && !Number.isNaN(parsed.getTime())
    ? startOfDay(parsed)
    : new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - 1);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - Math.max(0, streakCount - 1));

  return WEEKDAY_LABELS.map((label, index) => {
    const day = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() + index - todayIndex);
    return {
      key: `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`,
      label,
      date: day.getDate(),
      isToday: index === todayIndex,
      isCompleted: streakCount > 0 && day.getTime() <= end.getTime() && day.getTime() >= start.getTime(),
      fullDate: `${MONTH_NAMES[day.getMonth()]} ${day.getDate()}`,
    };
  });
}

export function normalizeEnrichmentDimensions(
  categoryScores: CategoryScore[] | null | undefined,
): EnrichmentDimension[] {
  const scoresByKey = new Map(
    (categoryScores ?? []).map((category) => [category.key, category]),
  );

  return INSIGHTS_DIMENSION_ORDER.map((key) => {
    const category = scoresByKey.get(key);
    const rawScore = Number(category?.score);

    return {
      key,
      label: category?.label?.trim() || enrichmentCategoryLabel(key),
      score: Number.isFinite(rawScore)
        ? Math.min(100, Math.max(0, Math.round(rawScore * 100) / 100))
        : 0,
    };
  });
}
