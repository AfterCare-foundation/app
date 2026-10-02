// Line icons drawn with the same paths the website uses.

import Svg, { Circle, Line, Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function HeartIcon({ size = 22, color = "#fff", strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </Svg>
  );
}

export function HeartFilledIcon({ size = 22, color = "#fff" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </Svg>
  );
}

export function InfoIcon({ size = 22, color = "#fff", strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9.25} />
      <Line x1={12} y1={11} x2={12} y2={16.5} />
      <Circle cx={12} cy={7.75} r={0.6} fill={color} />
    </Svg>
  );
}

export function BookIcon({ size = 22, color = "#fff", strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2.5 5.5A2.5 2.5 0 0 1 5 3h5.5a2 2 0 0 1 1.5.7A2 2 0 0 1 13.5 3H19a2.5 2.5 0 0 1 2.5 2.5V19a1 1 0 0 1-1 1h-6.3a2 2 0 0 0-2.2 0H3.5a1 1 0 0 1-1-1Z" />
      <Path d="M12 3.7V20" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 14, color = "#fff", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12h15" />
      <Path d="m13 6 6 6-6 6" />
    </Svg>
  );
}

export function BellIcon({ size = 18, color = "#fff", strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

export function ScanIcon({ size = 20, color = "#fff", strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 8V5a2 2 0 0 1 2-2h3" />
      <Path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <Path d="M21 16v3a2 2 0 0 1-2 2h-3" />
      <Path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <Path d="M7 12h10" />
    </Svg>
  );
}

export function CheckIcon({ size = 14, color = "#fff", strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function BackIcon({ size = 20, color = "#fff", strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5" />
      <Path d="m11 18-6-6 6-6" />
    </Svg>
  );
}

export function ClockIcon({ size = 22, color = "#fff", strokeWidth = 1.75 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9.25} />
      <Path d="M12 7v5l3.25 2" />
    </Svg>
  );
}

/** Arrow coming in to the bottom left: something received. */
export function ArrowInIcon({ size = 16, color = "#fff", strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 7 7 17" />
      <Path d="M17 17H7V7" />
    </Svg>
  );
}

/** Arrow going out to the top right: something sent. */
export function ArrowOutIcon({ size = 16, color = "#fff", strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 17 17 7" />
      <Path d="M7 7h10v10" />
    </Svg>
  );
}
