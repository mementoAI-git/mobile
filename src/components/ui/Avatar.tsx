import React from 'react';
import { View, Text, Image } from 'react-native';
import { cn, getInitials } from '@/lib/utils';
import { FONTS } from '@/constants/tokens';
import { resolveFileUrl } from '@/features/account/profile-form';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Matches web avatar.tsx:
//   rounded-full overflow-hidden
//   size-8 (default) / size-6 (sm) / size-10 (lg)
//   Fallback: bg-muted (fill-weak) text-muted-foreground (text-base)
//   Border: border border-stroke-weaker (web: after:border after:border-border)
const sizeMap = {
  xs: { container: 'w-6 h-6',   text: 'text-[10px]' },
  sm: { container: 'w-8 h-8',   text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-base' },
  xl: { container: 'w-20 h-20', text: 'text-xl' },
};

export function Avatar({ uri, name, size = 'md', className }: AvatarProps) {
  const s = sizeMap[size];
  const initials = name ? getInitials(name) : '?';
  const resolvedUri = resolveFileUrl(uri);

  return (
    <View
      className={cn(
        'rounded-full overflow-hidden items-center justify-center',
        'bg-fill-weak border border-stroke-weaker',
        s.container,
        className,
      )}
    >
      {resolvedUri ? (
        <Image source={{ uri: resolvedUri }} className="w-full h-full" resizeMode="cover" />
      ) : (
        <Text
          className={cn('font-medium text-text-base', s.text)}
          style={{ fontFamily: FONTS.sansMedium }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
