import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  Music2,
  VolumeX,
} from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '@/constants/tokens';
import { getChatSettingsLayout } from '@/features/chat/chat-settings-layout';
import { VoiceArtwork } from '@/components/chat/VoiceArtwork';
import { VOICE_CATALOG } from '@/features/chat/voice-catalog';
import { useAuthStore, useVoicePreferenceStore } from '@/store';
import { MusicPlayerIcon } from '@/components/ui/icons/ChatIcons';

const AMBIENCE = [
  { id: 'none', name: 'None', subtitle: 'Tune 3' },
  { id: 'love', name: 'A love for life', subtitle: 'Tune 4' },
  { id: 'arkansas', name: 'Arkansas', subtitle: 'Tune 3' },
  { id: 'love-repeat', name: 'A love for life', subtitle: 'Tune 4' },
] as const;

const SCORE_COLORS = [
  COLORS.info,
  COLORS.beneficiaryGroupBlue,
  COLORS.beneficiaryGroupGreen,
  COLORS.onboardingGreenSoft,
  COLORS.beneficiaryGroupYellow,
  COLORS.warning,
  COLORS.onboardingAmber,
  COLORS.brandWeak,
];

type IconComponent = typeof ImageIcon;

function RoundButton({
  children,
  label,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
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

function MediaTile({
  icon: Icon,
  label,
  onPress,
  width,
}: {
  icon: IconComponent;
  label: string;
  onPress: () => void;
  width: number;
}) {
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      accessibilityLabel={`View shared ${label.toLowerCase()}`}
      accessibilityRole="button"
      activeOpacity={0.74}
      onPress={handlePress}
      style={[styles.mediaTile, { width }]}
    >
      <Icon size={24} color={COLORS.textStrong} strokeWidth={2} />
      <Text style={styles.mediaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function InsightCard({
  copy,
  icon: Icon,
  title,
  width,
}: {
  copy: string;
  icon: IconComponent;
  title: string;
  width: number;
}) {
  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.74}
      onPress={handlePress}
      style={[styles.insightCard, { width }]}
    >
      <View style={styles.insightTitleRow}>
        <Icon size={18} color={COLORS.textStrong} strokeWidth={2.2} />
        <Text numberOfLines={1} style={styles.insightTitle}>{title}</Text>
      </View>
      <Text style={styles.insightCopy}>{copy}</Text>
    </TouchableOpacity>
  );
}

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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={[{ width }, animatedStyle]}>
      <TouchableOpacity
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        activeOpacity={1}
        onPress={handlePress}
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

function RecordPlayerMark() {
  return (
    <MusicPlayerIcon/>
  );
}

function VolumeSlider({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const updateValue = useCallback((x: number) => {
    if (trackWidth <= 0) return;
    onChange(Math.round(Math.max(0, Math.min(100, (x / trackWidth) * 100))));
  }, [onChange, trackWidth]);

  const updateValueRef = useRef(updateValue);
  updateValueRef.current = updateValue;

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => updateValueRef.current(event.nativeEvent.locationX),
    onPanResponderMove: (event) => updateValueRef.current(event.nativeEvent.locationX),
    onStartShouldSetPanResponder: () => true,
  })).current;

  return (
    <View
      accessibilityLabel="Background ambience volume"
      accessibilityRole="adjustable"
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={styles.sliderHitArea}
      {...panResponder.panHandlers}
    >
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${value}%` }]} />
      </View>
      <View style={[styles.sliderThumb, { left: `${value}%` }]} />
    </View>
  );
}

function parseScore(value?: string) {
  if (!value) return 36;

  try {
    const score = JSON.parse(value)?.enrichment_score;
    return typeof score === 'number'
      ? Math.round(Math.max(0, Math.min(100, score)))
      : 36;
  } catch {
    return 36;
  }
}

export default function ChatSettingsScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { enrichmentStats, chatId } = useLocalSearchParams<{ enrichmentStats?: string; chatId?: string }>();
  const layout = useMemo(() => getChatSettingsLayout(screenWidth), [screenWidth]);
  const score = useMemo(() => parseScore(enrichmentStats), [enrichmentStats]);
  const user = useAuthStore((state) => state.user);
  const selectedVoice = useVoicePreferenceStore((state) => state.selectedVoiceId);
  const hydratedForUser = useVoicePreferenceStore((state) => state.hydratedForUser);
  const hydrateVoice = useVoicePreferenceStore((state) => state.hydrate);
  const selectVoice = useVoicePreferenceStore((state) => state.selectVoice);
  const userKey = user?._id ?? user?.email ?? 'anonymous';
  const [selectedAmbience, setSelectedAmbience] = useState('none');
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    if (hydratedForUser !== userKey) void hydrateVoice(userKey);
  }, [hydrateVoice, hydratedForUser, userKey]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');
  }, []);

  const handleScorePress = useCallback(() => {
    Haptics.selectionAsync();
  }, []);
  const handleSharedPress = useCallback(() => {
    Haptics.selectionAsync();
    if (chatId) router.push({ pathname: '/chat/media', params: { chatId } });
  }, [chatId]);
  const openAssetCollection = useCallback((tab: 'media' | 'docs' | 'links', assetType: 'all' | 'image' | 'video' | 'audio') => {
    if (chatId) router.push({ pathname: '/chat/media', params: { chatId, tab, assetType } });
  }, [chatId]);
  const openImages = useCallback(() => openAssetCollection('media', 'image'), [openAssetCollection]);
  const openVideos = useCallback(() => openAssetCollection('media', 'video'), [openAssetCollection]);
  const openAudio = useCallback(() => openAssetCollection('media', 'audio'), [openAssetCollection]);
  const openDocs = useCallback(() => openAssetCollection('docs', 'all'), [openAssetCollection]);
  const openLinks = useCallback(() => openAssetCollection('links', 'all'), [openAssetCollection]);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[COLORS.onboardingAmberPale, COLORS.onboardingWarmWhite, COLORS.background]}
        locations={[0, 0.66, 1]}
        pointerEvents="none"
        style={styles.backgroundGradient}
      />

      <View style={[styles.page, { width: layout.pageWidth }]}>
        <View style={styles.header}>
          <RoundButton label="Go back" onPress={goBack}>
            <ArrowLeft size={21} color={COLORS.textStrong} strokeWidth={2.2} />
          </RoundButton>
          <Text style={styles.screenTitle}>Chat Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scoreCard}>
            <View style={styles.scoreTopRow}>
              <View style={styles.scoreCopy}>
                <Text style={styles.scoreTitle}>My Enrichment score</Text>
                <Text style={styles.scoreDescription}>
                  Your Enrichment score reflects your memory health across 10 key life areas.
                </Text>
              </View>
              <Text style={styles.scoreValue}>{score}%</Text>
            </View>

            <View style={styles.scoreBar}>
              {SCORE_COLORS.map((color, index) => (
                <View
                  key={color}
                  style={[
                    styles.scoreSegment,
                    {
                      backgroundColor: color,
                      flex: index === 0 ? 3.6 : index === 1 ? 1.5 : 0.9,
                    },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.74}
              onPress={handleScorePress}
              style={styles.scoreAction}
            >
              <View style={styles.scoreActionIcon}>
                <BarChart3 size={12} color={COLORS.textInverse} strokeWidth={2.5} />
              </View>
              <Text style={styles.scoreActionLabel}>Discover which areas need more context</Text>
              <ChevronRight size={18} color={COLORS.textWeak} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={styles.mediaGrid}>
            <MediaTile icon={ImageIcon} label="Images" onPress={openImages} width={layout.mediaTileWidth} />
            <MediaTile icon={Film} label="Videos" onPress={openVideos} width={layout.mediaTileWidth} />
            <MediaTile icon={Music2} label="Audio" onPress={openAudio} width={layout.mediaTileWidth} />
            <MediaTile icon={FileText} label="Docs" onPress={openDocs} width={layout.mediaTileWidth} />
            <MediaTile icon={Link2} label="Links" onPress={openLinks} width={layout.mediaTileWidth} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.74}
            onPress={handleSharedPress}
            style={styles.sharedRow}
          >
            <ImageIcon size={22} color={COLORS.textStrong} strokeWidth={2} />
            <Text numberOfLines={1} style={styles.sharedLabel}>
              Shared Media, Links and Docs
            </Text>
            <ChevronRight size={20} color={COLORS.textWeak} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* <View style={styles.deepDiveSection}>
            <Text style={styles.sectionTitle}>Deep dive insights</Text>
            <ScrollView
              contentContainerStyle={styles.insightRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              <InsightCard
                copy="You have traveled to 6 countries but only mentioned 2 of them."
                icon={Route}
                title="Missing places"
                width={layout.insightCardWidth}
              />
              <InsightCard
                copy="You have mentioned your brother only twice in your stories."
                icon={Users}
                title="People/relationships"
                width={layout.insightCardWidth}
              />
              <InsightCard
                copy="You've shared very little details about your experiences in 2022."
                icon={BarChart3}
                title="The previous years."
                width={layout.insightCardWidth}
              />
              <InsightCard
                copy="You have traveled to 6 countries but only mentioned 2 of them."
                icon={BarChart3}
                title="Missing People."
                width={layout.insightCardWidth}
              />
            </ScrollView>
          </View> */}

          <View style={styles.voiceSection}>
            <Text style={styles.sectionTitle}>AI Voice (Voice Mode)</Text>
            <View style={styles.twoColumnGrid}>
              {VOICE_CATALOG.map((voice) => (
                <SelectionCard
                  key={voice.id}
                  label={`${voice.name}, ${voice.subtitle}`}
                  onPress={() => { void selectVoice(voice.id); }}
                  selected={selectedVoice === voice.id}
                  width={layout.selectionCardWidth}
                >
                  <VoiceArtwork voice={voice} size={32} />
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{voice.name}</Text>
                    <Text style={styles.cardSubtitle}>{voice.subtitle}</Text>
                  </View>
                </SelectionCard>
              ))}
            </View>
          </View>

          <View style={styles.ambienceSection}>
            <Text style={styles.sectionTitle}>Background Ambience</Text>
            <VolumeSlider onChange={setVolume} value={volume} />
            <View style={styles.twoColumnGrid}>
              {AMBIENCE.map((ambience) => (
                <SelectionCard
                  key={ambience.id}
                  label={`${ambience.name}, ${ambience.subtitle}`}
                  onPress={() => setSelectedAmbience(ambience.id)}
                  selected={selectedAmbience === ambience.id}
                  width={layout.selectionCardWidth}
                >
                  {ambience.id === 'none' ? (
                    <View style={styles.noneIcon}>
                      <VolumeX size={17} color={COLORS.textStrong} strokeWidth={2} />
                    </View>
                  ) : (
                    <RecordPlayerMark />
                  )}
                  <View style={styles.cardText}>
                    <Text numberOfLines={1} style={styles.cardTitle}>{ambience.name}</Text>
                    <Text style={styles.cardSubtitle}>{ambience.subtitle}</Text>
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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.background,
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
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 70,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerSpacer: { height: 40, width: 40 },
  screenTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansBold,
    fontSize: 17,
    lineHeight: 22,
  },
  content: {
    paddingBottom: 88,
    paddingHorizontal: 16,
    paddingTop: 9,
  },
  scoreCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    height: 160,
    overflow: 'hidden',
  },
  scoreTopRow: {
    flexDirection: 'row',
    height: 81,
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  scoreCopy: {
    flex: 1,
    paddingRight: 8,
  },
  scoreTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansBold,
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  scoreDescription: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 17,
  },
  scoreValue: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serif,
    fontSize: 52,
    lineHeight: 57,
  },
  scoreBar: {
    borderRadius: 4,
    flexDirection: 'row',
    height: 24,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  scoreSegment: {
    height: '100%',
  },
  scoreAction: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeaker,
    bottom: 0,
    flexDirection: 'row',
    gap: 9,
    height: 34,
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
  },
  scoreActionIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.textStrong,
    borderRadius: 2,
    height: 15,
    justifyContent: 'center',
    width: 15,
  },
  scoreActionLabel: {
    color: COLORS.textStrong,
    flex: 1,
    fontFamily: FONTS.sans,
    fontSize: 12.5,
    lineHeight: 16,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 24,
  },
  mediaTile: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    borderRadius: 8,
    gap: 7,
    height: 64,
    justifyContent: 'center',
  },
  mediaLabel: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  sharedRow: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    marginTop: 24,
    paddingHorizontal: 12,
  },
  sharedLabel: {
    color: COLORS.textStrong,
    flex: 1,
    fontFamily: FONTS.sansSemi,
    fontSize: 17,
    lineHeight: 22,
  },
  deepDiveSection: {
    gap: 14,
    marginTop: 27,
  },
  voiceSection: {
    gap: 14,
    marginTop: 26,
  },
  ambienceSection: {
    gap: 12,
    marginTop: 25,
  },
  sectionTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansBold,
    fontSize: 17,
    lineHeight: 22,
  },
  insightRow: {
    gap: 12,
    paddingRight: 16,
  },
  insightCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.strokeWeak,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    height: 96,
    padding: 12,
  },
  insightTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  insightTitle: {
    color: COLORS.textStrong,
    flex: 1,
    fontFamily: FONTS.sansBold,
    fontSize: 13,
    lineHeight: 17,
  },
  insightCopy: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 16,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectionCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.strokeWeak,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    height: 64,
    paddingHorizontal: 12,
  },
  selectionCardSelected: {
    borderColor: COLORS.onboardingAmber,
    borderWidth: 2,
  },
  selectedMark: {
    alignItems: 'center',
    backgroundColor: COLORS.onboardingAmber,
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    top: 7,
    width: 16,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    lineHeight: 18,
  },
  cardSubtitle: {
    color: COLORS.textBase,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 17,
  },
  sliderHitArea: {
    height: 24,
    justifyContent: 'center',
  },
  sliderTrack: {
    backgroundColor: COLORS.fillWeak,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
  sliderFill: {
    backgroundColor: COLORS.brandWeak,
    // backgroundColor: "#E98246",
    borderRadius: 3,
    height: '100%',
  },
  sliderThumb: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.textBase,
    borderRadius: 8,
    borderWidth: 3,
    height: 16,
    marginLeft: -8,
    position: 'absolute',
    width: 16,
  },
  noneIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.fillWeak,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  recordPlayer: {
    alignItems: 'center',
    backgroundColor: COLORS.onboardingAmberPale,
    borderColor: COLORS.onboardingAmber,
    borderRadius: 8,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 32,
  },
  recordDisc: {
    alignItems: 'center',
    backgroundColor: COLORS.info,
    borderColor: COLORS.textInverse,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  recordLabel: {
    backgroundColor: COLORS.brand,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  recordNote: {
    position: 'absolute',
    right: -3,
    top: -5,
  },
});
