import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SelectionChip } from '@/components/onboarding/SelectionChip';
import { RELATIONSHIP_OPTIONS } from '@/constants/onboarding';
import { ChevronRight, Heart, Mail, User } from 'lucide-react-native';
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
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Logo size="md" />
        <TouchableOpacity
          onPress={handleComplete}
          activeOpacity={0.7}
          className="flex-row items-center gap-1"
        >
          <Animated.Text className="text-sm text-text-base" style={{ fontFamily: FONTS.sansMedium }}>
            Skip
          </Animated.Text>
          <ChevronRight size={16} color={COLORS.textWeak} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow px-8 pt-10 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(600)} className="mb-10 items-center">
          <View className="size-16 bg-brand/10 rounded-full items-center justify-center mb-6">
            <Heart size={32} color={COLORS.brand} fill={COLORS.brand} />
          </View>
          <Animated.Text
            className=" text-text-strong leading-[40px] text-center" style={TYPE.displayTitle}
          >
            Add a trusted{"\n"}person
          </Animated.Text>
          <Animated.Text
            className="text-base text-text-base mt-4 leading-relaxed text-center"
            style={{ fontFamily: FONTS.sans }}
          >
            A beneficiary can receive your memories and time capsules if you're away.
          </Animated.Text>
        </Animated.View>

        <View className="gap-8 flex-1">
          <Animated.View entering={FadeInDown.delay(200)} className="gap-2">
            <View className="flex-row items-center gap-2 mb-1">
              <User size={16} color={COLORS.textWeak} />
              <Animated.Text className="text-sm font-semibold text-text-base" style={{ fontFamily: FONTS.sansSemi }}>
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
              <Animated.Text className="text-sm font-semibold text-text-base" style={{ fontFamily: FONTS.sansSemi }}>
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
            <Animated.Text className="text-sm font-semibold text-text-base ml-1" style={{ fontFamily: FONTS.sansSemi }}>
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
            className={`h-14 rounded-full shadow-md ${isFormValid ? 'bg-brand shadow-brand/20' : 'bg-brand-weak shadow-none'}`}
          >
            <Animated.Text className="text-white font-bold" style={{ fontFamily: FONTS.sansBold }}>
              {isFormValid ? 'Add & Finish Setup' : 'Finish Setup'}
            </Animated.Text>
          </Button>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
