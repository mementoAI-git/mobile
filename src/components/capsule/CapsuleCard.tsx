import React from 'react';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { ICapsule } from '@/types';
import { Badge } from '@/components/ui';
import { MoreVertical, Calendar, Users, Play, Mic, FileText } from 'lucide-react-native';
import { useUiStore } from '@/store';
import { COLORS, FONTS } from '@/constants/tokens';
import { getThemeById, getThemeByColor } from '@/constants/themes';
import { cn } from '@/lib/utils';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

interface CapsuleCardProps {
  capsule: ICapsule;
  onPress?: () => void;
  layoutMode?: 'grid' | 'list';
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  scheduled: 'info',
  delivered: 'success',
  failed: 'error',
  pause: 'warning',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  delivered: 'Delivered',
  failed: 'Failed',
  pause: 'Paused',
};

export const CapsuleCard = React.memo(function CapsuleCard({ capsule, onPress, layoutMode = 'grid' }: CapsuleCardProps) {
  const cardScale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const getExtension = (url?: string) => {
    if (!url) return '';
    return url.split('.').pop()?.toLowerCase() || '';
  };

  const isImage = (type?: string, url?: string) => {
    if (type) return type.startsWith('image/');
    const ext = getExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || !ext;
  };

  const isVideo = (type?: string, url?: string) => {
    if (type) return type.startsWith('video/');
    const ext = getExtension(url);
    return ['mp4', 'mov', 'webm', 'ogg'].includes(ext);
  };

  const isAudio = (type?: string, url?: string) => {
    if (type) return type.startsWith('audio/');
    const ext = getExtension(url);
    return ['mp3', 'wav', 'm4a'].includes(ext);
  };

  const renderAttachmentIcon = (type?: string, url?: string) => {
    if (isVideo(type, url)) {
      return <Play size={14} color={COLORS.brand} />;
    }
    if (isAudio(type, url)) {
      return <Mic size={14} color={COLORS.brand} />;
    }
    return <FileText size={14} color={COLORS.brand} />;
  };

  // Helper for "Due in" logic (parity with web)
  const getDueInText = () => {
    if (capsule.status === 'draft' || !capsule?.schedule_date) return 'Due in: Undefined';

    if (capsule.status === 'delivered' || dayjs(capsule.schedule_date).isBefore(dayjs())) {
      return 'Delivered';
    }

    const now = dayjs();
    const scheduleDate = dayjs(capsule.schedule_date);
    const diffInHours = scheduleDate.diff(now, 'hour');

    if (diffInHours < 24) {
      const hours = scheduleDate.diff(now, 'hour');
      const minutes = scheduleDate.diff(now.add(hours, 'hour'), 'minute');
      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours === 0) parts.push(`${minutes}m`);
      return `Due in: ${parts.join(' ')}`;
    }

    const years = scheduleDate.diff(now, 'year');
    const months = scheduleDate.diff(now.add(years, 'year'), 'month');
    const days = scheduleDate.diff(now.add(years, 'year').add(months, 'month'), 'day');

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (days > 0 && years === 0) parts.push(`${days}d`);

    return `Due in: ${parts.join(' ') || '0d'}`;
  };

  const attachments = [
    ...(capsule.attachments || []),
    ...(capsule.memories?.flatMap(m => m.attachments || []) || [])
  ];

  if (layoutMode === 'list') {
    return (
      <View className="mb-6">
        <Animated.View
          style={[animStyle]}
          className="bg-fill-weaker rounded-[24px] border border-stroke-weaker gap-3"
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              onPress?.();
            }}
            onPressIn={() => { cardScale.value = withSpring(0.98); }}
            onPressOut={() => { cardScale.value = withSpring(1); }}
            activeOpacity={0.95}
            className="bg-white rounded-[22px] overflow-hidden border border-stroke-weaker"
          >
            <View className="p-3 flex-row gap-3">
              {/* Left side: Single Attachment Thumbnail */}
              <View 
                className="rounded-xl bg-fill-weaker border border-stroke-weaker overflow-hidden items-center justify-center relative shrink-0"
                style={{ width: scale(96), height: scale(96) }}
              >
                {(() => {
                  const firstImg: any = attachments.find((attr: any) => isImage(attr.type, attr.url) && ((attr as any).thumbnail || attr.url));
                  const firstNonImg: any = attachments.find((attr: any) => !isImage(attr.type, attr.url));
 
                  if (firstImg) {
                    return (
                      <Image
                        source={{ uri: firstImg.thumbnail || firstImg.url }}
                        className="size-full"
                        resizeMode="cover"
                      />
                    );
                  } else if (firstNonImg) {
                    return renderAttachmentIcon(firstNonImg.type, firstNonImg.url);
                  } else {
                    return (
                      <Text 
                        className="text-text-muted italic" 
                        style={{ fontFamily: FONTS.sans, fontSize: moderateScale(10) }}
                      >
                        No Assets
                      </Text>
                    );
                  }
                })()}
              </View>
 
              {/* Right side: Content */}
              <View className="flex-1 gap-1.5 justify-between">
                <View className="flex-row items-center justify-between">
                  <Badge
                    label={statusLabels[capsule.status] ?? capsule.status}
                    variant={statusVariant[capsule.status] ?? 'default'}
                    className="px-2 py-0.5 rounded-full scale-90 origin-left"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      useUiStore.getState().openSheet('capsule-actions', { capsule });
                    }}
                    hitSlop={15}
                    className="items-center justify-center"
                    style={{ width: scale(24), height: scale(24) }}
                  >
                    <MoreVertical size={scale(14)} color={COLORS.textWeak} />
                  </TouchableOpacity>
                </View>
 
                <View>
                  <Text
                    className="text-text-strong font-medium"
                    numberOfLines={1}
                    style={{ fontFamily: FONTS.serif, fontSize: moderateScale(16) }}
                  >
                    {capsule.title || 'Untitled Capsule'}
                  </Text>
                  <Text
                    className="text-text-weak leading-tight"
                    numberOfLines={2}
                    style={{ fontFamily: FONTS.sans, fontSize: moderateScale(10) }}
                  >
                    {capsule.body || 'No message content...'}
                  </Text>
                </View>
 
                {/* Compact Info Footer */}
                <View className="bg-fill-weaker rounded-lg p-2 gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-text-weak" style={{ fontFamily: FONTS.sans, fontSize: moderateScale(8) }}>To:</Text>
                    <View className="flex-row items-center gap-1">
                      {(capsule.recipients ?? []).slice(0, 1).map((r: any, i) => (
                        <Text 
                          key={i} 
                          className="text-text-strong font-medium" 
                          style={{ fontFamily: FONTS.sansMedium, fontSize: moderateScale(10) }} 
                          numberOfLines={1}
                        >
                          {r.first_name || r.email?.split('@')[0]}
                        </Text>
                      ))}
                      {capsule.recipients?.length > 1 && (
                        <Text className="text-text-weak" style={{ fontFamily: FONTS.sans, fontSize: moderateScale(9) }}>
                          +{capsule.recipients.length - 1}
                        </Text>
                      )}
                    </View>
                  </View>
 
                  <View className="flex-row items-center justify-between">
                    <Text className="text-text-weak" style={{ fontFamily: FONTS.sans, fontSize: moderateScale(8) }}>Due:</Text>
                    <Text 
                      className="text-text-strong" 
                      style={{ fontFamily: FONTS.sansMedium, fontSize: moderateScale(10) }}
                    >
                      {capsule.schedule_date ? dayjs(capsule.schedule_date).format('MMM D, YYYY') : 'No date'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
 
          <Text 
            className="text-center font-medium text-text-strong mt-1 p-1" 
            style={{ fontFamily: FONTS.sansMedium, fontSize: moderateScale(14) }}
          >
            {getDueInText()}
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="mb-6">
      <Animated.View
        style={[animStyle]}
        className="bg-fill-weaker rounded-[24px] border border-stroke-weaker gap-3"
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            onPress?.();
          }}
          onPressIn={() => { cardScale.value = withSpring(0.98); }}
          onPressOut={() => { cardScale.value = withSpring(1); }}
          activeOpacity={0.95}
          className="bg-white rounded-[22px] overflow-hidden border border-stroke-weaker shadow-sm"
        >
          <View className="p-4 gap-3">
            {/* Header: Status + Actions */}
            <View className="flex-row items-center justify-between">
              <Badge
                label={statusLabels[capsule.status] ?? capsule.status}
                variant={statusVariant[capsule.status] ?? 'default'}
                className="px-2.5 py-0.5 rounded-full"
              />
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  useUiStore.getState().openSheet('capsule-actions', { capsule });
                }}
                hitSlop={15}
                className="size-7 items-center justify-center"
              >
                <MoreVertical size={16} color={COLORS.textWeak} />
              </TouchableOpacity>
            </View>

            {/* Title & Body */}
            <View>
              <Text
                className="text-lg text-text-strong font-medium mb-1"
                numberOfLines={1}
                style={{ fontFamily: FONTS.serif }}
              >
                {capsule.title || 'Untitled Capsule'}
              </Text>
              <Text
                className="text-text-weak leading-relaxed border-t border-fill-weaker pt-2"
                numberOfLines={2}
                style={{ fontFamily: FONTS.sans, fontSize: moderateScale(12) }}
              >
                {capsule.body || 'No message content...'}
              </Text>
            </View>
 
            {/* Attachment Strip (Parity with Web ImageThumbnail) */}
            <View 
              className="flex-row items-center gap-1.5 overflow-hidden"
              style={{ height: scale(40) }}
            >
              {attachments.length > 0 ? (
                attachments.slice(0, 4).map((attr: any, idx) => {
                  const showImage = isImage(attr.type, attr.url) && ((attr as any).thumbnail || attr.url);
                  const isLastVisible = idx === 3;
                  const showOverlay = isLastVisible && attachments.length > 4;
                  return (
                    <View
                      key={attr._id || idx}
                      className="rounded-lg bg-fill-weaker border border-stroke-weaker overflow-hidden items-center justify-center relative"
                      style={{ width: scale(40), height: scale(40) }}
                    >
                      {showImage ? (
                        <Image
                          source={{ uri: (attr as any).thumbnail || attr.url }}
                          className="size-full"
                          resizeMode="cover"
                        />
                      ) : (
                        renderAttachmentIcon(attr.type, attr.url)
                      )}
                      {showOverlay && (
                        <View className="absolute inset-0 bg-black/50 items-center justify-center">
                          <Text 
                            className="text-white font-bold" 
                            style={{ fontSize: moderateScale(10) }}
                          >
                            +{attachments.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View className="h-10 justify-center">
                  <Text className="text-[10px] text-text-muted italic" style={{ fontFamily: FONTS.sans }}>No Assets</Text>
                </View>
              )}
            </View>

            {/* Recipients & Info Footer */}
            <View className="bg-fill-weaker rounded-xl p-3 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] text-text-weak" style={{ fontFamily: FONTS.sans }}>To:</Text>
                <View className="flex-row items-center gap-1.5">
                  {(capsule.recipients ?? []).slice(0, 1).map((r: any, i) => (
                    <View key={i} className="flex-row items-center gap-1.5">
                      <View className="size-5 rounded-full bg-fill-weak items-center justify-center">
                        <Text className="text-[10px] font-bold">
                          {(r.first_name || r.email || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <Text className="text-xs text-text-strong font-medium" style={{ fontFamily: FONTS.sansMedium }}>
                        {r.first_name || r.email?.split('@')[0]}
                      </Text>
                    </View>
                  ))}
                  {capsule.recipients?.length > 1 && (
                    <Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sans }}>
                      +{capsule.recipients.length - 1} other
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] text-text-weak" style={{ fontFamily: FONTS.sans }}>Due Date:</Text>
                <View className="flex-row items-center gap-1">
                  <Calendar size={12} color={COLORS.textWeak} />
                  <Text className="text-xs text-text-strong" style={{ fontFamily: FONTS.sansMedium }}>
                    {capsule.schedule_date ? dayjs(capsule.schedule_date).format('MMM D, YYYY') : 'No date'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <Text className="text-center text-sm font-medium text-text-strong mt-1 p-1" style={{ fontFamily: FONTS.sansMedium }}>
          {getDueInText()}
        </Text>
      </Animated.View>
    </View>
  );
});
