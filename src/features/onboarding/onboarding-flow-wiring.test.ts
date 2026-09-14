import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';

describe('Onboarding shared components static contract', () => {
  test('OnboardingShell exists and enforces layout and typography standards', () => {
    expect(existsSync('src/components/onboarding/OnboardingShell.tsx')).toBe(true);
    const shell = readFileSync('src/components/onboarding/OnboardingShell.tsx', 'utf8');

    expect(shell).toContain('SafeAreaView');
    expect(shell).toContain('@/constants/typography');
    expect(shell).toContain('TYPE.');
    expect(shell).not.toContain('Modal');
    expect(shell).not.toMatch(/fontWeight\s*:/);
    expect(shell).not.toMatch(/text-\[\d+(?:\.\d+)?px\]/);
  });

  test('OnboardingChoice exists and enforces accessibility and styling standards', () => {
    expect(existsSync('src/components/onboarding/OnboardingChoice.tsx')).toBe(true);
    const choice = readFileSync('src/components/onboarding/OnboardingChoice.tsx', 'utf8');

    expect(choice).toContain('@/constants/typography');
    expect(choice).toContain('TYPE.');
    expect(choice).toContain('Haptics');
    expect(choice).not.toMatch(/fontWeight\s*:/);
    expect(choice).not.toMatch(/text-\[\d+(?:\.\d+)?px\]/);
  });
});
