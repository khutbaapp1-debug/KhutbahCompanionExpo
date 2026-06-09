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
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStoredLocation } from '../src/lib/location';
import { calculateQiblaDirection, getCardinalDirection } from '../src/lib/qibla';
import { useTheme } from '../src/lib/theme-context';

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

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
  cameraPermDenied?: boolean;
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

// ─── AR view (Google Qibla Finder-style) ─────────────────────────────────────

interface ARViewProps {
  arrowRotation: number;
  distanceKm: number;
  qiblaReady: boolean;
  headingAnim: Animated.Value;
  insets: { bottom: number };
}

function ARView({ arrowRotation, distanceKm, qiblaReady, headingAnim, insets }: ARViewProps) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[ARView] CameraView mounting');
  }

  const isAligned = arrowRotation < 5 || arrowRotation > 355;
  const deviation = arrowRotation <= 180 ? arrowRotation : 360 - arrowRotation;
  // 0 when facing Qibla, 1 at 60+ degrees off
  const prominence = Math.min(deviation / 60, 1);
  const turnRight = !isAligned && arrowRotation <= 180;

  const compassRotation = headingAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['360deg', '0deg', '-360deg'],
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Camera background */}
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Centered content: arrows + circle + distance */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {/* Row: left curved arrow | white circle | right curved arrow */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Left curved arrow — turn counter-clockwise */}
          <View style={{ width: 50, height: 120, opacity: !isAligned && !turnRight ? prominence : 0 }}>
            <Svg width={50} height={120} viewBox="0 0 50 120">
              <Path
                d="M 40 108 C 5 84, 5 36, 40 12"
                stroke="white"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
              />
              <Polygon points="40,12 30,28 50,28" fill="white" />
            </Svg>
          </View>

          {/* White circle */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: 'white',
              borderWidth: 3,
              borderColor: isAligned ? '#3B82F6' : 'white',
            }}
          />

          {/* Right curved arrow — turn clockwise */}
          <View style={{ width: 50, height: 120, opacity: !isAligned && turnRight ? prominence : 0 }}>
            <Svg width={50} height={120} viewBox="0 0 50 120">
              <Path
                d="M 10 108 C 45 84, 45 36, 10 12"
                stroke="white"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
              />
              <Polygon points="10,12 0,28 20,28" fill="white" />
            </Svg>
          </View>
        </View>

        {/* Distance to Makkah */}
        {qiblaReady && (
          <Text
            style={{
              marginTop: 18,
              fontFamily: 'Inter_400Regular',
              fontSize: 15,
              color: 'white',
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowRadius: 4,
              textShadowOffset: { width: 0, height: 1 },
            }}
          >
            {distanceKm.toLocaleString()} km to Makkah
          </Text>
        )}
      </View>

      {/* Blue Qibla line — rendered after circle so it appears on top */}
      {isAligned && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
          <View style={{ flex: 1, width: 3, backgroundColor: '#3B82F6' }} />
        </View>
      )}

      {/* Kaaba icon — top centre when aligned */}
      {isAligned && (
        <View style={{ position: 'absolute', top: 52, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ fontSize: 36 }}>🕋</Text>
        </View>
      )}

      {/* Compass rose — bottom left */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 72, left: 16 }}>
        <Animated.View style={{ transform: [{ rotate: compassRotation }] }}>
          <Svg width={52} height={52} viewBox="0 0 52 52">
            <Circle cx="26" cy="26" r="24" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            <Polygon points="26,5 30,24 22,24" fill="#EF4444" />
            <Polygon points="26,47 30,28 22,28" fill="rgba(255,255,255,0.5)" />
            <Circle cx="26" cy="26" r="3" fill="white" />
            <SvgText x="26" y="16" textAnchor="middle" fontSize="9" fill="white">N</SvgText>
          </Svg>
        </Animated.View>
      </View>

      {/* Calibration hint — bottom centre */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 16,
          left: 0,
          right: 0,
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: 'rgba(255,255,255,0.75)',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Move phone in a figure-8 pattern if direction seems inaccurate
        </Text>
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

  // ── Request camera permission immediately on mount ───────────────────────
  useEffect(() => {
    void requestCameraPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Log permission status at every state change ──────────────────────────
  useEffect(() => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[QiblaScreen] camera permission status:', cameraPermission?.status, '| granted:', cameraPermission?.granted);
    }
  }, [cameraPermission]);

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
      const { x: mx, y: my, z: mz } = data;

      // Normalize gravity vector
      const gMag = Math.sqrt(ax * ax + ay * ay + az * az) || 1;
      const nx = ax / gMag;
      const ny = ay / gMag;
      const nz = az / gMag;

      // East = gravity × magnetic north
      const ex = ny * mz - nz * my;
      const ey = nz * mx - nx * mz;
      const ez = nx * my - ny * mx;

      // Normalize east
      const eMag = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
      const enx = ex / eMag;
      const eny = ey / eMag;
      const enz = ez / eMag;

      // North = east × gravity
      const northX = eny * nz - enz * ny;
      const northY = enz * nx - enx * nz;
      const northZ = enx * ny - eny * nx;
      void northY;
      void northZ;

      let raw = (Math.atan2(enx, northX) * 180) / Math.PI;
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
  const permPending = cameraPermission === null || cameraPermission.status === 'undetermined';
  const useAR = cameraPermission?.granted === true;
  const cameraPermDenied = cameraPermission !== null && !cameraPermission.granted && !permPending;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ title: 'Qibla Finder' }} />
      {/* No alignItems here — AR branch needs the full unconstrained width */}
      <View style={{ flex: 1, backgroundColor: useAR ? 'black' : theme.background }}>
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
        ) : permPending ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>
              Requesting camera permission…
            </Text>
          </View>
        ) : useAR ? (
          <ARView
            arrowRotation={arrowRotation}
            distanceKm={distanceKm}
            qiblaReady={qiblaResult !== null}
            headingAnim={headingAnim}
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
            cameraPermDenied={cameraPermDenied}
          />
        )}
      </View>
    </>
  );
}

