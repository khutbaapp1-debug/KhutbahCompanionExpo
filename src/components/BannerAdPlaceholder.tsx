import { Text, View } from 'react-native';

export default function BannerAdPlaceholder() {
  return (
    <View className="h-[60px] bg-surface-light items-center justify-center border-t border-gray-200">
      <Text className="text-gray-400 font-sans text-xs">Advertisement</Text>
    </View>
  );
}
