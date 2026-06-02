
import React, { useState } from 'react';
import Modal from './Modal';
import { MailIcon, SparklesIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import { sendPremiumInvite } from '../services/inviteService';
import { logger } from '../services/logger';

interface PremiumGiftModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PremiumGiftModal: React.FC<PremiumGiftModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !name) return;

        setStatus('loading');
        setError(null);

        try {
            await sendPremiumInvite({ email, name });
            setStatus('success');
            logger.log(`Invito Premium inviato a ${email}`);
        } catch (err: any) {
            console.error("Errore invio regalo premium:", err);
            setStatus('error');
            setError(err.message || "Errore durante l'invio. Riprova.");
        }
    };

    const reset = () => {
        setEmail('');
        setName('');
        setStatus('idle');
        setError(null);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => { onClose(); reset(); }} 
            title="Regala Premium"
        >
            {status === 'success' ? (
                <div className="flex flex-col items-center text-center py-6">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                        <CheckCircleIcon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Invito Inviato!</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Abbiamo inviato l'invito a <strong>{email}</strong>.<br/>
                        Riceverà l'accesso Premium non appena cliccherà sul link.
                    </p>
                    <button 
                        onClick={() => { onClose(); reset(); }}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 transition"
                    >
                        Chiudi
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSendInvite} className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                        <SparklesIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-tight">Funzione Admin</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Inserisci i dati della persona a cui vuoi regalare il Premium. Riceverà un'email con un link di attivazione gratuita.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase ml-1 mb-1">Nome Amico</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Esempio: Paolo"
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase ml-1 mb-1">Email Amico</label>
                            <div className="relative">
                                <MailIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="paolo@esempio.it"
                                    className="w-full p-3 pl-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                            <XCircleIcon className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 transition"
                        >
                            Annulla
                        </button>
                        <button 
                            type="submit"
                            disabled={status === 'loading'}
                            className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition shadow-lg disabled:opacity-50"
                        >
                            {status === 'loading' ? 'Invio in corso...' : 'Invia Regalo 🎁'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default PremiumGiftModal;
