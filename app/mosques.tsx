import { Ionicons } from '@expo/vector-icons';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { Component, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import type { ThemeColors } from '../src/lib/theme';
import { useTheme } from '../src/lib/theme-context';

const BASE_URL = 'https://khutbahtranslate-production.up.railway.app';

type Mosque = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
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

async function fetchMosques(coords: Coords, signal: AbortSignal): Promise<Mosque[]> {
  const url = `${BASE_URL}/api/mosques/nearby?latitude=${coords.latitude}&longitude=${coords.longitude}&radius=5000`;
  const res = await fetch(url, { signal });
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
          backgroundColor: theme.primary,
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

// Catches MapView native errors so a maps failure cannot take down the screen.
// Calls onError() to flip the parent's mapError flag → auto fallback to list.
class MapErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function MosquesScreen() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<Status>('checking');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(true); // default: split view
  const [mapError, setMapError] = useState(false);
  const isMountedRef = useRef(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Animate map to fit all markers once results arrive.
  useEffect(() => {
    if (status !== 'ready' || mosques.length === 0 || !coords || mapError) return;
    const points = [
      { latitude: coords.latitude, longitude: coords.longitude },
      ...mosques.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
    ];
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 60, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [status, mosques, coords, mapError]);

  const loadMosques = useCallback(async (c: Coords) => {
    const controller = new AbortController();
    try {
      const data = await fetchMosques(c, controller.signal);
      if (!isMountedRef.current) return;
      setMosques(data);
      setStatus('ready');
    } catch {
      if (!isMountedRef.current) return;
      setStatus('error');
    }
    return () => controller.abort();
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

  // Guard: react-native-maps only works in dev-client and standalone builds,
  // not in Expo Go (StoreClient). Use ExecutionEnvironment instead of reading
  // the API key — Constants.expoConfig?.android?.config resolves undefined at
  // runtime in dev clients even when the manifest contains the key.
  const mapsSupported = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('MAP_GUARD', Constants.executionEnvironment, !!Constants.expoConfig?.android?.config?.googleMaps?.apiKey);
  }

  // Show split view only when the runtime supports maps, results are ready,
  // the user hasn't toggled list-only, and the map hasn't previously errored.
  const showSplitView = mapsSupported && showMap && !mapError && status === 'ready' && coords !== null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mosque Finder',
          headerRight:
            status === 'ready' && mapsSupported
              ? () => (
                  <Pressable
                    onPress={() => setShowMap((v) => !v)}
                    style={{ marginRight: 16 }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showSplitView ? 'list-outline' : 'map-outline'}
                      size={22}
                      color={theme.primary}
                    />
                  </Pressable>
                )
              : undefined,
        }}
      />
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
                backgroundColor: theme.primary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 10,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>
                Open Settings
              </Text>
            </Pressable>
          </View>
        ) : status === 'error' ? (
          <FlatList
            data={[]}
            renderItem={null}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            ListEmptyComponent={
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: theme.textMuted,
                  textAlign: 'center',
                  marginTop: 24,
                  paddingHorizontal: 32,
                }}
              >
                Could not load mosques. Pull down to refresh.
              </Text>
            }
            contentContainerStyle={{ padding: 16 }}
          />
        ) : showSplitView ? (
          // ── Split view: top 55% map, bottom 45% list ─────────────────
          <View style={{ flex: 1 }}>
            <MapErrorBoundary onError={() => setMapError(true)}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 55 }}
                initialRegion={{
                  latitude: coords!.latitude,
                  longitude: coords!.longitude,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{ latitude: coords!.latitude, longitude: coords!.longitude }}
                  pinColor="#3B82F6"
                  title="You are here"
                />
                {mosques.map((mosque) => (
                  <Marker
                    key={mosque.id}
                    coordinate={{ latitude: mosque.latitude, longitude: mosque.longitude }}
                    pinColor={theme.primary}
                  >
                    <Callout
                      onPress={() =>
                        void Linking.openURL(
                          `geo:${mosque.latitude},${mosque.longitude}?q=${encodeURIComponent(mosque.name)}`,
                        )
                      }
                    >
                      <View style={{ minWidth: 160, padding: 8 }}>
                        <Text
                          style={{
                            fontFamily: 'Inter_600SemiBold',
                            fontSize: 14,
                            color: theme.text,
                            marginBottom: 8,
                          }}
                        >
                          {mosque.name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: theme.primary,
                            borderRadius: 8,
                            paddingVertical: 7,
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'Inter_600SemiBold',
                              fontSize: 13,
                              color: '#FFFFFF',
                            }}
                          >
                            Get Directions
                          </Text>
                        </View>
                      </View>
                    </Callout>
                  </Marker>
                ))}
              </MapView>
            </MapErrorBoundary>

            <View style={{ flex: 45 }}>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  color: theme.textMuted,
                  textAlign: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 16,
                  backgroundColor: theme.surface,
                }}
              >
                Map loading issues? Mosque locations are shown in the list below.
              </Text>
              <FlatList
                style={{ flex: 1 }}
                data={mosques}
                keyExtractor={(m) => m.id}
                contentContainerStyle={{ padding: 12, paddingTop: 4 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={theme.primary}
                    colors={[theme.primary]}
                  />
                }
                ListEmptyComponent={
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      fontSize: 14,
                      color: theme.textMuted,
                      textAlign: 'center',
                      marginTop: 16,
                      paddingHorizontal: 16,
                    }}
                  >
                    No mosques found within 5 km.
                  </Text>
                }
                renderItem={({ item }) => <MosqueCard mosque={item} theme={theme} />}
              />
            </View>
          </View>
        ) : (
          // ── List-only view (also shown when Maps API key is absent) ───
          <FlatList
            data={mosques}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16 }}
            ListHeaderComponent={
              !mapsSupported && status === 'ready' ? (
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: theme.textMuted,
                    textAlign: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 16,
                    marginBottom: 8,
                  }}
                >
                  Map unavailable
                </Text>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            ListEmptyComponent={
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
            }
            renderItem={({ item }) => <MosqueCard mosque={item} theme={theme} />}
          />
        )}
      </View>
    </>
  );
}
