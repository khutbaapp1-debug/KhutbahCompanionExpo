import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import type { Subscription } from 'expo-sensors/build/DeviceSensor';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredLocation } from '../src/lib/location';
import { calculateQiblaDirection, getCardinalDirection } from '../src/lib/qibla';
import { useTheme } from '../src/lib/theme-context';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

// AR overlay green — fixed colour for visibility against any camera feed
const AR_GREEN = '#4ADE80';

type LocState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; lat: number; lng: number };

// ─── Haversine distance (km) ──────────────────────────────────────────────────

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

// ─── Compass fallback (no camera) ────────────────────────────────────────────

interface CompassProps {
  qiblaDeg: number;
  qiblaResult: { direction: number; distance: number } | null;
  distanceKm: number;
  cardinal: string;
  headingAnim: Animated.Value;
  handleRecalibrate: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  insets: { bottom: number };
}

function CompassFallback({
  qiblaDeg,
  qiblaResult,
  distanceKm,
  cardinal,
  headingAnim,
  handleRecalibrate,
  theme,
  insets,
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
      {/* Compass + Qibla needle */}
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

        <TouchableOpacity
          onPress={handleRecalibrate}
          style={{
            borderRadius: 10,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.primary,
            marginTop: 4,
          }}
        >
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: theme.primary }}>
            Recalibrate
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── AR view (camera + live arrow overlay) ───────────────────────────────────

interface ARViewProps {
  arrowRotation: number;
  qiblaDeg: number;
  distanceKm: number;
  cardinal: string;
  qiblaReady: boolean;
  handleRecalibrate: () => void;
  insets: { bottom: number };
}

