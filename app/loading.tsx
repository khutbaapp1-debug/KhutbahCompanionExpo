import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  StatusBar,
  Text,
  View,
} from 'react-native';

import { getStoredLocation } from '../src/lib/location';
import { getPrayerSettings } from '../src/lib/prayer-settings';
import { getPrayerTimesForDate } from '../src/lib/prayer-times';

const TEAL = '#0F766E';
const BASE_URL = 'https://khutbahtranslate-production.up.railway.app';
const ONBOARDING_KEY = 'onboarding-complete';
const PRAYER_CACHE_KEY = 'cached-prayer-times-v1';
const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SPLASH_IMAGE = require('../assets/images/mosque_microphone_audio_setup.png');

// Skip the full sequence on subsequent in-session navigations (e.g. system
// back from home). Module-level so it survives unmount but resets on cold
// start, per spec.
let hasShownLoading = false;

// Permissions are requested lazily per feature (Prayer Times / Qibla request
// location on open, Translation requests the microphone, notifications are
// requested from the reminders screen) — there is no upfront onboarding prompt.

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function PulsingDots() {
  const dots = useRef([
    new Animated.Value(0.4),
    new Animated.Value(0.4),
    new Animated.Value(0.4),
  ]).current;

  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.4,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: '#FFFFFF',
            opacity: dot,
            transform: [{ scale: dot }],
          }}
        />
      ))}
    </View>
  );
}

async function cacheTodaysPrayerTimes(): Promise<void> {
  const coords = await getStoredLocation();
  if (!coords) return;
  const settings = await getPrayerSettings();
  const today = new Date();
  const times = getPrayerTimesForDate(today, coords, settings);
  if (!times) return; // null island or missing coordinates
  const serialised = {
    date: today.toISOString().slice(0, 10),
    coords,
    times: {
      fajr: times.fajr.toISOString(),
      dhuhr: times.dhuhr.toISOString(),
      asr: times.asr.toISOString(),
      maghrib: times.maghrib.toISOString(),
      isha: times.isha.toISOString(),
    },
  };
  await AsyncStorage.setItem(PRAYER_CACHE_KEY, JSON.stringify(serialised));
}

function hadithKeyForToday(): string {
  const d = new Date();
  return `hadith-cache-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function prefetchTodaysHadith(): Promise<void> {
  const key = hadithKeyForToday();
  const cached = await AsyncStorage.getItem(key);
  if (cached) return;
  try {
    const res = await fetch(`${BASE_URL}/api/hadiths/daily`);
    if (!res.ok) return;
    const data: unknown = await res.json();
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {
    // hadith screen retries on its own next open
  }
}

export default function LoadingScreen() {
  const [status, setStatus] = useState('Starting up…');
  const statusOpacity = useRef(new Animated.Value(1)).current;

  const setStatusAnimated = useCallback(
    (next: string) => {
      Animated.timing(statusOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setStatus(next);
        Animated.timing(statusOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    },
    [statusOpacity],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function run() {
        if (hasShownLoading) {
          router.replace('/');
          return;
        }

        // Persistent check — show the branded first-run splash only once.
        const alreadyOnboarded =
          (await AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null)) === 'true';
        if (alreadyOnboarded) {
          hasShownLoading = true;
          router.replace('/');
          return;
        }

        // Permissions are requested lazily per feature, so first launch goes
        // straight into preloading content behind the splash.
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => undefined);

        // Step 1 — prayer times
        setStatusAnimated('Loading prayer times…');
        try {
          await cacheTodaysPrayerTimes();
        } catch {
          // missing coords / settings — non-fatal
        }
        await delay(500);
        if (cancelled) return;

        // Step 2 — daily content
        setStatusAnimated('Loading daily content…');
        await prefetchTodaysHadith();
        if (cancelled) return;

        // Step 3 — done
        setStatusAnimated('All done!');
        await delay(600);
        if (cancelled) return;

        hasShownLoading = true;
        router.replace('/');
      }

      void run();
      return () => {
        cancelled = true;
      };
    }, [setStatusAnimated]),
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <StatusBar barStyle="light-content" backgroundColor={TEAL} />
      <ImageBackground
        source={SPLASH_IMAGE}
        style={{ flex: 1 }}
        resizeMode="cover"
        imageStyle={{ opacity: 0.7 }}
      >
        {/* Teal overlay keeps the brand colour dominant while the mic/mosque
            image stays subtly visible underneath. */}
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 118, 110, 0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{
              fontFamily: 'NotoNaskhArabic_400Regular',
              fontSize: 28,
              color: '#FFFFFF',
              textAlign: 'center',
              lineHeight: 48,
            }}
          >
            {BISMILLAH}
          </Text>
          <Text
            style={{
              marginTop: 32,
              fontFamily: 'Inter_700Bold',
              fontSize: 24,
              color: '#FFFFFF',
              textAlign: 'center',
            }}
          >
            Khutbah Companion
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
            }}
          >
            Your complete Islamic companion
          </Text>
          <View style={{ marginTop: 56 }}>
            <PulsingDots />
          </View>
          <Animated.Text
            style={{
              marginTop: 24,
              fontFamily: 'Inter_500Medium',
              fontSize: 14,
              color: 'rgba(255,255,255,0.9)',
              textAlign: 'center',
              opacity: statusOpacity,
            }}
          >
            {status}
          </Animated.Text>
        </View>
      </ImageBackground>
    </>
  );
}
