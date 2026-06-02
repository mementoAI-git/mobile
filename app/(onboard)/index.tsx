import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Logo } from '@/components/ui';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, FONTS } from '@/constants/tokens';
import Animated, { FadeInDown } from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

const WELCOME_IMG = require('../../assets/images/onboarding/welcome-image.png');
const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function OnboardWelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Logo size="md" />
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/overview')}
          className="flex-row items-center gap-1"
        >
          <Text className="text-sm text-text-base" style={{ fontFamily: FONTS.sansMedium }}>
            Skip for now
          </Text>
          <ChevronRight size={16} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="pb-12">
        <View className="relative w-full h-[320px] mb-6">
          <ImageBackground source={PATTERN} className="absolute inset-0 opacity-40" />
          <Animated.Image
            entering={FadeInDown.delay(200).springify()}
            source={WELCOME_IMG}
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute bottom-0 left-0 right-0 h-32 bg-white/20" />
        </View>

        <View className="px-6 gap-3">
          <AnimatedText
            entering={FadeInDown.delay(400).springify()}
            className="text-[36px] text-text-strong leading-[44px]"
            style={{ fontFamily: FONTS.serif }}
          >
            Hello, Welcome to Memento
          </AnimatedText>
          <Animated.Text
            entering={FadeInDown.delay(500).springify()}
            className="text-base text-text-base leading-relaxed"
            style={{ fontFamily: FONTS.sans }}
          >
            I'm your personal interactive companion for self-reflection, memory, and legacy. Together, we'll capture your stories and experience, one thought, one moment at a time.
          </Animated.Text>
        </View>

        <View className="px-6 mt-10 gap-6">
          <Text className="text-sm font-bold text-brand uppercase tracking-wider" style={{ fontFamily: FONTS.sansBold }}>
            What can you do on Memento?
          </Text>

          <FeatureItem
            icon="✍️"
            title="Remember and reflect"
            description="Save your thoughts, experiences, and lessons in one place. I'll help you reflect on them and keep the memories alive."
          />
          <FeatureItem
            icon="📱"
            title="Converse with your legacy companion"
            description="Talk to your legacy companion — shaped by your stories and values. It learns from you, grows with you, and speaks in your voice."
          />
          <FeatureItem
            icon="🤝"
            title="Share your life with the people who matter"
            description="Invite loved ones to hear your stories, insights, and memories when you choose — privately and securely."
          />
        </View>

        <View className="pt-6 border-t border-stroke-weak gap-3">
          <Text className="text-xs font-bold text-text-disabled uppercase tracking-widest" style={{ fontFamily: FONTS.sansBold }}>
            Memento is private by design
          </Text>
          <Text className="text-xs text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
            Your entries on Memento are encrypted and only visible to you. You decide what to share, when to share, and with whom.
          </Text>
        </View>

        <View className="px-6 mt-10">
          <Button
            onPress={() => router.push('/(onboard)/nickname')}
            size="lg"
            className="h-14 bg-brand rounded-full"
          >
            <Text className="text-base font-bold text-white" style={{ fontFamily: FONTS.sansBold }}>Continue</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View className="flex-row gap-4">
      <View className="size-12 rounded-2xl bg-fill-weaker border border-stroke-weaker items-center justify-center">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-lg text-text-strong" style={{ fontFamily: FONTS.serif }}>
          {title}
        </Text>
        <Text className="text-sm text-text-base leading-relaxed" style={{ fontFamily: FONTS.sans }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
