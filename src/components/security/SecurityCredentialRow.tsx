import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';

interface SecurityCredentialRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  onDelete?: () => void;
}

export const SecurityCredentialRow = React.memo(function SecurityCredentialRow({
  icon,
  title,
  subtitle,
  onDelete,
}: SecurityCredentialRowProps) {
  return (
    <View
      style={{
        minHeight: 64,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: COLORS.fillWeaker,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...TYPE.body, color: COLORS.textStrong }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 2 }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${COLORS.error}10`,
          }}
        >
          <Trash2 size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </View>
  );
});
