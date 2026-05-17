import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MessageCircle } from 'lucide-react-native';
import dayjs from 'dayjs';
import type { IMemory } from '@/types';
import { COLORS, FONTS } from '@/constants/tokens';

interface ConversationBarProps {
  memory: IMemory;
  onPress?: () => void;
}

const ICON_COLOR = COLORS.textWeak;

export function ConversationBar({ memory, onPress }: ConversationBarProps) {
  if (!memory) return null;
  const msgCount = (memory as any).message_count ?? 0;

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      activeOpacity={0.8}
      className="flex-row items-center gap-3 px-4 py-3.5 bg-card rounded-2xl border border-stroke-weaker"
      style={{
        shadowColor: 'rgba(23,11,0,0.05)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      {/* Icon */}
      <View className="w-10 h-10 rounded-full bg-fill-weak items-center justify-center shrink-0">
        <MessageCircle size={18} color={ICON_COLOR} strokeWidth={1.8} />
      </View>

      {/* Content */}
      <View className="flex-1 gap-0.5 min-w-0">
        <Text
          className="text-lg text-text-strong"
          numberOfLines={1}
          style={{ fontFamily: FONTS.serif }}
        >
          {memory.title || 'Conversation'}
        </Text>
        {memory.body && (
          <Text
            className="text-sm text-text-weak"
            numberOfLines={1}
            style={{ fontFamily: FONTS.sans }}
          >
            {memory.body?.replace(/<[^>]+>/g, '')}
          </Text>
        )}
      </View>

      {/* Meta */}
      <View className="items-end gap-1.5 shrink-0">
        <Text
          className="text-xs text-text-weak"
          style={{ fontFamily: FONTS.sans }}
        >
          {dayjs(memory.updated_at ?? memory.created_at).format('MMM D')}
        </Text>
        {msgCount > 0 && (
          <View className="bg-brand rounded-full px-2 py-0.5 min-w-[22px] items-center">
            <Text
              className="text-[10px] text-white"
              style={{ fontFamily: FONTS.sansBold }}
            >
              {msgCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
