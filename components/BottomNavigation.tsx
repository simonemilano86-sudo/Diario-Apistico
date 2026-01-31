
import React from 'react';
import { View } from '../types';
import { HomeIcon, CalendarIcon, ToolsIcon, SparklesIcon } from './Icons';

interface BottomNavigationProps {
    currentView: View;
    setCurrentView: (view: View) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentView, setCurrentView }) => {
    // Determina se una tab è attiva (gestisce anche le sottoviste)
    const isActive = (tab: 'home' | 'calendar' | 'tools' | 'ai') => {
        switch (tab) {
            case 'home':
                return currentView === 'dashboard' || currentView === 'apiaryDetails' || currentView === 'hiveDetails';
            case 'calendar':
                return currentView === 'calendar';
            case 'tools':
                return currentView === 'tools' || currentView === 'seasonalNotes' || currentView === 'production' || currentView === 'movements' || currentView === 'nfc';
            case 'ai':
                return currentView === 'aiAssistant';
            default:
                return false;
        }
    };

    const navClass = (active: boolean) => 
        `flex flex-col items-center justify-center w-full h-full space-y-0.5 py-1 ${active ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`;

    return (
        <div 
            className="fixed bottom-0 left-0 z-40 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
            style={{ 
                paddingBottom: 'env(safe-area-inset-bottom)', 
                height: 'calc(env(safe-area-inset-bottom) + 52px)'
            }}
        >
            <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
                <button 
                    type="button" 
                    onClick={() => setCurrentView('dashboard')}
                    className={navClass(isActive('home'))}
                >
                    <HomeIcon className="w-5 h-5 mb-0.5"/>
                    <span className="text-[9px] uppercase tracking-wider">Home</span>
                </button>
                
                <button 
                    type="button" 
                    onClick={() => setCurrentView('calendar')}
                    className={navClass(isActive('calendar'))}
                >
                    <CalendarIcon className="w-5 h-5 mb-0.5"/>
                    <span className="text-[9px] uppercase tracking-wider">Attività</span>
                </button>
                
                <button 
                    type="button" 
                    onClick={() => setCurrentView('tools')}
                    className={navClass(isActive('tools'))}
                >
                    <ToolsIcon className="w-5 h-5 mb-0.5"/>
                    <span className="text-[9px] uppercase tracking-wider">Strumenti</span>
                </button>
                
                <button 
                    type="button" 
                    onClick={() => setCurrentView('aiAssistant')}
                    className={navClass(isActive('ai'))}
                >
                    <SparklesIcon className="w-5 h-5 mb-0.5"/>
                    <span className="text-[9px] uppercase tracking-wider">AI</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNavigation;
