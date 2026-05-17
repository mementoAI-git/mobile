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
