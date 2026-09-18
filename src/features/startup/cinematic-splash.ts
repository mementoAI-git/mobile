export const CINEMATIC_SPLASH = Object.freeze({
  duration: 8_000,
  exitStart: 7_600,
  exitDuration: 400,
  reducedMotionHold: 900,
  skipVisibleAt: 1_800,
  veilDuration: 2_150,
  soilDuration: 2_350,
  bloomDuration: 1_800,
  crackDuration: 2_250,
  sparkleStart: 720,
  sparkleDuration: 900,
  promptStart: 3_600,
  promptDuration: 1_000,
  markStart: 4_300,
  markDuration: 950,
  ledeStart: 6_200,
  ledeDuration: 650,
  facesStart: 6_350,
  facesDuration: 700,
});

export const CINEMATIC_SPLASH_WORDS = Object.freeze([
  { text: 'Don’t', start: 5_150, highlight: false },
  { text: 'let', start: 5_280, highlight: false },
  { text: 'the', start: 5_400, highlight: false },
  { text: 'little', start: 5_580, highlight: true },
  { text: 'things', start: 5_820, highlight: true },
  { text: 'disappear.', start: 6_080, highlight: false },
] as const);

export const CINEMATIC_SPLASH_CARDS = Object.freeze([
  {
    id: 'journal',
    start: 1_280,
    top: 0.28,
    left: -0.24,
    width: 0.48,
    startRotation: -8,
    rotation: -1,
    floatY: -6,
    chip: 'Journal and read insights',
    tone: 'rose',
  },
  {
    id: 'hug',
    start: 1_880,
    top: 0.17,
    left: 0.20,
    width: 0.40,
    startRotation: -6,
    rotation: -1,
    floatY: -8,
    chip: 'Invite beneficiaries',
    tone: 'mint',
  },
  {
    id: 'typewriter',
    start: 2_480,
    top: 0.218,
    left: 0.54,
    width: 0.38,
    startRotation: 6,
    rotation: 2,
    floatY: -6,
    chip: 'AI Chat',
    tone: 'peach',
  },
  {
    id: 'phone',
    start: 3_080,
    top: 0.328,
    left: 0.76,
    width: 0.48,
    startRotation: 8,
    rotation: 2,
    floatY: -7,
    chip: 'Voice mode conversation',
    tone: 'sky',
  },
] as const);

export const CINEMATIC_SPLASH_PARTICLES = Object.freeze([
  { left: 0.08, size: 3, delay: 200 },
  { left: 0.18, size: 2, delay: 700 },
  { left: 0.27, size: 3, delay: 350 },
  { left: 0.36, size: 4, delay: 1_100 },
  { left: 0.44, size: 3, delay: 550 },
  { left: 0.52, size: 3, delay: 900 },
  { left: 0.61, size: 2, delay: 150 },
  { left: 0.69, size: 3, delay: 1_300 },
  { left: 0.77, size: 3, delay: 480 },
  { left: 0.86, size: 4, delay: 800 },
  { left: 0.12, size: 3, delay: 1_600 },
  { left: 0.93, size: 3, delay: 1_050 },
  { left: 0.41, size: 2, delay: 1_850 },
  { left: 0.73, size: 3, delay: 2_100 },
] as const);

export type CinematicSplashCard = (typeof CINEMATIC_SPLASH_CARDS)[number];

export function cinematicSplashAssetNames(): string[] {
  return [
    'journal.webp',
    'hug.webp',
    'typewriter.webp',
    'phone.webp',
    'avatar-1.webp',
    'avatar-2.webp',
    'avatar-3.webp',
  ];
}