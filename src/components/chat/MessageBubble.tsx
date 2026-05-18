import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import type { IMessage } from '@/types';
import dayjs from 'dayjs';
import { COLORS, FONTS } from '@/constants/tokens';

interface MessageBubbleProps {
  message: IMessage | { role: string; text: string; created_at?: string; ai_model?: string; _id?: string };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const aiModel = (message as any).ai_model;

  return (
    <Animated.View 
      entering={FadeInDown.duration(450).springify()}
      className={cn('mb-5 max-w-[85%]', isUser ? 'self-end' : 'self-start')}
    >
      {/* Balanced, Cohesive Message Bubble Container */}
      <View
        className={cn(
          'px-5 py-3.5',
          isUser
            ? 'bg-[#FAF7F2] border border-stroke-weak rounded-[20px] rounded-tr-[4px]'
            : 'bg-white border border-stroke-weaker rounded-[20px] rounded-bl-[4px]'
        )}
        style={isUser ? styles.userShadow : styles.aiShadow}
      >
        <Text
          className="text-[15px] leading-[23px] text-text-strong"
          style={{ 
            fontFamily: FONTS.serif, 
            letterSpacing: -0.03
          }}
        >
          {message.text}
        </Text>
      </View>

      {/* Meta Info */}
      <View className={cn('flex-row items-center mt-1.5 px-2', isUser ? 'justify-end' : 'justify-start')}>
        {!isUser && (
          <View className="size-4 bg-brand/10 rounded-full items-center justify-center mr-1.5 border border-brand/5">
            <Text className="text-[9px]">🌱</Text>
          </View>
        )}
        {'created_at' in message && message.created_at && (
          <Text
            className="text-[9px] text-text-muted font-bold uppercase tracking-widest"
            style={{ fontFamily: FONTS.sansBold }}
          >
            {dayjs(message.created_at).format('h:mm A')}
          </Text>
        )}
        {!isUser && aiModel && (
          <View className="flex-row items-center ml-2 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10">
            <Text
              className="text-[8px] text-brand font-bold uppercase tracking-widest"
              style={{ fontFamily: FONTS.sansBold }}
            >
              {aiModel}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userShadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  aiShadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
});
