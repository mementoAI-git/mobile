import React, { useCallback } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Button, Spinner } from '@/components/ui';
import { Pressable } from '@/components/ui/Touchable';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';

/** Web `--insights-card` radius. */
export const INSIGHTS_RADIUS = 12;
/** Web `--insights-note`: a warm amber wash behind Memento's own words. */
export const INSIGHT_NOTE_FILL = 'rgba(217,154,28,0.12)';

/** A tappable insights card with the app's press weight and haptics. */
export function InsightsPressable({
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          scale.value = withSpring(0.97);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Web `.insights-empty`: loading, error and empty states share one calm panel. */
export function InsightsMessage({
  icon,
  loading,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  loading?: boolean;
  title?: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View
      accessibilityRole={loading ? 'progressbar' : undefined}
      style={{
        minHeight: 240,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderRadius: INSIGHTS_RADIUS,
        backgroundColor: colors.fillWeak,
        padding: 32,
      }}
    >
      {loading ? <Spinner size="small" color={colors.textWeak} /> : icon}
      {title ? (
        <Text style={[TYPE.bodyStrong, { color: colors.textStrong, textAlign: 'center' }]}>{title}</Text>
      ) : null}
      {body ? (
        <Text style={[TYPE.bodySmall, { color: colors.textBase, textAlign: 'center' }]}>{body}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" size="md" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
