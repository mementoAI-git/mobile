import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import Sun from 'lucide-react-native/icons/sun';
import CloudMoon from 'lucide-react-native/icons/cloud-moon';
import Moon from 'lucide-react-native/icons/moon';
import Monitor from 'lucide-react-native/icons/monitor';
import Check from 'lucide-react-native/icons/check';
import { Button } from '@/components/ui/Button';
import { TYPE } from '@/constants/typography';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppearanceStore } from '@/store/appearance.store';
import type { AppearancePreference } from '@/features/appearance/appearance';

const OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'deep-sky', label: 'Deep Sky', icon: CloudMoon },
] as const;

function AppearanceOption({ value, label, icon: Icon }: (typeof OPTIONS)[number]) {
  const colors = useThemeColors();
  const preference = useAppearanceStore((s) => s.preference);
  const select = useCallback(() => useAppearanceStore.getState().setPreference(value as AppearancePreference), [value]);
  return (
    <Button variant="ghost" size="menu" className={preference === value ? 'justify-start bg-fill-weak' : 'justify-start'}
      leftIcon={<Icon size={21} color={colors.textStrong} />}
      rightIcon={preference === value ? <Check size={18} color={colors.brand} /> : undefined}
      accessibilityLabel={`${label}${preference === value ? ', selected' : ''}`} onPress={select}>
      {label}
    </Button>
  );
}

export function AppearanceSheet({ onClose }: { onClose: () => void }) {
  return (
    <View className="gap-3">
      <Text style={TYPE.sectionTitle} className="text-text-strong">Appearance</Text>
      <Text style={TYPE.bodySmall} className="text-text-base mb-2">Choose your look, or follow your device with System.</Text>
      {OPTIONS.map((option) => <AppearanceOption key={option.value} {...option} />)}
      <Button variant="outline" size="menu" className="mt-3" onPress={onClose}>Done</Button>
    </View>
  );
}
