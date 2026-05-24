export type RakatBreakdown = {
  sunnahBefore?: number;
  fard: number;
  sunnahAfter?: number;
  witr?: number;
};

export const RAKAT_DATA: Record<'Standard' | 'Hanafi', Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', RakatBreakdown>> = {
  Hanafi: {
    fajr:    { sunnahBefore: 2, fard: 2 },
    dhuhr:   { sunnahBefore: 4, fard: 4, sunnahAfter: 2 },
    asr:     { fard: 4 },
    maghrib: { fard: 3, sunnahAfter: 2 },
    isha:    { fard: 4, sunnahAfter: 2, witr: 3 },
  },
  Standard: {
    fajr:    { sunnahBefore: 2, fard: 2 },
    dhuhr:   { sunnahBefore: 2, fard: 4, sunnahAfter: 2 },
    asr:     { fard: 4 },
    maghrib: { fard: 3, sunnahAfter: 2 },
    isha:    { fard: 4, sunnahAfter: 2, witr: 1 },
  },
};

export const ARABIC_NAMES: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string> = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

export const PRAYER_DESCRIPTIONS: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', string> = {
  fajr: 'The dawn prayer, performed before sunrise. Recited aloud.',
  dhuhr: 'The midday prayer, performed after the sun passes its zenith. Recited silently.',
  asr: 'The afternoon prayer, performed in the late afternoon before sunset. Recited silently.',
  maghrib: 'The sunset prayer, performed just after sunset. First two rakat aloud, third silent.',
  isha: 'The night prayer, performed after twilight. First two rakat aloud, the rest silent.',
};
