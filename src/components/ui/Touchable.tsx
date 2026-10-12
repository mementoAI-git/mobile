import React, { forwardRef } from 'react';
import {
  Pressable as RNPressable,
  TouchableOpacity as RNTouchableOpacity,
  type GestureResponderEvent,
  type PressableProps,
  type TouchableOpacityProps,
  type View,
} from 'react-native';

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

function useVoicePress(
  voiceLabel: string | false | undefined,
  accessibilityLabel: string | undefined,
  children: unknown,
  onPress: ((event: GestureResponderEvent) => void) | null | undefined,
  disabled: boolean | null | undefined,
) {
  useVoicePressTarget(
    voiceLabelFor(voiceLabel, accessibilityLabel, children),
    onPress ? () => onPress(VOICE_PRESS_EVENT) : undefined,
    !disabled,
  );
}

export const TouchableOpacity = forwardRef<View, TouchableOpacityProps & VoiceProps>(
  function TouchableOpacity({ voiceLabel, ...props }, ref) {
    useVoicePress(voiceLabel, props.accessibilityLabel, props.children, props.onPress, props.disabled);
    return <RNTouchableOpacity ref={ref} {...props} />;
  },
);

export const Pressable = forwardRef<View, PressableProps & VoiceProps>(function Pressable(
  { voiceLabel, ...props },
  ref,
) {
  useVoicePress(voiceLabel, props.accessibilityLabel, props.children, props.onPress, props.disabled);
  return <RNPressable ref={ref} {...props} />;
});
