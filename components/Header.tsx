
import React, { useState, useRef, useEffect } from 'react';
import { View, User, Role } from '../types';
import { BeeIcon, LogoutIcon, CloudIcon, CloudOffIcon, HardDriveIcon, UsersIcon } from './Icons';

interface HeaderProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    user: User | null;
    loading: boolean;
    onOpenAuth: () => void;
    onLogout: () => void;
    isSyncing: boolean;
    hasUnsavedChanges: boolean;
    lastSyncTime: Date | null;
    isOnline?: boolean;
    onSync?: () => void;
    onOpenPremium?: () => void;
    onFeedbackClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    currentView, 
    setCurrentView, 
    user, 
    loading,
    onOpenAuth, 
    onLogout, 
    isSyncing, 
    hasUnsavedChanges, 
    lastSyncTime,
    isOnline = true,
    onSync,
    onOpenPremium,
    onFeedbackClick
}) => {
    console.log("DEBUG: Header user prop =", user, "loading =", loading);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showSyncInfo, setShowSyncInfo] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const syncRef = useRef<HTMLDivElement>(null);

    // Gestione click esterno per chiudere menu e tooltip
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            // Chiudi menu utente
            if (menuRef.current && !menuRef.current.contains(target)) {
                setIsMenuOpen(false);
            }
            // Chiudi tooltip sync
            if (syncRef.current && !syncRef.current.contains(target)) {
                setShowSyncInfo(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Timer per chiusura automatica tooltip dopo la lettura
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (showSyncInfo) {
            timer = setTimeout(() => {
                setShowSyncInfo(false);
            }, 4000); // 4 secondi per leggere
        }
        return () => clearTimeout(timer);
    }, [showSyncInfo]);

    // Timer per apertura automatica tooltip se la sync dura troppo
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (isSyncing) {
            timer = setTimeout(() => {
                setShowSyncInfo(true);
            }, 5000); // 5 secondi di attesa
        } else {
            setShowSyncInfo(false); // Chiudi se la sync finisce
        }
        return () => clearTimeout(timer);
    }, [isSyncing]);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
        setShowSyncInfo(false); // Chiude l'altro se aperto
    };

    const toggleSyncInfo = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowSyncInfo(!showSyncInfo);
        setIsMenuOpen(false); // Chiude l'altro se aperto
    };

    const getSyncStatus = () => {
        if (!user) return null;
        
        let icon: React.ReactNode = null;
        let iconClass = "";
        let containerClass = "";
        let text = "";
        let popupTitle = "";
        let popupDesc = "";

        if (!isOnline) {
            icon = <CloudOffIcon className="w-4 h-4" />;
            iconClass = "text-slate-600 dark:text-slate-400";
            containerClass = "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300";
            text = "Offline";
            popupTitle = "Senza Connessione";
            popupDesc = user.plan === 'premium' 
                ? "Sei offline. Le modifiche Premium sono protette localmente e verranno sincronizzate appena torni online."
                : "Sei offline. I dati sono salvati sul dispositivo.";
        } else if (user.plan === 'free') {
            icon = <HardDriveIcon className="w-4 h-4" />;
            iconClass = "text-slate-400";
            containerClass = "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400";
            text = "Locale";
            popupTitle = "Archiviazione Locale";
            popupDesc = "I tuoi dati sono salvati solo su questo dispositivo. Passa a Premium per sbloccare il backup cloud e la sincronizzazione.";
        } else if (isSyncing) {
            icon = <CloudIcon className="w-4 h-4" />;
            iconClass = "text-blue-500 animate-pulse";
            containerClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600";
            text = "Sync...";
            popupTitle = "Sincronizzazione";
            popupDesc = "Stiamo aggiornando i tuoi dati con il cloud per tenerli al sicuro.";
        } else if (hasUnsavedChanges) {
            icon = <CloudIcon className="w-4 h-4" />;
            iconClass = "text-amber-500";
            containerClass = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600";
            text = "In attesa";
            popupTitle = "Dati pronti";
            popupDesc = "Ci sono modifiche salvate localmente in attesa di essere caricate sul cloud.";
        } else {
            // Stato salvato (Default Green Cloud)
            icon = <CloudIcon className="w-4 h-4" />;
            iconClass = "text-emerald-500";
            containerClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600";
            text = "Sicuro";
            popupTitle = "Tutto Sincronizzato";
            popupDesc = "I tuoi dati Premium sono al sicuro nel cloud. Ultimo salvataggio: " + (lastSyncTime?.toLocaleTimeString() || 'Adesso');
        }

        return (
            <div className="relative" ref={syncRef}>
                <div 
                    onClick={(e) => {
                        if (user.plan === 'free') {
                            if (onOpenPremium) onOpenPremium();
                            return;
                        }
                        if (hasUnsavedChanges && onSync) {
                            e.stopPropagation();
                            onSync();
                        } else {
                            toggleSyncInfo(e);
                        }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border cursor-pointer transition-all duration-200 ${containerClass} ${hasUnsavedChanges && user.plan !== 'free' ? 'hover:scale-105 active:scale-95 shadow-sm' : ''}`}
                    title={hasUnsavedChanges && user.plan !== 'free' ? "Clicca per forzare la sincronizzazione" : ""}
                >
                    <div className={iconClass}>{icon}</div>
                    <span className="hidden sm:inline font-bold">{text}</span>
                </div>

                {/* Mini Pop-up (Tooltip) */}
                {showSyncInfo && (
                    <div className="absolute top-full mt-3 right-0 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-fade-in text-left">
                        {/* Freccetta del tooltip */}
                        <div className="absolute -top-1.5 right-4 w-3 h-3 bg-white dark:bg-slate-800 border-t border-l border-slate-200 dark:border-slate-700 transform rotate-45"></div>
                        
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1">{popupTitle}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {popupDesc}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <header 
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-sm sticky top-0 z-30 transition-all border-b border-slate-200 dark:border-slate-700"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                        <BeeIcon className="h-8 w-8 text-amber-500" />
                        <span className="font-bold text-lg text-slate-800 dark:text-white tracking-tight">Diario Apistico</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        
                        {/* Sync Status Indicator (Clickable Cloud) */}
                        {getSyncStatus()}

                        {!user ? (
                            <button
                                onClick={onOpenAuth}
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
                            >
                                Accedi
                            </button>
                        ) : (
                            <div className="relative" ref={menuRef}>
                                <div 
                                    className="flex items-center gap-2 cursor-pointer" 
                                    onClick={toggleMenu}
                                >
                                    {/* Avatar (Iniziale) */}
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm border border-slate-200 dark:border-slate-600 shadow-sm">
                                            {user.name ? user.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'U')}
                                        </div>
                                    </div>
                                </div>

                                {/* Dropdown Menu */}
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-600">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                            <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-medium capitalize border border-slate-200 dark:border-slate-500">
                                                {user.role || 'Utente'}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => { 
                                                setIsMenuOpen(false); 
                                                setCurrentView('teamManagement'); 
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-between gap-2"
                                        >
                                            <div className="flex items-center gap-2">
                                                <UsersIcon className="w-4 h-4"/> Gestione Team
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => { 
                                                setIsMenuOpen(false); 
                                                if (onFeedbackClick) onFeedbackClick();
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
                                        >
                                            <span className="text-base">💬</span> Feedback
                                        </button>
                                        <div className="h-px bg-slate-100 dark:bg-slate-600"></div>
                                        <button 
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onLogout();
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 font-medium"
                                        >
                                            <LogoutIcon className="w-4 h-4"/> Log out
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
