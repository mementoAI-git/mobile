import React, { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GreetingIcon } from '@/components/ui';
import { TYPE, TYPE_METRICS } from '@/constants/typography';
import { getGreeting, getGreetingFollowUp, getGreetingPunctuation, shouldUseBrightWelcomeIcon } from '@/features/overview/greeting';
import { useThemeColors } from '@/hooks/use-theme-colors';

/**
 * Greeting styles:
 * - `A` (default, web's welcome section): the sun/moon beside one EB Garamond
 *   line, "Good morning *Groot*.", with the capture card asking the question
 *   (see `GREETING_CAPTURE_PLACEHOLDER`).
 * - `B`: SF Pro Rounded semibold 28/34 over two lines,
 *   "Good morning, *Groot*," / "What's on your mind today?".
 * The name is the muted serif italic accent in both.
 */
export type OverviewGreetingVariant = 'A' | 'B';

/** The capture card placeholder that pairs with each greeting style. */
export const GREETING_CAPTURE_PLACEHOLDER: Record<OverviewGreetingVariant, string> = {
  A: 'What’s on your mind today?',
  B: 'Add something to your Memento',
};

export function OverviewGreeting({ name, variant = 'A' }: { name?: string | null; variant?: OverviewGreetingVariant }) {
  const COLORS = useThemeColors();
  // Picked once per mount; the hour doesn't change meaningfully in a session.
  const greeting = useMemo(() => getGreeting(), []);
  const bright = useMemo(() => shouldUseBrightWelcomeIcon(), []);
  const followUp = useMemo(() => getGreetingFollowUp(), []);
  const question = getGreetingPunctuation(greeting) === '?';
  const nameStyle = [variant === 'B' ? TYPE.greetingName : TYPE.greetingEditorialName, { color: COLORS.textWeak }];

  if (variant === 'A') {
    const end = getGreetingPunctuation(greeting);
    return (
      <Animated.View entering={FadeInDown.duration(600)} className="flex-row items-start gap-3">
        <GreetingIcon type={bright ? 'sun' : 'moon'} size={TYPE_METRICS.greetingEditorial.lineHeight} />
        <View className="flex-1">
          <Animated.Text className="text-text-strong" style={TYPE.greetingEditorial} accessibilityRole="header">
            {name ? greeting : greeting.replace(/,$/, end)}
            {name ? <Animated.Text style={nameStyle}>{' '}{name}{end}</Animated.Text> : null}
          </Animated.Text>
        </View>
      </Animated.View>
    );
  }

  // "Good morning, Groot," / "What's on your mind today?". A greeting that is
  // already a question ("Back at it, Groot?") gets a statement instead, so the
  // two lines never ask twice ("Ready when you are.", "Take your time.", …).
  const end = question ? '?' : ',';
  const prompt = question ? followUp : 'What’s on your mind today?';
  return (
    <Animated.View entering={FadeInDown.duration(600)}>
      <Animated.Text className="text-text-strong" style={TYPE.greeting} accessibilityRole="header">
        {name ? greeting : greeting.replace(/,$/, end)}
        {name ? <Animated.Text style={nameStyle}>{' '}{name}</Animated.Text> : null}
        {name ? end : ''}
        {'\n'}{prompt}
      </Animated.Text>
    </Animated.View>
  );
}
