import '../global.css';
// Applies global Text defaults (disables Android includeFontPadding) so letter
// descenders aren't clipped. Side-effect import — must run before any Text renders.
import '../src/lib/text-defaults';

import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { requireOptionalNativeModule } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds from 'react-native-google-mobile-ads';
import Purchases from 'react-native-purchases';
import { ThemeProvider, useTheme } from '../src/lib/theme-context';
import BannerAd from '../src/components/BannerAd';

// Initialise RevenueCat early so getCustomerInfo() is ready before any screen
// calls isPremium(). Wrapped in try/catch so Expo Go (no native module) never
// crashes the app.
try {
  Purchases.configure({ apiKey: 'goog_dJveXoqqkSCQqhfMYICADUBSHyn' });
} catch {
  // Native module unavailable (Expo Go) — premium features default to locked.
}

// Keep the native splash screen visible while fonts load.
// Two separate guards are required:
//
// 1. Public guard — prevents the system from auto-dismissing the splash.
SplashScreen.preventAutoHideAsync().catch(() => {});
//
// 2. Internal guard — expo-router's renderRootComponent calls
//    SplashModule.internalPreventAutoHideAsync() in a deferred setTimeout
//    (counter → 1), then onReady() calls internalMaybeHideAsync() via
//    requestAnimationFrame (counter → 0 → splash hides). This fires before
//    fonts finish loading on fast devices, so we add a second increment here
//    so onReady only brings the counter to 1, not 0.
//    IMPORTANT: these methods live on the native ExpoSplashScreen module, NOT
//    on expo-splash-screen's JS exports — calling them on the wrong object is
//    a silent no-op due to optional chaining. We access the native module
//    directly using the same requireOptionalNativeModule('ExpoSplashScreen')
//    call that expo-router's own utils/splash.ts uses.
const _SplashNative = requireOptionalNativeModule<{
  internalPreventAutoHideAsync?: () => Promise<boolean>;
}>('ExpoSplashScreen');
void _SplashNative?.internalPreventAutoHideAsync?.();

const ONBOARDING_KEY = 'onboarding-complete';

// Banner ad rendered on every screen, flush against the navigation bar.
// SafeAreaView with edges={['bottom']} absorbs the bottom inset so there is
// zero gap between the ad and the system navigation bar across all themes.
function ThemedBanner() {
  const { theme } = useTheme();
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.surface }}>
      <BannerAd />
    </SafeAreaView>
  );
}

// Inner navigator: consumes the theme so the native header bars and default
// screen background follow the selected light/dark/high-contrast theme.
function ThemedStack() {
  const { theme, mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
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
        <Stack.Screen name="my-duas" options={{ title: 'My Duas' }} />
        <Stack.Screen name="hadith" options={{ title: 'Daily Hadith' }} />
        <Stack.Screen name="zakat" options={{ title: 'Zakat Calculator' }} />
        <Stack.Screen name="tasbih" options={{ title: 'Tasbih Counter' }} />
        <Stack.Screen name="names" options={{ title: '99 Names of Allah' }} />
        <Stack.Screen name="mosques" options={{ title: 'Mosque Finder' }} />
        <Stack.Screen name="salah-guide" options={{ title: 'Salah & Wudu Guide' }} />
        <Stack.Screen name="ramadan" options={{ title: 'Ramadan' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      </Stack>
    </>
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

  // Tracks whether the onboarding AsyncStorage check has resolved.
  const [startupReady, setStartupReady] = useState(false);
  // '/loading' on first launch, '/' on all subsequent launches.
  const startupTargetRef = useRef('/');

  // Check onboarding status in parallel with font loading so both complete
  // before the native splash is dismissed. AsyncStorage is typically <10ms,
  // so this rarely adds perceptible delay.
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((val) => {
        startupTargetRef.current = val === 'true' ? '/' : '/loading';
        setStartupReady(true);
      })
      .catch(() => {
        // Default to home on error — onboarding will re-run next cold start.
        setStartupReady(true);
      });
  }, []);

  // Initialise the Google Mobile Ads SDK once on mount so ad requests can be
  // served as soon as the first screen renders.
  useEffect(() => {
    mobileAds().initialize();
  }, []);

  // Hide the native splash only once BOTH fonts AND the onboarding check are
  // complete, so the splash covers any intermediate state. On first launch we
  // also navigate to /loading here — this fires before the splash finishes its
  // exit animation, so the user sees loading.tsx (not index.tsx) when it clears.
  useEffect(() => {
    if (!fontsLoaded || !startupReady) return;
    SplashScreen.hideAsync().catch(() => {});
    if (startupTargetRef.current === '/loading') {
      router.replace('/loading');
    }
  }, [fontsLoaded, startupReady]);

  // Keep rendering nothing (native splash stays visible) until fonts AND the
  // startup check are both ready.
  if (!fontsLoaded || !startupReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={{ flex: 1 }}>
          <ThemedStack />
          <ThemedBanner />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
