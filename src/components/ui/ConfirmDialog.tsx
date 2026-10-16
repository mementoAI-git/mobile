/**
 * ConfirmDialog — on-brand replacement for React Native's Alert.alert()
 *
 * Renders via @gorhom/bottom-sheet BottomSheetModal over the current screen,
 * styled with Memento's warm cream background, serif title, rounded-full buttons,
 * and brand backdrop.
 *
 * Usage:
 *   const [visible, setVisible] = useState(false);
 *
 *   <ConfirmDialog
 *     visible={visible}
 *     title="Delete memory?"
 *     message="This action cannot be undone."
 *     buttons={[
 *       { label: 'Delete', variant: 'destructive', onPress: handleDelete },
 *       { label: 'Cancel', variant: 'ghost', onPress: () => setVisible(false) },
 *     ]}
 *     onClose={() => setVisible(false)}
 *   />
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { getSheetBottomPadding } from '@/features/layout/sheet-safe-area';
import { minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmButtonVariant = 'primary' | 'destructive' | 'ghost';

export interface ConfirmButton {
  label: string;
  variant?: ConfirmButtonVariant;
  onPress: () => void;
  /** Disable this button (e.g. while async work is in progress) */
  disabled?: boolean;
}

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: ConfirmButton[];
  /** Called when the backdrop is tapped — typically closes the dialog */
  onClose?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConfirmDialog({
  visible,
  title,
  message,
  buttons,
  onClose,
}: ConfirmDialogProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    [],
  );

  const handleButton = useCallback((btn: ConfirmButton) => {
    if (btn.disabled) return;
    if (btn.variant === 'destructive') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.selectionAsync();
    }
    btn.onPress();
  }, []);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.sheetBackground}
      onDismiss={onClose}
    >
      <BottomSheetView
        style={[
          styles.card,
          {
            paddingBottom: Math.max(
              getSheetBottomPadding(insets.bottom, 16),
              24,
            ),
          },
        ]}
      >
        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Optional message */}
        {message ? <Text style={styles.message}>{message}</Text> : null}

        {/* Buttons */}
        <View style={styles.buttons}>
          {buttons.map((btn, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleButton(btn)}
              disabled={btn.disabled}
              activeOpacity={0.85}
              style={[
                styles.btn,
                btn.variant === 'primary' && styles.btnPrimary,
                btn.variant === 'destructive' && styles.btnDestructive,
                btn.variant === 'ghost' && styles.btnGhost,
                !btn.variant && styles.btnPrimary,
                btn.disabled && styles.btnDisabled,
              ]}
            >
              <Text
                style={[
                  styles.btnText,
                  btn.variant === 'primary' && styles.btnTextPrimary,
                  !btn.variant && styles.btnTextPrimary,
                  btn.variant === 'destructive' && styles.btnTextDestructive,
                  btn.variant === 'ghost' && styles.btnTextGhost,
                  btn.disabled && styles.btnTextDisabled,
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: radius(28),
    borderTopRightRadius: radius(28),
  },

  handleIndicator: {
    backgroundColor: COLORS.strokeStrong,
    opacity: 0.3,
    width: 36,
  },

  card: {
    paddingHorizontal: responsiveSpace(20),
    paddingTop: responsiveSpace(12),
    gap: responsiveSpace(8),
  },

  title: {
    ...TYPE.sectionTitle,
    color: COLORS.textStrong,
    marginBottom: 4,
  },

  message: {
    ...TYPE.body,
    color: COLORS.textBase,
    lineHeight: 21,
    marginBottom: 8,
  },

  buttons: {
    gap: responsiveSpace(10),
    marginTop: responsiveSpace(8),
    marginBottom: responsiveSpace(8),
  },

  btn: {
    minHeight: minTouchTarget(56),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: responsiveSpace(16),
  },

  // Primary — brand orange filled
  btnPrimary: {
    backgroundColor: COLORS.brand,
  },
  btnTextPrimary: {
    ...TYPE.button,
    color: COLORS.textInverse,
  },

  // Destructive — brick red tint border/bg
  btnDestructive: {
    backgroundColor: `${COLORS.error}08`,
    borderWidth: 1,
    borderColor: `${COLORS.error}25`,
  },
  btnTextDestructive: {
    ...TYPE.button,
    color: COLORS.error,
  },

  // Ghost — text only, no background
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnTextGhost: {
    ...TYPE.body,
    color: COLORS.textMuted,
  },

  // Disabled state
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: COLORS.textDisabled,
  },

  btnText: {
    ...TYPE.button,
    color: COLORS.textStrong,
  },
});
