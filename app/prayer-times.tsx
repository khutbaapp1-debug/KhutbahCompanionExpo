import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

// Time-of-day icon per prayer. (Ionicons has no "sunset" glyph, so Maghrib
// uses cloudy-night-outline for a dusk feel.)
const ICON_BY_KEY: Record<PrayerKey, keyof typeof Ionicons.glyphMap> = {
  fajr: 'moon-outline',
  dhuhr: 'sunny-outline',
  asr: 'partly-sunny-outline',
  maghrib: 'cloudy-night-outline',
  isha: 'moon',
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

function RakatPill({
  label,
  isFard,
  onPrimary,
}: {
  label: string;
  isFard: boolean;
  onPrimary?: boolean;
}) {
  // On the teal next-prayer card every bubble is a translucent white pill —
  // the fard/sunnah colour split would be illegible against the teal.
  if (onPrimary) {
    return (
      <View className="px-2.5 py-1 rounded-full bg-white/20">
        <Text className="text-xs font-sans-medium text-white">{label}</Text>
      </View>
    );
  }

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

// Rich prayer card: time-of-day icon · name + rakat bubbles · time + NEXT badge.
// The next prayer is highlighted with a solid teal background.
function PrayerCard({
  english,
  time,
  icon,
  breakdown,
  isNext,
  isPast,
}: {
  english: string;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  breakdown: RakatBreakdown;
  isNext: boolean;
  isPast: boolean;
}) {
  const pills = buildPills(breakdown);

  return (
    <View
      className={`flex-row items-center px-4 py-4 rounded-2xl mx-4 ${
        isNext
          ? 'bg-primary'
          : `bg-white border border-gray-100${isPast ? ' opacity-50' : ' shadow-sm'}`
      }`}
      style={!isNext && !isPast ? { elevation: 1 } : undefined}
    >
      {/* Left: time-of-day icon circle */}
      <View style={{ width: 44 }} className="items-center">
        <View
          className={`items-center justify-center rounded-full ${
            isNext ? 'bg-white/20' : 'bg-primary-container'
          }`}
          style={{ width: 44, height: 44 }}
        >
          <Ionicons name={icon} size={18} color={isNext ? '#FFFFFF' : '#0F766E'} />
        </View>
      </View>

      {/* Middle: name + rakat bubbles */}
      <View className="flex-1" style={{ marginHorizontal: 10 }}>
        <Text
          className={`text-base ${
            isNext ? 'font-sans-bold text-white' : 'font-sans-semibold text-gray-900'
          }`}
        >
          {english}
        </Text>
        <View className="flex-row flex-wrap gap-1 mt-1">
          {pills.map((pill) => (
            <RakatPill
              key={pill.key}
              label={pill.label}
              isFard={pill.isFard}
              onPrimary={isNext}
            />
          ))}
        </View>
      </View>

      {/* Right: time + NEXT badge */}
      <View style={{ width: 70 }} className="items-end">
        <Text
          className={`font-sans-bold text-base ${isNext ? 'text-white' : 'text-gray-700'}`}
          style={{ textAlign: 'right' }}
        >
          {time}
        </Text>
        {isNext ? (
          <View className="mt-1 rounded-full bg-white px-2 py-0.5">
            <Text className="text-primary font-sans-semibold text-xs">NEXT</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PrayerTimesContent({ coordinates }: { coordinates: Coordinates }) {
  // Bumped on focus so prayer times + rakat reload after Settings changes.
  const [refreshKey, setRefreshKey] = useState(0);
  const { nextPrayerName, nextPrayerTime, countdown, todaysPrayers, isPast } =
    useNextPrayer(coordinates, refreshKey);

  // The rakat breakdown follows the madhab from settings (default Hanafi).
  // Reloaded via useFocusEffect so a Settings change applies on navigate-back.
  const [madhab, setMadhab] = useState<MadhabKey>(DEFAULT_PRAYER_SETTINGS.madhab);
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getPrayerSettings().then((settings) => {
        if (isMounted) setMadhab(settings.madhab);
      });
      setRefreshKey((k) => k + 1);
      return () => {
        isMounted = false;
      };
    }, []),
  );

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
      <View className="bg-primary rounded-2xl p-4 mx-4 mt-3">
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

      {/* Per-prayer cards: taller, grouped at the top with a fixed 10dp gap */}
      <View className="flex-1 justify-start gap-2.5 mt-3">
        {todaysPrayers.map((prayer) => {
          const key = KEY_BY_ENGLISH[prayer.name];
          const isNext = prayer.name === nextPrayerName && !isPast(prayer.name);
          return (
            <PrayerCard
              key={prayer.name}
              english={prayer.name}
              time={formatTime12Hour(prayer.time)}
              icon={ICON_BY_KEY[key]}
              breakdown={rakat[key]}
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
