import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, ImageBackground, Image, TouchableOpacity } from 'react-native';
import { Controller } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { Button, TextInput, Logo } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useNicknameLogic } from '@/hooks/use-nickname-logic';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');
const NICKNAME_IMG = require('../../assets/images/onboarding/quill-ink.png');

export default function NicknameScreen() {
  const {
    control,
    handleSubmit,
    onSubmit,
    handleSkip,
    errors,
    isSubmitting,
  } = useNicknameLogic();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.onboardingCream }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-row items-center justify-between px-6 pt-2">
          <Logo size="md" />
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.7}
            className="flex-row items-center gap-1"
          >
            <Animated.Text className="text-sm text-text-base" style={{ fontFamily: FONTS.sansMedium }}>
              Skip
            </Animated.Text>
            <ChevronRight size={16} color={COLORS.textBase} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerClassName="flex-grow pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInUp.duration(600)}
            className="w-full h-56 items-center justify-center relative"
          >
            <ImageBackground
              source={PATTERN}
              className="absolute inset-0 opacity-[0.03]"
              resizeMode="repeat"
            />
            <View className="size-40 rounded-full bg-white/40 border border-white/60 items-center justify-center shadow-sm">
              <Image
                source={NICKNAME_IMG}
                style={{ width: 120, height: 120 }}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <View className="px-8 -mt-4 mb-8">
            <Animated.Text
              entering={FadeInDown.delay(200).springify()}
              className=" text-text-strong leading-[40px] text-center" style={TYPE.displayTitle}
            >
              How should we{"\n"}address you?
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(300).duration(500)}
              className="text-base text-text-base text-center mt-3 leading-relaxed"
              style={{ fontFamily: FONTS.sans }}
            >
              We'll use these to personalize your experience and how Memento talks to you.
            </Animated.Text>
          </View>

          <View className="px-8 gap-6">
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Animated.View entering={FadeInDown.delay(400)} className="gap-2">
                  <Animated.Text className="text-sm font-semibold text-text-base ml-1" style={{ fontFamily: FONTS.sansSemi }}>
                    Your Full Name
                  </Animated.Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Jane Okafor"
                    error={errors.fullName?.message}
                    className="h-14 bg-white/80 border-stroke-weaker rounded-2xl px-4"
                  />
                </Animated.View>
              )}
            />

            <Controller
              control={control}
              name="nickname"
              render={({ field: { onChange, onBlur, value } }) => (
                <Animated.View entering={FadeInDown.delay(500)} className="gap-2">
                  <Animated.Text className="text-sm font-semibold text-text-base ml-1" style={{ fontFamily: FONTS.sansSemi }}>
                    Preferred Nickname
                  </Animated.Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. Janie, Dad, Chef Mike"
                    error={errors.nickname?.message}
                    className="h-14 bg-white/80 border-stroke-weaker rounded-2xl px-4"
                  />
                  <Animated.Text className="text-xs text-text-weak ml-1 mt-0.5" style={{ fontFamily: FONTS.sans }}>
                    This is the name your AI companion will use.
                  </Animated.Text>
                </Animated.View>
              )}
            />
          </View>

          <View className="px-8 mt-12">
            <Animated.View entering={FadeInDown.delay(600)}>
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={isSubmitting}
                fullWidth
                size="lg"
                className="h-14 bg-brand rounded-full shadow-md shadow-brand/10"
              >
                Continue
              </Button>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
