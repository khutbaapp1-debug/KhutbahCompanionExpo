import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack, useRouter } from 'expo-router';
import { Component, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  type AppStateStatus,
  Easing,
  FlatList,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AudioRecorderManager,
  type RecorderState,
  type TranslationSegment,
} from '../src/lib/audio-recorder';
import { SummaryModal } from '../src/components/SummaryModal';
import type { SummarySchema, SummariseResponse } from '../src/lib/summary-types';
import {
  enqueueChunk,
  retryPendingChunks,
  subscribePendingCount,
} from '../src/lib/translation-upload';
import { usePremium } from '../src/hooks/usePremium';
import { useTheme } from '../src/lib/theme-context';

const DISCLAIMER_KEY = 'translation-disclaimer-v1';
const HISTORY_KEY = 'translation-history-v1';
const LANG_SOURCE_KEY = 'translation-source-lang';
const LANG_TARGET_KEY = 'translation-target-lang';
const SUMMARISE_URL = 'https://khutbahtranslate-production.up.railway.app/api/summarise';
const BACKGROUND_GRACE_MS = 30_000;
const KEEP_AWAKE_TAG = 'translation';
const FREE_SOURCE = 'ar';
const FREE_TARGET = 'en';

type LangOption = { code: string; label: string };
const SOURCE_LANGUAGES: LangOption[] = [
  { code: 'ar', label: 'Arabic' },
  { code: 'fr', label: 'French' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ur', label: 'Urdu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'id', label: 'Indonesian' },
  { code: 'en', label: 'English' },
];
const TARGET_LANGUAGES: LangOption[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'ur', label: 'Urdu' },
  { code: 'ar', label: 'Arabic' },
  { code: 'bn', label: 'Bengali' },
  { code: 'tr', label: 'Turkish' },
  { code: 'es', label: 'Spanish' },
];
const LANG_LABEL: Record<string, string> = Object.fromEntries(
  [...SOURCE_LANGUAGES, ...TARGET_LANGUAGES].map((l) => [l.code, l.label]),
);

// `appOwnership === 'expo'` is only true inside Expo Go, where the native audio
// module is unavailable. We still render the full UI + disclaimer there, but
// recording is blocked with an explanation.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

const EXPO_GO_MESSAGE =
  'Live Translation records audio using a native module that is not available in Expo Go. ' +
  'Run a development build (npx expo run:android or npx expo run:ios) to use this feature.';

const DISCLAIMER_CARDS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'mic-outline',
    title: 'Audio Quality Matters',
    body: 'Echoes, distance from the speaker, and background noise all reduce accuracy. A clear recording translates much better than one from the back of a noisy hall.',
  },
  {
    icon: 'sparkles',
    title: 'AI Translation Is Imperfect',
    body: 'Even with clear audio, mistakes happen — especially with classical Arabic, Quranic verses, and hadith quotations.',
  },
  {
    icon: 'book-outline',
    title: 'Verify With Your Imam',
    body: 'This is a helpful aid for following along — not an authoritative record. For matters of religious importance, ask your imam or a qualified scholar.',
  },
];

function formatElapsed(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

// Gently pulsing microphone for the "listening" empty state.
function PulsingMic() {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}
    >
      <Ionicons name="mic" size={40} color={theme.primary} />
    </Animated.View>
  );
}

class TranslationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[TranslationErrorBoundary] caught:', error?.stack ?? String(error));
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: '#6B7280', textAlign: 'center' }}>
            Something went wrong. Go back and try again.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 10 }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: 'white' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function TranslationScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [segments, setSegments] = useState<TranslationSegment[]>([]);
  const [countdown, setCountdown] = useState(15);
  const [elapsed, setElapsed] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFirstChunkPending, setIsFirstChunkPending] = useState(false);
  const [sourceLang, setSourceLang] = useState(FREE_SOURCE);
  const [targetLang, setTargetLang] = useState(FREE_TARGET);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [summaryData, setSummaryData] = useState<SummarySchema | null>(null);
  const [summaryDate, setSummaryDate] = useState<Date>(new Date());
  const khutbahTextRef = useRef('');
  const [pendingCount, setPendingCount] = useState(0);

  const recorderRef = useRef<AudioRecorderManager | null>(null);
  const segmentsRef = useRef<TranslationSegment[]>([]);
  const flatListRef = useRef<FlatList<TranslationSegment>>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef = useRef(false);
  const measuredRttRef = useRef<number | null>(null);
  const sourceLangRef = useRef(FREE_SOURCE);
  const targetLangRef = useRef(FREE_TARGET);
  const summaryAbortRef = useRef<AbortController | null>(null);
  // Mirror of recorderState so the AppState listener reads the latest value
  // without re-subscribing on every state change.
  const recorderStateRef = useRef<RecorderState>('idle');
  // Mirror isPremium into a ref so callbacks (stopRecordingInternal, doStartRecording,
  // handleStart) can read the latest value without adding it to their deps arrays.
  const { isPremium } = usePremium();
  const isPremiumRef = useRef(isPremium);
  // Unmount guard — prevents setState calls from async fetches firing after navigation.
  const isMountedRef = useRef(true);

  useEffect(() => {
    recorderStateRef.current = recorderState;
  }, [recorderState]);

  useEffect(() => {
    isPremiumRef.current = isPremium;
  }, [isPremium]);

  useEffect(() => () => {
    isMountedRef.current = false;
    summaryAbortRef.current?.abort();
  }, []);

  // Subscribe to upload pending-count so the badge stays current.
  useEffect(() => subscribePendingCount(setPendingCount), []);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // Keep lang refs in sync with state so callbacks always read the latest value.
  useEffect(() => {
    sourceLangRef.current = isPremium ? sourceLang : FREE_SOURCE;
    targetLangRef.current = isPremium ? targetLang : FREE_TARGET;
  }, [sourceLang, targetLang, isPremium]);

  // Load persisted language preferences on mount.
  useEffect(() => {
    void (async () => {
      const src = await AsyncStorage.getItem(LANG_SOURCE_KEY);
      const tgt = await AsyncStorage.getItem(LANG_TARGET_KEY);
      if (src) setSourceLang(src);
      if (tgt) setTargetLang(tgt);
    })();
  }, []);

  // Load saved history once premium status is known; re-runs if the value flips
  // (e.g. user upgrades mid-session — unlikely but correct).
  useEffect(() => {
    if (!isPremium) return;
    void AsyncStorage.getItem(HISTORY_KEY).then((saved) => {
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as TranslationSegment[];
        if (Array.isArray(parsed) && parsed.length > 0) setSegments(parsed);
      } catch {}
    });
  }, [isPremium]);

  // --- timer helpers ---
  const stopCountdownTimer = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  }, []);

  const stopElapsedTimer = useCallback(() => {
    if (elapsedTimer.current) {
      clearInterval(elapsedTimer.current);
      elapsedTimer.current = null;
    }
  }, []);

  const startCountdownTimer = useCallback(
    (initial: number) => {
      stopCountdownTimer();
      setCountdown(initial);
      countdownTimer.current = setInterval(() => {
        // First chunk counts down from 15; every chunk afterwards from measured RTT.
        setCountdown((prev) => (prev <= 1 ? (measuredRttRef.current ?? 12) : prev - 1));
      }, 1000);
    },
    [stopCountdownTimer],
  );

  const startElapsedTimer = useCallback(() => {
    stopElapsedTimer();
    elapsedTimer.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [stopElapsedTimer]);

  const safeDeactivateKeepAwake = useCallback(() => {
    try {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    } catch {
      // no-op if it was never activated
    }
  }, []);

  // --- chunk -> upload queue -> segment ---
  const handleChunk = useCallback((wav: Uint8Array, chunkIndex: number) => {
    if (chunkIndex === 0) setIsFirstChunkPending(true);
    enqueueChunk(
      wav,
      chunkIndex,
      sourceLangRef.current,
      targetLangRef.current,
      (result, idx, sentAt) => {
        if (idx === 0) setIsFirstChunkPending(false);
        const rtt = Math.max(5, Math.round((Date.now() - sentAt) / 1000));
        measuredRttRef.current = rtt;
        if (!result) return; // 4xx non-retriable — silently skipped

        const hasContent = Boolean(result.arabic && result.translation);
        const segment: TranslationSegment = {
          id: `${idx}-${Date.now()}`,
          // Arabic is rendered EXACTLY as returned by the API — never modified.
          arabic: result.arabic,
          english: hasContent ? result.translation : '…',
          timestamp: idx,
          isScripture: hasContent ? result.isScripture : false,
        };

        if (isMountedRef.current) {
          setSegments((prev) => {
            const next = [...prev, segment];
            // Guarantee sequence order even if queue delivers out of order.
            next.sort((a, b) => a.timestamp - b.timestamp);
            return next;
          });
        }
      },
    );
  }, [setIsFirstChunkPending]);

  // --- recording controls ---
  const stopRecordingInternal = useCallback(() => {
    stopElapsedTimer();
    stopCountdownTimer();
    void recorderRef.current?.stop();
    setRecorderState('idle');
    safeDeactivateKeepAwake();
    setIsFirstChunkPending(false);
    if (isPremiumRef.current && segmentsRef.current.length > 0) {
      void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(segmentsRef.current));
    }
  }, [stopElapsedTimer, stopCountdownTimer, safeDeactivateKeepAwake, setIsFirstChunkPending]);

  // Core recording start — called after permissions are verified.
  const doStartRecording = useCallback(async () => {
    try {
      if (!recorderRef.current) {
        recorderRef.current = new AudioRecorderManager();
      }
      setSegments([]);
      setElapsed(0);
      if (isPremiumRef.current) {
        void AsyncStorage.removeItem(HISTORY_KEY);
      }
      await recorderRef.current.start(handleChunk);
      setRecorderState('recording');
      startElapsedTimer();
      startCountdownTimer(15);
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } catch {
      Alert.alert('Recording error', 'Could not start recording. Please try again.');
      stopRecordingInternal();
    }
  }, [handleChunk, startElapsedTimer, startCountdownTimer, stopRecordingInternal]);

  const handleStart = useCallback(async () => {
    if (IS_EXPO_GO) {
      Alert.alert('Native build required', EXPO_GO_MESSAGE);
      return;
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone access',
            message: 'Khutbah Companion needs your microphone to translate the khutbah live.',
            buttonPositive: 'Allow',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Microphone access needed',
            'Enable microphone access in Settings to use Live Translation.',
          );
          return;
        }
      } catch {
        // fall through and attempt to start anyway
      }
    }

    await doStartRecording();
  }, [doStartRecording]);

  const handlePause = useCallback(() => {
    recorderRef.current?.pause();
    setRecorderState('paused');
    stopElapsedTimer();
    stopCountdownTimer();
  }, [stopElapsedTimer, stopCountdownTimer]);

  const handleResume = useCallback(() => {
    recorderRef.current?.resume();
    setRecorderState('recording');
    startElapsedTimer();
    startCountdownTimer(12);
  }, [startElapsedTimer, startCountdownTimer]);

  // Fetch summary then open modal — never opens with incomplete data.
  const generateSummary = useCallback(async (text: string) => {
    summaryAbortRef.current?.abort();
    const controller = new AbortController();
    summaryAbortRef.current = controller;

    setSummaryGenerating(true);
    try {
      const res = await fetch(SUMMARISE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!isMountedRef.current) return;

      if (res.ok) {
        // The backend returns:
        //   { summary: { mainThemes, keyPoints, shortSummary, detailedSummary },
        //     actionPoints: [{ content, category }, ...] }
        // Unwrap here so SummaryModal always receives the flat SummarySchema shape.
        const raw = (await res.json()) as SummariseResponse;
        if (!isMountedRef.current) return;

        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('SUMMARY_RAW', JSON.stringify(raw));
        }

        const nested = raw.summary ?? {};
        const toStrArr = (v: unknown): string[] =>
          Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];

        const data: SummarySchema = {
          shortSummary: typeof nested.shortSummary === 'string' ? nested.shortSummary : undefined,
          detailedSummary: typeof nested.detailedSummary === 'string' ? nested.detailedSummary : undefined,
          mainThemes: toStrArr(nested.mainThemes),
          keyPoints: toStrArr(nested.keyPoints),
          actionPoints: Array.isArray(raw.actionPoints)
            ? raw.actionPoints
                .map((p) => (typeof p?.content === 'string' ? p.content : null))
                .filter((s): s is string => s !== null)
            : [],
        };

        setSummaryData(data);
        setShowSummary(true);

        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[SUMMARY] normalized:', JSON.stringify(data));
        }
      } else {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[SUMMARY] API error:', res.status);
        }
        Alert.alert(
          'Summary unavailable',
          'Could not generate a summary. Try again later.',
        );
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[SUMMARY] fetch failed:', err instanceof Error ? err.message : String(err));
      }
      Alert.alert('Summary unavailable', 'Network error. Please try again when reconnected.');
    } finally {
      if (isMountedRef.current) setSummaryGenerating(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
    stopRecordingInternal();
    if (!isPremiumRef.current || segmentsRef.current.length === 0) return;

    const text = segmentsRef.current
      .filter((s) => s.english && s.english !== '…')
      .map((s) => s.english)
      .join('\n\n');
    if (text.length <= 50) return;

    khutbahTextRef.current = text;
    setSummaryDate(new Date());
    setSummaryData(null);
    await generateSummary(text);
  }, [stopRecordingInternal, generateSummary]);

  // --- mount: pre-warm recorder + check disclaimer ---
  useEffect(() => {
    recorderRef.current = new AudioRecorderManager();

    void (async () => {
      try {
        const seen = await AsyncStorage.getItem(DISCLAIMER_KEY);
        if (!seen) setShowDisclaimer(true);
      } catch {
        // if storage fails, show the disclaimer to be safe
        setShowDisclaimer(true);
      }
    })();

    return () => {
      stopElapsedTimer();
      stopCountdownTimer();
      if (backgroundTimer.current) clearTimeout(backgroundTimer.current);
      void recorderRef.current?.stop();
      safeDeactivateKeepAwake();
    };
  }, [stopElapsedTimer, stopCountdownTimer, safeDeactivateKeepAwake]);

  // --- background tolerance: 30s grace before auto-stopping ---
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const isRecording = recorderStateRef.current === 'recording';

      if ((nextState === 'background' || nextState === 'inactive') && isRecording) {
        if (backgroundTimer.current) clearTimeout(backgroundTimer.current);
        backgroundTimer.current = setTimeout(() => {
          stopRecordingInternal();
          autoStoppedRef.current = true;
        }, BACKGROUND_GRACE_MS);
      } else if (nextState === 'active') {
        // Retry any pending uploads whenever the app returns to foreground.
        retryPendingChunks();

        if (backgroundTimer.current) {
          clearTimeout(backgroundTimer.current);
          backgroundTimer.current = null;
        }
        if (autoStoppedRef.current) {
          autoStoppedRef.current = false;
          // NOTE: expo-notifications is not installed, so we surface the
          // "Recording stopped" message as an in-app alert on return instead of
          // a true background local notification.
          Alert.alert(
            'Recording stopped',
            'Recording was stopped because the app stayed in the background for more than 30 seconds.',
          );
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [stopRecordingInternal]);

  // --- auto-scroll feed to newest segment ---
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // --- disclaimer flow ---
  const handleDisclaimerAdvance = useCallback(() => {
    if (currentCard < DISCLAIMER_CARDS.length - 1) {
      setCurrentCard((c) => c + 1);
    } else {
      void AsyncStorage.setItem(DISCLAIMER_KEY, 'true');
      setShowDisclaimer(false);
      setCurrentCard(0);
    }
  }, [currentCard]);

  // --- render helpers ---
  const renderSegment = useCallback(({ item }: { item: TranslationSegment }) => {
    // Placeholder: the chunk was processed but produced no intelligible text.
    if (item.english === '…') {
      return (
        <View style={{ paddingVertical: 10, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontStyle: 'italic',
              fontSize: 14,
              color: theme.textMuted,
            }}
          >
            …
          </Text>
        </View>
      );
    }

    if (item.isScripture) {
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: theme.primary,
            backgroundColor: theme.primaryContainer,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontFamily: 'NotoNaskhArabic_400Regular',
              fontSize: 18,
              color: '#C9A84C',
              lineHeight: 34,
              textAlign: 'right',
              writingDirection: 'rtl',
            }}
          >
            {/* Ornamental brackets are display-only; the Arabic string itself is unchanged. */}
            {'﴾ '}
            {item.arabic}
            {' ﴿'}
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontStyle: 'italic',
              fontSize: 16,
              color: theme.text,
              lineHeight: 24,
              marginTop: 6,
            }}
          >
            {item.english}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{
          paddingBottom: 12,
          marginBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Text
          style={{
            fontFamily: 'NotoNaskhArabic_400Regular',
            fontSize: 18,
            color: theme.textSecondary,
            lineHeight: 34,
            textAlign: 'right',
            writingDirection: 'rtl',
          }}
        >
          {item.arabic}
        </Text>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 16,
            color: theme.text,
            lineHeight: 24,
            marginTop: 6,
          }}
        >
          {item.english}
        </Text>
      </View>
    );
  }, []);

  const renderEmpty = useCallback(() => {
    if (recorderState === 'idle') {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="mic-outline" size={40} color={theme.primary} />
          </View>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: theme.textMuted,
              textAlign: 'center',
              marginTop: 16,
            }}
          >
            Tap the microphone to begin translating
          </Text>
        </View>
      );
    }

    // Recording (or paused) but no segments yet.
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <PulsingMic />
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 15,
            color: theme.textMuted,
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          Listening... first translation in ~23 seconds
        </Text>
      </View>
    );
  }, [recorderState]);

  const isRecording = recorderState === 'recording';
  const isPaused = recorderState === 'paused';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          backgroundColor: theme.background,
        }}
      >
        <View
          style={{
            height: 52,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel="Home"
          >
            <Ionicons name="home-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, alignItems: 'center' }}
            onPress={() => setShowLangPicker(true)}
            activeOpacity={0.7}
          >
            <Text
              style={{
                textAlign: 'center',
                fontFamily: 'Inter_600SemiBold',
                fontSize: 17,
                color: theme.text,
              }}
            >
              Khutbah Translation
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: theme.textMuted,
                }}
              >
                {LANG_LABEL[isPremium ? sourceLang : FREE_SOURCE] ?? sourceLang}
                {' → '}
                {LANG_LABEL[isPremium ? targetLang : FREE_TARGET] ?? targetLang}
              </Text>
              <Ionicons name="chevron-down" size={11} color={theme.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            {isRecording && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#EF4444',
                  marginRight: 4,
                }}
              />
            )}
            <TouchableOpacity
              onPress={() => setShowLangPicker(true)}
              style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Language settings"
            >
              <Ionicons name="globe-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Translation feed */}
      <FlatList
        ref={flatListRef}
        style={{ flex: 1, backgroundColor: theme.surface }}
        data={segments}
        keyExtractor={(item) => item.id}
        renderItem={renderSegment}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={renderEmpty}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps="handled"
      />

      {/* Recording controls */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.surface,
          paddingTop: 14,
          paddingBottom: insets.bottom + 14,
          paddingHorizontal: 16,
          alignItems: 'center',
        }}
      >
        {/* Pending-upload badge */}
        {pendingCount > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: theme.primaryContainer,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
              marginBottom: 10,
            }}
          >
            <Ionicons name="cloud-offline-outline" size={14} color={theme.primary} />
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: theme.primary }}>
              {pendingCount} translation{pendingCount !== 1 ? 's' : ''} pending
            </Text>
          </View>
        )}

        {summaryGenerating ? (
          // Inline loading state while summary is being fetched
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>
              Generating summary…
            </Text>
          </View>
        ) : recorderState === 'idle' ? (
          <>
            <TouchableOpacity
              onPress={() => void handleStart()}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel="Start recording"
            >
              <Ionicons name="mic" size={34} color="#FFFFFF" />
            </TouchableOpacity>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
                color: theme.textMuted,
                marginTop: 10,
              }}
            >
              Tap to Start
            </Text>
          </>
        ) : (
          <>
            {isRecording && (
              <>
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 24,
                    color: theme.text,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatElapsed(elapsed)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  {!isFirstChunkPending && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.primary,
                        marginRight: 6,
                      }}
                    />
                  )}
                  <Text
                    style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}
                  >
                    {isFirstChunkPending ? 'Translating…' : `Translation in ${countdown}s`}
                  </Text>
                </View>
              </>
            )}

            {isPaused && (
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                  color: theme.textMuted,
                  marginBottom: 4,
                }}
              >
                Paused
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <TouchableOpacity
                onPress={isPaused ? handleResume : handlePause}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 22,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.primary,
                  backgroundColor: theme.card,
                }}
              >
                <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color={theme.primary} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: theme.primary }}>
                  {isPaused ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleStop()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 22,
                  borderRadius: 12,
                  backgroundColor: '#DC2626',
                }}
              >
                <Ionicons name="stop" size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFFFFF' }}>
                  Stop
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Disclaimer modal */}
      <Modal visible={showDisclaimer} transparent animationType="fade" onRequestClose={() => {}}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: theme.card,
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: theme.primaryContainer,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name={DISCLAIMER_CARDS[currentCard].icon} size={36} color={theme.primary} />
            </View>

            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 20,
                color: theme.text,
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              {DISCLAIMER_CARDS[currentCard].title}
            </Text>

            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                color: theme.textMuted,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {DISCLAIMER_CARDS[currentCard].body}
            </Text>

            {/* Dot indicators */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 20 }}>
              {DISCLAIMER_CARDS.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: i === currentCard ? theme.primary : theme.border,
                  }}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleDisclaimerAdvance}
              style={{
                width: '100%',
                backgroundColor: theme.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#FFFFFF' }}>
                {currentCard < DISCLAIMER_CARDS.length - 1 ? 'Continue' : 'I Understand, Start'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Language picker bottom sheet ─────────────────────────── */}
      <Modal
        visible={showLangPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 16,
              maxHeight: '75%',
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
            </View>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <Text style={{ flex: 1, fontFamily: 'Inter_700Bold', fontSize: 18, color: theme.text }}>
                Translation Languages
              </Text>
              <TouchableOpacity onPress={() => setShowLangPicker(false)} hitSlop={12} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Source language */}
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 12,
                  color: theme.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 8,
                }}
              >
                Source Language
              </Text>
              {SOURCE_LANGUAGES.map((lang) => {
                const locked = !isPremium && lang.code !== FREE_SOURCE;
                const selected = (isPremium ? sourceLang : FREE_SOURCE) === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => {
                      if (locked) return;
                      setSourceLang(lang.code);
                      void AsyncStorage.setItem(LANG_SOURCE_KEY, lang.code);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      opacity: locked ? 0.45 : 1,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                        fontSize: 15,
                        color: selected ? theme.primary : theme.text,
                      }}
                    >
                      {lang.label}
                    </Text>
                    {locked && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
                        <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: theme.textMuted }}>
                          Premium
                        </Text>
                      </View>
                    )}
                    {selected && !locked && (
                      <Ionicons name="checkmark" size={18} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Target language */}
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 12,
                  color: theme.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 8,
                }}
              >
                Target Language
              </Text>
              {TARGET_LANGUAGES.map((lang) => {
                const locked = !isPremium && lang.code !== FREE_TARGET;
                const selected = (isPremium ? targetLang : FREE_TARGET) === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => {
                      if (locked) return;
                      setTargetLang(lang.code);
                      void AsyncStorage.setItem(LANG_TARGET_KEY, lang.code);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                      opacity: locked ? 0.45 : 1,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_400Regular',
                        fontSize: 15,
                        color: selected ? theme.primary : theme.text,
                      }}
                    >
                      {lang.label}
                    </Text>
                    {locked && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
                        <Ionicons name="lock-closed" size={12} color={theme.textMuted} />
                        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: theme.textMuted }}>
                          Premium
                        </Text>
                      </View>
                    )}
                    {selected && !locked && (
                      <Ionicons name="checkmark" size={18} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Khutbah Summary modal — only opens after data is fully loaded ── */}
      <SummaryModal
        visible={showSummary}
        onDismiss={() => setShowSummary(false)}
        summaryData={summaryData}
        onRetry={() => void generateSummary(khutbahTextRef.current)}
        recordingDate={summaryDate}
      />
    </View>
  );
}

export default function TranslationScreen() {
  return (
    <TranslationErrorBoundary>
      <TranslationScreenContent />
    </TranslationErrorBoundary>
  );
}
