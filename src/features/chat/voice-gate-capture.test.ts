import { describe, expect, test } from 'bun:test';

import { VOICE_INPUT_FRAMES } from './voice-audio-engine';
import { readPcm16Wav, VoiceGateCapture } from './voice-gate-capture';
import { VOICE_CAPTURE_FRAME_SAMPLES } from './voice-gate-replay';

const frame = (level: number) => new Float32Array(VOICE_CAPTURE_FRAME_SAMPLES).fill(level);

describe('VoiceGateCapture', () => {
  test('uses the engine mic frame size', () => {
    expect(VOICE_CAPTURE_FRAME_SAMPLES).toBe(VOICE_INPUT_FRAMES);
  });

  test('keeps the raw mic and the per-frame flags the replay needs', () => {
    const capture = new VoiceGateCapture();
    capture.add(frame(0.1), { audibleOnSpeaker: true, greetingShield: true });
    capture.add(frame(0.2), { audibleOnSpeaker: true, greetingShield: false });
    capture.add(frame(-0.3), { audibleOnSpeaker: false, greetingShield: false });

    const { wav, capture: file } = capture.toFiles({ route: 'speaker' });
    expect(file).toMatchObject({
      version: 1,
      sampleRate: 16_000,
      frameSamples: VOICE_CAPTURE_FRAME_SAMPLES,
      frames: 3,
      audibleOnSpeaker: [[0, 2]],
      greetingShield: [[0, 1]],
      meta: { route: 'speaker' },
    });

    const { sampleRate, samples } = readPcm16Wav(wav);
    expect(sampleRate).toBe(16_000);
    expect(samples.length).toBe(3 * VOICE_CAPTURE_FRAME_SAMPLES);
    expect(samples[0]).toBeCloseTo(0.1, 3);
    expect(samples[VOICE_CAPTURE_FRAME_SAMPLES]).toBeCloseTo(0.2, 3);
    expect(samples[2 * VOICE_CAPTURE_FRAME_SAMPLES]).toBeCloseTo(-0.3, 3);
  });

  test('stops recording at its length limit, so a long call cannot fill memory', () => {
    const capture = new VoiceGateCapture(0.08); // two 40 ms frames
    for (let i = 0; i < 5; i += 1) capture.add(frame(0.1), { audibleOnSpeaker: false, greetingShield: false });

    expect(capture.toFiles().capture.frames).toBe(2);
  });

  test('copies each frame, since the recorder reuses its buffer', () => {
    const capture = new VoiceGateCapture();
    const buffer = frame(0.1);
    capture.add(buffer, { audibleOnSpeaker: false, greetingShield: false });
    buffer.fill(0.9);

    expect(readPcm16Wav(capture.toFiles().wav).samples[0]).toBeCloseTo(0.1, 3);
  });
});
