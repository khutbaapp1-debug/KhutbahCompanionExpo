import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

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

export default function MosquesScreen() {
  const { theme } = useTheme();
  const [status, setStatus] = useState<Status>('checking');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Mosque Finder',
          headerRight:
            status === 'ready'
              ? () => (
                  <Pressable
                    onPress={() => {
                      setShowMap((v) => !v);
                      setSelectedMosque(null);
                    }}
                    style={{ marginRight: 16 }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showMap ? 'list-outline' : 'map-outline'}
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
        ) : showMap && coords ? (
          <FlatList
            data={mosques}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingBottom: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            ListHeaderComponent={
              <View>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={{ height: 280 }}
                  initialRegion={{
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  <Marker coordinate={coords} pinColor="#3B82F6" title="You are here" />
                  {mosques.map((mosque) => (
                    <Marker
                      key={mosque.id}
                      coordinate={{ latitude: mosque.latitude, longitude: mosque.longitude }}
                      pinColor={selectedMosque?.id === mosque.id ? theme.primary : '#EF4444'}
                      onPress={() => setSelectedMosque(mosque)}
                    />
                  ))}
                </MapView>
                {selectedMosque ? (
                  <View
                    style={{
                      margin: 12,
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      padding: 14,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.12,
                      shadowRadius: 6,
                      elevation: 4,
                    }}
                  >
                    <Pressable
                      onPress={() => setSelectedMosque(null)}
                      style={{ position: 'absolute', top: 10, right: 10 }}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={18} color={theme.textMuted} />
                    </Pressable>
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 15,
                        color: theme.text,
                        paddingRight: 24,
                      }}
                    >
                      {selectedMosque.name}
                    </Text>
                    {formatDistance(selectedMosque.distance) ? (
                      <Text
                        style={{
                          fontFamily: 'Inter_400Regular',
                          fontSize: 13,
                          color: theme.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {formatDistance(selectedMosque.distance)} away
                      </Text>
                    ) : null}
                    {selectedMosque.address ? (
                      <Text
                        style={{
                          fontFamily: 'Inter_400Regular',
                          fontSize: 13,
                          color: theme.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {selectedMosque.address}
                      </Text>
                    ) : null}
                    <Pressable
                      onPress={() => openDirections(selectedMosque)}
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
                ) : null}
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 12,
                    color: theme.textMuted,
                    textAlign: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                  }}
                >
                  Map loading issues? Mosque locations are shown in the list below.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: theme.textMuted,
                  textAlign: 'center',
                  marginTop: 24,
                  paddingHorizontal: 16,
                }}
              >
                No mosques found within 5 km.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 16 }}>
                <MosqueCard mosque={item} theme={theme} />
              </View>
            )}
          />
        ) : (
          <FlatList
            data={mosques}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16 }}
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
