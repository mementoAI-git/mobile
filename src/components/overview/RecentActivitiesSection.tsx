import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONTS } from '@/constants/tokens';
import { Skeleton } from '@/components/ui/Skeleton';
import { Clock } from 'lucide-react-native';
import { Svg, Path } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';

interface ActivityItem {
  _id: string;
  description: string;
  created_at: string;
  type?: string;
}

interface Props {
  activities: ActivityItem[];
  isLoading: boolean;
}

function RecentActivityIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        opacity={0.3}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.66699 8C2.66699 6.93913 3.08842 5.92172 3.83857 5.17157C4.58871 4.42143 5.60613 4 6.66699 4H25.3337C26.3945 4 27.4119 4.42143 28.1621 5.17157C28.9122 5.92172 29.3337 6.93913 29.3337 8V21.3333C29.3337 22.3942 28.9122 23.4116 28.1621 24.1618C27.4119 24.9119 26.3945 25.3333 25.3337 25.3333H9.77766L5.33366 28.6667C4.23499 29.4907 2.66699 28.7067 2.66699 27.3333V8Z"
        fill="#1DA1FF"
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.6663 15.9998C10.3127 15.9998 9.97358 16.1403 9.72353 16.3904C9.47348 16.6404 9.33301 16.9795 9.33301 17.3332C9.33301 17.6868 9.47348 18.0259 9.72353 18.276C9.97358 18.526 10.3127 18.6665 10.6663 18.6665H14.6663C15.02 18.6665 15.3591 18.526 15.6091 18.276C15.8592 18.0259 15.9997 17.6868 15.9997 17.3332C15.9997 16.9795 15.8592 16.6404 15.6091 16.3904C15.3591 16.1403 15.02 15.9998 14.6663 15.9998H10.6663ZM9.33301 11.9998C9.33301 11.6462 9.47348 11.3071 9.72353 11.057C9.97358 10.807 10.3127 10.6665 10.6663 10.6665H21.333C21.6866 10.6665 22.0258 10.807 22.2758 11.057C22.5259 11.3071 22.6663 11.6462 22.6663 11.9998C22.6663 12.3535 22.5259 12.6926 22.2758 12.9426C22.0258 13.1927 21.6866 13.3332 21.333 13.3332H10.6663C10.3127 13.3332 9.97358 13.1927 9.72353 12.9426C9.47348 12.6926 9.33301 12.3535 9.33301 11.9998Z"
        fill="#1DA1FF"
      />
    </Svg>
  );
}

const formatActivityDate = (date: string) => {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, 'day')) return 'Today';
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Yesterday';
  if (d.isAfter(now.subtract(7, 'day'))) return `${now.diff(d, 'day')} days ago`;
  return d.format('MMM D');
};

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
        {activities.map((activity, index) => (
          <React.Fragment key={activity._id || index}>
            {index > 0 && (
              <View className="h-px mx-5" />
            )}
            <View className="flex-row items-center gap-4 p-5">
              <View className="size-11 items-center justify-center shrink-0">
                <RecentActivityIcon size={36} />
              </View>
              <View className="flex-1 gap-1">
                <Animated.Text
                  className="text-[15px] text-text-strong leading-tight"
                  style={{ fontFamily: FONTS.sansMedium }}
                  numberOfLines={2}
                >
                  {activity.description}
                </Animated.Text>
                <View className="flex-row items-center gap-1.5 opacity-60">
                  {/* <Clock size={10} color={COLORS.textWeak} /> */}
                  <Animated.Text className="text-[10px] text-text-weak font-bold uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>
                    {formatActivityDate(activity.created_at)}
                  </Animated.Text>
                </View>
              </View>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Animated.View>
  );
}
