// AR camera Qibla deferred to v1.1 — using magnetometer compass for launch
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredLocation } from '../src/lib/location';
import { calculateQiblaDirection, getCardinalDirection } from '../src/lib/qibla';
import { useTheme } from '../src/lib/theme-context';

const ALIGN_THRESHOLD = 5;
// Sin/cos EMA smoothing factor (0.15 = ~6-sample lag, responsive but stable)
const ALPHA = 0.15;
// Throttle UI to ~16 Hz
const THROTTLE_MS = 60;

// Universal compass convention, not a brand colour: the north half of a
// compass needle is red on every physical compass.
const NORTH_RED = '#DC2626';

type LocState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; lat: number; lng: number };

// Signed delta: + means Qibla is to your right, range -180..180
function signedDelta(target: number, heading: number): number {
  return ((target - heading + 540) % 360) - 180;
}

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [locState, setLocState] = useState<LocState>({ status: 'loading' });
  const [heading, setHeading] = useState<number | null>(null);
  const [lowAccuracy, setLowAccuracy] = useState(false);

  // Sin/cos EMA state — heading smoothing with no unbounded accumulator.
  // svxRef = sin component EMA, cvyRef = cos component EMA. Recombined via
  // atan2 → always [0, 360]. Handles the 359°→0° wrap without a discontinuity.
  const svxRef = useRef<number | null>(null);
  const cvyRef = useRef<number | null>(null);

  const lastUpdateTime = useRef(0);
  const wasAligned = useRef(false);

  // Rose rotation accumulator, in degrees. Grows without bound by shortest-arc
  // steps; the interpolation below extrapolates linearly so it never clamps.
  const roseAnim = useRef(new Animated.Value(0)).current;
  const lastRoseVal = useRef(0);

  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const mountedRef = useRef(true);

  // Load cached location — no permission request. Same helper the prayer times
  // and home screens use, so we never prompt twice for the same coordinates.
  useEffect(() => {
    void (async () => {
      const cached = await getStoredLocation();
      if (!mountedRef.current) return;
      if (cached) {
        setLocState({ status: 'ready', lat: cached.latitude, lng: cached.longitude });
      } else {
        setLocState({ status: 'unavailable' });
      }
    })();
  }, []);

  const applyHeading = useCallback(
    (raw: number) => {
      const rawRad = (raw * Math.PI) / 180;
      if (svxRef.current === null || cvyRef.current === null) {
        svxRef.current = Math.sin(rawRad);
        cvyRef.current = Math.cos(rawRad);
      } else {
        svxRef.current += ALPHA * (Math.sin(rawRad) - svxRef.current);
        cvyRef.current += ALPHA * (Math.cos(rawRad) - cvyRef.current);
      }
      const smoothed =
        ((Math.atan2(svxRef.current, cvyRef.current) * 180) / Math.PI + 360) % 360;

      // Rose counter-rotates so N keeps pointing at true north.
      const target = -smoothed;
      let diff = target - (lastRoseVal.current % 360);
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      lastRoseVal.current += diff;
      Animated.timing(roseAnim, {
        toValue: lastRoseVal.current,
        duration: 80,
        useNativeDriver: true,
      }).start();

      const now = Date.now();
      if (now - lastUpdateTime.current < THROTTLE_MS) return;
      lastUpdateTime.current = now;
      setHeading(smoothed);
    },
    [roseAnim],
  );

  // OS sensor-fusion heading: tilt-compensated, and trueHeading already has
  // magnetic declination applied — which is what the Qibla bearing is measured
  // from. A raw magnetometer reading would be off by the local declination.
  const subscribeHeading = useCallback(async () => {
    try {
      headingSubRef.current = await Location.watchHeadingAsync((h) => {
        if (!mountedRef.current) return;
        setLowAccuracy(h.accuracy < 2);
        applyHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
      });
    } catch {
      // Location permission not granted; heading stays null.
    }
  }, [applyHeading]);

  useEffect(() => {
    mountedRef.current = true;
    void subscribeHeading();
    return () => {
      mountedRef.current = false;
      headingSubRef.current?.remove();
      headingSubRef.current = null;
    };
  }, [subscribeHeading]);

  // Drop the smoothing state and resubscribe, so a stale magnetometer bias is
  // not carried into the new readings.
  const handleRecalibrate = useCallback(() => {
    headingSubRef.current?.remove();
    headingSubRef.current = null;
    svxRef.current = null;
    cvyRef.current = null;
    lastUpdateTime.current = 0;
    setHeading(null);
    setLowAccuracy(false);
    void subscribeHeading();
  }, [subscribeHeading]);

  const qiblaResult =
    locState.status === 'ready' ? calculateQiblaDirection(locState.lat, locState.lng) : null;
  const qiblaDeg = qiblaResult?.direction ?? 0;
  const distanceKm = qiblaResult ? Math.round(qiblaResult.distance) : 0;
  const cardinal = qiblaResult ? getCardinalDirection(qiblaDeg) : '';

  const delta = heading !== null && qiblaResult !== null ? signedDelta(qiblaDeg, heading) : null;
  const isAligned = delta !== null && Math.abs(delta) < ALIGN_THRESHOLD;

  useEffect(() => {
    if (isAligned && !wasAligned.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasAligned.current = isAligned;
  }, [isAligned]);

  // inputRange spans one turn; the default 'extend' extrapolation carries the
  // mapping linearly past it, so the accumulator can grow forever safely.
  const roseRotation = roseAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  // Kaaba marker rides on the rose at the Qibla bearing, so it lands under the
  // fixed needle exactly when the phone points at Makkah.
  const qiblaRad = (qiblaDeg * Math.PI) / 180;
  const kaabaX = 140 + Math.sin(qiblaRad) * 100;
  const kaabaY = 140 - Math.cos(qiblaRad) * 100;

  const headingLabel = heading === null ? '—' : String(Math.round(heading) % 360).padStart(3, '0');
  const headingCardinal = heading === null ? '' : getCardinalDirection(heading);

  return (
    <>
      <Stack.Screen options={{ title: 'Qibla Compass' }} />
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center' }}>
        {locState.status === 'loading' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>
              Loading location…
            </Text>
          </View>
        ) : locState.status === 'unavailable' ? (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}
          >
            <Ionicons name="location-outline" size={56} color={theme.textMuted} />
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                color: theme.textSecondary,
                textAlign: 'center',
              }}
            >
              Location unavailable
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.textMuted,
                textAlign: 'center',
              }}
            >
              Open the Prayer Times screen first so your location can be saved, then return here.
            </Text>
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View
              style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}
            >
              {/* Rotating compass rose */}
              <Animated.View
                style={{ position: 'absolute', transform: [{ rotate: roseRotation }] }}
              >
                <Svg width={280} height={280} viewBox="0 0 280 280">
                  <Circle
                    cx="140"
                    cy="140"
                    r="130"
                    fill={theme.surface}
                    stroke={theme.border}
                    strokeWidth="2"
                  />
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
                        stroke={isMajor ? theme.textSecondary : theme.textMuted}
                        strokeWidth={isMajor ? 2 : 1}
                      />
                    );
                  })}
                  <SvgText
                    x="140"
                    y="24"
                    textAnchor="middle"
                    fontFamily="Inter_700Bold"
                    fontSize="16"
                    fill={NORTH_RED}
                  >
                    N
                  </SvgText>
                  <SvgText
                    x="258"
                    y="145"
                    textAnchor="middle"
                    fontFamily="Inter_700Bold"
                    fontSize="14"
                    fill={theme.textMuted}
                  >
                    E
                  </SvgText>
                  <SvgText
                    x="140"
                    y="268"
                    textAnchor="middle"
                    fontFamily="Inter_700Bold"
                    fontSize="14"
                    fill={theme.textMuted}
                  >
                    S
                  </SvgText>
                  <SvgText
                    x="22"
                    y="145"
                    textAnchor="middle"
                    fontFamily="Inter_700Bold"
                    fontSize="14"
                    fill={theme.textMuted}
                  >
                    W
                  </SvgText>
                  {/* Kaaba marker at the Qibla bearing, rotating with the rose */}
                  {qiblaResult && (
                    <>
                      <Circle
                        cx={kaabaX}
                        cy={kaabaY}
                        r="15"
                        fill={theme.primaryContainer}
                        stroke={theme.primary}
                        strokeWidth={isAligned ? 3 : 1.5}
                      />
                      <SvgText
                        x={kaabaX}
                        y={kaabaY + 6}
                        textAnchor="middle"
                        fontSize="16"
                      >
                        🕋
                      </SvgText>
                    </>
                  )}
                </Svg>
              </Animated.View>

              {/* Fixed needle — stays put while the rose turns beneath it. */}
              <Svg
                width={280}
                height={280}
                viewBox="0 0 280 280"
                style={{ position: 'absolute' }}
                pointerEvents="none"
              >
                <Polygon points="140,42 148,140 132,140" fill={NORTH_RED} />
                <Polygon points="140,238 148,140 132,140" fill={theme.border} />
                <Circle
                  cx="140"
                  cy="140"
                  r="6"
                  fill={theme.surface}
                  stroke={theme.border}
                  strokeWidth="2"
                />
              </Svg>
            </View>

            {/* Info panel */}
            <View style={{ marginTop: 28, alignItems: 'center', gap: 10 }}>
              {/* Current device heading */}
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'Inter_700Bold',
                    fontSize: 40,
                    color: theme.text,
                    lineHeight: 46,
                  }}
                >
                  {headingLabel}°{headingCardinal ? ` ${headingCardinal}` : ''}
                </Text>
                <Text
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: theme.textMuted }}
                >
                  Current heading
                </Text>
              </View>

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
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 15,
                        color: theme.primary,
                      }}
                    >
                      Qibla: {Math.round(qiblaDeg)}° {cardinal}
                    </Text>
                  </View>
                  <Text
                    style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: theme.textMuted }}
                  >
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
                Hold phone flat and turn until the Kaaba marker sits under the needle
              </Text>

              {/* Calibration notice */}
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

              {lowAccuracy && (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: theme.textMuted,
                    textAlign: 'center',
                    maxWidth: 280,
                  }}
                >
                  Low sensor accuracy detected
                </Text>
              )}

              <TouchableOpacity
                onPress={handleRecalibrate}
                accessibilityRole="button"
                accessibilityLabel="Recalibrate compass"
                style={{
                  borderRadius: 10,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: theme.primary,
                  marginTop: 4,
                }}
              >
                <Text
                  style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.primary }}
                >
                  Recalibrate
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </>
  );
}
