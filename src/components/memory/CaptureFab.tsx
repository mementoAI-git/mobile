import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming, type AnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import Mic from 'lucide-react-native/icons/mic';
import Plus from 'lucide-react-native/icons/plus';
import X from 'lucide-react-native/icons/x';
import PhoneCall from 'lucide-react-native/icons/phone-call';
import PenLine from 'lucide-react-native/icons/pen-line';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, TouchableOpacity } from '@/components/ui/Touchable';
import { tabBarPillTop } from '@/components/TabBar';
import { useFloatingAction } from '@/components/memory/FloatingActionLayer';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { BRAND_BUTTON_GRADIENT } from '@/constants/tokens';
import { TYPE } from '@/constants/typography';
import { iconSize, minTouchTarget } from '@/constants/responsive';

const FAB_SIZE = minTouchTarget(60);
const OPTION_SIZE = minTouchTarget(52);
const FAB_RIGHT = 24;
/** Space between the button and the top of the tab bar pill. */
const TAB_BAR_CLEARANCE = 16;
/** Distance from the button's centre to each option's centre: leaves room for each label. */
const ARC_RADIUS = 136;
const OPEN_SPRING = { damping: 16, stiffness: 190, mass: 0.8 };

type CaptureOption = { key: string; label: string; icon: LucideIcon; angle: number; onPress: () => void };

/**
 * The capture button (Stories, Overview): a round brand button, 16px above the tab bar. Tapping it dims the whole screen (tab bar included) and fans
 * Talk, Write and Record out along an arc above and to the left of it.
 */
type CaptureFabProps = {
  onTalk: () => void;
  onWrite: () => void;
  onRecord: () => void;
  /** The resting glyph (a plus by default). It turns into the close cross when open. */
  icon?: LucideIcon;
  /** Optional animated style for showing the button, e.g. Overview reveals it on scroll. */
  revealStyle?: AnimatedStyle<ViewStyle>;
};

/**
 * Renders nothing in place: the button is drawn by `FloatingActionHost` above the tab bar,
 * so the tab bar's frosted fade never covers it.
 */
export function CaptureFab({ onTalk, onWrite, onRecord, icon, revealStyle }: CaptureFabProps) {
  const node = useMemo(
    () => <CaptureFabView onTalk={onTalk} onWrite={onWrite} onRecord={onRecord} icon={icon} revealStyle={revealStyle} />,
    [onTalk, onWrite, onRecord, icon, revealStyle],
  );
  useFloatingAction(node);
  return null;
}

function CaptureFabView({ onTalk, onWrite, onRecord, icon: Icon = Plus, revealStyle }: CaptureFabProps) {
  const COLORS = useThemeColors();
  const insets = useSafeAreaInsets();
  const bottom = tabBarPillTop(insets.bottom) + TAB_BAR_CLEARANCE;
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const pendingAction = useRef<(() => void) | null>(null);

  // Navigate only once the overlay is gone, so the next page never presents over a dismissing modal.
  useEffect(() => {
    if (open || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    const timer = setTimeout(action, 40);
    return () => clearTimeout(timer);
  }, [open]);

  const expand = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen(true);
    progress.value = withSpring(1, OPEN_SPRING);
  }, [progress]);

  const collapse = useCallback((then?: () => void) => {
    pendingAction.current = then ?? null;
    progress.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) scheduleOnRN(setOpen, false);
    });
  }, [progress]);

  const handleClose = useCallback(() => {
    void Haptics.selectionAsync();
    collapse();
  }, [collapse]);

  const options: CaptureOption[] = [
    { key: 'talk', label: 'Talk', icon: PhoneCall, angle: 180, onPress: onTalk },
    { key: 'write', label: 'Write', icon: PenLine, angle: 135, onPress: onWrite },
    { key: 'record', label: 'Record', icon: Mic, angle: 90, onPress: onRecord },
  ];

  const anchor = { position: 'absolute' as const, right: FAB_RIGHT, bottom };
  const fabSurface = {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: COLORS.brand,
    experimental_backgroundImage: BRAND_BUTTON_GRADIENT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  };

  return (
    <>
      <Animated.View style={[anchor, { zIndex: 50 }, revealStyle]}>
        <TouchableOpacity
          onPress={expand}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="New memory"
          accessibilityHint="Choose to talk, write or record"
          accessibilityState={{ expanded: open }}
          style={[fabSurface, { opacity: open ? 0 : 1 }]}
        >
          <Icon size={iconSize(24)} color={COLORS.textInverse} strokeWidth={2.2} />
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={open} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={handleClose}>
        <Backdrop progress={progress} color={COLORS.mediaScrim} onPress={handleClose} />
        <View style={anchor} pointerEvents="box-none">
          {options.map((option) => (
            <ArcOption
              key={option.key}
              option={option}
              progress={progress}
              surface={COLORS.mediaText}
              ink={COLORS.mediaSurface}
              shadow={COLORS.shadow}
              labelColor={COLORS.mediaTextWeak}
              onSelect={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                collapse(option.onPress);
              }}
            />
          ))}
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Close new memory options"
            // A quiet, opaque neutral close, so the white options stand out.
            style={[fabSurface, { backgroundColor: COLORS.mediaSurface, experimental_backgroundImage: undefined, borderWidth: 1, borderColor: COLORS.mediaFill, shadowOpacity: 0, elevation: 0 }]}
          >
            <FabGlyph progress={progress} color={COLORS.mediaText} icon={Icon} />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

