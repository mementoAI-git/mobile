import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronLeft, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui';
import { usePricingLogic, DEFERRED_FEATURES } from '@/hooks/use-pricing-logic';
import { COLORS, FONTS } from '@/constants/tokens';

export default function PricingScreen() {
  const {
    interval,
    changeInterval,
    proPrice,
    legacyPrice,
    table,
    handleCheckout,
    formatMoney,
    router,
  } = usePricingLogic();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-2 px-4 pt-5 pb-3 bg-background">
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) { router.back(); } else { router.replace('/(tabs)/overview'); } }} className="p-1.5 -ml-1.5">
          <ChevronLeft size={22} color={COLORS.textBase} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 pb-16 pt-2">
        <View className="items-center mb-8">
          <Animated.Text
            className="text-3xl text-text-strong text-center mb-3"
            style={{ fontFamily: FONTS.serif }}
          >
            Plans that grow with your memories
          </Animated.Text>
          <Animated.Text
            className="text-sm text-text-weak text-center mb-6 leading-relaxed"
            style={{ fontFamily: FONTS.sans }}
          >
            Prices shown in US dollars. Manage your subscriptions natively or on the web.
          </Animated.Text>

          {/* Toggle */}
          <View className="flex-row bg-fill-weaker p-1 rounded-full border border-stroke-weaker">
            <TouchableOpacity
              onPress={() => changeInterval('monthly')}
              className={`px-6 py-2.5 rounded-full ${interval === 'monthly' ? 'bg-white shadow-sm' : ''}`}
            >
              <Animated.Text
                className={`text-sm ${interval === 'monthly' ? 'text-text-strong font-medium' : 'text-text-weak'}`}
                style={{ fontFamily: interval === 'monthly' ? FONTS.sansMedium : FONTS.sans }}
              >
                Monthly
              </Animated.Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => changeInterval('annual')}
              className={`px-6 py-2.5 rounded-full ${interval === 'annual' ? 'bg-white shadow-sm' : ''}`}
            >
              <Animated.Text
                className={`text-sm ${interval === 'annual' ? 'text-text-strong font-medium' : 'text-text-weak'}`}
                style={{ fontFamily: interval === 'annual' ? FONTS.sansMedium : FONTS.sans }}
              >
                Annual
              </Animated.Text>
            </TouchableOpacity>
          </View>
          {interval === 'annual' && (
            <Animated.Text
              className="text-xs text-text-weak mt-3"
              style={{ fontFamily: FONTS.sans }}
            >
              Billed annually. Monthly equivalent shown below.
            </Animated.Text>
          )}
        </View>

        <View className="gap-5">
          {/* Free Plan */}
          <Animated.View entering={FadeInDown.duration(600)} className="bg-card border border-stroke-weaker rounded-3xl p-6 shadow-sm">
            <Animated.Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>Free</Animated.Text>
            <Animated.Text className="text-sm text-text-weak mt-1" style={{ fontFamily: FONTS.sans }}>Capture and reflect at your own pace.</Animated.Text>
            <View className="flex-row items-baseline mt-5">
              <Animated.Text className="text-4xl text-text-strong" style={{ fontFamily: FONTS.serif }}>$0</Animated.Text>
              <Animated.Text className="text-sm text-text-weak ml-1" style={{ fontFamily: FONTS.sans }}>/mo</Animated.Text>
            </View>
            <Button variant="outline" className="mt-6 w-full" onPress={() => router.replace('/(tabs)/overview')}>
              Current Plan
            </Button>
            <View className="mt-6 gap-3">
              <View className="flex-row items-center gap-2">
                <Check size={16} color={COLORS.success} />
                <Animated.Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sans }}>Core chat & memories</Animated.Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Check size={16} color={COLORS.success} />
                <Animated.Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sans }}>Standard uploads & limits</Animated.Text>
              </View>
            </View>
          </Animated.View>

          {/* Pro Plan */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} className="bg-card border-2 border-text-strong rounded-3xl p-6 shadow-md relative mt-2">
            <View className="absolute -top-3 self-center bg-text-strong px-3 py-1 rounded-full">
              <Animated.Text className="text-white text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: FONTS.sansBold }}>Most popular</Animated.Text>
            </View>
            <Animated.Text className="text-xl text-text-strong mt-1" style={{ fontFamily: FONTS.serif }}>Pro</Animated.Text>
            <Animated.Text className="text-sm text-text-weak mt-1" style={{ fontFamily: FONTS.sans }}>For power users who live in Memento daily.</Animated.Text>
            <View className="flex-row items-baseline mt-5">
              <Animated.Text className="text-4xl text-text-strong" style={{ fontFamily: FONTS.serif }}>{formatMoney(proPrice)}</Animated.Text>
              <Animated.Text className="text-sm text-text-weak ml-1" style={{ fontFamily: FONTS.sans }}>/mo</Animated.Text>
            </View>
            {interval === 'annual' && (
              <Animated.Text className="text-xs text-text-weak mt-1" style={{ fontFamily: FONTS.sans }}>Billed as {formatMoney(table.pro.annual)} per year</Animated.Text>
            )}
            <Button className="mt-6 w-full" onPress={() => handleCheckout('pro')}>
              Start 14-day trial
            </Button>
            <View className="mt-6 gap-3">
              <View className="flex-row items-center gap-2">
                <Check size={16} color={COLORS.success} />
                <Animated.Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sans }}>Voice mode</Animated.Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Check size={16} color={COLORS.success} />
                <Animated.Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sans }}>Supermemory</Animated.Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Check size={16} color={COLORS.success} />
                <Animated.Text className="text-sm text-text-strong" style={{ fontFamily: FONTS.sans }}>Higher limits & storage</Animated.Text>
              </View>
            </View>
          </Animated.View>

          {/* Legacy Plan */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} className="bg-card border border-stroke-weaker rounded-3xl p-6 shadow-sm mt-2">
            <Animated.Text className="text-xl text-text-strong" style={{ fontFamily: FONTS.serif }}>Legacy</Animated.Text>
            <Animated.Text className="text-sm text-text-weak mt-1" style={{ fontFamily: FONTS.sans }}>Maximum preservation and future roadmap perks.</Animated.Text>
            <View className="flex-row items-baseline mt-5">
              <Animated.Text className="text-4xl text-text-strong" style={{ fontFamily: FONTS.serif }}>{formatMoney(legacyPrice)}</Animated.Text>
              <Animated.Text className="text-sm text-text-weak ml-1" style={{ fontFamily: FONTS.sans }}>/mo</Animated.Text>
            </View>
            {interval === 'annual' && (
              <Animated.Text className="text-xs text-text-weak mt-1" style={{ fontFamily: FONTS.sans }}>Billed as {formatMoney(table.legacy.annual)} per year</Animated.Text>
            )}
            <Animated.Text className="text-sm text-text-weak mt-4" style={{ fontFamily: FONTS.sans }}>
              Lifetime: <Animated.Text className="font-medium text-text-strong" style={{ fontFamily: FONTS.sansSemi }}>{formatMoney(table.legacy.lifetime)}</Animated.Text>
            </Animated.Text>
            <Button variant="secondary" className="mt-5 w-full" onPress={() => handleCheckout('legacy')}>
              Start 14-day trial
            </Button>
            <Button variant="outline" className="mt-3 w-full" onPress={() => handleCheckout('lifetime')}>
              Buy lifetime
            </Button>
          </Animated.View>
        </View>

        <View className="mt-12 mb-8">
          <Animated.Text className="text-2xl text-text-strong mb-2" style={{ fontFamily: FONTS.serif }}>On the roadmap</Animated.Text>
          <Animated.Text className="text-sm text-text-weak mb-5 leading-relaxed" style={{ fontFamily: FONTS.sans }}>
            These items are shown for transparency. They are not available to purchase yet and have no enforcement in the app.
          </Animated.Text>
          <View className="bg-fill-weaker border border-stroke-weaker rounded-2xl overflow-hidden">
            {DEFERRED_FEATURES.map((item, idx) => (
              <View key={item.name} className={`p-4 flex-row justify-between items-center ${idx !== DEFERRED_FEATURES.length - 1 ? 'border-b border-stroke-weaker' : ''}`}>
                <Animated.Text className="text-sm text-text-strong flex-1" style={{ fontFamily: FONTS.sans }}>{item.name}</Animated.Text>
                <Animated.Text className="text-xs text-text-weak" style={{ fontFamily: FONTS.sansMedium }}>{item.tier} · {item.target}</Animated.Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
