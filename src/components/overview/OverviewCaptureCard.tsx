import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import SquarePen from 'lucide-react-native/icons/square-pen';
import PhoneCall from 'lucide-react-native/icons/phone-call';
import Mic from 'lucide-react-native/icons/mic';
import Trash2 from 'lucide-react-native/icons/trash';
import { AudioAttachmentCard } from '@/components/media/AudioAttachmentCard';

import { Button } from '@/components/ui';
import { TouchableOpacity } from '@/components/ui/Touchable';
import { toast } from '@/components/ui/Toast';
import { COLORS as LIGHT_COLORS, type ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget, radius, responsiveSpace } from '@/constants/responsive';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { useQuickCapture } from '@/hooks/mutations/use-quick-capture';
import {
  CAPTURE_HANDED_OFF_EVENT,
  buildStoryHandoff,
  captureTextKey,
  captureVoiceKey,
  parseSavedVoiceNotes,
  type CaptureHandedOffEvent,
  type CaptureVoiceNote,
} from '@/features/overview/capture-draft';

/** Web caps the writing area at nine lines. */
const MAX_VISIBLE_LINES = 9;

type OverviewCaptureCardProps = {
  userId?: string;
  onAddStory: () => void;
  /** Empty-card text. The stacked greeting asks the question, so the card invites a note;
   *  with the editorial greeting pass "What’s on your mind today?" (as on web). */
  placeholder?: string;
};

/**
 * The Overview "What's on your mind today?" card — mobile port of web
 * `overview-capture-card.tsx`. Write or record a thought, then save it as a
 * quick note, turn it into a story, or discuss it with Memento.
 */
