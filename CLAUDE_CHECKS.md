# Pre-Commit Audit Checks
Run only checks relevant to files you modified. Report PASS or FAIL with line number.

---

## UNCONDITIONAL CHECKS — ALWAYS RUN THESE REGARDLESS OF WHICH FILES WERE CHANGED
- app/quran/[surahNumber].tsx: page view parent Text has textAlign 'justify', writingDirection 'rtl', width '100%'
- src/lib/premium.ts: isPremium status matches current development phase (true for testing, RevenueCat for production)
- No console.log statements exist anywhere in app/ or src/ directories EXCEPT dev-only diagnostic logs inside if (__DEV__) guards that are explicitly temporary

---

## ANY FILE IN app/ OR src/components/
- Theme colours come from useTheme() not hardcoded hex values
- Arabic text uses NotoNaskhArabic (non-Quran screens) or KFGQPCHafs (Quran screens)
- No new console.log statements anywhere in changed files
- Any new fetch call has res.ok check before res.json()
- Any new fetch call has AbortController and unmount guard
- isPremium checks use usePremium hook not a direct function call

## app/quran/[surahNumber].tsx
- Bookmark uses measureInWindow on verseRefs not an estimate or calculation
- Detailed view uses scrollToIndex on FlatList
- Bismillah shown as separate centred header on every surah except 1 and 9
- Bismillah removed from verse 1 text when shown as a header
- Page view: single parent Text wraps all verses inline; parent Text has textAlign 'justify', writingDirection 'rtl', width '100%'
- Page view: each verse rendered as Fragment with zero-size View ref marker + inline text
- Detailed view Arabic text: textAlign 'justify', writingDirection 'rtl'

## app/index.tsx
- All 13 feature tiles present: Live Translation, Prayer Times, Quran, Daily Duas, Daily Hadith, Tasbih, Qibla Compass, 99 Names, Mosque Finder, Salah Guide, Ramadan, Zakat Calculator, My Duas
- Location loading uses useFocusEffect not useEffect
- Premium upgrade banner visible for free users below header

## app/duas.tsx
- All 17 categories are visible to all users with no lock icons on chips
- Free categories show all duas fully
- Premium categories show first dua fully, remaining duas are blurred with overlay and lock icon
- Tapping blurred dua opens PremiumPaywall
- Arabic text uses NotoNaskhArabic font

## app/_layout.tsx
- mobileAds().initialize() called in useEffect on mount
- ThemedBanner wraps BannerAd in SafeAreaView with edges bottom
- ThemedBanner uses theme.surface background colour
- Zero gap between banner and navigation bar in light, dark, and high contrast modes

## src/lib/premium.ts
- isPremium is currently hardcoded to return true for testing — MUST be reverted to RevenueCat before production build
- Comment exists in file: TESTING — revert to RevenueCat before production build
- Returns false in catch block

## src/lib/notifications.ts
- DAYS_AHEAD equals 7 not 5
- Permission is checked before calling cancelAllScheduledNotificationsAsync
- Notifications not cancelled if permission was never granted

## app/mosques.tsx
- Google Maps API key read from environment variable not hardcoded in source
- No console.log of the API key except inside if (__DEV__) guards for temporary debugging
- Fallback message shown when map fails: "Map loading issues? Mosque locations are shown in the list below."
- Mosque list renders even when map fails

## app/translation.tsx
- Record button calls doStartRecording() directly with no ad gate
- First chunk shows isFirstChunkPending rendering "Translating..." text
- Language picker visible in header
- Arabic to English is default language pair
- Summary fetch in generateSummary has unmount guard (isMountedRef.current check after every await)
- No console.log statements outside __DEV__ guards
- [SUMMARY] diagnostic console.log calls are ALL gated inside if (__DEV__) — must be stripped or remain gated before production build

## src/components/SummaryModal.tsx
- [SUMMARY] diagnostic console.log calls are ALL gated inside if (__DEV__) — must be stripped or remain gated before production build
- Share uses Share.share (react-native) with plain text message — no image capture, no expo-sharing, no view-shot, no layoutReady gating
- Share message begins with "Khutbah Summary" + formatted date line (e.g. "Friday 12 June 2026") from recordingDate prop
- Modal header shows "Khutbah Summary" title + same formatted date below it
- No .map or .length access on actionPoints without Array.isArray guard

## src/lib/audio-recorder.ts
- No console.log statements

## src/lib/translation-upload.ts
- BASE_URL points to khutbahtranslate-production.up.railway.app
- No console.log statements

## app/hadith.tsx
- BASE_URL points to khutbahtranslate-production.up.railway.app
- API path is /api/hadiths/daily (plural)
- AbortController and unmount guard present

## app/loading.tsx
- Checks AsyncStorage for onboarding-complete key
- Uses useFocusEffect not useEffect
- API path is /api/hadiths/daily (plural)

## app/salah-guide.tsx
- Audio play buttons present on every recitation step
- Audio plays from assets/audio/ files

## app/qibla.tsx
- Uses getStoredLocation() shared helper — same function used by prayer times and home screen
- Does not parse location cache differently from other screens
- Does not request location permission if valid cache exists
- Camera permission requested lazily on screen open
- Compass fallback shown if camera permission denied
- Calibration instruction visible

## src/components/BannerAd.tsx
- Uses TestIds.BANNER when __DEV__ is true
- Uses ca-app-pub-6514143339893635/4741009217 in production

## src/components/PremiumPaywall.tsx
- Uses package.product.priceString not hardcoded price
- Sadaqah Jariyah text completely absent

## app/settings.tsx
- Sadaqah Jariyah text completely absent
- Premium upgrade card visible for free users at top

## app/notifications.tsx
- Notification time picker is scrollable WheelPicker (WheelColumn FlatList with snapToInterval) not fixed buttons
- Time pickers open as a popup Modal (not inline) — tapping the displayed time value opens the modal
- Modal has Cancel and Done buttons; Done persists the selected time to AsyncStorage and reschedules notifications
- Inline row shows selected time as a tappable value (theme.primary colour)
- Modal uses theme.surface background and theme.border for card border (correct in dark and high-contrast modes)

## BRANDING CHECKS (any screen changed)
- Primary colour is #0F766E
- Gold #C9A84C used only for Quranic verse highlights
- No placeholder text or lorem ipsum visible to users

## ISLAMIC CONTENT CHECKS (any content changed)
- All duas have Arabic, transliteration, translation, and source reference
- No unverified Islamic content added
- Sadaqah Jariyah framing absent from all commercial screens

## BACKEND FILES (KhutbahTranslate)
- radius parameter capped at maximum 10000
- No console.log leaking any part of API keys
- /api/hadiths/daily uses 24-hour in-memory cache
- /api/summarise rejects text longer than 10000 characters
- alquran.cloud fetches check res.ok before parsing

---

After committing and pushing: read this file, run all checks for files changed in this task, report each as PASS or FAIL with line number. If any FAILs are found create a new commit fixing them immediately and push again.
