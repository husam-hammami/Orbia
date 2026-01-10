# Orbia Android Build Guide

This guide explains how to build the Android APK from this project on your local machine.

## Prerequisites

1. **Node.js** (v18 or later)
2. **Android Studio** (latest version)
3. **Java 17** (comes with Android Studio)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Web App

```bash
npm run build
```

This creates the `dist/public` folder with the production build.

### 3. Sync to Android

```bash
npx cap sync android
```

This copies the web build to `android/app/src/main/assets/public/`.

### 4. Open in Android Studio

```bash
npx cap open android
```

Or manually open the `android/` folder in Android Studio.

### 5. Build APK

In Android Studio:
1. Wait for Gradle sync to complete
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. The APK will be in `android/app/build/outputs/apk/debug/`

## Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── assets/public/     # Built web app (synced from dist/public)
│   │   ├── res/               # Android resources (icons, splash)
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── gradle/wrapper/            # Gradle wrapper
├── build.gradle               # Top-level build config
├── settings.gradle
├── variables.gradle           # Capacitor variables
└── capacitor.settings.gradle
```

## Configuration

The app is configured in `capacitor.config.ts`:
- **App ID**: `com.orbia.app`
- **App Name**: `Orbia`
- **Web Directory**: `dist/public`

## Customizing App Icon

Replace the icon files in:
- `android/app/src/main/res/mipmap-mdpi/` (48x48)
- `android/app/src/main/res/mipmap-hdpi/` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/` (192x192)

## Troubleshooting

### Gradle Sync Failed
- Ensure Android Studio has downloaded all SDK components
- Check `android/local.properties` has correct SDK path

### Build Failed
- Run `npx cap sync android` again
- Clean and rebuild in Android Studio

### App Shows Blank Screen
- Ensure `dist/public/` contains the built web app
- Check `android/app/src/main/assets/public/` has files

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build web app |
| `npx cap sync android` | Sync web app to Android |
| `npx cap open android` | Open in Android Studio |
| `npx cap update android` | Update Capacitor plugins |
