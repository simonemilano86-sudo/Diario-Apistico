import React from 'react';
import { Apiary, User, TeamOption } from '../types';
import { BeeIcon, UsersIcon, ChevronDownIcon, CheckCircleIcon, PlusIcon, CloudIcon } from './Icons';
import ApiaryCard from './ApiaryCard';

interface DashboardViewProps {
    user: User | null;
    apiaries: Apiary[];
    availableTeams: TeamOption[];
    activeTeamId: string | null;
    isScopeMenuOpen: boolean;
    setIsScopeMenuOpen: (open: boolean) => void;
    scopeMenuRef: React.RefObject<HTMLDivElement | null>;
    switchScope: (teamId: string | null) => void;
    handleSelectApiary: (apiary: Apiary) => void;
    requestDeleteApiary?: (id: string, name: string) => void;
    setApiaryToEdit: (apiary: Apiary | null) => void;
    setIsApiaryModalOpen: (open: boolean) => void;
    canAdd: boolean;
    isScrolling: boolean;
    hasUnsavedChanges?: boolean;
    onSync?: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
    user, apiaries, availableTeams, activeTeamId, isScopeMenuOpen, 
    setIsScopeMenuOpen, scopeMenuRef, switchScope, handleSelectApiary,
    requestDeleteApiary, setApiaryToEdit, setIsApiaryModalOpen, canAdd, isScrolling,
    hasUnsavedChanges, onSync
}) => {
    const totalHives = apiaries.reduce((acc, a) => acc + (a.hives ? a.hives.length : 0), 0);
    const currentScopeLabel = activeTeamId 
        ? availableTeams.find(t => t.team_id === activeTeamId)?.team_name 
        : 'Profilo personale';

    // Determina se mostrare il menu di contesto:
    // Richiesta: Il menu deve essere visibile ESCLUSIVAMENTE per l'operatore (chi è stato invitato).
    // Gli amministratori (role: 'ADMIN') non devono vedere il selettore.
    const hasOperatorRoles = availableTeams.some(t => {
        const r = (t.role || '').toUpperCase();
        return r !== 'ADMIN' && r !== 'OWNER';
    });
    
    const showScopeSelector = !!user && hasOperatorRoles;

    return (
        <div className="animate-fade-in pb-20">
            {hasUnsavedChanges && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-full text-amber-600">
                            <CloudIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Sincronizzazione in attesa</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">Dati salvati solo localmente. <b>Non disinstallare l'app</b> o uscirai senza salvare.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onSync}
                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition shadow-sm"
                    >
                        Sincronizza ora
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Bentornato, {user?.name.split(' ')[0] || 'Apicoltore'}!</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Hai <span className="font-bold text-amber-500">{apiaries.length}</span> apiari e <span className="font-bold text-amber-500">{totalHives}</span> arnie.</p>
                    </div>
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-500"><BeeIcon className="w-8 h-8" /></div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">{activeTeamId ? 'Apiari del Team' : 'Apiari personali'}</h2>
                    {showScopeSelector && (
                        <div className="relative" ref={scopeMenuRef}>
                            <button onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition border shadow-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500">
                                <UsersIcon className="w-3.5 h-3.5" /><span className="truncate max-w-[120px]">{currentScopeLabel}</span><ChevronDownIcon className={`w-3 h-3 transition-transform duration-200 ${isScopeMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isScopeMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30"><p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Scegli contesto</p></div>
                                    <button onClick={() => switchScope(null)} className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${!activeTeamId ? 'text-amber-600 bg-amber-50/50 dark:bg-amber-900/10 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Profilo personale{!activeTeamId && <CheckCircleIcon className="w-4 h-4"/>}</button>
                                    {availableTeams.map(t => (<button key={t.team_id} onClick={() => switchScope(t.team_id)} className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${activeTeamId === t.team_id ? 'text-amber-600 bg-amber-50/50 dark:bg-amber-900/10 font-bold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>Team: {t.team_name}{activeTeamId === t.team_id && <CheckCircleIcon className="w-4 h-4"/>}</button>))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {apiaries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {apiaries.map(a => (
                            <ApiaryCard 
                                key={a.id} 
                                apiary={a} 
                                onSelect={handleSelectApiary} 
                                onDelete={requestDeleteApiary ? () => requestDeleteApiary(a.id, a.name) : undefined} 
                                onEdit={(e) => { e.stopPropagation(); setApiaryToEdit(a); setIsApiaryModalOpen(true); }} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                        <div className="bg-slate-100 dark:bg-slate-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <PlusIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Nessun Apiario</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 mb-4">Inizia aggiungendo il tuo primo apiario.</p>
                        {canAdd && <button onClick={() => { setApiaryToEdit(null); setIsApiaryModalOpen(true); }} className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition shadow-md">Aggiungi Ora</button>}
                    </div>
                )}
            </div>
            {canAdd && (
                <button 
                    onClick={() => { setApiaryToEdit(null); setIsApiaryModalOpen(true); }} 
                    className={`fixed right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-all duration-300 z-50 ${isScrolling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} 
                    title="Aggiungi Apiario" 
                    style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
                >
                    <PlusIcon className="w-8 h-8" />
                </button>
            )}
        </div>
    );
};

export default DashboardView;