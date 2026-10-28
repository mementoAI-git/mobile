import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Pressable } from '@/components/ui/Touchable';
import { useReducedMotion } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useVoicePreview } from '@/hooks/use-voice-preview';
import { TYPE } from '@/constants/typography';
import { VOICE_CATALOG, type VoiceDefinition, type VoiceId } from '@/features/chat/voice-catalog';
import { getVoicePageIndex, VOICE_PICKER_DOT_GAP, VOICE_PICKER_DOT_SIZE, VOICE_PICKER_ORB_SIZE } from '@/features/chat/voice-preview-playback';
import { VoiceArtwork } from './VoiceArtwork';
import * as Haptics from 'expo-haptics';

export function VoicePicker({ selectedId, onSelect }: { selectedId: VoiceId; onSelect: (id: VoiceId) => void }) {
  const { width } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(width - 32);
  const [dragging, setDragging] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const reduceMotion = useReducedMotion();
  const { replay, stop, status } = useVoicePreview(selectedId, !dragging);

  const cancelSettleTimer = useCallback(() => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = null;
  }, []);
  useEffect(() => {
    cancelSettleTimer();
    scrollRef.current?.scrollTo({ x: VOICE_CATALOG.findIndex((voice) => voice.id === selectedRef.current) * pageWidth, animated: false });
  }, [cancelSettleTimer, pageWidth]);
  useEffect(() => cancelSettleTimer, [cancelSettleTimer]);
  const handleBeginDrag = useCallback(() => { cancelSettleTimer(); stop(); setDragging(true); }, [cancelSettleTimer, stop]);
  const settleAtOffset = useCallback((offset: number) => {
    const index = getVoicePageIndex(offset, pageWidth, VOICE_CATALOG.length);
    onSelect(VOICE_CATALOG[index].id);
    setDragging(false);
  }, [onSelect, pageWidth]);
  const handleSettle = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    cancelSettleTimer();
    settleAtOffset(event.nativeEvent.contentOffset.x);
  }, [cancelSettleTimer, settleAtOffset]);
  const handleEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    // A cancelled/short drag may not produce a momentum-end event.
    cancelSettleTimer();
    settleTimerRef.current = setTimeout(() => settleAtOffset(offset), 150);
  }, [cancelSettleTimer, settleAtOffset]);
  const handleSelect = useCallback((id: VoiceId) => {
    cancelSettleTimer();
    setDragging(false);
    if (id === selectedRef.current) { void Haptics.selectionAsync(); replay(); return; }
    stop();
    scrollRef.current?.scrollTo({ x: VOICE_CATALOG.findIndex((voice) => voice.id === id) * pageWidth, animated: !reduceMotion });
    onSelect(id);
  }, [cancelSettleTimer, onSelect, pageWidth, reduceMotion, replay, stop]);
  const handleReplay = useCallback(() => { void Haptics.selectionAsync(); replay(); }, [replay]);

  return (
    <View className="flex-1 justify-center pb-24" onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={handleBeginDrag}
        onScrollEndDrag={handleEndDrag}
        onMomentumScrollBegin={cancelSettleTimer}
        onMomentumScrollEnd={handleSettle}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {VOICE_CATALOG.map((voice) => (
          <VoicePage key={voice.id} voice={voice} active={voice.id === selectedId} playing={status === 'playing'} width={pageWidth} onReplay={handleReplay} />
        ))}
      </ScrollView>
      <VoiceDots selectedId={selectedId} onSelect={handleSelect} />
      {status === 'error' && (
        <Text className="mt-2 text-center text-text-base" style={TYPE.bodySmall} accessibilityLiveRegion="polite">
          Couldn’t play the sample. Tap the orb to try again.
        </Text>
      )}
    </View>
  );
}

const VoicePage = React.memo(function VoicePage({ voice, active, playing, width, onReplay }: { voice: VoiceDefinition; active: boolean; playing: boolean; width: number; onReplay: () => void }) {
  return (
    <View style={{ width, alignItems: 'center' }} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Replay ${voice.name} voice preview`} accessibilityValue={{ text: active && playing ? 'Playing preview' : 'Replay preview' }} onPress={onReplay}>
        <VoiceArtwork voice={voice} size={VOICE_PICKER_ORB_SIZE} />
      </Pressable>
      <Text className="mt-7 text-text-strong" style={TYPE.voicePickerTitle}>{voice.name}</Text>
      <Text className="mt-1 text-text-base" style={TYPE.body}>{voice.subtitle}</Text>
    </View>
  );
});

function VoiceDots({ selectedId, onSelect }: { selectedId: VoiceId; onSelect: (id: VoiceId) => void }) {
  const colors = useThemeColors();
  const selectedIndex = VOICE_CATALOG.findIndex((voice) => voice.id === selectedId);
  const handlePress = useCallback((event: { nativeEvent: { locationX: number } }) => {
    const index = getVoicePageIndex(event.nativeEvent.locationX - VOICE_PICKER_DOT_SIZE / 2, VOICE_PICKER_DOT_SIZE + VOICE_PICKER_DOT_GAP, VOICE_CATALOG.length);
    onSelect(VOICE_CATALOG[index].id);
  }, [onSelect]);
  const handleAccessibilityAction = useCallback((event: { nativeEvent: { actionName: string } }) => {
    if (!['increment', 'decrement'].includes(event.nativeEvent.actionName)) return;
    const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    const index = Math.max(0, Math.min(VOICE_CATALOG.length - 1, selectedIndex + direction));
    onSelect(VOICE_CATALOG[index].id);
  }, [onSelect, selectedIndex]);
  return (
    <Pressable
      className="mt-4 self-center flex-row items-center"
      style={{ minHeight: 44, gap: VOICE_PICKER_DOT_GAP }}
      accessibilityRole="adjustable"
      accessibilityLabel="Voice selection"
      accessibilityValue={{ min: 1, max: VOICE_CATALOG.length, now: selectedIndex + 1, text: VOICE_CATALOG[selectedIndex].name }}
      accessibilityActions={[{ name: 'increment', label: 'Next voice' }, { name: 'decrement', label: 'Previous voice' }]}
      onAccessibilityAction={handleAccessibilityAction}
      onPress={handlePress}
    >
      {VOICE_CATALOG.map((voice) => (
        <View key={voice.id} style={{ width: VOICE_PICKER_DOT_SIZE, height: VOICE_PICKER_DOT_SIZE, borderRadius: VOICE_PICKER_DOT_SIZE / 2, backgroundColor: voice.id === selectedId ? colors.brand : colors.strokeWeak }} />
      ))}
    </Pressable>
  );
}
