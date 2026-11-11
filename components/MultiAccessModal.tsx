import React from 'react';
import Modal from './Modal';

interface MultiAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  userEmail?: string | null;
  userId?: string | null;
  onUpgrade?: (plan: 'premium' | 'team' | 'enterprise') => void;
}

const STRIPE_LINKS: Record<'premium' | 'team' | 'enterprise', string> = {
  premium: 'https://buy.stripe.com/test_aFa6oIfbB0O2gmI5UC1kA00',
  team: 'https://buy.stripe.com/test_cNi7sMgfF9ky5I482K1kA01',
  enterprise: 'https://buy.stripe.com/test_bJecN65B168meeA1Em1kA02',
};

const MultiAccessModal: React.FC<MultiAccessModalProps> = ({ 
  isOpen, 
  onClose, 
  currentPlan, 
  userEmail,
  userId,
  onUpgrade 
}) => {
  const getStripeUrl = (plan: 'premium' | 'team' | 'enterprise') => {
    const base = STRIPE_LINKS[plan];
    try {
      const url = new URL(base);
      if (userId) {
        url.searchParams.set('client_reference_id', userId);
      }
      if (userEmail) {
        url.searchParams.set('prefilled_email', userEmail);
      }
      return url.toString();
    } catch {
      return base;
    }
  };

  const handleSelectPlan = (plan: 'premium' | 'team' | 'enterprise') => {
    const url = getStripeUrl(plan);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" noScroll={true}>
      <div className="space-y-3 pb-0 overflow-hidden">
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase mb-1">
            Sblocca l'Accesso Multiplo
          </h2>
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-1">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Lavora in Team senza limiti</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs">
            Scegli il piano per collaborare o accedere da più dispositivi.
          </p>
        </div>

        <div className="space-y-2">
          {/* Piano Premium Base */}
          <div className={`p-2 rounded-xl border-2 transition-all ${currentPlan === 'premium' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Singolo</h4>
              <div className="text-right leading-none">
                <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">2.99€/m</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">o 24.99€/a</span>
              </div>
            </div>
            <ul className="text-[10px] space-y-0.5 my-1.5 text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-1"><svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Cloud & Accesso multi-dispositivo</li>
            </ul>
            {currentPlan === 'premium' ? (
              <button 
                disabled
                className="w-full py-1 text-xs rounded-lg font-bold bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
              >
                Piano Attuale
              </button>
            ) : (
              <button 
                onClick={() => handleSelectPlan('premium')}
                className="w-full py-1 text-xs rounded-lg font-bold transition-colors bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 cursor-pointer"
              >
                Scegli Base
              </button>
            )}
          </div>

          {/* Piano Team */}
          <div className={`p-2 rounded-xl border-2 transition-all relative overflow-hidden ${currentPlan === 'team' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-amber-400 shadow-sm bg-white dark:bg-slate-800'}`}>
            {currentPlan !== 'team' && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-bl-md uppercase tracking-wider leading-none select-none">
                Consigliato
              </div>
            )}
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Piccolo Team</h4>
              <div className="text-right leading-none mt-2 sm:mt-0">
                <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">4.99€/m</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">o 49.99€/a</span>
              </div>
            </div>
            <ul className="text-[10px] space-y-0.5 my-1.5 text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-1"><svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> 3 accessi simultanei & collab.</li>
            </ul>
            {currentPlan === 'team' ? (
              <button 
                disabled
                className="w-full py-1 text-xs rounded-lg font-bold bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
              >
                Piano Attuale
              </button>
            ) : (
              <button 
                onClick={() => handleSelectPlan('team')}
                className="w-full py-1 text-xs rounded-lg font-bold transition-colors bg-amber-500 text-white hover:bg-amber-600 shadow-sm cursor-pointer"
              >
                Scegli Team
              </button>
            )}
          </div>

          {/* Piano Azienda */}
          <div className={`p-2 rounded-xl border-2 transition-all ${currentPlan === 'enterprise' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Azienda</h4>
              <div className="text-right leading-none">
                <span className="text-amber-600 dark:text-amber-400 font-bold text-xs">9.99€/m</span>
                <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">o 99.99€/a</span>
              </div>
            </div>
            <ul className="text-[10px] space-y-0.5 my-1.5 text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-1"><svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg> Accessi illimitati & permessi</li>
            </ul>
            {currentPlan === 'enterprise' ? (
              <button 
                disabled
                className="w-full py-1 text-xs rounded-lg font-bold bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
              >
                Piano Attuale
              </button>
            ) : (
              <button 
                onClick={() => handleSelectPlan('enterprise')}
                className="w-full py-1 text-xs rounded-lg font-bold transition-colors bg-slate-800 text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-sm cursor-pointer"
              >
                Scegli Azienda
              </button>
            )}
          </div>
        </div>

        <div className="pt-1 text-center">
          <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <svg className="w-3 h-3 text-slate-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Pagamento sicuro e crittografato gestito tramite Stripe
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default MultiAccessModal;
