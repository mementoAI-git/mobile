import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Button, TextInput } from '@/components/ui';
import { TYPE } from '@/constants/typography';
import { COLORS, FONTS } from '@/constants/tokens';
import { useTwoFactorSettingsLogic } from '@/hooks/use-two-factor-settings-logic';

interface SetupTwoFactorSheetProps {
  setupData: { qr_code?: string; secret?: string };
  onClose?: () => void;
}

export function SetupTwoFactorSheet({
  setupData,
  onClose,
}: SetupTwoFactorSheetProps) {
  const [manual, setManual] = useState(!setupData.qr_code);
  const twoFactor = useTwoFactorSettingsLogic();

  const complete = async () => {
    const success = await twoFactor.handleVerify();
    if (success) onClose?.();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={twoFactorStyles.header}>
        <Text style={TYPE.sectionTitle}>Set up two-factor authentication</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            onClose?.();
          }}
          style={twoFactorStyles.close}
        >
          <X size={22} color={COLORS.textStrong} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
      >
        <Text style={TYPE.cardTitle}>Step 1</Text>
        <Text style={twoFactorStyles.copy}>Download an authenticator app:</Text>
        <Text style={twoFactorStyles.link}>1. Google Authenticator{'\n'}2. Authy.</Text>

        <Text style={[TYPE.cardTitle, { marginTop: 18 }]}>Step 2</Text>
        {manual ? (
          <>
            <Text style={twoFactorStyles.copy}>
              Copy the secret key to set up two-factor authentication manually.
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setManual(false);
              }}
            >
              <Text style={twoFactorStyles.link}>Use QR code instead.</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                Haptics.selectionAsync();
                await Clipboard.setStringAsync(setupData.secret ?? '');
              }}
              style={twoFactorStyles.codeRow}
            >
              <Text numberOfLines={1} style={twoFactorStyles.code}>{setupData.secret}</Text>
              <Text style={twoFactorStyles.copyAction}>Copy</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={twoFactorStyles.copy}>
              Scan the QR code below to pair Memento with your preferred authenticator app.
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setManual(true);
              }}
            >
              <Text style={twoFactorStyles.link}>Enter the secret key instead</Text>
            </TouchableOpacity>
            {setupData.qr_code && (
              <Image
                source={{ uri: setupData.qr_code }}
                style={twoFactorStyles.qr}
                resizeMode="contain"
              />
            )}
          </>
        )}

        <Text style={[TYPE.cardTitle, { marginTop: 18 }]}>Step 3</Text>
        <Text style={twoFactorStyles.copy}>
          Enter the six-digit code from your authenticator app.
        </Text>
        <TextInput
          value={twoFactor.token}
          onChangeText={twoFactor.setToken}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          rightElement={(
            <TouchableOpacity
              onPress={async () => {
                Haptics.selectionAsync();
                const pasted = await Clipboard.getStringAsync();
                twoFactor.setToken(pasted.replace(/\D/g, '').slice(0, 6));
              }}
              hitSlop={8}
            >
              <Text style={twoFactorStyles.copyAction}>Paste code</Text>
            </TouchableOpacity>
          )}
        />
        {twoFactor.error && <Text style={twoFactorStyles.error}>{twoFactor.error}</Text>}
      </BottomSheetScrollView>

      <View style={twoFactorStyles.actions}>
        <Button variant="secondary" size="lg" className="h-14 flex-1" onPress={onClose}>
          Cancel
        </Button>
        <Button
          size="lg"
          className="h-14 flex-1"
          loading={twoFactor.loading}
          disabled={twoFactor.token.length !== 6}
          onPress={complete}
        >
          Complete setup
        </Button>
      </View>
    </View>
  );
}

const twoFactorStyles = {
  header: {
    minHeight: 62,
    paddingHorizontal: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: COLORS.fillWeak,
  },
  copy: {
    color: COLORS.textBase,
    ...TYPE.label,
    lineHeight: 20,
    marginTop: 10,
  },
  link: {
    color: COLORS.brand,
    ...TYPE.label,
    lineHeight: 20,
    marginTop: 10,
  },
  codeRow: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    paddingHorizontal: 12,
    marginTop: 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  code: { flex: 1, color: COLORS.textStrong, ...TYPE.mono },
  copyAction: { color: COLORS.info, ...TYPE.bodySmall },
  qr: { width: 126, height: 126, marginTop: 10 },
  actions: {
    flexDirection: 'row' as const,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.background,
  },
  error: { color: COLORS.error, ...TYPE.metadata, marginTop: 8 },
};
