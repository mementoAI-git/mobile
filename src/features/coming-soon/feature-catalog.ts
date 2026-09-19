export interface ComingSoonBenefit {
  description: string;
  icon: 'headphones' | 'sparkles' | 'sliders' | 'timer' | 'heart';
  title: string;
}

export interface ComingSoonFeature {
  benefits: ComingSoonBenefit[];
  description: string;
  eyebrow: string;
  key: 'generic' | 'narration' | 'capsules';
  title: string;
}

const GENERIC_FEATURE: ComingSoonFeature = {
  key: 'generic',
  eyebrow: 'COMING SOON',
  title: 'Something thoughtful is on the way',
  description: 'We are shaping this experience with the same care as the memories it will hold.',
  benefits: [],
};

const FEATURES: Record<string, ComingSoonFeature> = {
  narration: {
    key: 'narration',
    eyebrow: 'NARRATION · COMING SOON',
    title: 'Listen to your memories',
    description: 'Turn your conversations and stories into a calm, personal listening experience.',
    benefits: [
      {
        icon: 'headphones',
        title: 'Natural storytelling',
        description: 'Hear memories narrated with warmth and comfortable pacing.',
      },
      {
        icon: 'sparkles',
        title: 'Personalized for you',
        description: 'Use your selected voice and preferences across every story.',
      },
      {
        icon: 'sliders',
        title: 'You stay in control',
        description: 'Choose what plays, adjust the ambience, and stop whenever you like.',
      },
    ],
  },
  capsules: {
    key: 'capsules',
    eyebrow: 'TIME CAPSULES · COMING SOON',
    title: 'Deliver memories to the future',
    description: 'Seal conversations, letters, and voice notes into digital time capsules that unseal on significant dates.',
    benefits: [
      {
        icon: 'timer',
        title: 'Scheduled milestones',
        description: 'Choose a birthday, anniversary, or future milestone for your capsule to be revealed.',
      },
      {
        icon: 'sparkles',
        title: 'Curated stories & media',
        description: 'Combine reflections, photos, and voice notes into a beautifully styled legacy artifact.',
      },
      {
        icon: 'heart',
        title: 'Direct to loved ones',
        description: 'Designate trusted recipients who will receive an unsealing invitation when the moment arrives.',
      },
    ],
  },
};

export function resolveComingSoonFeature(featureKey?: string) {
  return (featureKey && FEATURES[featureKey]) || GENERIC_FEATURE;
}

