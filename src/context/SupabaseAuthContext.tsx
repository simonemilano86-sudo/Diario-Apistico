import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../services/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Plan, Role, Status, User } from '../../types';

interface SupabaseAuthContextType {
  user: any | null;
  loading: boolean;
  isDoubleLogin: boolean;
  localSessionId: string;
  resolveDoubleLogin: () => Promise<void>;
  simulateDoubleLogin: () => Promise<void>;
  signInAsSimone: () => Promise<void>;
  signInAsMario: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDoubleLogin, setIsDoubleLogin] = useState(false);
  
  // This is the unique ID for THIS specific device/browser tab
  const [localSessionId] = useState(() => {
    const saved = localStorage.getItem('local_session_id');
    if (saved) return saved;
    const newId = uuidv4();
    localStorage.setItem('local_session_id', newId);
    return newId;
  });

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Get initial session with safety timeout
    const getSessionWithTimeout = async () => {
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error('SUPABASE_AUTH_TIMEOUT')), 5000);
      });

      try {
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);
        
        setUser(session?.user ?? null);
        if (session?.user) {
          updateDbSessionId(session.user.id);
        }
      } catch (err) {
        console.warn("[AuthContext] Session check reached timeout or failed:", err);
        // On error or timeout, we don't set user, but we MUST stop loading
      } finally {
        setLoading(false);
      }
    };

    getSessionWithTimeout();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        updateDbSessionId(session.user.id);
      } else {
        setIsDoubleLogin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [localSessionId]);

  // 3. Listen for Realtime changes on the 'users' table to detect double logins
  useEffect(() => {
    if (!supabase || !user) return;

    console.log(`[SessionGuard] Avvio ascolto Realtime per utente ${user.id}...`);

    const channel = supabase
      .channel('public:users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[SessionGuard] 🔔 RICEVUTO EVENTO REALTIME DA SUPABASE:', payload);
          const newDbSessionId = payload.new.current_session_id;
          const userEmail = payload.new.email;

          // THE MAGIC RULE: If it's Simone, ignore the check!
          if (userEmail === 'simonemilano86@gmail.com') {
            console.log('[SessionGuard] Utente Simone rilevato. Ignoro il controllo doppio login.');
            setIsDoubleLogin(false);
            return;
          }

          console.log(`[SessionGuard] Confronto ID: Locale = ${localSessionId}, Database = ${newDbSessionId}`);

          // If the DB session ID changed and it's NOT our local session ID, someone else logged in!
          if (newDbSessionId && newDbSessionId !== localSessionId) {
            console.log('[SessionGuard] 🚨 DOPPIO LOGIN RILEVATO! Blocco la sessione.');
            setIsDoubleLogin(true);
          } else {
            console.log('[SessionGuard] Nessun doppio login. Gli ID coincidono o sono vuoti.');
          }
        }
      )
      .subscribe((status) => {
        console.log('[SessionGuard] Stato connessione Realtime:', status);
      });

    return () => {
      console.log('[SessionGuard] Chiusura canale Realtime...');
      supabase.removeChannel(channel);
    };
  }, [user, localSessionId]);

  const updateDbSessionId = async (userId: string) => {
    if (!supabase) return;
    console.log(`[SessionGuard] Tentativo di salvataggio nuovo ID sessione su Supabase: ${localSessionId} per utente ${userId}`);
    // Update the user record with this device's session ID
    const { data, error } = await supabase
      .from('users')
      .update({ current_session_id: localSessionId })
      .eq('id', userId)
      .select();
      
    if (error) {
      console.error('[SessionGuard] ERRORE durante il salvataggio su Supabase:', error);
    } else {
      console.log('[SessionGuard] Salvataggio riuscito! Dati aggiornati:', data);
    }
    setIsDoubleLogin(false);
  };

  const resolveDoubleLogin = async () => {
    if (!user) return;
    // Overwrite the DB with OUR local session ID, kicking the other person out
    await updateDbSessionId(user.id);
  };

  // --- MOCK LOGIN FUNCTIONS FOR TESTING WITHOUT REAL PASSWORDS ---
  // In a real app, you would use supabase.auth.signInWithPassword()
  const signInAsSimone = async () => {
    if (!supabase) return;
    // For demo purposes, we assume these users exist in your Supabase Auth
    await supabase.auth.signInWithPassword({
      email: 'simonemilano86@gmail.com',
      password: 'password123' // Replace with real test password
    });
  };

  const signInAsMario = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithPassword({
      email: 'mario@example.com',
      password: 'password123' // Replace with real test password
    });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const simulateDoubleLogin = async () => {
    if (!supabase || !user) return;
    // Simulate someone else logging in by changing the DB session ID to a random one
    await supabase
      .from('users')
      .update({ current_session_id: 'fake-session-from-wife-phone' })
      .eq('id', user.id);
  };

  return (
    <SupabaseAuthContext.Provider value={{
      user,
      loading,
      isDoubleLogin,
      localSessionId,
      resolveDoubleLogin,
      simulateDoubleLogin,
      signInAsSimone,
      signInAsMario,
      signOut
    }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
