import AsyncStorage from '@react-native-async-storage/async-storage';

// Calculation methods we expose to the user. Each maps to an adhan
// CalculationMethod factory in prayer-times.ts.
export type CalculationMethodKey =
  | 'MWL'
  | 'ISNA'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Turkey'
  | 'Tehran';

// 'Standard' = Shafi/Maliki/Hanbali (asr at 1x shadow). 'Hanafi' = 2x shadow.
export type MadhabKey = 'Standard' | 'Hanafi';

export type HighLatitudeRuleKey =
  | 'MiddleOfTheNight'
  | 'SeventhOfTheNight'
  | 'TwilightAngle';

export type PrayerSettings = {
  calculationMethod: CalculationMethodKey;
  madhab: MadhabKey;
  highLatitudeRule: HighLatitudeRuleKey;
};

const STORAGE_KEY = 'prayer-settings-v1';

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  calculationMethod: 'MWL',
  madhab: 'Standard',
  highLatitudeRule: 'MiddleOfTheNight',
};

/** Stored settings merged over defaults, or pure defaults if nothing/invalid. */
export async function getPrayerSettings(): Promise<PrayerSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PRAYER_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<PrayerSettings>;
    return { ...DEFAULT_PRAYER_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_PRAYER_SETTINGS };
  }
}

/** Merge a partial update over current settings and persist the result. */
export async function updatePrayerSettings(
  partial: Partial<PrayerSettings>,
): Promise<PrayerSettings> {
  const current = await getPrayerSettings();
  const next: PrayerSettings = { ...current, ...partial };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
