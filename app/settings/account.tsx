import React, { useCallback, useEffect, useState } from 'react';
import {
  ImageBackground,
  Platform,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fingerprint, ShieldCheck } from 'lucide-react-native';
import { Passkey } from 'react-native-passkey';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Button, ResponsiveScreen } from '@/components/ui';
import { SettingsSubpageHeader } from '@/components/settings/SettingsSubpageHeader';
import { SecurityCredentialRow } from '@/components/security/SecurityCredentialRow';
import { TYPE } from '@/constants/typography';
import { COLORS } from '@/constants/tokens';
import { storageKeys } from '@/constants/storage-keys';
import { classifyPasskeyError } from '@/features/security/security-flow';
import {
  useDeletePasskey,
  useRegisterPasskey,
} from '@/hooks/mutations/use-passkey-mutations';
import { useLogoutOtherDevices } from '@/hooks/mutations/use-auth-mutations';
import { usePasskeys } from '@/hooks/queries/use-passkeys';
import { useTwoFactorSettingsLogic } from '@/hooks/use-two-factor-settings-logic';
import { useVaultLockStore } from '@/features/security/vault-lock.store';
import { useAuthStore, useUiStore, useUserStore } from '@/store';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const openSheet = useUiStore((state) => state.openSheet);
  const auth = useAuthStore((state) => state.token);
  const user = useUserStore((state) => state.user);
  const { data: passkeys = [] } = usePasskeys();
  const registerPasskey = useRegisterPasskey();
  const deletePasskey = useDeletePasskey();
  const logoutOtherDevices = useLogoutOtherDevices();
  const twoFactor = useTwoFactorSettingsLogic();
  const lockTimeoutMinutes = useVaultLockStore((state) => state.lockTimeoutMinutes);
  const setLockTimeout = useVaultLockStore((state) => state.setLockTimeout);
  const [fallbackOffered, setFallbackOffered] = useState(false);
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(storageKeys.biometricsEnabled).then((value) => {
      setFallbackEnabled(value === 'true');
    });
  }, []);

  useEffect(() => {
    if (twoFactor.setupData) {
      openSheet('setup-two-factor', { setupData: twoFactor.setupData });
    }
  }, [openSheet, twoFactor.setupData]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }, [router]);

  const handleAddPasskey = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessage(null);
    if (!Passkey.isSupported() || !NativeModules.Passkey) {
      setFallbackOffered(true);
      return;
    }
    try {
      await registerPasskey.mutateAsync();
      setFallbackEnabled(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const kind = classifyPasskeyError(error);
      if (kind === 'cancelled') return;
      if (kind === 'unsupported' || kind === 'unavailable') {
        setFallbackOffered(true);
      } else {
        setMessage('Passkey setup could not be completed. Check your credential provider and try again.');
      }
    }
  }, [registerPasskey]);

  const enableFallback = useCallback(async () => {
    const refreshToken = auth?.refresh_token;
    if (!refreshToken || !user?.email) {
      setMessage('Sign in again before enabling biometric fallback.');
      return;
    }
    try {
      await SecureStore.setItemAsync(
        storageKeys.biometricsRefreshToken,
        refreshToken,
        {
          requireAuthentication: true,
          authenticationPrompt: 'Enable biometric sign-in',
        },
      );
      await SecureStore.setItemAsync(storageKeys.biometricsEmail, user.email);
      await SecureStore.setItemAsync(storageKeys.biometricsEnabled, 'true');
      setFallbackEnabled(true);
      setFallbackOffered(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMessage('Biometric fallback could not be enabled on this device.');
    }
  }, [auth?.refresh_token, user?.email]);

  const requestDeletePasskey = useCallback((credentialId: string) => {
    openSheet('security-confirmation', {
      kind: 'delete-passkey',
      onConfirm: () => deletePasskey.mutateAsync(credentialId),
    });
  }, [deletePasskey, openSheet]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <SettingsSubpageHeader title="Security" onBack={handleBack} />

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0" style={{ opacity: 0.03 }} resizeMode="repeat" />
        <ResponsiveScreen maxWidth={720}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.sectionHeaderBox}>
            <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Password</Text>
          </View>
          <View style={styles.passwordRow}>
            <Text style={styles.passwordDots}>••••••••</Text>
            <Button
              variant="secondary"
              size="sm"
              className="h-10 px-4"
              onPress={() => openSheet('change-password')}
            >
              Change
            </Button>
          </View>

          <View style={[styles.card, { marginTop: 24 }]}>
            <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
              Two-factor authentication
            </Text>
            <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 6, lineHeight: 20 }}>
              Add a verification step each time you try to sign in on a new device.
            </Text>
            {!twoFactor.is2FAEnabled && (
              <Button
                variant="secondary"
                size="md"
                className="mt-4 h-11 self-start"
                loading={twoFactor.loading}
                onPress={twoFactor.handleSetup}
              >
                Set up authenticator
              </Button>
            )}
            {twoFactor.is2FAEnabled && (
              <View style={{ marginTop: 14 }}>
                <SecurityCredentialRow
                  icon={<ShieldCheck size={22} color={COLORS.success} />}
                  title="2FA Setup"
                  subtitle="Authenticator enabled"
                  onDelete={() => openSheet('security-confirmation', {
                    kind: 'disable-two-factor',
                    onConfirm: twoFactor.disableNow,
                  })}
                />
              </View>
            )}
          </View>

          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={{ ...TYPE.body, color: COLORS.textStrong, marginBottom: 4 }}>
              Vault Lock (Face ID / Passcode)
            </Text>
            <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, lineHeight: 20 }}>
              Require biometric authentication when resuming the app after inactivity.
            </Text>

            <View className="flex-row flex-wrap gap-2 mt-4">
              {[
                { label: 'Off', minutes: -1 },
                { label: 'Immediate', minutes: 0 },
                { label: '1 min', minutes: 1 },
                { label: '5 mins', minutes: 5 },
                { label: '15 mins', minutes: 15 },
              ].map((option) => {
                const active = lockTimeoutMinutes === option.minutes;
                return (
                  <TouchableOpacity
                    key={option.minutes}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      void setLockTimeout(option.minutes);
                    }}
                    className={`px-3.5 py-2 rounded-full border ${
                      active
                        ? 'bg-brand/15 border-brand'
                        : 'bg-fill-weaker border-stroke-weaker'
                    }`}
                  >
                    <Text
                      style={{
                        ...TYPE.buttonSmall,
                        color: active ? COLORS.brand : COLORS.textBase,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
              Passkeys
            </Text>
            <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 6, lineHeight: 20 }}>
              Sign in without a password using Fingerprint, Face ID, or your device lock.
            </Text>
            <Button
              variant="secondary"
              size="md"
              className="mt-4 h-11 self-start"
              loading={registerPasskey.isPending}
              onPress={handleAddPasskey}
            >
              Add a Passkey
            </Button>

            {(passkeys.length > 0 || fallbackEnabled) && (
              <View style={{ gap: 10, marginTop: 14 }}>
                {passkeys.map((passkey, index) => {
                  const credentialId = passkey.credential_id || passkey.id || '';
                  const createdAt = passkey.created_at
                    ? new Date(passkey.created_at).toLocaleDateString('en-GB')
                    : null;
                  return (
                    <SecurityCredentialRow
                      key={credentialId || `passkey-${index}`}
                      icon={<Fingerprint size={22} color={COLORS.brand} />}
                      title={passkey.device_name || passkey.name || `${Platform.OS} passkey`}
                      subtitle={createdAt ? `Added ${createdAt}` : 'Native passkey'}
                      onDelete={credentialId ? () => requestDeletePasskey(credentialId) : undefined}
                    />
                  );
                })}

                {fallbackEnabled && (
                  <SecurityCredentialRow
                    icon={<Fingerprint size={22} color={COLORS.warning} />}
                    title="Biometric sign-in"
                    subtitle="This isn’t a passkey"
                    onDelete={() => openSheet('security-confirmation', {
                      kind: 'disable-biometric-fallback',
                      onConfirm: async () => {
                        await Promise.all([
                          SecureStore.deleteItemAsync(storageKeys.biometricsRefreshToken),
                          SecureStore.deleteItemAsync(storageKeys.biometricsEmail),
                          SecureStore.deleteItemAsync(storageKeys.biometricsEnabled),
                        ]);
                        setFallbackEnabled(false);
                      },
                    })}
                  />
                )}
              </View>
            )}

            {fallbackOffered && (
              <View style={styles.fallbackCard}>
                <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>Passkeys aren&apos;t available here</Text>
                <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 4 }}>
                  You can still protect quick sign-in with Face ID or Touch ID on this device.
                </Text>
                <Button variant="secondary" size="md" className="mt-3 h-10 self-start" onPress={enableFallback}>
                  Enable biometric fallback
                </Button>
              </View>
            )}
            {message && <Text style={{ ...TYPE.bodySmall, color: COLORS.error, marginTop: 10 }}>{message}</Text>}
          </View>

          <View style={styles.logoutAllCard}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
                Log out of all devices
              </Text>
              <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 2 }}>
                End all active sessions on other devices.
              </Text>
            </View>
            <Button
              variant="outline"
              size="md"
              className="h-11 px-5"
              onPress={() =>
                openSheet('security-confirmation', {
                  kind: 'logout-all-devices',
                  onConfirm: async () => {
                    await logoutOtherDevices.mutateAsync();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  },
                })
              }
              disabled={logoutOtherDevices.isPending}
            >
              Log out
            </Button>
          </View>
        </ScrollView>
        </ResponsiveScreen>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingTop: 16, paddingBottom: 48 },
  sectionHeaderBox: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  passwordRow: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    paddingLeft: 20,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordDots: {
    flex: 1,
    color: COLORS.textBase,
    ...TYPE.mono,
    letterSpacing: 4,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: COLORS.card,
  },
  fallbackCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    backgroundColor: COLORS.brandSubtle,
  },
  logoutAllCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
