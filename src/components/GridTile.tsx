import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { ImageBackground, ImageSourcePropType, Pressable, Text, View } from 'react-native';

import DuaIcon from './icons/DuaIcon';
import PrayerMatIcon from './icons/PrayerMatIcon';
import PrayerTimesIcon from './icons/PrayerTimesIcon';
import TasbihIcon from './icons/TasbihIcon';
import { useTheme } from '../lib/theme-context';

type Props = {
  href: string;
  imageSource: ImageSourcePropType;
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconLibrary?:
    | 'mci'
    | 'ionicons'
    | 'custom-tasbih'
    | 'custom-prayer-times'
    | 'custom-dua'
    | 'custom-salah';
  textOverlay?: string;
  gradientColors?: string[];
  title: string;
};

const ICON_SIZE = 44;

export default function GridTile({
  href,
  imageSource,
  iconName,
  iconLibrary = 'mci',
  textOverlay,
  gradientColors,
  title,
}: Props) {
  const { theme } = useTheme();

  function renderOverlay() {
    if (textOverlay) {
      return <Text className="font-sans-bold text-3xl text-white">{textOverlay}</Text>;
    }
    if (iconLibrary === 'custom-tasbih') {
      return <TasbihIcon size={ICON_SIZE} color="white" />;
    }
    if (iconLibrary === 'custom-prayer-times') {
      return <PrayerTimesIcon size={ICON_SIZE} color="white" />;
    }
    if (iconLibrary === 'custom-dua') {
      return <DuaIcon size={64} color="white" />;
    }
    if (iconLibrary === 'custom-salah') {
      return <PrayerMatIcon size={ICON_SIZE} color="white" />;
    }
    if (iconLibrary === 'ionicons' && iconName) {
      return (
        <Ionicons
          name={iconName as React.ComponentProps<typeof Ionicons>['name']}
          size={ICON_SIZE}
          color="white"
        />
      );
    }
    if (iconName) {
      return <MaterialCommunityIcons name={iconName} size={ICON_SIZE} color="white" />;
    }
    return null;
  }

  return (
    <View className="flex-1">
      <Link href={href as never} asChild>
        <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <View style={{ aspectRatio: 1 }} className="rounded-2xl overflow-hidden">
            {gradientColors ? (
              <LinearGradient
                colors={gradientColors as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                {renderOverlay()}
              </LinearGradient>
            ) : (
              <ImageBackground source={imageSource} resizeMode="cover" style={{ flex: 1 }}>
                <LinearGradient
                  colors={[
                    'rgba(15,118,110,0.2)',
                    'rgba(15,118,110,0.4)',
                    'rgba(15,118,110,0.6)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flex: 1 }}
                >
                  <View className="absolute inset-0 items-center justify-center">
                    {renderOverlay()}
                  </View>
                </LinearGradient>
              </ImageBackground>
            )}
          </View>
          <Text
            className="font-sans-semibold text-sm text-center mt-1.5"
            style={{ color: theme.text }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
