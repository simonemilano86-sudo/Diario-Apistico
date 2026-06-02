import React from 'react';
import Modal from './Modal';

interface MultiAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  onUpgrade: (plan: 'premium' | 'team' | 'enterprise') => void;
}

const MultiAccessModal: React.FC<MultiAccessModalProps> = ({ isOpen, onClose, currentPlan, onUpgrade }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sblocca l'Accesso Multiplo">
      <div className="p-4 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Lavora in Team senza limiti</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">
            Scegli il piano più adatto per collaborare con i tuoi colleghi o accedere da più dispositivi contemporaneamente.
          </p>
        </div>

        <div className="space-y-4">
          {/* Piano Premium Base */}
          <div className={`p-4 rounded-xl border-2 transition-all ${currentPlan === 'premium' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-lg text-slate-800 dark:text-white">Apicoltore Singolo</h4>
              <span className="text-amber-600 dark:text-amber-400 font-bold">2.99€ / mese</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Oppure 24.99€ / anno</p>
            <ul className="text-sm space-y-2 mb-4 text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Salvataggio in Cloud Sicuro</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Accesso da più dispositivi</li>
            </ul>
            <button 
              onClick={() => onUpgrade('premium')}
              disabled={currentPlan === 'premium'}
              className={`w-full py-2 rounded-lg font-bold transition-colors ${currentPlan === 'premium' ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'}`}
            >
              {currentPlan === 'premium' ? 'Piano Attuale' : 'Scegli Base'}
            </button>
          </div>

          {/* Piano Team */}
          <div className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden ${currentPlan === 'team' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-amber-400 shadow-lg bg-white dark:bg-slate-800'}`}>
            {currentPlan !== 'team' && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                Consigliato
              </div>
            )}
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-lg text-slate-800 dark:text-white">Piccolo Team</h4>
              <span className="text-amber-600 dark:text-amber-400 font-bold">4.99€ / mese</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Oppure 49.99€ / anno</p>
            <ul className="text-sm space-y-2 mb-4 text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Fino a 3 accessi simultanei</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Collaborazione in tempo reale</li>
            </ul>
            <button 
              onClick={() => onUpgrade('team')}
              disabled={currentPlan === 'team'}
              className={`w-full py-2 rounded-lg font-bold transition-colors ${currentPlan === 'team' ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
            >
              {currentPlan === 'team' ? 'Piano Attuale' : 'Scegli Team'}
            </button>
          </div>

          {/* Piano Azienda */}
          <div className={`p-4 rounded-xl border-2 transition-all ${currentPlan === 'enterprise' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-lg text-slate-800 dark:text-white">Azienda Agricola</h4>
              <span className="text-amber-600 dark:text-amber-400 font-bold">9.99€ / mese</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Oppure 99.99€ / anno</p>
            <ul className="text-sm space-y-2 mb-4 text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Accessi simultanei illimitati</li>
              <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Gestione avanzata permessi</li>
            </ul>
            <button 
              onClick={() => onUpgrade('enterprise')}
              disabled={currentPlan === 'enterprise'}
              className={`w-full py-2 rounded-lg font-bold transition-colors ${currentPlan === 'enterprise' ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500' : 'bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600'}`}
            >
              {currentPlan === 'enterprise' ? 'Piano Attuale' : 'Scegli Azienda'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MultiAccessModal;
