import React, { useState } from 'react';
import Modal from './Modal';
import { CheckCircleIcon } from './Icons';
import { upgradeToPremium } from '../services/db';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string | null;
    onUpgradeSuccess?: () => void;
    onOpenMultiAccess?: () => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ 
    isOpen, 
    onClose, 
    userId, 
    onUpgradeSuccess,
    onOpenMultiAccess 
}) => {
    const handleOpenWebsite = () => {
        window.open('https://diarioapistico.com', '_blank', 'noopener,noreferrer');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Funzionalità Premium">
            <div className="space-y-6">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                        <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sblocca tutto il potenziale</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Accedi a tutte le funzionalità avanzate e di sincronizzazione di Diario Apistico.
                    </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                    <ul className="space-y-3">
                        {[
                            "Sincronizzazione Cloud sicura",
                            "Accesso da più dispositivi",
                            "Gestione Team e collaboratori",
                            "Calendario e promemoria",
                            "Assistente IA illimitato (200k token)",
                            "Strumenti avanzati (Bilancia)"
                        ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleOpenWebsite}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Scopri i Piani su diarioapistico.com
                    </button>
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        Abbonamento gestito in modo sicuro con Stripe sul nostro sito web ufficiale.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default PremiumModal;
