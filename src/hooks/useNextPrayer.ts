import { useEffect, useRef, useState } from 'react';

import { getStoredLocation } from '../lib/location';
import { getPrayerSettings } from '../lib/prayer-settings';
import {
  formatCountdown,
  formatTime12Hour,
  getNextPrayer,
  getPrayerTimesForDate,
} from '../lib/prayer-times';
import type { Coordinates } from '../lib/prayer-times';

export type TodaysPrayer = { name: string; time: Date };

type UseNextPrayerResult = {
  nextPrayerName: string | null;
  nextPrayerTime: string | null;
  countdown: string | null;
  todaysPrayers: TodaysPrayer[];
  isPast: (name: string) => boolean;
  isLoading: boolean;
  error: string | null;
};

/**
 * Loads prayer settings + location and exposes the next prayer with a live
 * 1-second countdown, plus today's five prayers for list rendering.
 *
 * Call with no args (home screen): reads only the cached location and never
 * prompts for permission — returns null/empty values gracefully until a
 * location has been cached.
 *
 * Call with explicit `coordinates` (prayer times screen, after the user grants
 * permission via LocationGate): recomputes whenever those coordinates change.
 */
export function useNextPrayer(coordinates?: Coordinates | null): UseNextPrayerResult {
  const [nextPrayerName, setNextPrayerName] = useState<string | null>(null);
  const [nextPrayerTime, setNextPrayerTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [todaysPrayers, setTodaysPrayers] = useState<TodaysPrayer[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetRef = useRef<Date | null>(null);

  // Primitive deps so the effect re-runs when explicit coordinates change.
  const lat = coordinates?.latitude ?? null;
  const lng = coordinates?.longitude ?? null;

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function setup() {
      try {
        setIsLoading(true);
        const settings = await getPrayerSettings();
        const location =
          lat != null && lng != null
            ? { latitude: lat, longitude: lng }
            : await getStoredLocation();

        if (!isMounted) return;

        if (!location) {
          // No location available — leave values null/empty (home shows "—").
          setNextPrayerName(null);
          setNextPrayerTime(null);
          setCountdown(null);
          setTodaysPrayers([]);
          setIsLoading(false);
          return;
        }

        const applyNext = (referenceDate: Date) => {
          const times = getPrayerTimesForDate(referenceDate, location, settings);
          const next = getNextPrayer(times, referenceDate);
          targetRef.current = next.time;
          setNextPrayerName(next.name);
          setNextPrayerTime(formatTime12Hour(next.time));
          setCountdown(formatCountdown(next.time, referenceDate));
          setTodaysPrayers([
            { name: 'Fajr', time: times.fajr },
            { name: 'Dhuhr', time: times.dhuhr },
            { name: 'Asr', time: times.asr },
            { name: 'Maghrib', time: times.maghrib },
            { name: 'Isha', time: times.isha },
          ]);
        };

        const startNow = new Date();
        applyNext(startNow);
        setNow(startNow);
        setIsLoading(false);

        intervalId = setInterval(() => {
          if (!isMounted || !targetRef.current) return;
          const tick = new Date();
          setNow(tick);
          // Once the current target passes, roll over to the following prayer.
          if (tick.getTime() >= targetRef.current.getTime()) {
            applyNext(tick);
          } else {
            setCountdown(formatCountdown(targetRef.current, tick));
          }
        }, 1000);
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load prayer times');
        setIsLoading(false);
      }
    }

    setup();

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [lat, lng]);

  const isPast = (name: string): boolean => {
    const prayer = todaysPrayers.find((p) => p.name === name);
    return prayer ? prayer.time.getTime() < now.getTime() : false;
  };

  return {
    nextPrayerName,
    nextPrayerTime,
    countdown,
    todaysPrayers,
    isPast,
    isLoading,
    error,
  };
}
