import { Stack, useRouter } from 'expo-router';
import { FlatList, ImageSourcePropType, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BannerAdPlaceholder from '../src/components/BannerAdPlaceholder';
import FeaturedBanner from '../src/components/FeaturedBanner';
import GridTile from '../src/components/GridTile';
import HomeHeader from '../src/components/HomeHeader';
import NextPrayerCard from '../src/components/NextPrayerCard';

const IMG_PRAYER_TIMES = require('../assets/images/Mosque_at_dawn_prayer_time_1c06498c.png');
const IMG_QURAN = require('../assets/images/Open_Quran_with_calligraphy_c7ef6e94.png');
const IMG_DUAS = require('../assets/images/hands_in_dua_position.png');
const IMG_TASBIH = require('../assets/images/Prayer_beads_tasbih_closeup_5696650d.png');
const IMG_QIBLA = require('../assets/images/Kaaba_aerial_view_Makkah_b34ddcc4.png');
const IMG_NAMES = require('../assets/images/Islamic_geometric_pattern_teal_gold_8c3ad41f.png');
const IMG_MOSQUES = require('../assets/images/mosque_aerial_city_view.png');

type TileData = {
  href: string;
  imageSource: ImageSourcePropType;
  iconName?: string;
  textOverlay?: string;
  title: string;
};

const TILES: TileData[] = [
  {
    href: '/prayer-times',
    imageSource: IMG_PRAYER_TIMES,
    iconName: 'time-outline',
    title: 'Prayer Times',
  },
  {
    href: '/quran',
    imageSource: IMG_QURAN,
    iconName: 'book-outline',
    title: 'Quran',
  },
  {
    href: '/duas',
    imageSource: IMG_DUAS,
    iconName: 'heart-outline',
    title: 'Daily Duas',
  },
  {
    href: '/hadith',
    imageSource: IMG_QURAN,
    iconName: 'star-outline',
    title: 'Daily Hadith',
  },
  {
    href: '/tasbih',
    imageSource: IMG_TASBIH,
    iconName: 'apps-outline',
    title: 'Tasbih',
  },
  {
    href: '/qibla',
    imageSource: IMG_QIBLA,
    iconName: 'compass-outline',
    title: 'Qibla Compass',
  },
  {
    href: '/names',
    imageSource: IMG_NAMES,
    textOverlay: '99',
    title: '99 Names',
  },
  {
    href: '/mosques',
    imageSource: IMG_MOSQUES,
    iconName: 'location-outline',
    title: 'Mosque Finder',
  },
  {
    href: '/salah-guide',
    imageSource: IMG_PRAYER_TIMES,
    iconName: 'body-outline',
    title: 'Salah Guide',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']}>
        <HomeHeader
          onSettingsPress={() => router.push('/settings')}
          onThemeTogglePress={() => {}}
          onNotificationsPress={() => {}}
        />
      </SafeAreaView>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <View className="mt-3">
          <NextPrayerCard />
        </View>
        <View className="mt-3 px-6">
          <FeaturedBanner />
        </View>
        <View className="mt-3 px-6">
          <FlatList
            data={TILES}
            keyExtractor={(item) => item.href}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: 12 }}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <GridTile
                href={item.href}
                imageSource={item.imageSource}
                iconName={item.iconName as React.ComponentProps<typeof GridTile>['iconName']}
                textOverlay={item.textOverlay}
                title={item.title}
              />
            )}
          />
        </View>
      </ScrollView>
      <SafeAreaView edges={['bottom']} className="bg-surface-light">
        <BannerAdPlaceholder />
      </SafeAreaView>
    </View>
  );
}
