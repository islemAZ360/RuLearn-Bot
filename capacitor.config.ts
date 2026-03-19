import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rulearn.bot',
  appName: 'RuLearn Bot',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
