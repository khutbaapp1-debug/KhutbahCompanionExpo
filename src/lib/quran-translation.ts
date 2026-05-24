import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AyahTranslation = {
  numberInSurah: number;
  text: string;
};

// ─── Internal API response shape ─────────────────────────────────────────────

type ApiAyah = {
  numberInSurah: number;
  text: string;
};

type ApiResponse = {
  code: number;
  data: {
    ayahs: ApiAyah[];
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns Saheeh International English translation for a surah.
 *
 * Checks AsyncStorage first. On cache miss, fetches from api.alquran.cloud
 * and persists the result permanently (the Quran text doesn't change).
 * Returns an empty array on network or parse failure so Arabic still renders.
 */
export async function getSurahTranslation(
  surahNumber: number,
): Promise<AyahTranslation[]> {
  const cacheKey = `quran-translation-${surahNumber}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as AyahTranslation[];
  } catch {
    // Corrupt cache entry — fall through to network fetch.
  }

  try {
    const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/en.sahih`;
    const response = await fetch(url);
    const json = (await response.json()) as ApiResponse;

    if (json.code !== 200) return [];

    const translations: AyahTranslation[] = json.data.ayahs.map((a) => ({
      numberInSurah: a.numberInSurah,
      text: a.text,
    }));

    AsyncStorage.setItem(cacheKey, JSON.stringify(translations));
    return translations;
  } catch {
    return [];
  }
}
