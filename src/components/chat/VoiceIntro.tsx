import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AudioLines from 'lucide-react-native/icons/audio-lines';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import { Button } from '@/components/ui/Button';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';

const PHONE_ARTWORK = require('../../../assets/images/voices/voicemode-phone.png');

/** Web's smile speech bubble (Voiceinput.tsx `SmileBubbleIcon`). */
function SmileBubbleIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <Path d="M8 13.5s1.5 2 4 2 4-2 4-2" />
      <Path d="M9 9.5h.01M15 9.5h.01" />
    </Svg>
  );
}

const BENEFITS = [
  { Icon: SmileBubbleIcon, title: 'Intelligent, natural conversations', description: 'Senses & responds to interruptions, humour, etc' },
  { Icon: CircleUserRound, title: 'Personalized for you', description: 'Uses memory & custom instructions to shape responses' },
  { Icon: AudioLines, title: 'You’re in control', description: 'Audio recordings are transcribed to the chat.' },
] as const;

/**
 * First-time voice intro, ported from web `Voiceinput.tsx`. Shown before the
 * voice picker until the user has saved a voice.
 */
export function VoiceIntro({ onChooseVoice, onDismiss }: { onChooseVoice: () => void; onDismiss: () => void }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const { height } = useWindowDimensions();
  const heroHeight = Math.min(height * 0.36, 320);
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <LinearGradient colors={[colors.brandTint, 'transparent']} style={StyleSheet.absoluteFill} />
          <Image source={PHONE_ARTWORK} resizeMode="contain" style={styles.phone} accessibilityIgnoresInvertColors />
        </View>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.body}>
          <Text accessibilityRole="header" style={[TYPE.uiTitle, styles.title]}>Give Voicemode a Spin</Text>
          <View style={styles.benefits}>
            {BENEFITS.map(({ Icon, title, description }) => (
              <View key={title} style={styles.benefit}>
                <View style={styles.benefitIcon}>
                  <Icon size={20} color={colors.brand} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={[TYPE.buttonSmall, styles.benefitTitle]}>{title}</Text>
                  <Text style={[TYPE.bodySmall, styles.benefitDescription]}>{description}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
      <View style={styles.actions}>
        <Button voiceLabel={false} fullWidth rounded="full" style={styles.button} onPress={onChooseVoice}>
          Choose a voice
        </Button>
        <Button voiceLabel={false} fullWidth rounded="full" variant="ghost" style={[styles.button, styles.dismiss]} onPress={onDismiss}>
          Dismiss
        </Button>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  phone: { height: '100%', maxHeight: 240, width: '100%' },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 24 },
  title: { color: colors.textStrong, textAlign: 'center' },
  // A set width: in a shrink-wrapped column the flex:1 text gets none and disappears.
  benefits: { alignSelf: 'center', width: '100%', maxWidth: 300, gap: 16 },
  benefit: { flexDirection: 'row', gap: 10 },
  benefitIcon: { marginTop: 2 },
  benefitText: { flex: 1 },
  benefitTitle: { color: colors.textStrong },
  benefitDescription: { color: colors.textWeak },
  actions: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 12 },
  button: { height: 48, minHeight: 48 },
  dismiss: { backgroundColor: colors.fillWeak },
});
