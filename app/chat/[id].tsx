import React, { useState } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, ImageBackground, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoreVertical, ChevronLeft, Settings } from 'lucide-react-native';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatSkeleton } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useChatLogic } from '@/hooks/use-chat-logic';
import * as Haptics from 'expo-haptics';
import { VoiceModeOverlay } from '@/components/chat/VoiceModeOverlay';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function ChatScreen() {
  const {
    isPromptType,
    promptMemory,
    isStartingConversation,
    flatListRef,
    serverMessages,
    isLoading,
    allMessages,
    streaming,
    streamingText,
    send,
    stop,
    handleBack,
    handleActions,
  } = useChatLogic();

  const [voiceModeVisible, setVoiceModeVisible] = useState(false);

  const pulse = useSharedValue(0.7);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: pulse.value }],
  }));

  const isActuallyStreaming = streaming || isStartingConversation;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <ImageBackground source={PATTERN} className="flex-1" imageStyle={{ opacity: 0.3 }}>
        <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
          {/* Modern Header */}
          <View
            className="flex-row items-center gap-3 px-6 py-4 border-stroke-weaker/50 bg-transparent"
          >
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
            >
              <ChevronLeft size={20} color={COLORS.textBase} />
            </TouchableOpacity>
            <View className="flex-1">
              <Animated.Text
                className="text-lg text-text-strong"
                numberOfLines={1}
                style={{ fontFamily: FONTS.serif }}
              >
                {isPromptType ? (promptMemory?.title ?? 'Prompt Reflection') : (serverMessages?.title ?? 'Conversation')}
              </Animated.Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Animated.View className="size-1.5 rounded-full bg-success" style={pulseStyle} />
                {/* <Animated.Text className="text-[9px] text-success uppercase tracking-widest font-bold" style={{ fontFamily: FONTS.sansBold }}>
                  AI Companion
                </Animated.Text> */}
              </View>
            </View>
            <TouchableOpacity
              onPress={handleActions}
              activeOpacity={0.7}
              className="size-10 rounded-full items-center justify-center border border-stroke-weaker shadow-sm"
            >
              <MoreVertical size={20} color={COLORS.textWeak} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 relative bg-transparent">
            {isLoading && !allMessages.length ? (
              <ChatSkeleton />
            ) : (
              <FlatList
                ref={flatListRef}
                data={allMessages}
                inverted
                keyExtractor={(item, i) => item._id ?? String(i)}
                renderItem={({ item }) => <MessageBubble message={item} />}
                contentContainerClassName="px-5 pb-6 pt-20"
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  isActuallyStreaming ? (
                    streamingText ? (
                      <MessageBubble message={{ role: 'assistant', text: streamingText }} />
                    ) : (
                      <TypingIndicator />
                    )
                  ) : null
                }
                ListFooterComponent={
                  isPromptType && promptMemory ? (
                    <View className="mx-5 my-4 p-5 rounded-2xl border border-stroke-weaker bg-fill-weaker shadow-sm flex-row items-center justify-between">
                      <View className="flex-1 pr-4">
                        <Animated.Text
                          className="text-base text-text-strong leading-relaxed"
                          style={{ fontFamily: FONTS.serif }}
                        >
                          {promptMemory.title}
                        </Animated.Text>
                      </View>
                      <View className="size-8 rounded-full bg-fill-neutral-weakest items-center justify-center border border-stroke-weaker">
                        <Settings size={16} color={COLORS.textWeak} />
                      </View>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View className="items-center justify-center py-24 gap-8">
                    <Animated.View entering={FadeInUp.duration(600)} className="size-24 rounded-full bg-white border border-stroke-weaker items-center justify-center shadow-sm">
                      <Animated.Text className="text-4xl">🌱</Animated.Text>
                    </Animated.View>
                    <View className="items-center gap-3 px-10">
                      <Animated.Text
                        entering={FadeInDown.delay(200)}
                        className="text-[28px] text-text-strong text-center"
                        style={{ fontFamily: FONTS.serif }}
                      >
                        {isPromptType ? "Reflect & Grow" : "Your story grows here"}
                      </Animated.Text>
                      <Animated.Text
                        entering={FadeInDown.delay(300)}
                        className="text-[15px] text-text-weak text-center leading-relaxed"
                        style={{ fontFamily: FONTS.sans }}
                      >
                        {isPromptType
                          ? "Write your answer below or tap the microphone to reply with a voice note. Your AI companion will respond to help you deep dive!"
                          : "Share a memory, an emotion, or just say hello. Your AI companion is here to listen and help you preserve your legacy."
                        }
                      </Animated.Text>
                    </View>
                  </View>
                }
              />
            )}
          </View>

          {/* Floating Input */}
          <ChatInput 
            onSend={send} 
            onStop={stop} 
            onVoice={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setVoiceModeVisible(true); }}
            loading={isActuallyStreaming || isLoading} 
          />

          <VoiceModeOverlay 
            visible={voiceModeVisible} 
            onClose={() => setVoiceModeVisible(false)} 
            conversationTitle={isPromptType ? (promptMemory?.title ?? 'Prompt Reflection') : (serverMessages?.title ?? 'Conversation')}
          />
        </SafeAreaView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerGlass: {
    ...Platform.select({
      ios: {
        backgroundColor: COLORS.glass,
      },
    }),
  },
});
