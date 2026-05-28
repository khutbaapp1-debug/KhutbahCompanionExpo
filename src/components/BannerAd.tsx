import Constants from 'expo-constants';
import { Text, View } from 'react-native';

import { AD_UNIT_IDS } from '../lib/ads';

// react-native-google-mobile-ads ships a native module that isn't bundled into
// Expo Go. Detect Expo Go and render an "Advertisement" placeholder, mirroring
// the lazy-load pattern used in src/lib/notifications.ts and the old
// BannerAdPlaceholder component.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

function Placeholder() {
  return (
    <View className="h-[60px] bg-surface-light items-center justify-center border-t border-gray-200">
      <Text className="text-gray-400 font-sans text-xs">Advertisement</Text>
    </View>
  );
}

export default function BannerAd() {
  if (IS_EXPO_GO) return <Placeholder />;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Ads = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');
    const NativeBannerAd = Ads.BannerAd;
    return (
      <View>
        <NativeBannerAd
          unitId={AD_UNIT_IDS.banner}
          size={Ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
      </View>
    );
  } catch {
    return <Placeholder />;
  }
}
