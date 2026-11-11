
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
    const [duration, setDuration] = useState<'lifetime' | '1_month' | '2_months' | '6_months' | '1_year'>('lifetime');
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !name) return;

        setStatus('loading');
        setError(null);

        try {
            const token = crypto.randomUUID();
            const link = `https://app.diarioapistico.com/#/accept-invite?token=${token}&email=${encodeURIComponent(email)}`;
            setInviteLink(link);

            await sendPremiumInvite({ email, name, token, duration });
            setStatus('success');
            logger.log(`Invito Premium inviato a ${email} (durata: ${duration})`);
        } catch (err: any) {
            console.error("Errore invio regalo premium:", err);
            setError(err?.message || "Impossibile inviare l'invito. Verifica la connessione.");
            setStatus('error');
        }
    };

    const reset = () => {
        setEmail('');
        setName('');
        setDuration('lifetime');
        setStatus('idle');
        setError(null);
        setCopied(false);
    };

    const durationLabel = {
        'lifetime': 'A Vita (Senza Scadenza)',
        '1_month': '1 Mese',
        '2_months': '2 Mesi',
        '6_months': '6 Mesi',
        '1_year': '1 Anno'
    }[duration];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={() => { onClose(); reset(); }} 
            title="Regala Premium"
        >
            {status === 'success' ? (
                <div className="flex flex-col items-center text-center py-4 space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-2xl">
                        🎁
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Regalo Pronto!</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Hai assegnato <strong>{durationLabel}</strong> a <strong>{name}</strong> ({email}).
                        </p>
                    </div>

                    <div className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-left space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase">Link di Attivazione Immediata:</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                readOnly 
                                value={inviteLink} 
                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-mono select-all text-slate-600 dark:text-slate-300"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(inviteLink);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap"
                            >
                                {copied ? '✓ Copiato!' : 'Copia'}
                            </button>
                        </div>
                    </div>

                    <div className="w-full flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                const msg = encodeURIComponent(`Ciao ${name}! Ti ho regalato il Premium di Diario Apistico (${durationLabel})! Clicca qui per attivarlo subito: ${inviteLink}`);
                                window.open(`https://wa.me/?text=${msg}`, '_blank');
                            }}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.18-.544-1.9-1.026-3.13-2.983-3.226-3.11-.093-.129-.763-1.014-.763-1.936 0-.92.48-1.373.65-1.56.171-.188.374-.235.499-.235.125 0 .25.002.359.006.115.005.27-.044.421.319.155.372.529 1.29.576 1.384.047.094.078.204.016.33-.063.125-.094.204-.188.313-.094.11-.197.245-.282.329-.094.094-.192.197-.082.387.11.19.488.805 1.05 1.305.723.644 1.332.844 1.522.938.19.094.301.079.412-.047.11-.125.474-.551.6-.74.125-.188.25-.157.421-.094.172.062 1.09.514 1.277.608.188.094.312.141.359.219.047.078.047.453-.097.858z"/>
                            </svg>
                            Invia su WhatsApp
                        </button>
                        <button 
                            type="button"
                            onClick={() => { onClose(); reset(); }}
                            className="py-3 px-5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSendInvite} className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                        <SparklesIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-tight">Funzione Admin</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Inserisci i dati della persona a cui vuoi regalare il Premium. Riceverà un link di attivazione diretta o un'email.
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
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition text-sm"
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
                                    className="w-full p-3 pl-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition text-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase ml-1 mb-1">Durata del Regalo</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value as any)}
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition text-sm font-medium"
                            >
                                <option value="lifetime">♾️ A Vita (Nessuna scadenza - Amici / Familiari)</option>
                                <option value="1_month">🎁 1 Mese (Premio Referral / Collaborazione)</option>
                                <option value="2_months">🎁 2 Mesi (Premio Speciale)</option>
                                <option value="6_months">🎁 6 Mesi (Semestrale)</option>
                                <option value="1_year">🎁 1 Anno (Annuale)</option>
                            </select>
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
                            className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                            {status === 'loading' ? 'Creazione in corso...' : 'Invia Regalo 🎁'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default PremiumGiftModal;
