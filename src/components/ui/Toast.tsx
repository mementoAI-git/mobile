import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { X } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
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
                    color: t.type === 'success' ? COLORS.success : t.type === 'error' ? COLORS.error : COLORS.textStrong
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

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
