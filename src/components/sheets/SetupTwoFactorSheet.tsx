import { toast } from '@/components/ui/Toast';
import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Button, TextInput } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { COLORS as LIGHT_COLORS } from '@/constants/tokens';
import { useTwoFactorSettingsLogic } from '@/hooks/use-two-factor-settings-logic';
import { getSheetBottomPadding, SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { SheetHeader } from './SheetHeader';
import { sanitizeTotpCode, type TwoFactorSetupData } from '@/features/security/two-factor-setup';

interface SetupTwoFactorSheetProps {
  setupData: TwoFactorSetupData;
  onClose?: () => void;
}

/** Mirrors web setup-2fa.tsx: choose an app, pair it (QR or setup key), enter the code. */
export function SetupTwoFactorSheet({
  setupData,
  onClose,
}: SetupTwoFactorSheetProps) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [manual, setManual] = useState(!setupData.qr_code);
  const twoFactor = useTwoFactorSettingsLogic();

  const complete = async () => {
    const success = await twoFactor.handleVerify();
    if (success) {
      toast('Two-factor authentication is on.', 'success');
      onClose?.();
    }
  };

  const copySecret = async () => {
    Haptics.selectionAsync();
    try {
      await Clipboard.setStringAsync(setupData.secret ?? '');
      toast('Setup key copied.', 'success');
    } catch {
      toast('We couldn’t copy the key. Please try again.', 'error');
    }
  };

  const pasteCode = async () => {
    Haptics.selectionAsync();
    try {
      twoFactor.setToken(sanitizeTotpCode(await Clipboard.getStringAsync()));
    } catch {
      toast('We couldn’t paste the code. Please try again.', 'error');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <SheetHeader title="Set up 2FA" onClose={() => onClose?.()} style={styles.header} />

      <BottomSheetScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}
      >
        <View style={styles.step}>
          <Text style={[TYPE.label, styles.stepTitle]}>1. Choose an authenticator</Text>
          <Text style={[TYPE.bodySmall, styles.copy]}>
            Use Google Authenticator, Authy, or another authenticator app.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={[TYPE.label, styles.stepTitle]}>2. Pair your app</Text>
          {manual ? (
            <>
              <Text style={[TYPE.bodySmall, styles.copy]}>Enter this key manually in your app.</Text>
              <TouchableOpacity
                onPress={copySecret}
                accessibilityRole="button"
                accessibilityLabel="Copy setup key"
                style={styles.codeRow}
              >
                <Text selectable numberOfLines={1} style={[TYPE.mono, styles.code]}>{setupData.secret}</Text>
                <Text style={[TYPE.buttonSmall, styles.action]}>Copy</Text>
              </TouchableOpacity>
              {setupData.qr_code ? (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setManual(false);
                  }}
                  accessibilityRole="button"
                  style={styles.linkButton}
                >
                  <Text style={[TYPE.buttonSmall, styles.action]}>Show QR code</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              <Text style={[TYPE.bodySmall, styles.copy]}>
                Scan this QR code in your authenticator app.
              </Text>
              {/* A light QR tile is intentional in every theme so it scans reliably (matches web). */}
              <View style={styles.qrTile}>
                <Image
                  source={{ uri: setupData.qr_code }}
                  style={styles.qr}
                  resizeMode="contain"
                  accessibilityLabel="Authenticator setup QR code"
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setManual(true);
                }}
                accessibilityRole="button"
                style={styles.linkButton}
              >
                <Text style={[TYPE.buttonSmall, styles.action]}>Can’t scan? Enter a setup key</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.step}>
          <Text style={[TYPE.label, styles.stepTitle]}>3. Enter your verification code</Text>
          <Text style={[TYPE.bodySmall, styles.copy]}>
            Enter the 6-digit code from your authenticator app.
          </Text>
          <TextInput bordered
            InputComponent={BottomSheetTextInput}
            accessibilityLabel="Verification code"
            value={twoFactor.token}
            onChangeText={(value) => twoFactor.setToken(sanitizeTotpCode(value))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            rightElement={(
              <TouchableOpacity onPress={pasteCode} hitSlop={8} accessibilityRole="button">
                <Text style={[TYPE.buttonSmall, styles.action]}>Paste code</Text>
              </TouchableOpacity>
            )}
          />
          {twoFactor.error ? <Text style={[TYPE.metadata, styles.error]}>{twoFactor.error}</Text> : null}
        </View>
      </BottomSheetScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(getSheetBottomPadding(insets.bottom, 12), 20) }]}>
        <Button variant="secondary" size="lg" rounded="full" className="h-14 flex-1" onPress={onClose}>
          Cancel
        </Button>
        <Button
          size="lg"
          rounded="full" className="h-14 flex-1"
          loading={twoFactor.loading}
          disabled={twoFactor.token.length !== 6}
          onPress={complete}
        >
          Turn on 2FA
        </Button>
      </View>
    </View>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  header: { paddingHorizontal: 20 },
  // 32px from the header and to the actions (paddingBottom + the footer's 12px top padding).
  body: { paddingHorizontal: 20, paddingTop: SHEET_GROUP_GAP, paddingBottom: SHEET_GROUP_GAP - 12, gap: SHEET_SECTION_GAP },
  step: { gap: 8 },
  stepTitle: { color: COLORS.textStrong },
  copy: { color: COLORS.textWeak },
  linkButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  action: { color: COLORS.brand },
  codeRow: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: COLORS.fillWeak,
    paddingHorizontal: 16,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  code: { flex: 1, color: COLORS.textStrong },
  qrTile: {
    width: 176,
    height: 176,
    marginTop: 4,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    backgroundColor: LIGHT_COLORS.card,
  },
  qr: { width: '100%', height: '100%' },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.sheet,
  },
  error: { color: COLORS.error, marginTop: 4 },
});
