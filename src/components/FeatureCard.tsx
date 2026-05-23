import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  href: string;
};

export default function FeatureCard({ title, subtitle, iconName, href }: Props) {
  return (
    <Link href={href as never} asChild>
      <Pressable className="flex-1">
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <View className="w-12 h-12 rounded-full bg-primary-container items-center justify-center">
            <Ionicons name={iconName} size={24} color="#0F766E" />
          </View>
          <Text className="text-primary font-sans-semibold text-base mt-3" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-gray-500 font-sans text-xs mt-1" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
