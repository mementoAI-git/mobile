import React from 'react';
import { SvgXml } from 'react-native-svg';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { ONBOARDING_ICONS, type OnboardingIconName } from './onboarding-icons';

/** Renders an onboarding icon from the Figma designs at its design size. Mono icons use `color`. */
export const OnboardingIcon = React.memo(function OnboardingIcon({ name, size, color }: {
  name: OnboardingIconName;
  size?: number;
  color?: string;
}) {
  const colors = useThemeColors();
  const icon = ONBOARDING_ICONS[name];
  const px = size ?? icon.size;
  return (
    <SvgXml
      xml={icon.xml}
      width={px}
      height={px}
      color={color ?? colors.textStrong}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
});
