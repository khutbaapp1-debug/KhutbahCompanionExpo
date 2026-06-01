import '../global.css';
// Applies global Text defaults (disables Android includeFontPadding) so letter
// descenders aren't clipped. Side-effect import — must run before any Text renders.
import '../src/lib/text-defaults';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  NotoNaskhArabic_400Regular,
  NotoNaskhArabic_700Bold,
} from '@expo-google-fonts/noto-naskh-arabic';

import { ThemeProvider, useTheme } from '../src/lib/theme-context';

// Keep the native splash screen visible while we load fonts and other critical
// startup state. Called at module scope (before the component renders) so the
// splash is never auto-hidden on the first frame. Errors are ignored: if the
// splash is already hidden this throws, which is harmless.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore — splash may already be hidden */
});

// Make the loading screen the initial route so the onboarding flow always
// runs first on a cold start. Falls through to "/" via router.replace once
// the sequence completes.
export const unstable_settings = {
  initialRouteName: 'loading',
};

// Inner navigator: consumes the theme so the native header bars and default
// screen background follow the selected light/dark/high-contrast theme.
function ThemedStack() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen
        name="loading"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="translation" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-times" options={{ title: 'Prayer Times' }} />
      <Stack.Screen name="qibla" options={{ title: 'Qibla Compass' }} />
      <Stack.Screen name="quran/index" options={{ title: 'Quran' }} />
      <Stack.Screen name="quran/[surahNumber]" options={{ headerShown: false }} />
      <Stack.Screen name="duas" options={{ title: 'Daily Duas' }} />
      <Stack.Screen name="hadith" options={{ title: 'Daily Hadith' }} />
      <Stack.Screen name="tasbih" options={{ title: 'Tasbih Counter' }} />
      <Stack.Screen name="names" options={{ title: '99 Names of Allah' }} />
      <Stack.Screen name="mosques" options={{ title: 'Mosque Finder' }} />
      <Stack.Screen name="salah-guide" options={{ title: 'Salah & Wudu Guide' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
    </Stack>
  );
}

// Root layout: a single Stack navigator (no bottom tabs in this app).
// Screen titles are configured centrally here so each screen file can stay
// minimal.
export default function RootLayout() {
  // Inter (UI) and Noto Naskh Arabic (Arabic text) are required by the Week 2
  // design. Hold rendering until they're ready so text never flashes in a
  // fallback face.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_700Bold,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    KFGQPCHafs: require('../assets/fonts/KFGQPCHafs.otf'),
  });

  // Hide the native splash screen only once the fonts have finished loading, so
  // the splash stays up for the whole startup instead of flashing and then
  // showing a blank screen while fonts resolve.
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore — splash may already be hidden */
      });
    }
  }, [fontsLoaded]);

  // Keep rendering nothing (the native splash remains visible) until fonts are
  // ready, so text never flashes in a fallback face.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
