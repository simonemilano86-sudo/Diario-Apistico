
import React from 'react';
import { View, User } from '../types';
import { BeeIcon, SparklesIcon, LogoutIcon, CalendarIcon } from './Icons';

interface HeaderProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    user: User | null;
    onOpenAuth: () => void;
    onLogout: () => void;
    isSyncing: boolean;
    lastSyncTime: Date | null;
}

const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView, user, onOpenAuth, onLogout }) => {
    const navItemClasses = "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out flex items-center gap-2";
    const activeClasses = "bg-amber-400 text-slate-900";
    const inactiveClasses = "text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-slate-700";

    return (
        <header 
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-md sticky top-0 z-50 transition-all"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                        <BeeIcon className="h-10 w-10 text-amber-500" />
                        <span className="hidden md:block font-bold text-xl text-slate-800 dark:text-white">Diario Apistico</span>
                    </div>
                    
                    <nav className="flex items-center space-x-2 md:space-x-4">
                        
                        {!user ? (
                            <button
                                onClick={onOpenAuth}
                                className="px-4 py-2 rounded-md text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm"
                            >
                                Accedi
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 mr-2 bg-slate-100 dark:bg-slate-700/50 py-1 pl-1 pr-2 rounded-full border border-slate-200 dark:border-slate-600">
                                <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border border-white dark:border-slate-500" />
                                <div className="hidden lg:block text-xs text-left mr-2">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 leading-none">{user.name}</p>
                                </div>
                                <button 
                                    onClick={onLogout}
                                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition"
                                    title="Esci"
                                >
                                    <LogoutIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-2 hidden sm:block"></div>

                        <button
                            onClick={() => setCurrentView('dashboard')}
                            className={`${navItemClasses} ${currentView === 'dashboard' ? activeClasses : inactiveClasses}`}
                            title="Bacheca"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                            <span className="hidden md:inline">Bacheca</span>
                        </button>
                        
                        <button
                            onClick={() => setCurrentView('calendar')}
                            className={`${navItemClasses} ${currentView === 'calendar' ? activeClasses : inactiveClasses}`}
                            title="Calendario"
                        >
                            <CalendarIcon className="h-5 w-5" />
                            <span className="hidden md:inline">Calendario</span>
                        </button>

                        <button
                            onClick={() => setCurrentView('aiAssistant')}
                            className={`${navItemClasses} ${currentView === 'aiAssistant' ? activeClasses : inactiveClasses}`}
                            title="Assistente AI"
                        >
                            <SparklesIcon className="h-5 w-5" />
                            <span className="hidden md:inline">AI</span>
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Header;