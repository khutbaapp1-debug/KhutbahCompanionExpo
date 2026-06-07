# Pre-Commit Audit Checks
Run only checks relevant to files you modified. Report PASS or FAIL with line number before committing. Do not commit until all relevant checks PASS.

---

## ANY FILE IN app/ OR src/components/
- Theme colours come from useTheme() not hardcoded hex values
- Arabic text uses NotoNaskhArabic (non-Quran screens) or KFGQPCHafs (Quran screens)
- No new console.log statements anywhere in changed files
- Any new fetch call has res.ok check before res.json()
- Any new fetch call has AbortController and unmount guard
- isPremium checks use usePremium hook not a direct function call

## app/quran/[surahNumber].tsx
- Page view verse Text component has textAlign: 'right'
- Page view verse Text component has writingDirection: 'rtl'
- Page view verse Text component has width: '100%'
- Page view verse parent View has width: '100%' and alignSelf: 'stretch'
- Bookmark uses measureInWindow on verseRefs not an estimate or calculation
- Detailed view uses scrollToIndex on FlatList
- Bismillah shown as separate centred header on every surah except 1 and 9
- Bismillah removed from verse 1 text when shown as a header

## app/index.tsx
- All 16 feature tiles present: Live Translation, Prayer Times, Quran, Daily Duas, Daily Hadith, Tasbih, Qibla Compass, 99 Names, Mosque Finder, Salah Guide, Wudu Guide, Settings, Ramadan, Zakat Calculator, My Duas, Daily Worship Checklist
- Location loading uses useFocusEffect not useEffect
- Premium upgrade banner visible for free users below header
- DailyWorshipChecklist is collapsed by default showing only title and progress

## app/duas.tsx
- Free categories morning, evening, daily, food, protection, family appear FIRST in chip row
- Locked premium categories appear AFTER free categories
- FREE_CATEGORY_IDS contains all six: morning, evening, daily, food, protection, family
- Arabic text uses NotoNaskhArabic font

## app/_layout.tsx
- mobileAds().initialize() called in useEffect on mount
- No BannerAd component rendered (banner removed)
- Layout renders SafeAreaProvider > ThemeProvider > ThemedStack with no extra wrapping View

## src/lib/premium.ts
- isPremium uses Purchases.getCustomerInfo() from RevenueCat
- Not hardcoded to true or false
- Returns false in catch block

## src/lib/notifications.ts
- DAYS_AHEAD equals 7 not 5
- Permission is checked before calling cancelAllScheduledNotificationsAsync
- Notifications not cancelled if permission was never granted

## app/mosques.tsx
- Google Maps API key read from environment variable not hardcoded in source
- No console.log of the API key or any part of it
- Fallback message shown when map fails: "Map loading issues? Mosque locations are shown in the list below."
- Mosque list renders even when map fails

## app/translation.tsx
- Record button calls doStartRecording() directly with no ad gate
- First chunk shows isFirstChunkPending rendering "Translating..." text
- Language picker visible in header
- Arabic to English is default language pair
- Summary fetch in handleStop has unmount guard
- No console.log statements

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
- Reads from same AsyncStorage location cache as prayer times
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
- Notification time picker is scrollable WheelPicker not fixed buttons

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

Before committing: read this file, run all checks for files you changed, report each as PASS or FAIL with line number, fix all FAILs, then commit.
