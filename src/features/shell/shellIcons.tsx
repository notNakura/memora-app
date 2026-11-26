// Tab icons of the teacher and administrator shells, same family as src/components/icons.tsx (2 px stroke,
// round caps). Resumen is copied from design/pantallas_html/24; the administrator mockups have no tab bar, so
// the other four are drawn in the same style. Decorative: the tab carries the label.
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

const stroke = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function SummaryIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Path d="M6 20V11M12 20V5M18 20v-6" />
    </Svg>
  );
}

export function AreasIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Rect x="3" y="3" width="7" height="7" rx="2" />
      <Rect x="14" y="3" width="7" height="7" rx="2" />
      <Rect x="3" y="14" width="7" height="7" rx="2" />
      <Rect x="14" y="14" width="7" height="7" rx="2" />
    </Svg>
  );
}

export function ManagementIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Path d="M3 9l9-5 9 5-9 5z" />
      <Path d="M7 11v5c0 1.5 2.5 3 5 3s5-1.5 5-3v-5" />
    </Svg>
  );
}

export function UsersIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20c.8-3.4 3.3-5 6.5-5s5.7 1.6 6.5 5" />
      <Path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.3 3.5 5" />
    </Svg>
  );
}

export function ModerationIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} {...stroke}>
      <Path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </Svg>
  );
}
