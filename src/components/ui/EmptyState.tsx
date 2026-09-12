import React from 'react';
import { View, Image, ImageSourcePropType, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  description: string;
  image?: ImageSourcePropType;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  image,
  icon: Icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center px-8 py-12', className)}>
      {image ? (
        <Image
          source={image}
          style={{ width: 240, height: 240, marginBottom: 24 }}
          resizeMode="contain"
        />
      ) : Icon ? (
        <View className="mb-6 p-6 rounded-full bg-fill-weaker">
          <Icon size={48} color={COLORS.textDisabled} strokeWidth={1.5} />
        </View>
      ) : null}

      <Animated.Text
        className="text-text-strong text-center mb-2"
        style={TYPE.cardTitle}
      >
        {title}
      </Animated.Text>

      <Animated.Text
        className="text-text-weak text-center mb-8"
        style={TYPE.bodySmall}
      >
        {description}
      </Animated.Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          className="bg-brand rounded-full px-8 py-3.5 shadow-sm"
        >
          <Animated.Text className="text-white" style={TYPE.button}>
            {actionLabel}
          </Animated.Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
