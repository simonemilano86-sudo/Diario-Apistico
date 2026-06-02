import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { BeeIcon, CheckCircleIcon, WarningIcon, LogoutIcon } from './Icons';
import AuthModal from './AuthModal';

const AcceptInvite: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string>('');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    const [inviteCodeInput, setInviteCodeInput] = useState('');
    
    const hasAttemptedRef = useRef(false);

    useEffect(() => {
        // 1. Recupera token dall'URL (query param o hash)
        const params = new URLSearchParams(window.location.search);
        let urlToken = params.get('token');
        
        if (!urlToken && window.location.hash) {
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
            
            // Pulisce l'URL
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        } else {
            const savedToken = localStorage.getItem('pending_invite_token');
            if (savedToken) {
                setToken(savedToken);
                setInviteCodeInput(savedToken);
            }
        }

        // 2. Controlla sessione
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsLoggedIn(!!session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setIsLoggedIn(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

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

            // Chiamata RPC al database
            let { data, error } = await supabase.rpc('accept_invitation', {
                p_token: inviteToken,
                p_user_id: user.id
            });

            // Se la RPC fallisce, controlliamo se è un invito premium manuale
            if (error || !data) {
                try {
                    const { data: giftData, error: giftError } = await supabase
                        .from('premium_invites')
                        .select('*')
                        .eq('token', inviteToken)
                        .eq('status', 'pending')
                        .single();

                    if (!giftError && giftData) {
                        // Consuma il token
                        await supabase
                            .from('premium_invites')
                            .update({ status: 'used', used_at: new Date().toISOString(), used_by: user.id })
                            .eq('token', inviteToken);

                        data = { success: true, type: 'premium_gift' };
                        error = null;
                    }
                } catch (e) {
                    // Fallback to original error
                }
            }

            if (error) throw error;

            // Se la RPC restituisce successo (boolean o oggetto)
            const isSuccess = typeof data === 'boolean' ? data : data?.success;
            
            if (isSuccess) {
                // Se è un invito premium, forza l'aggiornamento del piano
                if (data?.type === 'premium_gift') {
                    // Aggiorniamo il piano dell'utente
                    const { error: upgradeErr } = await supabase
                        .from('user_quotas')
                        .upsert({ user_id: user.id, plan: 'premium', tokens_used: 0 }, { onConflict: 'user_id' });
                    
                    if (upgradeErr) console.error("Errore upgrade premium:", upgradeErr);
                    
                    setStatus('success');
                    setMessage("Evviva! Simone ti ha regalato il Premium! Diario Apistico è ora sbloccato al 100%.");
                } else {
                    setStatus('success');
                    setMessage('Invito accettato con successo! Ora fai parte del team.');
                }
                localStorage.removeItem('pending_invite_token');
            } else {
                throw new Error(data?.message || "L'invito non è più valido o è già stato utilizzato.");
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
        // Usa location.href per forzare un ricaricamento completo
        // Questo permetterà a index.tsx di rimontare <App /> invece di <AcceptInvite />
        // perché i query param sono stati rimossi.
        window.location.href = '/';
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
                <p className="text-slate-400 text-sm mb-8">Collaborazione Team</p>

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