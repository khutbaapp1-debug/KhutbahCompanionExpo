import { Text, View } from 'react-native';

type Props = {
  name: string;
  time: string;
  isNext: boolean;
  isPast: boolean;
};

export default function PrayerListRow({ name, time, isNext, isPast }: Props) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 border-b border-gray-100 ${
        isNext ? 'bg-teal-50' : ''
      } ${isPast && !isNext ? 'opacity-60' : ''}`}
    >
      <Text
        className={`text-base ${
          isNext ? 'font-sans-bold text-primary' : 'font-sans-medium text-gray-900'
        }`}
      >
        {name}
      </Text>

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
