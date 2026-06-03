import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, ImageSourcePropType, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BannerAdPlaceholder from '../src/components/BannerAdPlaceholder';
import FeaturedBanner from '../src/components/FeaturedBanner';
import GridTile from '../src/components/GridTile';
import HomeHeader from '../src/components/HomeHeader';
import NextPrayerCard from '../src/components/NextPrayerCard';
import { useNextPrayer } from '../src/hooks/useNextPrayer';
import { usePremium } from '../src/hooks/usePremium';
import { getStoredLocation, requestAndCacheLocation } from '../src/lib/location';
import { PremiumPaywall } from '../src/components/PremiumPaywall';
import type { Coordinates } from '../src/lib/prayer-times';
import { useTheme } from '../src/lib/theme-context';
import type { ThemeMode } from '../src/lib/theme';

const IMG_PRAYER_TIMES = require('../assets/images/Mosque_at_dawn_prayer_time_1c06498c.png');
const IMG_QURAN = require('../assets/images/Open_Quran_with_calligraphy_c7ef6e94.png');
const IMG_DUAS = require('../assets/images/hands_in_dua_position.png');
const IMG_TASBIH = require('../assets/images/Prayer_beads_tasbih_closeup_5696650d.png');
const IMG_QIBLA = require('../assets/images/Kaaba_aerial_view_Makkah_b34ddcc4.png');
const IMG_NAMES = require('../assets/images/Islamic_geometric_pattern_teal_gold_8c3ad41f.png');
const IMG_MOSQUES = require('../assets/images/mosque_aerial_city_view.png');
const IMG_HADITH = require('../assets/images/hadith_books_row.png');

type TileData = {
  href: string;
  imageSource: ImageSourcePropType;
  iconName?: string;
  iconLibrary?:
    | 'mci'
    | 'ionicons'
    | 'custom-tasbih'
    | 'custom-prayer-times'
    | 'custom-dua'
    | 'custom-salah';
  textOverlay?: string;
  title: string;
};

const TILES: TileData[] = [
  {
    href: '/prayer-times',
    imageSource: IMG_PRAYER_TIMES,
    iconLibrary: 'custom-prayer-times',
    title: 'Prayer Times',
  },
  {
    href: '/quran',
    imageSource: IMG_QURAN,
    iconName: 'book-open-variant',
    title: 'Quran',
  },
  {
    href: '/duas',
    imageSource: IMG_DUAS,
    iconLibrary: 'custom-dua',
    title: 'Daily Duas',
  },
  {
    href: '/my-duas',
    imageSource: IMG_DUAS,
    iconLibrary: 'ionicons',
    iconName: 'heart-outline',
    title: 'My Duas',
  },
  {
    href: '/hadith',
    imageSource: IMG_HADITH,
    iconName: 'book-open-page-variant',
    title: 'Daily Hadith',
  },
  {
    href: '/zakat',
    imageSource: IMG_NAMES,
    iconLibrary: 'ionicons',
    iconName: 'calculator-outline',
    title: 'Zakat',
  },
  {
    href: '/tasbih',
    imageSource: IMG_TASBIH,
    iconLibrary: 'custom-tasbih',
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
    iconName: 'map-marker-radius',
    title: 'Mosque Finder',
  },
  {
    href: '/salah-guide',
    imageSource: IMG_PRAYER_TIMES,
    iconLibrary: 'custom-salah',
    title: 'Salah Guide',
  },
  {
    href: '/ramadan',
    imageSource: IMG_PRAYER_TIMES,
    iconLibrary: 'ionicons',
    iconName: 'moon-outline',
    title: 'Ramadan',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { mode, theme, setTheme } = useTheme();
  const { isPremium } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  // Location for the next-prayer card. null until we've checked the cache.
  // Once checked with nothing cached (and permission not granted), the card
  // shows an "Enable Location" prompt instead of empty "—:—" placeholders.
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getStoredLocation().then((cached) => {
      if (!isMounted) return;
      setCoords(cached);
      setLocationChecked(true);
      if (cached) {
        // Permission already granted — refresh silently without prompting.
        requestAndCacheLocation()
          .then((fresh) => {
            if (isMounted) setCoords(fresh);
          })
          .catch(() => {
            /* keep the cached coordinates on failure */
          });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Uses the same permission-request flow as LocationGate (the Prayer Times
  // screen). On success the card flips to live prayer times; on failure we stay
  // on the prompt so the user can retry.
  const handleEnableLocation = useCallback(async () => {
    setRequesting(true);
    try {
      const fresh = await requestAndCacheLocation();
      setCoords(fresh);
    } catch {
      /* stay on the prompt so the user can try again */
    } finally {
      setRequesting(false);
    }
  }, []);

  const { nextPrayerName, nextPrayerTime, countdown } = useNextPrayer(coords);
  const needsLocation = locationChecked && !coords;

  const cycleTheme = () => {
    const nextMode: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'high-contrast' : 'light';
    setTheme(nextMode);
  };
  const themeIcon =
    mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'contrast-outline';

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']}>
        <HomeHeader
          onSettingsPress={() => router.push('/settings')}
          onThemeTogglePress={cycleTheme}
          themeIcon={themeIcon}
          onNotificationsPress={() => router.push('/notifications')}
        />
      </SafeAreaView>
      {!isPremium && (
        <TouchableOpacity
          onPress={() => setShowPaywall(true)}
          activeOpacity={0.85}
          style={{
            backgroundColor: theme.primary,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Ionicons
            name="star"
            size={15}
            color="rgba(255,255,255,0.9)"
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 13,
              color: 'white',
              flex: 1,
            }}
          >
            Unlock Premium Features
          </Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      )}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <View className="mt-2 px-6">
          <NextPrayerCard
            prayerName={nextPrayerName ?? '—'}
            prayerTime={nextPrayerTime ?? '—:—'}
            countdown={countdown ?? '00:00:00'}
            needsLocation={needsLocation}
            requesting={requesting}
            onEnableLocation={handleEnableLocation}
          />
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
                iconLibrary={item.iconLibrary}
                textOverlay={item.textOverlay}
                title={item.title}
              />
            )}
          />
        </View>
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.surface }}>
        <BannerAdPlaceholder />
      </SafeAreaView>
      <PremiumPaywall visible={showPaywall} onDismiss={() => setShowPaywall(false)} />
    </View>
  );
}
