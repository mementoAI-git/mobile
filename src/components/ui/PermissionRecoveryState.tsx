import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, ms, responsiveSpace } from '@/constants/responsive';

type PermissionRecoveryTone = 'light' | 'dark';

interface PermissionRecoveryStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tone?: PermissionRecoveryTone;
}

export function PermissionRecoveryState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  tone = 'light',
}: PermissionRecoveryStateProps) {
  const isDark = tone === 'dark';

  const handleAction = useCallback(() => {
    Haptics.selectionAsync();
    onAction();
  }, [onAction]);

  const handleSecondary = useCallback(() => {
    Haptics.selectionAsync();
    onSecondary?.();
  }, [onSecondary]);

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, isDark ? styles.darkIconWrap : styles.lightIconWrap]}>
        <Icon
          size={iconSize(34)}
          color={isDark ? COLORS.textInverse : COLORS.brand}
          strokeWidth={1.9}
        />
      </View>

      <Text style={[styles.title, { color: isDark ? COLORS.textInverse : COLORS.textStrong }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: isDark ? 'rgba(255,255,255,0.68)' : COLORS.textBase }]}>
        {description}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleAction} activeOpacity={0.86} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{actionLabel}</Text>
        </TouchableOpacity>

        {secondaryLabel && onSecondary ? (
          <TouchableOpacity
            onPress={handleSecondary}
            activeOpacity={0.82}
            style={[styles.secondaryButton, isDark ? styles.darkSecondaryButton : styles.lightSecondaryButton]}
          >
            <Text style={[styles.secondaryText, { color: isDark ? COLORS.textInverse : COLORS.textBase }]}>
              {secondaryLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveSpace(30),
    paddingVertical: responsiveSpace(32),
  },
  iconWrap: {
    width: ms(74, 0.25),
    height: ms(74, 0.25),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: responsiveSpace(18),
  },
  lightIconWrap: {
    backgroundColor: COLORS.brandSubtle,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  darkIconWrap: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  title: {
    ...TYPE.screenTitle,
    textAlign: 'center',
  },
  description: {
    marginTop: responsiveSpace(8),
    ...TYPE.body,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    marginTop: responsiveSpace(24),
    gap: responsiveSpace(10),
  },
  primaryButton: {
    minHeight: minTouchTarget(52),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand,
    paddingHorizontal: responsiveSpace(24),
  },
  primaryText: {
    ...TYPE.button,
    color: COLORS.textInverse,
  },
  secondaryButton: {
    minHeight: minTouchTarget(48),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveSpace(20),
  },
  lightSecondaryButton: {
    backgroundColor: COLORS.fillWeaker,
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
  },
  darkSecondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryText: {
    ...TYPE.buttonSmall,
  },
});
