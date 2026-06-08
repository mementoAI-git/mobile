/**
 * EditorActionBar — shared bottom toolbar for article (Story mode) and
 * quick-capture (Quick capture mode) screens.
 *
 * Shows:
 *  - "SWITCH MODES OR ADD MEDIA FILES" label
 *  - Two mode pills: active mode = dark, inactive = ghost
 *  - 4 media action buttons (optional — only functional in quick-capture)
 *  - First-use tooltip that auto-dismisses after 3s and never reappears
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BookOpen,
  Zap,
  Image as ImageIcon,
  ImagePlus,
  AudioLines,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS } from '@/constants/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOLTIP_SEEN_KEY = 'editor_mode_tooltip_seen_v1';
const TOOLTIP_DURATION_MS = 3500;

// ─── Types ────────────────────────────────────────────────────────────────────

export type EditorMode = 'story' | 'quick-capture';

interface EditorActionBarProps {
  /** Which mode this screen is currently in — that pill will be active/dark */
  mode: EditorMode;
  /** Called when the user taps the inactive mode pill to switch */
  onSwitchMode: () => void;
  /** Media attachment callbacks — work in both story and quick-capture modes */
  onPhoto?: () => void;
  onCamera?: () => void;
  onAudio?: () => void;
  onFile?: () => void;
  /** If a voice recording is active, the audio button highlights */
  isRecording?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditorActionBar({
  mode,
  onSwitchMode,
  onPhoto,
  onCamera,
  onAudio,
  onFile,
  isRecording = false,
}: EditorActionBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Check if tooltip has been seen before ──────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(TOOLTIP_SEEN_KEY).then((val) => {
      if (!val) {
        // Delay slightly so the keyboard/screen transition settles first
        const t = setTimeout(() => {
          setShowTooltip(true);
          Animated.timing(tooltipOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }).start();

          // Auto-dismiss after TOOLTIP_DURATION_MS
          tooltipTimer.current = setTimeout(() => {
            dismissTooltip();
          }, TOOLTIP_DURATION_MS);
        }, 800);
        return () => clearTimeout(t);
      }
    });
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissTooltip = useCallback(() => {
    Animated.timing(tooltipOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowTooltip(false));
    AsyncStorage.setItem(TOOLTIP_SEEN_KEY, '1').catch(() => {});
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, [tooltipOpacity]);

  const handleSwitchMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showTooltip) dismissTooltip();
    onSwitchMode();
  }, [onSwitchMode, showTooltip, dismissTooltip]);

  const isStory = mode === 'story';

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>SWITCH MODES OR ADD MEDIA FILES</Text>

      {/* Tooltip */}
      {showTooltip && (
        <Animated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={dismissTooltip}>
            <Text style={styles.tooltipText}>
              Switch between{' '}
              <Text style={styles.tooltipBold}>Story mode</Text>
              {' '}(long-form writing) and{' '}
              <Text style={styles.tooltipBold}>Quick Capture</Text>
              {' '}(fast notes & media)
            </Text>
            <Text style={styles.tooltipDismiss}>Tap to dismiss</Text>
          </TouchableOpacity>
          {/* Arrow pointing down */}
          <View style={styles.tooltipArrow} />
        </Animated.View>
      )}

      {/* Pill row */}
      <View style={styles.row}>
        {/* Single mode pill — shows current mode, tapping switches to the other */}
        <TouchableOpacity
          onPress={handleSwitchMode}
          activeOpacity={0.8}
          style={[styles.modePill, isStory ? styles.modePillStory : styles.modePillQuick]}
        >
          {/* {isStory
            ? <BookOpen size={15} color={COLORS.textInverse} strokeWidth={2} />
            // : <Zap size={15} color={COLORS.textInverse} strokeWidth={2} fill={COLORS.textInverse} />
            : <BookOpen size={15} color={COLORS.textInverse} strokeWidth={2} fill={COLORS.textInverse} />
          } */}
          <BookOpen size={15} color={COLORS.textInverse} strokeWidth={2} />
          <Text style={styles.modePillText}>
            {isStory ? 'Story mode' : 'Quick capture'}
          </Text>
        </TouchableOpacity>

        {/* Media buttons */}
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onPhoto?.(); }}
          activeOpacity={0.75}
          style={styles.mediaBtn}
        >
          <ImageIcon size={20} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onCamera?.(); }}
          activeOpacity={0.75}
          style={styles.mediaBtn}
        >
          <ImagePlus size={20} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onAudio?.(); }}
          activeOpacity={0.75}
          style={[styles.mediaBtn, isRecording && styles.mediaBtnRecording]}
        >
          <AudioLines
            size={20}
            color={isRecording ? COLORS.error : COLORS.textBase}
            strokeWidth={1.8}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onFile?.(); }}
          activeOpacity={0.75}
          style={styles.mediaBtn}
        >
          <FileText size={20} color={COLORS.textBase} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.strokeWeaker,
    backgroundColor: COLORS.background,
    gap: 10,
  },

  label: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ── Mode pills ──────────────────────────────────────────────────────────────
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  modePillActive: {
    backgroundColor: COLORS.textStrong,
  },
  modePillInactive: {
    backgroundColor: COLORS.fillWeak,
  },
  // Single-pill variants: story = near-black, quick-capture = brand orange
  modePillStory: {
    backgroundColor: COLORS.textStrong,
  },
  modePillQuick: {
    // backgroundColor: COLORS.brand,
    backgroundColor: "#77C7AF",
  },
  modePillText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
    color: COLORS.textInverse,
  },
  modePillTextActive: {
    color: COLORS.textInverse,
  },
  modePillTextInactive: {
    color: COLORS.textBase,
  },

  // ── Media buttons ───────────────────────────────────────────────────────────
  mediaBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.fillWeak,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBtnRecording: {
    backgroundColor: `${COLORS.error}15`,
  },

  // ── Tooltip ─────────────────────────────────────────────────────────────────
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 12,
    right: 12,
    marginBottom: 12,
    backgroundColor: COLORS.textStrong,
    borderRadius: 14,
    padding: 14,
    zIndex: 100,
  },
  tooltipText: {
    fontFamily: FONTS.sans,
    fontSize: 13,
    color: COLORS.textInverse,
    lineHeight: 20,
  },
  tooltipBold: {
    fontFamily: FONTS.sansBold,
    color: COLORS.textInverse,
  },
  tooltipDismiss: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: 20,
    width: 12,
    height: 12,
    backgroundColor: COLORS.textStrong,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
});
