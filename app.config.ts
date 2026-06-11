import { ExpoConfig } from 'expo/config';

const mapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
if (!mapsApiKey) {
  // eslint-disable-next-line no-console
  console.warn('[app.config] GOOGLE_MAPS_ANDROID_API_KEY is not set — falling back to hardcoded key. Set this in EAS secrets for production builds.');
}

const config: ExpoConfig = {
  ...require('./app.json').expo,
  android: {
    ...require('./app.json').expo.android,
    config: {
      ...require('./app.json').expo.android.config,
      googleMaps: {
        apiKey: mapsApiKey ?? 'AIzaSyB1S7ViAmw2BwniR7L4hbvO6b2LmIoM_F',
      },
    },
  },
};

export default config;
