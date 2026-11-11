import { COLORS } from './tokens';

/** Semantic parity with Web/memento-web/src/index.css .dark.
 * Raised native surfaces use the web elevated surface; media/artwork stays fixed.
 */
export const DARK_COLORS: typeof COLORS = {
  ...COLORS,
  background: '#12131a',
  canvas: '#12131a',
  card: '#12131a',
  cardRaised: '#1d1e26',
  popover: '#1d1e26',
  // Deeper than the page, so photos stand out.
  mediaViewer: '#0b0c10',
  settingsCard: 'rgba(255,255,255,0.06)',
  // Web .dark --bg-sheet: sheets share the page canvas; the backdrop separates them.
  sheet: '#12131a',
  publishRayStart: '#3a4252',
  cardOverlay: 'rgba(29,30,38,0.85)',
  activeFill: '#FFFFFF',
  activeText: 'rgba(23,11,0,0.9)',
  textStrong: '#FFFFFF',
  textBase: 'rgba(255,255,255,0.78)',
  textWeak: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.45)',
  textDisabled: 'rgba(255,255,255,0.12)',
  iconDisabled: 'rgba(255,255,255,0.06)',
  strokeStrong: 'rgba(255,255,255,0.6)',
  strokeWeak: 'rgba(255,255,255,0.12)',
  strokeWeaker: 'rgba(255,255,255,0.06)',
  fillWeak: 'rgba(255,255,255,0.06)',
  fillWeaker: 'rgba(255,255,255,0.03)',
  fillStrong: COLORS.fillStrong,
  previewText: 'rgba(255,255,255,0.78)',
  success: '#77c7af',
  error: '#ff9c9c',
  warning: '#e0be70',
  info: '#52a1dd',
  successFill: 'rgba(119,199,175,0.08)',
  successStroke: 'rgba(119,199,175,0.2)',
  errorFill: 'rgba(255,156,156,0.08)',
  warningFill: 'rgba(224,190,112,0.08)',
  infoFill: 'rgba(82,161,221,0.06)',
  summaryBlueBg: 'rgba(82,161,221,0.08)',
  summaryBlueBorder: 'rgba(82,161,221,0.2)',
  summaryBlueText: '#52a1dd',
  summaryPurpleBg: 'rgba(172,140,235,0.08)',
  summaryPurpleBorder: 'rgba(172,140,235,0.2)',
  summaryPurpleText: '#AC8CEB',
  summaryPeachBg: 'rgba(233,130,70,0.08)',
  summaryPeachBorder: 'rgba(233,130,70,0.2)',
  chatSettingsWash: 'rgba(233,130,70,0.12)',
  chatSettingsWashEnd: 'rgba(233,130,70,0.03)',
  glass: 'rgba(29,30,38,0.85)',
};

export const APPEARANCE_VARIABLES = {
  '--surface-background': 'background',
  '--surface-card': 'card',
  '--surface-raised': 'cardRaised',
  '--surface-popover': 'popover',
  '--surface-overlay': 'cardOverlay',
  '--surface-settings-card': 'settingsCard',
  '--active-fill': 'activeFill',
  '--active-text': 'activeText',
  '--semantic-success': 'success',
  '--semantic-error': 'error',
  '--semantic-warning': 'warning',
  '--semantic-info': 'info',
  '--semantic-success-fill': 'successFill',
  '--semantic-error-fill': 'errorFill',
  '--semantic-warning-fill': 'warningFill',
  '--semantic-info-fill': 'infoFill',
  '--theme-text-strong': 'textStrong',
  '--ink-body': 'textBase',
  '--theme-text-weak': 'textWeak',
  '--theme-text-muted': 'textMuted',
  '--theme-text-disabled': 'textDisabled',
  '--stroke-strong': 'strokeStrong',
  '--stroke-weak': 'strokeWeak',
  '--stroke-weaker': 'strokeWeaker',
  '--fill-strong': 'fillStrong',
  '--fill-weak': 'fillWeak',
  '--fill-weaker': 'fillWeaker',
} as const;

