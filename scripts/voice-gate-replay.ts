/**
 * Scores the loudspeaker echo gate on a call captured with
 * EXPO_PUBLIC_VOICE_DEBUG_CAPTURE=true (see src/features/chat/voice-gate-capture.ts).
 *
 *   bun run voice:replay voice-gate-<time>.json labels.txt
 *
 * labels.txt is an Audacity label track (File > Export > Labels) marking where
 * the user spoke on voice-gate-<time>.wav, which must sit next to the JSON.
 */
import { readFileSync } from 'node:fs';

import { readPcm16Wav } from '../src/features/chat/voice-gate-capture';
import {
  parseAudacityLabels,
  replayEchoGate,
  type VoiceGateCaptureFile,
} from '../src/features/chat/voice-gate-replay';

function percentile(values: number[], p: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const [capturePath, labelsPath] = process.argv.slice(2);
if (!capturePath || !labelsPath) {
  console.error('Usage: bun run voice:replay <voice-gate-*.json> <labels.txt>');
  process.exit(1);
}

const capture = JSON.parse(readFileSync(capturePath, 'utf8')) as VoiceGateCaptureFile;
const { samples } = readPcm16Wav(new Uint8Array(readFileSync(capturePath.replace(/\.json$/, '.wav'))));
const labels = parseAudacityLabels(readFileSync(labelsPath, 'utf8'));
const report = replayEchoGate({ capture, samples, labels });
const { interruptions, userSpeechWhileAudible } = report;

console.log(JSON.stringify({ meta: capture.meta, ...report }, null, 2));
console.log(`
Memento audible on the speaker: ${report.audibleSeconds.toFixed(1)} s
Interruptions heard:            ${interruptions.heard}/${interruptions.attempts}
Onset clipped (p50 / p95):      ${percentile(interruptions.onsetClipMs, 50) ?? '-'} / ${percentile(interruptions.onsetClipMs, 95) ?? '-'} ms
User speech that got through:   ${userSpeechWhileAudible.passedMs}/${userSpeechWhileAudible.totalMs} ms
False openings:                 ${report.falseOpenings} (${report.falseOpeningsPerMinute.toFixed(2)} per minute audible)
Echo leaked:                    ${report.leakedMs} ms`);
