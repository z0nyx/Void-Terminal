import React from 'react';
import Svg, { Path, Rect, Line, Circle, Ellipse, Polyline } from 'react-native-svg';

/**
 * Every icon here is a 1:1 transcription of the inline SVGs in
 * design-reference/Void Terminal.dc.html — same viewBox, same path data,
 * same stroke rules — so the real app matches the pitch pixel-for-pixel.
 */

export interface IconProps {
  size?: number;
  color: string;
  strokeWidth?: number;
}

const square = { strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const };
const round = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function base(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const };
}

export function IconHosts({ size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={2} y={3} width={20} height={8} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Rect x={2} y={13} width={20} height={8} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Line x1={6} y1={7} x2={6.01} y2={7} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Line x1={6} y1={17} x2={6.01} y2={17} stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconSession({ size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="4 17 10 11 4 5" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Line x1={12} y1={19} x2={20} y2={19} stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconSettings({ size = 20, color, strokeWidth = 2 }: IconProps) {
  const p = { stroke: color, strokeWidth, ...square };
  return (
    <Svg {...base(size)}>
      <Line x1={21} y1={4} x2={14} y2={4} {...p} />
      <Line x1={10} y1={4} x2={3} y2={4} {...p} />
      <Line x1={21} y1={12} x2={12} y2={12} {...p} />
      <Line x1={8} y1={12} x2={3} y2={12} {...p} />
      <Line x1={21} y1={20} x2={16} y2={20} {...p} />
      <Line x1={12} y1={20} x2={3} y2={20} {...p} />
      <Line x1={14} y1={2} x2={14} y2={6} {...p} />
      <Line x1={8} y1={10} x2={8} y2={14} {...p} />
      <Line x1={16} y1={18} x2={16} y2={22} {...p} />
    </Svg>
  );
}

export function IconArrowRight({ size = 18, color, strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M5 12h14" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="m12 5 7 7-7 7" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconPlus({ size = 13, color, strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M5 12h14" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M12 5v14" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconCloud({ size = 15, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.6A3.7 3.7 0 0 0 6.5 19Z" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconCi({ size = 15, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 7h6l3 5-3 5H3" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Circle cx={18} cy={7} r={3} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Circle cx={18} cy={17} r={3} stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconCpu({ size = 15, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={6} y={6} width={12} height={12} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Rect x={10} y={10} width={4} height={4} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconDb({ size = 15, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Ellipse cx={12} cy={5} rx={8} ry={3} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

/** Default host icon — same rack glyph as the Hosts tab. */
export const IconServer = IconHosts;

export function IconEdit({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 20h9" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconBack({ size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M19 12H5" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="m12 19-7-7 7-7" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconBolt({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M4 14h7l-2 8 11-12h-7l2-8z" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconSplit({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={3} width={18} height={18} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M3 12h18" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function IconSwitcher({ size = 13, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="m12 2 9 5-9 5-9-5 9-5z" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="m3 12 9 5 9-5" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="m3 17 9 5 9-5" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconSnippets({ size = 15, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconThemeHalf({ size = 14, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M12 3a9 9 0 0 0 0 18z" fill={color} stroke="none" />
    </Svg>
  );
}

export function IconReplay({ size = 18, color, strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 12a9 9 0 1 0 3-6.7" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Polyline points="3 4 3 10 9 10" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconTypeSize({ size = 14, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Polyline points="4 7 4 4 20 4 20 7" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Line x1={9} y1={20} x2={15} y2={20} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Line x1={12} y1={4} x2={12} y2={20} stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconKeyBar({ size = 14, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={2} y={4} width={20} height={16} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconKey({ size = 14, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Circle cx={7.5} cy={15.5} r={4.5} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="m10.7 12.3 8.3-8.3" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="m16 6 3 3" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconStorageSection({ size = 14, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={2} y={4} width={20} height={16} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M6 9h12M6 13h8" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconPhone({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={6} y={2} width={12} height={20} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Line x1={10} y1={19} x2={14} y2={19} stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconSupport({ size = 14, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M12 3a9 9 0 1 0 9 9v-1" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Circle cx={12} cy={12} r={3.5} stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconExternal({ size = 15, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M7 17 17 7" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Polyline points="8 7 17 7 17 16" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconMail({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={2} y={4} width={20} height={16} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Polyline points="2 6 12 13 22 6" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconGithub({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path
        d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
        stroke={color}
        strokeWidth={strokeWidth}
        {...round}
      />
      <Path d="M9 18c-4.51 2-5-2-7-2" stroke={color} strokeWidth={strokeWidth} {...round} />
    </Svg>
  );
}

export function IconTelegram({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M21.5 3.5 2.8 10.9l5.4 1.8 1.6 5.9 3-3.4 4.4 3.3Z" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="m8.2 12.7 9.3-6.6-5 8.1" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconInstagram({ size = 18, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Rect x={2.5} y={2.5} width={19} height={19} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Circle cx={12} cy={12} r={4.2} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Line x1={17.5} y1={6.5} x2={17.51} y2={6.5} stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconTrash({ size = 15, color, strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)}>
      <Path d="M3 6h18" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M8 6V4h8v2" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M6 6v14h12V6" stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M10 11v5M14 11v5" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconLock({ size = 15, color = '#A39382', strokeWidth = 2 }: Partial<IconProps>) {
  return (
    <Svg {...base(size)}>
      <Rect x={3} y={11} width={18} height={10} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}

export function IconSearch({ size = 15, color = '#A39382', strokeWidth = 2 }: Partial<IconProps>) {
  return (
    <Svg {...base(size)}>
      <Circle cx={11} cy={11} r={8} stroke={color} strokeWidth={strokeWidth} {...square} />
      <Path d="m21 21-4.3-4.3" stroke={color} strokeWidth={strokeWidth} {...square} />
    </Svg>
  );
}