/** Stable seeded story tints with the same neutral/brand/warning/info/success order. */
export const DARK_CARD_SURFACES = [
  { bg: '#1d1e26', border: 'rgba(255,255,255,0.12)' },
  { bg: '#2A211F', border: 'rgba(233,130,70,0.2)' },
  { bg: '#28251F', border: 'rgba(224,190,112,0.2)' },
  { bg: '#1B2632', border: 'rgba(82,161,221,0.2)' },
  { bg: '#1C2A2A', border: 'rgba(119,199,175,0.2)' },
] as const;

/** Web Deep Sky foundation; transparent screens reveal the shared sky backdrop. */
export const DEEP_SKY = {
  canvas: '#0d1226', midpoint: '#191d31', horizon: '#2c2d3c', surface: '#191e2c',
} as const;
export const DEEP_SKY_COLORS: typeof COLORS = {
  ...DARK_COLORS,
  background: 'transparent',
  canvas: DEEP_SKY.canvas,
  // Cards, buttons and tags sit on the sky as a weak fill, not a deep grey slab.
  card: DARK_COLORS.fillWeak,
  cardRaised: DARK_COLORS.fillWeak,
  // Floating surfaces stay opaque so they read over content.
  popover: DEEP_SKY.surface,
  mediaViewer: DEEP_SKY.canvas,
  // Bottom sheets use the same fill as Dark mode sheets.
  sheet: DARK_COLORS.sheet,
  cardOverlay: 'rgba(25,30,44,0.92)',
  glass: 'rgba(17,23,40,0.9)',
};

/** Web Light Sky foundation: a pale, warm-horizon sky under translucent white surfaces. */
export const LIGHT_SKY = {
  canvas: '#b3c4dc', midpoint: '#94b2d6', horizon: '#d9d6d1', surface: 'rgba(255,255,255,0.68)',
} as const;
/** Ink for Light Sky: web .light-sky --text-neutral-strong (#1b1d23) at each emphasis. */
const LIGHT_SKY_INK = (alpha: number) => `rgba(27,29,35,${alpha})`;
export const LIGHT_SKY_COLORS: typeof COLORS = {
  ...COLORS,
  background: 'transparent',
  canvas: LIGHT_SKY.canvas,
  card: LIGHT_SKY.surface,
  cardRaised: LIGHT_SKY.surface,
  settingsCard: LIGHT_SKY.surface,
  // Web .light-sky keeps --popover and --bg-sheet on the opaque white --bg-raised.
  popover: '#ffffff',
  sheet: '#ffffff',
  mediaViewer: LIGHT_SKY.canvas,
  cardOverlay: 'rgba(255,255,255,0.8)',
  glass: LIGHT_SKY.surface,
  activeFill: '#1b1d23',
  activeText: '#FFFFFF',
  textStrong: '#1b1d23',
  // Web uses 0.72; 0.76 keeps body copy at 4.5:1 on the sky's midpoint blue.
  textBase: LIGHT_SKY_INK(0.76),
  textWeak: LIGHT_SKY_INK(0.6),
  textMuted: LIGHT_SKY_INK(0.45),
  textDisabled: LIGHT_SKY_INK(0.12),
  iconDisabled: LIGHT_SKY_INK(0.06),
  strokeStrong: LIGHT_SKY_INK(0.45),
  strokeWeak: LIGHT_SKY_INK(0.12),
  strokeWeaker: LIGHT_SKY_INK(0.06),
  fillStrong: '#1b1d23',
  fillWeak: 'rgba(255,255,255,0.55)',
  fillWeaker: 'rgba(255,255,255,0.32)',
  fillChatUser: 'rgba(255,255,255,0.42)',
};

/** Sky backdrop artwork per theme. Light Sky draws the clouds white and drifts faster, like web. */
export const SKY_BACKDROPS = {
  'deep-sky': {
    gradient: [DEEP_SKY.canvas, DEEP_SKY.midpoint, DEEP_SKY.horizon],
    cloudTint: undefined, cloudOpacity: [0.45, 0.2], driftMs: 46667,
  },
  'light-sky': {
    gradient: [LIGHT_SKY.canvas, LIGHT_SKY.midpoint, LIGHT_SKY.horizon],
    cloudTint: '#FFFFFF', cloudOpacity: [0.85, 0.38], driftMs: 35000,
  },
} as const;