export function OverviewCaptureCard({ userId, onAddStory, placeholder = 'Add something to your Memento' }: OverviewCaptureCardProps) {
  const COLORS = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const router = useRouter();
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const [text, setText] = useState('');
  const textRef = useRef('');
  const [voiceNotes, setVoiceNotes] = useState<CaptureVoiceNote[]>([]);
  const [restored, setRestored] = useState(false);
  const savingRef = useRef(false);
  const handoffIdRef = useRef<string | null>(null);

  const { mutateAsync: quickCapture, isPending: saving } = useQuickCapture();

  // ── Restore and persist the draft per user ────────────────────────────────
  useEffect(() => {
    setRestored(false);
    if (!userId) {
      setRestored(true);
      return;
    }
    let cancelled = false;
    AsyncStorage.multiGet([captureTextKey(userId), captureVoiceKey(userId)])
      .then(([[, savedText], [, savedVoice]]) => {
        if (cancelled) return;
        textRef.current = savedText ?? '';
        setText(savedText ?? '');
        setVoiceNotes(parseSavedVoiceNotes(savedVoice));
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setRestored(true); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId || !restored) return;
    const key = captureTextKey(userId);
    (text ? AsyncStorage.setItem(key, text) : AsyncStorage.removeItem(key)).catch(() => undefined);
  }, [text, userId, restored]);

  useEffect(() => {
    if (!userId || !restored) return;
    const key = captureVoiceKey(userId);
    (voiceNotes.length
      ? AsyncStorage.setItem(key, JSON.stringify(voiceNotes))
      : AsyncStorage.removeItem(key)
    ).catch(() => undefined);
  }, [voiceNotes, userId, restored]);

  const updateText = useCallback((next: string) => {
    textRef.current = next;
    setText(next);
  }, []);

  // Let go of a draft once the editor has published it or kept it as a story draft.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_HANDED_OFF_EVENT, (event: CaptureHandedOffEvent) => {
      if (!event || event.handoffId !== handoffIdRef.current) return;
      handoffIdRef.current = null;
      updateText('');
      setVoiceNotes([]);
      if (event.outcome === 'draft') toast('Moved to your story drafts.', 'success');
    });
    return () => sub.remove();
  }, [updateText]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const hasText = text.trim().length > 0;
  const hasDraft = hasText || voiceNotes.length > 0;
  const busy = saving;

  const handleRemoveVoiceNote = useCallback((fileId: string) => {
    Haptics.selectionAsync();
    setVoiceNotes((current) => current.filter((note) => note.fileId !== fileId));
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSaveNow = useCallback(async () => {
    const submitted = textRef.current;
    const attachmentIds = voiceNotes.map((note) => note.fileId);
    if (savingRef.current || (!submitted.trim() && !attachmentIds.length)) return;
    savingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await quickCapture({
        body: submitted.trim(),
        attachments: attachmentIds.length ? attachmentIds : undefined,
        visibility: 'private',
      });
      if (!isMountedRef.current) return;
      if (textRef.current === submitted) updateText('');
      setVoiceNotes((current) => current.filter((note) => !attachmentIds.includes(note.fileId)));
        toast('Quick note saved. Details will finish processing in the background.', 'success');
    } catch {
      if (isMountedRef.current) toast('Couldn’t save your thoughts. Try again.', 'error');
    } finally {
      savingRef.current = false;
    }
  }, [quickCapture, updateText, voiceNotes]);

  /** Opens the add-story page with this card's draft; `record` starts recording there. */
  const openStoryWithDraft = useCallback((record: boolean) => {
    const hasCardDraft = Boolean(textRef.current.trim() || voiceNotes.length);
    let initialDraft: string | undefined;
    if (hasCardDraft) {
      const handoffId = `overview_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      handoffIdRef.current = handoffId;
      initialDraft = encodeURIComponent(JSON.stringify(buildStoryHandoff(handoffId, textRef.current, voiceNotes)));
    }
    router.push({
      pathname: '/editor',
      params: {
        mode: 'story',
        ...(initialDraft ? { initialDraft } : {}),
        ...(record ? { autoRecord: 'true' } : {}),
      },
    });
  }, [router, voiceNotes]);

  const handleUseAsStory = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openStoryWithDraft(false);
  }, [openStoryWithDraft]);

  // The mic opens Add story and records there, the same as its own mic button.
  const handleRecord = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openStoryWithDraft(true);
  }, [openStoryWithDraft]);

  const handleDiscuss = useCallback(() => {
    const message = textRef.current.trim();
    if (!message) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/chat',
      params: { discussText: message, discussId: `${Date.now()}` },
    });
  }, [router]);

  const handleTalk = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/voice-call');
  }, [router]);

  const handleClear = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const hasVoice = voiceNotes.length > 0;
    Alert.alert(
      hasVoice ? 'Clear this draft?' : 'Clear your text?',
      hasVoice
        ? 'This removes your recording and the draft from this card and this device.'
        : 'This removes the draft from this card and this device.',
      [
        { text: 'Keep text', style: 'cancel' },
        {
          text: 'Clear text',
          style: 'destructive',
          onPress: () => {
            updateText('');
            setVoiceNotes([]);
            handoffIdRef.current = null;
          },
        },
      ],
    );
  }, [updateText, voiceNotes.length]);

  const handleAddStory = useCallback(() => {
    onAddStory();
  }, [onAddStory]);

  // Tapping the card opens the add-story page, carrying any draft with it.
  const handleOpenComposer = useCallback(() => {
    if (textRef.current.trim() || voiceNotes.length) handleUseAsStory();
    else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onAddStory();
    }
  }, [handleUseAsStory, onAddStory, voiceNotes.length]);

  const canOpen = !saving;

  return (
    <Animated.View layout={LinearTransition.duration(220)} style={styles.card} testID="overview-capture-card">
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={!canOpen}
        onPress={handleOpenComposer}
        accessibilityRole="button"
        accessibilityLabel={hasDraft ? 'Continue your story' : 'Add a story'}
        accessibilityHint="Opens the add story page"
        style={styles.writingArea}
      >
        {/* The greeting above asks the question; the card invites a note. */}
        <Text
          numberOfLines={hasText ? MAX_VISIBLE_LINES : 1}
          // The invitation always sits on one line, shrinking a little on narrow phones.
          adjustsFontSizeToFit={!hasText}
          minimumFontScale={0.8}
          style={[TYPE.captureInput, hasText ? styles.prompt : styles.placeholder]}
        >
          {hasText ? text : placeholder}
        </Text>
      </TouchableOpacity>

      {voiceNotes.length > 0 && (
        <View style={styles.voiceNotes}>
          {voiceNotes.map((note) => (
            <Animated.View key={note.fileId} entering={FadeIn.duration(200)}>
              <AudioAttachmentCard
                compact
                item={{ _id: note.fileId, name: 'voice_note.m4a', type: 'audio/m4a', duration: note.duration }}
                onRemove={() => handleRemoveVoiceNote(note.fileId)}
              />
            </Animated.View>
          ))}
        </View>
      )}

      <Animated.View key={hasDraft ? 'draft' : 'default'} entering={FadeIn.duration(200)} style={styles.actions}>
          <View style={styles.leading}>
            {hasDraft ? (
              <>
                <Button
                  size="md"
                  rounded="full"
                  onPress={() => { void handleSaveNow(); }}
                  disabled={busy}
                  loading={saving}
                >
                  Save now
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  rounded="full"
                  onPress={handleUseAsStory}
                  disabled={busy}
                >
                  Use as story
                </Button>
                {hasText && (
                  <Button variant="ghost" size="md" rounded="full" onPress={handleDiscuss} disabled={busy}>
                    Discuss
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* Talk first (white pill), then Write (orange). */}
                <TouchableOpacity
                  onPress={handleTalk}
                  disabled={busy}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Talk to Memento"
                  style={styles.talkButton}
                >
                  <PhoneCall size={iconSize(18)} color={LIGHT_COLORS.textStrong} strokeWidth={1.75} />
                  <Text style={[TYPE.buttonSmall, styles.talkText]}>Talk</Text>
                </TouchableOpacity>
                <Button
                  size="md"
                  rounded="full"
                  onPress={handleAddStory}
                  disabled={busy}
                  accessibilityLabel="Write a story"
                  leftIcon={<SquarePen size={iconSize(18)} color={COLORS.textInverse} strokeWidth={2} />}
                >
                  Write
                </Button>
              </>
            )}
          </View>
          <View style={styles.trailing}>
            {hasDraft && (
              <TouchableOpacity
                onPress={handleClear}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Clear text"
                style={[styles.roundButton, styles.clearButton]}
              >
                <Trash2 size={iconSize(20)} color={COLORS.error} strokeWidth={1.75} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleRecord}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={hasDraft ? 'Record more' : 'Record your thoughts'}
              style={[styles.roundButton, styles.micButton]}
            >
              <Mic size={iconSize(20)} color={COLORS.textBase} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>
        </Animated.View>
    </Animated.View>
  );
}

const ROUND = minTouchTarget(44);

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  card: {
    minHeight: 178,
    borderRadius: radius(24),
    borderWidth: 1,
    borderColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.fillWeak,
    padding: responsiveSpace(20),
    justifyContent: 'space-between',
  },
  writingArea: {
    paddingBottom: responsiveSpace(28),
    gap: responsiveSpace(12),
  },
  prompt: {
    color: COLORS.textStrong,
  },
  placeholder: {
    color: COLORS.textWeak,
  },
  voiceNotes: {
    gap: responsiveSpace(8),
    paddingBottom: responsiveSpace(16),
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: responsiveSpace(12),
  },
  leading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: responsiveSpace(8),
    flexShrink: 1,
  },
  trailing: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpace(8),
  },
  talkButton: {
    minHeight: minTouchTarget(40),
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpace(8),
    paddingHorizontal: responsiveSpace(16),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.strokeWeak,
    // Web keeps Talk a white pill with dark ink in every appearance.
    backgroundColor: LIGHT_COLORS.card,
  },
  talkText: {
    color: LIGHT_COLORS.textStrong,
  },
  roundButton: {
    width: ROUND,
    height: ROUND,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: COLORS.errorFill,
    backgroundColor: COLORS.errorFill,
  },
});
