
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  // La tua chiave corretta
  const REAL_KEY = 'AIzaSyBK3u4jDwJ8TV6fgUEYa5QcIkUazwQmwrQ';

  // Logica intelligente: se la chiave nell'env è vuota o è un segnaposto, usa la tua chiave reale
  const envKey = env.API_KEY || env.VITE_API_KEY || env.GEMINI_API_KEY;
  const finalApiKey = (envKey && !envKey.includes('PLACEHOLDER')) ? envKey : REAL_KEY;

  return {
    plugins: [react()],
    define: {
      // Iniettiamo la chiave definitiva nel codice
      'process.env.API_KEY': JSON.stringify(finalApiKey)
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'supabase': ['@supabase/supabase-js'],
            'capacitor': ['@capacitor/core', '@capacitor/app'],
            'genai': ['@google/genai']
          }
        }
      }
    }
  };
});
