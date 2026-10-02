/**
 * Toast — imperative singleton + React context
 *
 * Design:
 *  - Full solid background (brand / success / error)
 *  - Icon left (Check / AlertTriangle / Info)
 *  - White text
 *  - Slides in from the top, below the status bar
 *  - Auto-dismisses after 3.5s, no manual X button
 *
 * Singleton: call `toast()` from anywhere — portals, sheets, callbacks etc.
 * Hook: `useToast()` — backward compat, falls back to singleton if outside provider.
 */

import React, {
  createContext, useContext, useState, useCallback, useEffect,
} from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import Check from 'lucide-react-native/icons/check';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import Info from 'lucide-react-native/icons/info';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, radius, responsiveSpace } from '@/constants/responsive';

// Springs in from above and fades out upward; others slide to make room.
const TOAST_ENTERING = FadeInDown.springify().damping(20).stiffness(300).mass(0.8);
const TOAST_EXITING = FadeOutUp.duration(180);
const TOAST_LAYOUT = LinearTransition.springify().damping(20).stiffness(300);

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

// ─── Module-level singleton ───────────────────────────────────────────────────

let _toastHandler: ((message: string, type: ToastType) => void) | null = null;

/** Imperative toast — safe to call from anywhere, including sheets & portals */
export function toast(message: string, type: ToastType = 'info') {
  if (_toastHandler) {
    _toastHandler(message, type);
  } else {
    Promise.resolve().then(() => _toastHandler?.(message, type));
  }
}

// ─── React context ────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Config ───────────────────────────────────────────────────────────────────

const BG: Record<ToastType, string> = {
  success: COLORS.success,
  error:   COLORS.error,
  info:    COLORS.brand,
};

function ToastIcon({ type }: { type: ToastType }) {
  const color = '#ffffff';
  const size = iconSize(18);
  const sw = 2.5;
  if (type === 'success') return <Check size={size} color={color} strokeWidth={sw} />;
  if (type === 'error')   return <AlertTriangle size={size} color={color} strokeWidth={sw} />;
  return <Info size={size} color={color} strokeWidth={sw} />;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    _toastHandler = addToast;
    return () => { _toastHandler = null; };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* ── Toast stack — top of screen, inside safe area ── */}
      <View
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
                backgroundColor: BG[t.type],
                // subtle shadow so it lifts off the content beneath
                shadowColor: '#000',
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
                  color: '#ffffff',
                  lineHeight: 20,
                }}
              >
                {t.message}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context) return context;
  // Fallback: singleton — never throws even in portals/sheets
  return { toast };
}
