import React from 'react';
import { View, ScrollView, StyleSheet, Platform, ImageBackground, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Plus, Trash2, Mail, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Avatar, Button, Spinner, Badge, Skeleton } from '@/components/ui';
import { useBeneficiariesSettingsLogic } from '@/hooks/use-beneficiaries-settings-logic';
import { COLORS, FONTS } from '@/constants/tokens';

const PATTERN = require('../../assets/images/backgrounds/welcome_bg.png');

function BeneficiariesSkeleton() {
  return (
    <View className="flex-grow p-6 gap-4">
      {/* Intro info box skeleton */}
      <Skeleton className="h-12 w-[90%] rounded-xl mb-2" />

      {/* Row items skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="bg-white rounded-[24px] border border-stroke-weaker p-5 flex-row items-center gap-4 shadow-sm">
          <Skeleton className="size-12 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-5 w-[45%] rounded-md" />
            <Skeleton className="h-3.5 w-[75%] rounded-md" />
            <Skeleton className="h-4 w-16 rounded-full mt-1" />
          </View>
          <View className="gap-2">
            <Skeleton className="size-10 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function BeneficiariesSettingsScreen() {
  const {
    beneficiaries,
    isLoading,
    handleRemove,
    handleResend,
    handleAdd,
    openSheet,
    router,
  } = useBeneficiariesSettingsLogic();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); router.back(); }}
              className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center shadow-sm"
            >
              <ChevronLeft size={22} color={COLORS.textBase} />
            </TouchableOpacity>
            <Animated.Text
              className="text-[28px] text-text-strong"
              style={{ fontFamily: FONTS.serif }}
            >
              Trustees
            </Animated.Text>
          </View>
          <View className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center">
            <Plus size={22} color={COLORS.textWeak} />
          </View>
        </View>
        <BeneficiariesSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            className="size-11 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center shadow-sm"
          >
            <ChevronLeft size={22} color={COLORS.textBase} />
          </TouchableOpacity>
          <Animated.Text
            className="text-[28px] text-text-strong"
            style={{ fontFamily: FONTS.serif }}
          >
            Trustees
          </Animated.Text>
        </View>
        <TouchableOpacity
          onPress={handleAdd}
          className="size-11 rounded-full bg-brand items-center justify-center shadow-lg shadow-brand/20"
        >
          <Plus size={22} color="white" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        <ImageBackground source={PATTERN} className="absolute inset-0 opacity-[0.03]" resizeMode="repeat" />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-6 pb-24 gap-4">
          <Animated.View entering={FadeInDown.duration(600)} className="pt-2 pb-4">
            <Animated.Text className="text-base text-text-weak leading-relaxed" style={{ fontFamily: FONTS.sans }}>
              These are the trusted people who will receive your memories and capsules according to your wishes.
            </Animated.Text>
          </Animated.View>

          {beneficiaries?.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200)} className="items-center py-24 gap-8">
              <View className="size-28 rounded-full bg-brand/5 border border-brand/10 items-center justify-center">
                <ShieldCheck size={52} color={COLORS.brand} strokeWidth={1.2} />
              </View>
              <View className="items-center gap-3">
                <Animated.Text
                  className="text-2xl text-text-strong text-center"
                  style={{ fontFamily: FONTS.serif }}
                >
                  Protect your legacy
                </Animated.Text>
                <Animated.Text
                  className="text-base text-text-weak text-center px-8 leading-relaxed"
                  style={{ fontFamily: FONTS.sans }}
                >
                  Add trusted people who can receive your memories and time capsules in the future.
                </Animated.Text>
              </View>
              <Button
                onPress={() => openSheet('add-beneficiary')}
                size="lg"
                className="px-10 rounded-full shadow-lg shadow-brand/20"
              >
                <Animated.Text className="text-white font-bold" style={{ fontFamily: FONTS.sansBold }}>Add First Trustee</Animated.Text>
              </Button>
            </Animated.View>
          ) : (
            beneficiaries?.map((b, idx) => (
              <Animated.View
                key={b._id}
                entering={FadeInDown.delay(100 * idx)}
                style={styles.cardShadow}
                className="bg-white rounded-[24px] border border-stroke-weaker p-5 flex-row items-center gap-4"
              >
                <Avatar name={b.name} size="lg" className="border-2 border-brand/5" />
                <View className="flex-1 gap-1">
                  <Animated.Text
                    className="text-lg text-text-strong leading-tight"
                    style={{ fontFamily: FONTS.serif }}
                  >
                    {b.name || 'Pending Invitation'}
                  </Animated.Text>
                  <Animated.Text
                    className="text-xs text-text-weak"
                    numberOfLines={1}
                    style={{ fontFamily: FONTS.sansMedium }}
                  >
                    {b.email}
                  </Animated.Text>
                  <View className="flex-row mt-1">
                    <Badge
                      label={b.status === 'pending' ? 'Invited' : 'Verified'}
                      variant={b.status === 'pending' ? 'warning' : 'success'}
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <TouchableOpacity
                    onPress={() => handleRemove(b._id ?? '', b.name)}
                    className="size-10 rounded-full items-center justify-center border"
                    style={{ backgroundColor: `${COLORS.error}10`, borderColor: `${COLORS.error}20` }}
                  >
                    <Trash2 size={16} color={COLORS.error} />
                  </TouchableOpacity>
                  {b.status === 'pending' && (
                    <TouchableOpacity
                      onPress={() => handleResend(b.email)}
                      className="size-10 rounded-full bg-fill-weaker border border-stroke-weaker items-center justify-center"
                    >
                      <Mail size={16} color={COLORS.textBase} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#170B00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
