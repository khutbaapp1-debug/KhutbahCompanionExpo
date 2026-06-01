import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type Props = {
  prayerName?: string;
  prayerTime?: string;
  countdown?: string;
  // When true, the card swaps its prayer info for an "Enable Location" prompt.
  needsLocation?: boolean;
  requesting?: boolean;
  onEnableLocation?: () => void;
};

export default function NextPrayerCard({
  prayerName = '—',
  prayerTime = '—:—',
  countdown = '00:00:00',
  needsLocation = false,
  requesting = false,
  onEnableLocation,
}: Props) {
  // No cached location and permission not yet granted: show a clear prompt with
  // an Enable Location button instead of empty "—:—" placeholders.
  if (needsLocation) {
    return (
      <View className="bg-primary rounded-2xl p-4">
        <View className="flex-row items-center mb-2">
          <MaterialCommunityIcons name="map-marker-radius" size={20} color="#FFFFFF" />
          <Text className="text-white font-sans-semibold text-sm ml-2">
            Enable location to see prayer times
          </Text>
        </View>
        <Pressable
          onPress={onEnableLocation}
          disabled={requesting}
          className="self-start rounded-full bg-white px-4 py-2 mt-1"
          style={({ pressed }) => ({ opacity: pressed || requesting ? 0.8 : 1 })}
        >
          <Text className="text-primary font-sans-semibold text-sm">
            {requesting ? 'Getting location…' : 'Enable Location'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="bg-primary rounded-2xl p-3">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-white font-sans text-sm opacity-80">Next Prayer</Text>
        <Text className="text-white font-sans-semibold text-base">{prayerName}</Text>
      </View>
      <View className="flex-row items-end justify-between">
        <Text className="text-white font-sans-bold text-3xl">{prayerTime}</Text>
        <Text className="text-white font-sans text-sm opacity-70">{countdown}</Text>
      </View>
    </View>
  );
}
