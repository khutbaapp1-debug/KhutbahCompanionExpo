import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { ImageBackground, ImageSourcePropType, Pressable, Text, View } from 'react-native';

type Props = {
  href: string;
  imageSource: ImageSourcePropType;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
  textOverlay?: string;
  title: string;
  subtitle: string;
};

export default function GridTile({ href, imageSource, iconName, textOverlay, title, subtitle }: Props) {
  return (
    <View className="flex-1">
    <Link href={href as never} asChild>
      <Pressable
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
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
              <View className="absolute top-0 right-0 p-3">
                {iconName ? (
                  <Ionicons name={iconName} size={18} color="white" />
                ) : (
                  <Text className="font-sans-bold text-2xl text-white">{textOverlay}</Text>
                )}
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>
        <View className="mt-2 px-1">
          <Text className="font-sans-semibold text-sm text-gray-900" numberOfLines={1}>
            {title}
          </Text>
          <Text className="font-sans text-xs text-gray-500 mt-0.5" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
    </Link>
    </View>
  );
}
