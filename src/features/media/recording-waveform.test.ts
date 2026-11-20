import { expect, test } from 'bun:test';
import { recordingWaveform, recordingWaveformColor } from './recording-waveform';
import { COLORS } from '@/constants/tokens';
import { DARK_COLORS, DEEP_SKY_COLORS, LIGHT_SKY_COLORS } from '@/constants/appearance';

test('the waveform is the requested length, in range, and the same for the same recording', () => {
  const bars = recordingWaveform('file-1', 40);
  expect(bars).toHaveLength(40);
  expect(bars.every((bar) => bar >= 0.1 && bar <= 1)).toBe(true);
  expect(recordingWaveform('file-1', 40)).toEqual(bars);
  expect(recordingWaveform('file-2', 40)).not.toEqual(bars);
  expect(recordingWaveform('', 0)).toEqual([]);
});

test('the waveform reads as speech: uneven, with quiet pauses, not a mirrored curve', () => {
  const bars = recordingWaveform('voice_1731312000000.m4a', 48);
  const max = Math.max(...bars);
  const min = Math.min(...bars);
  expect(max - min).toBeGreaterThan(0.4);
  expect(bars.some((bar) => bar < 0.2)).toBe(true);
  expect([...bars].reverse()).not.toEqual(bars);
});

test('recording cards draw a white waveform on dark themes, and a dark one on the light ones', () => {
  expect(recordingWaveformColor(DARK_COLORS)).toBe('#FFFFFF');
  expect(recordingWaveformColor(DEEP_SKY_COLORS)).toBe('#FFFFFF');
  expect(recordingWaveformColor(LIGHT_SKY_COLORS)).toBe(LIGHT_SKY_COLORS.textStrong);
  expect(recordingWaveformColor(COLORS)).toBe(COLORS.textStrong);
});
