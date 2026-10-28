import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'sm';
}

// Mobile card default:
//   rounded-[10px] (10px)
//   bg-card (#ffffff)
//   ring-1 ring-foreground/10 → approximated with border border-stroke-weaker + shadow-card
//   overflow-hidden (images clip to radius)
//   py-6 gap-6 / data-[size=sm]:py-[2px] gap-4
export function Card({ children, className, size = 'default', ...props }: CardProps) {
  return (
    <View
      className={cn(
        'bg-card rounded-[10px] border border-stroke-weaker overflow-hidden px-4',
        size === 'default' ? 'py-4 gap-4' : 'py-3 gap-3',
        className,
      )}
      // Web uses ring-1 ring-foreground/10 (no box-shadow) — flat surface, border only
      {...props}
    >
      {children}
    </View>
  );
}
