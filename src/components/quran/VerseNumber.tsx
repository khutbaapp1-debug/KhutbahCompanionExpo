import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';

type Props = {
  number: number;
  onPress: () => void;
  onLongPress: () => void;
  isBookmarked: boolean;
  isPlaying: boolean;
};

export default function VerseNumber({ number, onPress, onLongPress, isBookmarked, isPlaying }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.18, duration: 650, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.92, duration: 650, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    return undefined;
  }, [isPlaying, scale]);

  const filled = isBookmarked || isPlaying;

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} hitSlop={6}>
      <Animated.View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: filled ? '#0F766E' : 'transparent',
          borderWidth: 1.5,
          borderColor: '#0F766E',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontFamily: 'Inter_700Bold',
            color: filled ? 'white' : '#0F766E',
            lineHeight: 13,
          }}
        >
          {number}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
