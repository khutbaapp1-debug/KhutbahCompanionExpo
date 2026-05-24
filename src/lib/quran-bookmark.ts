import AsyncStorage from '@react-native-async-storage/async-storage';

type Position = { surahNumber: number; ayahNumber: number };

const BOOKMARK_KEY = 'quran-bookmark';
const LAST_POSITION_KEY = 'quran-last-position';

async function readPosition(key: string): Promise<Position | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Position;
  } catch {
    return null;
  }
}

async function writePosition(key: string, surahNumber: number, ayahNumber: number): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify({ surahNumber, ayahNumber }));
}

// ─── User bookmark (manually set) ────────────────────────────────────────────

export function getBookmark(): Promise<Position | null> {
  return readPosition(BOOKMARK_KEY);
}

export async function setBookmark(surahNumber: number, ayahNumber: number): Promise<void> {
  await writePosition(BOOKMARK_KEY, surahNumber, ayahNumber);
}

export async function clearBookmark(): Promise<void> {
  await AsyncStorage.removeItem(BOOKMARK_KEY);
}

// ─── Last position (automatically updated as user reads) ──────────────────────

export function getLastPosition(): Promise<Position | null> {
  return readPosition(LAST_POSITION_KEY);
}

export async function setLastPosition(surahNumber: number, ayahNumber: number): Promise<void> {
  await writePosition(LAST_POSITION_KEY, surahNumber, ayahNumber);
}

// ─── Last surah (lightweight key for the list screen) ─────────────────────────

const LAST_SURAH_KEY = 'quran-last-surah';

export async function getLastSurah(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SURAH_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export async function setLastSurah(surahNumber: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SURAH_KEY, String(surahNumber));
  } catch {
    // ignore
  }
}
