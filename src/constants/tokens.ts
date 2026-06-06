/**
 * Central design tokens for the Memento Mobile app.
 * These should match the values in tailwind.config.ts where possible.
 *
 * Parity notes:
 *  - `textMuted` (0.3) is a mobile-only addition; web uses only 0.9/0.65/0.45/0.1.
 *  - `error` is intentionally #4A3728 (earthy brown) per AGENTS.md — web uses #C73A3A (brick red). Pending team alignment.
 *  - `blue.*` and `gray.*` ramps mirror web/src/index.css for cross-platform consistency.
 *  - `onboarding.*` full 13-token set mirrors web's --onboarding-* CSS vars.
 */

export const COLORS = {
  background: '#fefbf8',
  card: '#ffffff',

  // Brand
  brand: '#FF5E00',
  brandWeak: 'rgba(255,94,0,0.8)',
  brandTint: 'rgba(255,94,0,0.2)',
  brandSubtle: 'rgba(255,94,0,0.05)',

  // Text
  textStrong: 'rgba(23,11,0,0.9)',
  textBase: 'rgba(23,11,0,0.65)',
  textWeak: 'rgba(23,11,0,0.45)',
  /** Mobile-only step. Web equivalent is textDisabled (0.1). Use for very subtle labels. */
  textMuted: 'rgba(23,11,0,0.3)',
  textDisabled: 'rgba(23,11,0,0.1)',
  textInverse: '#FFFFFF',

  // Status
  success: '#067A57',
  /** Aligned with web #C73A3A (brick red) — team confirmed. */
  error: '#C73A3A',
  warning: '#8F6C1A',
  info: '#1A80F7',

  // Strokes
  strokeStrong: 'rgba(23,11,0,0.45)',
  strokeWeak: 'rgba(23,11,0,0.1)',
  strokeWeaker: 'rgba(23,11,0,0.04)',

  // Fill
  fillWeak: 'rgba(23,11,0,0.04)',
  fillWeaker: 'rgba(23,11,0,0.02)',
  fillStrong: 'rgba(23,11,0,0.9)',

  // ── Onboarding (Groot) palette — full 13-token set matching web --onboarding-* vars ──
  onboardingCream: '#FAF7F2',
  onboardingWarmWhite: '#FFFCF8',
  onboardingSand: '#F0E9DF',
  onboardingSandDark: '#E4D9CC',
  onboardingAmber: '#C8956C',
  onboardingAmberLight: '#E8B99A',
  onboardingAmberPale: '#F5E6DA',
  /** #4A3728 — same value as web's --onboarding-brown-dark */
  onboardingBrown: '#4A3728',
  /** #7A5C45 — web's --onboarding-brown (lighter of the two browns) */
  onboardingBrownDark: '#7A5C45',
  onboardingTextPrimary: '#2C1F15',
  onboardingTextSecondary: '#7A6A5E',
  onboardingTextMuted: '#B0A098',
  onboardingGreenSoft: '#8BAF8B',

  // ── Blue ramp — mirrors web's --color-blue-* (steps 5 and 8/9 intentionally absent) ──
  blue1: '#f1f6fd',
  blue2: '#e9f1fc',
  blue3: '#d8e7f9',
  blue4: '#adcff4',
  /** Focus/active border color — used for shadcn ring on web */
  blue6: '#52a1dd',
  /** shadcn Button default background on web */
  blue7: '#4284b6',

  // ── Gray ramp — mirrors web's --color-gray-* ──
  gray50: '#fafafa',
  gray200: '#eaecf0',
  gray300: '#d0d5dd',
  /** Note: gray400 and gray500 are identical in web (web inconsistency, preserved here) */
  gray400: '#667085',
  gray500: '#667085',
  gray600: '#475467',
  gray700: '#344054',
  gray800: '#1d2939',
  gray900: '#101828',
  gray950: '#1e1e1e',

  // Effects
  shadow: '#170B00',
  glass: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(23, 11, 0, 0.05)',
};

/**
 * CARD_PASTEL_SURFACES — seeded pastel backgrounds for text-only memory cards.
 * Each entry is picked deterministically from stableHash(memory._id) so a card's
 * surface is stable across renders and sessions.
 *
 * These are the only hardcoded hex values approved outside the main COLORS token
 * system. They are intentional warm/cool pastel tints derived from the sand and
 * fill palettes, used exclusively for card backgrounds.
 *
 * Approved exception per AGENTS.md § "Approved hardcoded exceptions".
 */
export const CARD_PASTEL_SURFACES = [
  { bg: '#F5F5F3', border: '#E8E8E4' }, // warm white — mirrors sand-1/sand-2
  { bg: '#F0F4FF', border: '#DDE6FF' }, // soft blue — mirrors blue-1/blue-2
  { bg: '#FFF8ED', border: '#FFE9C4' }, // warm amber — mirrors sand-3/sand-4
  { bg: '#F0F9FF', border: '#D6EEFF' }, // sky — mirrors blue-2/blue-3
  { bg: '#F0FFF6', border: '#C8F0DC' }, // soft green — mirrors success/50
] as const;

export const FONTS = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  serif: 'EBGaramond_400Regular',
  serifMedium: 'EBGaramond_500Medium',
  mono: 'AzeretMono_400Regular',
  averia: 'AveriaSerifLibre_400Regular',
  averiaBold: 'AveriaSerifLibre_700Bold',
  /** Geist — geometric sans used by web for UI numerics and mono-code contexts */
  geist: 'Geist_400Regular',
  geistBold: 'Geist_700Bold',
  /** Georgia — system serif used on web for category card subtitles (18px body) */
  georgia: 'Georgia',
};
