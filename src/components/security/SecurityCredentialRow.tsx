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
        minHeight: 62,
        borderWidth: 1,
        borderColor: COLORS.strokeWeak,
        borderRadius: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.card,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text
          style={TYPE.label}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[TYPE.bodySmall, { marginTop: 3 }]}
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
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trash2 size={21} color={COLORS.textBase} />
        </TouchableOpacity>
      )}
    </View>
  );
});
