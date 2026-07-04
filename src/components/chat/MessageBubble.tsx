import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import type { IMessage } from '@/types';
import dayjs from 'dayjs';
import { COLORS, FONTS } from '@/constants/tokens';
import { CornerDownRight } from 'lucide-react-native';

interface MessageBubbleProps {
  message: IMessage | { 
    role: string; 
    text: string; 
    created_at?: string; 
    ai_model?: string; 
    _id?: string;
    replyTo?: { role: string; text: string };
  };
  onReply?: () => void;
}

export const MessageBubble = React.memo(function MessageBubble({ message, onReply }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const aiModel = (message as any).ai_model;
  const replyQuote = (message as any).replyTo;

  // Don't render empty bubbles — messages with no content are hidden entirely
  const content = message.text || (message as any).content || '';
  if (!content.trim()) return null;

  return (
    <Animated.View 
      entering={FadeInDown.duration(450).springify()}
      className={cn('mb-5 max-w-[85%]', isUser ? 'self-end' : 'self-start')}
    >
      {/* Balanced, Cohesive Message Bubble Container */}
      <View
        className={cn(
          'px-5 py-3.5 rounded-[20px]',
          isUser ? 'bg-fill-weaker' : 'bg-white'
        )}
      >
        {/* Reply Quote Block */}
        {replyQuote && replyQuote.text && (
          <View className="mb-2.5 border-l-2 border-brand/50 pl-3 py-1 bg-brand/5 rounded-r-lg">
            <Text 
              className="text-[10px] text-brand font-bold uppercase tracking-wider mb-0.5"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Replying to {replyQuote.role === 'user' ? 'your message' : 'Memento'}
            </Text>
            <Text 
              className="text-[12px] text-text-weak leading-relaxed"
              numberOfLines={2}
              style={{ fontFamily: FONTS.sans }}
            >
              {replyQuote.text}
            </Text>
          </View>
        )}

        <Text
          className="text-[15px] leading-[23px] text-text-strong"
          style={{ 
            fontFamily: FONTS.serif, 
            letterSpacing: -0.03
          }}
        >
          {content}
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
        {onReply && (
          <TouchableOpacity 
            onPress={onReply}
            activeOpacity={0.7}
            className="flex-row items-center ml-3 bg-brand/5 px-2 py-0.5 rounded-full border border-brand/10"
          >
            <CornerDownRight size={10} color={COLORS.brand} style={{ marginRight: 3 }} />
            <Text 
              className="text-[8px] text-brand font-bold uppercase tracking-widest"
              style={{ fontFamily: FONTS.sansBold }}
            >
              Reply
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

