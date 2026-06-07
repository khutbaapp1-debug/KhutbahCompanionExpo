import Constants from 'expo-constants';
import { Text, View } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

import { AD_UNIT_IDS } from '../lib/ads';
import { useTheme } from '../lib/theme-context';

const adUnitId = __DEV__ ? TestIds.BANNER : AD_UNIT_IDS.banner;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[BannerAd] adUnitId =', adUnitId, '| TestIds.BANNER =', TestIds.BANNER);
}

// react-native-google-mobile-ads ships a native module that isn't bundled into
// Expo Go. Detect Expo Go and render an "Advertisement" placeholder, mirroring
// the lazy-load pattern used in src/lib/notifications.ts and the old
// BannerAdPlaceholder component.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

function Placeholder() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        height: 60,
        backgroundColor: theme.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: 1,
        borderTopColor: theme.border,
      }}
    >
      <Text style={{ color: theme.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
        Advertisement
      </Text>
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
          unitId={adUnitId}
          size={Ads.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
      </View>
    );
  } catch {
    return <Placeholder />;
  }
}
