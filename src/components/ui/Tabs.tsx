import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  type ViewProps,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TabItem {
  key: string;
  label: string;
}

interface TabsProps extends ViewProps {
  tabs: TabItem[];
  activeKey: string;
  onTabChange: (key: string) => void;
  /** 'pill' (default) — active tab gets brand-orange filled pill.
   *  'underline' — active tab gets a brand-orange bottom border. */
  variant?: 'pill' | 'underline';
  /** Allow horizontal scrolling for many tabs. Default: false */
  scrollable?: boolean;
  className?: string;
}

/**
 * Tabs — horizontal tab bar, mirrors web shadcn `<Tabs />`.
 *
 * Variants:
 * - `pill` (default): `bg-fill-weak` track, active tab gets `bg-brand` pill
 *   with white text — matches web's `.mem-tags` / pill tab pattern.
 * - `underline`: flat tabs with brand-orange bottom indicator line.
 *
 * Usage:
 * ```tsx
 * const [tab, setTab] = useState('stories');
 * <Tabs
 *   tabs={[{ key: 'stories', label: 'Stories' }, { key: 'media', label: 'Media' }]}
 *   activeKey={tab}
 *   onTabChange={setTab}
 * />
 * ```
 */
export function Tabs({
  tabs,
  activeKey,
  onTabChange,
  variant = 'pill',
  scrollable = false,
  className,
  style,
  ...props
}: TabsProps) {
  const COLORS = useThemeColors();
  const handlePress = (key: string) => {
    if (key === activeKey) return;
    Haptics.selectionAsync();
    onTabChange(key);
  };

  const content = (
    <View
      className={cn(
        'flex-row',
        variant === 'pill' && 'bg-fill-weak rounded-full p-1 gap-1',
        variant === 'underline' && 'border-b border-stroke-weaker gap-0',
        !scrollable && 'flex-1',
        className,
      )}
      style={style}
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        if (variant === 'pill') {
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handlePress(tab.key)}
              activeOpacity={0.8}
              className={cn(
                'flex-1 items-center justify-center rounded-full py-2 px-3',
                isActive ? 'bg-brand' : 'bg-transparent',
              )}
            >
              <Text
                style={{
                  ...(isActive ? TYPE.buttonSmall : TYPE.label),
                  color: isActive ? COLORS.textInverse : COLORS.textWeak,
                }}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        }

        // underline variant
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => handlePress(tab.key)}
            activeOpacity={0.7}
            className={cn(
              'items-center justify-center pb-2 px-4',
              isActive ? 'border-b-2 border-brand' : 'border-b-2 border-transparent',
            )}
          >
            <Text
              style={{
                ...(isActive ? TYPE.buttonSmall : TYPE.label),
                color: isActive ? COLORS.textStrong : COLORS.textWeak,
              }}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}
