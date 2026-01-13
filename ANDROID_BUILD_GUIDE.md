# Orbia Android Build Guide

This guide explains how to build the Android APK from this project on your local machine.

## Prerequisites

1. **Node.js** (v18 or later) - https://nodejs.org/
2. **Android Studio** (latest version) - https://developer.android.com/studio
3. **Java 17** (comes with Android Studio)

## Quick Start

### 1. Extract the Project

Unzip `orbia-android.zip` to your desired location.

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Web App

```bash
npm run build
```

This creates the `dist/public` folder with the production build.

### 4. Sync to Android

```bash
npx cap sync android
```

This copies the web build to `android/app/src/main/assets/public/`.

### 5. Open in Android Studio

```bash
npx cap open android
```

Or manually open the `android/` folder in Android Studio.

### 6. Build APK

In Android Studio:
1. Wait for Gradle sync to complete (may take a few minutes on first open)
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. The APK will be in `android/app/build/outputs/apk/debug/app-debug.apk`

### 7. Create Signed Release APK (for Play Store)

1. Go to **Build > Generate Signed Bundle / APK**
2. Select **APK** and click Next
3. Create a new keystore or use existing:
   - Click **Create new...** for a new keystore
   - Fill in the keystore details and password
   - **Important**: Save these credentials securely for future updates!
4. Select **release** build variant
5. Click **Finish**

The signed APK will be in: `android/app/release/app-release.apk`

## Server Connection

The app automatically connects to: **https://orbia-1.replit.app**

This is configured in `client/src/lib/queryClient.ts`. When running as a native Android app, Capacitor detects the native platform and uses the production server URL for all API calls.

## Features Included

- **Local Notifications**: Schedule reminders and daily check-in alerts
- **Haptic Feedback**: Touch feedback for button presses and interactions
- **Splash Screen**: Dark-themed loading screen matching the app aesthetic
- **Status Bar**: Styled to match the app theme (dark mode optimized)
- **Offline Assets**: Web assets are bundled in the APK for fast loading

## Notification Permissions

The app includes these Android permissions:
- `POST_NOTIFICATIONS` - For sending notifications (Android 13+)
- `SCHEDULE_EXACT_ALARM` - For precise reminder scheduling
- `VIBRATE` - For haptic feedback
- `RECEIVE_BOOT_COMPLETED` - To restore scheduled notifications after device restart
- `INTERNET` - For connecting to the server

On Android 13+, users will be prompted to grant notification permissions on first use.

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
- **Server**: https://orbia-1.replit.app

## Customizing App Icon

Replace the icon files in:
- `android/app/src/main/res/mipmap-mdpi/` (48x48)
- `android/app/src/main/res/mipmap-hdpi/` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/` (192x192)

Use Android Studio's **Image Asset** tool: Right-click `res` > **New > Image Asset**

## Customizing Splash Screen

Edit `capacitor.config.ts`:
```typescript
SplashScreen: {
  backgroundColor: '#1a1a2e',  // Change this color
  // ...
}
```

Then run: `npx cap sync android`

## Troubleshooting

### Gradle Sync Failed
- Ensure Android Studio has downloaded all SDK components
- Check `android/local.properties` has correct SDK path
- Try: **File > Invalidate Caches / Restart**

### Build Failed
- Run `npx cap sync android` again
- Clean the project: **Build > Clean Project**
- Rebuild: **Build > Rebuild Project**

### App Shows Blank Screen
- Ensure `dist/public/` contains the built web app
- Check `android/app/src/main/assets/public/` has files
- Run `npm run build` followed by `npx cap sync android`

### API Calls Not Working
- Verify device/emulator has internet access
- Check that https://orbia-1.replit.app is accessible in a browser
- Clear app data and restart

### Notifications Not Working
- Check notification permissions in device settings
- On Android 13+, the app must request permission at runtime
- Ensure the device isn't in Do Not Disturb mode

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run build` | Build web app for production |
| `npx cap sync android` | Sync web app to Android project |
| `npx cap open android` | Open project in Android Studio |
| `npx cap update android` | Update Capacitor plugins |

## Updating the App

When you make changes to the web app:

```bash
npm run build
npx cap sync android
```

Then rebuild in Android Studio.

## Need Help?

- **Android Studio docs**: https://developer.android.com/studio
- **Capacitor docs**: https://capacitorjs.com/docs
- **Orbia server**: https://orbia-1.replit.app
