import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  // La tua chiave corretta
  const REAL_KEY = 'AIzaSyARYFngT8gays7VnxYYB4PlXiLAnhGDiPU';

  // Logica intelligente: se la chiave nell'env è vuota o è un segnaposto, usa la tua chiave reale
  const envKey = env.API_KEY || env.VITE_API_KEY || env.GEMINI_API_KEY;
  const finalApiKey = (envKey && !envKey.includes('PLACEHOLDER')) ? envKey : REAL_KEY;

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    define: {
      // Iniettiamo la chiave definitiva nel codice
      'process.env.API_KEY': JSON.stringify(finalApiKey)
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        // Abbiamo rimosso @capacitor/local-notifications da qui perché deve essere incluso nel bundle
        // affinché funzioni correttamente su device quando installato via npm.
        external: [
          '@capacitor/core',
          '@capacitor/app',
          // '@capacitor/local-notifications', <-- RIMOSSO per includerlo
          'capacitor-voice-recorder',
          '@google/genai',
          '@supabase/supabase-js',
          '@awesome-cordova-plugins/calendar',
          // '@capgo/capacitor-nfc' <-- RIMOSSO per includerlo nel bundle ed evitare errore 404 su mobile
        ],
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom']
          }
        }
      }
    }
  };
});