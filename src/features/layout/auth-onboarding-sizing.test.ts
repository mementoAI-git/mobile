import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';

describe('auth and onboarding sizing', () => {
  test('OTP cells fit in 320pt compact width with 6 digits', () => {
    const screenWidth = 320;
    const horizontalGutter = 20 * 2;
    const availableWidth = screenWidth - horizontalGutter;
    const gap = responsiveSpace(8);
    const totalGaps = gap * 5;
    const singleCellWidth = (availableWidth - totalGaps) / 6;

    expect(singleCellWidth).toBeGreaterThanOrEqual(36);
    expect(minTouchTarget(56)).toBeGreaterThanOrEqual(44);
  });

  test('register screen stacks or wraps name row for compact width', () => {
    const registerSource = readFileSync('app/(auth)/register.tsx', 'utf8');

    expect(registerSource).toContain('useWindowDimensions');
    expect(registerSource).toMatch(/nameRowCompact|flexDirection:\s*['"]column['"]/);
    expect(registerSource).toContain('minTouchTarget');
  });

  // Sign-in has no close control: a signed-out user has nowhere to close to.
  test('auth screens provide minimum 44dp touch target for close controls', () => {
    const registerSource = readFileSync('app/(auth)/register.tsx', 'utf8');
    const verifySource = readFileSync('app/(auth)/verify-email.tsx', 'utf8');
    const forgotSource = readFileSync('app/(auth)/forgot-password.tsx', 'utf8');
    const setPassSource = readFileSync('app/(auth)/set-password.tsx', 'utf8');

    expect(registerSource).toContain('minTouchTarget');
    expect(verifySource).toContain('minTouchTarget');
    expect(forgotSource).toContain('minTouchTarget');
    expect(setPassSource).toContain('minTouchTarget');
  });

  test('onboarding shell guarantees 44dp touch targets', () => {
    const shellSource = readFileSync('src/components/onboarding/OnboardingShell.tsx', 'utf8');

    expect(shellSource).toContain('min-h-[44px]');
  });

  test('onboarding preferences and summary use responsive metrics and wrap chips', () => {
    const prefSource = readFileSync('app/(onboard)/preferences.tsx', 'utf8');
    const summarySource = readFileSync('app/(onboard)/summary.tsx', 'utf8');

    expect(prefSource).toContain("flexWrap: 'wrap'");
    expect(summarySource).toContain("flexWrap: 'wrap'");
    expect(prefSource).toContain("from '@/constants/responsive'");
    expect(summarySource).toContain("from '@/constants/responsive'");
  });
});
