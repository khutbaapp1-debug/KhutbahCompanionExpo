import { useEffect, useRef, useState } from 'react';

import { getStoredLocation } from '../lib/location';
import { getPrayerSettings } from '../lib/prayer-settings';
import {
  formatCountdown,
  formatTime12Hour,
  getNextPrayer,
  getPrayerTimesForDate,
} from '../lib/prayer-times';

type UseNextPrayerResult = {
  nextPrayerName: string | null;
  nextPrayerTime: string | null;
  countdown: string | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * Loads prayer settings + cached location on mount and exposes the next prayer
 * with a live 1-second countdown. Does NOT prompt for location permission —
 * it only reads the cached coordinates, so the home screen never triggers a
 * permission dialog. Returns null values gracefully until a location is cached
 * (which happens once the Prayer Times screen requests permission).
 */
export function useNextPrayer(): UseNextPrayerResult {
  const [nextPrayerName, setNextPrayerName] = useState<string | null>(null);
  const [nextPrayerTime, setNextPrayerTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetRef = useRef<Date | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function setup() {
      try {
        const [settings, location] = await Promise.all([
          getPrayerSettings(),
          getStoredLocation(),
        ]);

        if (!isMounted) return;

        if (!location) {
          // No cached location yet — leave values null (home shows "—").
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
        };

        applyNext(new Date());
        setIsLoading(false);

        intervalId = setInterval(() => {
          if (!isMounted || !targetRef.current) return;
          const tick = new Date();
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
  }, []);

  return { nextPrayerName, nextPrayerTime, countdown, isLoading, error };
}
