import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { Avatar } from '@/components/ui/Avatar';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { avatarBadgeOffset, DIGITAL_MIND_COLOURS, type DigitalMindProfile } from '@/features/chat/digital-mind';

import { AVATAR_VIEWBOX, roundedAvatarPath } from '@/features/chat/friendly-avatar-shapes';

const MEMENTO_MARK = require('../../../assets/images/splash-cinematic/memento_mark.webp');
export function DigitalMindAvatar({ profile, size = 44, userImage, userName, userSeed, userId, badge = true }: {
  profile: DigitalMindProfile; size?: number; userImage?: string | null; userName?: string; userSeed?: string; userId?: string; badge?: boolean;
}) {
  const colors = useThemeColors();
  const preset = DIGITAL_MIND_COLOURS.find(colour => colour.id === profile.colour) ?? DIGITAL_MIND_COLOURS[0];
  const ink = colors[preset.token];
  // Small avatars (header, shape picker) scale the badge with them; large previews use 24.
  const markSize = size <= 44 ? Math.round(size * 0.36) : 24;
  const badgeSize = markSize + 4;
  const badgeOffset = avatarBadgeOffset(size, badgeSize);
  return <View accessible={false} style={{ width: size, height: size }}>
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.cardRaised }}>
      {profile.style === 'identicon' ? <Avatar uri={userImage} seed={userSeed} userId={userId} name={userName} size="xl" className="h-full w-full border-0" /> :
        <Svg width={size} height={size} viewBox={`0 0 ${AVATAR_VIEWBOX} ${AVATAR_VIEWBOX}`}>
          <Rect width={AVATAR_VIEWBOX} height={AVATAR_VIEWBOX} fill={ink} opacity={0.16} />
          <Path d={roundedAvatarPath(profile.style)} fill={ink} />
        </Svg>}
    </View>
    {badge && <View style={{ position: 'absolute', bottom: badgeOffset, right: badgeOffset, width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={MEMENTO_MARK} style={{ width: markSize, height: markSize }} resizeMode="contain" />
    </View>}
  </View>;
}
