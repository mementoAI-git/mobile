/**
 * Central design tokens for the Memento Mobile app.
 * These should match the values in tailwind.config.ts where possible.
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
  textMuted: 'rgba(23,11,0,0.3)',
  textDisabled: 'rgba(23,11,0,0.1)',
  textInverse: '#FFFFFF',

  // Status
  success: '#067A57',
  error: '#4A3728', // Deep brown for danger/error (no red in style guide)
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

  // Onboarding (Groot Style)
  onboardingCream: '#FAF7F2',
  onboardingSand: '#F0E9DF',
  onboardingAmber: '#C8956C',
  onboardingBrown: '#4A3728',

  // Effects
  shadow: '#170B00',
  glass: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(23, 11, 0, 0.05)',
};

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
};
