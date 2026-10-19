import { useThemeColors } from '@/hooks/use-theme-colors';
import React from 'react';
import { Text, View } from 'react-native';
import PhoneOff from 'lucide-react-native/icons/phone-off';
import { Button } from '@/components/ui/Button';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { useUiStore } from '@/store';

interface EndVoiceSessionSheetProps {
  duration: number;
  onEnd: () => void | Promise<void>;
  onClose: () => void;
}

export function EndVoiceSessionSheet({ duration, onEnd, onClose }: EndVoiceSessionSheetProps) {
  const COLORS = useThemeColors();
  return (
    <View className="items-center pb-2 pt-6">
      <View className="size-20 items-center justify-center rounded-full bg-fill-weaker">
        <PhoneOff size={38} color={COLORS.warning} />
      </View>
      <Text className="mt-6 text-center text-text-strong" style={TYPE.sectionTitle}>
        End this voice session?
      </Text>
      <Text className="mt-2 text-text-base" style={TYPE.body}>
        {formatVoiceCallDuration(duration)}
      </Text>
      <View className="mt-8 w-full flex-row gap-3">
        <Button variant="secondary" className="h-14 flex-1" onPress={onClose}>Back to call</Button>
        <Button
          variant="destructive"
          className="h-14 flex-1"
          onPress={() => { useUiStore.getState().closeSheet(); void onEnd(); }}
        >
          End session
        </Button>
      </View>
    </View>
  );
}
