import React from 'react';
import { View, Text, Image } from 'react-native';
import { cn, getInitials } from '@/lib/utils';
import { TYPE } from '@/constants/typography';
import { resolveFileUrl } from '@/features/account/profile-form';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  seed?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Matches web avatar.tsx:
//   rounded-full overflow-hidden
//   size-8 (default) / size-6 (sm) / size-10 (lg)
//   Fallback: bg-muted (fill-weak) text-muted-foreground (text-base)
//   Border: border border-stroke-weaker (web: after:border after:border-border)
const sizeMap = {
  xs: { container: 'w-6 h-6',   text: TYPE.eyebrow },
  sm: { container: 'w-8 h-8',   text: TYPE.metadata },
  md: { container: 'w-10 h-10', text: TYPE.label },
  lg: { container: 'w-12 h-12', text: TYPE.bodyLarge },
  xl: { container: 'w-20 h-20', text: TYPE.stat },
};

export function Avatar({ uri, name, seed, size = 'md', className }: AvatarProps) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const s = sizeMap[size];
  const initials = name ? getInitials(name) : '?';
  const resolvedUri = resolveFileUrl(uri);

  const avatarSeed = (seed || name || '').trim().toLowerCase();

  const fallbackUri =
    !resolvedUri && avatarSeed
      ? `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=fefbf8`
      : null;

  const effectiveUri = imageFailed ? null : resolvedUri || fallbackUri;

  return (
    <View
      className={cn(
        'rounded-full overflow-hidden items-center justify-center',
        'bg-fill-weak border border-stroke-weaker',
        s.container,
        className,
      )}
    >
      {effectiveUri ? (
        <Image
          source={{ uri: effectiveUri }}
          className="w-full h-full"
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text
          className="text-text-base"
          style={s.text}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
