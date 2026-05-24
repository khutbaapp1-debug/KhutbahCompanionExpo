import { Link } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import LocationGate from '../src/components/LocationGate';
import PrayerListRow from '../src/components/PrayerListRow';
import { useNextPrayer } from '../src/hooks/useNextPrayer';
import { formatTime12Hour } from '../src/lib/prayer-times';
import type { Coordinates } from '../src/lib/prayer-times';

function formatCoordinates(coords: Coordinates): string {
  const latDir = coords.latitude >= 0 ? 'N' : 'S';
  const lngDir = coords.longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(coords.latitude).toFixed(2)}°${latDir}, ${Math.abs(coords.longitude).toFixed(2)}°${lngDir}`;
}

function PrayerTimesContent({ coordinates }: { coordinates: Coordinates }) {
  const { nextPrayerName, nextPrayerTime, countdown, todaysPrayers, isPast } =
    useNextPrayer(coordinates);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Location label */}
      <Text className="px-4 py-2 text-sm text-gray-500 font-sans">
        Currently showing prayer times for {formatCoordinates(coordinates)}
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

      {/* Today's prayers list */}
      <View className="mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-100">
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

      {/* Settings link */}
      <Link href="/settings" asChild>
        <Pressable className="py-4 mt-2">
          <Text className="text-primary text-center underline font-sans-medium">
            ⚙️ Adjust calculation method, madhab, high latitude rule
          </Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

export default function PrayerTimesScreen() {
  return (
    <View className="flex-1 bg-white">
      <LocationGate>
        {(coordinates) => <PrayerTimesContent coordinates={coordinates} />}
      </LocationGate>
    </View>
  );
}
