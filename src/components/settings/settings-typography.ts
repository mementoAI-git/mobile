import { StyleSheet } from 'react-native';
import { COLORS, FONTS } from '@/constants/tokens';

export const SETTINGS_TYPE = StyleSheet.create({
  screenTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serif,
    fontSize: 28,
    lineHeight: 34,
  },
  sectionTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serif,
    fontSize: 22,
    lineHeight: 28,
  },
  cardTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serifMedium,
    fontSize: 20,
    lineHeight: 26,
  },
  identityTitle: {
    color: COLORS.textStrong,
    fontFamily: FONTS.serifMedium,
    fontSize: 21,
    lineHeight: 27,
  },
  rowLabel: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  fieldLabel: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansMedium,
    fontSize: 15,
    lineHeight: 21,
  },
  body: {
    color: COLORS.textBase,
    fontFamily: FONTS.sans,
    fontSize: 15,
    lineHeight: 23,
  },
  supporting: {
    color: COLORS.textWeak,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 19,
  },
  buttonLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 16,
    lineHeight: 22,
  },
  utilityLabel: {
    color: COLORS.textWeak,
    fontFamily: FONTS.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
  },
  stat: {
    color: COLORS.textStrong,
    fontFamily: FONTS.sansSemi,
    fontSize: 28,
    lineHeight: 34,
  },
});
