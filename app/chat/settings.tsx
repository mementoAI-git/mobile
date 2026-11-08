/**
 * Chat settings — full-screen port of web's phone chat settings
 * (Web/memento-web/src/components/modal/chat-settings: index.tsx,
 * chat-preferences-panel.tsx, enrichment-summary.tsx, voices.tsx,
 * background-music.tsx, volume-control.tsx). Mobile keeps its own warm
 * gradient behind the page.
 *
 * Order: Enrichment summary + Shared media & links · AI Voice (Voice
 * narration switch, then the voice cards) · Background Ambience (volume, then
 * the tune cards). Sections sit 32px apart. Voices and tunes stay as tappable
 * cards on the page rather than web's menu.
 */
import type { ThemeColors } from '@/constants/tokens';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Check from 'lucide-react-native/icons/check';
import ImageIcon from 'lucide-react-native/icons/image';
import VolumeX from 'lucide-react-native/icons/volume-x';
import { DEEP_SKY } from '@/constants/appearance';
import { TYPE } from '@/constants/typography';
import { minTouchTarget, radius } from '@/constants/responsive';
import { getChatSettingsLayout } from '@/features/chat/chat-settings-layout';
import { mapAttachmentsToShared } from '@/features/chat/shared-media';
import { VoiceArtwork } from '@/components/chat/VoiceArtwork';
import { EnrichmentSummaryCard } from '@/components/overview/EnrichmentSummaryCard';
import { VOICE_CATALOG, getVoiceById, getVoiceByProviderName, type VoiceId } from '@/features/chat/voice-catalog';
import { Switch } from '@/components/ui/Switch';
import { useSpokenRepliesStore } from '@/store/spoken-replies.store';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAuthStore, useVoicePreferenceStore } from '@/store';
import { MusicPlayerIcon } from '@/components/ui/icons/ChatIcons';
import { useBackgroundMusic } from '@/hooks/use-background-music';
import { type BackgroundTrackKey } from '@/features/audio/background-music';
import { useUpdateProfile } from '@/hooks/mutations/use-profile-mutation';
import { useConversationAttachments } from '@/hooks/queries/use-memories';
import { useToast } from '@/components/ui/Toast';
import { useVoiceSampleClips } from '@/hooks/use-voice-sample-clips';

function RoundButton({
  children,
  label,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemeStyles(createStyles);
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.72}
      onPress={handlePress}
      style={styles.roundButton}
    >
      {children}
    </TouchableOpacity>
  );
}

