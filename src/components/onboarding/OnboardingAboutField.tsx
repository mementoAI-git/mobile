import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Mic from 'lucide-react-native/icons/mic';
import Square from 'lucide-react-native/icons/square';
import X from 'lucide-react-native/icons/x';
import { Button } from '@/components/ui';
import { TouchableOpacity } from '@/components/ui/Touchable';
import type { ThemeColors } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { radius, responsiveSpace } from '@/constants/responsive';
import { useThemeColors, useThemeStyles } from '@/hooks/use-theme-colors';
import { useStoryRecording } from '@/hooks/use-story-recording';
import { showPermissionRecoveryAlert } from '@/lib/show-permission-recovery-alert';
import type { PermissionLike } from '@/lib/permission-recovery';
import { useUserStore } from '@/store';

export const ABOUT_LIMIT = 500;

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}s`;

/**
 * The onboarding "About" box with voice input, ported from web
 * src/pages/onboarding/components/about-input.tsx: record, then the transcript
 * is added after what is already typed.
 */
export function OnboardingAboutField({ value, onChange, onBusyChange }: {
  value: string;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const colors = useThemeColors();
  const styles = useThemeStyles(createStyles);
  const email = useUserStore((s) => s.user?.email);
  const valueRef = useRef(value);
  valueRef.current = value;

  const appendTranscript = useCallback(async (text: string) => {
    const next = text.trim();
    if (!next) return;
    const current = valueRef.current;
    onChange(current.trim() ? `${current}${/\s$/.test(current) ? '' : ' '}${next}` : next);
  }, [onChange]);

  const handlePermissionDenied = useCallback((permission: PermissionLike) => {
    showPermissionRecoveryAlert({
      permission,
      title: 'Microphone is off',
      description: 'Allow microphone access to tell Memento about yourself by voice.',
      settingsDescription: 'Microphone access is turned off in Settings. Turn it back on to record.',
    });
  }, []);

  const recording = useStoryRecording({
    owner: `onboarding-about:${email || 'local'}`,
    onTranscript: appendTranscript,
    onPermissionDenied: handlePermissionDenied,
  });
  const { phase, isRecording, isTranscribing, duration, levels, error, canRetry } = recording;
  const busy = phase !== 'idle';
  const hasText = Boolean(value.trim());
  const excess = Math.max(0, value.length - ABOUT_LIMIT);

  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  const handleMic = useCallback(() => {
    if (isRecording) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void recording.stop();
    } else {
      void Haptics.selectionAsync();
      void recording.start();
    }
  }, [isRecording, recording]);

  const handleCancel = useCallback(() => {
    void Haptics.selectionAsync();
    void recording.cancel();
  }, [recording]);

  const statusLabel = isRecording ? 'Recording…' : isTranscribing ? 'Transcribing…' : 'Starting…';

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Enter About info</Text>
      <View style={styles.box}>
        <View style={styles.body}>
          {busy && hasText ? (
            <ScrollView style={styles.scroll} accessibilityLabel="Enter About info">
              <Text style={styles.text}>
                {value.slice(0, ABOUT_LIMIT)}
                <Text style={{ color: colors.error }}>{value.slice(ABOUT_LIMIT)}</Text>
                <Text style={styles.inlineStatus}>  {statusLabel}{isRecording ? ` ${formatTime(duration)}` : ''}</Text>
              </Text>
            </ScrollView>
          ) : busy ? (
            <View style={styles.statusRow} accessibilityRole="text" accessibilityLiveRegion="polite">
              {!isRecording ? <ActivityIndicator size="small" color={colors.textWeak} /> : null}
              <Text style={styles.statusTitle}>{statusLabel}</Text>
              {isRecording ? (
                <View style={styles.timer}>
                  <View style={styles.dot} />
                  <Text style={styles.timerText}>{formatTime(duration)}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <TextInput
              value={value}
              onChangeText={onChange}
              accessibilityLabel="Enter About info"
              placeholder="Eg: I am a software engineer and a father of 2 living in Dublin. I care about family, creativity and personal growth. Lately I’ve been focused on building the things I’m proud of…"
              placeholderTextColor={colors.textWeak}
              multiline
              textAlignVertical="top"
              style={styles.input}
            />
          )}
        </View>

        <View style={styles.footer}>
          {isRecording ? (
            <>
              <TouchableOpacity
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Discard recording"
                hitSlop={6}
                style={styles.roundButton}
              >
                <X size={16} color={colors.textWeak} />
              </TouchableOpacity>
              <View style={styles.wave} accessible={false}>
                {levels.map((level, i) => <View key={i} style={[styles.bar, { height: 3 + level * 21 }]} />)}
              </View>
            </>
          ) : (
            <Text style={styles.counter}>
              <Text style={excess ? { color: colors.error } : undefined}>{value.length}</Text>/{ABOUT_LIMIT}
            </Text>
          )}
          <TouchableOpacity
            onPress={handleMic}
            disabled={!isRecording && (busy || value.length >= ABOUT_LIMIT)}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Stop and transcribe' : 'Record about yourself'}
            hitSlop={6}
            style={[styles.roundButton, !isRecording && (busy || value.length >= ABOUT_LIMIT) && styles.disabled]}
          >
            {isRecording
              ? <Square size={14} color={colors.brand} fill={colors.brand} />
              : <Mic size={16} color={colors.textBase} />}
          </TouchableOpacity>
        </View>
      </View>

      {excess > 0 ? (
        <Text style={styles.error}>Remove {excess.toLocaleString()} characters to continue.</Text>
      ) : null}
      {error ? (
        <View style={styles.errorRow}>
          <Text style={[styles.error, styles.errorText]}>{error}</Text>
          {canRetry ? (
            <Button variant="outline" size="sm" rounded="full" disabled={busy} onPress={() => void recording.retry()}>
              Retry transcription
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Figma 19761:11049: label 6px above a 196px box on fillWeaker, 12/8 padding, 16px radius.
  section: { gap: 6 },
  label: { ...TYPE.label, color: colors.textStrong },
  box: {
    backgroundColor: colors.fillWeaker,
    borderWidth: 1,
    borderColor: colors.strokeWeak,
    borderRadius: radius(16),
    paddingHorizontal: responsiveSpace(12),
    paddingVertical: responsiveSpace(8),
    height: 196,
    gap: 8,
  },
  body: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  input: { ...TYPE.bodyLarge, flex: 1, color: colors.textStrong, padding: 0, margin: 0, textAlignVertical: 'top' },
  text: { ...TYPE.bodyLarge, color: colors.textStrong },
  inlineStatus: { ...TYPE.bodySmall, color: colors.textWeak },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  statusTitle: { ...TYPE.sectionTitleWeak, color: colors.textStrong },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  timerText: { ...TYPE.bodySmall, color: colors.textWeak },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  counter: { ...TYPE.chipLabel, flex: 1, color: colors.textWeak },
  roundButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.strokeStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  wave: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 32, overflow: 'hidden' },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.textWeak },
  error: { ...TYPE.bodySmall, color: colors.error },
  errorRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  errorText: { flexShrink: 1 },
});
