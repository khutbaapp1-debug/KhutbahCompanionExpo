import { ExpoConfig } from 'expo/config';
import { withAndroidManifest, withMainActivity } from 'expo/config-plugins';

const mapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
if (!mapsApiKey) {
  // eslint-disable-next-line no-console
  console.warn('[app.config] GOOGLE_MAPS_ANDROID_API_KEY is not set — falling back to hardcoded key. Set this in EAS secrets for production builds.');
}

const resolvedKey = mapsApiKey ?? 'AIzaSyB1S7ViAmw2BwniR7L4hbvO6b2LmIoM_Fs';

const EXPECTED_MAPS_KEY = 'AIzaSyB1S7ViAmw2BwniR7L4hbvO6b2LmIoM_Fs';
if (resolvedKey && resolvedKey !== EXPECTED_MAPS_KEY) {
  throw new Error(
    `FATAL: Google Maps API key is truncated or incorrect — expected the 39-char key ending in 'Fs', got: ${resolvedKey}`,
  );
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require('./app.json').expo;

let config: ExpoConfig = {
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

// Fix the CONTENT_APPEARED race on production Hermes + New Architecture builds.
// SplashScreenManager.contentAppearedListener auto-hides the splash if
// preventAutoHideCalled is false when CONTENT_APPEARED fires. On fast devices
// the async JS bridge call from _layout.tsx's preventAutoHideAsync() hasn't been
// processed yet when CONTENT_APPEARED fires, so the splash is immediately hidden.
// Setting preventAutoHideCalled = true in the main thread before React starts
// eliminates this race entirely.
config = withMainActivity(config, (mod) => {
  const { contents } = mod.modResults;
  if (contents.includes('preventAutoHideCalled = true')) {
    return mod; // idempotent
  }
  mod.modResults.contents = contents.replace(
    /(\n[ \t]+\/\/ @generated begin expo-splashscreen)/,
    '\n    SplashScreenManager.preventAutoHideCalled = true$1',
  );
  return mod;
});

// expo-sensors injects ACTIVITY_RECOGNITION via its AndroidManifest; strip it via manifest merger.
config = withAndroidManifest(config, (c) => {
  const permissions = c.modResults.manifest['uses-permission'] ?? [];
  const alreadyStripped = permissions.some(
    (p) =>
      p.$['android:name'] === 'android.permission.ACTIVITY_RECOGNITION' &&
      (p.$ as Record<string, string>)['tools:node'] === 'remove',
  );
  if (!alreadyStripped) {
    permissions.push({
      $: {
        'android:name': 'android.permission.ACTIVITY_RECOGNITION',
        'tools:node': 'remove',
      } as never,
    });
    c.modResults.manifest['uses-permission'] = permissions;
  }
  return c;
});

export default config;
