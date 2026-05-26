import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getStoredLocation } from './location';
import { getPrayerSettings } from './prayer-settings';
import { getPrayerTimesForDate } from './prayer-times';

// expo-notifications touches native modules that are unavailable in Expo Go
// (SDK 53+). Mirror the expo-av lazy-load pattern: never import it at module
// scope, bail out in Expo Go, and require() it lazily inside each function.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export const PRAYERS: { key: PrayerKey; label: string }[] = [
  { key: 'fajr', label: 'Fajr' },
  { key: 'dhuhr', label: 'Dhuhr' },
  { key: 'asr', label: 'Asr' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isha', label: 'Isha' },
];

const HADITH_TIME_KEY = 'hadith-notification-time';
const DAYS_AHEAD = 5; // schedule prayer reminders for the next few days

// AsyncStorage keys (brief-specified shape).
export const masterKey = 'notifications-master';
export const prayerKey = (k: PrayerKey) => `notifications-${k}`;
export const hadithKey = 'notifications-hadith';

async function readBool(key: string, fallback = false): Promise<boolean> {
  const v = await AsyncStorage.getItem(key);
  return v === null ? fallback : v === 'true';
}

/**
 * Ensure permission + (Android) a notification channel. Returns whether
 * notifications are permitted. No-op (false) in Expo Go.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (IS_EXPO_GO) return false;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Cancel all scheduled notifications, then reschedule from saved preferences. */
export async function scheduleAllNotifications(): Promise<void> {
  if (IS_EXPO_GO) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Master switch defaults on; if explicitly off, schedule nothing.
  if (!(await readBool(masterKey, true))) return;

  await schedulePrayerNotifications();

  if (await readBool(hadithKey)) {
    const time = (await AsyncStorage.getItem(HADITH_TIME_KEY)) ?? '08:00';
    await scheduleHadithNotification(time);
  }
}

async function schedulePrayerNotifications(): Promise<void> {
  if (IS_EXPO_GO) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');

  const location = await getStoredLocation();
  if (!location) return; // no location → can't compute prayer times yet

  const enabled: PrayerKey[] = [];
  for (const { key } of PRAYERS) {
    if (await readBool(prayerKey(key))) enabled.push(key);
  }
  if (enabled.length === 0) return;

  const settings = await getPrayerSettings();
  const now = new Date();

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() + d);
    const times = getPrayerTimesForDate(date, location, settings);

    for (const { key, label } of PRAYERS) {
      if (!enabled.includes(key)) continue;
      const when = times[key];
      if (when.getTime() <= now.getTime()) continue; // don't schedule past times

      await Notifications.scheduleNotificationAsync({
        content: { title: `${label} prayer`, body: `It's time for ${label}.` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
    }
  }
}

/**
 * Daily repeating reminder to read the hadith. Note: a repeating trigger has a
 * fixed body, so it points the user into the app rather than embedding a
 * specific hadith (which would otherwise go stale each day).
 */
export async function scheduleHadithNotification(time: string): Promise<void> {
  if (IS_EXPO_GO) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');

  const [hStr, mStr] = time.split(':');
  const hour = Number.parseInt(hStr, 10);
  const minute = Number.parseInt(mStr, 10);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Hadith',
      body: 'Your daily hadith is ready — open Khutbah Companion to read it.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: Number.isNaN(hour) ? 8 : hour,
      minute: Number.isNaN(minute) ? 0 : minute,
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  if (IS_EXPO_GO) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  await Notifications.cancelAllScheduledNotificationsAsync();
}
