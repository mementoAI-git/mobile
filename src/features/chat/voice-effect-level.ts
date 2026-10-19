import { calculateRmsEnergy, pcm16Base64ToFloat32 } from './voice-pcm';

/** Map incoming assistant PCM energy to the decorative glow's 0–1 range. */
export function voiceEffectLevel(pcm: string): number {
  try {
    const decoded = pcm16Base64ToFloat32(pcm);
    return decoded.ok ? Math.min(1, calculateRmsEnergy(decoded.samples) * 7) : 0;
  } catch {
    return 0;
  }
}
