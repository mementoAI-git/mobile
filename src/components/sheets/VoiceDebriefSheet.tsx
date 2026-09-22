import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { Button } from '@/components/ui';
import { formatVoiceCallDuration } from '@/features/chat/voice-call-flow';
import { useUiStore } from '@/store';

const PHONE_CALL = require('../../../assets/images/onboarding/phon-call.png');

interface VoiceDebriefSheetProps {
  duration?: number;
  memoryId?: string | null;
  userSpeechText?: string;
  aiSpeechText?: string;
  onClose?: () => void;
}

export function VoiceDebriefSheet({
  duration = 0,
  memoryId,
  userSpeechText = '',
  aiSpeechText = '',
  onClose,
}: VoiceDebriefSheetProps) {
  const router = useRouter();

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const formattedDuration = formatVoiceCallDuration(duration);

  const excerpt = userSpeechText.trim()
    || aiSpeechText.trim()
    || 'You reflected on meaningful life moments and shared stories with your AI host.';

  const handleDismiss = () => {
    void Haptics.selectionAsync();
    onClose?.();
  };

  const handleSaveAsStory = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose?.();
    setTimeout(() => {
      useUiStore.getState().openSheet('create-memory', {
        title: 'Voice Reflection',
        body: excerpt,
      });
    }, 300);
  };

  const handleGoToChat = () => {
    void Haptics.selectionAsync();
    onClose?.();
    router.replace('/(tabs)/chat');
  };

  return (
    <View className="flex-grow px-5 pb-8 pt-2">
      {/* Top Bar with 44x44 Close Button */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-1.5 bg-brand/10 rounded-full px-3 py-1">
          <View className="size-1.5 rounded-full bg-brand" />
          <Text className="text-brand uppercase tracking-wider" style={TYPE.metadata}>
            {formattedDuration} · Spoken Reflection
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close voice debrief"
          className="size-11 rounded-full bg-fill-weaker items-center justify-center"
        >
          <X size={18} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      {/* Hero with Illustration */}
      <View className="mb-5 items-center">
        <Image
          source={PHONE_CALL}
          style={{ width: 84, height: 84, marginBottom: 12 }}
          resizeMode="contain"
        />
        <Text className="text-center text-text-strong mb-1.5" style={TYPE.sectionTitle}>
          Today’s Spoken Reflection
        </Text>
        <Text className="text-center text-text-weak px-2" style={TYPE.body}>
          We captured the essence of your conversation. Turn it into an enduring story or keep it in your chat archive.
        </Text>
      </View>

      {/* Pull-Quote Card */}
      <View className="bg-fill-weaker rounded-3xl border border-stroke-weaker p-5 mb-8">
        <Text className="text-text-muted uppercase tracking-wider mb-2.5" style={TYPE.metadata}>
          Highlights from your session
        </Text>
        <Text
          className="italic leading-relaxed"
          style={{ ...TYPE.body, color: '#555555' }}
          numberOfLines={4}
        >
          “{excerpt}”
        </Text>
      </View>

      {/* Actions */}
      <View className="gap-3">
        <Button
          variant="primary"
          size="lg"
          className="h-14 w-full"
          onPress={handleSaveAsStory}
        >
          Save as Story
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="h-14 w-full"
          onPress={handleGoToChat}
        >
          View in Chat Archive
        </Button>
      </View>
    </View>
  );
}
