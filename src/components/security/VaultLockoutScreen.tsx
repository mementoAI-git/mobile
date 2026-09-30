import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { hs, radius } from '@/constants/responsive';
import { Button, Avatar } from '@/components/ui';
import { useVaultLockStore } from '@/features/security/vault-lock.store';
import { useUserStore } from '@/store';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

export function VaultLockoutScreen() {
  const isLocked = useVaultLockStore((s) => s.isLocked);
  const unlockVault = useVaultLockStore((s) => s.unlockVault);
  const user = useUserStore((s) => s.user);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (isLocked) {
      void handleUnlock();
    }
  }, [isLocked]);

  const handleUnlock = async () => {
    setIsAuthenticating(true);
    try {
      await unlockVault();
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isLocked) return null;

  const displayName = user?.first_name || user?.nickname || 'Friend';

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[StyleSheet.absoluteFill, styles.container]}
    >
      <ImageBackground source={PATTERN} style={[StyleSheet.absoluteFill, { opacity: 0.03 }]} resizeMode="repeat" />

      <View style={styles.card}>
        <Avatar uri={user?.picture_url} name={displayName} size="xl" />

        <Text style={[TYPE.sectionTitle, styles.title]}>
          Vault Locked
        </Text>

        <Text style={[TYPE.body, styles.subtitle]}>
          Welcome back, {displayName}. Authenticate to access your private memories.
        </Text>

        <Button
          variant="primary"
          size="lg"
          className="h-14 w-full mt-4"
          loading={isAuthenticating}
          onPress={() => void handleUnlock()}
        >
          Unlock Vault
        </Button>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 99998,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
  },
  lockBadge: {
    width: 36,
    height: 36,
    borderRadius: radius(18),
    backgroundColor: COLORS.brandTint,
    borderWidth: 1,
    borderColor: 'rgba(233, 130, 70, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    marginBottom: 16,
  },
  title: {
    color: COLORS.textStrong,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.textWeak,
    textAlign: 'center',
    marginBottom: 24,
  },
});
