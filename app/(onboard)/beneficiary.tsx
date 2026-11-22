import React from 'react';
import { View, ScrollView } from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SelectionChip } from '@/components/onboarding/SelectionChip';
import { RELATIONSHIP_OPTIONS } from '@/constants/onboarding';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Heart from 'lucide-react-native/icons/heart';
import Mail from 'lucide-react-native/icons/mail';
import User from 'lucide-react-native/icons/user';
import { ONBOARDING_BUTTON_STYLE } from '@/components/onboarding/OnboardingShell';
import { Button, TextInput, Logo } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useBeneficiaryLogic } from '@/hooks/use-beneficiary-logic';

export default function BeneficiaryOnboardScreen() {
  const {
    name,
    setName,
    email,
    setEmail,
    relationship,
    setRelationship,
    isPending,
    handleAdd,
    handleComplete,
    isFormValid,
  } = useBeneficiaryLogic();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.onboardingCream }} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View className="flex-row items-center justify-between px-4 pt-2">
        <Logo size="md" />
        <TouchableOpacity
          onPress={handleComplete}
          activeOpacity={0.7}
          className="flex-row items-center gap-1"
        >
          <Animated.Text className="text-text-base" style={TYPE.label}>
            Skip
          </Animated.Text>
          <ChevronRight size={16} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow px-4 pt-10 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(600)} className="mb-10 items-center">
          <View className="size-16 bg-brand/10 rounded-full items-center justify-center mb-6">
            <Heart size={32} color={COLORS.brand} fill={COLORS.brand} />
          </View>
          <Animated.Text
            className="text-text-strong text-center" style={TYPE.onboardingTitle}
          >
            Add a trusted{"\n"}person
          </Animated.Text>
          <Animated.Text
            className="text-text-base mt-4 leading-relaxed text-center"
            style={TYPE.body}>
            A connection can receive your memories and time capsules if you're away.
          </Animated.Text>
        </Animated.View>

        <View className="gap-8 flex-1">
          <Animated.View entering={FadeInDown.delay(200)} className="gap-2">
            <View className="flex-row items-center gap-2 mb-1">
              <User size={16} color={COLORS.textWeak} />
              <Animated.Text className="text-text-base" style={TYPE.label}>
                Their Name
              </Animated.Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              className="h-14 bg-white/80 border-stroke-weaker rounded-2xl px-4"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300)} className="gap-2">
            <View className="flex-row items-center gap-2 mb-1">
              <Mail size={16} color={COLORS.textWeak} />
              <Animated.Text className="text-text-base" style={TYPE.label}>
                Their Email
              </Animated.Text>
            </View>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="their@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="h-14 bg-white/80 border-stroke-weaker rounded-2xl px-4"
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400)} className="gap-3">
            <Animated.Text className="text-text-base ml-1" style={TYPE.label}>
              Relationship
            </Animated.Text>
            <View className="flex-row flex-wrap gap-2">
              {RELATIONSHIP_OPTIONS.map((r) => (
                <SelectionChip
                  key={r}
                  label={r}
                  selected={relationship === r}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRelationship(r);
                  }}
                />
              ))}
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(500)} className="mt-12">
          <Button
            onPress={handleAdd}
            loading={isPending}
            fullWidth
            size="lg"
            rounded="full"
            style={ONBOARDING_BUTTON_STYLE}
            className={`shadow-md ${isFormValid ? 'bg-brand shadow-brand/20' : 'bg-brand-weak shadow-none'}`}
          >
            <Animated.Text className="text-white" style={TYPE.button}>
              {isFormValid ? 'Add & Finish Setup' : 'Finish Setup'}
            </Animated.Text>
          </Button>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
