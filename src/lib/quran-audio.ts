// ─── Reciters ─────────────────────────────────────────────────────────────────
// All identifiers verified against cdn.islamic.network at the listed bitrate.
// 128 kbps: ar.alafasy, ar.husary, ar.mahermuaiqly, ar.minshawi,
//           ar.muhammadayyoub, ar.shaatree, ar.ahmedajamy
// 64 kbps:  ar.abdulbasitmurattal, ar.abdurrahmaansudais, ar.hanirifai

export const RECITERS = [
  { id: 'ar.alafasy',            name: 'Mishary Rashid Al-Afasy',    bitrate: 128 },
  { id: 'ar.husary',             name: 'Mahmoud Khalil Al-Husary',   bitrate: 128 },
  { id: 'ar.mahermuaiqly',       name: 'Maher Al-Muaiqly',           bitrate: 128 },
  { id: 'ar.minshawi',           name: 'Mohamed Al-Minshawi',        bitrate: 128 },
  { id: 'ar.muhammadayyoub',     name: 'Muhammad Ayyoub',            bitrate: 128 },
  { id: 'ar.shaatree',           name: 'Abu Bakr Al-Shaatree',       bitrate: 128 },
  { id: 'ar.ahmedajamy',         name: 'Ahmed Al-Ajamy',             bitrate: 128 },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)',      bitrate: 64  },
  { id: 'ar.abdurrahmaansudais', name: 'Abdurrahmaan As-Sudais',     bitrate: 64  },
  { id: 'ar.hanirifai',          name: 'Hani Al-Rifai',              bitrate: 64  },
] as const;

export type ReciterId = (typeof RECITERS)[number]['id'];

// ─── Ayah counts per surah (1-indexed: index 0 = surah 1) ────────────────────
// Source: standard Hafs recitation; verified against Quran text.

const AYAH_COUNTS: readonly number[] = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 43, 68, 29, 15, 21, 36,
  26, 17, 27, 33, 11, 13, 30, 22, 23, 18,
  22, 10, 14, 4, 13, 28, 28, 16, 9, 25,
  78, 64, 51, 16,
] as const;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Converts a surah + within-surah ayah number to a global ayah number (1–6236).
 * Used to build the CDN audio URL which is keyed by global number.
 */
export function getGlobalAyahNumber(
  surahNumber: number,
  ayahNumberInSurah: number,
): number {
  let offset = 0;
  for (let i = 0; i < surahNumber - 1; i++) {
    offset += AYAH_COUNTS[i];
  }
  return offset + ayahNumberInSurah;
}

/**
 * Returns the MP3 stream URL for a single ayah.
 * Bitrate is per-reciter (128 or 64 kbps) — whichever the CDN serves for that edition.
 * The audio streams from Islamic Network CDN — nothing is downloaded locally.
 */
export function getAyahAudioUrl(
  surahNumber: number,
  ayahNumber: number,
  reciterId: ReciterId,
): string {
  const global = getGlobalAyahNumber(surahNumber, ayahNumber);
  const reciter = RECITERS.find((r) => r.id === reciterId);
  const bitrate = reciter?.bitrate ?? 128;
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${reciterId}/${global}.mp3`;
}
