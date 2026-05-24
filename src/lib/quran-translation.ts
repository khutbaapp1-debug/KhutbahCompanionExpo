import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AyahTranslation = {
  numberInSurah: number;
  transliteration: string;
  translation: string;
};

// ─── Internal API response shape ─────────────────────────────────────────────

type ApiAyah = {
  numberInSurah: number;
  text: string;
};

type ApiEdition = {
  ayahs: ApiAyah[];
};

type ApiResponse = {
  code: number;
  data: ApiEdition[];
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns transliteration + Saheeh International translation for a surah.
 *
 * Fetches both in one request using the multi-edition endpoint:
 *   editions[0] = en.transliteration, editions[1] = en.sahih
 *
 * Caches permanently in AsyncStorage (quran text never changes).
 * Cache key bumped to v2 because the shape changed from v1 (text only → transliteration + translation).
 * Returns an empty array on network or parse failure so Arabic still renders.
 */
export async function getSurahTranslation(
  surahNumber: number,
): Promise<AyahTranslation[]> {
  const cacheKey = `quran-translation-v2-${surahNumber}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as AyahTranslation[];
  } catch {
    // Corrupt cache entry — fall through to network fetch.
  }

  try {
    const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/en.transliteration,en.sahih`;
    const response = await fetch(url);
    const json = (await response.json()) as ApiResponse;

    if (json.code !== 200 || !Array.isArray(json.data) || json.data.length < 2) return [];

    const translitEdition = json.data[0];
    const translationEdition = json.data[1];

    const result: AyahTranslation[] = translitEdition.ayahs.map((ayah, idx) => ({
      numberInSurah: ayah.numberInSurah,
      transliteration: ayah.text,
      translation: translationEdition.ayahs[idx]?.text ?? '',
    }));

    void AsyncStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  } catch {
    return [];
  }
}
