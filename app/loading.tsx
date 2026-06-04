import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';

import { getStoredLocation, requestAndCacheLocation } from '../src/lib/location';
import { getPrayerSettings } from '../src/lib/prayer-settings';
import { getPrayerTimesForDate } from '../src/lib/prayer-times';

const TEAL = '#0F766E';
const BASE_URL = 'https://khutbah-translate.replit.app';
const PERMS_KEY = 'permissions-requested';
const PRAYER_CACHE_KEY = 'cached-prayer-times-v1';
const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SPLASH_IMAGE = require('../assets/images/mosque_microphone_audio_setup.png');

// Skip the full sequence on subsequent in-session navigations (e.g. system
// back from home). Module-level so it survives unmount but resets on cold
// start, per spec.
let hasShownLoading = false;

// expo-notifications and expo-av's microphone request both touch native
// modules that aren't available in Expo Go. We still display the card so the
// onboarding flow stays consistent, but skip the actual request call.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

type CardKind = 'location' | 'notifications' | 'microphone';

type CardChoice = {
  allow: () => void;
  skip: () => void;
};

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

function PermissionCard({
  kind,
  onAllow,
  onSkip,
}: {
  kind: CardKind;
  onAllow: () => void;
  onSkip?: () => void;
}) {
  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 18,
      stiffness: 140,
      useNativeDriver: false,
    }).start();
  }, [translateY]);

  const meta =
    kind === 'location'
      ? {
          title: 'Prayer Times & Qibla',
          body: 'We need your location to calculate accurate prayer times and Qibla direction.',
          icon: <Ionicons name="location" size={28} color={TEAL} />,
        }
      : kind === 'notifications'
        ? {
            title: 'Prayer Reminders',
            body: 'Get notified before each prayer so you never miss one.',
            icon: <Ionicons name="notifications" size={28} color={TEAL} />,
          }
        : {
            title: 'Live Khutbah Translation',
            body: 'We need microphone access to record and translate the Friday sermon in real time.',
            icon: <Ionicons name="mic-outline" size={28} color={TEAL} />,
          };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
      }}
    >
      <Animated.View
        style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 36,
          transform: [{ translateY }],
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#E0F2F1',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {meta.icon}
        </View>
        <Text
          style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 20,
            color: '#111827',
            marginBottom: 8,
          }}
        >
          {meta.title}
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 14,
            color: '#4B5563',
            lineHeight: 22,
            marginBottom: 20,
          }}
        >
          {meta.body}
        </Text>
        <Pressable
          onPress={onAllow}
          style={({ pressed }) => ({
            backgroundColor: TEAL,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: '#FFFFFF',
            }}
          >
            Allow
          </Text>
        </Pressable>
        {onSkip ? (
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => ({
              marginTop: 12,
              paddingVertical: 8,
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
                color: TEAL,
              }}
            >
              Skip for now
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

async function requestNotificationPerm(): Promise<void> {
  if (IS_EXPO_GO) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    await Notifications.requestPermissionsAsync();
  } catch {
    // proceeding without notifications shouldn't block onboarding
  }
}

async function requestMicPerm(): Promise<void> {
  if (IS_EXPO_GO) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Audio } = require('expo-av') as typeof import('expo-av');
    await Audio.requestPermissionsAsync();
  } catch {
    // translation screen has its own runtime mic-permission flow as a fallback
  }
}

async function cacheTodaysPrayerTimes(): Promise<void> {
  const coords = await getStoredLocation();
  if (!coords) return;
  const settings = await getPrayerSettings();
  const today = new Date();
  const times = getPrayerTimesForDate(today, coords, settings);
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
  const [cardKind, setCardKind] = useState<CardKind | null>(null);
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const cardChoiceRef = useRef<CardChoice | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    // Show one permission card and resolve once the user picks Allow or Skip.
    // `onAllow` runs the actual system permission request, so the system
    // dialog only appears after the user has read the explainer.
    const awaitCard = (
      kind: CardKind,
      onAllow: () => Promise<void>,
      allowSkip: boolean,
    ): Promise<void> =>
      new Promise<void>((resolve) => {
        cardChoiceRef.current = {
          allow: async () => {
            await onAllow();
            cardChoiceRef.current = null;
            setCardKind(null);
            resolve();
          },
          skip: () => {
            if (!allowSkip) return;
            cardChoiceRef.current = null;
            setCardKind(null);
            resolve();
          },
        };
        setCardKind(kind);
      });

    async function run() {
      if (hasShownLoading) {
        router.replace('/');
        return;
      }

      // Persistent check — skip the entire onboarding on subsequent cold starts.
      const alreadyOnboarded =
        (await AsyncStorage.getItem(PERMS_KEY).catch(() => null)) === 'true';
      if (alreadyOnboarded) {
        hasShownLoading = true;
        router.replace('/');
        return;
      }

      // Step 1 — permissions (first launch only)
      setStatusAnimated('Requesting permissions…');

      await awaitCard(
        'location',
        async () => {
          try {
            await requestAndCacheLocation();
          } catch {
            // permission denied or device error — continue without coords
          }
        },
        true,
      );
      if (cancelled) return;

      await awaitCard('notifications', requestNotificationPerm, true);
      if (cancelled) return;

      await awaitCard('microphone', requestMicPerm, true);
      if (cancelled) return;

      await AsyncStorage.setItem(PERMS_KEY, 'true').catch(() => undefined);

      await delay(800);
      if (cancelled) return;

      // Step 2 — prayer times
      setStatusAnimated('Loading prayer times…');
      try {
        await cacheTodaysPrayerTimes();
      } catch {
        // missing coords / settings — non-fatal
      }
      await delay(500);
      if (cancelled) return;

      // Step 3 — daily content
      setStatusAnimated('Loading daily content…');
      await prefetchTodaysHadith();
      if (cancelled) return;

      // Step 4 — done
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
  }, [setStatusAnimated]);

  const handleAllow = () => cardChoiceRef.current?.allow();
  const handleSkip = () => cardChoiceRef.current?.skip();

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

        {cardKind ? (
          <PermissionCard
            kind={cardKind}
            onAllow={handleAllow}
            onSkip={handleSkip}
          />
        ) : null}
      </ImageBackground>
    </>
  );
}
