import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../services/supabase';
import { BeeIcon, CheckCircleIcon, WarningIcon, LogoutIcon } from './Icons';
import AuthModal from './AuthModal';

interface AcceptInviteProps {
    initialToken?: string | null;
    onDone?: () => void;
}

const AcceptInvite: React.FC<AcceptInviteProps> = ({ initialToken, onDone }) => {
    const [token, setToken] = useState<string | null>(initialToken || null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string>('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    const [inviteCodeInput, setInviteCodeInput] = useState(initialToken || '');
    
    const hasAttemptedRef = useRef(false);
    const isAndroidMobileWeb = !Capacitor.isNativePlatform() && /Android/i.test(navigator.userAgent);

    useEffect(() => {
        // 1. Recupera token da prop, query param, hash o localStorage
        const params = new URLSearchParams(window.location.search);
        let urlToken = initialToken || params.get('token');
        
        if (!urlToken && window.location.hash && window.location.hash.includes('?')) {
            const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
            urlToken = hashParams.get('token');
        }
        
        // Fallback: check localStorage se set da redirect
        if (!urlToken) {
            urlToken = localStorage.getItem('pending_invite_token');
        }
        
        if (urlToken) {
            localStorage.setItem('pending_invite_token', urlToken);
            setToken(urlToken);
            setInviteCodeInput(urlToken);

            // Se aperto in un browser Android esterno, tenta una volta di aprire direttamente l'app installata
            if (isAndroidMobileWeb) {
                const guardKey = `beewise_invite_app_redirect_${urlToken}`;
                if (!sessionStorage.getItem(guardKey)) {
                    sessionStorage.setItem(guardKey, '1');
                    setTimeout(() => {
                        window.location.href = `com.beewise.diario://accept-invite?token=${encodeURIComponent(urlToken!)}`;
                    }, 150);
                }
            }
            
            // Pulisce l'URL solo sul flusso standalone web
            if (!initialToken && window.location.pathname.startsWith('/accept-invite')) {
                window.history.replaceState({}, '', window.location.pathname + window.location.hash);
            }
        }

        // 2. Controlla sessione
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsLoggedIn(!!session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session);
        });

        return () => subscription.unsubscribe();
    }, [initialToken, isAndroidMobileWeb]);

    useEffect(() => {
        if (isLoggedIn && token && !isProcessing && status === 'idle' && !hasAttemptedRef.current) {
            handleAcceptance(token);
        }
    }, [isLoggedIn, token]);

    const handleAcceptance = async (inviteToken: string) => {
        setIsProcessing(true);
        hasAttemptedRef.current = true;
        setStatus('idle');
        setMessage('Verifica invito in corso...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utente non loggato");

            // 1. Prova prima la RPC sicura lato server per riscattare un regalo Premium
            const { data: rpcGiftData, error: rpcGiftErr } = await supabase.rpc('claim_premium_gift', {
                p_token: inviteToken
            });

            if (!rpcGiftErr && rpcGiftData) {
                setStatus('success');
                setMessage("Evviva! Ti è stato regalato Diario Apistico Premium! Il tuo account è ora sbloccato al 100%.");
                localStorage.removeItem('pending_invite_token');
                return;
            }

            const isMissingGiftRpc =
                rpcGiftErr &&
                (rpcGiftErr.code === 'PGRST202' ||
                 rpcGiftErr.code === '42883' ||
                 String(rpcGiftErr.message || '').toLowerCase().includes('claim_premium_gift'));

            if (rpcGiftErr && !isMissingGiftRpc) {
                throw rpcGiftErr;
            }

            // Fallback compatibilità se la RPC non è ancora stata eseguita su Supabase
            const { data: giftData, error: giftError } = await supabase
                .from('premium_gifts')
                .select('*')
                .eq('token', inviteToken)
                .maybeSingle();

            if (giftData) {
                if (giftData.status === 'claimed') {
                    throw new Error("Questo regalo Premium è già stato riscattato.");
                }

                // Consuma il token regalo
                const { error: claimErr } = await supabase
                    .from('premium_gifts')
                    .update({
                        status: 'claimed',
                        claimed_at: new Date().toISOString(),
                        claimed_by: user.id
                    })
                    .eq('token', inviteToken);

                if (claimErr) {
                    console.error("Errore aggiornamento premium_gifts:", claimErr);
                }

                // Aggiorna la quota a 'premium'
                const { error: quotaErr } = await supabase
                    .from('user_quotas')
                    .upsert({ user_id: user.id, plan: 'premium', tokens_used: 0 }, { onConflict: 'user_id' });

                if (quotaErr) {
                    console.error("Errore upgrade quota utente:", quotaErr);
                }

                setStatus('success');
                setMessage("Evviva! Ti è stato regalato Diario Apistico Premium! Il tuo account è ora sbloccato al 100%.");
                localStorage.removeItem('pending_invite_token');
                return;
            }

            // 2. Se non è un regalo premium, verifica invito team via RPC
            let { data: rpcData, error: rpcError } = await supabase.rpc('accept_invitation', {
                p_token: inviteToken,
                p_user_id: user.id
            });

            if (rpcError) throw rpcError;

            const isSuccess = typeof rpcData === 'boolean' ? rpcData : rpcData?.success;
            if (isSuccess) {
                setStatus('success');
                setMessage('Invito accettato con successo! Ora fai parte del team.');
                localStorage.removeItem('pending_invite_token');
            } else {
                throw new Error(rpcData?.message || "L'invito non è più valido o è già stato utilizzato.");
            }
        } catch (err: any) {
            console.error("Errore accettazione:", err);
            setStatus('error');
            // Gestione errore email diversa (deve essere restituito dalla RPC come testo)
            setMessage(err.message || "Errore durante l'accettazione dell'invito.");
        } finally {
            setIsProcessing(false);
        }
    };

    const goToDashboard = () => {
        localStorage.removeItem('pending_invite_token');
        if (onDone) {
            onDone();
            return;
        }
        // Usa location.href per forzare un ricaricamento completo
        // Questo permetterà a index.tsx di rimontare <App /> invece di <AcceptInvite />
        // perché i query param sono stati rimossi.
        window.location.href = '/';
    };

    const openInNativeApp = () => {
        const activeToken = (token || inviteCodeInput || '').trim();
        const deepLink = activeToken
            ? `com.beewise.diario://accept-invite?token=${encodeURIComponent(activeToken)}`
            : `com.beewise.diario://accept-invite`;
        window.location.href = deepLink;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    if (isLoggedIn === null) return null; // Loading iniziale sessione

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 text-center animate-fade-in">
                <BeeIcon className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                <h1 className="text-2xl font-bold mb-2">Diario Apistico</h1>
                <p className="text-slate-400 text-sm mb-6">Collaborazione Team</p>

                {isAndroidMobileWeb && (
                    <div className="mb-6 bg-amber-500/15 border border-amber-500/40 rounded-xl p-3.5 space-y-2.5">
                        <p className="text-xs text-amber-100 leading-relaxed">
                            Hai già l'app <strong>Diario Apistico</strong> installata sul telefono? Aprila direttamente per accettare l'invito lì dentro.
                        </p>
                        <button
                            type="button"
                            onClick={openInNativeApp}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-md cursor-pointer"
                        >
                            📱 Apri nell'App Diario Apistico
                        </button>
                    </div>
                )}

                {!isLoggedIn ? (
                    <div className="space-y-6">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <p className="text-amber-200 text-sm">
                                Hai ricevuto un invito! Inserisci il codice qui sotto o accedi per unirti al team.
                            </p>
                        </div>
                        
                        <input 
                            type="text"
                            value={inviteCodeInput}
                            onChange={(e) => {
                                setInviteCodeInput(e.target.value);
                                setToken(e.target.value);
                            }}
                            placeholder="Inserisci codice invito..."
                            className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl text-center font-mono"
                        />

                        <button 
                            onClick={() => setIsAuthModalOpen(true)}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl transition shadow-lg"
                        >
                            Accedi per Accettare
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {status === 'idle' && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-slate-300 font-medium">{message}</p>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="animate-fade-in">
                                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <p className="text-green-400 font-bold text-lg mb-6">{message}</p>
                                <button 
                                    onClick={goToDashboard}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 rounded-xl transition shadow-lg"
                                >
                                    Vai alla Dashboard
                                </button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="animate-fade-in">
                                <WarningIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className="text-red-400 font-bold mb-2">Ops! Qualcosa è andato storto</p>
                                <p className="text-slate-400 text-sm mb-8">{message}</p>
                                
                                <div className="space-y-3">
                                    <button 
                                        onClick={goToDashboard}
                                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition"
                                    >
                                        Torna alla Home
                                    </button>
                                    
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 text-xs transition"
                                    >
                                        <LogoutIcon className="w-4 h-4" /> Esci dall'account
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
            />
        </div>
    );
};

export default AcceptInvite;