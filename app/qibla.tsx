import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
import Svg, { Circle, Defs, Line, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredLocation } from '../src/lib/location';
import { calculateQiblaDirection, getCardinalDirection } from '../src/lib/qibla';
import { useTheme } from '../src/lib/theme-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ALIGN_THRESHOLD = 5;
// How far left/right (px) the pin can travel from centre
const MARKER_RANGE = SCREEN_W * 0.35;
// Sin/cos EMA smoothing factor (0.15 = ~6-sample lag, responsive but stable)
const ALPHA = 0.15;
// Throttle UI to ~16 Hz
const THROTTLE_MS = 60;

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

// App teal palette
const TEAL = '#0F766E';
const TEAL_LIGHT = '#14B8A6';
const TEAL_BEAM = '#22D3C5';
const GOLD = '#E2B73B';

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
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// Signed delta: + means Qibla is to your right, range -180..180
function signedDelta(target: number, heading: number): number {
  return ((target - heading + 540) % 360) - 180;
}

// ─── Kaaba pin (gradient orb + teardrop + pulsing rings) ─────────────────────

function KaabaPin({ locked, pulseAnim }: { locked: boolean; pulseAnim: Animated.Value }) {
  const ring1Scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.7] });
  const ring1Opacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

  return (
    <View style={styles.pinContainer} pointerEvents="none">
      {/* Pulsing halo ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: locked ? 'rgba(255,255,255,0.85)' : 'rgba(20,184,166,0.55)',
            transform: [{ scale: ring1Scale }],
            opacity: ring1Opacity,
          },
        ]}
      />

      {/* Teardrop tail */}
      <View
        style={[
          styles.pinTail,
          { backgroundColor: locked ? TEAL_LIGHT : TEAL },
        ]}
      />

      {/* Orb badge */}
      <LinearGradient
        colors={locked ? [TEAL_LIGHT, TEAL] : [TEAL, '#0d5c56']}
        style={[
          styles.pinOrb,
          {
            borderColor: locked ? 'rgba(255,255,255,0.9)' : 'rgba(20,184,166,0.55)',
          },
        ]}
      >
        {/* Mini Kaaba icon */}
        <View style={styles.kaabaBody}>
          <View style={styles.kaabaKiswah} />
          <View style={styles.kaabaDoor} />
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Compass fallback (shown when camera permission denied) ───────────────────

function CompassFallback({
  qiblaDeg,
  qiblaResult,
  distanceKm,
  cardinal,
  smoothedHeadingRef,
  theme,
  insets,
  cameraPermDenied,
}: {
  qiblaDeg: number;
  qiblaResult: { direction: number; distance: number } | null;
  distanceKm: number;
  cardinal: string;
  smoothedHeadingRef: { current: number | null };
  theme: ReturnType<typeof useTheme>['theme'];
  insets: { bottom: number };
  cameraPermDenied: boolean;
}) {
  // Use a bounded Animated.Value for the compass rose rotation.
  // We animate to -(smoothed heading) so the rose counter-rotates as the phone turns.
  // Value stays in [-360, 360] — no unbounded accumulator.
  const roseAnim = useRef(new Animated.Value(0)).current;
  const lastRoseVal = useRef(0);

  // We poll at ~16 Hz via an interval so the fallback view keeps updating
  // even though the parent throttles setState.
  useEffect(() => {
    const id = setInterval(() => {
      const h = smoothedHeadingRef.current;
      if (h === null) return;
      // Target rotation for rose: -heading (rose counter-rotates as phone turns)
      // Use shortest-arc from the last animated value
      const target = -h;
      let diff = target - (lastRoseVal.current % 360);
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      const next = lastRoseVal.current + diff;
      lastRoseVal.current = next;
      Animated.timing(roseAnim, { toValue: next, duration: 80, useNativeDriver: true }).start();
    }, THROTTLE_MS);
    return () => clearInterval(id);
  }, [roseAnim, smoothedHeadingRef]);

  const roseRotation = roseAnim.interpolate({
    inputRange: [-720, -360, 0, 360, 720],
    outputRange: ['-720deg', '-360deg', '0deg', '360deg', '720deg'],
    extrapolate: 'clamp',
  });
  const qiblaRotation = roseAnim.interpolate({
    inputRange: [-720, -360, 0, 360, 720],
    outputRange: [
      `${-720 + qiblaDeg}deg`,
      `${-360 + qiblaDeg}deg`,
      `${qiblaDeg}deg`,
      `${360 + qiblaDeg}deg`,
      `${720 + qiblaDeg}deg`,
    ],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: insets.bottom + 20 }}>
      <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', transform: [{ rotate: roseRotation }] }}>
          <Svg width={280} height={280} viewBox="0 0 280 280">
            <Defs>
              <RadialGradient id="bg" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#F9FAFB" />
                <Stop offset="100%" stopColor="#F1F5F9" />
              </RadialGradient>
            </Defs>
            <Circle cx="140" cy="140" r="130" fill="url(#bg)" stroke="#E5E7EB" strokeWidth="2" />
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10 * Math.PI) / 180;
              const isMajor = i % 9 === 0;
              const r1 = 122, r2 = isMajor ? 108 : 116;
              return (
                <Line
                  key={i}
                  x1={140 + Math.sin(angle) * r1} y1={140 - Math.cos(angle) * r1}
                  x2={140 + Math.sin(angle) * r2} y2={140 - Math.cos(angle) * r2}
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
              <Polygon points="140,38 147,140 133,140" fill={TEAL} opacity="0.9" />
              <SvgText x="140" y="32" textAnchor="middle" fontSize="12" fill={TEAL}>🕋</SvgText>
            </Svg>
          </Animated.View>
        )}
      </View>

      <View style={{ marginTop: 28, alignItems: 'center', gap: 10 }}>
        {qiblaResult ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primaryContainer, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
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
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: theme.textMuted, textAlign: 'center', maxWidth: 260 }}>
          Hold phone flat and face the green arrow toward Makkah
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.textMuted, textAlign: 'center', maxWidth: 280, marginTop: 4, fontStyle: 'italic' }}>
          Move phone in a figure-8 pattern if direction seems inaccurate
        </Text>
        {cameraPermDenied && (
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: theme.textMuted, textAlign: 'center', maxWidth: 280, marginTop: 12 }}>
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
  const [aligned, setAligned] = useState(false);

  // Sin/cos EMA state — heading smoothing with no unbounded accumulator.
  // svxRef = sin component EMA, cvyRef = cos component EMA.
  // Recombined via atan2 → always [0, 360]. Handles 359°→0° naturally.
  const svxRef = useRef<number | null>(null);
  const cvyRef = useRef<number | null>(null);
  // Expose smoothed heading to CompassFallback via ref (no re-render needed)
  const smoothedHeadingRef = useRef<number | null>(null);

  const lastUpdateTime = useRef(0);
  const wasAligned = useRef(false);

  // Animated pin offset: translateX from screen centre, bounded to ±MARKER_RANGE
  const pinOffsetAnim = useRef(new Animated.Value(0)).current;
  // Animated beam opacity
  const beamOpacity = useRef(new Animated.Value(0.85)).current;
  // Pulsing ring animation
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

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

          // Sin/cos EMA — smooth each component independently.
          // No wraparound discontinuity since we're in vector space.
          const rawRad = (raw * Math.PI) / 180;
          if (svxRef.current === null) {
            svxRef.current = Math.sin(rawRad);
            cvyRef.current = Math.cos(rawRad);
          } else {
            svxRef.current += ALPHA * (Math.sin(rawRad) - svxRef.current);
            cvyRef.current! += ALPHA * (Math.cos(rawRad) - cvyRef.current!);
          }
          const smoothed = ((Math.atan2(svxRef.current, cvyRef.current!) * 180) / Math.PI + 360) % 360;
          smoothedHeadingRef.current = smoothed;

          // Throttle UI updates to ~16 Hz
          const now = Date.now();
          if (now - lastUpdateTime.current < THROTTLE_MS) return;
          lastUpdateTime.current = now;

          setHeading(smoothed);
        });
      } catch {
        // Location permission not granted; heading stays null
      }
    })();
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  // Derived Qibla values
  const qiblaResult =
    locState.status === 'ready'
      ? calculateQiblaDirection(locState.lat, locState.lng)
      : null;
  const qiblaDeg = qiblaResult?.direction ?? 0;
  const distanceKm =
    locState.status === 'ready'
      ? haversineKm(locState.lat, locState.lng, KAABA_LAT, KAABA_LNG)
      : 0;
  const cardinal = qiblaResult ? getCardinalDirection(qiblaDeg) : '';

  // Signed delta: + = Qibla is to the right
  const delta =
    heading !== null && qiblaResult !== null ? signedDelta(qiblaDeg, heading) : null;
  const isAligned = delta !== null && Math.abs(delta) < ALIGN_THRESHOLD;

  // Update animated pin offset and beam whenever delta changes
  useEffect(() => {
    if (delta === null) return;
    // Clamp delta to -90..90, then map to ±MARKER_RANGE pixels
    const clamped = Math.max(-90, Math.min(90, delta));
    const targetX = (clamped / 90) * MARKER_RANGE;
    Animated.timing(pinOffsetAnim, {
      toValue: targetX,
      duration: 80,
      useNativeDriver: true,
    }).start();
    Animated.timing(beamOpacity, {
      toValue: isAligned ? 1 : 0.85,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [delta, isAligned, pinOffsetAnim, beamOpacity]);

  // Track alignment state + haptic
  useEffect(() => {
    setAligned(isAligned);
    if (isAligned && !wasAligned.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasAligned.current = isAligned;
  }, [isAligned]);

  const permPending = cameraPermission === null || cameraPermission.status === 'undetermined';
  const useAR = cameraPermission?.granted === true;
  const cameraPermDenied = cameraPermission !== null && !cameraPermission.granted && !permPending;

  const turnText =
    delta === null
      ? 'Getting location…'
      : aligned
        ? "You're facing the Qibla"
        : `Turn ${delta > 0 ? 'right' : 'left'} ${Math.round(Math.abs(delta))}°`;

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

            {/* Dark vignette overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.55)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Ground beam — teal trapezoid rising from bottom centre */}
            <Animated.View
              pointerEvents="none"
              style={[styles.beamWrap, { opacity: beamOpacity }]}
            >
              <View style={[styles.beam, { borderBottomColor: aligned ? TEAL_LIGHT : TEAL_BEAM }]} />
              <Text style={[styles.chevron, { color: TEAL_BEAM }]}>⌄</Text>
            </Animated.View>

            {/* Distance pill with pointer triangle */}
            {qiblaResult && (
              <View style={styles.distWrap} pointerEvents="none">
                <View style={styles.distPill}>
                  <Text style={styles.distText}>{distanceKm.toLocaleString()} km</Text>
                  <View style={styles.distTail} />
                </View>
              </View>
            )}

            {/* Targeting reticle — fixed circle at 42% height */}
            <View
              pointerEvents="none"
              style={[
                styles.reticle,
                {
                  borderColor: aligned ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
                  shadowColor: aligned ? TEAL : 'transparent',
                  shadowOpacity: aligned ? 1 : 0,
                  shadowRadius: 12,
                },
              ]}
            />

            {/* Kaaba pin — slides horizontally as user rotates */}
            {/* Position is centre-anchored via translateX; can never exceed ±MARKER_RANGE */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pinAnchor,
                { transform: [{ translateX: pinOffsetAnim }] },
              ]}
            >
              <KaabaPin locked={aligned} pulseAnim={pulseAnim} />
            </Animated.View>

            {/* Instruction pill */}
            <View
              pointerEvents="none"
              style={[
                styles.instructionWrap,
                { bottom: insets.bottom + 112 },
              ]}
            >
              <View
                style={[
                  styles.instructionPill,
                  { backgroundColor: aligned ? `${TEAL}ee` : 'rgba(14,10,30,0.74)' },
                ]}
              >
                <Text style={styles.instructionText}>{turnText}</Text>
              </View>
            </View>

            {/* Calibration hint */}
            {lowAccuracy && (
              <View
                pointerEvents="none"
                style={[styles.hintWrap, { bottom: insets.bottom + 82 }]}
              >
                <Text style={styles.hintText}>
                  Low accuracy — move phone in a figure-8 to calibrate
                </Text>
              </View>
            )}

            {/* Compass orb — bottom left, rotates opposite to heading */}
            <View style={[styles.orb, { bottom: insets.bottom + 22 }]} pointerEvents="none">
              <View style={styles.orbInner}>
                <Text style={styles.orbN}>N</Text>
                <Text style={styles.orbKaaba}>🕋</Text>
              </View>
            </View>

            {/* SUCCESS overlay */}
            {aligned && (
              <LinearGradient
                colors={[TEAL, '#0d5c56']}
                style={styles.successOverlay}
                pointerEvents="none"
              >
                <Text style={styles.successH1}>You're facing the Qibla</Text>
                <Text style={styles.successP}>
                  Kaaba is {distanceKm.toLocaleString()} km in this direction.
                </Text>
                <View style={{ marginTop: 18 }}>
                  <KaabaPin locked pulseAnim={pulseAnim} />
                </View>
              </LinearGradient>
            )}
          </View>

        ) : (
          // ── Compass fallback (camera permission denied) ───────────────────────
          <CompassFallback
            qiblaDeg={qiblaDeg}
            qiblaResult={qiblaResult}
            distanceKm={distanceKm}
            cardinal={cardinal}
            smoothedHeadingRef={smoothedHeadingRef}
            theme={theme}
            insets={insets}
            cameraPermDenied={cameraPermDenied}
          />
        )}

      </View>
    </>
  );
}

