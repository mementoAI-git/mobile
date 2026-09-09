import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/lib/utils';
import { TYPE } from '@/constants/typography';

// Matches web badge.tsx variants (badge.tsx HEAD):
//   default     → bg-fill-brand-strong = orange #FF5E00 text-white
//   secondary   → bg-fill-weak text-text-base
//   outline     → border border-stroke-weak bg-fill-weaker text-text-base
//   success     → bg-success-weak text-success-strong
//   warning     → bg-warning-weak text-warning-strong
//   error       → bg-error-weak text-error-strong
//   info        → bg-info-weak text-info-strong
//
// Shape: rounded-full pill (web rounded-4xl)
// Size:  h-5 px-2 py-0.5 text-xs font-medium
type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  default:   { container: 'bg-brand',         text: 'text-white' },
  secondary: { container: 'bg-fill-weak',     text: 'text-text-base' },
  outline:   { container: 'border border-stroke-weak bg-fill-weaker', text: 'text-text-base' },
  success:   { container: 'bg-success-weak',  text: 'text-success-strong' },
  warning:   { container: 'bg-warning-weak',  text: 'text-warning-strong' },
  error:     { container: 'bg-error-weak',    text: 'text-error-strong' },
  info:      { container: 'bg-info-weak',     text: 'text-info-strong' },
};

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  const { container, text } = variantStyles[variant];

  return (
    <View
      className={cn(
        'self-start flex-row items-center justify-center rounded-full px-2 py-0.5',
        container,
        className,
      )}
    >
      <Text
        className={cn('text-xs font-medium', text)}
        style={TYPE.metadata}
      >
        {label}
      </Text>
    </View>
  );
}
