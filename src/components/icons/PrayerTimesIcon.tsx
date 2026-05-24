import { Circle, Path, Rect, Svg } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Prayer Times = mosque (left half) + clock (right half), side by side.
// Two distinct elements read more clearly at 44px than a clock-in-mosque.
// viewBox 0 0 24 24, stroke-based.
export default function PrayerTimesIcon({ size = 44, color = 'white' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* LEFT HALF — mosque */}
      {/* Base */}
      <Rect x={1} y={14} width={10} height={8} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
      {/* Onion dome */}
      <Path
        d="M 4 14 C 3 11 5 10 6 8.5 C 7 10 9 11 8 14"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Left minaret */}
      <Path d="M 2 14 L 2 9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={2} cy={8.5} r={0.6} fill={color} />
      {/* Right minaret */}
      <Path d="M 10 14 L 10 9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={10} cy={8.5} r={0.6} fill={color} />
      {/* Door arch at center bottom */}
      <Path d="M 5 22 L 5 20 Q 5 19 6 19 Q 7 19 7 20 L 7 22 Z" fill={color} />

      {/* RIGHT HALF — clock */}
      <Circle cx={18} cy={12} r={5} stroke={color} strokeWidth={1.5} fill="none" />
      {/* Minute hand */}
      <Path d="M 18 12 L 20.5 10.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Hour hand */}
      <Path d="M 18 12 L 16.5 11" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      {/* Center dot */}
      <Circle cx={18} cy={12} r={0.7} fill={color} />
    </Svg>
  );
}
