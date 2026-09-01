/**
 * Design tokens extracted verbatim from the Void Terminal design pitch
 * (design-reference/Void Terminal.dc.html, renderVals() theme block).
 */

export type ThemeName = 'dark' | 'light';

export interface ThemeTokens {
  bg: string;
  fg: string;
  out: string;
  dim: string;
  dim2: string;
  faint: string;
  key: string;
  keyHover: string;
  bar: string;
  field: string;
  line: string;
  line2: string;
  scrim: string;
  hover: string;
  acc: string;
  acc2: string;
  accFg: string;
}

export const themes: Record<ThemeName, ThemeTokens> = {
  dark: {
    bg: '#232323',
    fg: '#FBF7F4',
    out: '#E5DED2',
    dim: '#A39382',
    dim2: '#A39382',
    faint: '#685D54',
    key: '#3b3835',
    keyHover: '#4c4842',
    bar: '#2b2a28',
    field: '#2b2a28',
    line: 'rgba(251,247,244,.16)',
    line2: 'rgba(251,247,244,.28)',
    scrim: 'rgba(35,35,35,.88)',
    hover: 'rgba(251,247,244,.05)',
    acc: '#A39382',
    acc2: '#8d7d6d',
    accFg: '#232323',
  },
  light: {
    bg: '#FBF7F4',
    fg: '#232323',
    out: '#685D54',
    dim: '#685D54',
    dim2: '#A39382',
    faint: '#A39382',
    key: '#E5DED2',
    keyHover: '#D8CFC0',
    bar: '#F1EBE3',
    field: '#ffffff',
    line: 'rgba(35,35,35,.16)',
    line2: 'rgba(35,35,35,.28)',
    scrim: 'rgba(251,247,244,.9)',
    hover: 'rgba(35,35,35,.05)',
    acc: '#685D54',
    acc2: '#4f463f',
    accFg: '#FBF7F4',
  },
};

export const fonts = {
  display: {
    regular: 'Archivo-Regular',
    medium: 'Archivo-Medium',
    semiBold: 'Archivo-SemiBold',
    extraBold: 'Archivo-ExtraBold',
  },
  mono: {
    regular: 'IBMPlexMono-Regular',
    medium: 'IBMPlexMono-Medium',
    semiBold: 'IBMPlexMono-SemiBold',
  },
} as const;

export const fontAssets = {
  'Archivo-Regular': require('../../../assets/fonts/Archivo-Regular.ttf'),
  'Archivo-Medium': require('../../../assets/fonts/Archivo-Medium.ttf'),
  'Archivo-SemiBold': require('../../../assets/fonts/Archivo-SemiBold.ttf'),
  'Archivo-ExtraBold': require('../../../assets/fonts/Archivo-ExtraBold.ttf'),
  'IBMPlexMono-Regular': require('../../../assets/fonts/IBMPlexMono-Regular.ttf'),
  'IBMPlexMono-Medium': require('../../../assets/fonts/IBMPlexMono-Medium.ttf'),
  'IBMPlexMono-SemiBold': require('../../../assets/fonts/IBMPlexMono-SemiBold.ttf'),
};
