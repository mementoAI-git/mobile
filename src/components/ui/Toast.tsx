/**
 * Toast — imperative singleton + React context
 *
 * Design:
 *  - Theme-adaptive raised surface with semantic status icons
 *  - Icon left (Check / AlertTriangle / Info)
 *  - Theme-adaptive text
 *  - Slides in from the top, below the status bar
 *  - Auto-dismisses after 3.5s, no manual X button
 *
 * Singleton: call `toast()` from anywhere — portals, sheets, callbacks etc.
 * Hook: `useToast()` — backward compat, falls back to singleton if outside provider.
 */

import React, {
  createContext, useContext, useSyncExternalStore,
} from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import Check from 'lucide-react-native/icons/check';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import Info from 'lucide-react-native/icons/info';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';
import { iconSize, radius, responsiveSpace } from '@/constants/responsive';
import { toastQueue, type ToastType } from '@/features/notifications/toast-queue';

// Springs in from above and fades out upward; others slide to make room.
const TOAST_ENTERING = FadeInDown.springify().damping(20).stiffness(300).mass(0.8);
const TOAST_EXITING = FadeOutUp.duration(180);
const TOAST_LAYOUT = LinearTransition.springify().damping(20).stiffness(300);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

// ─── Module-level singleton ───────────────────────────────────────────────────

/** Imperative toast — shared across screens, sheets, and native modal windows. */
export function toast(message: string, type: ToastType = 'info') {
  toastQueue.add(message, type);
}

// ─── React context ────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Config ───────────────────────────────────────────────────────────────────

function ToastIcon({ type }: { type: ToastType }) {
  const colors = useThemeColors();
  const color = type === 'success' ? colors.success : type === 'error' ? colors.error : colors.info;
  const size = iconSize(18);
  const sw = 2.5;
  if (type === 'success') return <Check size={size} color={color} strokeWidth={sw} />;
  if (type === 'error')   return <AlertTriangle size={size} color={color} strokeWidth={sw} />;
  return <Info size={size} color={color} strokeWidth={sw} />;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const toastApi = { toast };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastContext.Provider value={toastApi}>
      <View testID="toast-screen-host" style={{ flex: 1, position: 'relative' }}>
        {children}
        <ToastViewport />
      </View>
    </ToastContext.Provider>
  );
}

/** Native modals have their own window; render this there so toasts stay above them. */
export function ToastViewport() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const toasts = useSyncExternalStore(toastQueue.subscribe, toastQueue.getSnapshot, toastQueue.getSnapshot);
  return (
      <View
        testID="toast-stack"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          right: 16,
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        {toasts.map(t => (
          <Animated.View
            key={t.id}
            style={{ width: '100%', maxWidth: 480 }}
            entering={TOAST_ENTERING}
            exiting={TOAST_EXITING}
            layout={TOAST_LAYOUT}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: responsiveSpace(10),
                paddingHorizontal: responsiveSpace(16),
                paddingVertical: responsiveSpace(14),
                borderRadius: radius(14),
                backgroundColor: colors.popover,
                borderWidth: 1,
                borderColor: colors.strokeWeak,
                // subtle shadow so it lifts off the content beneath
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <ToastIcon type={t.type} />
              <Text
                style={{
                  flex: 1,
                  ...TYPE.label,
                  color: colors.textStrong,
                  lineHeight: 20,
                }}
              >
                {t.message}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context) return context;
  // Fallback: singleton — never throws even in portals/sheets
  return { toast };
}
