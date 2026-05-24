import { Path, Rect, Svg } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Prayer mat (musalla) standing vertically with a mihrab arch at the top.
// viewBox 0 0 24 24, stroke-based.
export default function PrayerMatIcon({ size = 44, color = 'white' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Mat outline */}
      <Rect
        x={4}
        y={4}
        width={16}
        height={18}
        rx={1}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Mihrab arch inside the top — pointed niche peaking at (12, 6) */}
      <Path
        d="M 8 11 L 8 8 Q 12 4 16 8 L 16 11"
        stroke={color}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom fringe line */}
      <Path d="M 6 19.5 L 18 19.5" stroke={color} strokeWidth={1} strokeLinecap="round" />
    </Svg>
  );
}
