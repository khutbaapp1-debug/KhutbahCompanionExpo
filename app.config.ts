import { ExpoConfig } from 'expo/config';

const mapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
if (!mapsApiKey) {
  // eslint-disable-next-line no-console
  console.warn('[app.config] GOOGLE_MAPS_ANDROID_API_KEY is not set — falling back to hardcoded key. Set this in EAS secrets for production builds.');
}

const resolvedKey = mapsApiKey ?? 'AIzaSyB1S7ViAmw2BwniR7L4hbvO6b2LmIoM_F';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require('./app.json').expo;

const config: ExpoConfig = {
  ...appJson,
  android: {
    ...appJson.android,
    config: {
      ...appJson.android.config,
      googleMaps: { apiKey: resolvedKey },
    },
  },
  plugins: ((appJson.plugins as unknown[]) ?? []).map((p) =>
    Array.isArray(p) && p[0] === 'react-native-maps'
      ? ['react-native-maps', { androidGoogleMapsApiKey: resolvedKey }]
      : p
  ) as ExpoConfig['plugins'],
};

export default config;
