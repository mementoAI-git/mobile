import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import X from 'lucide-react-native/icons/x';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius, responsiveSpace } from '@/constants/responsive';

interface RecordingStatusProps {
  seconds?: number;
  label?: string;
  compact?: boolean;
  onCancel?: () => void;
  style?: StyleProp<ViewStyle>;
}

function formatDuration(seconds = 0): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remaining = whole % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

export function RecordingStatus({
  seconds,
  label,
  compact,
  onCancel,
  style,
}: RecordingStatusProps) {
  const display = label ?? formatDuration(seconds);

  return (
    <View style={[styles.root, compact && styles.compact, style]}>
      <View style={styles.pulse}>
        <View style={styles.pulseDot} />
      </View>
      <Text style={styles.text}>Listening · {display}</Text>
      {onCancel ? (
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.78}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Discard recording"
          style={styles.cancelButton}
        >
          <X size={iconSize(13)} color={COLORS.textBase} strokeWidth={2.4} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: responsiveSpace(8),
    minHeight: 28,
    paddingLeft: responsiveSpace(10),
    paddingRight: responsiveSpace(8),
    borderRadius: radius(14),
    backgroundColor: COLORS.brandSubtle,
    borderWidth: 1,
    borderColor: `${COLORS.brand}20`,
  },
  compact: {
    marginTop: 4,
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandSubtle,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.brand,
  },
  text: {
    ...TYPE.metadata,
    color: COLORS.textBase,
  },
  cancelButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
  },
});
