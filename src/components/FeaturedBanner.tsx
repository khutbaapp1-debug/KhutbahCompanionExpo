import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { ImageBackground, Pressable, Text, View } from 'react-native';

const IMG_TRANSLATION = require('../../assets/images/mosque_microphone_audio_setup.png');

export default function FeaturedBanner() {
  return (
    <Link href="/translation" asChild>
      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <View className="rounded-2xl overflow-hidden" style={{ aspectRatio: 3 }}>
          <ImageBackground
            source={IMG_TRANSLATION}
            resizeMode="cover"
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={[
                'rgba(15,118,110,0.2)',
                'rgba(15,118,110,0.4)',
                'rgba(15,118,110,0.6)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, padding: 20 }}
            >
              <View className="absolute top-3 right-3">
                <Ionicons name="mic-outline" size={28} color="white" />
              </View>
              <View className="flex-1 justify-end">
                <Text className="text-xl font-sans-bold text-white">
                  Live Translation
                </Text>
                <Text className="text-sm font-sans text-white mt-1" style={{ opacity: 0.9 }}>
                  Real-time translation of Friday sermons from Arabic to English
                </Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>
      </Pressable>
    </Link>
  );
}
