import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { TYPE } from '@/constants/typography';
import { FONTS } from '@/constants/tokens';

test('keeps both greeting variants: stacked (mobile) and editorial (web)', () => {
  const greeting = readFileSync('src/components/overview/OverviewGreeting.tsx', 'utf8');
  expect(greeting).toContain("export type OverviewGreetingVariant = 'stacked' | 'editorial'");
  expect(greeting).toContain('<GreetingIcon');
  expect(greeting).toContain('TYPE.greetingEditorial');
  expect(greeting).toContain("const prompt = question ? followUp : 'What’s on your mind today?';");
  expect(TYPE.greetingEditorial).toMatchObject({ fontFamily: FONTS.serif });
  expect(TYPE.greetingEditorialName).toMatchObject({ fontFamily: FONTS.serifItalic });
  expect(TYPE.greeting).toMatchObject({ fontSize: 28, lineHeight: 34 });
  const overview = readFileSync('app/(tabs)/overview/index.tsx', 'utf8');
  expect(overview).toContain('<OverviewGreeting name={displayName} />');
});

test('question greetings get a varied statement, never another question', async () => {
  const { GREETING_FOLLOW_UPS, getGreetingFollowUp } = await import('./greeting');
  expect(GREETING_FOLLOW_UPS.length).toBeGreaterThan(1);
  for (const line of GREETING_FOLLOW_UPS) expect(line.endsWith('?')).toBe(false);
  expect(getGreetingFollowUp(() => 0)).toBe(GREETING_FOLLOW_UPS[0]);
  expect(getGreetingFollowUp(() => 0.999)).toBe(GREETING_FOLLOW_UPS[GREETING_FOLLOW_UPS.length - 1]);
});
