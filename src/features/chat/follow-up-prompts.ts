export const CATEGORY_FOLLOW_UPS: Record<string, string[]> = {
  family: [
    'Who was there with you?',
    'How did your family react?',
    'What tradition came out of that moment?',
    'How did that shape your family dynamic?',
  ],
  career: [
    'What was the biggest lesson from that?',
    'Who mentored you during that time?',
    'What would you do differently now?',
    'How did that milestone feel at the time?',
  ],
  relationship: [
    'What drew you to them initially?',
    'What made that moment memorable?',
    'How did your perspective shift after that?',
    'What did you learn about yourself through them?',
  ],
  'life-transition': [
    'How did you adapt to the change?',
    'What was the hardest part to leave behind?',
    'What surprised you most about that phase?',
    'How did that transition set up what came next?',
  ],
  belief: [
    'What sparked that realization?',
    'How does that belief guide you today?',
    'What advice would you share on this?',
    'Has your view on this evolved over time?',
  ],
  identity: [
    'When did you first realize that about yourself?',
    'What are you most proud of in that journey?',
    'How has that part of you changed over the years?',
    'What helps you stay grounded in who you are?',
  ],
  purpose: [
    'What gives you energy when working on that?',
    'Who inspired that passion in you?',
    'Where do you hope this takes you in the future?',
  ],
  wellbeing: [
    'What helps you recharge when things get busy?',
    'How has your routine changed since then?',
    'What simple joy never gets old for you?',
  ],
};

export const DEFAULT_FOLLOW_UPS = [
  'What stands out most when you look back?',
  'How did that experience shape who you are today?',
  'What would you tell someone going through that?',
  'Tell me more about how that felt.',
];

/**
 * Returns 2-3 contextual follow-up questions for a prompt reflection session.
 */
export function getFollowUpPrompts(
  categorySlug?: string | null,
  promptTitle?: string | null,
  turnCount = 0
): string[] {
  const normalizedCat = (categorySlug || '').toLowerCase().trim();
  const pool = CATEGORY_FOLLOW_UPS[normalizedCat] || DEFAULT_FOLLOW_UPS;

  // Rotate through pool based on turn count so consecutive turns offer fresh questions
  const offset = turnCount % pool.length;
  const reordered = [...pool.slice(offset), ...pool.slice(0, offset)];

  return reordered.slice(0, 3);
}
