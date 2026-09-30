import React from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { contentMaxWidth, screenGutter } from '@/constants/responsive';

export interface ResponsiveScreenProps {
  children?: React.ReactNode;
  fullBleed?: boolean;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  className?: string;
  contentClassName?: string;
}

export function ResponsiveScreen({
  children,
  fullBleed = false,
  maxWidth = 720,
  style,
  contentStyle,
  className,
  contentClassName,
}: ResponsiveScreenProps) {
  const { width } = useWindowDimensions();
  const gutter = fullBleed ? 0 : screenGutter(width);
  const maxW = contentMaxWidth(maxWidth);

  return (
    <View
      className={className}
      style={[
        {
          flex: 1,
          width: '100%',
          alignItems: 'center',
        },
        style,
      ]}
    >
      <View
        className={contentClassName}
        style={[
          {
            flex: 1,
            width: '100%',
            maxWidth: maxW,
            paddingHorizontal: gutter,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
