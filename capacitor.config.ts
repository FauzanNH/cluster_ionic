import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bukitasri.cluster',
  appName: 'bukit asri cluster',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
