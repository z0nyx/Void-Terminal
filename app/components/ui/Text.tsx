import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';
import { fonts } from '../../lib/theme/tokens';

type Weight = 'regular' | 'medium' | 'semiBold' | 'extraBold';

interface Props extends TextProps {
  weight?: Weight;
  mono?: boolean;
  color?: string;
  size?: number;
  letterSpacing?: number;
}

/** Display (Archivo) or mono (IBM Plex Mono) text using the bundled static weights. */
export function AppText({ weight = 'regular', mono = false, color, size, letterSpacing, style, ...rest }: Props) {
  const family = mono ? fonts.mono[weight === 'extraBold' ? 'semiBold' : weight] : fonts.display[weight];
  return (
    <RNText
      {...rest}
      style={[{ fontFamily: family, color, fontSize: size, letterSpacing }, style]}
    />
  );
}
