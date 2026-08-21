import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Platform, ActivityIndicator, ImageBackground } from 'react-native';
import { PhoneOff, Mic, MicOff, Settings, Volume2, X, Check } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  FadeIn, 
  FadeInDown, 
  SlideInDown, 
  SlideOutDown 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';
import { useVoiceMode, VOICE_OPTIONS, VoiceOption } from '@/hooks/use-voice-mode';
import { VoiceUpgradeScreen } from '@/components/chat/VoiceUpgradeScreen';
import { Button } from '@/components/ui';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

const PATTERN = require('../../../assets/images/backgrounds/welcome_bg.png');

interface VoiceModeOverlayProps {
  visible: boolean;
  onClose: () => void;
  memoryId?: string | null;
  conversationTitle?: string;
}

export function VoiceModeOverlay({ visible, onClose, memoryId, conversationTitle = 'AI Companion' }: VoiceModeOverlayProps) {
  const {
    isConnected,
    isConnecting,
    isMuted,
    recordingTime,
    activeVoice,
    setActiveVoice,
    aiSpeechText,
    userSpeechText,
    isAiSpeaking,
    connectionFailure,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceMode({ memoryId });

  const [showSettings, setShowSettings] = useState(false);

  // Animated visualizer rings
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const ring3 = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      // Connect on mount
      connect();
    } else {
      disconnect();
    }
  }, [visible]);

  // Visualizer loop that scales rings up and down to match speech
  useEffect(() => {
    if (isConnected && !isMuted) {
      const baseDuration = isAiSpeaking ? 1200 : 1800;
      const ringMaxScale = isAiSpeaking ? 1.4 : 1.2;

      ring1.value = withRepeat(
        withSequence(
          withTiming(ringMaxScale, { duration: baseDuration }),
          withTiming(1, { duration: baseDuration })
        ),
        -1,
        true
      );

      ring2.value = withRepeat(
        withSequence(
          withTiming(ringMaxScale - 0.15, { duration: baseDuration + 220 }),
          withTiming(1, { duration: baseDuration + 220 })
        ),
        -1,
        true
      );

      ring3.value = withRepeat(
        withSequence(
          withTiming(ringMaxScale - 0.25, { duration: baseDuration + 440 }),
          withTiming(1, { duration: baseDuration + 440 })
        ),
        -1,
        true
      );
    } else {
      ring1.value = withTiming(1, { duration: 300 });
      ring2.value = withTiming(1, { duration: 300 });
      ring3.value = withTiming(1, { duration: 300 });
    }
  }, [isConnected, isMuted, isAiSpeaking]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: isConnected && !isMuted ? 0.15 : 0,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: isConnected && !isMuted ? 0.1 : 0,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3.value }],
    opacity: isConnected && !isMuted ? 0.05 : 0,
  }));

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    disconnect();
    onClose();
  };

  const handleSelectVoice = (voice: VoiceOption) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveVoice(voice);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleEndCall}
    >
      <SafeAreaProvider>
        {connectionFailure?.kind === 'upgrade-required' ? (
          <VoiceUpgradeScreen onClose={handleEndCall} />
        ) : (
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />
        
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-6 pt-14 pb-4 z-10">
          <TouchableOpacity
            onPress={handleEndCall}
            activeOpacity={0.7}
            className="flex-row items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-stroke-weaker shadow-sm"
          >
            <PhoneOff size={16} color={COLORS.textBase} />
            <Text className="text-sm font-semibold text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>
              End Call
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setShowSettings(true); }}
            activeOpacity={0.7}
            className="size-11 rounded-2xl bg-white border border-stroke-weaker items-center justify-center shadow-sm"
          >
            <Settings size={20} color={COLORS.textBase} />
          </TouchableOpacity>
        </View>

        {/* Dynamic Center Visualizer Section */}
        <View className="flex-1 items-center justify-center px-8">
          <View className="items-center justify-center size-80 relative">
            {/* Animated Pulsing Wave Rings */}
            <Animated.View 
              style={[ring1Style, styles.ring]} 
              className="bg-brand rounded-full absolute"
            />
            <Animated.View 
              style={[ring2Style, styles.ring]} 
              className="bg-brand rounded-full absolute"
            />
            <Animated.View 
              style={[ring3Style, styles.ring]} 
              className="bg-brand rounded-full absolute"
            />

            {/* Core Center Ring */}
            <View className="size-40 rounded-full bg-white border border-stroke-weaker items-center justify-center shadow-[0_16px_48px_rgba(23,11,0,0.06)] z-10">
              {isConnecting ? (
                <ActivityIndicator size="large" color={COLORS.brand} />
              ) : (
                <View 
                  className="size-32 rounded-full items-center justify-center"
                  style={{ backgroundColor: isAiSpeaking && isConnected && !isMuted ? `${COLORS.brand}12` : COLORS.fillWeak }}
                >
                  <Volume2 size={48} color={isAiSpeaking && isConnected && !isMuted ? COLORS.brand : COLORS.textMuted} strokeWidth={1.5} />
                </View>
              )}
            </View>
          </View>

          {/* Time & Active State Labels */}
          <View className="items-center gap-2 mt-4">
            <Text className="text-4xl text-text-strong tracking-tight tabular-nums" style={{ fontFamily: FONTS.serif }}>
              {formatTime(recordingTime)}
            </Text>
            
            <View className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-stroke-weaker shadow-sm">
              <View 
                className="size-1.5 rounded-full" 
                style={{ backgroundColor: isConnected ? COLORS.success : COLORS.textMuted }} 
              />
              <Text className="text-xs text-text-weak font-medium" style={{ fontFamily: FONTS.sansMedium }}>
                {isConnecting 
                  ? 'Connecting secure link...' 
                  : connectionFailure?.kind === 'connection-error'
                    ? 'Couldn’t connect'
                  : isMuted 
                    ? 'Microphone muted' 
                    : isConnected 
                      ? `${activeVoice.name} Active` 
                      : 'Disconnected'}
              </Text>
            </View>
          </View>
        </View>

        {/* Real-time Subtitles / Speech Transcripts panel */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          className="mx-6 mb-8 p-5 bg-white border border-stroke-weaker rounded-[32px] shadow-sm gap-2"
        >
          <Text className="text-[10px] font-bold text-text-muted uppercase tracking-[1.5px]" style={{ fontFamily: FONTS.sansBold }}>
            {isAiSpeaking ? 'AI Companion' : 'You (Speaking)'}
          </Text>
          <Text 
            className="text-[15px] text-text-strong leading-relaxed" 
            style={{ 
              fontFamily: isAiSpeaking ? FONTS.serif : FONTS.sans,
              fontStyle: isAiSpeaking ? 'normal' : 'italic',
              color: isAiSpeaking ? COLORS.textStrong : COLORS.textBase
            }}
          >
            {connectionFailure?.kind === 'connection-error'
              ? connectionFailure.message
              : isAiSpeaking
                ? aiSpeechText
                : (userSpeechText || 'Listening for your voice...')}
          </Text>
        </Animated.View>

        {/* Bottom Control Actions */}
        <View className="items-center justify-center pb-12">
          {isConnected && (
            <View className="items-center gap-2">
              <TouchableOpacity
                onPress={toggleMute}
                activeOpacity={0.8}
                className="size-16 rounded-full items-center justify-center border shadow-md"
                style={{
                  borderColor: isMuted ? `${COLORS.error}20` : 'rgba(23,11,0,0.1)',
                  backgroundColor: isMuted ? `${COLORS.error}10` : 'white'
                }}
              >
                {isMuted ? (
                  <MicOff size={24} color={COLORS.error} />
                ) : (
                  <Mic size={24} color={COLORS.brand} />
                )}
              </TouchableOpacity>
              <Text className="text-xs text-text-weak font-medium mt-1" style={{ fontFamily: FONTS.sansMedium }}>
                {isMuted ? 'Muted' : 'Tap to mute'}
              </Text>
            </View>
          )}
          {connectionFailure?.kind === 'connection-error' && (
            <View className="w-full px-6 gap-3">
              <Button
                fullWidth
                onPress={() => { void connect(); }}
                className="h-14"
                textClassName="text-base font-semibold"
              >
                Try again
              </Button>
              <Button
                fullWidth
                onPress={handleEndCall}
                variant="outline"
                className="h-14 bg-card"
                textClassName="text-base"
              >
                Close
              </Button>
            </View>
          )}
        </View>

        {/* Voice settings drawer (Modal slide-in) */}
        {showSettings && (
          <Modal
            transparent
            visible={showSettings}
            animationType="none"
            onRequestClose={() => setShowSettings(false)}
          >
            <SafeAreaProvider>
            <View className="flex-1 bg-black/35 justify-end">
              {/* Tap backdrop to close */}
              <TouchableOpacity 
                activeOpacity={1} 
                className="absolute inset-0" 
                onPress={() => setShowSettings(false)} 
              />
              
              <SafeAreaView edges={['bottom']} style={styles.settingsSafeArea}>
              <Animated.View 
                entering={SlideInDown.springify().damping(22)}
                exiting={SlideOutDown}
                className="bg-white rounded-t-[40px] px-6 pt-6 pb-6 gap-6 shadow-2xl border-t border-stroke-weaker z-10"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>
                    AI voice setting
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowSettings(false)}
                    className="size-9 rounded-full bg-fill-weaker items-center justify-center"
                  >
                    <X size={18} color={COLORS.textBase} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="max-h-80 gap-3">
                  {VOICE_OPTIONS.map((voice) => {
                    const selected = voice.id === activeVoice.id;
                    return (
                      <TouchableOpacity
                        key={voice.id}
                        onPress={() => handleSelectVoice(voice)}
                        activeOpacity={0.7}
                        className="flex-row items-center justify-between p-4 rounded-2xl border mb-3"
                        style={{
                          borderColor: selected ? COLORS.brand : COLORS.strokeWeak,
                          backgroundColor: selected ? `${COLORS.brand}05` : 'white'
                        }}
                      >
                        <View className="flex-1 gap-1">
                          <Text className="text-base text-text-strong font-semibold" style={{ fontFamily: FONTS.sansSemi }}>
                            {voice.name}
                          </Text>
                          <Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sans }}>
                            {voice.description}
                          </Text>
                        </View>
                        {selected && (
                          <View className="size-6 rounded-full bg-brand items-center justify-center">
                            <Check size={12} color="white" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Animated.View>
              </SafeAreaView>
            </View>
            </SafeAreaProvider>
          </Modal>
        )}
      </SafeAreaView>
        )}
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  settingsSafeArea: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
});
