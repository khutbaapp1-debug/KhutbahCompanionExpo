import { Text, View } from 'react-native';

type Props = {
  prayerName?: string;
  prayerTime?: string;
  countdown?: string;
};

export default function NextPrayerCard({
  prayerName = '—',
  prayerTime = '—:—',
  countdown = '00:00:00',
}: Props) {
  return (
    <View className="bg-primary rounded-2xl p-5 mx-4 mt-4">
      <View className="flex-row items-center justify-between mb-2">
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
