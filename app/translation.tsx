import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  type AppStateStatus,
  Easing,
  FlatList,
  Modal,
  PermissionsAndroid,
  Platform,
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
import { uploadChunk } from '../src/lib/translation-upload';

const DISCLAIMER_KEY = 'translation-disclaimer-v1';
const BACKGROUND_GRACE_MS = 30_000;
const KEEP_AWAKE_TAG = 'translation';

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
        backgroundColor: '#F0FDFA',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}
    >
      <Ionicons name="mic" size={40} color="#0F766E" />
    </Animated.View>
  );
}

export default function TranslationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [segments, setSegments] = useState<TranslationSegment[]>([]);
  const [countdown, setCountdown] = useState(15);
  const [elapsed, setElapsed] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);

  const recorderRef = useRef<AudioRecorderManager | null>(null);
  const flatListRef = useRef<FlatList<TranslationSegment>>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const backgroundTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStoppedRef = useRef(false);
  // Mirror of recorderState so the AppState listener reads the latest value
  // without re-subscribing on every state change.
  const recorderStateRef = useRef<RecorderState>('idle');

  useEffect(() => {
    recorderStateRef.current = recorderState;
  }, [recorderState]);

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
        // First chunk counts down from 15; every chunk afterwards from 12.
        setCountdown((prev) => (prev <= 1 ? 12 : prev - 1));
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

  // --- chunk -> upload -> segment ---
  const handleChunk = useCallback((wav: Uint8Array, sequenceNumber: number) => {
    // Fire-and-forget: recording continues while the upload resolves.
    void uploadChunk(wav, sequenceNumber).then((result) => {
      if (!result) return; // 429 / 500 / network — silently skipped

      const hasContent = Boolean(result.arabic && result.translation);
      const segment: TranslationSegment = {
        id: `${sequenceNumber}-${Date.now()}`,
        // Arabic is rendered EXACTLY as returned by the API — never modified.
        arabic: result.arabic,
        english: hasContent ? result.translation : '…',
        timestamp: sequenceNumber,
        isScripture: hasContent ? result.isScripture : false,
      };

      setSegments((prev) => {
        const next = [...prev, segment];
        // Keep chunk order even if uploads resolve out of order.
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
    });
  }, []);

  // --- recording controls ---
  const stopRecordingInternal = useCallback(() => {
    stopElapsedTimer();
    stopCountdownTimer();
    void recorderRef.current?.stop();
    setRecorderState('idle');
    safeDeactivateKeepAwake();
  }, [stopElapsedTimer, stopCountdownTimer, safeDeactivateKeepAwake]);

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

    try {
      if (!recorderRef.current) {
        recorderRef.current = new AudioRecorderManager();
      }
      setSegments([]);
      setElapsed(0);
      await recorderRef.current.start(handleChunk);
      setRecorderState('recording');
      startElapsedTimer();
      startCountdownTimer(15); // first chunk arrives after ~15s
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } catch {
      Alert.alert('Recording error', 'Could not start recording. Please try again.');
      stopRecordingInternal();
    }
  }, [handleChunk, startElapsedTimer, startCountdownTimer, stopRecordingInternal]);

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

  const handleStop = useCallback(() => {
    stopRecordingInternal();
  }, [stopRecordingInternal]);

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
              color: '#9CA3AF',
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
            borderLeftColor: '#0F766E',
            backgroundColor: '#F0FDFA',
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
              color: '#111827',
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
          borderBottomColor: '#F3F4F6',
        }}
      >
        <Text
          style={{
            fontFamily: 'NotoNaskhArabic_400Regular',
            fontSize: 18,
            color: '#374151',
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
            color: '#111827',
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
              backgroundColor: '#F0FDFA',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="mic-outline" size={40} color="#0F766E" />
          </View>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: '#9CA3AF',
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
            color: '#6B7280',
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
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
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
            <Ionicons name="home-outline" size={24} color="#374151" />
          </TouchableOpacity>

          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              fontFamily: 'Inter_600SemiBold',
              fontSize: 18,
              color: '#111827',
            }}
          >
            Khutbah Translation
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            {isRecording && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#EF4444',
                  marginRight: 6,
                }}
              />
            )}
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Translation feed */}
      <FlatList
        ref={flatListRef}
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
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
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          paddingTop: 14,
          paddingBottom: insets.bottom + 14,
          paddingHorizontal: 16,
          alignItems: 'center',
        }}
      >
        {recorderState === 'idle' ? (
          <>
            <TouchableOpacity
              onPress={() => void handleStart()}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: '#0F766E',
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
                color: '#6B7280',
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
                    color: '#111827',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatElapsed(elapsed)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#0F766E',
                      marginRight: 6,
                    }}
                  />
                  <Text
                    style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' }}
                  >
                    Translation in {countdown}s
                  </Text>
                </View>
              </>
            )}

            {isPaused && (
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                  color: '#9CA3AF',
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
                  borderColor: '#0F766E',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color="#0F766E" />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#0F766E' }}>
                  {isPaused ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStop}
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
              backgroundColor: '#FFFFFF',
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
                backgroundColor: '#F0FDFA',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name={DISCLAIMER_CARDS[currentCard].icon} size={36} color="#0F766E" />
            </View>

            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 20,
                color: '#111827',
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
                color: '#6B7280',
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
                    backgroundColor: i === currentCard ? '#0F766E' : '#D1D5DB',
                  }}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleDisclaimerAdvance}
              style={{
                width: '100%',
                backgroundColor: '#0F766E',
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
    </View>
  );
}
