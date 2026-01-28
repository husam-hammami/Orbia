import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.orbia.app',
  appName: 'Orbia',
  webDir: 'dist/public',
  server: {
    url: 'https://orbia-1.replit.app',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['orbia-1.replit.app', '*.replit.app', '*.replit.dev']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a2e',
      overlaysWebView: false
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#e879f9',
      sound: 'default'
    },
    App: {
      launchUrl: 'https://orbia.app'
    }
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1a1a2e'
  }
};

export default config;
