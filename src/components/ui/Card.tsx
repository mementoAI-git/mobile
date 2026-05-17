import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'sm';
}

// Matches web card.tsx:
//   rounded-2xl (16px)
//   bg-card (#ffffff)
//   ring-1 ring-foreground/10 → approximated with border border-stroke-weaker + shadow-card
//   overflow-hidden (images clip to radius)
//   py-6 gap-6 / data-[size=sm]:py-[2px] gap-4
export function Card({ children, className, size = 'default', ...props }: CardProps) {
  return (
    <View
      className={cn(
        'bg-card rounded-2xl border border-stroke-weaker overflow-hidden px-4',
        size === 'default' ? 'py-4 gap-4' : 'py-3 gap-3',
        className,
      )}
      style={{
        // shadow-card approximates web ring-1 ring-foreground/10 + subtle depth
        shadowColor: COLORS.textDisabled,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 2,
        elevation: 1,
      }}
      {...props}
    >
      {children}
    </View>
  );
}
