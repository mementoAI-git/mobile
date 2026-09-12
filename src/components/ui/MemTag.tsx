import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '@/lib/utils';
import { TYPE } from '@/constants/typography';

interface MemTagProps {
  label: string;
  className?: string;
}

// Matches web .mem-tags utility class:
//   rounded-full border bg-sand-1 border-sand-5
//   px-2 py-0.5 text-xs font-medium capitalize
export function MemTag({ label, className }: MemTagProps) {
  return (
    <View
      className={cn(
        'rounded-full border border-sand-5 bg-sand-1 px-2 py-0.5 self-start',
        className,
      )}
    >
      <Text
        className="text-text-base capitalize"
        style={TYPE.metadata}
      >
        {label}
      </Text>
    </View>
  );
}
