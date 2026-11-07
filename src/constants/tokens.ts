/**
 * Central design tokens for the Memento Mobile app.
 * These should match the values in tailwind.config.ts where possible.
 *
 * Parity notes:
 *  - `textMuted` (0.3) is a mobile-only addition; web uses only 0.9/0.65/0.45/0.1.
 *  - `error` matches the web brick-red semantic token for destructive states.
 *  - `blue.*` and `gray.*` ramps mirror web/src/index.css for cross-platform consistency.
 *  - `onboarding.*` full 13-token set mirrors web's --onboarding-* CSS vars.
 */

import { BODY_FONT, BODY_BOLD_FONT } from './body-font';

export const COLORS = {
  background: '#ffffff',
  backgroundInverse: '#12131A',
  // Pure black, to blend with the iPhone's Dynamic Island hardware.
  dynamicIsland: '#000000',
  card: '#ffffff',
  cardRaised: '#ffffff',
  publishRayStart: '#c9eff9',
  cardOverlay: 'rgba(255,255,255,0.8)',
  activeFill: 'rgba(23,11,0,0.9)',
  activeText: '#FFFFFF',
  mediaSurface: '#12131A',
  mediaText: '#FFFFFF',
  mediaTextWeak: 'rgba(255,255,255,0.78)',
  mediaFill: 'rgba(255,255,255,0.15)',
  mediaScrim: 'rgba(0,0,0,0.52)',
  previewText: '#555555',
  successFill: 'rgba(10,204,146,0.05)',
  successStroke: 'rgba(10,204,146,0.2)',
  errorFill: 'rgba(199,58,58,0.05)',
  warningFill: 'rgba(255,192,46,0.05)',
  infoFill: 'rgba(26,128,247,0.06)',
  chatSettingsWash: '#F5E6DA',
  chatSettingsWashEnd: '#FFFCF8',

  // Link preview chip
  linkPreview: '#22C661',

  // Brand
  brand: '#E98246',
  brandWeak: 'rgba(233,130,70,0.8)',
  brandTint: 'rgba(233,130,70,0.2)',
  brandSubtle: 'rgba(233,130,70,0.05)',

  // Cinematic startup splash — ported from the approved Memento motion study.
  splashPaper: '#FFFDF9',
  splashSky: '#FFF6EA',
  splashPeach: '#F7E5CF',
  splashInk: '#1C1917',
  splashMuted: '#7A746C',
  splashEmber: '#F15A22',
  splashGlow: '#FFB05C',
  splashLime: '#C5DC6E',
  splashSoilLight: '#3A2218',
  splashSoil: '#1A100C',
  splashSoilDeep: '#0E0907',
  splashVeilDeep: '#0D0908',
  splashVeil: '#27150F',
  splashVeilAmber: '#6E3418',
  splashVeilGold: '#D4783A',
  splashVeilLight: '#F0C090',
  splashDust: '#F3E2C8',
  splashSparkle: '#F6C48A',
  splashDevelop: '#F3E4CD',
  splashPrompt: 'rgba(255,252,248,0.92)',
  splashChipMint: '#D4F3DF',
  splashChipPeach: '#F6E1C8',
  splashChipRose: '#F8D4DC',
  splashChipSky: '#C9EBF2',
  splashChipLagoon: '#CFE8EE',
  splashLagoonText: '#2B5D68',
  splashTransparent: 'rgba(255,255,255,0)',

  // Text
  textStrong: 'rgba(23,11,0,0.9)',
  textBase: 'rgba(23,11,0,0.65)',
  textWeak: 'rgba(23,11,0,0.45)',
  /** Mobile-only step. Web equivalent is textDisabled (0.1). Use for very subtle labels. */
  textMuted: 'rgba(23,11,0,0.3)',
  textDisabled: 'rgba(23,11,0,0.1)',
  textInverse: '#FFFFFF',
  /** Web --icon-neutral-disabled (--brown-50). */
  iconDisabled: 'rgba(23,11,0,0.04)',

  // Status
  success: '#067A57',
  /** Aligned with web #C73A3A (brick red) — team confirmed. */
  error: '#C73A3A',
  warning: '#8F6C1A',
  info: '#1A80F7',

  // Editorial stat accents. Centralized for seeded journey/card variants.
  statPink: '#D91DAA',
  statPurple: '#6621F0',
  statYellow: '#FF8C00',

  // Beneficiary group palette — stable indices 0...5 shared with the API.
  beneficiaryGroupGreen: '#7BDD9F',
  beneficiaryGroupBlue: '#70BEF3',
  beneficiaryGroupPurple: '#C6ACF5',
  beneficiaryGroupPink: '#F9AAAA',
  beneficiaryGroupYellow: '#F5C800',
  beneficiaryGroupMagenta: '#F0A7EE',

  // Strokes
  strokeStrong: 'rgba(23,11,0,0.45)',
  strokeWeak: 'rgba(23,11,0,0.1)',
  strokeWeaker: 'rgba(23,11,0,0.04)',

  // Fill
  fillWeak: 'rgba(23,11,0,0.04)',
  fillWeaker: 'rgba(23,11,0,0.02)',
  // Web --fill-chat-user: warm amber surface for the user's chat messages.
  fillChatUser: 'rgba(224,148,67,0.14)',
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
  onboardingUserLime: '#8CB843',

  // Summary card thematic pastel surfaces
  summaryBlueBg: '#F1F6FD',
  summaryBlueBorder: '#C9DEF7',
  summaryBlueText: '#3B82F6',
  summaryPurpleBg: '#FAF5FF',
  summaryPurpleBorder: '#E9D5FF',
  summaryPurpleText: '#8B5CF6',
  summaryPeachBg: '#FFF7F0',
  summaryPeachBorder: '#FCD8BC',
  summaryPeachText: '#E98246',

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
/**
 * Text card surfaces — rgba strings so React Native composites them correctly on white.
 *
 * The web uses color-mix() of very-transparent fills (0.04–0.06 opacity) with white.
 * At those opacities the hue is imperceptible on screen — what you see is essentially
 * white with a warm-neutral border. We replicate that using low-opacity rgba values
 * instead of baked hex so the compositing remains faithful across device brightness.
 *
 * bg:     the fill token composited at ~4% → nearly white with a faint hue
 * border: 80% stroke-neutral-weak + 20% of the semantic fill → warm gray with faint hue
 */
export const CARD_PASTEL_SURFACES = [
  // Visible pastel fills — warm & cool tints for text-only memory cards.
  // 0 — warm cream (neutral sand)
  { bg: '#FBF5EE', border: 'rgba(23,11,0,0.08)' },
  // 1 — peach (brand orange tint)
  { bg: '#FFF0E8', border: 'rgba(200,80,0,0.12)' },
  // 2 — butter (amber/warning tint)
  { bg: '#FDF7E0', border: 'rgba(180,130,0,0.12)' },
  // 3 — sky (info blue tint)
  { bg: '#EEF4FF', border: 'rgba(20,100,220,0.11)' },
  // 4 — mint (success green tint)
  { bg: '#EBF7F2', border: 'rgba(6,100,70,0.12)' },
] as const;

export const FONTS = {
  sans: BODY_FONT,
  chatBody: BODY_FONT,
  bodyBold: BODY_BOLD_FONT,
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  serif: 'EBGaramond_400Regular',
  serifMedium: 'EBGaramond_500Medium',
  serifBold: 'EBGaramond_700Bold',
  serifItalic: 'EBGaramond_400Regular_Italic',
  mono: 'AzeretMono_400Regular',
  geist: 'Geist_400Regular',
  geistMedium: 'Geist_500Medium',
  geistSemi: 'Geist_600SemiBold',
  geistBold: 'Geist_700Bold',
};

/** Shared Overview prompt and side-menu profile surface. */
export const MEMORY_PROMPT_GRADIENT = {
  colors: ['#0B8EEA', '#159EEA', '#54C5F5', '#79DDFB'] as const,
  locations: [0, 0.34, 0.74, 1] as const,
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
};

export type ThemeColors = typeof COLORS;

/** Libraries.dev VoiceBeam sunset palette, matching the web voice surface. */
export const VOICE_GLOW_PALETTE = {
  dark: ['rgb(255,110,60)', 'rgb(255,180,40)', 'rgb(255,60,90)', 'rgb(255,210,80)', 'rgb(240,70,140)', 'rgb(255,140,50)', 'rgb(230,50,110)'],
  light: ['rgb(235,80,30)', 'rgb(230,150,10)', 'rgb(230,30,70)', 'rgb(225,175,30)', 'rgb(215,40,110)', 'rgb(235,110,20)', 'rgb(205,30,90)'],
};

/** Exact --gradient-brand-button-surface from Web/memento-web/src/index.css.
 * A background image only: the existing brand fill, shape and layout stay intact.
 */
export const BRAND_BUTTON_GRADIENT =
  'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0) 100%)';
