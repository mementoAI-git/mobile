/**
 * Lightweight Client-Side Voice Activity Detector (Micro-VAD).
 *
 * Distinguishes human speech from speakerphone acoustic leakage, room
 * reverberation, and ambient environmental noise using multi-feature analysis:
 * 1. Pitch Harmonicity (autocorrelation in human pitch range 80Hz - 350Hz)
 * 2. Voice-Band Energy Concentration (formants 300Hz - 3400Hz via IIR filter)
 * 3. Zero-Crossing Rate (ZCR for voiced/unvoiced phoneme bounds)
 * 4. Adaptive Signal-to-Noise Ratio (tracking dynamic background noise floor)
 */

export type VadFrameResult = {
  isSpeech: boolean;
  probability: number;
  rmsEnergy: number;
  peakAmplitude: number;
  zeroCrossingRate: number;
  harmonicity: number;
  voiceBandRatio: number;
  snrDb: number;
};

export type VadOptions = {
  sampleRate?: number;
  /** Minimum probability for speech classification */
  speechProbabilityThreshold?: number;
};

// 2nd-order Butterworth Bandpass filter coefficients (300 Hz - 3300 Hz at 16 kHz)
// Normalized frequencies: low = 300/8000 = 0.0375, high = 3300/8000 = 0.4125
// Pre-computed stable biquad coefficients for 16kHz
const BP_B0 = 0.4187;
const BP_B1 = 0.0;
const BP_B2 = -0.4187;
const BP_A1 = -0.8711;
const BP_A2 = 0.1626;

export function calculateZeroCrossingRate(samples: Float32Array): number {
  if (samples.length < 2) return 0;
  let crossings = 0;
  let prevSign = samples[0] >= 0;

  for (let index = 1; index < samples.length; index += 1) {
    const currentSign = samples[index] >= 0;
    if (currentSign !== prevSign) {
      crossings += 1;
      prevSign = currentSign;
    }
  }

  return crossings / (samples.length - 1);
}

/**
 * Normalized autocorrelation peak in the human fundamental pitch range (80 Hz - 350 Hz).
 * At 16 kHz sample rate:
 * - 355 Hz -> ~45 samples
 * - 80 Hz  -> ~200 samples
 */
export function calculateHarmonicity(
  samples: Float32Array,
  sampleRate = 16_000,
): number {
  const length = samples.length;
  if (length < 200) return 0;

  const minLag = Math.max(1, Math.round(sampleRate / 355)); // ~45 at 16kHz
  const maxLag = Math.min(length - 1, Math.round(sampleRate / 80)); // ~200 at 16kHz

  let energy0 = 0;
  for (let index = 0; index < length; index += 1) {
    energy0 += samples[index] * samples[index];
  }
  if (energy0 < 1e-6) return 0;

  let maxAutocorr = 0;
  // Step by 2 for lightweight Hermes JS execution while preserving pitch resolution
  for (let lag = minLag; lag <= maxLag; lag += 2) {
    let sum = 0;
    const end = length - lag;
    for (let index = 0; index < end; index += 2) {
      sum += samples[index] * samples[index + lag];
    }
    // Multiply by 2 to compensate for step=2 in sum
    const norm = (sum * 2) / energy0;
    if (norm > maxAutocorr) {
      maxAutocorr = norm;
    }
  }

  return Math.max(0, Math.min(1, maxAutocorr));
}

/**
 * Proportion of energy concentrated in the human vocal formant band (300 Hz - 3300 Hz).
 */
export function calculateVoiceBandRatio(samples: Float32Array): number {
  const length = samples.length;
  if (length === 0) return 0;

  let totalEnergy = 0;
  let bandEnergy = 0;

  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;

  for (let index = 0; index < length; index += 1) {
    const x0 = samples[index];
    totalEnergy += x0 * x0;

    const y0 = BP_B0 * x0 + BP_B1 * x1 + BP_B2 * x2 - BP_A1 * y1 - BP_A2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;

    bandEnergy += y0 * y0;
  }

  if (totalEnergy < 1e-6) return 0;
  return Math.min(1, bandEnergy / totalEnergy);
}

