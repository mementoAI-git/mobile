import React, { forwardRef } from 'react';
import {
  Pressable as RNPressable,
  TouchableOpacity as RNTouchableOpacity,
  type AccessibilityState,
  type GestureResponderEvent,
  type PressableProps,
  type TouchableOpacityProps,
  type View,
} from 'react-native';

import { withBrandButtonSurface, withPressableBrandSurface } from '@/features/appearance/brand-button-surface';
import { useVoicePressTarget } from '@/features/voice-control/hooks';
import { voiceLabelFor } from '@/features/voice-control/label';

/**
 * Drop-in TouchableOpacity and Pressable that Memento can press by voice
 * ("tap Personal information"), labelled by `voiceLabel`, the accessibility
 * label, or the text inside. Use these instead of the react-native ones.
 * `voiceLabel={false}` keeps voice away from one.
 */

type VoiceProps = { voiceLabel?: string | false };

/** Handlers sometimes call these; a voice press has no real touch behind it. */
const VOICE_PRESS_EVENT = {
  nativeEvent: {},
  stopPropagation: () => undefined,
  preventDefault: () => undefined,
  persist: () => undefined,
} as unknown as GestureResponderEvent;

/** On/off for options and switches, from their accessibility state. */
function onStateOf(state: AccessibilityState | undefined): boolean | undefined {
  if (!state) return undefined;
  if (typeof state.checked === 'boolean') return state.checked;
  if (typeof state.selected === 'boolean') return state.selected;
  return undefined;
}

function useVoicePress(
  voiceLabel: string | false | undefined,
  props: {
    accessibilityLabel?: string;
    accessibilityState?: AccessibilityState;
    children?: unknown;
    onPress?: ((event: GestureResponderEvent) => void) | null;
    disabled?: boolean | null;
  },
) {
  const { onPress } = props;
  useVoicePressTarget(
    voiceLabelFor(voiceLabel, props.accessibilityLabel, props.children),
    onPress ? () => onPress(VOICE_PRESS_EVENT) : undefined,
    !props.disabled,
    onStateOf(props.accessibilityState),
  );
}

export const TouchableOpacity = forwardRef<View, TouchableOpacityProps & VoiceProps>(
  function TouchableOpacity({ voiceLabel, ...props }, ref) {
    useVoicePress(voiceLabel, props);
    return <RNTouchableOpacity ref={ref} {...props} style={withBrandButtonSurface(props.style, props.className)} />;
  },
);

export const Pressable = forwardRef<View, PressableProps & VoiceProps>(function Pressable(
  { voiceLabel, ...props },
  ref,
) {
  useVoicePress(voiceLabel, props);
  return <RNPressable ref={ref} {...props} style={withPressableBrandSurface(props.style, props.className)} />;
});
