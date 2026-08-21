import { COLORS } from '@/constants/tokens';

export type VoiceId = 'denver' | 'sue' | 'josef' | 'hannah' | 'maya' | 'leo';

export interface VoiceDefinition {
  id: VoiceId;
  name: string;
  subtitle: string;
  providerVoiceName: 'Fenrir' | 'Aoede' | 'Enceladus' | 'Kore' | 'Leda' | 'Puck';
  artworkFileName: string;
  placeholderColors: readonly [string, string, ...string[]];
}

export const VOICE_CATALOG: readonly VoiceDefinition[] = [
  {
    id: 'denver',
    name: 'Denver',
    subtitle: 'Male v1',
    providerVoiceName: 'Fenrir',
    artworkFileName: 'voice-denver.png',
    placeholderColors: [COLORS.beneficiaryGroupPurple, COLORS.brand, COLORS.backgroundInverse],
  },
  {
    id: 'sue',
    name: 'Sue',
    subtitle: 'Female v2',
    providerVoiceName: 'Aoede',
    artworkFileName: 'voice-sue.png',
    placeholderColors: [COLORS.beneficiaryGroupPink, COLORS.beneficiaryGroupMagenta, COLORS.blue1],
  },
  {
    id: 'josef',
    name: 'Josef',
    subtitle: 'Male v3',
    providerVoiceName: 'Enceladus',
    artworkFileName: 'voice-josef.png',
    placeholderColors: [COLORS.blue2, COLORS.beneficiaryGroupBlue, COLORS.blue7],
  },
  {
    id: 'hannah',
    name: 'Hannah',
    subtitle: 'Female v4',
    providerVoiceName: 'Kore',
    artworkFileName: 'voice-hannah.png',
    placeholderColors: [COLORS.info, COLORS.beneficiaryGroupBlue, COLORS.onboardingAmberLight, COLORS.beneficiaryGroupPink],
  },
  {
    id: 'maya',
    name: 'Maya',
    subtitle: 'Female v5',
    providerVoiceName: 'Leda',
    artworkFileName: 'voice-maya.png',
    placeholderColors: [COLORS.beneficiaryGroupMagenta, COLORS.onboardingAmberLight, COLORS.brand],
  },
  {
    id: 'leo',
    name: 'Leo',
    subtitle: 'Male v6',
    providerVoiceName: 'Puck',
    artworkFileName: 'voice-leo.png',
    placeholderColors: [COLORS.beneficiaryGroupGreen, COLORS.info, COLORS.backgroundInverse],
  },
] as const;

export function getVoiceById(id?: string | null): VoiceDefinition | null {
  return VOICE_CATALOG.find((voice) => voice.id === id) ?? null;
}
