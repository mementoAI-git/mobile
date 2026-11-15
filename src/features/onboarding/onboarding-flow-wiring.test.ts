import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

const readSource = (path: string) => {
  expect(existsSync(path)).toBe(true);
  return readFileSync(path, 'utf8');
};

const expectTokenizedPresentation = (source: string) => {
  expect(source).toContain('@/constants/typography');
  expect(source).toContain('TYPE.');
  expect(source).not.toMatch(/fontWeight\s*:/);
  expect(source).not.toMatch(/text-\[\d+(?:\.\d+)?px\]/);
  expect(source).not.toMatch(/#[\da-f]{3,8}\b/i);
  expect(source).not.toContain('Modal');
};

describe('Onboarding shared components static contract', () => {
  test('OnboardingShell owns safe areas, shared actions, animated content, and keyboard-safe footer', () => {
    const shell = readSource('src/components/onboarding/OnboardingShell.tsx');

    expect(shell).toContain("from 'react-native-safe-area-context'");
    expect(shell).toContain("import { Button, Logo } from '@/components/ui'");
    expect(shell).toContain("edges={['top', 'bottom']}");
    expect(shell).toContain('primaryAction?: OnboardingAction');
    expect(shell).toContain('scrollable?: boolean');
    expect(shell).toContain('entering={FadeInDown');
    expect(shell).toContain('ReduceMotion.System');
    expect(shell).toContain('min-h-[44px]');
    expect(shell).not.toContain('TouchableOpacity');
    expect(shell).toContain('loading={isSkipping}');
    expect(shell).toContain('loading={secondaryAction.loading}');

    const footerIndex = shell.indexOf('{/* Footer */}');
    const keyboardAvoidingEndIndex = shell.lastIndexOf('</KeyboardAvoidingView>');
    expect(footerIndex).toBeGreaterThan(-1);
    expect(footerIndex).toBeLessThan(keyboardAvoidingEndIndex);

    expectTokenizedPresentation(shell);
  });

  test('choice variants expose planned props and accessible animated selection controls', () => {
    const choice = readSource('src/components/onboarding/OnboardingChoice.tsx');

    expect(choice).toContain('Haptics.NotificationFeedbackType.Warning');
    expect(choice).toContain('icon?: React.ReactNode');
    expect(choice).toContain('onPress: () => boolean | void');
    expect(choice).toContain('useSharedValue');
    expect(choice).toContain('withSpring');
    expect(choice).toContain('Haptics.selectionAsync()');
    // Motivation rows are 44px+; life-area chips are the 40px Figma chip with 2px hitSlop each side.
    expect(choice.match(/min-h-\[44px\]/g)).toHaveLength(1);
    expect(choice).toContain('hitSlop={{ top: 2, bottom: 2 }}');
    expect(choice).toContain('accessibilityRole="radio"');
    expect(choice).toContain('accessibilityRole="checkbox"');
    expect(choice.match(/accessibilityState=\{\{ checked: selected, disabled \}\}/g)).toHaveLength(2);
    expect(choice).not.toContain('style={TYPE.label}');

    expectTokenizedPresentation(choice);
  });

  test('OtpCodeInput uses one autofill input and normalizes pasted text before six visual cells', () => {
    const otp = readSource('src/components/auth/OtpCodeInput.tsx');

    expect(otp).toContain('error?: boolean');
    expect(otp.match(/^\s*<RNTextInput\b/gm)).toHaveLength(1);
    expect(otp).toContain('const OTP_CELLS = [0, 1, 2, 3, 4, 5]');
    expect(otp).toContain('normalizeOtpInput(text)');
    expect(otp).toContain('onChangeText={handleTextChange}');
    expect(otp).toContain('keyboardType="number-pad"');
    expect(otp).toContain('textContentType="oneTimeCode"');
    expect(otp).toContain('text-transparent');
    expect(otp).toContain('border-error');
    expect(otp).toContain('accessibilityState={{ disabled }}');
    expect(otp).toContain('Haptics.selectionAsync()');
    expect(otp).not.toContain('maxLength={6}');

    expectTokenizedPresentation(otp);
  });

  test('OTP keeps the editable field accessible and visible to native focus without duplicating its cells', () => {
    const otp = readSource('src/components/auth/OtpCodeInput.tsx');
    const nativeInput = otp.slice(otp.indexOf('<RNTextInput\n'));

    expect(nativeInput).toContain('accessibilityLabel="Verification code"');
    expect(nativeInput).toContain('accessibilityState={{ disabled }}');
    expect(nativeInput).not.toContain('aria-hidden');
    expect(nativeInput).not.toContain('9999px');
    expect(otp).toContain('accessibilityElementsHidden');
    expect(otp).toContain('importantForAccessibility="no-hide-descendants"');
    expect(otp).toContain('const handleTextChange = useCallback(');
    expect(otp).toContain('onFocus={handleFocus}');
    expect(otp).toContain('onBlur={handleBlur}');
  });

  test('moving choice feedback into shared controls preserves welcome-screen skip feedback', () => {
    const hook = readSource('src/hooks/use-first-run-onboarding.ts');
    const skipHandler = hook.slice(hook.indexOf('const handleSkip'), hook.indexOf('const handleComplete'));

    expect(skipHandler).toContain('Haptics.impactAsync');
  });
});
