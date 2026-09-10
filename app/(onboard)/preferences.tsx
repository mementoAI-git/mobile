import React from 'react';
import {
  View,
  ScrollView,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { Logo, Button } from '@/components/ui';
import { SelectionCard } from '@/components/onboarding/SelectionChip';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import Animated, { FadeInDown, FadeInRight, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePreferencesLogic, TOTAL_STEPS, STEP_LABELS, ERROR_MESSAGES } from '@/hooks/use-preferences-logic';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const STEP_IMAGES: Record<number, any> = {
  1: require('../../assets/images/onboarding/1.png'),
  2: require('../../assets/images/onboarding/2.png'),
  3: require('../../assets/images/onboarding/3.png'),
  4: require('../../assets/images/onboarding/4.png'),
  5: require('../../assets/images/onboarding/5.png'),
  6: require('../../assets/images/onboarding/quill-ink.png'),
  7: require('../../assets/images/onboarding/chat-ai-orb.png'),
};

const AGE_BAND_OPTIONS = [
  { value: 'under_30', label: 'Under 30', icon: '🌱' },
  { value: '30s_40s', label: '30s–40s', icon: '🌿' },
  { value: '50s_60s', label: '50s–60s', icon: '🌳' },
  { value: '70_plus', label: '70 and older', icon: '🌲' },
  { value: 'prefer_not_say', label: "I'd rather not say", icon: '🙂' },
];

const MEMENTO_FOR_OPTIONS = [
  { value: 'children', label: 'My children', icon: '👶' },
  { value: 'grandchildren', label: 'My grandchildren', icon: '👴' },
  { value: 'partner_spouse', label: 'A partner or spouse', icon: '💑' },
  { value: 'close_friends', label: 'Close friends', icon: '🤝' },
  { value: 'future_generations', label: "Future generations I'll never meet", icon: '🌍' },
  { value: 'myself', label: 'Mostly for myself', icon: '✨' },
];

const PASSION_OPTIONS = [
  { value: 'food_cooking', label: 'Food & cooking', icon: '🍳' },
  { value: 'travel_places', label: 'Travel & places', icon: '✈️' },
  { value: 'faith_spirituality', label: 'Faith & spirituality', icon: '🕯️' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'sports_fitness', label: 'Sports & fitness', icon: '🏃' },
  { value: 'reading_learning', label: 'Reading & learning', icon: '📚' },
  { value: 'nature_outdoors', label: 'Nature & the outdoors', icon: '🌲' },
  { value: 'art_creativity', label: 'Art & creativity', icon: '🎨' },
  { value: 'family_history_heritage', label: 'Family history & heritage', icon: '📜' },
  { value: 'business_entrepreneurship', label: 'Business & entrepreneurship', icon: '💼' },
  { value: 'community_service', label: 'Community & service', icon: '🤲' },
  { value: 'technology', label: 'Technology', icon: '💻' },
];

const LIFE_CONTEXT_OPTIONS = [
  { value: 'still_working', label: "I'm still working", icon: '🔨' },
  { value: 'retired_slowing_down', label: "I'm retired", icon: '🌅' },
  { value: 'recent_loss', label: "I've lost someone close", icon: '🕊️' },
  { value: 'health_change', label: 'Health update', icon: '💚' },
  { value: 'major_milestone', label: "Major life milestone", icon: '🎯' },
  { value: 'life_stable', label: "Life is stable", icon: '☀️' },
  { value: 'none_of_these', label: "None of these", icon: '🙂' },
];

const MOTIVATION_OPTIONS = [
  { value: 'emotional_depth', label: 'People I love to truly know me', sublabel: 'The full picture, not just highlights', icon: '💛' },
  { value: 'memory_preservation', label: "Memories I'm afraid of losing", sublabel: 'Before they fade or disappear', icon: '🫙' },
  { value: 'external', label: 'Someone I love asked me', sublabel: "I'm here for them", icon: '🤍' },
  { value: 'practical', label: "Being practical about the future", sublabel: 'Getting things in order', icon: '🗂️' },
  { value: 'explorer', label: 'Exploring for now', sublabel: 'Just seeing what this is', icon: '🔍' },
];

const DIMENSION_OPTIONS = [
  { value: 'personal_history', label: 'Personal history', icon: '📖' },
  { value: 'relationships', label: 'Relationships', icon: '🤝' },
  { value: 'values_beliefs', label: 'Values & beliefs', icon: '💎' },
  { value: 'lessons_wisdom', label: 'Lessons & wisdom', icon: '🧠' },
  { value: 'health_wellbeing', label: 'Health & wellbeing', icon: '💚' },
  { value: 'career_purpose', label: 'Career & purpose', icon: '🚀' },
  { value: 'creativity', label: 'Creativity', icon: '🎨' },
  { value: 'spirituality', label: 'Spirituality', icon: '🕯️' },
];

const EXPRESSION_OPTIONS = [
  { value: 'voice', label: 'Talking: I prefer to speak', sublabel: 'Recording voice notes feels natural', icon: '🎙️' },
  { value: 'writing', label: 'Writing: taking my time', sublabel: 'Composing thoughts in words', icon: '✍️' },
  { value: 'media', label: 'Photos & videos', sublabel: 'Showing is easier than telling', icon: '📷' },
  { value: 'guided', label: 'Guided questions', sublabel: 'I need prompts to get started', icon: '💬' },
];

export default function PreferencesScreen() {
  const {
    scrollRef,
    step,
    state,
    saving,
    validationAttempted,
    nickname,
    canAdvance,
    handleNext,
    handleBack,
    handleSkip,
    updateState,
    toggle,
  } = usePreferencesLogic();

  const showError = validationAttempted && !canAdvance(step);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.onboardingCream }} edges={['top', 'bottom']}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-1">
        <Logo size="md" />
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} className="flex-row items-center gap-1">
          <Animated.Text className="text-text-weak" style={TYPE.label}>
            Skip
          </Animated.Text>
          <ChevronRight size={14} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Progress ──────────────────────────────────────────────────────── */}
      <View className="items-center gap-2 py-4">
        <View className="flex-row items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <Animated.View
              key={i}
              layout={LinearTransition}
              className={`rounded-full ${i < step ? 'bg-brand' : 'bg-brand/10'}`}
              style={{ width: i === step - 1 ? 24 : 8, height: 8 }}
            />
          ))}
        </View>
        <Animated.Text className=" text-text-weak tracking-widest uppercase mt-1" style={TYPE.eyebrow}>
          Step {step} of {TOTAL_STEPS} · {STEP_LABELS[step]}
        </Animated.Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {/* ── Image ───────────────────────────────────────────────────────── */}
          <View className="w-full h-56 items-center justify-center relative overflow-hidden">
            <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />
            <Animated.View
              key={`step-img-${step}`}
              entering={FadeInRight.springify()}
              className="size-40 rounded-full bg-white/40 border border-white/60 items-center justify-center shadow-sm"
            >
              <Image source={STEP_IMAGES[step]} style={{ width: 120, height: 120 }} resizeMode="contain" />
            </Animated.View>
          </View>

          <View style={{ paddingHorizontal: 32, gap: 24 }}>
            {/* ── Steps Content ─────────────────────────────────────────────── */}
            <Animated.View key={`step-content-${step}`} entering={FadeInDown.duration(400)} className="gap-6">
              {step === 1 && (
                <View className="gap-6">
                  <Animated.Text className=" text-text-strong leading-[36px]" style={TYPE.screenTitle}>
                    Okay, {nickname}. Let's get started.
                  </Animated.Text>
                  <View className="gap-4">
                    <Animated.Text className="text-text-strong" style={TYPE.bodyLarge}>
                      How old are you?
                    </Animated.Text>
                    {AGE_BAND_OPTIONS.map((opt) => (
                      <SelectionCard
                        key={opt.value}
                        label={opt.label}
                        icon={opt.icon}
                        selected={state.ageBand === opt.value}
                        onPress={() => {
                          Haptics.selectionAsync();
                          updateState(() => ({ ageBand: opt.value }));
                        }}
                        variant="radio"
                      />
                    ))}
                  </View>
                  <View className="gap-3">
                    <Animated.Text className="text-text-strong" style={TYPE.bodyLarge}>
                      Where are you from?
                    </Animated.Text>
                    <View className="bg-white/80 border border-stroke-weaker rounded-2xl px-4 h-14 justify-center">
                      <RNTextInput
                        value={state.whereFrom}
                        onChangeText={(v) => updateState(() => ({ whereFrom: v }))}
                        placeholder="City, country"
                        placeholderTextColor={COLORS.textMuted}
                        className="text-text-strong p-0 m-0"
                        style={TYPE.input}
                      />
                    </View>
                  </View>
                </View>
              )}

              {step === 2 && (
                <View className="gap-4">
                  <Animated.Text className=" text-text-strong leading-[36px]" style={TYPE.screenTitle}>
                    Who is this Memento mostly for?
                  </Animated.Text>
                  <Animated.Text className="text-text-weak -mt-2 mb-2" style={TYPE.label}>Select all that apply</Animated.Text>
                  {MEMENTO_FOR_OPTIONS.map((opt) => (
                    <SelectionCard
                      key={opt.value}
                      label={opt.label}
                      icon={opt.icon}
                      selected={state.mementoFor.includes(opt.value)}
                      onPress={() => updateState((s) => ({ mementoFor: toggle(s.mementoFor, opt.value) }))}
                    />
                  ))}
                </View>
              )}

              {step === 3 && (
                <View className="gap-4">
                  <Animated.Text className=" text-text-strong leading-[36px]" style={TYPE.screenTitle}>
                    What are your interests?
                  </Animated.Text>
                  <Animated.Text className="text-text-weak -mt-2 mb-2" style={TYPE.label}>Select as many as you like</Animated.Text>
                  <View className="flex-row flex-wrap gap-2.5">
                    {PASSION_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => updateState((s) => ({ passions: toggle(s.passions, opt.value) }))}
                        activeOpacity={0.7}
                        className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border shadow-sm ${state.passions.includes(opt.value) ? 'bg-brand border-brand' : 'bg-white/80 border-stroke-weaker'
                          }`}
                      >
                        <Animated.Text>{opt.icon}</Animated.Text>
                        <Animated.Text
                          className={state.passions.includes(opt.value) ? 'text-white' : 'text-text-strong'}
                          style={TYPE.buttonSmall}
                        >
                          {opt.label}
                        </Animated.Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {step === 4 && (
                <View className="gap-4">
                  <Animated.Text className=" text-text-strong leading-[36px]" style={TYPE.screenTitle}>
                    How would you describe your current life stage?
                  </Animated.Text>
                  {LIFE_CONTEXT_OPTIONS.map((opt) => (
                    <SelectionCard
                      key={opt.value}
                      label={opt.label}
                      icon={opt.icon}
                      selected={state.lifeContext.includes(opt.value)}
                      onPress={() => updateState((s) => ({ lifeContext: toggle(s.lifeContext, opt.value) }))}
                    />
                  ))}
                </View>
              )}

              {step === 5 && (
                <View className="gap-4">
                  <Animated.Text className=" text-text-strong leading-[36px]" style={TYPE.screenTitle}>
                    What is your main motivation?
                  </Animated.Text>
                  {MOTIVATION_OPTIONS.map((opt) => (
                    <SelectionCard
                      key={opt.value}
                      label={opt.label}
                      sublabel={opt.sublabel}
                      icon={opt.icon}
                      selected={state.motivationType === opt.value}
                      onPress={() => {
                        Haptics.selectionAsync();
                        updateState(() => ({ motivationType: opt.value }));
                      }}
                      variant="radio"
                    />
                  ))}
                </View>
              )}

              {step === 6 && (
                <View className="gap-4">
                  <Animated.Text className=" text-text-strong leading-[36px]" style={TYPE.screenTitle}>
                    What areas of life would you like to preserve?
                  </Animated.Text>
                  <View className="flex-row flex-wrap gap-2.5">
                    {DIMENSION_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => updateState((s) => ({ priorityDimensions: toggle(s.priorityDimensions, opt.value) }))}
                        activeOpacity={0.7}
                        className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border shadow-sm ${state.priorityDimensions.includes(opt.value) ? 'bg-brand border-brand' : 'bg-white/80 border-stroke-weaker'
                          }`}
                      >
                        <Animated.Text>{opt.icon}</Animated.Text>
                        <Animated.Text
                          className={state.priorityDimensions.includes(opt.value) ? 'text-white' : 'text-text-strong'}
                          style={TYPE.buttonSmall}
                        >
                          {opt.label}
                        </Animated.Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {step === 7 && (
                <View className="gap-4">
                  <Animated.Text className=" text-text-strong leading-[36px]" style={TYPE.screenTitle}>
                    Finally, how would you like to share your thoughts?
                  </Animated.Text>
                  <Animated.Text className="text-text-weak -mt-2 mb-2" style={TYPE.label}>Select up to 2 options</Animated.Text>
                  {EXPRESSION_OPTIONS.map((opt) => (
                    <SelectionCard
                      key={opt.value}
                      label={opt.label}
                      sublabel={opt.sublabel}
                      icon={opt.icon}
                      selected={state.expressionMode.includes(opt.value)}
                      onPress={() => {
                        updateState((s) => {
                          const already = s.expressionMode.includes(opt.value);
                          Haptics.selectionAsync();
                          if (already) return { expressionMode: s.expressionMode.filter((m) => m !== opt.value) };
                          if (s.expressionMode.length >= 2) return {};
                          return { expressionMode: [...s.expressionMode, opt.value] };
                        });
                      }}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <View className="px-8 pb-10 pt-4 bg-onboarding-cream gap-4 border-t border-white/40">
        {showError && (
          <Animated.Text entering={FadeInDown} className="text-center text-error" style={TYPE.metadata}>
            {ERROR_MESSAGES[step]}
          </Animated.Text>
        )}
        <View className="flex-row gap-4">
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            className="w-14 h-14 rounded-full border border-stroke-weak bg-white/60 items-center justify-center shadow-sm"
          >
            <ChevronLeft size={24} color={COLORS.textStrong} />
          </TouchableOpacity>
          <Button
            onPress={handleNext}
            loading={saving}
            className="flex-1 h-14 bg-brand rounded-full"
          >
            <Animated.Text className="text-white" style={TYPE.button}>
              {step === TOTAL_STEPS ? "Begin Journey" : 'Continue'}
            </Animated.Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const errorMessages: Record<number, string> = {
  1: 'Please select your age group.',
  2: 'Please select at least one recipient.',
  3: 'Tell us a bit about what you love.',
  4: 'Choose your current life context.',
  5: 'What brings you to Memento?',
  6: 'Pick at least one area to preserve.',
  7: 'How would you like to share?',
};