/** Voice and tune cards: two per row, outline only; the chosen one gets a weak fill and a tick. */
function SelectionCard({
  children,
  label,
  onPress,
  selected,
  width,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  selected: boolean;
  width: number;
}) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[{ width }, animatedStyle]}>
      <TouchableOpacity
        accessibilityLabel={label}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        activeOpacity={1}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.selectionCard, selected && styles.selectionCardSelected]}
      >
        {children}
        {selected && (
          <View style={styles.selectedMark}>
            <Check size={9} color={COLORS.textInverse} strokeWidth={3} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Web `volume-control.tsx`: "Volume", a track you tap or drag anywhere on, and the percentage. */
function VolumeSlider({ onChange, value }: { onChange: (value: number) => void; value: number }) {
  const styles = useThemeStyles(createStyles);
  const [trackWidth, setTrackWidth] = useState(0);
  const updateValue = useCallback((x: number) => {
    if (trackWidth <= 0) return;
    onChange(Math.round(Math.max(0, Math.min(100, (x / trackWidth) * 100))));
  }, [onChange, trackWidth]);

  const updateValueRef = useRef(updateValue);
  updateValueRef.current = updateValue;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => (
      Math.abs(gestureState.dx) > 4 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onPanResponderGrant: (event) => updateValueRef.current(event.nativeEvent.locationX),
    onPanResponderMove: (event) => updateValueRef.current(event.nativeEvent.locationX),
    onPanResponderTerminationRequest: () => false,
  })).current;

  return (
    <View style={styles.volumeRow}>
      <Text style={[TYPE.bodySmall, styles.volumeLabel]} accessibilityElementsHidden>Volume</Text>
      <View
        accessible
        accessibilityLabel="Background ambience volume"
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 100, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') onChange(Math.min(100, value + 10));
          if (event.nativeEvent.actionName === 'decrement') onChange(Math.max(0, value - 10));
        }}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        style={styles.sliderHitArea}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${value}%` }]} />
        </View>
        <View style={[styles.sliderThumb, { left: `${value}%` }]} />
      </View>
      <Text style={[TYPE.bodySmall, styles.volumeValue]} accessibilityElementsHidden>{value}%</Text>
    </View>
  );
}

function parseScore(value?: string): number | undefined {
  if (!value) return undefined;
  try {
    const score = JSON.parse(value)?.enrichment_score;
    return typeof score === 'number' ? Math.round(Math.max(0, Math.min(100, score))) : undefined;
  } catch {
    return undefined;
  }
}

export default function ChatSettingsScreen() {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const { width: screenWidth } = useWindowDimensions();
  const { enrichmentStats, chatId } = useLocalSearchParams<{ enrichmentStats?: string; chatId?: string }>();
  const layout = useMemo(() => getChatSettingsLayout(screenWidth), [screenWidth]);
  const score = useMemo(() => parseScore(enrichmentStats), [enrichmentStats]);
  const { toast } = useToast();
  const { mutate: updateProfile } = useUpdateProfile();
  const {
    currentTrack,
    volume,
    setVolume,
    playTrack,
    stopTrack,
    togglePlay,
    tracks: backgroundTracks,
  } = useBackgroundMusic();

  // Shared files count, left out until it's known (web).
  const attachmentsQuery = useConversationAttachments(chatId ?? '');
  const fileCount = useMemo(() => {
    if (!chatId || !attachmentsQuery.data) return undefined;
    const data = attachmentsQuery.data;
    const attachments = Array.isArray(data) ? data : data?.attachments ?? [];
    const links = Array.isArray(data?.links) ? data.links : [];
    return mapAttachmentsToShared(attachments).length + links.length;
  }, [attachmentsQuery.data, chatId]);

  const user = useAuthStore((state) => state.user);
  const selectedVoice = useVoicePreferenceStore((state) => state.selectedVoiceId);
  const hydratedForUser = useVoicePreferenceStore((state) => state.hydratedForUser);
  const hydrateVoice = useVoicePreferenceStore((state) => state.hydrate);
  const selectVoice = useVoicePreferenceStore((state) => state.selectVoice);
  const userKey = user?._id ?? user?.email ?? 'anonymous';

  useEffect(() => {
    if (hydratedForUser !== userKey) void hydrateVoice(userKey);
  }, [hydrateVoice, hydratedForUser, userKey]);

  const activeVoiceId = useMemo<VoiceId>(() => {
    if (selectedVoice) return selectedVoice;
    if (user?.chat_voice) {
      const match = getVoiceByProviderName(user.chat_voice);
      if (match) return match.id;
    }
    return 'denver';
  }, [selectedVoice, user?.chat_voice]);

  // Like web: the sample starts within the tap and doesn't wait for the save.
  // Tapping the current voice plays it again.
  const { play: playVoiceSample } = useVoiceSampleClips();
  const handleVoicePress = useCallback((voiceId: VoiceId) => {
    Haptics.selectionAsync();
    const voice = getVoiceById(voiceId);
    if (!voice) return;
    playVoiceSample(voiceId);
    if (voiceId === activeVoiceId) return;
    void selectVoice(voiceId);
    updateProfile(
      { chat_voice: voice.providerVoiceName, chat_voice_provider: 'gemini' },
      { onError: () => toast('Failed to save voice preference', 'error') },
    );
  }, [activeVoiceId, playVoiceSample, selectVoice, updateProfile, toast]);

  const narrationOn = useSpokenRepliesStore((state) => state.enabled);
  const setNarration = useSpokenRepliesStore((state) => state.setEnabled);
  const handleNarrationChange = useCallback((next: boolean) => {
    Haptics.selectionAsync();
    setNarration(next);
  }, [setNarration]);

  const handleAmbiencePress = useCallback(async (trackKey: BackgroundTrackKey) => {
    Haptics.selectionAsync();
    if (trackKey === 'none') {
      if (currentTrack === 'none') return;
      await stopTrack();
      updateProfile(
        { bg_music: null },
        {
          onSuccess: () => toast('Background music disabled', 'success'),
          onError: () => toast('Failed to update background music settings', 'error'),
        },
      );
      return;
    }
    // Tapping the current tune pauses or resumes it, like web.
    if (trackKey === currentTrack) {
      await togglePlay();
      return;
    }
    await playTrack(trackKey);
    updateProfile(
      { bg_music: trackKey },
      {
        onSuccess: () => toast('Background music updated', 'success'),
        onError: () => toast('Failed to update background music', 'error'),
      },
    );
  }, [currentTrack, playTrack, stopTrack, togglePlay, updateProfile, toast]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');
  }, []);

  const handleViewInsight = useCallback(() => {
    Haptics.selectionAsync();
    router.push({ pathname: '/insights', params: { section: 'enrichment' } });
  }, []);

  const openAssetCollection = useCallback((tab: 'media' | 'docs' | 'links', assetType: 'all' | 'image' | 'video' | 'audio') => {
    if (chatId) router.push({ pathname: '/chat/media', params: { chatId, tab, assetType } });
  }, [chatId]);
  const openSharedMedia = useCallback(() => {
    Haptics.selectionAsync();
    openAssetCollection('media', 'all');
  }, [openAssetCollection]);


  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <LinearGradient
        colors={[COLORS.brandTint, COLORS.brandSubtle, 'transparent']}
        locations={[0, 0.66, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
        style={styles.backgroundGradient}
      />

      <View style={[styles.page, { width: layout.pageWidth }]}>
        <View style={styles.header}>
          <RoundButton label="Go back" onPress={goBack}>
            <ArrowLeft size={21} color={COLORS.textStrong} strokeWidth={2.2} />
          </RoundButton>
          <Text accessibilityRole="header" style={[TYPE.cardTitle, styles.screenTitle]}>Chat settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* ── Enrichment summary + shared files (web enrichment-summary.tsx) ── */}
          <View style={styles.group}>
            <EnrichmentSummaryCard score={score} onViewInsight={handleViewInsight} style={styles.enrichmentCard} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Shared media and links${fileCount === undefined ? '' : `, ${fileCount}`}`}
              activeOpacity={0.8}
              disabled={!chatId}
              onPress={openSharedMedia}
              style={styles.sharedRow}
            >
              <ImageIcon size={20} color={COLORS.textStrong} strokeWidth={1.75} />
              <Text numberOfLines={1} style={[TYPE.label, styles.sharedLabel]}>
                Shared media & links{fileCount === undefined ? '' : ` (${fileCount})`}
              </Text>
              <ChevronRight size={20} color={COLORS.textWeak} />
            </TouchableOpacity>
          </View>

          {/* ── AI Voice ── */}
          <View style={styles.section}>
            <Text accessibilityRole="header" style={[TYPE.bodyLargeSemi, styles.sectionTitle]}>AI Voice</Text>
            <View style={[styles.settingsCard, styles.narrationRow]}>
              <View style={styles.narrationWords}>
                <Text nativeID="voice-narration-label" style={[TYPE.label, styles.fieldLabel]}>Voice narration</Text>
                <Text style={[TYPE.bodySmall, styles.optionSubtitle]}>Read new replies aloud.</Text>
              </View>
              <Switch
                value={narrationOn}
                onValueChange={handleNarrationChange}
                accessibilityLabel="Voice narration"
                accessibilityHint="Reads new chat replies aloud"
              />
            </View>
            <View style={styles.twoColumnGrid}>
              {VOICE_CATALOG.map((voice) => (
                <SelectionCard
                  key={voice.id}
                  label={`${voice.name}, ${voice.subtitle}`}
                  onPress={() => handleVoicePress(voice.id)}
                  selected={activeVoiceId === voice.id}
                  width={layout.selectionCardWidth}
                >
                  <VoiceArtwork voice={voice} size={32} />
                  <View style={styles.cardText}>
                    <Text style={[TYPE.label, styles.cardTitle]}>{voice.name}</Text>
                    <Text style={[TYPE.bodySmall, styles.cardSubtitle]}>{voice.subtitle}</Text>
                  </View>
                </SelectionCard>
              ))}
            </View>
          </View>

          {/* ── Background Ambience ── */}
          <View style={styles.section}>
            <Text accessibilityRole="header" style={[TYPE.bodyLargeSemi, styles.sectionTitle]}>Background Ambience</Text>
            <VolumeSlider onChange={setVolume} value={volume} />
            <View style={styles.twoColumnGrid}>
              {backgroundTracks.map((ambience) => (
                <SelectionCard
                  key={ambience.id}
                  label={`${ambience.name}, ${ambience.subtitle}`}
                  onPress={() => { void handleAmbiencePress(ambience.key); }}
                  selected={currentTrack === ambience.key}
                  width={layout.selectionCardWidth}
                >
                  {ambience.key === 'none' ? (
                    <View style={styles.noneIcon}>
                      <VolumeX size={17} color={COLORS.textStrong} strokeWidth={2} />
                    </View>
                  ) : (
                    <MusicPlayerIcon />
                  )}
                  <View style={styles.cardText}>
                    <Text numberOfLines={1} style={[TYPE.label, styles.cardTitle]}>{ambience.name}</Text>
                    <Text style={[TYPE.bodySmall, styles.cardSubtitle]}>{ambience.subtitle}</Text>
                  </View>
                </SelectionCard>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  screen: {
    // Deep Sky normally reveals the shared canvas; this overlay needs its own opaque surface.
    backgroundColor: COLORS.background === 'transparent' ? DEEP_SKY.canvas : COLORS.background,
    flex: 1,
  },
  backgroundGradient: {
    height: 520,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  page: {
    alignSelf: 'center',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: COLORS.strokeWeaker,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    borderRadius: radius(22),
    height: minTouchTarget(44),
    justifyContent: 'center',
    width: minTouchTarget(44),
  },
  screenTitle: {
    color: COLORS.textStrong,
    flex: 1,
  },
  // Sections sit 32px apart.
  content: {
    gap: 40,
    paddingBottom: 88,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  group: { gap: 16 },
  section: { gap: 12 },
  sectionTitle: { color: COLORS.textStrong },
  enrichmentCard: {
    backgroundColor: COLORS.fillWeaker,
    borderRadius: 20,
    borderWidth: 0,
    // Per side: the card's own side paddings would otherwise win over `padding`.
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  // Web chatSettingsCard: rounded-[12px] bg-fill-neutral-weaker p-3.
  settingsCard: {
    backgroundColor: COLORS.fillWeaker,
    borderRadius: 12,
    padding: 12,
  },
  sharedRow: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeaker,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sharedLabel: { color: COLORS.textStrong, flex: 1 },
  narrationRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  narrationWords: { flex: 1, minWidth: 0 },
  fieldLabel: { color: COLORS.textStrong },
  optionSubtitle: { color: COLORS.textWeak },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectionCard: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: COLORS.fillWeak,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  selectionCardSelected: {
    backgroundColor: COLORS.fillWeak,
  },
  selectedMark: {
    alignItems: 'center',
    backgroundColor: COLORS.brandWeak,
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 16,
  },
  cardText: { flex: 1 },
  cardTitle: { color: COLORS.textStrong },
  cardSubtitle: { color: COLORS.textBase },
  noneIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  // Web volume control: stroke-neutral-weak track, icon-neutral-strong range and thumb
  // (white on dark themes).
  volumeRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  volumeLabel: { color: COLORS.textWeak },
  volumeValue: { color: COLORS.textStrong, fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'right' },
  sliderHitArea: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  sliderTrack: {
    backgroundColor: COLORS.strokeWeak,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
  sliderFill: {
    backgroundColor: COLORS.textStrong,
    borderRadius: 3,
    height: '100%',
  },
  sliderThumb: {
    backgroundColor: COLORS.textStrong,
    borderRadius: 8,
    height: 16,
    marginLeft: -8,
    position: 'absolute',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    width: 16,
  },
});
