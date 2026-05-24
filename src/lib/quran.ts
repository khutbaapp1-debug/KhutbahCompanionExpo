// ─── Public types ─────────────────────────────────────────────────────────────

export type Ayah = {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
  sajda: boolean | { id: number; recommended: boolean; obligatory: boolean };
};

export type Surah = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
  ayahs: Ayah[];
};

// ─── Internal JSON shape ──────────────────────────────────────────────────────

type RawSurah = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: Ayah[];
};

type QuranJson = { surahs: RawSurah[] };

// Avoid TypeScript inferring the enormous literal type for the 2.1 MB JSON
// (6236 ayahs would create a massive tuple type and stall the type-checker).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _raw: QuranJson = require('../data/quran-arabic.json');

// ─── Memoised dataset ─────────────────────────────────────────────────────────

let _surahs: Surah[] | null = null;

function load(): Surah[] {
  if (_surahs) return _surahs;
  _surahs = _raw.surahs.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishNameTranslation,
    numberOfAyahs: s.numberOfAyahs,
    revelationType: s.revelationType as Surah['revelationType'],
    ayahs: s.ayahs,
  }));
  return _surahs;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** All 114 surahs with full ayah text. Memoised after first call. */
export function getAllSurahs(): Surah[] {
  return load();
}

/** Single surah by 1-based number (1–114). Throws on invalid number. */
export function getSurah(number: number): Surah {
  const surah = load().find((s) => s.number === number);
  if (!surah) throw new RangeError(`Invalid surah number: ${number}`);
  return surah;
}

/** All 114 surahs without ayah arrays — lightweight for list screens. */
export function getSurahList(): Omit<Surah, 'ayahs'>[] {
  return load().map(({ ayahs: _ayahs, ...meta }) => meta);
}
