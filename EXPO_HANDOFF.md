# Khutbah Companion — Expo (React Native) Rebuild Handoff

> **Read this first if you're a new AI assistant.** This document is everything you need to build the React Native (Expo) version of Khutbah Companion from scratch. The existing Capacitor/WebView app is a working reference — you're not modifying it, you're rebuilding the client in Expo while keeping the existing backend.
>
> **The owner's priority is SPEED.** The whole point of this rebuild is a faster, more reliable app than the Capacitor version. Don't compromise that for code purity.

---

## Table of Contents

1. [Why this rebuild exists](#1-why-this-rebuild-exists)
2. [What carries over from the Capacitor app](#2-what-carries-over-from-the-capacitor-app)
3. [Tech stack and architectural decisions](#3-tech-stack-and-architectural-decisions)
4. [Project structure](#4-project-structure)
5. [The 12 screens — full specification](#5-the-12-screens--full-specification)
6. [Live translation — the hard one](#6-live-translation--the-hard-one)
7. [Backend (don't rebuild)](#7-backend-dont-rebuild)
8. [Build flavors for 3 Play Store variants](#8-build-flavors-for-3-play-store-variants)
9. [AdMob integration](#9-admob-integration)
10. [Notifications](#10-notifications)
11. [Permissions](#11-permissions)
12. [Phased build plan (10-12 weeks)](#12-phased-build-plan-1012-weeks)
13. [Launch checklist](#13-launch-checklist)
14. [Features paused for v1](#14-features-paused-for-v1)
15. [Working agreement for the AI taking over](#15-working-agreement-for-the-ai-taking-over)

---

## 1. Why this rebuild exists

The owner spent months building a Capacitor + React + Vite version of this app (lives at `C:\Users\Dell\KhutbahTranslate`, repo `khutbaapp1-debug/KhutbahTranslate`). It works, it ships, and a parallel effort is shipping it to Play Store now with a separate Claude chat following a different handoff document. **You're not replacing that work — you're building the better next version in parallel.**

### Why the rebuild was decided

After two extensive audits and discussions about the Capacitor app, the owner concluded:

- WebView audio capture (via deprecated `ScriptProcessorNode`) had reliability concerns for the core 45-minute khutbah recording use case
- The AdMob Capacitor plugin required patching `BannerExecutor.java` inside `node_modules` after every install
- Permission dialog timing required `postDelayed(10000)` hacks
- Splash screen never reliably worked despite correct config
- `env(safe-area-inset-bottom)` reported 0 in Android WebView — required custom inset code
- ProGuard fix required before every Android Studio build
- 1Hz countdown re-rendered the entire translation page
- The translation UI specifically suffered from WebView paint costs on low-end Android

Native React UI components (not WebView), native audio capture (`expo-av` or `react-native-audio-record` using AudioRecord/AVAudioEngine under the hood), native AdMob, native notifications. Same TypeScript skills, single codebase for Android + iOS, AI tools have strong React Native training data.

### What this rebuild is NOT

- It is not a fully native (Kotlin + Compose) Android app. That option was considered and rejected because the owner wants iOS in the plan and a Kotlin rebuild means rebuilding everything twice.
- It is not greenfield in spirit. The owner has already done the hard product work — verified Islamic content, tuned translation prompts, designed every screen. **This is a port, not a redesign.** When you see a feature, your default is to match the Capacitor app's behavior exactly unless this document specifies otherwise.
- It is not addressing translation accuracy. That's a separate server-side workstream. You don't touch the OpenAI prompts or transcription pipeline.

### The owner's stated priorities, in order

1. **Speed** — cold start, audio responsiveness, scroll smoothness on low-end Android (Vivo V2413 is the test device, common in target markets)
2. **Audio reliability** — recording survives screen lock attempt, ambient interruptions, brief notification dismissals
3. **Ship-readiness** — passes Play Store review without rejection, all 3 locale variants build cleanly
4. **Feature parity with the Capacitor version** — every existing feature works in the rebuild before launch

App size matters but only insofar as smaller = faster cold start. Don't over-optimize for raw byte count.

---

## 2. What carries over from the Capacitor app

This is critical — understand what's reusable vs. what gets rewritten before you start.

### 100% reusable as-is

- **The entire backend.** `https://khutbah-translate.replit.app` stays. All API endpoints work unchanged. The Expo app makes HTTP calls and renders results.
- **OpenAI prompts and translation pipeline.** Lives on the server. Don't touch.
- **Phrase dictionary and translation cache.** Server-side.
- **AdMob account and ad unit IDs.**
  - App ID: `ca-app-pub-6514143339893635~XXXXXXXXXX` (verify in AdMob console)
  - Banner Ad Unit ID: `ca-app-pub-6514143339893635/4741009217`
  - Test Banner ID (Google's official): `ca-app-pub-3940256099942544/6300978111`
- **Play Store listings** (English, French, Hindi/Urdu — 3 separate apps)
- **All verified Islamic content** — duas, hadiths, 99 Names, Salah steps, Wudu steps. JSON files copy over directly.
- **AI-generated home page card images.** PNG files in the existing repo's `attached_assets/generated_images/`.
- **Color scheme, typography, brand identity:**
  - Primary: `#0F766E` (teal-700)
  - Primary container: `#99F6E4`
  - Secondary: `#4DB6AC` (teal-300)
  - Background light: `#FFFFFF`, dark: `#121212`
  - Surface light: `#F5F5F5`, dark: `#1E1E1E`
  - Gold (for Quranic verses): `#C9A84C`
  - Fonts: Inter (UI) + Noto Naskh Arabic (Arabic text)

### Concepts/logic carries over, code gets rewritten

- **Audio chunking strategy:** 12-second WAV chunks at 16kHz mono. Same approach, native APIs.
- **Qibla calculation formula:** pure math, copy with syntax changes from `client/src/lib/qibla.ts`.
- **Prayer times:** the `adhan` JavaScript library works in Expo unchanged (it's pure JS with no DOM deps). Same calculation methods (MWL, ISNA, Egyptian, Umm al-Qura, Karachi, Tehran, Dubai, Kuwait, Qatar, Singapore, Turkey), same madhab options (Standard/Shafi vs Hanafi).
- **Navigation structure** — same 12 screens, same hierarchy.
- **Notification scheduling logic** — 5 prayers × 7 days, re-schedule on app resume, cap at ~50 to stay under platform limits.

### Must be rewritten

- All React/JSX components → React Native components (View, Text, Pressable, FlatList, ScrollView)
- Tailwind classes → StyleSheet objects or NativeWind (Tailwind for RN — strongly recommended, see Section 3.4)
- Capacitor plugins → Expo modules
- `wouter` router → Expo Router (file-based routing)
- Web Audio API → native audio module
- `localStorage` → `expo-secure-store` for sensitive, `AsyncStorage` for non-sensitive
- Vite build system → Expo's bundler (Metro)
- TanStack Query usage stays similar, just imports differ slightly

### Lost, not worth reusing

- The 8 unrouted "paused" pages in the Capacitor app (`action-points-page.tsx`, `analytics-page.tsx`, etc.) — they were never wired up. Don't port them. If those features come back in v2, design fresh.
- The PostgreSQL session/users schema. v1 ships anonymous, no accounts. When auth re-enables in the future, use Supabase Auth or Clerk, not the Replit OIDC setup.
- The four duplicated Capacitor configs (`capacitor.config.english.ts`, etc.) — Expo handles variants properly via `app.config.ts`.

---

## 3. Tech stack and architectural decisions

### 3.1 Core stack

- **Language:** TypeScript (strict mode)
- **Framework:** Expo SDK 54 (or newest stable at time of build)
- **Router:** Expo Router 5+ (file-based, similar to Next.js)
- **State management:** React Context for global config; TanStack Query (React Query) for server state; component-local `useState` for UI state. No Redux, no Zustand — the app isn't complex enough to justify them.
- **Styling:** NativeWind (Tailwind CSS for React Native). Owner already knows Tailwind from the Capacitor app, this carries over directly.
- **Build/distribution:** EAS Build (Expo's cloud build service). Means owner does not need a Mac for iOS builds, does not need Android Studio for routine APK/AAB generation.
- **Storage:** `expo-secure-store` for anything sensitive (none in v1, but reserve for future); `@react-native-async-storage/async-storage` for preferences, cached coords, cached prayer times.
- **Local DB:** None in v1. Quran bundled as JSON, duas/hadiths fetched from server with AsyncStorage fallback. If complexity grows later, `expo-sqlite` or `op-sqlite`.

### 3.2 Key Expo modules / native packages

```
# Networking
@tanstack/react-query

# Audio recording (live translation)
react-native-audio-record         # raw PCM access, the right choice for chunked upload
# (NOT expo-av — that's geared toward playback and recording-to-file, harder to chunk)

# Audio playback (Quran recitation, Salah guide pronunciations)
expo-av                            # or expo-audio (newer, watch for stable release)

# Location
expo-location

# Sensors (Qibla compass)
expo-sensors                       # accelerometer + magnetometer

# Haptics (Tasbih)
expo-haptics

# Notifications
expo-notifications

# Splash screen
expo-splash-screen

# Maps (Mosque finder)
react-native-maps                  # uses Google Maps on Android, Apple Maps on iOS
# Requires a Google Maps API key for Android

# AdMob
react-native-google-mobile-ads     # officially supported by Google

# Wake lock during recording
expo-keep-awake

# File system (for WAV writing)
expo-file-system

# Status bar / safe areas (handled by Expo Router by default, but useful to have)
expo-status-bar
react-native-safe-area-context

# Updates (OTA bug fixes without Play Store review)
expo-updates
```

### 3.3 Why these specific choices

- **`react-native-audio-record` over `expo-av` for recording.** `expo-av` records to a file, which means you'd have to read-and-chunk the file every 12 seconds. `react-native-audio-record` gives you raw PCM data in JS callbacks, you accumulate it in memory and emit WAV chunks cleanly. Much closer to the existing Capacitor implementation's logic.
- **`react-native-maps` over `MapLibre`.** Google Maps on Android is the default user expectation, search works out of the box, and you already have a Google Cloud account (Google Places API is in use for mosque finder).
- **`react-native-google-mobile-ads` over `expo-ads-admob`.** The latter was deprecated. The former is Google's official RN SDK and is the actively maintained option.
- **Expo Router over React Navigation directly.** File-based routing matches the owner's Next.js/wouter mental model. Less imperative config.
- **NativeWind over StyleSheet.** Owner has months of Tailwind muscle memory. Class names in JSX work identically to the Capacitor app.

### 3.4 NativeWind setup

NativeWind translates Tailwind classes to React Native styles at compile time. Setup is one config file:

```js
// tailwind.config.js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0F766E",
        "primary-container": "#99F6E4",
        secondary: "#4DB6AC",
        gold: "#C9A84C",
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
        arabic: ["NotoNaskhArabic_400Regular"],
        "arabic-bold": ["NotoNaskhArabic_700Bold"],
      },
    },
  },
};
```

Then in components:
```tsx
<View className="flex-1 bg-white pt-safe">
  <Text className="text-primary font-sans-semibold text-xl">Khutbah Companion</Text>
</View>
```

### 3.5 Fonts

Use `expo-font` with the `@expo-google-fonts/inter` and `@expo-google-fonts/noto-naskh-arabic` packages. Load once in the root layout.

```ts
// app/_layout.tsx
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { NotoNaskhArabic_400Regular, NotoNaskhArabic_700Bold } from '@expo-google-fonts/noto-naskh-arabic';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
    NotoNaskhArabic_400Regular, NotoNaskhArabic_700Bold,
  });

  if (!fontsLoaded) return null;
  return <Slot />;
}
```

Bundled into the app, not loaded from Google Fonts CDN. No network dependency, works offline.

---

## 4. Project structure

```
KhutbahCompanionExpo/
├── app/                                # Expo Router file-based routes
│   ├── _layout.tsx                     # Root layout — fonts, providers, splash control
│   ├── index.tsx                       # Home screen
│   ├── translation.tsx                 # Live translation
│   ├── prayer-times.tsx
│   ├── qibla.tsx
│   ├── quran/
│   │   ├── index.tsx                   # Surah list
│   │   └── [surahNumber].tsx           # Verse list (Expo Router dynamic route)
│   ├── duas.tsx
│   ├── hadith.tsx
│   ├── tasbih.tsx
│   ├── names.tsx                       # 99 Names of Allah
│   ├── mosques.tsx
│   ├── salah-guide.tsx           # 3-tab screen: Wudu | How to Pray | Prayers
│   └── settings.tsx
├── src/
│   ├── components/
│   │   ├── ui/                         # Reusable primitives — Card, Button, Skeleton, etc.
│   │   ├── BannerAd.tsx                # Wrapped AdMob banner
│   │   ├── ArabicText.tsx              # RTL-correct Arabic text wrapper
│   │   ├── PrayerTimeCard.tsx
│   │   ├── FeatureCard.tsx
│   │   ├── TranslationCard.tsx
│   │   ├── WheelPicker.tsx             # iOS-style picker for calculation methods
│   │   └── LiveClock.tsx               # Isolated ticking component (see audit P1 #12)
│   ├── lib/
│   │   ├── api.ts                      # Fetch wrapper around backend
│   │   ├── prayer-times.ts             # adhan library wrapper
│   │   ├── qibla.ts                    # Qibla calculation (port from Capacitor)
│   │   ├── notifications.ts            # Schedule/cancel prayer notifications
│   │   ├── audio-recorder.ts           # AudioRecord wrapper, chunking, WAV encoding
│   │   ├── storage.ts                  # AsyncStorage helpers (cached coords, prefs)
│   │   └── variant.ts                  # Reads APP_VARIANT for English/French/Hindi
│   ├── data/                           # Static JSON bundled into the app
│   │   ├── quran-arabic.json           # ~2 MB Uthmani script (114 surahs, 6236 verses)
│   │   ├── 99-names.json
│   │   ├── duas.json                   # Fallback if API fails
│   │   ├── hadiths.json                # Fallback if API fails
│   │   ├── salah-guide.json
│   │   └── wudu-guide.json
│   ├── hooks/
│   │   ├── usePrayerTimes.ts
│   │   ├── useLocation.ts
│   │   ├── useAudioRecorder.ts
│   │   ├── useCompass.ts
│   │   └── useColorScheme.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   └── typography.ts
│   └── types/
│       └── api.ts                      # TS types for backend responses
├── assets/
│   ├── fonts/                          # Fallback if @expo-google-fonts unavailable
│   ├── images/
│   │   ├── home-card-bg-*.webp         # AI-generated card backgrounds
│   │   ├── icon.png                    # 1024x1024 app icon
│   │   ├── adaptive-icon.png           # Android adaptive icon foreground
│   │   └── splash.png                  # Splash screen image
│   └── audio/                          # Salah/Wudu pronunciation MP3s
│       ├── takbir.mp3
│       ├── fatihah.mp3
│       └── ... etc
├── android/                            # Generated by `expo prebuild` when needed
├── ios/                                # Generated by `expo prebuild` when needed
├── app.config.ts                       # Expo config (replaces app.json for variant logic)
├── eas.json                            # EAS Build config
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── metro.config.js                     # Metro bundler config (NativeWind requires custom)
└── babel.config.js                     # Required by NativeWind
```

---

## 5. The 12 screens — full specification

For each screen: behavior, what carries over from Capacitor, key implementation notes. Match the existing app's behavior unless this document says otherwise.

### 5.1 Home Screen (`app/index.tsx`)

**Layout:**
- Edge-to-edge with safe area handling (Expo Router handles `pt-safe` via NativeWind)
- Sticky header:
  - Row 1: Settings icon (left) | "Khutbah Companion" (center, Inter SemiBold 20) | Theme toggle + Notification bell (right)
  - Row 2: "Assalamu Alaikum" (Inter SemiBold 16, teal) | "Your complete Islamic companion" (Inter Regular 12, secondary)
- Scrollable content (FlatList for perf):
  - Next Prayer card (countdown ticking every 1s — use `<LiveClock>` isolated component to avoid re-rendering the rest of the screen)
  - Feature grid: 2 columns of FeatureCard tiles in this order:
    1. Live Translation (mic icon, subtitle: "Real-time sermon translation")
    2. Prayer Times (clock icon, subtitle: next prayer + countdown)
    3. Quran Reader (book icon)
    4. Daily Duas (heart icon)
    5. Daily Hadith (star icon)
    6. Tasbih Counter (counter icon)
    7. Qibla Compass (compass icon)
    8. 99 Names of Allah ("99" icon)
    9. Mosque Finder (map-pin icon)
    10. Salah & Wudu Guide (prayer icon — 3 tabs: Wudu / How to Pray / Prayers)
    11. Settings
- Banner ad pinned to bottom, content padded to not overlap

**FeatureCard:** Card with background image (AI-generated teal/Islamic aesthetic from `assets/images/home-card-bg-*.webp`), icon overlay, title, subtitle. Rounded corners (rounded-xl in Tailwind = 12px).

**Render-first pattern:** Show the full layout with skeleton placeholders immediately. Prayer card uses cached coords for instant render. If no cached coords, show a "Get location" prompt instead of blocking the entire screen.

**Icons:** Use `lucide-react-native` (same family as the Capacitor app's `lucide-react`).

### 5.2 Live Translation (`app/translation.tsx`)

See [Section 6 — Live translation: the hard one](#6-live-translation--the-hard-one). This is the most complex screen and deserves its own section.

### 5.3 Prayer Times (`app/prayer-times.tsx`)

**Behavior:**
- Use cached coords + `adhan` library to compute times client-side (instant render)
- Refresh coords in background via `expo-location`, recompute if changed >0.5km
- Show all 5 prayers + Sunrise as cards with name (Arabic + English), time, "Next" badge
- Countdown to next prayer at top — use `<LiveClock>` to isolate the 1s tick
- Settings FAB → bottom sheet with WheelPicker for calculation method + madhab
- Cache the user's chosen method + madhab in AsyncStorage

**`adhan` usage (same library as Capacitor):**
```ts
import { CalculationMethod, Coordinates, PrayerTimes, Madhab } from 'adhan';

const coords = new Coordinates(lat, lng);
const params = CalculationMethod.MuslimWorldLeague(); // or user's selection
params.madhab = Madhab.Shafi; // or Hanafi based on user
const times = new PrayerTimes(coords, new Date(), params);
```

**Calculation methods to support:** MWL, ISNA, Egyptian, Umm al-Qura, Karachi, Tehran, Dubai, Kuwait, Qatar, Singapore, Turkey. (Same as Capacitor.)

### 5.4 Quran Reader (`app/quran/index.tsx` + `app/quran/[surahNumber].tsx`)

**Data:** Bundle full Quran as JSON in `src/data/quran-arabic.json` + `src/data/quran-saheeh.json`. Source: https://github.com/risan/quran-json (MIT licensed). ~2MB each compressed in the APK.

Why bundle: works offline, no external API dependency (the Capacitor app's reliance on `api.alquran.cloud` was a single point of failure).

**Surah list screen:**
- FlatList of 114 surahs
- Each row: number badge (teal circle), Arabic name (Noto Naskh Arabic), English transliteration (Inter Medium), verse count + Meccan/Medinan tag
- Tap → navigate to `/quran/[surahNumber]`

**Verse list screen:**
- FlatList with `windowSize` set carefully for perf (Al-Baqarah has 286 verses; use `getItemLayout` if measurable)
- Each verse:
  - Verse number in teal circle
  - Arabic text (Noto Naskh Arabic 22sp, RTL, right-aligned)
  - Translation (Inter Regular 15sp)
  - Audio play button (uses `expo-av` to stream from `https://cdn.islamic.network/quran/audio/128/ar.alafasy/{globalVerseId}.mp3`)
- Basmalah header on every surah except At-Tawbah (#9)
- Font size slider in screen header
- Remember last position (surah + verse) in AsyncStorage
- Auto-play next verse when one ends

**Important:** Use FlatList, not ScrollView with mapped items. For long surahs this is the difference between smooth scroll and jank on low-end devices.

### 5.5 Daily Duas (`app/duas.tsx`)

**Data flow:** Fetch from `/api/duas` on mount, cache in AsyncStorage, fall back to bundled `src/data/duas.json` if API fails.

**Structure:**
```ts
type Dua = {
  id: number;
  category: string;       // "Morning", "Evening", "Eating", etc.
  titleEnglish: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;         // "Hisnul Muslim, p.XX"
};
```

**All content verified from Hisnul Muslim** — copy bundled JSON from existing Capacitor app's seed data.

**UI:**
- Horizontal category chip row at top (All, Morning, Evening, Eating, Sleeping, Travel, etc.)
- Filtered FlatList of DuaCard
- Each DuaCard: category badge, title, Arabic (RTL), transliteration (italic, muted), translation, source, copy-translation button
- Search bar to filter by keyword

### 5.6 Daily Hadith (`app/hadith.tsx`)

**Data:** Fetch from `/api/hadith/daily`. Server returns today's hadith based on a date hash rotation through 86 verified hadiths. Cache today's hadith in AsyncStorage with a date key — only refetch on a new day.

**All hadiths verified from Sahih Bukhari and Sahih Muslim** — content lives on server.

**UI:**
- Single full-screen card
- Header: back arrow | "Daily Hadith" | share icon
- Card: date chip, Arabic (Noto Naskh Arabic 20sp RTL), translation (Inter 16sp), narrator + source footer
- Share button → `Share.share({ message: translation + '\n— ' + source })` from `react-native`

### 5.7 Tasbih Counter (`app/tasbih.tsx`)

**State:** Not persisted across app launches. Reset on screen exit (intentional).

**UI:**
- Large counter (Inter Bold 96sp, center)
- "X / target" below
- Circular progress ring around the number
- Huge tappable area (minimum 200dp tall) — basically the entire center
- Dhikr selector at bottom with WheelPicker:
  - SubhanAllah ×33
  - Alhamdulillah ×33
  - Allahu Akbar ×34
  - La ilaha illallah ×100
  - Astaghfirullah ×100
  - Allahu Akbar ×99 (Tasbih Fatimah)
- Reset button with confirmation dialog
- Session total

**Haptics:**
```ts
import * as Haptics from 'expo-haptics';

// Every tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Target reached
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

**On target reached:** brief confetti animation (use `react-native-reanimated` for this), pause ~500ms, auto-reset counter (keep dhikr selection).

### 5.8 Qibla Compass (`app/qibla.tsx`)

**Sensors via `expo-sensors`:**
```ts
import { Magnetometer, Accelerometer } from 'expo-sensors';

Magnetometer.setUpdateInterval(100); // 10Hz — throttled to avoid jank (audit P1 #18)
const sub = Magnetometer.addListener(data => {
  // compute heading
});
```

**Qibla calculation** (port from Capacitor `client/src/lib/qibla.ts`):
```ts
export function calculateQiblaAngle(userLat: number, userLng: number): number {
  const meccaLat = 21.4225 * Math.PI / 180;
  const meccaLng = 39.8262 * Math.PI / 180;
  const lat = userLat * Math.PI / 180;
  const lng = userLng * Math.PI / 180;
  const dLng = meccaLng - lng;
  const y = Math.sin(dLng) * Math.cos(meccaLat);
  const x = Math.cos(lat) * Math.sin(meccaLat) - Math.sin(lat) * Math.cos(meccaLat) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
```

**UI:**
- Compass rose drawn with `react-native-svg` or `react-native-reanimated` (smoother)
- Needle always points to Mecca (rotates as device rotates)
- Distance to Mecca text below ("4,235 km")
- Cache last known coords for instant render

### 5.9 99 Names of Allah (`app/names.tsx`)

**Data:** Bundled `src/data/99-names.json`. No API call. Verified from classical sources (copy from existing Capacitor app).

**UI:**
- Search bar at top (filters by Arabic / transliteration / meaning)
- FlatList of NameCard:
  - Number in teal circle
  - Arabic name (Noto Naskh Arabic 24sp, RTL)
  - Transliteration (Inter Medium 16sp) — e.g. "Ar-Rahman"
  - Meaning (Inter Regular 14sp, muted) — e.g. "The Most Gracious"
  - Tap to expand brief explanation
- Use `useEffect(() => listRef.current?.scrollToIndex({index: 0})` on mount — match Capacitor behavior

### 5.10 Mosque Finder (`app/mosques.tsx`)

**API:** `GET /api/mosques/nearby?lat={lat}&lng={lng}&radius=5000` — already exists, uses Google Places + Overpass fallback.

**UI:**
- Top half (55%): map via `react-native-maps`
  - Mosque pins as markers
  - Tap pin → callout with name + "Get Directions" button (opens native maps app via `Linking.openURL('geo:lat,lng')` on Android, `https://maps.apple.com/?ll=lat,lng` on iOS)
- Bottom half (45%): FlatList of MosqueCard (name, distance, address, phone link, website link)
- Toggle button to switch between split view and list-only

**Google Maps API key:** Required for Android (iOS uses Apple Maps by default with `react-native-maps`). Store in `app.config.ts`:
```ts
android: {
  config: {
    googleMaps: {
      apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
    },
  },
},
```
Restrict the key in Google Cloud Console to your app's package + SHA-1 fingerprint.

### 5.11 Salah & Wudu Guide (`app/salah-guide.tsx`)

This is **one screen with three tabs**: **Wudu** | **How to Pray** | **Prayers**. There is no separate `wudu-guide.tsx` route — Wudu is a tab inside Salah Guide, matching the live Capacitor app structure.

#### Tab 1 — Wudu

Swipeable flashcard flow through 10 steps. 8 of the 10 steps have an illustration image; steps 1 (Niyyah/Bismillah) and 10 (Closing Dua) are text-only.

**Images — ready to use** (`assets/images/wudu/`):
- `wudu-hands.jpg` — Step 2: Wash the Hands
- `wudu-mouth.jpg` — Step 3: Rinse the Mouth
- `wudu-nose.jpg` — Step 4: Cleanse the Nose
- `wudu-face.jpg` — Step 5: Wash the Face
- `wudu-arms.jpg` — Step 6: Wash the Arms
- `wudu-head.jpg` — Step 7: Wipe the Head & Neck
- `wudu-ears.jpg` — Step 8: Wipe the Ears
- `wudu-feet.jpg` — Step 9: Wash the Feet

**Data:** Bundled `src/data/wudu-guide.json`. Copy from Capacitor app's `client/src/data/wudu-steps.ts`.

**UI:** Swipe-through flashcard. One card per step; image fills the top ~65% of the card, step title + description + any note below. Steps 1 and 10 are text-only (full-height content area, no image).

#### Tab 2 — How to Pray

General guidance on how to perform Salah: structure, rakats per prayer, what to recite and when. Content TBD — design this in Week 7.

#### Tab 3 — Prayers

Prayer-specific step-by-step flows for Fajr, Dhuhr, Maghrib, and Isha. Prayer is selected via chips at the top; steps are a horizontal pager.

**Note:** In the Capacitor app this was implemented as vertical scroll. **In the Expo version, ship it as swipe from day one** — use `FlatList horizontal pagingEnabled` or `react-native-pager-view`.

**Data:** Bundled `src/data/salah-guide.json`. 4 prayer flows (Fajr 2 rakats, Dhuhr 4, Maghrib 3, Isha 4).

```ts
type SalahStep = {
  id: number;
  title: string;        // "Takbiratul Ihram"
  description: string;  // "Raise both hands to your earlobes and say:"
  arabic?: string;      // "اللَّهُ أَكْبَرُ"
  transliteration?: string;
  translation?: string;
  audioFile?: string;   // "takbir" — maps to assets/audio/takbir.mp3
  imageRes?: string;
};
```

**UI:**
- Prayer selector chips at top (Fajr / Dhuhr / Maghrib / Isha) — tapping resets to step 1
- Horizontal pager with one step per page
- Each step card: number + title, illustration, Arabic (gold color for Quranic text — Fatihah is Quranic), transliteration, English, audio play button
- Pager indicators (dots) at bottom

**Content note:** All Arabic text was verified during the Capacitor build. Copy the JSON directly without re-verification.

#### ⚠️ Salah posture images — do NOT use

6 posture PNGs were imported into `assets/images/salah/` (`takbir.png`, `qiyam.png`, `ruku.png`, `sujood.png`, `jalsah.png`, `tasleem.png`) from the Capacitor repo for reference. **These images are not religiously accurate and must not be used in the app.** New illustrations will be AI-generated in Week 7 using prompts reviewed and approved by the owner before generation.

### 5.12 Settings (`app/settings.tsx`)

**Stored in AsyncStorage:**
- `calculationMethod` (string)
- `asrMadhab` ("Standard" | "Hanafi")
- `theme` ("light" | "dark" | "system")
- `notificationEnabled.fajr/dhuhr/asr/maghrib/isha` (boolean per prayer)

**UI sections:**
- Prayer Times: Calculation Method (bottom sheet with WheelPicker), Madhab (bottom sheet)
- Notifications: Toggle per prayer
- Appearance: Light / Dark / System (segmented buttons)
- About: App version, Privacy Policy link, Rate on Play Store link, "Made by Akber Khan in Dubai 🇦🇪"

---

## 6. Live translation — the hard one

This is the screen the entire app exists for. Read this section in full before writing code.

### 6.1 The flow

1. User taps the Live Translation tile on home
2. **First visit only:** show 3-card horizontal swipeable disclaimer
   - Card 1: "How it works — hold your phone toward the imam"
   - Card 2: "Language — translates to {English|French|Urdu} based on app variant"
   - Card 3: "Accuracy — AI may make mistakes, verify important rulings with scholars"
   - "I Understand, Start" button on final card dismisses + sets `disclaimerShown = true` in AsyncStorage
3. Main translation UI shown. Pre-warm audio pipeline on mount (request mic permission lazily on first record tap, not eagerly).
4. User taps mic → start recording. Show waveform animation, "Translation in 12s" countdown, "Stop" button.
5. Every 12 seconds, snapshot recorded audio as a WAV blob, POST to `/api/transcribe`, render the response as a TranslationCard.
6. Recording continues uninterrupted while previous chunk uploads.
7. Newest card at bottom, auto-scroll to it.
8. Quranic verses get a gold border + star icon (server returns `isQuran: true`).

### 6.2 Audio pipeline architecture

```
                                                  ┌──────────────────────┐
                                                  │  TranslationCard 1   │
                                                  │  TranslationCard 2   │
                                                  │  TranslationCard 3   │
                                                  │       ...            │
                                                  └──────────────────────┘
                                                            ▲
                                                            │ render
                                                  ┌──────────────────────┐
                                                  │  React Native UI     │
                                                  │  (translation feed)  │
                                                  └──────────────────────┘
                                                            ▲
                                                            │ state update on each response
                                                            │
┌───────────────────┐   12s chunks   ┌────────────────┐    │
│ react-native-     │ ─────────────► │ WAV encoder    │    │
│ audio-record      │   PCM data     │ in-memory      │    │
│ (native thread)   │                └────────┬───────┘    │
└───────────────────┘                         │            │
                                              ▼            │
                                     ┌────────────────┐    │
                                     │ Upload queue   │────┘
                                     │ (parallel      │   POST /api/transcribe
                                     │  with continued│
                                     │  recording)    │
                                     └────────────────┘
```

**Critical design points:**

- **Recording does NOT pause for upload.** Use two parallel coroutines:
  - Coroutine A continuously reads PCM data from the recorder into a rolling buffer
  - Every 12 seconds, coroutine A snapshots the buffer and pushes a WAV chunk into an upload queue
  - Coroutine B drains the upload queue, POSTing each chunk to `/api/transcribe` in parallel
- **Use `Promise.all` / queue concurrency = 2-3 max.** If responses come back faster than the user can read, queue them. If they pile up (slow network), the recording continues regardless.
- **WAV encoding in JS is fine.** PCM → WAV is a 44-byte header + raw bytes. It's fast. No native module needed.

### 6.3 `react-native-audio-record` setup

```ts
// src/lib/audio-recorder.ts
import AudioRecord from 'react-native-audio-record';

const config = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6, // VOICE_RECOGNITION on Android
  wavFile: '', // we'll handle WAV creation manually
};

export class AudioRecorderManager {
  private buffer: Uint8Array[] = [];
  private chunkInterval: NodeJS.Timeout | null = null;
  private isRecording = false;
  private onChunkCallback: ((wav: Uint8Array) => void) | null = null;

  async start(onChunk: (wav: Uint8Array) => void) {
    this.onChunkCallback = onChunk;
    AudioRecord.init(config);

    // Continuous PCM data callback
    AudioRecord.on('data', (data: string) => {
      // data is base64-encoded PCM
      const bytes = Buffer.from(data, 'base64');
      this.buffer.push(new Uint8Array(bytes));
    });

    AudioRecord.start();
    this.isRecording = true;

    // Every 12 seconds, snapshot and emit
    this.chunkInterval = setInterval(() => {
      if (this.buffer.length === 0) return;
      const merged = this.mergeBuffer();
      this.buffer = []; // reset for next chunk
      const wav = this.encodeWav(merged);
      this.onChunkCallback?.(wav);
    }, 12_000);
  }

  async stop() {
    this.isRecording = false;
    if (this.chunkInterval) clearInterval(this.chunkInterval);
    await AudioRecord.stop();
    // Final chunk if any
    if (this.buffer.length > 0) {
      const merged = this.mergeBuffer();
      const wav = this.encodeWav(merged);
      this.onChunkCallback?.(wav);
      this.buffer = [];
    }
  }

  pause() {
    this.isRecording = false;
    if (this.chunkInterval) clearInterval(this.chunkInterval);
    AudioRecord.stop();
    // Don't clear buffer — resume picks up where we left off
  }

  resume() {
    this.isRecording = true;
    AudioRecord.start();
    this.chunkInterval = setInterval(() => { /* same as start */ }, 12_000);
  }

  private mergeBuffer(): Uint8Array {
    const totalLength = this.buffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.buffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  }

  private encodeWav(pcm: Uint8Array): Uint8Array {
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataSize = pcm.length;
    const fileSize = 36 + dataSize;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize, true);
    this.writeString(view, 8, 'WAVE');
    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);            // chunk size
    view.setUint16(20, 1, true);              // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    // PCM data
    new Uint8Array(buffer, 44).set(pcm);

    return new Uint8Array(buffer);
  }

  private writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
}
```

### 6.4 Upload pipeline

```ts
// src/lib/translation-upload.ts
const MAX_CONCURRENT = 2;
const queue: Array<{ wav: Uint8Array, resolve: (r: TranscribeResponse) => void, reject: (e: any) => void }> = [];
let active = 0;

export async function uploadChunk(wav: Uint8Array, targetLanguage: string): Promise<TranscribeResponse> {
  return new Promise((resolve, reject) => {
    queue.push({ wav, resolve, reject });
    processQueue(targetLanguage);
  });
}

async function processQueue(targetLanguage: string) {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const item = queue.shift()!;
    active++;
    doUpload(item.wav, targetLanguage)
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        active--;
        processQueue(targetLanguage);
      });
  }
}

async function doUpload(wav: Uint8Array, targetLanguage: string): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', {
    uri: `data:audio/wav;base64,${Buffer.from(wav).toString('base64')}`,
    type: 'audio/wav',
    name: 'chunk.wav',
  } as any);
  formData.append('targetLanguage', targetLanguage);

  const response = await fetch('https://khutbah-translate.replit.app/api/transcribe', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

### 6.5 Foreground-only behavior with brief-interruption tolerance (option b1)

The owner explicitly chose: **screen must be on while recording**, but **brief app-switching for notifications should not kill the recording**.

Implementation:
- Acquire wake lock via `expo-keep-awake` when recording starts: `activateKeepAwakeAsync('khutbah-recording')`
- Release wake lock on stop or unmount: `deactivateKeepAwake('khutbah-recording')`
- Use `AppState.addEventListener('change', ...)` to detect background/foreground:
  - When app goes background: start a 30-second grace timer
  - If app returns to foreground within 30s: cancel timer, continue recording
  - If 30s elapses while backgrounded: stop recording cleanly, show a notification "Recording stopped — return to app to resume"
- Do NOT implement a foreground service. That would be the (a) option — owner chose against it.

```ts
// In TranslationScreen
import { AppState } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

useEffect(() => {
  if (isRecording) activateKeepAwakeAsync('khutbah-recording');
  return () => deactivateKeepAwake('khutbah-recording');
}, [isRecording]);

useEffect(() => {
  let graceTimer: NodeJS.Timeout | null = null;
  const subscription = AppState.addEventListener('change', (state) => {
    if (!isRecording) return;
    if (state === 'background') {
      graceTimer = setTimeout(() => {
        recorderRef.current?.stop();
        // optional: post a local notification informing user
      }, 30_000);
    } else if (state === 'active' && graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
  });
  return () => {
    subscription.remove();
    if (graceTimer) clearTimeout(graceTimer);
  };
}, [isRecording]);
```

### 6.6 UI details

- Mic button: large circle, pulsing animation when idle ("Tap to Start"), waveform animation when recording
- Recording timer: HH:MM:SS, prominently displayed
- "Translation in Xs" countdown to next translation arrival (12s countdown that resets after each chunk)
- "Recording" badge in top-right of header with red dot
- Translation feed: FlatList, newest at bottom, auto-scroll on new card
- Each TranslationCard:
  - Arabic transcription (Noto Naskh Arabic 18sp, RTL, right-aligned)
  - English translation (Inter Regular 16sp, left-aligned)
  - Subtle divider
  - Gold border + star icon if `isQuran === true`
- Pause / Stop buttons at bottom

### 6.7 Server-side enhancement: Adhan lookup

The owner noted the Adhan in particular gets translated poorly because Whisper sometimes mis-transcribes it. **This is a server-side fix, not a client one.** Suggest to the backend Claude chat:

Add to `server/openai-service.ts` before calling OpenAI: check if the transcription matches known Adhan phrases (Shahada, Allahu Akbar, hayya 'ala salah, hayya 'ala falah, etc.) with fuzzy matching (Levenshtein < 30%). If match, substitute the canonical translation rather than running through GPT.

The Adhan is fixed text. A dictionary of ~12 canonical phrases handles 95% of Adhan/Iqamah audio. This is hours of work, not days.

**Important:** Do NOT implement this in the Expo client. It belongs on the server. Note it in the Expo handoff so the owner remembers to assign it to the backend track.

---

## 7. Backend (don't rebuild)

**The backend stays.** `https://khutbah-translate.replit.app`. Don't touch unless instructed.

### Active endpoints the Expo app uses

| Endpoint | Method | Use |
|---|---|---|
| `POST /api/transcribe` | multipart/form-data | `audio` (WAV blob) + `targetLanguage` (string). Returns `{ transcription, translation, isQuran, confidence }` |
| `GET /api/hadith/daily` | — | Today's hadith |
| `GET /api/duas` | — | All duas |
| `GET /api/mosques/nearby?lat=&lng=&radius=` | — | Nearby mosques |
| `GET /api/quran/surahs` | — | NOT USED — Expo bundles Quran locally |
| `GET /api/quran/surah/:n` | — | NOT USED |
| `GET /api/prayer-times` | — | NOT USED — Expo computes client-side with `adhan` |

### Backend improvements being handled separately

The Capacitor Claude chat is applying these as part of the existing HANDOFF.md Phase 1:
- OpenAI monthly hard cap ($50)
- Helmet middleware + tightened rate limits (20/min, 300/day on `/api/transcribe`)
- Generic error messages (stop leaking `error.message`)
- Gate `setupAuth()` behind `ENABLE_AUTH=true` env var

Once those land, no further backend work is needed for the Expo launch.

### Backend changes the Expo Claude should request from the owner

These are not Expo work, but flag them to the owner when relevant:

1. **Adhan canonical lookup** (Section 6.7) — improves accuracy on the most common test case
2. **`/api/hadith/daily` and `/api/duas` should set `Cache-Control: max-age=86400`** so AsyncStorage caching is effective at the HTTP layer too

---

## 8. Build flavors for 3 Play Store variants

Expo handles this via `app.config.ts` reading an env var:

```ts
// app.config.ts
import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

const variant = process.env.APP_VARIANT ?? 'english';

const variantConfig: Record<string, { name: string; appId: string; lang: string }> = {
  english: { name: 'Khutbah Companion',           appId: 'com.khutbahcompanion.app',     lang: 'English' },
  french:  { name: 'Khutbah Companion - Français',appId: 'com.khutbahtranslate.french',  lang: 'French' },
  hindi:   { name: 'Khutbah Companion - हिन्दी', appId: 'com.khutbahtranslate.hindi',   lang: 'Urdu' },
};

const cfg = variantConfig[variant];

const config: ExpoConfig = {
  name: cfg.name,
  slug: 'khutbah-companion',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'khutbahcompanion',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F766E',
  },
  android: {
    package: cfg.appId,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0F766E',
    },
    versionCode: 1,
    permissions: [
      'INTERNET',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'RECORD_AUDIO',
      'POST_NOTIFICATIONS',
      'RECEIVE_BOOT_COMPLETED',
      'SCHEDULE_EXACT_ALARM',
      'WAKE_LOCK',
      'VIBRATE',
      'com.google.android.gms.permission.AD_ID',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
  ios: {
    bundleIdentifier: cfg.appId,
    buildNumber: '1',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Khutbah Companion uses your location for accurate prayer times and Qibla direction.',
      NSMicrophoneUsageDescription: 'Khutbah Companion uses your microphone to record and translate sermons in real-time.',
      NSUserTrackingUsageDescription: 'Khutbah Companion uses your activity data to show ads relevant to you.',
      UIBackgroundModes: ['audio'], // for brief background tolerance (b1)
    },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-location',
    'expo-secure-store',
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: 'ca-app-pub-6514143339893635~XXXXXXXXXX',
        iosAppId: 'ca-app-pub-6514143339893635~YYYYYYYYYY',
      },
    ],
  ],
  extra: {
    targetLanguage: cfg.lang,
    variant,
  },
};

export default config;
```

Build commands:
```bash
APP_VARIANT=english eas build --platform android --profile production
APP_VARIANT=french eas build --platform android --profile production
APP_VARIANT=hindi eas build --platform android --profile production
```

---

## 9. AdMob integration

```ts
// src/components/BannerAd.tsx
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

const isProduction = !__DEV__;
const adUnitId = isProduction
  ? 'ca-app-pub-6514143339893635/4741009217'
  : TestIds.BANNER; // Google's official test ID — never causes account issues

export function AppBannerAd() {
  return (
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: false,
      }}
    />
  );
}
```

Initialize once in root layout:
```ts
// app/_layout.tsx
import mobileAds from 'react-native-google-mobile-ads';

useEffect(() => {
  mobileAds().initialize().then(() => console.log('AdMob ready'));
}, []);
```

**Place banners at the bottom of every screen** by wrapping `<Slot />` in the root layout:
```tsx
<View className="flex-1">
  <Slot />
  <AppBannerAd />
</View>
```

UMP consent (for EU users) — install `react-native-google-mobile-ads`'s `AdsConsent` and call `AdsConsent.requestInfoUpdate()` before initializing ads. The library handles the consent form UI.

---

## 10. Notifications

```ts
// src/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import { computePrayerTimes } from './prayer-times';
import { getCachedCoords } from './storage';

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const coords = await getCachedCoords();
  if (!coords) return;

  const settings = await getNotificationSettings();
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const times = computePrayerTimes(coords.latitude, coords.longitude, date);

    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      const t = times[prayer];
      if (t.getTime() <= now.getTime()) continue;
      if (!settings[prayer]) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${prayer.charAt(0).toUpperCase()}${prayer.slice(1)} Prayer`,
          body: `It's time for ${prayer} prayer`,
          sound: 'default',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: t },
      });
    }
  }
}

// Re-run on app foreground
import { AppState } from 'react-native';
AppState.addEventListener('change', (state) => {
  if (state === 'active') scheduleAllNotifications().catch(console.error);
});
```

---

## 11. Permissions

Request lazily, in context, never on first launch:

| Permission | When to request | Why |
|---|---|---|
| Location | First time user opens Prayer Times, Qibla, or Mosque Finder | Don't ask on launch — it's invasive |
| Notifications | After user toggles notifications on in Settings | Don't ask preemptively |
| Microphone | When user taps "Start Recording" on Translation screen | Most contextual |

Each request should be preceded by an in-app explanation if it's the first time:

```ts
async function ensureMicPermission(): Promise<boolean> {
  const current = await Audio.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (current.canAskAgain) {
    // show modal: "Khutbah Companion needs microphone access to record and translate the khutbah..."
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }
  // permanently denied — show modal pointing user to system settings
  return false;
}
```

---

## 12. Phased build plan (10-12 weeks)

At 10-15 hrs/week. Each week ends with something testable on a real device.

### Week 1 — Foundation
- Initialize Expo project (`npx create-expo-app KhutbahCompanionExpo --template tabs@latest`)
- Configure NativeWind, fonts, theme tokens
- Set up Expo Router file structure
- Build root layout with safe area handling
- Configure `app.config.ts` for 3 variants
- Set up EAS Build, generate first dev build
- Deliverable: empty app boots on test device, shows home screen placeholder

### Week 2 — Home screen + navigation skeleton
- Home screen with feature grid (11 tiles), AI-generated card backgrounds
- Bottom banner ad placeholder (real AdMob integration in Week 9)
- Stub all 11 feature screens (empty pages with titles, working navigation)
- LiveClock component
- Theme toggle in header
- Deliverable: navigation works between all screens

### Week 3 — Prayer Times + Qibla
- Prayer Times screen with adhan computation, cached coords, WheelPicker for settings
- Qibla screen with magnetometer + accelerometer, compass rose drawing
- Location permission flow
- Both pages render instantly from cache, update in background
- Deliverable: two fully working feature screens

### Week 4 — Tasbih + 99 Names + Daily Hadith
- Tasbih with haptics, dhikr selector, target completion animation
- 99 Names with search filter, bundled JSON, scroll-to-top on mount
- Daily Hadith with API fetch + AsyncStorage cache, share button
- Deliverable: three more screens done

### Week 5 — Daily Duas + Quran reader (surah list only)
- Daily Duas with category chips, search, copy button
- Quran surah list (114 surahs), bundled JSON
- Deliverable: 8 of 13 screens working

### Week 6 — Quran verse reader + audio
- Quran verse list with FlatList performance tuning
- expo-av audio playback for verses
- Auto-play next verse
- Font size slider
- Remember last position
- Deliverable: Quran reader fully functional

### Week 7 — Salah Guide + Wudu Guide
- Both as horizontal pagers, audio playback per step
- Verified Arabic content from existing Capacitor JSON
- Deliverable: 10 of 12 screens working

### Week 8 — Mosque Finder
- `react-native-maps` integration with Google Maps API key
- Mosque pins, callouts, get directions
- List view alongside map
- Pull to refresh
- Deliverable: 11 of 12 screens working

### Week 9 — Live Translation (the big one)
- Disclaimer walkthrough on first visit
- AudioRecorder manager with 12s chunking
- Upload queue with parallel uploads
- TranslationCard rendering, gold border for Quranic
- Pause/Stop, wake lock, AppState background tolerance (b1 — 30s grace)
- Pre-warm audio on mount
- Deliverable: full app, all 12 screens
- **Test extensively on real device with real mosque audio if possible**

### Week 10 — AdMob + Notifications
- Replace banner placeholder with real AdMob
- UMP consent for EU
- Notification scheduling (7-day window, re-schedule on resume)
- Settings screen wired to AsyncStorage
- Deliverable: monetized, notified, settings persist

### Week 11 — Polish + Play Store prep
- Splash screen (should "just work" via expo-splash-screen — verify across devices)
- App icon (1024×1024 + adaptive icon foreground)
- Screenshots for Play Store listing (use Android emulator at 1080×1920)
- Privacy policy URL (reuse existing)
- ProGuard / R8 verification (Expo handles minification automatically in production builds)
- Performance pass: scroll smoothness, app size check, cold start measurement
- Bug fixes from real-device testing
- Deliverable: release build candidate

### Week 12 — Submit + iterate
- Generate signed AAB for all 3 variants via EAS
- Upload to Play Console (closed testing track first)
- Internal testers review (the owner + family/friends)
- Fix critical issues, resubmit
- Open testing → production rollout
- Deliverable: live on Play Store

### Buffer / risk

This plan has no buffer. Real-world things go wrong. If you hit week 12 and there's still work, that's normal. The plan exists to give a shape to the project, not to be hit perfectly.

---

## 13. Launch checklist

Before submitting to Play Store:

**Code:**
- [ ] All 12 screens functional
- [ ] Live translation tested on real device for at least one 20-minute session
- [ ] All 3 build variants compile via `eas build`
- [ ] No `console.log` in production code (use EAS env-aware logger if needed)
- [ ] TypeScript: `tsc --noEmit` passes with zero errors
- [ ] No `any` types in business logic

**AdMob:**
- [ ] Real ad unit IDs in production builds
- [ ] Test ad IDs in dev builds
- [ ] UMP consent flow works on EU IPs
- [ ] AdMob App ID in `app.config.ts` matches AdMob console exactly

**Permissions:**
- [ ] All permissions in `app.config.ts` are actually used (Play Store warns about declared-but-unused)
- [ ] Each permission has a clear in-app rationale before request
- [ ] App handles permanent denial gracefully (e.g., mosque finder shows "Enable location in Settings" instead of blank screen)

**Maps:**
- [ ] Google Maps API key restricted to package name + SHA-1 in Google Cloud Console
- [ ] Billing enabled on Google Cloud project (mosque searches will fail silently otherwise)

**Notifications:**
- [ ] Notification icon is a transparent monochrome silhouette (not the colored launcher icon)
- [ ] `POST_NOTIFICATIONS` permission works on Android 13+
- [ ] Re-scheduling on app foreground tested

**Translation:**
- [ ] Disclaimer walkthrough shows on first launch only (verify via clearing app data)
- [ ] Wake lock acquired during recording, released on stop
- [ ] 30s background grace works (test by backgrounding mid-recording for 10s, then 40s)
- [ ] Translation cards render correctly for Arabic + English

**Play Console:**
- [ ] Privacy policy URL live and accessible
- [ ] Data safety questionnaire completed honestly (location, microphone, ad ID all collected)
- [ ] Content rating completed
- [ ] Store listing: short description, full description, 4-8 screenshots, feature graphic (1024×500)
- [ ] Closed testing tested on at least 1 real device per variant before production rollout

---

## 14. Features paused for v1

Build the architecture to accommodate these, but don't implement them. When asked to add a feature not in the 12 screens, check this list first:

- **User accounts** — when re-enabled, use Supabase Auth (not Replit OIDC). Add `users` table to backend.
- **Premium tier** — Stripe in-app purchases via `react-native-purchases` (RevenueCat) or `expo-in-app-purchases`
- **Sermon history** — save each translation session to local DB + sync to server when authed
- **Notes per sermon** — text notes attached to a sermon
- **Action points** — extract user-flagged commitments from translation feed
- **Missed prayer (Qada) tracker** — per-prayer count + history
- **Hadith favorites** — bookmarked hadiths
- **Dua favorites**
- **Hijri calendar** — month view with Islamic events
- **Ramadan features** — Suhoor/Iftar countdown, Tarawih tracker
- **Community khutbah archive** — share translations
- **Analytics dashboard** — prayer streaks, tasbih history

For v1, **resist scope creep**. Ship 12 screens, launch, get user feedback, then decide which paused features users actually want.

---

## 15. Working agreement for the AI taking over

This section is for you, the AI assistant reading this in a fresh chat.

### Who you're working with

The owner is Akber Khan, based in Dubai. Non-technical, uses AI tools (Claude Code primarily) on Windows with PowerShell. He's been building the Capacitor version for months with another AI chat, and a parallel effort is shipping that version to Play Store using a separate HANDOFF.md. He's spent real time and money on this — meet him where he is.

He prefers:
- Direct technical answers over managed ones
- PowerShell over WSL
- One concrete task per session over batching everything
- Being told the truth even when uncomfortable

### What he wants

In order of priority:
1. Speed (cold start, audio responsiveness, scroll smoothness)
2. Audio reliability during khutbah recording
3. Play Store ready
4. Feature parity with the Capacitor version

He does NOT want:
- Suggestions to rebuild in something else (this IS the rebuild)
- Suggestions to add features not in Section 14
- Long preambles — get to the work
- To be asked permission for things this document already authorizes

### How to work with him

1. **Always confirm file state before editing.** Files may have changed since you last looked.
2. **One Section 12 week at a time.** Don't try to batch multiple weeks. He has 10-15 hrs/week and needs to test each chunk on his real device (Vivo V2413 — Android 15) before moving on.
3. **Run on his Windows + Claude Code setup.** Project will live at something like `C:\Users\Dell\KhutbahCompanionExpo\`. Use PowerShell commands. Use forward slashes in code (Node handles both) but backslashes when calling `cd` etc.
4. **After every code change, suggest the verification step.** For Expo, that's usually `npx expo start` and reload on device.
5. **If something this document doesn't cover comes up, surface it clearly.** "This wasn't in the handoff — here's what I found and what I propose." Don't silently expand scope.
6. **The Capacitor version is at `https://github.com/khutbaapp1-debug/KhutbahTranslate`.** When you need to know how a feature is supposed to behave, the existing app is the spec. Read the relevant page in the Capacitor `client/src/pages/` folder if you can.

### Useful commands

```powershell
# Working directory (he'll create this)
cd C:\Users\Dell\KhutbahCompanionExpo

# Install
npm install

# Run dev server
npx expo start
# Then scan QR code with Expo Go app on the test phone

# Run on Android (auto-launches emulator/device)
npx expo run:android

# Create a production build via EAS (cloud)
eas build --platform android --profile production
# (Requires `npx expo install eas-cli` and `eas login` first time)

# Add a new Expo module
npx expo install expo-haptics

# Add a non-Expo npm package
npm install some-package

# Type-check
npx tsc --noEmit

# Run on a specific variant
APP_VARIANT=french npx expo start
```

### Speed budgets the user is targeting

- Cold start: tap icon → home screen with prayer times visible = under 1 second
- Tab navigation: under 100ms
- Tap-to-recording-start: under 100ms (after first record in session)
- Quran scroll: 60fps on Vivo V2413

If your changes regress any of these, say so and offer a fix or rollback.

### Files you'll touch most often

- `app/index.tsx` and `app/_layout.tsx` — home + root layout
- `app/translation.tsx` — the hard screen
- `src/lib/audio-recorder.ts` — the audio pipeline
- `src/lib/notifications.ts`, `src/lib/prayer-times.ts`
- `src/components/*` — reusable UI primitives
- `app.config.ts` — Expo + variant config
- `tailwind.config.js`

### What done looks like

Section 13 launch checklist passes + the app is live on Play Store in at least one variant. Then iterate on the others.

Good luck. The owner has done the hard product work already — your job is to translate that work into a faster, more reliable native shell.