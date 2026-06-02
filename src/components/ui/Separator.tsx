import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface SeparatorProps extends ViewProps {
  /** 'horizontal' (default) renders a full-width 1px line. 'vertical' renders a 1px tall divider. */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Separator — mirrors web's shadcn `<Separator />`.
 * Uses `stroke-weak` (rgba(23,11,0,0.1)) — the same border color used throughout the app.
 */
export function Separator({ orientation = 'horizontal', className, style, ...props }: SeparatorProps) {
  return (
    <View
      {...props}
      style={style}
      className={cn(
        'bg-stroke-weak shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
    />
  );
}
