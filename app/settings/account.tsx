import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  NativeModules,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Fingerprint, ShieldCheck } from 'lucide-react-native';
import { Passkey } from 'react-native-passkey';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { SecurityCredentialRow } from '@/components/security/SecurityCredentialRow';
import { SETTINGS_TYPE } from '@/components/settings/settings-typography';
import { COLORS, FONTS } from '@/constants/tokens';
import { storageKeys } from '@/constants/storage-keys';
import { classifyPasskeyError } from '@/features/security/security-flow';
import {
  useDeletePasskey,
  useRegisterPasskey,
} from '@/hooks/mutations/use-passkey-mutations';
import { usePasskeys } from '@/hooks/queries/use-passkeys';
import { useTwoFactorSettingsLogic } from '@/hooks/use-two-factor-settings-logic';
import { useAuthStore, useUiStore, useUserStore } from '@/store';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const openSheet = useUiStore((state) => state.openSheet);
  const auth = useAuthStore((state) => state.token);
  const user = useUserStore((state) => state.user);
  const { data: passkeys = [] } = usePasskeys();
  const registerPasskey = useRegisterPasskey();
  const deletePasskey = useDeletePasskey();
  const twoFactor = useTwoFactorSettingsLogic();
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
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.78}>
          <ArrowLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
        <Text style={SETTINGS_TYPE.screenTitle}>Security</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={SETTINGS_TYPE.sectionTitle}>Password</Text>
        <View style={styles.passwordRow}>
          <Text style={styles.passwordDots}>********</Text>
          <Button
            variant="secondary"
            size="sm"
            className="h-9 px-3"
            onPress={() => openSheet('change-password')}
          >
            Change
          </Button>
        </View>

        <View style={styles.twoFactorCard}>
          <Text style={SETTINGS_TYPE.cardTitle}>Two-factor authentication</Text>
          <Text style={[SETTINGS_TYPE.body, { marginTop: 8 }]}>
            Add a verification step each time you try to sign in on a new device.
          </Text>
          {!twoFactor.is2FAEnabled && (
            <Button
              variant="secondary"
              size="lg"
              className="self-end mt-3 h-10"
              loading={twoFactor.loading}
              onPress={twoFactor.handleSetup}
            >
              Set up authenticator
            </Button>
          )}
          {twoFactor.is2FAEnabled && (
            <View style={{ marginTop: 10 }}>
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

        <View style={{ marginTop: 26 }}>
          <Text style={SETTINGS_TYPE.sectionTitle}>Passkeys</Text>
          <Text style={[SETTINGS_TYPE.body, { marginTop: 8 }]}>
            Sign in without a password using Fingerprint, Face ID, or your device lock.
          </Text>
          <Button
            variant="secondary"
            size="lg"
            className="self-end mt-3 h-10"
            loading={registerPasskey.isPending}
            onPress={handleAddPasskey}
          >
            Add a Passkey
          </Button>

          <View style={{ gap: 12, marginTop: 12 }}>
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

          {fallbackOffered && (
            <View style={styles.fallbackCard}>
              <Text style={SETTINGS_TYPE.cardTitle}>Passkeys aren&apos;t available here</Text>
              <Text style={[SETTINGS_TYPE.supporting, { marginTop: 5 }]}>
                You can still protect quick sign-in with Face ID or Touch ID on this device.
              </Text>
              <Button variant="secondary" size="lg" className="mt-3 h-10" onPress={enableFallback}>
                Enable biometric fallback
              </Button>
            </View>
          )}
          {message && <Text style={[SETTINGS_TYPE.supporting, { color: COLORS.error, marginTop: 10 }]}>{message}</Text>}
        </View>

        <View style={styles.logoutAllRow}>
          <Text style={SETTINGS_TYPE.cardTitle}>Log out of all devices</Text>
          <Button
            variant="outline"
            size="lg"
            className="h-10"
            onPress={() => openSheet('security-confirmation', { kind: 'logout-all-devices' })}
          >
            Log out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.fillWeak,
  },
  content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 40 },
  passwordRow: {
    height: 40,
    marginTop: 9,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    borderRadius: 9,
    paddingLeft: 14,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordDots: {
    flex: 1,
    color: COLORS.textBase,
    fontFamily: FONTS.sans,
    fontSize: 24,
    letterSpacing: 3,
  },
  twoFactorCard: {
    borderRadius: 16,
    padding: 12,
    marginTop: 24,
    backgroundColor: COLORS.fillWeak,
  },
  fallbackCard: {
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    backgroundColor: COLORS.brandSubtle,
  },
  logoutAllRow: {
    minHeight: 64,
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
