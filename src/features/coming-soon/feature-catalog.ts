export interface ComingSoonBenefit {
  description: string;
  icon: 'headphones' | 'sparkles' | 'sliders';
  title: string;
}

export interface ComingSoonFeature {
  benefits: ComingSoonBenefit[];
  description: string;
  eyebrow: string;
  key: 'generic' | 'narration';
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
};

export function resolveComingSoonFeature(featureKey?: string) {
  return (featureKey && FEATURES[featureKey]) || GENERIC_FEATURE;
}
