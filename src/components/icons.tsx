// Single line-icon family: 2 px stroke, round caps (docs/00_sistema_de_diseno.md). Paths copied from
// design/pantallas_html. Icons are decorative; the control that holds them carries the label.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

const stroke = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function TodayIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 2 3 4" />
    </Svg>
  );
}

export function DecksIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Rect x="3" y="7" width="14" height="13" rx="3" />
      <Path d="M7 4h11a3 3 0 0 1 3 3v10" />
    </Svg>
  );
}

export function AssessIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Rect x="5" y="4" width="14" height="17" rx="3" />
      <Path d="M9 4V2h6v2M9 11h6M9 15h4" />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </Svg>
  );
}

export function CalendarIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Rect x="4" y="5" width="16" height="15" rx="2" />
      <Path d="M4 10h16M9 3v4M15 3v4" />
    </Svg>
  );
}

export function ChevronDownIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke} strokeWidth={2.2}>
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function ShieldCheckIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke} strokeWidth={2.2}>
      <Path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}
