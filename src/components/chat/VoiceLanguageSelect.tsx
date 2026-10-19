import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Check from 'lucide-react-native/icons/check';
import * as Haptics from 'expo-haptics';
import { Pressable } from '@/components/ui/Touchable';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { TYPE } from '@/constants/typography';
import { VOICE_LANGUAGES, type VoiceLanguageCode } from '@/features/chat/voice-language';

export function VoiceLanguageSelect({ value, onChange, disabled }: {
  value: VoiceLanguageCode; onChange: (code: VoiceLanguageCode) => void; disabled?: boolean;
}) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => { void Haptics.selectionAsync(); setOpen(current => !current); }, []);
  const select = useCallback((code: VoiceLanguageCode) => {
    void Haptics.selectionAsync(); onChange(code); setOpen(false);
  }, [onChange]);
  return <View className="mb-5" style={{ zIndex: 10 }}>
    <Text className="mb-2 text-text-strong" style={TYPE.label}>Language</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Language, ${VOICE_LANGUAGES.find(language => language.code === value)?.label}`}
      accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={toggle}
      className="min-h-12 flex-row items-center justify-between rounded-[10px] border border-stroke-weak bg-card px-4">
      <Text className="text-text-strong" style={TYPE.body}>{VOICE_LANGUAGES.find(language => language.code === value)?.label}</Text>
      <ChevronDown size={18} color={colors.textBase} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
    </Pressable>
    {open && <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(120)}
      style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, borderRadius: 10, borderWidth: 1, borderColor: colors.strokeWeak, backgroundColor: colors.cardRaised, overflow: 'hidden' }}>
      {VOICE_LANGUAGES.map(language => <Pressable key={language.code} accessibilityRole="radio" accessibilityState={{ checked: language.code === value }}
        onPress={() => select(language.code)} className="min-h-11 flex-row items-center justify-between px-4"
        style={{ backgroundColor: language.code === value ? colors.fillWeak : 'transparent' }}>
        <Text style={TYPE.body} className="text-text-strong">{language.label}</Text>
        {language.code === value && <Check size={18} color={colors.brand} />}
      </Pressable>)}
    </Animated.View>}
  </View>;
}
