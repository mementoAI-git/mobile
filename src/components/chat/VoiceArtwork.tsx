import React from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { VoiceDefinition, VoiceId } from '@/features/chat/voice-catalog';

// Add the final static require() entries here when the six image files arrive.
const VOICE_ARTWORK_SOURCES: Partial<Record<VoiceId, ImageSourcePropType>> = {
  denver: require('../../../assets/images/voices/voice-denver.webp'),
  sue: require('../../../assets/images/voices/voice-sue.webp'),
  josef: require('../../../assets/images/voices/voice-josef.webp'),
  hannah: require('../../../assets/images/voices/voice-hannah.webp'),
};

interface VoiceArtworkProps {
  voice: VoiceDefinition;
  size: number;
}

export function VoiceArtwork({ voice, size }: VoiceArtworkProps) {
  const source = VOICE_ARTWORK_SOURCES[voice.id];
  return (
    <View accessibilityLabel={`${voice.name} voice artwork`} style={{ borderRadius: size / 2, height: size, overflow: 'hidden', width: size }}>
      {source ? (
        <Image source={source} resizeMode="cover" style={styles.fill} />
      ) : (
        <LinearGradient
          colors={voice.placeholderColors}
          end={{ x: 0.9, y: 0.85 }}
          start={{ x: 0.1, y: 0.05 }}
          style={styles.fill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { height: '100%', width: '100%' } });
