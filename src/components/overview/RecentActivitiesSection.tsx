import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '@/constants/tokens';
import { Skeleton } from '@/components/ui/Skeleton';
import { Svg, Path } from 'react-native-svg';
import { ZapIconWarm } from '@/components/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import type { Activity } from '@/hooks/queries/use-activities';

// ── Deterministic color seeding ────────────────────────────────────────────
// Picks a stable accent color from activity._id so the list looks visually
// varied even when all items share the same type.
const ACCENT_COLORS = [
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#10B981', // emerald
  '#EC4899', // pink
  '#8B5CF6', // violet
];

function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getAccentColor(id: string): string {
  return ACCENT_COLORS[stableHash(id) % ACCENT_COLORS.length];
}

// ── Icon shapes by type ────────────────────────────────────────────────────

function FolderIcon({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Folder body (30% opacity tint) */}
      <Path
        d="M26.426 8a2.667 2.667 0 0 1 2.63 3.105L26.834 24.44a2.667 2.667 0 0 1-2.63 2.228H7.796a2.667 2.667 0 0 1-2.631-2.228L2.944 11.105A2.667 2.667 0 0 1 5.573 8h20.853Z"
        fill={color}
        opacity={0.3}
      />
      {/* Folder tab */}
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
      {/* Bubble body (30% opacity tint) */}
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.667 8a4 4 0 0 1 4-4h18.667a4 4 0 0 1 4 4v13.333a4 4 0 0 1-4 4H9.778l-4.444 3.334c-1.099.824-2.667.04-2.667-1.334V8Z"
        fill={color}
        opacity={0.3}
      />
      {/* Lines */}
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

// ── Type + title → icon mapping ──────────────────────────────────────────
// The API currently sets type="memory" for ALL activities regardless of subtype.
// Use the title field as a secondary signal to get the right icon shape.
type IconShape = 'folder' | 'chat' | 'zap' | 'hourglass';

function getIconShape(type?: string, title?: string): IconShape {
  const t = title?.toLowerCase() ?? '';
  const ty = type?.toLowerCase() ?? '';

  // Title-based overrides (more specific than the generic type)
  if (t.includes('quick capture') || t.includes('quick_capture')) return 'zap';
  if (t.includes('capsule')) return 'hourglass';
  if (t.includes('chat') || t.includes('conversation') || t.includes('message')) return 'chat';

  // Type fallback
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

function ActivityIcon({ type, title, id, size = 36 }: { type?: string; title?: string; id: string; size?: number }) {
  const color = getAccentColor(id);
  const shape = getIconShape(type, title);
  switch (shape) {
    case 'folder': return <FolderIcon color={color} size={size} />;
    case 'zap': return <ZapIconWarm size={size} color={color} />;
    case 'hourglass': return <HourglassIcon color={color} size={size} />;
    default: return <ChatBubbleIcon color={color} size={size} />;
  }
}

// ── Description sanitisation ─────────────────────────────────────────────
// When the backend stores a raw ObjectId as the subject (e.g. Quick capture: "6a279d…")
// it means the memory title wasn't resolved yet. Fall back to the activity title.
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

function sanitiseDescription(description: string, title?: string): string {
  // Match patterns like: 'Quick capture: "6a279d40bcc4088609256d5e"'
  const match = description.match(/^(.+?):\s*"([^"]+)"$/);
  if (match) {
    const subject = match[2];
    // If the quoted value looks like a raw ObjectId, use the title or the prefix only
    if (OBJECT_ID_RE.test(subject)) {
      return title || match[1].trim();
    }
  }
  return description;
}

// ── Date formatting ───────────────────────────────────────────────────────
const formatActivityDate = (date: string) => {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, 'day')) return `Today · ${d.format('h:mm A')}`;
  if (d.isSame(now.subtract(1, 'day'), 'day')) return `Yesterday · ${d.format('h:mm A')}`;
  if (d.isAfter(now.subtract(7, 'day'))) return `${now.diff(d, 'day')} days ago · ${d.format('h:mm A')}`;
  return `${d.format('MMM D')} · ${d.format('h:mm A')}`;
};

// ── Component ─────────────────────────────────────────────────────────────
interface Props {
  activities: Activity[];
  isLoading: boolean;
}

export function RecentActivitiesSection({ activities, isLoading }: Props) {
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="gap-4">
        <Skeleton className="h-8 w-40 ml-1 rounded-full" />
        <View className="bg-white border border-stroke-weaker rounded-[32px] p-2">
          {[1, 2, 3].map((i) => (
            <View key={i} className="flex-row items-center gap-4 p-4">
              <Skeleton className="size-11 rounded-2xl" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-full rounded-full" />
                <Skeleton className="h-3 w-20 rounded-full" />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!activities || activities.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(300)} className="gap-4">
      <View className="flex-row items-center justify-between px-1">
        <Animated.Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
          Recent <Animated.Text className="text-text-weak italic">Activities</Animated.Text>
        </Animated.Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/stories')} activeOpacity={0.7}>
          <Animated.Text className="text-sm text-brand font-semibold" style={{ fontFamily: FONTS.sansSemi }}>See all</Animated.Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white border border-stroke-weaker rounded-[32px] overflow-hidden">
        {activities.map((activity, index) => {
          const accentColor = getAccentColor(activity._id);
          return (
            <React.Fragment key={activity._id || index}>
              {index > 0 && (
                <View style={{ height: 1, backgroundColor: COLORS.strokeWeaker, marginHorizontal: 20 }} />
              )}
              <View className="flex-row items-center gap-4 p-5">
                {/* Icon container with a very light tint of the accent color */}
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: accentColor + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ActivityIcon type={activity.type} title={activity.title} id={activity._id} size={26} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Animated.Text
                    className="text-[15px] text-text-strong leading-tight"
                    style={{ fontFamily: FONTS.sansMedium }}
                    numberOfLines={2}
                  >
                    {sanitiseDescription(activity.description, activity.title)}
                  </Animated.Text>
                  <Animated.Text
                    className="text-[11px] text-text-weak uppercase tracking-widest"
                    style={{ fontFamily: FONTS.sansBold, opacity: 0.55 }}
                  >
                    {formatActivityDate(activity.created_at)}
                  </Animated.Text>
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </Animated.View>
  );
}
