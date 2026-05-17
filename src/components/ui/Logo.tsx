import React from 'react';
import { Text } from 'react-native';
import { cn } from '@/lib/utils';
import { FONTS } from '@/constants/tokens';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

// Matches web <Logo> — EB Garamond wordmark, lowercase, tracking-tight
// Used on auth screens, onboarding, wherever web shows the wordmark
const sizeStyles = {
  sm: 'text-2xl',
  md: 'text-[28px]',
  lg: 'text-4xl',
};

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <Text
      className={cn(
        'text-text-strong capitalize tracking-tight leading-tight',
        sizeStyles[size],
        className,
      )}
      style={{ fontFamily: FONTS.serif }}
    >
      memento
    </Text>
  );
}
