import { Circle, Path, Rect, Svg } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Mosque silhouette with a circular clock face in the body.
// viewBox 0 0 24 24, stroke-based outline.
export default function PrayerTimesIcon({ size = 44, color = 'white' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Rectangular base */}
      <Rect
        x={3}
        y={14}
        width={18}
        height={7}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Onion dome — bulges out then tapers to a point at the top */}
      <Path
        d="M 9 14 C 8 10 11 9 12 7.5 C 13 9 16 10 15 14"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Left minaret */}
      <Path d="M 4 14 L 4 6.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={4} cy={6} r={0.8} fill={color} />
      {/* Right minaret */}
      <Path d="M 20 14 L 20 6.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={20} cy={6} r={0.8} fill={color} />
      {/* Clock face */}
      <Circle cx={12} cy={15} r={2.5} stroke={color} strokeWidth={1} fill="none" />
      {/* Clock hands ~10:10 */}
      <Path d="M 12 15 L 13.5 14.1" stroke={color} strokeWidth={0.9} strokeLinecap="round" />
      <Path d="M 12 15 L 10.9 14.35" stroke={color} strokeWidth={0.9} strokeLinecap="round" />
      {/* Arched door at base */}
      <Path
        d="M 11 21 L 11 19 Q 11 18 12 18 Q 13 18 13 19 L 13 21 Z"
        fill={color}
      />
    </Svg>
  );
}
