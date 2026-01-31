
import { createClient } from '@supabase/supabase-js';

// ⚠️ CREDENZIALI CONFIGURATE
const SUPABASE_URL = 'https://uqvovgxdfleosaodpyyb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdm92Z3hkZmxlb3Nhb2RweXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyOTAyMzcsImV4cCI6MjA3OTg2NjIzN30.g6RNcnpTM8_yuJqbbKYawalVxckvCtySRF6oVTqNLNs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Configurazione specifica per Mobile/Capacitor
    flowType: 'pkce', // Usa Proof Key for Code Exchange (più sicuro e robusto per mobile)
    detectSessionInUrl: false, // IMPORTANTE: Disabilitiamo la gestione automatica URL di Supabase perché la gestiamo manualmente in App.tsx
    autoRefreshToken: true,
    persistSession: true,
  }
});
