import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import Fingerprint from 'lucide-react-native/icons/fingerprint-pattern';
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


// On iPhone a passkey is created with Face ID and saved to iCloud Keychain, so we name it after Face ID.
const IS_IOS = Platform.OS === 'ios';
const FACE_ID_LABEL = IS_IOS ? 'Face ID sign-in' : 'Passkey';

function formatAddedDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SecuritySettingsScreen() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
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
      if (kind === 'duplicate') {
        setMessage(`${FACE_ID_LABEL} is already set up on this device.`);
      } else if (kind === 'unsupported' || kind === 'unavailable' || kind === 'configuration') {
        setFallbackOffered(true);
      } else {
        setMessage(`${FACE_ID_LABEL} setup couldn’t be completed. Try again.`);
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
              rounded="full"
              className="h-10 px-4"
              onPress={() => openSheet('change-password')}
            >
              Change
            </Button>
          </View>

          <View style={[styles.card, { marginTop: 24 }]}>
            <View style={styles.titleRow}>
              <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
                Two-factor authentication
              </Text>
              <View
                style={[styles.badge, { backgroundColor: twoFactor.is2FAEnabled ? COLORS.successFill : COLORS.errorFill }]}
              >
                <Text style={{ ...TYPE.metadata, color: twoFactor.is2FAEnabled ? COLORS.success : COLORS.error }}>
                  {twoFactor.is2FAEnabled ? 'On' : 'Off'}
                </Text>
              </View>
            </View>
            <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 6, lineHeight: 20 }}>
              {twoFactor.is2FAEnabled
                ? 'You’ll enter a code from your authenticator app when you sign in on a new device.'
                : 'Add a verification step each time you try to sign in on a new device.'}
            </Text>
            {twoFactor.is2FAEnabled ? (
              <Button
                variant="secondary"
                size="md"
                className="mt-4 h-11 self-start"
                loading={twoFactor.loading}
                onPress={twoFactor.handleDisable}
              >
                Turn off 2FA
              </Button>
            ) : (
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
            {twoFactor.error && !twoFactor.setupData ? (
              <Text style={{ ...TYPE.bodySmall, color: COLORS.error, marginTop: 10 }}>{twoFactor.error}</Text>
            ) : null}
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
            <View style={styles.titleRow}>
              <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
                {IS_IOS ? 'Face ID' : 'Passkeys'}
              </Text>
              {passkeys.length > 0 ? (
                <View style={[styles.badge, styles.brandBadge]}>
                  <Text style={{ ...TYPE.metadata, color: COLORS.brand }}>{passkeys.length} added</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 6, lineHeight: 20 }}>
              {IS_IOS
                ? 'Sign in with Face ID instead of your password. It’s saved as a passkey in iCloud Keychain, so it works on your other Apple devices too.'
                : 'Sign in without a password using your fingerprint, face, or screen lock.'}
            </Text>
            <Button
              variant="secondary"
              size="md"
              className="mt-4 h-11 self-start"
              loading={registerPasskey.isPending}
              disabled={deletePasskey.isPending}
              onPress={handleAddPasskey}
            >
              {IS_IOS ? 'Set up Face ID' : 'Add a passkey'}
            </Button>

            {(passkeys.length > 0 || fallbackEnabled) && (
              <View style={{ gap: 10, marginTop: 14 }}>
                {passkeys.map((passkey, index) => {
                  const credentialId = passkey.credential_id || passkey.id || '';
                  const createdAt = formatAddedDate(passkey.created_at);
                  return (
                    <SecurityCredentialRow
                      key={credentialId || `passkey-${index}`}
                      icon={<Fingerprint size={22} color={COLORS.brand} />}
                      title={passkey.device_name || passkey.name || `${Platform.OS} passkey`}
                      subtitle={createdAt ? `Added ${createdAt}` : 'Passkey'}
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
                <Text style={{ ...TYPE.body, color: COLORS.textStrong }}>
                  {IS_IOS ? 'Use Face ID on this iPhone' : 'Passkeys aren’t available here'}
                </Text>
                <Text style={{ ...TYPE.bodySmall, color: COLORS.textWeak, marginTop: 4 }}>
                  {IS_IOS
                    ? 'We couldn’t save a passkey, but you can still sign in with Face ID on this iPhone.'
                    : 'You can still protect quick sign-in with your fingerprint or face on this device.'}
                </Text>
                <Button variant="secondary" size="md" className="mt-3 h-10 self-start" onPress={enableFallback}>
                  {IS_IOS ? 'Turn on Face ID' : 'Turn on biometric sign-in'}
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

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingTop: 16, paddingBottom: 48 },
  sectionHeaderBox: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  passwordRow: {
    minHeight: 56,
    borderRadius: 24,
    backgroundColor: COLORS.settingsCard,
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  brandBadge: { borderWidth: 1, borderColor: COLORS.brand },
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: COLORS.settingsCard,
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
    backgroundColor: COLORS.settingsCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