function Backdrop({ progress, color, onPress }: { progress: SharedValue<number>; color: string; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value) }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} accessibilityLabel="Close" accessibilityRole="button" voiceLabel={false} />
    </Animated.View>
  );
}

/** The resting icon turns into a close cross as the menu opens. */
function FabGlyph({ progress, color, icon: Icon }: { progress: SharedValue<number>; color: string; icon: LucideIcon }) {
  const micStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0], 'clamp'),
    transform: [{ rotate: `${progress.value * 90}deg` }],
  }));
  const closeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.4, 1], [0, 1], 'clamp'),
    transform: [{ rotate: `${(progress.value - 1) * 90}deg` }],
  }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, micStyle]}>
        <Icon size={iconSize(24)} color={color} strokeWidth={2.2} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, closeStyle]}>
        <X size={iconSize(24)} color={color} strokeWidth={2.2} />
      </Animated.View>
    </>
  );
}

function ArcOption({ option, progress, surface, ink, shadow, labelColor, onSelect }: {
  option: CaptureOption;
  progress: SharedValue<number>;
  surface: string;
  ink: string;
  shadow: string;
  labelColor: string;
  onSelect: () => void;
}) {
  const radians = (option.angle * Math.PI) / 180;
  const dx = Math.cos(radians) * ARC_RADIUS;
  const dy = -Math.sin(radians) * ARC_RADIUS;
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [0, 1], 'clamp'),
    transform: [
      { translateX: dx * progress.value },
      { translateY: dy * progress.value },
      { scale: interpolate(progress.value, [0, 1], [0.4, 1]) },
    ],
  }));
  const Icon = option.icon;
  return (
    <Animated.View style={[styles.option, style]}>
      <TouchableOpacity
        onPress={onSelect}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={option.label}
        style={[styles.optionButton, { backgroundColor: surface, shadowColor: shadow }]}
      >
        <Icon size={iconSize(22)} color={ink} strokeWidth={2} />
      </TouchableOpacity>
      <Text style={[TYPE.label, styles.optionLabel, { color: labelColor }]} numberOfLines={1}>
        {option.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  // Each option is centred on the main button, then pushed out along its angle.
  option: {
    position: 'absolute',
    left: (FAB_SIZE - OPTION_SIZE) / 2,
    top: (FAB_SIZE - OPTION_SIZE) / 2,
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    alignItems: 'center',
    overflow: 'visible',
  },
  optionButton: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: OPTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  optionLabel: { position: 'absolute', top: OPTION_SIZE + 6, width: 80, textAlign: 'center' },
});
