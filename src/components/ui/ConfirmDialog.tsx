/**
 * ConfirmDialog — on-brand replacement for React Native's Alert.alert()
 *
 * Renders a fully custom Modal over the current screen, styled with Memento's
 * warm cream background, serif title, rounded-full buttons, and brand backdrop.
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

import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';

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
  const insets = useSafeAreaInsets();

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Card */}
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        <View style={styles.card}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Optional message */}
          {message ? (
            <Text style={styles.message}>{message}</Text>
          ) : null}

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
                  // default to primary when variant is omitted
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
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23,11,0,0.5)',
  },

  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  card: {
    backgroundColor: COLORS.background,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.07,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },

  title: {
    fontFamily: FONTS.serif,
    fontSize: 22,
    color: COLORS.textStrong,
    marginBottom: 4,
  },

  message: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    color: COLORS.textBase,
    lineHeight: 21,
    marginBottom: 8,
  },

  buttons: {
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },

  btn: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Primary — brand orange filled
  btnPrimary: {
    backgroundColor: COLORS.brand,
  },
  btnTextPrimary: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.textInverse,
  },

  // Destructive — brick red tint border/bg
  btnDestructive: {
    backgroundColor: `${COLORS.error}08`,
    borderWidth: 1,
    borderColor: `${COLORS.error}25`,
  },
  btnTextDestructive: {
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.error,
  },

  // Ghost — text only, no background
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnTextGhost: {
    fontFamily: FONTS.sans,
    fontSize: 15,
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
    // base — overridden by variant styles above
    fontFamily: FONTS.sansBold,
    fontSize: 16,
    color: COLORS.textStrong,
  },
});
