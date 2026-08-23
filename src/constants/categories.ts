export type CategoryMeta = {
  title: string;
  subtitle: string;
  image: any;
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  career: {
    title: 'Career and ambition',
    subtitle: "The aspirations and goals you've set to achieve professional success and personal fulfillment.",
    image: require('../../assets/images/categories/career.webp'),
  },
  family: {
    title: 'Family life',
    subtitle: "The bonds, traditions, and stories that define your home and heritage.",
    image: require('../../assets/images/categories/family.webp'),
  },
  relationship: {
    title: 'Finding love & relationships',
    subtitle: "The people who shape your heart and the lessons learned through connection.",
    image: require('../../assets/images/categories/relationship.webp'),
  },
  region: {
    title: 'Faith and religious beliefs',
    subtitle: "The principles and convictions that guide your perspective on life.",
    image: require('../../assets/images/categories/region.webp'),
  },
  belief: {
    title: 'Worldviews & beliefs',
    subtitle: "The principles and convictions that guide your perspective on life.",
    image: require('../../assets/images/categories/belief.webp'),
  },
  purpose: {
    title: 'Finding purpose',
    subtitle: "Discovering what gives your life meaning and how you contribute to the world.",
    image: require('../../assets/images/categories/purpose.webp'),
  },
  'life-transition': {
    title: 'Life transitions & changes',
    subtitle: "Moments of growth, uncertainty, and reinvention. Capture how you've navigated turning points, new beginnings, and the lessons that shaped who you are becoming.",
    image: require('../../assets/images/categories/life-transition.webp'),
  },
  wellbeing: {
    title: 'Wellbeing & daily life',
    subtitle: "Your everyday rhythms — how you care for yourself, find balance, and make sense of the world around you.",
    image: require('../../assets/images/categories/wellbeing.webp'),
  },
  identity: {
    title: 'Identity and self-discovery',
    subtitle: "Reflections on who you are, what you believe, and how you've evolved. Trace your values, turning points, and the personal truths that continue to guide your journey.",
    image: require('../../assets/images/categories/identify.webp'),
  },
  'experience-culture': {
    title: 'Experiences & culture',
    subtitle: "Moments that connect you to the world — travels, traditions, and shared experiences that shape your perspective and deepen your sense of belonging.",
    image: require('../../assets/images/categories/experience.webp'),
  },
};
