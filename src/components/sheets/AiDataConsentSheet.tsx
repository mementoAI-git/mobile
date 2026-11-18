import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Button } from '@/components/ui/Button';
import { TYPE } from '@/constants/typography';
import { PRIVACY_URL } from '@/lib/env';
import { SHEET_GROUP_GAP, SHEET_SECTION_GAP } from '@/features/layout/sheet-safe-area';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { SheetActions, SHEET_FILL } from './SheetActions';
import { SheetHeader } from './SheetHeader';

const PRIVACY_POLICY_URL = PRIVACY_URL;

interface AiDataConsentSheetProps {
  onAgree?: () => void;
  onDecline?: () => void;
  onClose: () => void;
}

/**
 * One-time disclosure before the first chat message or voice call (App
 * Review 5.1.2(i)): what is sent, to whom, and how it is used.
 * Closing the sheet without a choice counts as Not now.
 */
export function AiDataConsentSheet({ onAgree, onDecline, onClose }: AiDataConsentSheetProps) {
  const colors = useThemeColors();

  const agree = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAgree?.();
    onClose();
  }, [onAgree, onClose]);

  const decline = useCallback(() => {
    void Haptics.selectionAsync();
    onDecline?.();
    onClose();
  }, [onClose, onDecline]);

  const openPrivacyPolicy = useCallback(() => {
    void Haptics.selectionAsync();
    void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  }, []);

  const body = { ...TYPE.body, color: colors.textBase };

  return (
    <View style={{ ...SHEET_FILL, gap: SHEET_GROUP_GAP }}>
      <SheetHeader title="Before you talk with Memento" onClose={onClose} closeLabel="Close" />
      <View style={{ gap: SHEET_SECTION_GAP }}>
        <Text style={body}>
          To reply, Memento sends your messages, your voice and the memories relevant to the
          conversation to Google’s Gemini AI service.
        </Text>
        <Text style={body}>
          Gemini processes them only to generate Memento’s responses. Under Google’s API terms, it
          does not use them to train its models.
        </Text>
        <Text style={body}>
          You can read more in our{' '}
          <Text
            accessibilityRole="link"
            onPress={openPrivacyPolicy}
            className="underline"
            style={{ color: colors.textStrong }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
      <SheetActions style={{ gap: 12 }}>
        <Button
          fullWidth
          variant="ghost"
          rounded="full"
          onPress={agree}
          style={{ height: 48, minHeight: 48, paddingVertical: 0, backgroundColor: colors.activeFill }}
        >
          <Text style={[TYPE.button, { color: colors.activeText }]}>Agree and continue</Text>
        </Button>
        <Button
          fullWidth
          variant="outline"
          rounded="full"
          onPress={decline}
          style={{ height: 48, minHeight: 48, paddingVertical: 0 }}
        >
          Not now
        </Button>
      </SheetActions>
    </View>
  );
}