const PIN_SIZE = 120;
const PIN_HALF = PIN_SIZE / 2;
const ORB_SIZE = 56;
const RETICLE = 190;

const styles = StyleSheet.create({
  // Kaaba pin
  pinContainer: {
    width: PIN_SIZE,
    height: PIN_SIZE,
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: 6,
    left: PIN_HALF - 60,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  pinTail: {
    position: 'absolute',
    left: PIN_HALF - 22,
    top: PIN_HALF - 8,
    width: 44,
    height: 44,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  pinOrb: {
    position: 'absolute',
    top: 6,
    left: PIN_HALF - 44,
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mini Kaaba inside orb
  kaabaBody: {
    width: 28,
    height: 28,
    backgroundColor: '#1a1520',
    borderRadius: 2,
    overflow: 'hidden',
    alignItems: 'center',
  },
  kaabaKiswah: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: GOLD,
  },
  kaabaDoor: {
    position: 'absolute',
    bottom: 0,
    left: '40%',
    width: 6,
    height: 10,
    backgroundColor: GOLD,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },
  // Pin anchor — placed at horizontal centre, at 42% vertical
  pinAnchor: {
    position: 'absolute',
    top: SCREEN_H * 0.42 - PIN_HALF,
    left: SCREEN_W / 2 - PIN_HALF,
  },
  // Ground beam
  beamWrap: {
    position: 'absolute',
    left: SCREEN_W / 2 - 60,
    bottom: 84,
    width: 120,
    height: 320,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  beam: {
    width: 0,
    height: 0,
    borderLeftWidth: 60,
    borderRightWidth: 60,
    borderBottomWidth: 280,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: TEAL_BEAM,
    opacity: 0.45,
  },
  chevron: {
    fontSize: 30,
    lineHeight: 16,
    marginTop: -4,
  },
  // Distance pill
  distWrap: {
    position: 'absolute',
    bottom: 148,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  distPill: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
  },
  distText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#1a1a1a',
  },
  distTail: {
    position: 'absolute',
    bottom: -7,
    width: 14,
    height: 14,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  // Targeting reticle
  reticle: {
    position: 'absolute',
    top: SCREEN_H * 0.42 - RETICLE / 2,
    left: SCREEN_W / 2 - RETICLE / 2,
    width: RETICLE,
    height: RETICLE,
    borderRadius: RETICLE / 2,
    borderWidth: 2,
  },
  // Instruction pill
  instructionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionPill: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 24,
  },
  instructionText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: 'white',
  },
  // Calibration hint
  hintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Compass orb
  orb: {
    position: 'absolute',
    left: 18,
    width: ORB_SIZE + 36,
    height: ORB_SIZE + 36,
    borderRadius: (ORB_SIZE + 36) / 2,
    backgroundColor: '#0e0c12',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  orbN: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: TEAL_LIGHT,
  },
  orbKaaba: {
    fontSize: 18,
  },
  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  successH1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: 'white',
    textAlign: 'center',
    lineHeight: 38,
  },
  successP: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 12,
  },
});
