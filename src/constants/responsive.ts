import {
  moderateScale,
  moderateVerticalScale,
  scale,
  verticalScale,
} from 'react-native-size-matters';

export const hs = (value: number) => Math.round(scale(value));
export const vs = (value: number) => Math.round(verticalScale(value));
export const ms = (value: number, factor = 0.3) => Math.round(moderateScale(value, factor));
export const mvs = (value: number, factor = 0.25) =>
  Math.round(moderateVerticalScale(value, factor));
export const iconSize = (value: number) => ms(value, 0.35);
export const radius = (value: number) => ms(value, 0.2);
export const responsiveSpace = (value: number) => ms(value, 0.35);
export const minTouchTarget = (value = 44) => Math.max(44, mvs(value, 0.2));
export const screenGutter = (width: number) =>
  Math.min(32, width <= 360 ? Math.max(16, hs(18)) : Math.max(20, hs(20)));
export const contentMaxWidth = (width: number) => Math.min(width, 720);
