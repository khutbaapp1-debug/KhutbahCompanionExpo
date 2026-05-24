import { Circle, Path, Svg } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Two raised hands in dua, each drawn as a SINGLE FILLED silhouette (palm +
// 4 fingers traced as one outline, like a hand traced on paper). Filled
// silhouettes read as hands at 44px; the previous outlined-stroke version
// looked like parallel lines ("fries packets"). No wrist cuffs.
// viewBox 0 0 24 24.
//
// Approach: full 4-finger trace (not the simplified mitten) — the notches
// between fingers are deep (tips ~y4, valleys ~y9.5), so the fingers stay
// distinct even as a small filled shape.
export default function DuaIcon({ size = 44, color = 'white' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* LEFT HAND — single filled outline */}
      <Path
        d="M 2.5 16
           L 2.5 10
           L 2.7 5.8 Q 3.3 5.0 3.9 5.8
           L 4.1 9 Q 4.5 9.5 4.9 9
           L 5.0 4.8 Q 5.6 4.0 6.2 4.8
           L 6.4 9 Q 6.8 9.5 7.2 9
           L 7.3 4.3 Q 7.9 3.5 8.5 4.3
           L 8.7 9 Q 9.1 9.5 9.5 9
           L 9.6 5.3 Q 10.1 4.6 10.7 5.3
           L 10.5 9.5
           L 10 16 Z"
        fill={color}
      />

      {/* RIGHT HAND — mirror of left around x=12 */}
      <Path
        d="M 21.5 16
           L 21.5 10
           L 21.3 5.8 Q 20.7 5.0 20.1 5.8
           L 19.9 9 Q 19.5 9.5 19.1 9
           L 19.0 4.8 Q 18.4 4.0 17.8 4.8
           L 17.6 9 Q 17.2 9.5 16.8 9
           L 16.7 4.3 Q 16.1 3.5 15.5 4.3
           L 15.3 9 Q 14.9 9.5 14.5 9
           L 14.4 5.3 Q 13.9 4.6 13.3 5.3
           L 13.5 9.5
           L 14 16 Z"
        fill={color}
      />

      {/* Supplication dots rising above the hands */}
      <Circle cx={8} cy={2} r={0.55} fill={color} />
      <Circle cx={12} cy={1.5} r={0.55} fill={color} />
      <Circle cx={16} cy={2} r={0.55} fill={color} />
    </Svg>
  );
}
