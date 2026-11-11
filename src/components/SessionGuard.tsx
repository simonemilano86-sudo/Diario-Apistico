import React from 'react';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export const SessionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isDoubleLogin, resolveDoubleLogin } = useSupabaseAuth();

  // The core logic: if the session IDs don't match, someone else logged in.
  // Exception: if the email is Simone's, we ignore the check!
  const isSimone = user?.email === 'simonemilano86@gmail.com';
  
  const showWarning = isDoubleLogin && !isSimone;

  if (showWarning) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-center w-16 h-16 bg-amber-100 text-amber-600 rounded-full mb-6 mx-auto">
            <AlertTriangle size={32} />
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Accesso multiplo rilevato
          </h2>
          
          <p className="text-gray-600 text-center mb-6">
            Il tuo account è attualmente in uso su un altro dispositivo. Usare le stesse credenziali in due persone può causare la perdita di dati durante la sincronizzazione in apiario.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-1">Lavorate in team?</h3>
            <p className="text-sm text-gray-500">
              Usa la funzione "Gestione Team"! Passa ora al piano Team e assegna a tua moglie o ai tuoi collaboratori il ruolo di "Operatore Pro" con le loro credenziali personali.
            </p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => {
                alert("Reindirizzamento alla pagina Abbonamenti...");
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Scopri i Piani Team
            </button>
            
            <button 
              onClick={resolveDoubleLogin}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl border border-gray-200 transition-colors"
            >
              Scollega l'altro dispositivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {isSimone && isDoubleLogin && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50">
          <ShieldCheck className="text-green-600" />
          <div>
            <p className="font-semibold text-sm">Privilegio Admin Attivo</p>
            <p className="text-xs opacity-80">Accessi multipli consentiti per {user?.email}</p>
          </div>
        </div>
      )}
    </>
  );
};
