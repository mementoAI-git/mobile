import { useThemeColors } from '@/hooks/use-theme-colors';
/**
 * ActivityListItem — shared card row used by both:
 *  - RecentActivitiesSection (overview)
 *  - app/settings/activities.tsx (full list)
 *
 * Includes seeded accent colors, icon shapes, description sanitisation,
 * and smart date formatting.
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Svg, Path } from 'react-native-svg';
import { ZapIconWarm } from '@/components/ui';
import Animated from 'react-native-reanimated';
import dayjs from 'dayjs';
import type { Activity } from '@/hooks/queries/use-activities';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';

// ── Deterministic color seeding ────────────────────────────────────────────

const ACCENT_COLORS = [
  COLORS.info,
  COLORS.warning,
  COLORS.success,
  COLORS.statPink,
  COLORS.statPurple,
];

function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getAccentColor(id: string): string {
  return ACCENT_COLORS[stableHash(id) % ACCENT_COLORS.length];
}

// ── Icon shapes ────────────────────────────────────────────────────────────

function FolderIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M26.426 8a2.667 2.667 0 0 1 2.63 3.105L26.834 24.44a2.667 2.667 0 0 1-2.63 2.228H7.796a2.667 2.667 0 0 1-2.631-2.228L2.944 11.105A2.667 2.667 0 0 1 5.573 8h20.853Z"
        fill={color}
        opacity={0.3}
      />
      <Path
        d="M24 4a1.333 1.333 0 1 1 0 2.667H8A1.333 1.333 0 0 1 8 4h16Z"
        fill={color}
      />
    </Svg>
  );
}

function ChatBubbleIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.667 8a4 4 0 0 1 4-4h18.667a4 4 0 0 1 4 4v13.333a4 4 0 0 1-4 4H9.778l-4.444 3.334c-1.099.824-2.667.04-2.667-1.334V8Z"
        fill={color}
        opacity={0.3}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.666 16a1.333 1.333 0 0 0 0 2.667h4a1.333 1.333 0 1 0 0-2.667h-4Zm-1.333-4a1.333 1.333 0 0 1 1.333-1.333h10.667a1.333 1.333 0 1 1 0 2.666H10.666A1.333 1.333 0 0 1 9.333 12Z"
        fill={color}
      />
    </Svg>
  );
}

function HourglassIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M8 4H24M8 28H24M10 4V10L16 16L10 22V28M22 4V10L16 16L22 22V28"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
      <Path
        d="M10 4H22V10L16 16L10 10V4Z"
        fill={color}
        opacity={0.2}
      />
    </Svg>
  );
}

// ── Type + title → icon mapping ────────────────────────────────────────────

type IconShape = 'folder' | 'chat' | 'zap' | 'hourglass';

export function getIconShape(type?: string, title?: string): IconShape {
  const t = title?.toLowerCase() ?? '';
  const ty = type?.toLowerCase() ?? '';

  if (t.includes('quick capture') || t.includes('quick_capture')) return 'zap';
  if (t.includes('capsule')) return 'hourglass';
  if (t.includes('chat') || t.includes('conversation') || t.includes('message')) return 'chat';

  switch (ty) {
    case 'memory':
    case 'story':
      return 'folder';
    case 'chat':
    case 'conversation':
    case 'message':
      return 'chat';
    case 'quick_capture':
    case 'quickcapture':
      return 'zap';
    case 'capsule':
      return 'hourglass';
    default:
      return 'folder';
  }
}

export function ActivityIcon({ type, title, id, size = 36 }: { type?: string; title?: string; id: string; size?: number }) {
  const color = getAccentColor(id);
  const shape = getIconShape(type, title);
  switch (shape) {
    case 'folder': return <FolderIcon color={color} size={size} />;
    case 'zap': return <ZapIconWarm size={size} color={color} />;
    case 'hourglass': return <HourglassIcon color={color} size={size} />;
    default: return <ChatBubbleIcon color={color} size={size} />;
  }
}

// ── Description sanitisation ───────────────────────────────────────────────

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export function sanitiseDescription(description: string, title?: string): string {
  const match = description.match(/^(.+?):\s*"([^"]+)"$/);
  if (match) {
    const subject = match[2];
    if (OBJECT_ID_RE.test(subject)) {
      return title || match[1].trim();
    }
  }
  return description;
}

// ── Date formatting ────────────────────────────────────────────────────────

export const formatActivityDate = (date: string) => {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, 'day')) return `Today · ${d.format('h:mm A')}`;
  if (d.isSame(now.subtract(1, 'day'), 'day')) return `Yesterday · ${d.format('h:mm A')}`;
  if (d.isAfter(now.subtract(7, 'day'))) return `${now.diff(d, 'day')} days ago · ${d.format('h:mm A')}`;
  return `${d.format('MMM D')} · ${d.format('h:mm A')}`;
};

// ── ActivityListItem ───────────────────────────────────────────────────────

interface ActivityListItemProps {
  activity: Activity;
  showDivider?: boolean;
  fromOverview?: boolean;
}

function isDeletedActivity(activity: Activity): boolean {
  return activity.action?.toLowerCase() === 'deleted'
    || activity.title?.toLowerCase().startsWith('deleted') === true;
}

export const ActivityListItem = React.memo(function ActivityListItem({ activity, showDivider = false, fromOverview = false }: ActivityListItemProps) {
  const COLORS = useThemeColors();
  const router = useRouter();
  const accentColor = getAccentColor(activity._id);
  const canOpenStory = Boolean(activity.reference) && !isDeletedActivity(activity);
  const handlePress = useCallback(() => {
    const reference = activity.reference;
    if (!canOpenStory || !reference) return;
    Haptics.selectionAsync();
    router.push({
      pathname: '/(tabs)/stories/[id]',
      params: { id: reference, ...(fromOverview ? { from: 'overview' } : {}) },
    });
  }, [activity.reference, canOpenStory, fromOverview, router]);

  return (
    <>
      {showDivider && (
        <View style={{ height: 1, backgroundColor: COLORS.strokeWeaker, marginHorizontal: 20 }} />
      )}
      <TouchableOpacity
        onPress={handlePress}
        disabled={!canOpenStory}
        activeOpacity={0.7}
        style={{
          minHeight: minTouchTarget(44),
          flexDirection: 'row',
          alignItems: 'center',
          gap: responsiveSpace(16),
          paddingVertical: responsiveSpace(14),
        }}
      >
        {/* Icon container */}
        <View style={{
          width: iconSize(40),
          height: iconSize(40),
          borderRadius: radius(12),
          backgroundColor: accentColor + '18',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ActivityIcon type={activity.type} title={activity.title} id={activity._id} size={iconSize(26)} />
        </View>

        {/* Text */}
        <View style={{ flex: 1, gap: 2 }}>
          <Animated.Text
            style={{ ...TYPE.body, color: COLORS.textStrong }}
            numberOfLines={1}
          >
            {sanitiseDescription(activity.description, activity.title)}
          </Animated.Text>
          <Animated.Text
            style={{ ...TYPE.metadata, color: COLORS.textWeak, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.55 }}
          >
            {formatActivityDate(activity.created_at)}
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </>
  );
});
