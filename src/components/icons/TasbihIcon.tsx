import { Circle, Ellipse, Path, Svg } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// 10 beads evenly spaced around an ellipse (cx=12, cy=9.5, rx=6, ry=5)
// Fewer than 12 to avoid crowding at small sizes
const BEAD_COUNT = 10;
const ELLIPSE_CX = 12;
const ELLIPSE_CY = 9.5;
const ELLIPSE_RX = 6;
const ELLIPSE_RY = 5;

const beads = Array.from({ length: BEAD_COUNT }, (_, i) => {
  const angle = (2 * Math.PI * i) / BEAD_COUNT - Math.PI / 2; // start at top
  return {
    cx: ELLIPSE_CX + ELLIPSE_RX * Math.cos(angle),
    cy: ELLIPSE_CY + ELLIPSE_RY * Math.sin(angle),
  };
});

export default function TasbihIcon({ size = 44, color = 'white' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bead loop strand */}
      <Ellipse
        cx={ELLIPSE_CX}
        cy={ELLIPSE_CY}
        rx={ELLIPSE_RX}
        ry={ELLIPSE_RY}
        stroke={color}
        strokeWidth={1}
        fill="none"
      />
      {/* 10 beads around the ellipse */}
      {beads.map((b, i) => (
        <Circle key={i} cx={b.cx} cy={b.cy} r={1.1} fill={color} />
      ))}
      {/* Connecting strand from bottom of loop to tassel */}
      <Path
        d={`M ${ELLIPSE_CX} ${ELLIPSE_CY + ELLIPSE_RY} L ${ELLIPSE_CX} 19`}
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      {/* Tassel — teardrop shape at the bottom */}
      <Ellipse cx={12} cy={21} rx={1.6} ry={2} fill={color} />
    </Svg>
  );
}
