import { ComponentType } from 'react';
import { SvgProps } from 'react-native-svg';
import { Sage, Blush, Paper, Bead, Dark, Modern } from '../components/capsule/letters';
import { COLORS } from './tokens';

export interface Theme {
  id: string;
  name: string;
  color: string;
  fonts: {
    header: string;
    body: string;
  };
  textColor: string;
  headerColor: string;
  patternOpacity: number;
  Background: ComponentType<SvgProps>;
}

export const CAPSULE_THEMES: Theme[] = [
  {
    id: 'sage',
    name: 'Sage',
    color: '#F0FCD4',
    fonts: { header: 'Patrick Hand SC', body: 'Handlee' },
    textColor: '#2C3E2F',
    headerColor: '#1A2419',
    patternOpacity: 0.15,
    Background: Sage,
  },
  {
    id: 'blush',
    name: 'Blush',
    color: '#FFE5D9',
    fonts: { header: 'Garamond', body: 'Garamond' },
    textColor: '#5C4742',
    headerColor: '#3D2E2A',
    patternOpacity: 0.1,
    Background: Blush,
  },
  {
    id: 'dusk',
    name: 'Paper',
    color: '#E6E6FA',
    fonts: { header: 'Portrait Script', body: 'Garamond' },
    textColor: '#4A4A6A',
    headerColor: '#2E2E4A',
    patternOpacity: 0.2,
    Background: Paper,
  },
  {
    id: 'mint',
    name: 'Mint',
    color: '#FFE3F7',
    fonts: { header: 'Sans', body: 'Sans' },
    textColor: '#5C2F4F',
    headerColor: '#3A1A30',
    patternOpacity: 0.1,
    Background: Bead,
  },
  {
    id: 'noir',
    name: 'Noir',
    color: '#252525',
    fonts: { header: 'Garamond', body: 'Cutive' },
    textColor: '#E5E5E5',
    headerColor: '#FFFFFF',
    patternOpacity: 0.05,
    Background: Dark,
  },
  {
    id: 'mono',
    name: 'Mono',
    color: '#D4F4FC',
    fonts: { header: 'Geist Mono', body: 'Geist Mono' },
    textColor: '#1E1E1EE5',
    headerColor: '#1E1E1EE5',
    patternOpacity: 0.1,
    Background: Modern,
  },
];

export const getThemeById = (id?: string) => {
  return CAPSULE_THEMES.find(t => t.id === id) || CAPSULE_THEMES[0]; // Default to Sage
};

export const getThemeByColor = (color?: string) => {
  if (!color) return CAPSULE_THEMES[0];
  return CAPSULE_THEMES.find(t => t.color.toUpperCase() === color.toUpperCase()) || CAPSULE_THEMES[0];
};
