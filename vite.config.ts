import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carichiamo le variabili d'ambiente dal file .env
  const env = loadEnv(mode, process.cwd(), '');
  
  // Leggiamo direttamente dalle variabili d'ambiente di sistema o dal file .env
  // Leggiamo la chiave standard VITE_GEMINI_API_KEY
  const envKey = env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  // Se non troviamo la chiave, lasciamo vuoto per evitare di usare chiavi errate
  const finalApiKey = (envKey && !envKey.includes('PLACEHOLDER')) ? envKey : '';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
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
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom']
          }
        }
      }
    }
  };
});
