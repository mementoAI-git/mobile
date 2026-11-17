import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { TYPE } from '@/constants/typography';
import { FONTS } from '@/constants/tokens';

test('keeps greeting style A (editorial, default) and style B (two-line)', () => {
  const greeting = readFileSync('src/components/overview/OverviewGreeting.tsx', 'utf8');
  expect(greeting).toContain("export type OverviewGreetingVariant = 'A' | 'B'");
  expect(greeting).toContain("variant = 'A'");
  expect(greeting).toContain('<GreetingIcon');
  expect(greeting).toContain('TYPE.greetingEditorial');
  expect(greeting).toContain("const prompt = question ? followUp : 'What’s on your mind today?';");
  expect(TYPE.greetingEditorial).toMatchObject({ fontFamily: FONTS.serif });
  expect(TYPE.greetingEditorialName).toMatchObject({ fontFamily: FONTS.serifItalic });
  expect(TYPE.greeting).toMatchObject({ fontSize: 28, lineHeight: 34 });
  const overview = readFileSync('app/(tabs)/overview/index.tsx', 'utf8');
  expect(overview).toContain("const GREETING_STYLE: OverviewGreetingVariant = 'A';");
  expect(overview).toContain('<OverviewGreeting name={displayName} variant={GREETING_STYLE} />');
  expect(overview).toContain('placeholder={GREETING_CAPTURE_PLACEHOLDER[GREETING_STYLE]}');
});

test('question greetings get a varied statement, never another question', async () => {
  const { GREETING_FOLLOW_UPS, getGreetingFollowUp } = await import('./greeting');
  expect(GREETING_FOLLOW_UPS.length).toBeGreaterThan(1);
  for (const line of GREETING_FOLLOW_UPS) expect(line.endsWith('?')).toBe(false);
  expect(getGreetingFollowUp(() => 0)).toBe(GREETING_FOLLOW_UPS[0]);
  expect(getGreetingFollowUp(() => 0.999)).toBe(GREETING_FOLLOW_UPS[GREETING_FOLLOW_UPS.length - 1]);
});
