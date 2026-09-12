import React from 'react';
import { Text } from 'react-native';
import { cn } from '@/lib/utils';
import { TYPE } from '@/constants/typography';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

// Matches web <Logo> — EB Garamond wordmark, lowercase, tracking-tight
// Used on auth screens, onboarding, wherever web shows the wordmark
export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <Text
      className={cn(
        'text-text-strong capitalize tracking-tight leading-tight',
        className,
      )}
      style={size === 'lg' ? TYPE.displayTitle : size === 'md' ? TYPE.screenTitle : TYPE.sectionTitle}
    >
      memento
    </Text>
  );
}
