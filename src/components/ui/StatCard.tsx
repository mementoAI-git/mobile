import React from 'react';
import { ImageBackground, View, ScrollView, ImageSourcePropType, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LucideIcon } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
 
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
  blue: 'text-[#0C71FF]',
  pink: 'text-[#D91DAA]',
  orange: 'text-[#FF7D0C]',
  green: 'text-[#25C971]',
  purple: 'text-[#6621F0]',
  yellow: 'text-[#FF8C00]',
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
      style={{ minHeight: verticalScale(104) }}
    >
      <View className="gap-1 flex-shrink" style={{ flex: 1 }}>
        <Animated.Text
          className={cn(
            "font-bold uppercase tracking-widest text-[10px]",
            hasBg ? "text-text-weak" : "text-text-muted"
          )}
          style={{ fontFamily: FONTS.sansBold }}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
        <View className="flex-row items-baseline gap-1.5">
          <Animated.Text
            className={cn(
              'font-bold',
              hasBg ? "text-xl" : "text-2xl",
              valueColors[variant]
            )}
            style={{ fontFamily: FONTS.sansBold }}
            numberOfLines={1}
          >
            {value}
          </Animated.Text>
          {unit ? (
            <Animated.Text
              className={cn(
                "text-sm font-semibold",
                hasBg ? "text-text-strong" : "text-text-muted"
              )}
              style={{ fontFamily: FONTS.sansSemi }}
            >
              {unit}
            </Animated.Text>
          ) : null}
        </View>
      </View>
      {Icon && (
        <View className={cn(
          "ml-3",
          hasBg ? "opacity-30" : "opacity-20"
        )}>
          {typeof Icon === 'string' ? (
            <Animated.Text className="text-3xl">{Icon}</Animated.Text>
          ) : React.isValidElement(Icon) ? (
            Icon
          ) : (
            React.createElement(Icon as any, {
              size: hasBg ? scale(38) : scale(44),
              color: hasBg ? COLORS.textBase : COLORS.textStrong,
              strokeWidth: 1.5
            })
          )}
        </View>
      )}
    </View>
  );

  const containerStyle = cn(
    'flex-1 rounded-[24px] overflow-hidden border border-stroke-weaker bg-white shadow-sm',
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
          <ImageBackground source={bg} className="w-full" imageStyle={{ borderRadius: 24 }} resizeMode="cover">
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
