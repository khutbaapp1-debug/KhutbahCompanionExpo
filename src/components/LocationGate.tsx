import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { getStoredLocation, requestAndCacheLocation } from '../lib/location';
import type { Coordinates } from '../lib/prayer-times';

type Status = 'checking' | 'needed' | 'requesting' | 'ready' | 'error';

type Props = {
  children: (coordinates: Coordinates) => ReactNode;
};

// Renders its children only once a location is available. Otherwise shows a
// friendly "Enable Location" prompt and owns the permission-request flow.
export default function LocationGate({ children }: Props) {
  const [status, setStatus] = useState<Status>('checking');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // On mount: use cached coords immediately if present, refresh in background.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cached = await getStoredLocation();
      if (!isMounted) return;
      if (cached) {
        setCoords(cached);
        setStatus('ready');
        // Silent refresh — won't prompt if permission is already granted.
        requestAndCacheLocation()
          .then((fresh) => {
            if (isMounted) setCoords(fresh);
          })
          .catch(() => {
            /* keep the cached coordinates on failure */
          });
      } else {
        setStatus('needed');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnable = useCallback(async () => {
    setStatus('requesting');
    setErrorMessage(null);
    try {
      const fresh = await requestAndCacheLocation();
      setCoords(fresh);
      setStatus('ready');
    } catch (e) {
      const denied = e instanceof Error && e.message === 'Location permission denied';
      setErrorMessage(
        denied
          ? 'Location permission was denied. Enable it in your device settings to see prayer times for your area.'
          : 'Could not get your location. Make sure location services are on, then try again.',
      );
      setStatus('error');
    }
  }, []);

  if (status === 'ready' && coords) {
    return <>{children(coords)}</>;
  }

  if (status === 'checking') {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <ActivityIndicator color="#0F766E" />
      </View>
    );
  }

  // needed | requesting | error
  return (
    <View className="flex-1 items-center justify-center px-8">
      <MaterialCommunityIcons name="map-marker-radius" size={56} color="#0F766E" />
      <Text className="mt-4 text-center text-gray-900 font-sans-semibold text-lg">
        Enable location for prayer times
      </Text>
      <Text className="mt-2 text-center text-gray-600 font-sans text-sm">
        Khutbah Companion uses your location to calculate accurate prayer times for your area.
      </Text>
      {errorMessage ? (
        <Text className="mt-3 text-center text-red-600 font-sans text-sm">{errorMessage}</Text>
      ) : null}
      <Pressable
        onPress={handleEnable}
        disabled={status === 'requesting'}
        className="mt-6 rounded-2xl bg-primary px-6 py-3"
        style={({ pressed }) => ({ opacity: pressed || status === 'requesting' ? 0.8 : 1 })}
      >
        <Text className="text-white font-sans-semibold text-base">
          {status === 'requesting'
            ? 'Getting location…'
            : status === 'error'
              ? 'Try Again'
              : 'Enable Location'}
        </Text>
      </Pressable>
    </View>
  );
}
