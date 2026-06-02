import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { SupabaseAuthProvider, useSupabaseAuth } from './context/SupabaseAuthContext';
import { SessionGuard } from './components/SessionGuard';
import { TeamManager } from './components/TeamManager';
import { Billing } from './components/Billing';
import ScaleDashboard from './components/ScaleDashboard';
import { Hexagon, Users, CreditCard, LogOut, Smartphone, Database, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';

const Dashboard = () => {
  const { user, signOut, simulateDoubleLogin } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState<'TEAM' | 'BILLING' | 'SCALE'>('TEAM');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-600">
            <Hexagon className="w-8 h-8 fill-amber-100" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">Apiario<span className="text-amber-500">Pro</span></span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
             Smart Scale Ready
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
              {user?.email}
            </div>
            
            <button 
              onClick={simulateDoubleLogin}
              className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-red-200"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Simula login moglie</span>
            </button>

            <button 
              onClick={signOut}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Esci"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
            <button
              onClick={() => setActiveTab('TEAM')}
              className={`flex-shrink-0 w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === 'TEAM' ? 'bg-amber-50 text-amber-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-5 h-5" />
              Gestione Team
            </button>
            <button
              onClick={() => setActiveTab('BILLING')}
              className={`flex-shrink-0 w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === 'BILLING' ? 'bg-amber-50 text-amber-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Abbonamento
            </button>
            <button
              onClick={() => setActiveTab('SCALE')}
              className={`flex-shrink-0 w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === 'SCALE' ? 'bg-amber-50 text-amber-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Smartphone className="w-5 h-5" />
              Bilancia Smart
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
          {activeTab === 'TEAM' ? <TeamManager /> : 
           activeTab === 'BILLING' ? <Billing /> : 
           <ScaleDashboard apiaries={[]} onBack={() => setActiveTab('TEAM')} />}
        </div>
      </main>
    </div>
  );
};

const AuthScreen = () => {
  const { signInAsSimone, signInAsMario } = useSupabaseAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <Hexagon className="w-8 h-8 text-amber-600 fill-amber-100" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Accedi ad ApiarioPro</h1>
        <p className="text-center text-gray-500 mb-8">Seleziona un account di test per continuare</p>
        
        <div className="space-y-4">
          <button 
            onClick={signInAsSimone}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            Accedi come Simone (Admin)
          </button>
          <button 
            onClick={signInAsMario}
            className="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            Accedi come Mario (Utente)
          </button>
        </div>
      </div>
    </div>
  );
};

const SetupScreen = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configurazione Supabase Richiesta</h1>
        </div>
        
        <div className="prose prose-amber max-w-none">
          <p className="text-gray-600">
            Per testare il sistema di blocco dei doppi login con Supabase, devi collegare il tuo progetto.
          </p>
          
          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">1. Esegui questo codice SQL in Supabase:</h3>
          <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
            <pre className="text-gray-100 text-sm"><code>{`-- 1. Aggiungi la colonna per le sessioni alla tua tabella users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_session_id text;

-- 2. Abilita il Realtime per la tabella users
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;`}</code></pre>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2. Crea due utenti di test in Supabase Auth:</h3>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li><code>simonemilano86@gmail.com</code> (password: <code>password123</code>)</li>
            <li><code>mario@example.com</code> (password: <code>password123</code>)</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">3. Aggiungi le variabili d'ambiente:</h3>
          <p className="text-gray-600">
            Apri il menu delle impostazioni di AI Studio (in alto a destra) e aggiungi i tuoi Secrets:
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li><code>VITE_SUPABASE_URL</code></li>
            <li><code>VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const MainApp = () => {
  const { user, loading } = useSupabaseAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Caricamento...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SessionGuard>
      <Dashboard />
    </SessionGuard>
  );
};

function App() {
  // Check if Supabase keys are configured
  if (!supabase) {
    return <SetupScreen />;
  }

  return (
    <SupabaseAuthProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </SupabaseAuthProvider>
  );
}

export default App;
