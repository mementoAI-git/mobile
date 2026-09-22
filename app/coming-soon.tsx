import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  AudioWaveform,
  Headphones,
  Heart,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Volume2,
} from 'lucide-react-native';
import { Button } from '@/components/ui';
import { COLORS, FONTS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import {
  resolveComingSoonFeature,
  type ComingSoonBenefit,
} from '@/features/coming-soon/feature-catalog';
import { getBoundedModalScrollStyle } from '@/features/layout/modal-safe-area';
import { NativeModalSafeAreaBoundary } from '@/components/system/NativeModalSafeAreaBoundary';

const BENEFIT_ICONS = {
  headphones: Headphones,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  timer: Timer,
  heart: Heart,
} as const;

function BenefitRow({ benefit }: { benefit: ComingSoonBenefit }) {
  const Icon = BENEFIT_ICONS[benefit.icon];
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Icon size={21} color={COLORS.brand} strokeWidth={2} />
      </View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{benefit.title}</Text>
        <Text style={styles.benefitDescription}>{benefit.description}</Text>
      </View>
    </View>
  );
}

export default function ComingSoonScreen() {
  return (
    <NativeModalSafeAreaBoundary>
      <ComingSoonContent />
    </NativeModalSafeAreaBoundary>
  );
}

function ComingSoonContent() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const content = useMemo(() => resolveComingSoonFeature(feature), [feature]);

  const dismiss = useCallback(() => {
    if (feature === 'capsules') {
      router.replace('/(tabs)/overview');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/overview');
  }, [feature]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    dismiss();
  }, [dismiss]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <LinearGradient
        colors={[COLORS.onboardingAmberPale, COLORS.onboardingWarmWhite, COLORS.background]}
        locations={[0, 0.5, 1]}
        pointerEvents="none"
        style={styles.gradient}
      />

      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          accessibilityRole="button"
          activeOpacity={0.76}
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={COLORS.textStrong} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.hero}>
          <View style={styles.heroHaloLarge} />
          <View style={styles.heroHaloSmall} />
          <View style={styles.heroSpeaker}>
            {content.key === 'capsules' ? (
              <Timer size={54} color={COLORS.onboardingBrown} strokeWidth={1.7} />
            ) : (
              <Volume2 size={54} color={COLORS.onboardingBrown} strokeWidth={1.7} />
            )}
          </View>
          {content.key === 'capsules' ? (
            <Sparkles size={88} color={COLORS.onboardingAmber} strokeWidth={1.4} />
          ) : (
            <AudioWaveform size={88} color={COLORS.onboardingAmber} strokeWidth={1.4} />
          )}
        </View>

        <Text style={styles.eyebrow}>{content.eyebrow}</Text>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{content.description}</Text>

        <View style={styles.benefits}>
          {content.benefits.map((benefit) => (
            <BenefitRow key={benefit.title} benefit={benefit} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          className="h-14"
          fullWidth
          onPress={dismiss}
          size="lg"
                  >
          Got it
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scroll: getBoundedModalScrollStyle(),
  gradient: { ...StyleSheet.absoluteFill },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 64,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerSpacer: { width: 44 },
  content: {
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 28,
  },
  hero: {
    alignItems: 'center',
    height: 260,
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
    width: 300,
  },
  heroHaloLarge: {
    backgroundColor: COLORS.brandSubtle,
    borderRadius: 105,
    height: 210,
    position: 'absolute',
    width: 210,
  },
  heroHaloSmall: {
    backgroundColor: COLORS.onboardingAmberPale,
    borderRadius: 72,
    height: 144,
    position: 'absolute',
    width: 144,
  },
  heroSpeaker: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.strokeWeaker,
    borderRadius: 48,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    position: 'absolute',
    width: 96,
  },
  eyebrow: {
    color: COLORS.brand,
    ...TYPE.metadata,
    letterSpacing: 1.4,
    lineHeight: 16,
    textAlign: 'center',
  },
  title: {
    color: COLORS.textStrong,
    ...TYPE.screenTitle,
    lineHeight: 37,
    marginTop: 10,
    textAlign: 'center',
  },
  description: {
    color: COLORS.textBase,
    ...TYPE.body,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 330,
    textAlign: 'center',
  },
  benefits: { gap: 22, marginTop: 34, width: '100%' },
  benefitRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 14 },
  benefitIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.brandSubtle,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  benefitCopy: { flex: 1, paddingTop: 1 },
  benefitTitle: {
    color: COLORS.textStrong,
    ...TYPE.body,
    lineHeight: 20,
  },
  benefitDescription: {
    color: COLORS.textBase,
    ...TYPE.label,
    lineHeight: 20,
    marginTop: 2,
  },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
});
