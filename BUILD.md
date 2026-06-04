# KhutbahCompanion — Build Guide

## Prerequisites

1. Install EAS CLI globally:
   ```
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```
   eas login
   ```
3. Confirm the project is linked (the `projectId` in `app.json › extra › eas` must match your Expo dashboard):
   ```
   eas project:info
   ```

---

## Android

### Production build (Play Store — `.aab`)
```
eas build --platform android --profile production
```
- Produces an Android App Bundle (`.aab`) required by the Google Play Store.
- `versionCode` is managed remotely by EAS (`appVersionSource: remote`, `autoIncrement: true`).
- Package name: `com.khutbahcompanion.app`

### Preview build (internal testing — `.apk`)
```
eas build --platform android --profile preview
```
- Produces a plain `.apk` for direct installation on test devices.

### Development build (Expo dev client)
```
eas build --platform android --profile development
```
- Installs the Expo Dev Client so you can iterate with `npx expo start --dev-client`.

---

## iOS

### Production build (App Store)
```
eas build --platform ios --profile production
```

### Preview / TestFlight
```
eas build --platform ios --profile preview
```

---

## Submit to stores

After a successful production build:

```
# Android — uploads the .aab to Google Play
eas submit --platform android --profile production

# iOS — uploads to App Store Connect
eas submit --platform ios --profile production
```

---

## Adaptive icon notes

`app.json` references the following Android adaptive icon assets:
- `./assets/android-icon-foreground.png` — foreground layer (must be ≥ 108×108 dp, content in inner 72×72 dp)
- `./assets/android-icon-background.png` — solid background layer
- `./assets/android-icon-monochrome.png` — monochrome variant for themed icons (Android 13+)

Ensure all three files exist at the paths specified before submitting to the Play Store.

---

## Environment variables

Sensitive keys (RevenueCat API key, AdMob IDs) are currently embedded in source.
Before production release, move them to EAS Secrets:
```
eas secret:create --scope project --name REVENUECAT_API_KEY --value <value>
```
Then reference them in `app.config.ts` via `process.env.REVENUECAT_API_KEY`.

---

## Useful commands

| Command | Purpose |
|---|---|
| `eas build:list` | View recent builds |
| `eas build:view <build-id>` | Inspect a specific build |
| `npx expo doctor` | Check for configuration issues |
| `npx tsc --noEmit` | TypeScript type-check |

---

## E2E Testing (Maestro)

Maestro drives a real device or emulator via the app's UI, with no changes to app code required.

### Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Restart your shell after installation, then verify:

```bash
maestro --version
```

### Requirements

- A connected Android device / emulator **or** iOS simulator with the app installed.
- The app must be a **development** or **preview** build (not Expo Go) because Maestro needs the native layer.
- Build and install a preview APK first:
  ```bash
  eas build --platform android --profile preview --local
  adb install <path-to.apk>
  ```

### Run all tests

```bash
maestro test .maestro/
```

This auto-discovers every `.yaml` file in `.maestro/` and runs them.

### Run a single flow

```bash
maestro test .maestro/05-tasbih.yaml
```

### Run the full suite via the orchestrator

```bash
maestro test .maestro/run-all.yaml
```

### Target iOS

The flows default to the Android package `com.khutbahcompanion.app`. Pass your iOS bundle identifier via the `APP_ID` environment variable:

```bash
APP_ID=com.your.ios.bundle maestro test .maestro/
```

Find your iOS bundle identifier in the Expo dashboard under **Project → Credentials → iOS**.

### Test flow index

| File | Feature |
|---|---|
| `01-home.yaml` | Home screen — tiles, banner, header |
| `02-prayer-times.yaml` | Prayer Times — location gate or live times |
| `03-quran.yaml` | Quran — surah list, Al-Faatiha detail, verse markers |
| `04-duas.yaml` | Daily Duas — categories, filtering |
| `05-tasbih.yaml` | Tasbih Counter — tap 10×, verify count |
| `06-qibla.yaml` | Qibla Compass — compass or location prompt |
| `07-translation.yaml` | Live Translation — header, language picker |
| `08-settings.yaml` | Settings — display, prayer, about sections |
| `09-ramadan.yaml` | Ramadan — date banner, checklist, nafil guide |
| `10-zakat.yaml` | Zakat Calculator — input, nisab check, result |
| `11-my-duas.yaml` | My Duas — add dua, verify saved |
| `12-99names.yaml` | 99 Names — list render, scroll, names |
| `13-mosques.yaml` | Mosque Finder — map or location prompt |

### Notes

- **Premium gate**: flows assume `isPremium=true` (the current test mode in `src/lib/premium.ts`). The `08-settings.yaml` premium-card assertions are commented out and require `isPremium=false` to run.
- **Location-dependent screens** (Prayer Times, Qibla, Mosques) use `runFlowIf` to handle both the granted and denied location states gracefully.
- **Deep links**: Settings is navigated to via `khutbahcompanion://settings` because the settings gear icon has no accessible text. If the deep link does not resolve, prefix with an extra slash: `khutbahcompanion:///settings`.
