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
