import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { SparklesIcon, CheckCircleIcon } from './Icons';
import { getReferralStats } from '../services/db';
import { supabase } from '../services/supabase';

interface ReferralModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId?: string | null;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose, userId }) => {
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState<{ invitedCount: number; rewardedCount: number }>({
        invitedCount: 0,
        rewardedCount: 0,
    });
    const [loadingStats, setLoadingStats] = useState(false);
    const [resolvedUserId, setResolvedUserId] = useState<string | null>(userId || null);

    useEffect(() => {
        if (userId) {
            setResolvedUserId(userId);
        } else if (isOpen) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user?.id) {
                    setResolvedUserId(session.user.id);
                }
            });
        }
    }, [userId, isOpen]);

    const referralLink = resolvedUserId 
        ? `https://app.diarioapistico.com/?ref=${resolvedUserId}` 
        : 'https://app.diarioapistico.com';

    useEffect(() => {
        if (isOpen && resolvedUserId) {
            setLoadingStats(true);
            getReferralStats(resolvedUserId)
                .then(setStats)
                .finally(() => setLoadingStats(false));
        }
    }, [isOpen, resolvedUserId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsApp = () => {
        const text = encodeURIComponent(
            `Ciao! Sto usando Diario Apistico per gestire i miei apiari, arnie, fioriture e visite. Te la consiglio, puoi provarla gratuitamente da qui: ${referralLink}`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Porta un Amico">
            <div className="space-y-5">
                {/* Header Banner */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-3 text-3xl shadow-sm">
                        🎁
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                        Regala Diario Apistico, ricevi Premium!
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        Invita i tuoi colleghi apicoltori: quando uno di loro si abbona a un piano a pagamento, ricevi automaticamente <strong>1 mese di Premium gratuito</strong>.
                    </p>
                </div>

                {/* Statistiche personali */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                            {loadingStats ? '...' : stats.invitedCount}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                            Amici Iscritti
                        </p>
                    </div>
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                            {loadingStats ? '...' : stats.rewardedCount}
                        </p>
                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase mt-0.5">
                            Mesi Guadagnati
                        </p>
                    </div>
                </div>

                {/* Il tuo Link personale */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase ml-1">
                        Il tuo link personale di invito:
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={referralLink}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 select-all outline-none"
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95"
                        >
                            {copied ? '✓ Copiato!' : 'Copia'}
                        </button>
                    </div>
                </div>

                {/* Azione rapida WhatsApp */}
                <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.18-.544-1.9-1.026-3.13-2.983-3.226-3.11-.093-.129-.763-1.014-.763-1.936 0-.92.48-1.373.65-1.56.171-.188.374-.235.499-.235.125 0 .25.002.359.006.115.005.27-.044.421.319.155.372.529 1.29.576 1.384.047.094.078.204.016.33-.063.125-.094.204-.188.313-.094.11-.197.245-.282.329-.094.094-.192.197-.082.387.11.19.488.805 1.05 1.305.723.644 1.332.844 1.522.938.19.094.301.079.412-.047.11-.125.474-.551.6-.74.125-.188.25-.157.421-.094.172.062 1.09.514 1.277.608.188.094.312.141.359.219.047.078.047.453-.097.858z"/>
                    </svg>
                    Condividi su WhatsApp
                </button>

                {/* Come funziona in breve */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                        Come funziona:
                    </p>
                    <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                        <li>Condividi il link con un apicoltore o in una chat/gruppo.</li>
                        <li>Il collega si iscrive ed esplora l'app gratuitamente.</li>
                        <li>Quando sceglie di attivare un piano Premium, il sistema ti accredita <strong>30 giorni di Premium omaggio</strong> all'istante!</li>
                    </ol>
                </div>
            </div>
        </Modal>
    );
};

export default ReferralModal;
