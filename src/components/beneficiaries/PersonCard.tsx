import { useThemeColors } from '@/hooks/use-theme-colors';
import React, { memo } from 'react';
import { Text, View } from 'react-native';
import MoreHorizontal from 'lucide-react-native/icons/ellipsis';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { Avatar } from '@/components/ui';
import { TYPE } from '@/constants/typography';

/** Mirrors web person-card.tsx: avatar, bold name, dot-separated details, options button. */
export const PersonCard = memo(function PersonCard({
  name,
  email,
  user,
  details,
  onOptions,
}: {
  name: string;
  email: string;
  user?: { _id?: string; picture_url?: string; email?: string };
  details: string[];
  /** Omit for a read-only card (no options button), e.g. inside the person sheet. */
  onOptions?: () => void;
}) {
  const COLORS = useThemeColors();
  const label = name || email;
  return (
    <TouchableOpacity
      onPress={onOptions}
      disabled={!onOptions}
      activeOpacity={0.76}
      accessibilityRole={onOptions ? 'button' : undefined}
      accessibilityLabel={onOptions ? `Options for ${label}` : label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 20, backgroundColor: COLORS.settingsCard }}
    >
      {/* A clipped, outlined disc so pattern avatars always read as a full circle. */}
      <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.strokeWeak, backgroundColor: COLORS.fillWeak }}>
        <Avatar userId={user?._id} seed={user?.email || email} uri={user?.picture_url} name={label} size="lg" className="h-full w-full border-0" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ ...TYPE.profileName, color: COLORS.textStrong }}>{label}</Text>
        {details.length > 0 ? (
          <View style={{ marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 }}>
            {details.map((detail, index) => (
              <View key={detail} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {index > 0 ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textWeak }} /> : null}
                <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak }}>{detail}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {onOptions ? (
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <MoreHorizontal size={20} color={COLORS.textStrong} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
});
