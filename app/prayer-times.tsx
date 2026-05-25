import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import LocationGate from '../src/components/LocationGate';
import { RAKAT_DATA, type RakatBreakdown } from '../src/data/rakat';
import { useNextPrayer } from '../src/hooks/useNextPrayer';
import {
  DEFAULT_PRAYER_SETTINGS,
  getPrayerSettings,
  type MadhabKey,
} from '../src/lib/prayer-settings';
import { formatTime12Hour } from '../src/lib/prayer-times';
import type { Coordinates } from '../src/lib/prayer-times';

type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

// Maps the display name returned by useNextPrayer back to its rakat key.
const KEY_BY_ENGLISH: Record<string, PrayerKey> = {
  Fajr: 'fajr',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
};

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

// Compact prayer card: name (+ NEXT badge) and rakat bubbles on row 1,
// time centered on row 2.
function PrayerCard({
  english,
  time,
  breakdown,
  isNext,
  isPast,
}: {
  english: string;
  time: string;
  breakdown: RakatBreakdown;
  isNext: boolean;
  isPast: boolean;
}) {
  const pills = buildPills(breakdown);

  return (
    <View
      className={`bg-white rounded-xl mx-4 mb-2 px-4 py-3 border ${
        isNext ? 'bg-primary/5 border-primary' : 'border-gray-100'
      } ${isPast ? 'opacity-60' : ''}`}
    >
      {/* Row 1: name (+ NEXT badge) on the left, rakat bubbles pushed right */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text
            className={`font-sans-semibold text-base ${
              isNext ? 'text-primary' : 'text-gray-900'
            }`}
            style={{ flexShrink: 0 }}
          >
            {english}
          </Text>
          {isNext ? (
            <View className="rounded-full bg-primary px-1.5 py-0.5">
              <Text className="text-white font-sans-semibold text-[10px]">NEXT</Text>
            </View>
          ) : null}
        </View>
        <View className="flex-row flex-wrap justify-end gap-1" style={{ flex: 1 }}>
          {pills.map((pill) => (
            <RakatPill key={pill.key} label={pill.label} isFard={pill.isFard} />
          ))}
        </View>
      </View>

      {/* Row 2: time centered below */}
      <Text
        className={`text-sm mt-1 ${
          isNext ? 'font-sans-bold text-primary' : 'font-sans-medium text-gray-500'
        }`}
        style={{ textAlign: 'center' }}
      >
        {time}
      </Text>
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
    <View className="flex-1 bg-white">
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

      {/* Compact per-prayer cards: name + rakat + time, no scrolling */}
      <View className="mt-3">
        {todaysPrayers.map((prayer) => {
          const isNext = prayer.name === nextPrayerName && !isPast(prayer.name);
          return (
            <PrayerCard
              key={prayer.name}
              english={prayer.name}
              time={formatTime12Hour(prayer.time)}
              breakdown={rakat[KEY_BY_ENGLISH[prayer.name]]}
              isNext={isNext}
              isPast={isPast(prayer.name) && !isNext}
            />
          );
        })}
      </View>
    </View>
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