function ARView({
  arrowRotation,
  qiblaDeg,
  distanceKm,
  cardinal,
  qiblaReady,
  handleRecalibrate,
  insets,
}: ARViewProps) {
  return (
    <View style={{ flex: 1 }}>
      {/* Live camera feed filling the screen */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Transparent overlay */}
      <View style={[StyleSheet.absoluteFill, styles.arOverlay]}>
        {/* Rotating directional arrow */}
        <View
          style={[
            styles.arrowWrapper,
            { transform: [{ rotate: `${arrowRotation}deg` }] },
          ]}
        >
          {/* Kaaba emoji at the tip */}
          <Text style={styles.arrowKaaba}>🕋</Text>
          {/* Triangle arrowhead */}
          <View style={styles.arrowHead} />
          {/* Shaft */}
          <View style={styles.arrowShaft} />
        </View>

        {/* Bottom info strip */}
        <View style={[styles.infoStrip, { paddingBottom: insets.bottom + 16 }]}>
          {qiblaReady ? (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="compass-outline" size={18} color={AR_GREEN} />
                <Text style={styles.infoMainText}>
                  {Math.round(qiblaDeg)}° {cardinal} — Qibla direction
                </Text>
              </View>
              <Text style={styles.distanceText}>{distanceKm.toLocaleString()} km to Makkah</Text>
            </>
          ) : (
            <ActivityIndicator size="small" color={AR_GREEN} />
          )}

          <Text style={styles.calibrationText}>
            Move phone in a figure-8 pattern if direction seems inaccurate
          </Text>

          <TouchableOpacity onPress={handleRecalibrate} style={styles.recalibrateButton}>
            <Text style={styles.recalibrateButtonText}>Recalibrate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Location (read from AsyncStorage — do not re-request location permission)
  const [locState, setLocState] = useState<LocState>({ status: 'loading' });

  // Camera permission — useCameraPermissions returns [permission, requestFn, getFn]
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // AR arrow angle (degrees, updated from magnetometer)
  const [arrowRotation, setArrowRotation] = useState(0);

  // Compass animated value (for compass rose fallback)
  const headingAnim = useRef(new Animated.Value(0)).current;
  const lastRaw = useRef(0);

  // Sensor subscription refs
  const magSubRef = useRef<Subscription | null>(null);
  const accelSubRef = useRef<Subscription | null>(null);
  const accelRef = useRef({ x: 0, y: 0, z: -1 });

  // ── Load cached location (shared cache — no permission request) ──────────
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

  // ── Request camera permission lazily on mount ─────────────────────────────
  useEffect(() => {
    if (cameraPermission !== null && !cameraPermission.granted && cameraPermission.canAskAgain) {
      void requestCameraPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived Qibla values ─────────────────────────────────────────────────
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

  // ── Sensor subscriptions ─────────────────────────────────────────────────
  const subscribeAccelerometer = useCallback(() => {
    Accelerometer.setUpdateInterval(200);
    const sub = Accelerometer.addListener((data) => {
      accelRef.current = data;
    });
    accelSubRef.current = sub;
    return sub;
  }, []);

  const subscribeMagnetometer = useCallback(() => {
    Magnetometer.setUpdateInterval(100);
    const sub = Magnetometer.addListener((data) => {
      const { x: ax, y: ay, z: az } = accelRef.current;
      const gNorm = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
      const gz = az / gNorm; // normalised gravity z-component

      let raw: number;

      if (Math.abs(gz) > 0.85) {
        // Phone nearly flat — simple 2-D magnetometer heading
        raw = (Math.atan2(-data.y, data.x) * 180) / Math.PI;
      } else {
        // Phone tilted — tilt-compensated heading
        const gx = ax / gNorm;
        const gy = ay / gNorm;
        // Project magnetometer onto horizontal plane
        const dot = data.x * gx + data.y * gy + data.z * gz;
        const nx = data.x - dot * gx; // north vector x
        const ny = data.y - dot * gy; // north vector y
        // East vector = gravity × magnetometer (cross product components)
        const ex = gy * data.z - gz * data.y;
        const ey = gz * data.x - gx * data.z;
        void ey; // suppress lint
        void ny; // suppress lint
        // Full yaw from east & north projections
        raw = (Math.atan2(ex, nx) * 180) / Math.PI;
      }

      raw = (raw + 360) % 360;

      // Shortest-arc smoothing
      let delta = raw - lastRaw.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const smoothed = lastRaw.current + delta;
      lastRaw.current = smoothed;

      // Update animated compass
      Animated.timing(headingAnim, {
        toValue: smoothed,
        duration: 80,
        useNativeDriver: true,
      }).start();

      // AR arrow: Qibla bearing minus current device heading
      const heading = (smoothed % 360 + 360) % 360;
      setArrowRotation((qiblaDeg - heading + 360) % 360);
    });
    magSubRef.current = sub;
    return sub;
  }, [headingAnim, qiblaDeg]);

  useEffect(() => {
    if (locState.status !== 'ready') return;
    const acc = subscribeAccelerometer();
    const mag = subscribeMagnetometer();
    return () => {
      acc.remove();
      mag.remove();
      accelSubRef.current = null;
      magSubRef.current = null;
    };
  }, [locState.status, subscribeAccelerometer, subscribeMagnetometer]);

  const handleRecalibrate = useCallback(() => {
    magSubRef.current?.remove();
    accelSubRef.current?.remove();
    magSubRef.current = null;
    accelSubRef.current = null;
    lastRaw.current = 0;
    subscribeAccelerometer();
    subscribeMagnetometer();
  }, [subscribeAccelerometer, subscribeMagnetometer]);

  // ── Choose AR vs compass ─────────────────────────────────────────────────
  // AR mode when camera permission is granted; fallback to compass otherwise
  const useAR = cameraPermission?.granted === true;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ title: 'Qibla Finder' }} />
      <View
        style={{
          flex: 1,
          backgroundColor: useAR ? 'black' : theme.background,
          alignItems: 'center',
        }}
      >
        {locState.status === 'loading' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>
              Loading location…
            </Text>
          </View>
        ) : locState.status === 'unavailable' ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              gap: 16,
            }}
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
        ) : useAR ? (
          <ARView
            arrowRotation={arrowRotation}
            qiblaDeg={qiblaDeg}
            distanceKm={distanceKm}
            cardinal={cardinal}
            qiblaReady={qiblaResult !== null}
            handleRecalibrate={handleRecalibrate}
            insets={insets}
          />
        ) : (
          <CompassFallback
            qiblaDeg={qiblaDeg}
            qiblaResult={qiblaResult}
            distanceKm={distanceKm}
            cardinal={cardinal}
            headingAnim={headingAnim}
            handleRecalibrate={handleRecalibrate}
            theme={theme}
            insets={insets}
          />
        )}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ARROW_HALF = 22;

const styles = StyleSheet.create({
  // AR overlay container
  arOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Arrow (points toward Qibla)
  arrowWrapper: {
    alignItems: 'center',
  },
  arrowKaaba: {
    fontSize: 24,
    marginBottom: 2,
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_HALF,
    borderRightWidth: ARROW_HALF,
    borderBottomWidth: ARROW_HALF * 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: AR_GREEN,
  },
  arrowShaft: {
    width: 8,
    height: 100,
    backgroundColor: AR_GREEN,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  // Bottom info strip (AR mode)
  infoStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoMainText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: AR_GREEN,
  },
  distanceText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  calibrationText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  recalibrateButton: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: AR_GREEN,
    marginTop: 4,
    marginBottom: 4,
  },
  recalibrateButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: AR_GREEN,
  },
});
