import { Image } from 'react-native';

type Props = {
  size?: number;
  color?: string;
};

// User-designed PNG icon. tintColor paints it (white by default) so the icon
// matches the grid tile overlay regardless of the PNG's own colors.
export default function DuaIcon({ size = 44, color = 'white' }: Props) {
  return (
    <Image
      source={require('../../../assets/images/icons/dua.png')}
      style={{ width: size, height: size, tintColor: color }}
      resizeMode="contain"
    />
  );
}
