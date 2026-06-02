import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { logger } from '../services/logger';
import Modal from './Modal';
import { MailIcon, BackArrowIcon, EyeIcon, EyeOffIcon } from './Icons';

import { Capacitor } from '@capacitor/core';
import { resetPasswordRecoveryFlow } from '../App';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultMode?: 'signin' | 'signup' | 'recovery' | 'update_password';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'signin' }) => {
    const [mode, setMode] = useState<'signin' | 'signup' | 'recovery' | 'update_password'>(defaultMode);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (isOpen) {
            setMode(defaultMode);
            setFullName('');
            setEmail('');
            setPassword('');
            setShowPassword(false);
            setError(null);
            setSuccessMessage(null);
            setLoading(false);
            setLoadingStep('');
        }
    }, [isOpen, defaultMode]);

    useEffect(() => {
        // Ascolta gli eventi di autenticazione per intercettare il recupero password
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                // L'utente ha cliccato sul link di recupero ed è stato autenticato temporaneamente
                setMode('update_password');
                setError(null);
                setSuccessMessage(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (mode === 'signup') {
                const redirectUrl = Capacitor.isNativePlatform() 
                    ? 'com.beewise.diario://auth/callback' 
                    : window.location.origin;
                    
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { 
                        data: { full_name: fullName },
                        emailRedirectTo: redirectUrl
                    }
                });
                
                // Gestione specifica dell'errore di rate limit di Supabase
                if (error) {
                    if (error.message.includes('rate_limit') || error.message.includes('Too many requests') || error.status === 429) {
                        throw new Error("Hai fatto troppi tentativi. Attendi 60 secondi prima di riprovare.");
                    }
                    throw error;
                }

                // Supabase "Email Enumeration Protection": l'utente esiste già
                if (data?.user && data.user.identities && data.user.identities.length === 0) {
                    throw new Error("Questa email è già registrata. Prova ad accedere o recupera la password.");
                }
                
                if (isMounted.current) {
                    setSuccessMessage("Registrazione avvenuta! Controlla l'email per confermare.");
                    setFullName(''); // Svuota campo nome utente
                    setEmail(''); // Svuota campo email
                    setPassword(''); // Svuota campo password
                    setMode('signin'); // Passa alla modalità Accedi
                }
            } else if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onClose();
            }
        } catch (err: any) {
            if (isMounted.current) setError(err.message || 'Errore');
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { setError("Inserisci email."); return; }
        
        setLoading(true);
        setError(null);
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('beewise_recovery_pending', 'true');
            }
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'com.beewise.diario://auth/callback'
            });
            if (error) throw error;
            if (isMounted.current) {
                setSuccessMessage("Email inviata!");
                setEmail('');
            }
        } catch (err: any) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('beewise_recovery_pending');
            }
            if (isMounted.current) setError(err.message || "Errore");
        } finally {
            if (isMounted.current) setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || password.length < 6) { setError("Password troppo corta."); return; }

        setLoading(true);
        setError(null);
        
        // Timer di emergenza
        const safetyWatchdog = setTimeout(() => {
            if (isMounted.current && loading) {
                setLoading(false);
                setError("Tempo scaduto. Riprova o controlla la connessione.");
                logger.log("WATCHDOG: Update password timeout forzato", "warn");
            }
        }, 15000);

        try {
            // Salto la verifica esplicita della sessione perché exchangeCodeForSession 
            // l'ha già stabilita in App.tsx. updateUser fallirà se la sessione non c'è.
            setLoadingStep("Invio nuova password...");
            logger.log("Procedo con updateUser...");

            const { error: updateError } = await supabase.auth.updateUser({ password: password });
            
            if (updateError) {
                logger.log(`Errore Supabase update: ${updateError.message}`, 'error');
                throw updateError;
            }
            
            logger.log("Password aggiornata con successo.");
            
            if (isMounted.current) {
                setSuccessMessage("Password salvata! Ora effettua l'accesso.");
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('beewise_recovery_pending');
                }
                resetPasswordRecoveryFlow();
                setPassword('');
                
                // Disconnetti l'utente per forzarlo a fare il login con la nuova password
                await supabase.auth.signOut();
                
                setTimeout(() => { 
                    if (isMounted.current) {
                        setMode('signin');
                        setSuccessMessage(null);
                    } 
                }, 2500);
            }

        } catch (err: any) {
            logger.log(`ECCEZIONE handleUpdatePassword: ${err.message}`, 'error');
            if (isMounted.current) setError(err.message || "Errore durante l'aggiornamento.");
        } finally {
            clearTimeout(safetyWatchdog);
            if (isMounted.current) {
                setLoading(false);
                setLoadingStep('');
            }
        }
    };

    const handleModalClose = async () => {
        // Se l'utente chiude il modale mentre è in modalità recupero password,
        // lo scolleghiamo per sicurezza (dato che il link lo aveva loggato temporaneamente)
        if (mode === 'update_password') {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('beewise_recovery_pending');
            }
            resetPasswordRecoveryFlow();
            await supabase.auth.signOut();
        }
        onClose();
    };

    const getTitle = () => {
        switch (mode) {
            case 'signin': return "Accedi";
            case 'signup': return "Registrati";
            case 'recovery': return "Recupera Password";
            case 'update_password': return "Nuova Password";
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleModalClose} 
            title={getTitle()}
            disableBackdropClick={mode === 'update_password'}
            hideCloseButton={mode === 'update_password'}
        >
            <div className="space-y-6">
                {(mode === 'signin' || mode === 'signup') && (
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        <button className={`flex-1 pb-2 text-sm font-medium ${mode === 'signin' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-slate-500'}`} onClick={() => setMode('signin')}>Accedi</button>
                        <button className={`flex-1 pb-2 text-sm font-medium ${mode === 'signup' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-slate-500'}`} onClick={() => setMode('signup')}>Registrati</button>
                    </div>
                )}

                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">{error}</div>}
                {successMessage && <div className="p-3 bg-green-50/10 text-green-600 text-sm rounded-md border border-green-200 dark:border-green-900 font-medium text-center">{successMessage}</div>}

                {mode === 'update_password' ? (
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <p className="text-sm text-slate-500">Imposta la tua nuova password.</p>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Nuova password"
                                className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:text-white"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 text-slate-400">
                                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-2 bg-green-600 text-white rounded-md font-medium disabled:bg-slate-400">
                            {loading ? (loadingStep || 'Salvataggio...') : 'Salva Nuova Password'}
                        </button>
                        <button 
                            type="button" 
                            onClick={handleModalClose} 
                            disabled={loading}
                            className="w-full py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                            Annulla
                        </button>
                    </form>
                ) : mode === 'recovery' ? (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tua email" className="w-full p-2 border rounded-md dark:bg-slate-700 dark:text-white" required />
                        <button type="submit" disabled={loading} className="w-full py-2 bg-amber-600 text-white rounded-md">{loading ? 'Invio...' : 'Invia Link di Reset'}</button>
                        <button type="button" onClick={() => setMode('signin')} className="w-full text-center text-sm text-slate-500">Torna al Login</button>
                    </form>
                ) : (
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {mode === 'signup' && (
                            <input 
                                type="text" 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)} 
                                placeholder="Nome Utente" 
                                className="w-full p-2 border rounded-md dark:bg-slate-700 dark:text-white" 
                                required 
                            />
                        )}
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 border rounded-md dark:bg-slate-700 dark:text-white" required />
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 border rounded-md dark:bg-slate-700 dark:text-white" required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 text-slate-400">
                                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        {mode === 'signin' && <button type="button" onClick={() => setMode('recovery')} className="w-full text-right text-sm text-amber-600">Password dimenticata?</button>}
                        <button type="submit" disabled={loading} className="w-full py-2 bg-amber-600 text-white rounded-md">{loading ? 'Attendere...' : (mode === 'signin' ? 'Accedi' : 'Crea Account')}</button>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default AuthModal;