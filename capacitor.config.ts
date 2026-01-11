import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c9d3362d46674ec7b7de308abc276e26',
  appName: 'dekon5',
  webDir: 'dist',
  server: {
    url: 'https://c9d3362d-4667-4ec7-b7de-308abc276e26.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Haptics: {
      // Haptics plugin configuration (uses defaults)
    }
  }
};

export default config;
