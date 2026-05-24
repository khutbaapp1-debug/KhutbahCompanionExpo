import { Circle, Path, Svg } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Two cupped hands, palms facing up (dua position), forming a bowl that
// opens toward the sky. viewBox 0 0 24 24, stroke-based.
export default function DuaIcon({ size = 44, color = 'white' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Left cupped hand: outer fingertip -> bottom of palm -> inner edge */}
      <Path
        d="M 3 8 Q 3.5 13 6 15 Q 9.5 14.5 11 10"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right cupped hand: mirror of left */}
      <Path
        d="M 21 8 Q 20.5 13 18 15 Q 14.5 14.5 13 10"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Where the two palms meet — small valley opening upward (V / heart) */}
      <Path
        d="M 11 10 Q 12 12 13 10"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left thumb */}
      <Path
        d="M 3 7.8 Q 4 5.8 5.6 6.9"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Right thumb */}
      <Path
        d="M 21 7.8 Q 20 5.8 18.4 6.9"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Three subtle dots above, in an upward arc */}
      <Circle cx={9} cy={4.6} r={0.55} fill={color} />
      <Circle cx={12} cy={3.8} r={0.55} fill={color} />
      <Circle cx={15} cy={4.6} r={0.55} fill={color} />
    </Svg>
  );
}
