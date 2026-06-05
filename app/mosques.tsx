import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import type { ThemeColors } from '../src/lib/theme';
import { useTheme } from '../src/lib/theme-context';

const BASE_URL = 'https://khutbahtranslate-production.up.railway.app';
const TEAL = '#0F766E';

type Mosque = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  // Backend returns distance as a stringified value in kilometres (e.g. "0.81").
  distance?: string | number | null;
  address?: string | null;
  website?: string | null;
  phone?: string | null;
};

type Coords = { latitude: number; longitude: number };

type Status = 'checking' | 'denied' | 'loading' | 'ready' | 'error';

function formatDistance(distance: Mosque['distance']): string | null {
  if (distance === null || distance === undefined) return null;
  const km = typeof distance === 'number' ? distance : Number.parseFloat(distance);
  if (!Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 2 : 1)} km`;
}

function openDirections(mosque: Mosque) {
  const { latitude, longitude, name } = mosque;
  const label = encodeURIComponent(name);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
  void Linking.openURL(url);
}

async function fetchMosques(coords: Coords): Promise<Mosque[]> {
  // The backend validates the query params as `latitude`/`longitude`, not
  // `lat`/`lng` — verified against the deployed endpoint.
  const url = `${BASE_URL}/api/mosques/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=5000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as Mosque[];
  return Array.isArray(data) ? data : [];
}

function MosqueCard({
  mosque,
  theme,
}: {
  mosque: Mosque;
  theme: ThemeColors;
}) {
  const distance = formatDistance(mosque.distance);
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 15,
          color: theme.text,
        }}
      >
        {mosque.name}
      </Text>
      {distance ? (
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            color: theme.textMuted,
            marginTop: 2,
          }}
        >
          {distance} away
        </Text>
      ) : null}
      {mosque.address ? (
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            color: theme.textMuted,
            marginTop: 2,
          }}
        >
          {mosque.address}
        </Text>
      ) : null}
      <Pressable
        onPress={() => openDirections(mosque)}
        style={({ pressed }) => ({
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: TEAL,
          borderRadius: 10,
          paddingVertical: 10,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 14,
            color: '#FFFFFF',
          }}
        >
          Get Directions
        </Text>
      </Pressable>
    </View>
  );
}

export default function MosquesScreen() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<Status>('checking');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const loadMosques = useCallback(async (c: Coords) => {
    try {
      const data = await fetchMosques(c);
      setMosques(data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  const requestLocationAndLoad = useCallback(async () => {
    setStatus('loading');
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      setStatus('denied');
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const c: Coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoords(c);
      await loadMosques(c);
    } catch {
      setStatus('error');
    }
  }, [loadMosques]);

  useEffect(() => {
    void requestLocationAndLoad();
  }, [requestLocationAndLoad]);

  const onRefresh = useCallback(async () => {
    if (!coords) {
      setRefreshing(true);
      await requestLocationAndLoad();
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    await loadMosques(coords);
    setRefreshing(false);
  }, [coords, loadMosques, requestLocationAndLoad]);

  const headerRight = useCallback(
    () =>
      status === 'ready' ? (
        <Pressable
          onPress={() => setShowMap((s) => !s)}
          hitSlop={12}
          style={{ marginRight: 4 }}
        >
          <Ionicons
            name={showMap ? 'list-outline' : 'map-outline'}
            size={22}
            color={theme.primary}
          />
        </Pressable>
      ) : null,
    [showMap, status, theme.primary],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Mosque Finder', headerRight }} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {status === 'checking' || status === 'loading' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text
              style={{
                marginTop: 12,
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: theme.textMuted,
              }}
            >
              Finding nearby mosques…
            </Text>
          </View>
        ) : status === 'denied' ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
            }}
          >
            <Ionicons name="location-outline" size={56} color={theme.primary} />
            <Text
              style={{
                marginTop: 12,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                color: theme.text,
                textAlign: 'center',
              }}
            >
              Enable location to find nearby mosques
            </Text>
            <Pressable
              onPress={() => void Linking.openSettings()}
              style={({ pressed }) => ({
                marginTop: 16,
                backgroundColor: TEAL,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 10,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 14,
                  color: '#FFFFFF',
                }}
              >
                Open Settings
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {showMap && coords ? (
              <View style={{ flex: 1 }}>
                <MapView
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  showsUserLocation
                >
                  {mosques.map((mosque) => (
                    <Marker
                      key={mosque.id}
                      coordinate={{
                        latitude: mosque.latitude,
                        longitude: mosque.longitude,
                      }}
                      pinColor="green"
                      title={mosque.name}
                    >
                      <Callout onPress={() => openDirections(mosque)}>
                        <View style={{ maxWidth: 220, padding: 4 }}>
                          <Text
                            style={{
                              fontFamily: 'Inter_600SemiBold',
                              fontSize: 14,
                              color: '#111827',
                            }}
                          >
                            {mosque.name}
                          </Text>
                          <Text
                            style={{
                              marginTop: 6,
                              fontFamily: 'Inter_600SemiBold',
                              fontSize: 13,
                              color: TEAL,
                            }}
                          >
                            Get Directions
                          </Text>
                        </View>
                      </Callout>
                    </Marker>
                  ))}
                </MapView>
              </View>
            ) : null}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                />
              }
            >
              {status === 'error' ? (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: theme.textMuted,
                    textAlign: 'center',
                    marginTop: 24,
                  }}
                >
                  Could not load mosques. Pull to refresh.
                </Text>
              ) : mosques.length === 0 ? (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 14,
                    color: theme.textMuted,
                    textAlign: 'center',
                    marginTop: 24,
                  }}
                >
                  No mosques found within 5 km.
                </Text>
              ) : (
                mosques.map((mosque) => (
                  <MosqueCard key={mosque.id} mosque={mosque} theme={theme} />
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </>
  );
}
