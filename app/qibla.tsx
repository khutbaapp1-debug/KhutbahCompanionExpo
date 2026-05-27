import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { calculateQiblaDirection, getCardinalDirection } from '../src/lib/qibla';
import { useTheme } from '../src/lib/theme-context';

type LocState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'denied' }
  | { status: 'ready'; lat: number; lng: number };

export default function QiblaScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [locState, setLocState] = useState<LocState>({ status: 'idle' });
  const headingAnim = useRef(new Animated.Value(0)).current;
  const lastRaw = useRef(0);

  const qiblaResult =
    locState.status === 'ready'
      ? calculateQiblaDirection(locState.lat, locState.lng)
      : null;

  useEffect(() => {
    void requestLocation();
  }, []);

  const requestLocation = async () => {
    setLocState({ status: 'requesting' });
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocState({ status: 'denied' });
      return;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocState({ status: 'ready', lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  useEffect(() => {
    if (locState.status !== 'ready') return;

    Magnetometer.setUpdateInterval(100);
    const sub = Magnetometer.addListener((data) => {
      let raw = (Math.atan2(data.y, data.x) * 180) / Math.PI;
      raw = (raw + 360) % 360;
      // Smooth by taking shortest-arc delta
      let delta = raw - lastRaw.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const smoothed = lastRaw.current + delta;
      lastRaw.current = smoothed;
      Animated.timing(headingAnim, {
        toValue: smoothed,
        duration: 80,
        useNativeDriver: true,
      }).start();
    });

    return () => sub.remove();
  }, [locState.status, headingAnim]);

  // Compass rose rotates counter to heading so N always faces true North
  const roseRotation = headingAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: ['360deg', '0deg', '-360deg'],
  });

  // Qibla needle: absolute angle = qiblaDeg from North → same counter-rotation
  const qiblaDeg = qiblaResult?.direction ?? 0;
  const qiblaRotation = headingAnim.interpolate({
    inputRange: [-360, 0, 360],
    outputRange: [
      `${360 + qiblaDeg}deg`,
      `${qiblaDeg}deg`,
      `${-360 + qiblaDeg}deg`,
    ],
  });

  const distanceKm = qiblaResult ? Math.round(qiblaResult.distance) : 0;
  const cardinal = qiblaResult ? getCardinalDirection(qiblaDeg) : '';

  return (
    <>
      <Stack.Screen options={{ title: 'Qibla Compass' }} />
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center' }}>
        {locState.status === 'requesting' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: theme.textMuted }}>
              Getting your location…
            </Text>
          </View>
        ) : locState.status === 'denied' ? (
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
              Location access required
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.textMuted,
                textAlign: 'center',
              }}
            >
              Qibla direction requires your location. Please enable it in Settings.
            </Text>
            <TouchableOpacity
              onPress={() => void requestLocation()}
              style={{
                backgroundColor: theme.primary,
                borderRadius: 10,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: 'white' }}
              >
                Try Again
              </Text>
            </TouchableOpacity>
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
            {/* Compass + Qibla needle stack */}
            <View style={{ width: 280, height: 280, alignItems: 'center', justifyContent: 'center' }}>
              {/* Rotating compass rose */}
              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [{ rotate: roseRotation }],
                }}
              >
                <Svg width={280} height={280} viewBox="0 0 280 280">
                  <Circle cx="140" cy="140" r="130" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="2" />
                  {/* Tick marks */}
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
                  {/* Cardinal labels */}
                  <SvgText x="140" y="24" textAnchor="middle" fontFamily="Inter_700Bold" fontSize="16" fill="#DC2626">N</SvgText>
                  <SvgText x="258" y="145" textAnchor="middle" fontFamily="Inter_700Bold" fontSize="14" fill="#6B7280">E</SvgText>
                  <SvgText x="140" y="268" textAnchor="middle" fontFamily="Inter_700Bold" fontSize="14" fill="#6B7280">S</SvgText>
                  <SvgText x="22" y="145" textAnchor="middle" fontFamily="Inter_700Bold" fontSize="14" fill="#6B7280">W</SvgText>
                  {/* Red/White north-south needle */}
                  <Polygon points="140,45 146,140 134,140" fill="#DC2626" />
                  <Polygon points="140,235 146,140 134,140" fill="#D1D5DB" />
                  <Circle cx="140" cy="140" r="6" fill="white" stroke="#D1D5DB" strokeWidth="2" />
                </Svg>
              </Animated.View>

              {/* Qibla needle (green, on top) */}
              {qiblaResult && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    transform: [{ rotate: qiblaRotation }],
                  }}
                >
                  <Svg width={280} height={280} viewBox="0 0 280 280">
                    {/* Green qibla arrow pointing up (toward Makkah) */}
                    <Polygon points="140,38 147,140 133,140" fill={theme.primary} opacity="0.9" />
                    {/* Kaaba icon at tip */}
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
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 15,
                        color: theme.primary,
                      }}
                    >
                      {Math.round(qiblaDeg)}° {cardinal} — Qibla direction
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 13,
                      color: theme.textMuted,
                    }}
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
                Hold phone flat and face the green arrow toward Makkah
              </Text>
            </View>
          </View>
        )}
      </View>
    </>
  );
}
