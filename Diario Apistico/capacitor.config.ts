import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beewise.diario',
  appName: 'Diario Apistico',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;