import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  createVoicePreferenceState,
  type VoicePreferenceState,
} from '@/features/chat/voice-preference-state';

export const useVoicePreferenceStore = create<VoicePreferenceState>(
  createVoicePreferenceState(AsyncStorage),
);
