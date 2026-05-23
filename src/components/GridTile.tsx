import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { ImageBackground, ImageSourcePropType, Pressable, Text, View } from 'react-native';

import TasbihIcon from './icons/TasbihIcon';

type Props = {
  href: string;
  imageSource: ImageSourcePropType;
  iconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconLibrary?: 'mci' | 'ionicons' | 'custom-tasbih';
  textOverlay?: string;
  title: string;
};

const ICON_SIZE = 44;

export default function GridTile({
  href,
  imageSource,
  iconName,
  iconLibrary = 'mci',
  textOverlay,
  title,
}: Props) {
  function renderOverlay() {
    if (textOverlay) {
      return <Text className="font-sans-bold text-3xl text-white">{textOverlay}</Text>;
    }
    if (iconLibrary === 'custom-tasbih') {
      return <TasbihIcon size={ICON_SIZE} color="white" />;
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
          </View>
          <Text
            className="font-sans-semibold text-sm text-gray-900 text-center mt-1.5"
            numberOfLines={1}
          >
            {title}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
