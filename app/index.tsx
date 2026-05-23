import { Stack, useRouter } from 'expo-router';
import { FlatList, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BannerAdPlaceholder from '../src/components/BannerAdPlaceholder';
import FeatureCard from '../src/components/FeatureCard';
import HomeHeader from '../src/components/HomeHeader';
import NextPrayerCard from '../src/components/NextPrayerCard';

const TILES = [
  {
    href: '/translation',
    title: 'Live Translation',
    subtitle: 'Real-time Arabic to English',
    iconName: 'mic-outline' as const,
  },
  {
    href: '/prayer-times',
    title: 'Prayer Times',
    subtitle: 'Daily salah schedule',
    iconName: 'time-outline' as const,
  },
  {
    href: '/quran',
    title: 'Quran',
    subtitle: 'Read with translation',
    iconName: 'book-outline' as const,
  },
  {
    href: '/duas',
    title: 'Daily Duas',
    subtitle: 'Supplications & remembrance',
    iconName: 'heart-outline' as const,
  },
  {
    href: '/hadith',
    title: 'Daily Hadith',
    subtitle: 'Prophetic traditions',
    iconName: 'star-outline' as const,
  },
  {
    href: '/tasbih',
    title: 'Tasbih Counter',
    subtitle: 'Digital dhikr counter',
    iconName: 'apps-outline' as const,
  },
  {
    href: '/qibla',
    title: 'Qibla Compass',
    subtitle: 'Find the direction of prayer',
    iconName: 'compass-outline' as const,
  },
  {
    href: '/names',
    title: '99 Names',
    subtitle: 'Asma ul-Husna with meanings',
    iconName: 'sparkles-outline' as const,
  },
  {
    href: '/mosques',
    title: 'Mosque Finder',
    subtitle: 'Nearby masaajid',
    iconName: 'location-outline' as const,
  },
  {
    href: '/salah-guide',
    title: 'Salah & Wudu',
    subtitle: 'Step-by-step prayer guide',
    iconName: 'body-outline' as const,
  },
  {
    href: '/settings',
    title: 'Settings',
    subtitle: 'Preferences & notifications',
    iconName: 'settings-outline' as const,
  },
] as const;

type Tile = (typeof TILES)[number] | null;

// Pad to even count so the 2-column grid has no orphaned column
const GRID_DATA: Tile[] = TILES.length % 2 === 0 ? [...TILES] : [...TILES, null];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <HomeHeader
        onSettingsPress={() => router.push('/settings')}
        onThemeTogglePress={() => {}}
        onNotificationsPress={() => {}}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <NextPrayerCard />
        <FlatList
          data={GRID_DATA}
          keyExtractor={(item, index) => (item ? item.href : `spacer-${index}`)}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={{ padding: 12 }}
          columnWrapperStyle={{ gap: 8 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => {
            if (!item) return <View className="flex-1 p-1" />;
            return (
              <View className="flex-1 p-1">
                <FeatureCard
                  href={item.href}
                  title={item.title}
                  subtitle={item.subtitle}
                  iconName={item.iconName}
                />
              </View>
            );
          }}
        />
      </ScrollView>
      <BannerAdPlaceholder />
    </SafeAreaView>
  );
}
