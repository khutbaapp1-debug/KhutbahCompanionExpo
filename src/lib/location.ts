import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import type { Coordinates } from './prayer-times';

const CACHE_KEY = 'cached-location-v1';

/** Last known location from AsyncStorage, or null if none cached / invalid. */
export async function getStoredLocation(): Promise<Coordinates | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Coordinates>;
    if (typeof parsed?.latitude === 'number' && typeof parsed?.longitude === 'number') {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Request foreground permission, read the current position, and cache it.
 * Throws if permission is denied or the device can't return a position.
 */
export async function requestAndCacheLocation(): Promise<Coordinates> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const coordinates: Coordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(coordinates));
  return coordinates;
}

/**
 * Cached location if available, otherwise request + cache a fresh one.
 * Lets the home card avoid prompting on every launch.
 */
export async function getCachedOrCurrentLocation(): Promise<Coordinates> {
  const cached = await getStoredLocation();
  if (cached) return cached;
  return requestAndCacheLocation();
}
