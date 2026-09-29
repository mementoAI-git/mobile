import React from 'react';
import { ImageBackground, View, ScrollView, ImageSourcePropType, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LucideIcon } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { iconSize, minTouchTarget, vs } from '@/constants/responsive';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  bg?: ImageSourcePropType;
  icon?: LucideIcon | React.ReactNode;
  onPress?: () => void;
  className?: string;
  variant?: 'blue' | 'pink' | 'orange' | 'green' | 'purple' | 'yellow';
}

const valueColors = {
  blue: 'text-info-strong',
  pink: 'text-stat-pink',
  orange: 'text-brand',
  green: 'text-success-strong',
  purple: 'text-stat-purple',
  yellow: 'text-stat-yellow',
};

export function StatCard({
  label,
  value,
  unit,
  bg,
  icon: Icon,
  onPress,
  className,
  variant = 'blue',
}: StatCardProps) {
  const scaleValue = useSharedValue(1);
  const hasBg = !!bg;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scaleValue.value = withSpring(0.97);
  };

  const handlePressOut = () => {
    if (onPress) scaleValue.value = withSpring(1);
  };

  const content = (
    <View
      className={cn(
        "flex-row items-center justify-between px-5 py-4 w-full",
        !hasBg && "bg-fill-weaker"
      )}
      style={{ minHeight: minTouchTarget(vs(104)) }}
    >
      <View className="gap-1 flex-shrink" style={{ flex: 1 }}>
        <Animated.Text
          className={cn(
            "uppercase tracking-widest",
            hasBg ? "text-text-weak" : "text-text-muted"
          )}
          style={TYPE.eyebrow}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
        <View className="flex-row items-baseline gap-1.5">
          <Animated.Text
            className={cn(
              valueColors[variant]
            )}
            style={TYPE.stat}
            numberOfLines={1}
          >
            {value}
          </Animated.Text>
          {unit ? (
            <Animated.Text
              className={cn(
                hasBg ? "text-text-strong" : "text-text-muted"
              )}
              style={TYPE.metadata}
            >
              {unit}
            </Animated.Text>
          ) : null}
        </View>
      </View>
      {Icon && (
        <View className={cn(
          "ml-3",
          React.isValidElement(Icon) ? "opacity-100" : (hasBg ? "opacity-30" : "opacity-20")
        )}>
          {typeof Icon === 'string' ? (
            <Animated.Text style={TYPE.screenTitle}>{Icon}</Animated.Text>
          ) : React.isValidElement(Icon) ? (
            Icon
          ) : (
            React.createElement(Icon as any, {
              size: iconSize(hasBg ? 38 : 44),
              color: hasBg ? COLORS.textBase : COLORS.textStrong,
              strokeWidth: 1.5
            })
          )}
        </View>
      )}
    </View>
  );

  const containerStyle = cn(
    'flex-1 rounded-[24px] overflow-hidden border border-stroke-weaker bg-white',
    className
  );

  return (
    <Animated.View style={[animatedStyle, { flex: 1 }]}>
      <TouchableOpacity
        onPress={() => {
          if (onPress) {
            Haptics.selectionAsync();
            onPress();
          }
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        className={containerStyle}
        style={styles.shadow}
      >
        {bg ? (
          <ImageBackground
            source={bg}
            className="w-full"
            style={{ width: '100%' }}
            resizeMode="cover"
          >
            {content}
          </ImageBackground>
        ) : content}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
