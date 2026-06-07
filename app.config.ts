import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  ...require('./app.json').expo,
  android: {
    ...require('./app.json').expo.android,
    config: {
      ...require('./app.json').expo.android.config,
      googleMaps: {
        apiKey:
          process.env.GOOGLE_MAPS_ANDROID_API_KEY ??
          'AIzaSyB1S7ViAmw2BwniR7L4hbvO6b2LmIoM_F',
      },
    },
  },
};

export default config;