export class VoiceActivityDetector {
  private readonly sampleRate: number;
  private readonly speechThreshold: number;

  private noiseFloorEnergy = 0.0001; // ~ -40 dB initial floor

  constructor(options: VadOptions = {}) {
    this.sampleRate = options.sampleRate ?? 16_000;
    this.speechThreshold = options.speechProbabilityThreshold ?? 0.45;
  }

  reset(): void {
    this.noiseFloorEnergy = 0.0001;
  }

  processFrame(samples: Float32Array): VadFrameResult {
    const length = samples.length;
    if (length === 0) {
      return {
        isSpeech: false,
        probability: 0,
        rmsEnergy: 0,
        peakAmplitude: 0,
        zeroCrossingRate: 0,
        harmonicity: 0,
        voiceBandRatio: 0,
        snrDb: 0,
      };
    }

    let sumSquares = 0;
    let peak = 0;
    for (let index = 0; index < length; index += 1) {
      const abs = Math.abs(samples[index]);
      if (abs > peak) peak = abs;
      sumSquares += abs * abs;
    }
    const rms = Math.sqrt(sumSquares / length);

    // Dynamic noise floor adaptation (slow rise, fast fall)
    if (rms < this.noiseFloorEnergy) {
      this.noiseFloorEnergy = rms * 0.1 + this.noiseFloorEnergy * 0.9;
    } else {
      this.noiseFloorEnergy = this.noiseFloorEnergy * 0.999 + rms * 0.001;
    }
    this.noiseFloorEnergy = Math.max(1e-5, this.noiseFloorEnergy);

    const snrLinear = rms / this.noiseFloorEnergy;
    const snrDb = 20 * Math.log10(Math.max(1, snrLinear));

    // Acoustic features
    const zcr = calculateZeroCrossingRate(samples);
    const harmonicity = calculateHarmonicity(samples, this.sampleRate);
    const voiceBandRatio = calculateVoiceBandRatio(samples);

    // Multi-feature probabilistic scoring:
    // 1. SNR score: 0 at 3dB SNR, 1.0 at 18dB+ SNR
    const snrScore = Math.max(0, Math.min(1, (snrDb - 3) / 15));

    // 2. Harmonicity score: strong pitch periodicity in human voice range
    const harmonicScore = Math.max(0, Math.min(1, (harmonicity - 0.2) / 0.5));

    // 3. Formant concentration: human speech concentrates in 300Hz-3300Hz
    const formantScore = Math.max(0, Math.min(1, (voiceBandRatio - 0.4) / 0.4));

    // 4. ZCR validity: speech phonemes fall in [0.03, 0.45]
    let zcrScore = 0;
    if (zcr >= 0.03 && zcr <= 0.45) {
      zcrScore = 1.0;
    } else if (zcr < 0.03) {
      // Sub-audible low rumble or DC offset
      zcrScore = Math.max(0, zcr / 0.03);
    } else {
      // High-frequency hiss / noise
      zcrScore = Math.max(0, 1 - (zcr - 0.45) / 0.3);
    }

    // Weighted speech probability:
    // Human voice is characterized by high SNR + formant concentration + pitch periodicity
    let probability =
      0.35 * snrScore +
      0.30 * harmonicScore +
      0.25 * formantScore +
      0.10 * zcrScore;

    // Gate out extreme low-energy silence regardless of mathematical ratios
    if (rms < 0.015) {
      probability *= Math.max(0, rms / 0.015);
    }

    const isSpeech = probability >= this.speechThreshold;
    return {
      isSpeech,
      probability,
      rmsEnergy: rms,
      peakAmplitude: peak,
      zeroCrossingRate: zcr,
      harmonicity,
      voiceBandRatio,
      snrDb,
    };
  }

}
