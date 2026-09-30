import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, RotateCcw, Repeat, PauseCircle, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { AnimatedSplash } from '@/components/system/AnimatedSplash';
import { COLORS } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius } from '@/constants/responsive';

export default function SplashPreviewScreen() {
  const router = useRouter();
  const [replayKey, setReplayKey] = useState(0);
  const [loop, setLoop] = useState(true);
  const [persistOnDone, setPersistOnDone] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [showToolbar, setShowToolbar] = useState(true);

  const handleRestart = useCallback(() => {
    Haptics.selectionAsync();
    setReplayKey((k) => k + 1);
  }, []);

  const handleToggleLoop = useCallback(() => {
    Haptics.selectionAsync();
    setLoop((prev) => !prev);
  }, []);

  const handleTogglePersist = useCallback(() => {
    Haptics.selectionAsync();
    setPersistOnDone((prev) => !prev);
  }, []);

  const handleSpeedCycle = useCallback(() => {
    Haptics.selectionAsync();
    setSpeed((prev) => {
      if (prev === 0.5) return 1;
      if (prev === 1) return 2;
      return 0.5;
    });
    setReplayKey((k) => k + 1);
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated Splash instance */}
      <AnimatedSplash
        key={replayKey}
        loop={loop}
        persistOnDone={persistOnDone}
        replaySpeed={speed}
      />

      {/* Floating Toolbar */}
      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        {/* Top bar: Back button & Visibility Toggle */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/overview');
              }
            }}
            activeOpacity={0.8}
            style={styles.pillButton}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
            <Text style={[TYPE.metadata, styles.pillText]}>Exit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setShowToolbar((v) => !v);
            }}
            activeOpacity={0.8}
            style={styles.iconButton}
          >
            {showToolbar ? (
              <EyeOff size={18} color="#FFFFFF" />
            ) : (
              <Eye size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom control panel (toggled) */}
        {showToolbar && (
          <View style={styles.bottomBar}>
            {/* Replay */}
            <TouchableOpacity
              onPress={handleRestart}
              activeOpacity={0.8}
              style={styles.controlPill}
            >
              <RotateCcw size={15} color="#FFFFFF" />
              <Text style={[TYPE.metadata, styles.pillText]}>Replay</Text>
            </TouchableOpacity>

            {/* Loop Toggle */}
            <TouchableOpacity
              onPress={handleToggleLoop}
              activeOpacity={0.8}
              style={[
                styles.controlPill,
                loop && styles.activePill,
              ]}
            >
              <Repeat size={15} color={loop ? COLORS.brand : '#FFFFFF'} />
              <Text
                style={[
                  TYPE.metadata,
                  styles.pillText,
                  loop && { color: COLORS.brand },
                ]}
              >
                Loop: {loop ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            {/* Freeze / Persist */}
            <TouchableOpacity
              onPress={handleTogglePersist}
              activeOpacity={0.8}
              style={[
                styles.controlPill,
                persistOnDone && styles.activePill,
              ]}
            >
              <PauseCircle
                size={15}
                color={persistOnDone ? COLORS.brand : '#FFFFFF'}
              />
              <Text
                style={[
                  TYPE.metadata,
                  styles.pillText,
                  persistOnDone && { color: COLORS.brand },
                ]}
              >
                Freeze: {persistOnDone ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            {/* Speed Cycle */}
            <TouchableOpacity
              onPress={handleSpeedCycle}
              activeOpacity={0.8}
              style={styles.controlPill}
            >
              <Text style={[TYPE.metadata, styles.pillText]}>{speed}x</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(23, 11, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(23, 11, 0, 0.75)',
    paddingHorizontal: 14,
    minHeight: minTouchTarget(44),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconButton: {
    width: minTouchTarget(44),
    height: minTouchTarget(44),
    borderRadius: 999,
    backgroundColor: 'rgba(23, 11, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    minHeight: minTouchTarget(44),
    borderRadius: 999,
  },
  activePill: {
    backgroundColor: 'rgba(233, 130, 70, 0.25)',
    borderWidth: 1,
    borderColor: COLORS.brand,
  },
  pillText: {
    color: '#FFFFFF',
  },
});
