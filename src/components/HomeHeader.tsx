import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../lib/theme-context';

type Props = {
  onSettingsPress: () => void;
  onThemeTogglePress: () => void;
  themeIcon: keyof typeof Ionicons.glyphMap;
  onNotificationsPress: () => void;
};

export default function HomeHeader({
  onSettingsPress,
  onThemeTogglePress,
  themeIcon,
  onNotificationsPress,
}: Props) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
      }}
    >
      <View className="flex-row items-center">
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 20, color: theme.primary, flex: 1 }}>
          Khutbah Companion
        </Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={onThemeTogglePress} className="p-1">
            <Ionicons name={themeIcon} size={22} color={theme.primary} />
          </Pressable>
          <Pressable onPress={onNotificationsPress} className="p-1">
            <Ionicons name="notifications-outline" size={22} color={theme.primary} />
          </Pressable>
          <Pressable onPress={onSettingsPress} className="p-1">
            <Ionicons name="settings-outline" size={22} color={theme.primary} />
          </Pressable>
        </View>
      </View>
      <View className="mt-1">
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.primary }}>
          Assalamu Alaikum
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.textMuted }}>
          Your complete Islamic companion
        </Text>
      </View>
    </View>
  );
}
