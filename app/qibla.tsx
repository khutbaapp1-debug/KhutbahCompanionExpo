import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredLocation } from '../src/lib/location';
import { calculateQiblaDirection, getCardinalDirection } from '../src/lib/qibla';
import { useTheme } from '../src/lib/theme-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FOV = 60;
const ALIGN_THRESHOLD = 3;
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

type LocState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; lat: number; lng: number };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Shortest signed angular difference, keeps result in -180..180
function angleDiff(target: number, current: number): number {
  let d = target - current;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// ─── Compass fallback (shown when camera permission is denied) ────────────────

interface CompassProps {
  qiblaDeg: number;
  qiblaResult: { direction: number; distance: number } | null;
  distanceKm: number;
  cardinal: string;
  headingAnim: Animated.Value;
  theme: ReturnType<typeof useTheme>['theme'];
  insets: { bottom: number };
  cameraPermDenied: boolean;
}

function CompassFallback({
  qiblaDeg,
  qiblaResult,
  distanceKm,
  cardinal,
  headingAnim,
  theme,
  insets,
  cameraPermDenied,
}: CompassProps) {
  const roseRotation = headingAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['360deg', '0deg', '-360deg'],
  });
  const qiblaRotation = headingAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: [`${360 + qiblaDeg}deg`, `${qiblaDeg}deg`, `${-360 + qiblaDeg}deg`],
  });

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: insets.bottom + 20,
      }}
    >
      {/* Compass rose + Qibla needle */}
      <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', transform: [{ rotate: roseRotation }] }}>
          <Svg width={280} height={280} viewBox="0 0 280 280">
            <Circle cx="140" cy="140" r="130" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2" />
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const isMajor = i % 9 === 0;
              const r1 = 122;
              const r2 = isMajor ? 108 : 116;
              return (
                <Line
                  key={i}
                  x1={140 + Math.sin(angle) * r1}
                  y1={140 - Math.cos(angle) * r1}
                  x2={140 + Math.sin(angle) * r2}
                  y2={140 - Math.cos(angle) * r2}
                  stroke={isMajor ? '#9CA3AF' : '#D1D5DB'}
                  strokeWidth={isMajor ? 2 : 1}
                />
              );
            })}
            <SvgText x="140" y="24" textAnchor="middle" fontFamily="Inter_700Bold" fontSize="16" fill="#DC2626">N</SvgText>
            <SvgText x="258" y="145" textAnchor="middle" fontFamily="Inter_700Bold" fontSize="14" fill="#6B7280">E</SvgText>
            <SvgText x="140" y="268" textAnchor="middle" fontFamily="Inter_700Bold" fontSize="14" fill="#6B7280">S</SvgText>
            <SvgText x="22" y="145" textAnchor="middle" fontFamily="Inter_700Bold" fontSize="14" fill="#6B7280">W</SvgText>
            <Polygon points="140,45 146,140 134,140" fill="#DC2626" />
            <Polygon points="140,235 146,140 134,140" fill="#D1D5DB" />
            <Circle cx="140" cy="140" r="6" fill="white" stroke="#D1D5DB" strokeWidth="2" />
          </Svg>
        </Animated.View>

        {qiblaResult && (
          <Animated.View style={{ position: 'absolute', transform: [{ rotate: qiblaRotation }] }}>
            <Svg width={280} height={280} viewBox="0 0 280 280">
              <Polygon points="140,38 147,140 133,140" fill={theme.primary} opacity="0.9" />
              <SvgText x="140" y="32" textAnchor="middle" fontSize="12" fill={theme.primary}>🕋</SvgText>
            </Svg>
          </Animated.View>
        )}
      </View>

      {/* Info panel */}
      <View style={{ marginTop: 28, alignItems: 'center', gap: 10 }}>
        {qiblaResult ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: theme.primaryContainer,
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="compass-outline" size={18} color={theme.primary} />
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: theme.primary }}>
                {Math.round(qiblaDeg)}° {cardinal} — Qibla direction
              </Text>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textMuted }}>
              {distanceKm.toLocaleString()} km to Makkah
            </Text>
          </>
        ) : (
          <ActivityIndicator size="small" color={theme.primary} />
        )}

        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 11,
            color: theme.textMuted,
            textAlign: 'center',
            maxWidth: 260,
          }}
        >
          Hold phone flat and face the green arrow toward Makkah
        </Text>

        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: theme.textMuted,
            textAlign: 'center',
            maxWidth: 280,
            marginTop: 4,
            fontStyle: 'italic',
          }}
        >
          Move phone in a figure-8 pattern if direction seems inaccurate
        </Text>

        {cameraPermDenied && (
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 12,
              color: theme.textMuted,
              textAlign: 'center',
              maxWidth: 280,
              marginTop: 12,
            }}
          >
            Camera permission denied. Enable it in Settings to use AR mode.
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [locState, setLocState] = useState<LocState>({ status: 'loading' });
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [heading, setHeading] = useState<number | null>(null);
  const [lowAccuracy, setLowAccuracy] = useState(false);

  const smoothed = useRef<number | null>(null);
  const headingAccum = useRef(0);
  const lastUpdateTime = useRef(0);
  const wasAligned = useRef(false);
  const headingAnim = useRef(new Animated.Value(0)).current;

  // Load cached location — no permission request
  useEffect(() => {
    void (async () => {
      const cached = await getStoredLocation();
      if (cached) {
        setLocState({ status: 'ready', lat: cached.latitude, lng: cached.longitude });
      } else {
        setLocState({ status: 'unavailable' });
      }
    })();
  }, []);

  // Request camera permission lazily on screen open
  useEffect(() => {
    void requestCameraPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[QiblaScreen] camera permission status:', cameraPermission?.status, '| granted:', cameraPermission?.granted);
    }
  }, [cameraPermission]);

  // OS sensor-fusion heading — tilt-compensated, declination already applied
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let mounted = true;
    (async () => {
      try {
        sub = await Location.watchHeadingAsync((h) => {
          if (!mounted) return;
          const raw = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setLowAccuracy(h.accuracy < 2);

          // Run the low-pass filter on EVERY sensor reading so all data points
          // contribute to noise suppression, even those we won't render.
          // angleDiff() returns the shortest-arc delta (-180..180), so the
          // smoothed value always moves via the short path and never sweeps
          // through the 359°→0° discontinuity (e.g. smoothing 355°→5° takes
          // the 10° arc, not the 350° arc in the wrong direction).
          if (smoothed.current === null) {
            smoothed.current = raw;
          } else {
            const d = angleDiff(raw, smoothed.current);
            smoothed.current = (smoothed.current + d * 0.15 + 360) % 360;
          }

          // Throttle UI updates to ~16 Hz (60 ms). watchHeadingAsync fires at
          // 30–100 Hz on Android; without throttling, dozens of Animated.timing
          // calls stack up in flight and fight each other, causing the shudder.
          const now = Date.now();
          if (now - lastUpdateTime.current < 60) return;
          lastUpdateTime.current = now;

          // Accumulate unbounded so the Animated.Value never jumps at the
          // 359°→0° crossing — CompassFallback's interpolate handles ± values.
          const animDelta = angleDiff(smoothed.current, headingAccum.current % 360);
          headingAccum.current += animDelta;
          setHeading(smoothed.current);
          Animated.timing(headingAnim, {
            toValue: headingAccum.current,
            duration: 80,
            useNativeDriver: true,
          }).start();
        });
      } catch {
        // Location permission not granted; heading stays null
      }
    })();
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [headingAnim]);

  // Derived Qibla values
  const qiblaResult =
    locState.status === 'ready'
      ? calculateQiblaDirection(locState.lat, locState.lng)
      : null;
  const qiblaDeg = qiblaResult?.direction ?? 0;
  const distanceKm =
    locState.status === 'ready'
      ? Math.round(haversineKm(locState.lat, locState.lng, KAABA_LAT, KAABA_LNG))
      : 0;
  const cardinal = qiblaResult ? getCardinalDirection(qiblaDeg) : '';

  // Signed delta between where the phone faces and the Qibla bearing
  const delta =
    heading !== null && qiblaResult !== null ? angleDiff(qiblaDeg, heading) : null;
  const aligned = delta !== null && Math.abs(delta) < ALIGN_THRESHOLD;
  const inView = delta !== null && Math.abs(delta) < FOV / 2;

  // Haptic pulse on entering alignment
  if (aligned && !wasAligned.current) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    wasAligned.current = true;
  } else if (!aligned) {
    wasAligned.current = false;
  }

  // Horizontal pixel offset for the Kaaba marker (centred on screen when delta = 0)
  const markerLeft =
    inView && delta !== null
      ? SCREEN_W / 2 + (delta / (FOV / 2)) * (SCREEN_W / 2) - 32
      : 0;

  const permPending = cameraPermission === null || cameraPermission.status === 'undetermined';
  const useAR = cameraPermission?.granted === true;
  const cameraPermDenied = cameraPermission !== null && !cameraPermission.granted && !permPending;

  return (
    <>
      <Stack.Screen options={{ title: 'Qibla Finder' }} />
      <View style={{ flex: 1, backgroundColor: useAR ? 'black' : theme.background }}>

        {locState.status === 'loading' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>
              Loading location…
            </Text>
          </View>

        ) : locState.status === 'unavailable' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
            <Ionicons name="location-outline" size={56} color={theme.textMuted} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: theme.textSecondary, textAlign: 'center' }}>
              Location unavailable
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted, textAlign: 'center' }}>
              Open the Prayer Times screen first so your location can be saved, then return here.
            </Text>
          </View>

        ) : permPending ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>
              Requesting camera permission…
            </Text>
          </View>

        ) : useAR ? (
          // ── AR view ───────────────────────────────────────────────────────────
          <View style={{ flex: 1 }}>
            <CameraView style={StyleSheet.absoluteFill} facing="back" />

            {/* Vertical centre reticle — fixed to screen centre */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: SCREEN_W / 2 - 1,
                width: 2,
                backgroundColor: aligned ? '#22C55E' : 'rgba(255,255,255,0.4)',
              }}
            />

            {/* Kaaba marker — moves horizontally as user rotates */}
            {inView && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: SCREEN_H * 0.28,
                  left: markerLeft,
                  alignItems: 'center',
                  width: 64,
                }}
              >
                <Text style={{ fontSize: 48 }}>🕋</Text>
                <View
                  style={{
                    width: 2,
                    height: 120,
                    backgroundColor: aligned ? '#22C55E' : theme.primary,
                  }}
                />
              </View>
            )}

            {/* Edge chevrons when Qibla is outside camera FOV */}
            {!inView && delta !== null && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: SCREEN_H * 0.35,
                  left: 0,
                  right: 0,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingHorizontal: 24,
                }}
              >
                {delta < 0 ? (
                  <Text style={{ color: 'white', fontSize: 44, lineHeight: 52 }}>‹‹</Text>
                ) : <View />}
                {delta > 0 ? (
                  <Text style={{ color: 'white', fontSize: 44, lineHeight: 52 }}>››</Text>
                ) : <View />}
              </View>
            )}

            {/* Status pill + calibration hint */}
            <View
              style={{
                position: 'absolute',
                bottom: insets.bottom + 20,
                left: 0,
                right: 0,
                alignItems: 'center',
                paddingHorizontal: 32,
              }}
            >
              <View
                style={{
                  borderRadius: 24,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  backgroundColor: aligned ? '#16A34A' : 'rgba(0,0,0,0.6)',
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: 'white' }}>
                  {delta === null
                    ? 'Getting location…'
                    : aligned
                      ? 'Facing the Qibla'
                      : `Turn ${delta > 0 ? 'right' : 'left'} ${Math.abs(Math.round(delta))}°`}
                </Text>
              </View>

              {lowAccuracy && (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.85)',
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  Low compass accuracy — move phone in a figure-8 to calibrate
                </Text>
              )}

              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                  marginTop: 8,
                  fontStyle: 'italic',
                }}
              >
                Move phone in a figure-8 pattern if direction seems inaccurate
              </Text>
            </View>
          </View>

        ) : (
          // ── Compass fallback (camera permission denied) ───────────────────────
          <CompassFallback
            qiblaDeg={qiblaDeg}
            qiblaResult={qiblaResult}
            distanceKm={distanceKm}
            cardinal={cardinal}
            headingAnim={headingAnim}
            theme={theme}
            insets={insets}
            cameraPermDenied={cameraPermDenied}
          />
        )}

      </View>
    </>
  );
}
