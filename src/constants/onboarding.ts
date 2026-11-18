import type { EnrichmentCategory } from './enrichment';

/**
 * Reasons for joining, stored in persona `join_reasons`. The IDs match web
 * `reasonOptions` (src/pages/onboarding/flow-options.ts) so answers given on
 * one app restore on the other.
 */
export type OnboardingMotivation =
  | 'memory_preservation'
  | 'self_understanding'
  | 'life_record'
  | 'personal_space'
  | 'emotional_depth'
  | 'explorer';

/** The primary motivation type the API keeps for the AI (web `MotivationType`). */
export type OnboardingMotivationType =
  | 'memory_preservation'
  | 'self_understanding'
  | 'personal_space'
  | 'emotional_depth'
  | 'explorer';

/** IDs mobile saved before it matched web; read them as their web equivalents. */
export const LEGACY_MOTIVATION_IDS: Readonly<Record<string, OnboardingMotivation>> = {
  preserve_memories: 'memory_preservation',
  self_reflection: 'self_understanding',
  organize_thoughts: 'personal_space',
  legacy_for_loved_ones: 'emotional_depth',
  exploring: 'explorer',
};

export interface FirstRunMotivationOption {
  value: OnboardingMotivation;
  /** Sent as `motivationType`; "Build a record of my life" counts as memory preservation, as on web. */
  motivation: OnboardingMotivationType;
  label: string;
  emoji: string;
}

export interface FirstRunLifeAreaOption {
  value: EnrichmentCategory;
  label: string;
  emoji: string;
}

export const FIRST_RUN_MOTIVATIONS: readonly FirstRunMotivationOption[] = [
  { value: 'memory_preservation', motivation: 'memory_preservation', label: 'Preserve memories', emoji: '📚' },
  { value: 'self_understanding', motivation: 'self_understanding', label: 'Reflect on my life', emoji: '🪞' },
  { value: 'life_record', motivation: 'memory_preservation', label: 'Record my life', emoji: '✍️' },
  { value: 'personal_space', motivation: 'personal_space', label: 'Organize my thoughts', emoji: '🗂️' },
  { value: 'emotional_depth', motivation: 'emotional_depth', label: 'Leave a legacy for loved ones', emoji: '💌' },
  { value: 'explorer', motivation: 'explorer', label: 'I’m just exploring', emoji: '🔍' },
] as const;

export const FIRST_RUN_LIFE_AREAS: readonly FirstRunLifeAreaOption[] = [
  { value: 'identity_self', label: 'Identity & Self', emoji: '🪞' },
  { value: 'relationships_people', label: 'Relationships & People', emoji: '🤝' },
  { value: 'work_purpose', label: 'Work & Purpose', emoji: '🔨' },
  { value: 'memories_experiences', label: 'Memories & Experiences', emoji: '📚' },
  { value: 'beliefs_worldview', label: 'Beliefs & Worldview', emoji: '🕯️' },
  { value: 'passions_interests', label: 'Passions & Interests', emoji: '🌟' },
  { value: 'heritage_roots', label: 'Heritage & Roots', emoji: '🗺️' },
  { value: 'lessons_wisdom', label: 'Lessons & Wisdom', emoji: '🌊' },
  { value: 'hopes_legacy', label: 'Hopes & Legacy', emoji: '💌' },
  { value: 'everyday_life', label: 'Everyday Life', emoji: '☕' },
] as const;

export const PASSION_OPTIONS = [
  'Travel & Adventure',
  'Family & Relationships',
  'Career & Ambitions',
  'Health & Wellness',
  'Personal Growth',
  'Creativity & Art',
  'Technology',
  'Food & Cooking',
  'Sports & Fitness',
  'Music',
  'Reading & Literature',
  'Nature & Environment',
  'Finance & Investing',
  'Spirituality & Faith',
  'Volunteering & Community',
];

export const MOTIVATION_OPTIONS = [
  'Preserve memories for loved ones',
  'Leave a legacy for my children',
  'Process life experiences',
  'Share my story with the world',
  'Keep a personal journal',
  'Capture family history',
  'Document my professional journey',
  'Reflect on personal growth',
];

export const COMMUNICATION_STYLE_OPTIONS = [
  { value: 'casual', label: 'Casual', description: 'Relaxed, conversational tone' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'formal', label: 'Formal', description: 'Professional and structured' },
  { value: 'professional', label: 'Professional', description: 'Business-like and precise' },
] as const;

export const CONVERSATION_TONE_OPTIONS = [
  { value: 'upbeat', label: 'Upbeat', description: 'Energetic and positive' },
  { value: 'warm', label: 'Warm', description: 'Caring and empathetic' },
  { value: 'calm', label: 'Calm', description: 'Peaceful and measured' },
  { value: 'analytical', label: 'Analytical', description: 'Thoughtful and precise' },
  { value: 'creative', label: 'Creative', description: 'Imaginative and expressive' },
] as const;

export const RESPONSE_LENGTH_OPTIONS = [
  { value: 'short', label: 'Short', description: 'Brief, concise responses' },
  { value: 'medium', label: 'Medium', description: 'Balanced depth and brevity' },
  { value: 'long', label: 'Long', description: 'Detailed, comprehensive' },
] as const;

export const RELATIONSHIP_OPTIONS = [
  'Parent',
  'Sibling',
  'Child',
  'Spouse / Partner',
  'Close Friend',
  'Colleague',
  'Mentor',
  'Other',
];
