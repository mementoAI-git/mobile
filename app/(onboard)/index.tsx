import React from 'react';
import { View, Text, ImageBackground } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Logo } from '@/components/ui';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useFirstRunOnboarding } from '@/hooks/use-first-run-onboarding';

const AnimatedText = Animated.createAnimatedComponent(Text);

const WELCOME_IMG = require('../../assets/images/onboarding/welcome-image.webp');
const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

export default function OnboardWelcomeScreen() {
  const router = useRouter();
  const { handleSkip, isSkipping } = useFirstRunOnboarding();

  const scrollY = useSharedValue(0);
  const titleY = useSharedValue(340);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerLogoAnimatedStyle = useAnimatedStyle(() => {
    // Reveal top wordmark as the hero title approaches and scrolls past the header
    const threshold = Math.max(titleY.value - 60, 100);
    const opacity = interpolate(
      scrollY.value,
      [threshold, threshold + 50],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [threshold, threshold + 50],
      [8, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Animated.View style={headerLogoAnimatedStyle}>
          <Logo size="md" />
        </Animated.View>
        <TouchableOpacity
          onPress={handleSkip}
          disabled={isSkipping}
          className="flex-row items-center gap-1"
        >
          <Text className="text-text-base" style={TYPE.label}>
            Skip for now
          </Text>
          <ChevronRight size={16} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerClassName="pb-12"
      >
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

        <View
          onLayout={(e) => {
            titleY.value = e.nativeEvent.layout.y;
          }}
          className="px-6 gap-3"
        >
          <AnimatedText
            entering={FadeInDown.delay(400).springify()}
            className=" text-text-strong leading-[44px]" style={TYPE.displayTitle}
          >
            Hello, Welcome to Memento
          </AnimatedText>
          <Animated.Text
            entering={FadeInDown.delay(500).springify()}
            className="text-text-base leading-relaxed"
            style={TYPE.body}>
            I'm your personal interactive companion for self-reflection, memory, and legacy. Together, we'll capture your stories and experience, one thought, one moment at a time.
          </Animated.Text>
        </View>

        <View className="px-6 mt-10 gap-6">
          <Text className="text-brand uppercase tracking-wider" style={TYPE.label}>
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

        <View className="px-6 mt-10">
          <View className="pt-6 border-t border-stroke-weak gap-2">
            <Text className="text-text-muted uppercase tracking-widest" style={TYPE.eyebrow}>
              Memento is private by design
            </Text>
            <Text className="text-text-weak leading-relaxed" style={TYPE.bodySmall}>
              Your entries on Memento are encrypted and only visible to you. You decide what to share, when to share, and with whom.
            </Text>
          </View>
        </View>

        <View className="px-6 mt-10">
          <Button
            onPress={() => router.push('/(onboard)/nickname')}
            size="lg"
            className="h-14 bg-brand rounded-full"
          >
            <Text className="text-white" style={TYPE.button}>Continue</Text>
          </Button>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View className="flex-row gap-4">
      <View className="size-12 rounded-2xl bg-fill-weaker border border-stroke-weaker items-center justify-center">
        <Text className="" style={TYPE.sectionTitle}>{icon}</Text>
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-text-strong" style={TYPE.body}>
          {title}
        </Text>
        <Text className="text-text-base leading-relaxed" style={TYPE.label}>
          {description}
        </Text>
      </View>
    </View>
  );
}
