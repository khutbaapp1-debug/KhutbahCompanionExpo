import AsyncStorage from '@react-native-async-storage/async-storage';

type Position = { surahNumber: number; ayahNumber: number };

export type Bookmark = {
  surahNumber: number;
  ayahNumber: number;
  scrollY?: number;
  fontSizeIdx?: number;
};

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

export async function getBookmark(): Promise<Bookmark | null> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Bookmark;
  } catch {
    return null;
  }
}

export async function setBookmark(
  surahNumber: number,
  ayahNumber: number,
  scrollY?: number,
  fontSizeIdx?: number,
): Promise<void> {
  await AsyncStorage.setItem(
    BOOKMARK_KEY,
    JSON.stringify({ surahNumber, ayahNumber, scrollY, fontSizeIdx }),
  );
}

export async function clearBookmark(): Promise<void> {
  await AsyncStorage.removeItem(BOOKMARK_KEY);
}

// ─── Font size preference ─────────────────────────────────────────────────────

const FONT_SIZE_IDX_KEY = 'quran-font-size-idx';

export async function getQuranFontSize(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(FONT_SIZE_IDX_KEY);
    const idx = raw ? parseInt(raw, 10) : 1;
    return isNaN(idx) ? 1 : Math.min(Math.max(idx, 0), 3);
  } catch {
    return 1;
  }
}

export async function setQuranFontSize(idx: number): Promise<void> {
  try {
    await AsyncStorage.setItem(FONT_SIZE_IDX_KEY, String(idx));
  } catch {
    // ignore
  }
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

// ─── View mode preference ─────────────────────────────────────────────────────

export async function getQuranViewMode(): Promise<'page' | 'detailed'> {
  try {
    const raw = await AsyncStorage.getItem('quran-view-mode');
    return raw === 'detailed' ? 'detailed' : 'page';
  } catch {
    return 'page';
  }
}

export async function setQuranViewMode(mode: 'page' | 'detailed'): Promise<void> {
  try {
    await AsyncStorage.setItem('quran-view-mode', mode);
  } catch {
    // ignore
  }
}
