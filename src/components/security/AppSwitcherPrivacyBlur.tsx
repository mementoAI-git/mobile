import React, { useEffect, useState } from 'react';
import { AppState, View, StyleSheet, Text, ImageBackground, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useVaultLockStore } from '@/features/security/vault-lock.store';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');
const LOGO = require('../../../assets/images/memento_flat.webp');

export function AppSwitcherPrivacyBlur() {
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const recordBackground = useVaultLockStore((s) => s.recordBackground);
  const checkResumeLock = useVaultLockStore((s) => s.checkResumeLock);
  const initialize = useVaultLockStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'inactive' || nextState === 'background') {
        setIsBackgrounded(true);
        recordBackground();
      } else if (nextState === 'active') {
        checkResumeLock();
        setIsBackgrounded(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkResumeLock, recordBackground]);

  if (!isBackgrounded) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
      <ImageBackground source={PATTERN} style={[StyleSheet.absoluteFill, { opacity: 0.04 }]} resizeMode="repeat" />
      <View style={styles.content}>
        <Image source={LOGO} style={{ width: 64, height: 64, marginBottom: 12 }} resizeMode="contain" />
        <Text style={[TYPE.cardTitle, styles.title]}>Memento Vault</Text>
        <Text style={[TYPE.metadata, styles.subtitle]}>PROTECTED & ENCRYPTED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(254, 251, 248, 0.65)',
  },
  content: {
    alignItems: 'center',
    gap: 8,
  },
  shieldBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.brandTint,
    borderWidth: 1,
    borderColor: 'rgba(233, 130, 70, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: COLORS.textStrong,
  },
  subtitle: {
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
});
