import { G, Path, Rect, Svg } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

// Two open hands raised, palms facing the viewer, fingers pointing
// up-and-outward, a small gap in the middle and a slight outward tilt (V).
// Each hand: palm + 3 fingers + thumb + wrist cuff.
// viewBox 0 0 24 24, stroke-based.
//
// NOTE: simplified from 4 fingers to 3 per hand — at 44px, 1.5-unit strokes
// (~2.75px) are wider than the gaps between 4 fingers, so they merge into a
// blob. 3 fanned fingers keep a clear "open hand" read. Thumbs kept as short
// angled strokes (they read as thumbs, not spikes) to sell the hand silhouette.
export default function DuaIcon({ size = 44, color = 'white' }: Props) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.5,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* LEFT HAND — tilted slightly left for the V */}
      <G rotation={-7} originX={6.5} originY={13}>
        {/* Palm */}
        <Rect x={4} y={9} width={5} height={6} rx={1} {...stroke} />
        {/* 3 fingers fanning up-and-out */}
        <Path d="M 5 9 L 4.5 6" {...stroke} />
        <Path d="M 6.5 9 L 6.5 4.5" {...stroke} />
        <Path d="M 8 9 L 8.3 5.5" {...stroke} />
        {/* Thumb on the inner (right) side */}
        <Path d="M 9 11 Q 9.7 9.8 9.8 9" {...stroke} />
        {/* Wrist cuff */}
        <Rect x={4.5} y={15} width={4} height={2} rx={0.5} {...stroke} />
      </G>

      {/* RIGHT HAND — mirror, tilted slightly right */}
      <G rotation={7} originX={17.5} originY={13}>
        {/* Palm */}
        <Rect x={15} y={9} width={5} height={6} rx={1} {...stroke} />
        {/* 3 fingers fanning up-and-out */}
        <Path d="M 19 9 L 19.5 6" {...stroke} />
        <Path d="M 17.5 9 L 17.5 4.5" {...stroke} />
        <Path d="M 16 9 L 15.7 5.5" {...stroke} />
        {/* Thumb on the inner (left) side */}
        <Path d="M 15 11 Q 14.3 9.8 14.2 9" {...stroke} />
        {/* Wrist cuff */}
        <Rect x={15.5} y={15} width={4} height={2} rx={0.5} {...stroke} />
      </G>
    </Svg>
  );
}
