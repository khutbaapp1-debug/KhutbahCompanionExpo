import {
  CalculationMethod,
  Coordinates as AdhanCoordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes as AdhanPrayerTimes,
} from 'adhan';

import type { PrayerSettings } from './prayer-settings';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

// The five daily prayers as Date objects (sunrise omitted — not a prayer).
export type PrayerTimes = {
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
};

// Maps our settings keys onto adhan's CalculationParameters.
function buildCalculationParameters(settings: PrayerSettings) {
  let params;
  switch (settings.calculationMethod) {
    case 'ISNA':
      params = CalculationMethod.NorthAmerica();
      break;
    case 'Egyptian':
      params = CalculationMethod.Egyptian();
      break;
    case 'Karachi':
      params = CalculationMethod.Karachi();
      break;
    case 'UmmAlQura':
      params = CalculationMethod.UmmAlQura();
      break;
    case 'Dubai':
      params = CalculationMethod.Dubai();
      break;
    case 'Kuwait':
      params = CalculationMethod.Kuwait();
      break;
    case 'Qatar':
      params = CalculationMethod.Qatar();
      break;
    case 'Singapore':
      params = CalculationMethod.Singapore();
      break;
    case 'Turkey':
      params = CalculationMethod.Turkey();
      break;
    case 'MWL':
    default:
      params = CalculationMethod.MuslimWorldLeague();
      break;
  }

  params.madhab = settings.madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;

  switch (settings.highLatitudeRule) {
    case 'SeventhOfTheNight':
      params.highLatitudeRule = HighLatitudeRule.SeventhOfTheNight;
      break;
    case 'TwilightAngle':
      params.highLatitudeRule = HighLatitudeRule.TwilightAngle;
      break;
    case 'MiddleOfTheNight':
    default:
      params.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight;
      break;
  }

  return params;
}

/** Compute the five daily prayer times for a given date + location. */
export function getPrayerTimesForDate(
  date: Date,
  coordinates: Coordinates,
  settings: PrayerSettings,
): PrayerTimes {
  const coords = new AdhanCoordinates(coordinates.latitude, coordinates.longitude);
  const params = buildCalculationParameters(settings);
  const times = new AdhanPrayerTimes(coords, date, params);

  return {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

/**
 * The next upcoming prayer relative to `now`. If all five have already passed
 * today, returns tomorrow's Fajr.
 *
 * NOTE: since this function only receives today's times, tomorrow's Fajr is
 * approximated as today's Fajr + 24h (drifts by ~1 min/day — fine for a home
 * countdown). The dedicated Prayer Times screen can compute the exact value by
 * calling getPrayerTimesForDate with tomorrow's date.
 */
export function getNextPrayer(
  prayerTimes: PrayerTimes,
  now: Date,
): { name: string; time: Date } {
  const ordered: { name: PrayerName; time: Date }[] = [
    { name: 'Fajr', time: prayerTimes.fajr },
    { name: 'Dhuhr', time: prayerTimes.dhuhr },
    { name: 'Asr', time: prayerTimes.asr },
    { name: 'Maghrib', time: prayerTimes.maghrib },
    { name: 'Isha', time: prayerTimes.isha },
  ];

  const nowMs = now.getTime();
  for (const prayer of ordered) {
    if (prayer.time.getTime() > nowMs) {
      return { name: prayer.name, time: prayer.time };
    }
  }

  const tomorrowFajr = new Date(prayerTimes.fajr.getTime() + 24 * 60 * 60 * 1000);
  return { name: 'Fajr', time: tomorrowFajr };
}

/** Time remaining until `targetDate` as "HH:MM:SS" (clamped at 00:00:00). */
export function formatCountdown(targetDate: Date, now: Date): string {
  let totalSeconds = Math.max(
    0,
    Math.floor((targetDate.getTime() - now.getTime()) / 1000),
  );

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Format a Date as a 12-hour clock string, e.g. "5:42 AM". */
export function formatTime12Hour(date: Date): string {
  const minutes = date.getMinutes();
  const isPm = date.getHours() >= 12;
  let hours = date.getHours() % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${String(minutes).padStart(2, '0')} ${isPm ? 'PM' : 'AM'}`;
}
