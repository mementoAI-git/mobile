import React, { useMemo } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { enrichmentCategoryLabel, type JumpPill } from '@/constants/enrichment';
import { minTouchTarget, responsiveSpace } from '@/constants/responsive';
import type { IMessage } from '@/types';

interface HostChatJumpPillsProps {
  /** Month-keyed pills derived from message timestamps (YYYY-MM strings) */
  monthKeys?: string[];
  /** Category-based conversation starters from the API */
  categoryPills?: JumpPill[];
  /** Called when a month pill is tapped */
  onJump?: (yyyyMm: string) => void;
  /** Called when a category starter pill is tapped — sends the starter text */
  onCategoryPill?: (starter: string) => void;
}

/** Derive month keys (YYYY-MM) from messages — mirrors web monthKeysFromMessages */
export function monthKeysFromMessages(messages: { created_at?: string; role?: string }[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const msg of messages) {
    if (!msg.created_at) continue;
    const key = msg.created_at.slice(0, 7); // YYYY-MM
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

function formatMonthKey(yyyyMm: string): string {
  try {
    const [year, month] = yyyyMm.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch {
    return yyyyMm;
  }
}

/**
 * HostChatJumpPills — mirrors web's HostChatJumpPills component.
 * Horizontal scrollable row of:
 *  1. Month navigation pills (jump to a point in the conversation)
 *  2. Category conversation starter pills (from API jump_pills)
 */
export function HostChatJumpPills({
  monthKeys = [],
  categoryPills = [],
  onJump,
  onCategoryPill,
}: HostChatJumpPillsProps) {
  const hasPills = monthKeys.length > 0 || categoryPills.length > 0;
  if (!hasPills) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 4, paddingVertical: 2 }}
    >
      {/* Month navigation pills */}
      {monthKeys.map((key) => (
        <TouchableOpacity
          key={`month-${key}`}
          onPress={() => {
            Haptics.selectionAsync();
            onJump?.(key);
          }}
          activeOpacity={0.7}
          hitSlop={6}
          style={{ minHeight: minTouchTarget(32) }}
          className="border border-stroke-weaker bg-fill-weaker rounded-full px-3 py-1.5 justify-center"
        >
          <Text style={{ ...TYPE.metadata, color: COLORS.textBase }}>
            {formatMonthKey(key)}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Divider between month pills and category pills */}
      {monthKeys.length > 0 && categoryPills.length > 0 && (
        <View className="w-px self-stretch bg-stroke-weaker mx-1" />
      )}

      {/* Category starter pills */}
      {categoryPills.map((pill, i) => (
        <TouchableOpacity
          key={`cat-${i}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCategoryPill?.(pill.starter);
          }}
          activeOpacity={0.8}
          hitSlop={6}
          style={{ minHeight: minTouchTarget(32) }}
          className="flex-row items-center gap-1.5 bg-brand/5 border border-brand/15 rounded-full px-3 py-1.5 justify-center"
        >
          <Text style={{ ...TYPE.metadata, color: COLORS.brand }}>
            {enrichmentCategoryLabel(pill.category_key)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
