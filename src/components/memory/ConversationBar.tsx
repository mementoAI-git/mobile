import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Svg, Path } from 'react-native-svg';
import dayjs from 'dayjs';
import type { IMemory } from '@/types';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface ConversationBarProps {
  memory: IMemory;
  onPress?: () => void;
  index?: number;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function RecentActivityIcon({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        opacity={0.15}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.66699 8C2.66699 6.93913 3.08842 5.92172 3.83857 5.17157C4.58871 4.42143 5.60613 4 6.66699 4H25.3337C26.3945 4 27.4119 4.42143 28.1621 5.17157C28.9122 5.92172 29.3337 6.93913 29.3337 8V21.3333C29.3337 22.3942 28.9122 23.4116 28.1621 24.1618C27.4119 24.9119 26.3945 25.3333 25.3337 25.3333H9.77766L5.33366 28.6667C4.23499 29.4907 2.66699 28.7067 2.66699 27.3333V8Z"
        fill={COLORS.brand}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.6663 15.9998C10.3127 15.9998 9.97358 16.1403 9.72353 16.3904C9.47348 16.6404 9.33301 16.9795 9.33301 17.3332C9.33301 17.6868 9.47348 18.0259 9.72353 18.276C9.97358 18.526 10.3127 18.6665 10.6663 18.6665H14.6663C15.02 18.6665 15.3591 18.526 15.6091 18.276C15.8592 18.0259 15.9997 17.6868 15.9997 17.3332C15.9997 16.9795 15.8592 16.6404 15.6091 16.3904C15.3591 16.1403 15.02 15.9998 14.6663 15.9998H10.6663ZM9.33301 11.9998C9.33301 11.6462 9.47348 11.3071 9.72353 11.057C9.97358 10.807 10.3127 10.6665 10.6663 10.6665H21.333C21.6866 10.6665 22.0258 10.807 22.2758 11.057C22.5259 11.3071 22.6663 11.6462 22.6663 11.9998C22.6663 12.3535 22.5259 12.6926 22.2758 12.9426C22.0258 13.1927 21.6866 13.3332 21.333 13.3332H10.6663C10.3127 13.3332 9.97358 13.1927 9.72353 12.9426C9.47348 12.6926 9.33301 12.3535 9.33301 11.9998Z"
        fill={COLORS.brand}
      />
    </Svg>
  );
}

export function ConversationBar({ memory, onPress, index = 0 }: ConversationBarProps) {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  if (!memory) return null;
  const msgCount = (memory as any).message_count ?? 0;

  const handlePressIn = () => {
    scaleValue.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scaleValue.value = withSpring(1, { damping: 15 });
  };

  // Determine elegant dynamic subtitle details
  const renderSubtitle = () => {
    const plainBody = memory.body ? memory.body.replace(/<[^>]+>/g, '').trim() : '';

    if (plainBody.length > 0) {
      return (
        <Text
          className="text-text-weak leading-snug"
          numberOfLines={1}
          style={TYPE.bodySmall}
        >
          {plainBody}
        </Text>
      );
    }

    // If memory body is empty, but we have active messages in the conversation
    if (msgCount > 0) {
      return (
        <Text
          className="text-text-weak"
          style={TYPE.bodySmall}
        >
          Active conversation • {msgCount} {msgCount === 1 ? 'message' : 'messages'}
        </Text>
      );
    }

    return (
      <Text
        className="text-text-muted italic"
        style={TYPE.bodySmall}
      >
        Start a new conversation
      </Text>
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(600).springify()}
    >
      <AnimatedTouchableOpacity
        onPress={() => {
          Haptics.selectionAsync();
          onPress?.();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        className="flex-row items-center gap-4 px-5 py-4 bg-white rounded-[24px] border border-stroke-weaker"
        style={animatedStyle}
      >
        {/* Premium Multi-Color Vector Svg Icon */}
        <View className="size-11 rounded-2xl bg-brand/5 items-center justify-center shrink-0 border border-brand/10">
          <RecentActivityIcon size={26} />
        </View>

        {/* Content details */}
        <View className="flex-1 gap-1 min-w-0">
          <Text
            className="text-text-strong"
            numberOfLines={1}
            style={TYPE.cardTitle}
          >
            {memory.title || 'Conversation'}
          </Text>
          {renderSubtitle()}
        </View>

        {/* Meta timestamp */}
        <View className="shrink-0">
          <Text
            className="text-text-muted tracking-wide uppercase"
            style={TYPE.eyebrow}
          >
            {dayjs(memory.updated_at ?? memory.created_at).format('MMM D')}
          </Text>
        </View>
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({});
