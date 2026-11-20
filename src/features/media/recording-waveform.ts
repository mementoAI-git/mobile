import { COLORS } from '@/constants/tokens';
import { LIGHT_SKY_COLORS } from '@/constants/appearance';

/**
 * The waveform's colour on recording story cards: white on Dark and Deep Sky,
 * and dark on the light palettes (Light Sky and Light), whose pale cards white
 * would fade into (web: stories/components/recording-card.tsx).
 */
export function recordingWaveformColor(colors: typeof COLORS): string {
  return colors === LIGHT_SKY_COLORS || colors === COLORS ? colors.textStrong : COLORS.textInverse;
}

/**
 * The illustrated waveform on recording cards. Real speech comes in words:
 * short bursts that swell and fall, of uneven loudness, with pauses between.
 * The shape is seeded by the recording, so a recording always looks the same.
 */
export function recordingWaveform(seed: string, count: number): number[] {
  const random = seededRandom(seed);
  const bars: number[] = [];
  // Phrases get louder and quieter, so the whole line has some shape.
  let phrase = 0.65 + random() * 0.35;
  while (bars.length < count) {
    if (random() < 0.25) phrase = 0.5 + random() * 0.5;
    const length = 2 + Math.floor(random() * 6);
    const peak = phrase * (0.45 + random() * 0.55);
    for (let i = 0; i < length; i += 1) {
      const swell = Math.sin((Math.PI * (i + 0.5)) / length);
      bars.push(clamp(peak * (0.35 + 0.65 * swell) * (0.75 + random() * 0.5)));
    }
    // A pause between some words.
    if (random() < 0.4) {
      const pause = 1 + Math.floor(random() * 2);
      for (let i = 0; i < pause; i += 1) bars.push(0.08 + random() * 0.1);
    }
  }
  return bars.slice(0, Math.max(0, count));
}

function clamp(value: number) {
  return Math.min(1, Math.max(0.1, value));
}

/** mulberry32, seeded from the string. */
function seededRandom(seed: string) {
  let state = 0x9e3779b9;
  for (let i = 0; i < seed.length; i += 1) state = Math.imul(state ^ seed.charCodeAt(i), 0x85ebca6b);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
