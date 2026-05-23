# KhutbahCompanionExpo — Agent Guide

## Stack (pinned)

- **Expo SDK 55** — pinned to `~55.0.0` in `package.json`. This project is **not** on SDK 56.
  Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing
  any code that touches Expo APIs — Expo's API surface changes between SDK versions.
- **React Native** `0.83.6`, **React** `19.2.0`.
- **TypeScript** `~5.9.2`.

## Tooling

- **Package manager: npm** (the repo has a `package-lock.json`). Do **not** use pnpm, yarn, or bun.
- Start the dev server: `npx expo start` (or `npm run start`).
  Platform shortcuts: `npm run android`, `npm run ios`, `npm run web`.
- Type-check: `npx tsc --noEmit`.

## Navigation — Expo Router

The app uses **Expo Router** (file-based routing). The entry point is `expo-router/entry`
(see `main` in `package.json`). Every file under `app/` is a route, and the screen path
mirrors the file path. Navigation is a single `Stack` (no bottom tabs); screen titles are
configured centrally in `app/_layout.tsx`.

## Project structure

`app/` holds the root layout plus **14 route files**:

- `_layout.tsx` — root `Stack` layout wrapped in `SafeAreaProvider` (not a route itself)
- `index.tsx` — Home
- `translation.tsx` — Live Translation
- `prayer-times.tsx` — Prayer Times
- `qibla.tsx` — Qibla Compass
- `quran/index.tsx` — Quran (surah list)
- `quran/[surahNumber].tsx` — Surah detail (dynamic route)
- `duas.tsx` — Daily Duas
- `hadith.tsx` — Daily Hadith
- `tasbih.tsx` — Tasbih Counter
- `names.tsx` — 99 Names of Allah
- `mosques.tsx` — Mosque Finder
- `salah-guide.tsx` — Salah Guide
- `wudu-guide.tsx` — Wudu Guide
- `settings.tsx` — Settings

## Git

- Default branch is **`main`**.
