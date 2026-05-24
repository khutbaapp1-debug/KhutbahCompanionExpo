import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

type Props = {
  name: string;
  time: string;
  isNext: boolean;
  isPast: boolean;
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Each prayer gets a time-of-day icon so the list reads at a glance.
const ICONS: Record<string, IconName> = {
  Fajr: 'weather-sunset-up',
  Dhuhr: 'white-balance-sunny',
  Asr: 'weather-partly-cloudy',
  Maghrib: 'weather-sunset-down',
  Isha: 'weather-night',
};

export default function PrayerListRow({ name, time, isNext, isPast }: Props) {
  const icon: IconName = ICONS[name] ?? 'circle-small';

  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 border-b border-gray-100 ${
        isNext ? 'bg-teal-50' : ''
      } ${isPast && !isNext ? 'opacity-60' : ''}`}
    >
      <View className="flex-row items-center">
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={isNext ? '#0F766E' : '#9CA3AF'}
        />
        <Text
          className={`ml-3 text-base ${
            isNext ? 'font-sans-bold text-primary' : 'font-sans-medium text-gray-900'
          }`}
        >
          {name}
        </Text>
      </View>

      <View className="flex-row items-center">
        <Text
          className={`text-base ${
            isNext ? 'font-sans-bold text-primary' : 'font-sans text-gray-700'
          }`}
        >
          {time}
        </Text>
        {isNext ? (
          <View className="ml-2 rounded-full bg-primary px-2 py-0.5">
            <Text className="text-white font-sans-semibold text-xs">NEXT</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
