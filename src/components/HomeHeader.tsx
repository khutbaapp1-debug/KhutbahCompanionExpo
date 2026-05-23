import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type Props = {
  onSettingsPress: () => void;
  onThemeTogglePress: () => void;
  onNotificationsPress: () => void;
};

export default function HomeHeader({
  onSettingsPress,
  onThemeTogglePress,
  onNotificationsPress,
}: Props) {
  return (
    <View className="bg-white border-b border-gray-200 px-4 pt-2 pb-3">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={onSettingsPress} className="p-1">
          <Ionicons name="settings-outline" size={22} color="#0F766E" />
        </Pressable>
        <Text className="text-xl font-sans-semibold text-primary">
          Khutbah Companion
        </Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={onThemeTogglePress} className="p-1">
            <Ionicons name="moon-outline" size={22} color="#0F766E" />
          </Pressable>
          <Pressable onPress={onNotificationsPress} className="p-1">
            <Ionicons name="notifications-outline" size={22} color="#0F766E" />
          </Pressable>
        </View>
      </View>
      <View className="mt-1">
        <Text className="text-base font-sans-semibold text-primary">
          Assalamu Alaikum
        </Text>
        <Text className="text-xs font-sans text-gray-500">
          Your complete Islamic companion
        </Text>
      </View>
    </View>
  );
}
