import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Link, router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import LocationGate from '../src/components/LocationGate';
import PrayerListRow from '../src/components/PrayerListRow';
import {
  ARABIC_NAMES,
  PRAYER_DESCRIPTIONS,
  RAKAT_DATA,
  type RakatBreakdown,
} from '../src/data/rakat';
import { useNextPrayer } from '../src/hooks/useNextPrayer';
import {
  DEFAULT_PRAYER_SETTINGS,
  getPrayerSettings,
  type MadhabKey,
} from '../src/lib/prayer-settings';
import { formatTime12Hour } from '../src/lib/prayer-times';
import type { Coordinates } from '../src/lib/prayer-times';

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

// Display order + English labels for the rakat breakdown cards.
const PRAYER_ORDER: { key: PrayerKey; english: string }[] = [
  { key: 'fajr', english: 'Fajr' },
  { key: 'dhuhr', english: 'Dhuhr' },
  { key: 'asr', english: 'Asr' },
  { key: 'maghrib', english: 'Maghrib' },
  { key: 'isha', english: 'Isha' },
];

type Pill = { key: string; label: string; isFard: boolean };

// Pills in canonical order, skipping any segment that is undefined or 0.
function buildPills(breakdown: RakatBreakdown): Pill[] {
  const pills: Pill[] = [];
  if (breakdown.sunnahBefore) {
    pills.push({
      key: 'sunnahBefore',
      label: `${breakdown.sunnahBefore} Sunnah before`,
      isFard: false,
    });
  }
  if (breakdown.fard) {
    pills.push({ key: 'fard', label: `${breakdown.fard} Fard`, isFard: true });
  }
  if (breakdown.sunnahAfter) {
    pills.push({
      key: 'sunnahAfter',
      label: `${breakdown.sunnahAfter} Sunnah after`,
      isFard: false,
    });
  }
  if (breakdown.witr) {
    pills.push({ key: 'witr', label: `${breakdown.witr} Witr`, isFard: false });
  }
  return pills;
}

function RakatPill({ label, isFard }: { label: string; isFard: boolean }) {
  return (
    <View className={`px-2.5 py-1 rounded-full ${isFard ? 'bg-primary' : 'bg-gray-200'}`}>
      <Text
        className={`text-xs font-sans-medium ${isFard ? 'text-white' : 'text-gray-700'}`}
      >
        {label}
      </Text>
    </View>
  );
}

function RakatCard({
  prayerKey,
  english,
  breakdown,
}: {
  prayerKey: PrayerKey;
  english: string;
  breakdown: RakatBreakdown;
}) {
  const pills = buildPills(breakdown);

  return (
    <View className="bg-gray-50 rounded-2xl p-4 mx-4 mt-3">
      <View className="flex-row items-start justify-between">
        <View className="pr-3">
          <Text className="font-sans-bold text-lg text-gray-900">{english}</Text>
          <Text
            className="font-arabic text-2xl text-primary mt-1"
            style={{ writingDirection: 'rtl' }}
          >
            {ARABIC_NAMES[prayerKey]}
          </Text>
        </View>
        <View className="flex-1 flex-row flex-wrap gap-1.5 justify-end">
          {pills.map((pill) => (
            <RakatPill key={pill.key} label={pill.label} isFard={pill.isFard} />
          ))}
        </View>
      </View>
      <Text className="text-sm text-gray-600 mt-2">{PRAYER_DESCRIPTIONS[prayerKey]}</Text>
    </View>
  );
}

function PrayerTimesContent({ coordinates }: { coordinates: Coordinates }) {
  const { nextPrayerName, nextPrayerTime, countdown, todaysPrayers, isPast } =
    useNextPrayer(coordinates);

  // The rakat breakdown follows the madhab from settings (default Hanafi).
  const [madhab, setMadhab] = useState<MadhabKey>(DEFAULT_PRAYER_SETTINGS.madhab);
  useEffect(() => {
    let isMounted = true;
    getPrayerSettings().then((settings) => {
      if (isMounted) setMadhab(settings.madhab);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Reverse-geocode the coordinates to a human-readable place name. null while
  // loading; falls back to a generic label (never raw coordinates) on failure.
  const { latitude, longitude } = coordinates;
  const [locationName, setLocationName] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    setLocationName(null);
    (async () => {
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        const name =
          place?.city ??
          place?.district ??
          place?.subregion ??
          place?.region ??
          place?.country ??
          'Unknown location';
        if (isMounted) setLocationName(name);
      } catch {
        if (isMounted) setLocationName('Your location');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [latitude, longitude]);

  const rakat = RAKAT_DATA[madhab];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Location label */}
      <Text className="px-4 py-2 text-sm text-gray-500 font-sans">
        {locationName === null ? 'Locating…' : `Prayer times for ${locationName}`}
      </Text>

      {/* Next prayer highlight card */}
      <View className="bg-primary rounded-2xl p-5 mx-4 mt-3">
        <Text className="text-white font-sans text-sm opacity-80">Next Prayer</Text>
        <Text className="text-white font-sans-bold text-3xl mt-1">
          {nextPrayerName ?? '—'}
        </Text>
        <View className="flex-row items-end justify-between mt-1">
          <Text className="text-white font-sans-medium text-2xl">
            {nextPrayerTime ?? '—:—'}
          </Text>
          <Text className="text-white font-sans-medium text-lg opacity-90 tracking-wider">
            {countdown ?? '00:00:00'}
          </Text>
        </View>
      </View>

      {/* Today's prayers */}
      <Text className="font-sans-semibold text-lg text-gray-900 mt-6 mx-4">
        Today's Prayers
      </Text>
      <View className="mx-4 mt-2 rounded-2xl overflow-hidden border border-gray-100">
        {todaysPrayers.map((prayer) => (
          <PrayerListRow
            key={prayer.name}
            name={prayer.name}
            time={formatTime12Hour(prayer.time)}
            isNext={prayer.name === nextPrayerName && !isPast(prayer.name)}
            isPast={isPast(prayer.name)}
          />
        ))}
      </View>

      {/* Rakat breakdown */}
      <Text className="font-sans-semibold text-lg text-gray-900 mt-6 mx-4">
        Rakat Breakdown
      </Text>
      <Text className="text-xs text-gray-500 mx-4 mt-1">
        Following {madhab} tradition. Change in{' '}
        <Link href="/settings" asChild>
          <Text className="text-primary underline">settings</Text>
        </Link>
        .
      </Text>
      {PRAYER_ORDER.map(({ key, english }) => (
        <RakatCard key={key} prayerKey={key} english={english} breakdown={rakat[key]} />
      ))}
    </ScrollView>
  );
}

export default function PrayerTimesScreen() {
  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: 'Prayer Times',
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
              <Ionicons name="settings-outline" size={24} color="#0F766E" />
            </Pressable>
          ),
        }}
      />
      <LocationGate>
        {(coordinates) => <PrayerTimesContent coordinates={coordinates} />}
      </LocationGate>
    </View>
  );
}
