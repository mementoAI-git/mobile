/**
 * Insights page data and copy, ported from web `src/features/insights/`
 * (insights-api.types.ts, observations-api.types.ts, enrichment-fields.ts,
 * observation-sources.ts). Keep the two in step.
 */
import endpoint from '@/api/endpoint';
import type { EnrichmentCategory } from '@/constants/enrichment';

/** One connection Memento surfaced. Relates to every field in `categories`. */
export interface Insight {
  id: string;
  title: string;
  body: string;
  categories: EnrichmentCategory[];
  source_count: number;
  /** Emerging until the evidence spans enough time to call it a pattern. */
  status: 'emerging' | 'established';
}

/** Shape of GET /users/insights → data */
export interface InsightList {
  insights: Insight[];
  generated_at: string | null;
  next_refresh_at: string | null;
  /** The evidence is being re-evaluated, so clients should poll. */
  generating: boolean;
}

export interface InsightSource {
  id: string;
  title: string;
  type: 'story' | 'conversation';
  created_at: string | null;
  thumbnail: string | null;
}

export type ObservationField =
  | 'important_notes'
  | 'key_preferences'
  | 'goals_and_aspirations'
  | 'emotional_state_trends';

/** Something Memento has learned about the member, written for them. */
export interface PersonaObservation {
  id: string;
  field: ObservationField;
  heading: string;
  note: string;
  category_key: EnrichmentCategory;
  source_count: number;
}

/** Shape of GET /persona/observations → data */
export interface PersonaObservationsResponse {
  observations: PersonaObservation[];
  /** New facts are being considered, so clients should poll. */
  generating: boolean;
}

/** An observation or preference as the list and detail pages show it. */
export interface ObservationItem {
  id: string;
  title: string;
  detail: string;
  category: EnrichmentCategory;
}

export function toObservationItem(observation: PersonaObservation): ObservationItem {
  return {
    id: observation.id,
    title: observation.heading,
    detail: observation.note,
    category: observation.category_key,
  };
}

export const isPreference = (observation: PersonaObservation) =>
  observation.field === 'key_preferences';

export const MAX_OBSERVATION_HEADING_LENGTH = 120;
export const MAX_OBSERVATION_NOTE_LENGTH = 378;

export const observationUrl = (id: string) =>
  endpoint.personaObservation.replace(':observationId', encodeURIComponent(id));

export const observationSourcesUrl = (id: string) => `${observationUrl(id)}/sources`;

export const insightSourcesUrl = (insightId: string) =>
  `${endpoint.insightSources}?insight=${encodeURIComponent(insightId)}`;

export const fieldSourcesUrl = (field: EnrichmentCategory) =>
  `${endpoint.insightSources}?category=${field}`;

export const NO_OBSERVATION_SOURCES =
  'No linked sources. This didn’t come from a specific memory.';

export type SourceOrder = 'newest' | 'oldest';

export const SOURCE_ORDER_LABELS: Record<SourceOrder, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
};

export function sortSources(sources: InsightSource[], order: SourceOrder): InsightSource[] {
  const direction = order === 'newest' ? -1 : 1;
  const time = (value: string | null) => (value ? Date.parse(value) || 0 : 0);
  return [...sources].sort((a, b) => direction * (time(a.created_at) - time(b.created_at)));
}

// ─── Enrichment fields ────────────────────────────────────────────────────────

export interface EnrichmentField {
  key: EnrichmentCategory;
  label: string;
  description: string;
}

/** Display order and copy for the enrichment fields list. */
export const ENRICHMENT_FIELDS: readonly EnrichmentField[] = [
  { key: 'memories_experiences', label: 'Memories and Experiences', description: 'The moments and milestones that shaped you' },
  { key: 'heritage_roots', label: 'Heritage and Roots', description: 'Family, culture, background and upbringing' },
  { key: 'lessons_wisdom', label: 'Lessons & Wisdom', description: 'What you’ve learned and how you’ve grown' },
  { key: 'relationships_people', label: 'Relationships & People', description: 'The people who matter and your connections' },
  { key: 'beliefs_worldview', label: 'Beliefs & Worldview', description: 'Your values, opinions and perspectives on life' },
  { key: 'passions_interests', label: 'Passions & Interests', description: 'The things that excite and inspire you' },
  { key: 'hopes_legacy', label: 'Hopes & Legacy', description: 'Your dreams, future hopes and legacy' },
  { key: 'work_purpose', label: 'Work & Purpose', description: 'Your career, goals and sense of purpose' },
  { key: 'everyday_life', label: 'Everyday Life', description: 'Your routines, habits and day-to-day moments' },
  { key: 'identity_self', label: 'Identity & Self', description: 'Your self-perception, personality and identity' },
];

const FIELD_BY_KEY = new Map(ENRICHMENT_FIELDS.map((field) => [field.key, field]));

export function getEnrichmentField(key: EnrichmentCategory): EnrichmentField {
  return FIELD_BY_KEY.get(key) ?? { key, label: key, description: '' };
}

/**
 * Field colors from web `insights.css` (`--enrichment-*`): the light set on
 * light surfaces, the brighter set on dark and Deep Sky.
 */
const FIELD_COLORS: Record<EnrichmentCategory, { light: string; dark: string }> = {
  memories_experiences: { light: '#1f7fd1', dark: '#2196f3' },
  heritage_roots: { light: '#3d8fc9', dark: '#6dbcf5' },
  lessons_wisdom: { light: '#1f9e6e', dark: '#6fdca6' },
  relationships_people: { light: '#4b9e3f', dark: '#9bdf7e' },
  beliefs_worldview: { light: '#7a9413', dark: '#c5e55e' },
  passions_interests: { light: '#b98a10', dark: '#f4cc62' },
  hopes_legacy: { light: '#c9702a', dark: '#f2a561' },
  work_purpose: { light: '#cf5a38', dark: '#ee7d5c' },
  everyday_life: { light: '#cf3f45', dark: '#ec5f62' },
  identity_self: { light: '#c23aa0', dark: '#e85fc6' },
};

export function enrichmentFieldColor(key: EnrichmentCategory | undefined, dark: boolean): string {
  const colors = (key && FIELD_COLORS[key]) || FIELD_COLORS.identity_self;
  return dark ? colors.dark : colors.light;
}

/** Hex color with an alpha, for the field-tinted hero surface. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${value}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "9 Nov", as web shows when the next batch is due. */
export function formatDayMonth(value: string | null | undefined): string {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "18 May, 2026", as web lists source dates. */
export function formatSourceDate(value: string | null | undefined): string {
  const short = formatDayMonth(value);
  return short ? `${short}, ${new Date(value as string).getFullYear()}` : '—';
}

/** Insights page sections, in web order, plus Milestones. */
export const INSIGHTS_SECTIONS = [
  { key: 'observations', label: 'Observations' },
  { key: 'insights', label: 'Insights' },
  { key: 'preferences', label: 'Preferences' },
  { key: 'enrichment', label: 'Enrichment fields' },
  { key: 'milestones', label: 'Milestones' },
] as const;

export type InsightsSection = (typeof INSIGHTS_SECTIONS)[number]['key'];
