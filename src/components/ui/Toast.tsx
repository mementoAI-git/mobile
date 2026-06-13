/**
 * Toast — imperative singleton + React context
 *
 * The module-level `toast()` function works from ANYWHERE — including hooks
 * called inside @gorhom/bottom-sheet portals or other contexts that render
 * outside the normal React provider tree. No "must be within ToastProvider"
 * errors ever again.
 *
 * Usage:
 *   import { toast } from '@/components/ui/Toast';
 *   toast('Saved!', 'success');
 *
 * OR via hook (backward compat):
 *   const { toast } = useToast();
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { X } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';

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
// Stores the registered handler from whichever ToastProvider is mounted.
// Any code — inside or outside the React tree — can call this.

let _toastHandler: ((message: string, type: ToastType) => void) | null = null;

/**
 * Imperative `toast()` — safe to call from anywhere:
 * hooks, portals, bottom sheets, native callbacks, etc.
 */
export function toast(message: string, type: ToastType = 'info') {
  if (_toastHandler) {
    _toastHandler(message, type);
  } else {
    // ToastProvider not yet mounted — queue a microtask so it works even
    // if called synchronously at startup before the tree is ready.
    Promise.resolve().then(() => _toastHandler?.(message, type));
  }
}

// ─── React context (for useToast hook) ───────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Register into the module singleton on mount, deregister on unmount
  useEffect(() => {
    _toastHandler = addToast;
    return () => {
      _toastHandler = null;
    };
  }, [addToast]);

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <View className="absolute top-12 left-4 right-4 gap-2 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <MotiView
              key={t.id}
              from={{ opacity: 0, translateY: -20, scale: 0.95 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto"
            >
              <View
                className="flex-row items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{
                  backgroundColor: t.type === 'success' ? `${COLORS.success}10` : t.type === 'error' ? `${COLORS.error}10` : COLORS.card,
                  borderColor: t.type === 'success' ? `${COLORS.success}20` : t.type === 'error' ? `${COLORS.error}20` : COLORS.strokeWeak,
                  shadowColor: 'rgba(23,11,0,0.1)',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Text
                  className="flex-1 text-sm"
                  style={{
                    fontFamily: FONTS.sansMedium,
                    color: t.type === 'success' ? COLORS.success : t.type === 'error' ? COLORS.error : COLORS.textStrong,
                  }}
                >
                  {t.message}
                </Text>
                <TouchableOpacity onPress={() => remove(t.id)} className="p-1">
                  <X size={14} color="rgba(23,11,0,0.4)" />
                </TouchableOpacity>
              </View>
            </MotiView>
          ))}
        </AnimatePresence>
      </View>
    </ToastContext.Provider>
  );
}

// ─── Hook (backward compatible) ───────────────────────────────────────────────
// Returns the same `toast` function via context. If somehow called outside the
// provider tree (e.g. in a test), it falls back to the module singleton so it
// never throws.

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context) return context;
  // Fallback: return the module-level singleton so sheets/portals don't crash
  return { toast };
}
