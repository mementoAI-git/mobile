import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
      entering={isUser ? undefined : FadeIn.duration(300)}
      className={cn('mb-4 max-w-[85%]', isUser ? 'self-end' : 'self-start')}
    >
      <View
        style={[
          isUser ? styles.userBubble : styles.aiBubble,
          isUser ? styles.userShadow : styles.aiShadow
        ]}
        className={cn(
          'px-5 py-3.5',
          isUser
            ? 'bg-brand rounded-[24px] rounded-br-[4px]'
            : 'bg-white border border-stroke-weaker rounded-[24px] rounded-bl-[4px]',
        )}
      >
        <Text
          className={cn('text-[16px] leading-[24px]', isUser ? 'text-white' : 'text-text-strong')}
          style={{ fontFamily: isUser ? FONTS.sansMedium : FONTS.sans, letterSpacing: -0.1 }}
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
            className="text-[10px] text-text-weak opacity-40 font-bold uppercase tracking-widest"
            style={{ fontFamily: FONTS.sansBold }}
          >
            {dayjs(message.created_at).format('h:mm A')}
          </Text>
        )}
        {!isUser && aiModel && (
          <View className="flex-row items-center ml-2 bg-fill-weak px-2 py-0.5 rounded-full border border-stroke-weaker">
            <Text
              className="text-[8px] text-text-muted font-bold uppercase tracking-widest"
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
  userBubble: {
    backgroundColor: COLORS.brand,
  },
  aiBubble: {
    backgroundColor: COLORS.card,
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      },
    }),
  },
  userShadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.brand,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  aiShadow: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 1,
      },
    }),
  },
});
