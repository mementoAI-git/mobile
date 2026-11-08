import { COLORS } from './tokens';

/** Semantic parity with Web/memento-web/src/index.css .dark.
 * Raised native surfaces use the web elevated surface; media/artwork stays fixed.
 */
export const DARK_COLORS: typeof COLORS = {
  ...COLORS,
  background: '#12131a',
  card: '#12131a',
  cardRaised: '#1d1e26',
  popover: '#1d1e26',
  // Deeper than the page, so photos stand out.
  mediaViewer: '#0b0c10',
  settingsCard: 'rgba(255,255,255,0.06)',
  // Web .dark --bg-sheet: sheets share the page canvas; the backdrop separates them.
  sheet: '#12131a',
  publishRayStart: '#24282A',
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
  // Cards, buttons and tags sit on the sky as a weak fill, not a deep grey slab.
  card: DARK_COLORS.fillWeak,
  cardRaised: DARK_COLORS.fillWeak,
  // Floating surfaces stay opaque so they read over content.
  popover: DEEP_SKY.surface,
  mediaViewer: DEEP_SKY.canvas,
  // Web .deep-sky --bg-sheet.
  sheet: DEEP_SKY.surface,
  cardOverlay: 'rgba(25,30,44,0.92)',
  glass: 'rgba(17,23,40,0.9)',
};
