import React, { useState } from 'react';
import { Apiary, HiveMovement } from '../types';
import { BackArrowIcon, SearchIcon, TransferIcon, MoreVerticalIcon, EditIcon, TrashIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, BeehiveIcon } from './Icons';

interface MovementsViewProps {
    apiaries: Apiary[];
    onBack: () => void;
    movementFilters: { text: string, fromApiary: string, toApiary: string, dateStart: string, dateEnd: string };
    setMovementFilters: (filters: any) => void;
    isMovementFilterOpen: boolean;
    setIsMovementFilterOpen: (open: boolean) => void;
    openMovementMenuId: string | null;
    setOpenMovementMenuId: (id: string | null) => void;
    setIsTransferModalOpen: (open: boolean) => void;
    setIsMovementModalOpen: (open: boolean) => void;
    setMovementToEdit: (movement: HiveMovement | null) => void;
    setDeleteConfirmation: (item: any) => void;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    isScrolling: boolean;
}

const MovementsView: React.FC<MovementsViewProps> = ({
    apiaries, onBack, movementFilters, setMovementFilters, isMovementFilterOpen, setIsMovementFilterOpen,
    openMovementMenuId, setOpenMovementMenuId, setIsTransferModalOpen, setIsMovementModalOpen,
    setMovementToEdit, setDeleteConfirmation, canAdd, canEdit, canDelete, isScrolling
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    React.useEffect(() => {
        // Reset search filters when component exits/unmounts
        return () => {
            setMovementFilters({ text: '', fromApiary: '', toApiary: '', dateStart: '', dateEnd: '' });
            setIsMovementFilterOpen(false);
        };
    }, []);

    const allMovements = apiaries.flatMap(apiary => 
        apiary.hives.flatMap(hive => 
            (hive.movements || []).map(m => ({ ...m, hiveName: hive.name, hiveId: hive.id, apiaryId: apiary.id }))
        )
    );
    
    const filtered = allMovements.filter(m => {
        const q = movementFilters.text.toLowerCase();
        if (q && !m.hiveName.toLowerCase().includes(q) && !m.notes?.toLowerCase().includes(q)) return false;
        if (movementFilters.fromApiary && m.fromApiaryName !== movementFilters.fromApiary) return false;
        if (movementFilters.toApiary && m.toApiaryName !== movementFilters.toApiary) return false;
        return true;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Grouping movements by key: date + from + to
    const groupedMovements: Record<string, {
        id: string;
        date: string;
        time: string;
        from: string;
        to: string;
        movements: any[];
    }> = {};

    filtered.forEach(m => {
        const key = `${m.date}_${m.fromApiaryName}_${m.toApiaryName}`;
        if (!groupedMovements[key]) {
            groupedMovements[key] = {
                id: key,
                date: m.date,
                time: m.time || '',
                from: m.fromApiaryName,
                to: m.toApiaryName,
                movements: []
            };
        }
        groupedMovements[key].movements.push(m);
    });

    const groups = Object.values(groupedMovements).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const toggleGroup = (id: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedGroups(newSet);
    };

    const activeFiltersCount = [movementFilters.text, movementFilters.fromApiary, movementFilters.toApiary, movementFilters.dateStart, movementFilters.dateEnd].filter(Boolean).length;

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-6 h-10">
                <button onClick={onBack} className="w-10 h-10 bg-white dark:bg-slate-700 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 flex-shrink-0"><BackArrowIcon className="w-5 h-5"/></button>
                <button 
                    onClick={() => {
                        if (isMovementFilterOpen) {
                            setMovementFilters({ text: '', fromApiary: '', toApiary: '', dateStart: '', dateEnd: '' });
                        }
                        setIsMovementFilterOpen(!isMovementFilterOpen);
                    }} 
                    className={`w-10 h-10 rounded-full border flex items-center justify-center relative transition-colors ${isMovementFilterOpen || activeFiltersCount > 0 ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                >
                    <SearchIcon className="w-5 h-5"/>
                    {activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeFiltersCount}</span>}
                </button>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 text-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                    <TransferIcon className="w-7 h-7"/>
                </div>
                <h2 className="text-xl font-bold">Registro Nomadismo</h2>
            </div>
            {isMovementFilterOpen && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 space-y-3">
                    <input type="text" placeholder="Cerca arnia o note..." value={movementFilters.text} onChange={e=>setMovementFilters({...movementFilters,text:e.target.value})} className="w-full text-sm p-2 border rounded dark:bg-slate-700 dark:border-slate-600"/>
                    <select value={movementFilters.fromApiary} onChange={e=>setMovementFilters({...movementFilters,fromApiary:e.target.value})} className="w-full text-sm p-2 border rounded dark:bg-slate-700 dark:border-slate-600">
                        <option value="">Da: Tutti</option>
                        {apiaries.filter(a => !a._deleted).map(a=><option key={a.id} value={a.name}>{a.name}</option>)}
                    </select>
                </div>
            )}
            <div className="space-y-3">
                {groups.length > 0 ? groups.map(group => (
                    <div key={group.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm relative">
                        <div 
                            onClick={() => toggleGroup(group.id)} 
                            className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-t-lg ${!expandedGroups.has(group.id) ? 'rounded-b-lg' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                                        {new Date(group.date).toLocaleDateString()} {group.time && <span className="font-normal text-slate-400">({group.time})</span>}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                        <span className="truncate max-w-[100px]">{group.from}</span>
                                        <div className="flex items-center">
                                            <div className="h-[1px] w-4 bg-slate-300 dark:bg-slate-600"></div>
                                            <TransferIcon className="w-3 h-3 mx-1 text-blue-500 scale-x-[-1]"/>
                                            <div className="h-[1px] w-4 bg-slate-300 dark:bg-slate-600"></div>
                                        </div>
                                        <span className="text-blue-600 dark:text-blue-400 truncate max-w-[100px]">{group.to}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800 font-bold">
                                        {group.movements.length} {group.movements.length === 1 ? 'Arnia' : 'Arnie'}
                                    </span>
                                    {expandedGroups.has(group.id) ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
                                </div>
                            </div>
                        </div>

                        {expandedGroups.has(group.id) && (
                            <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-2 space-y-2 animate-fade-in">
                                {group.movements.map(m => (
                                    <div key={m.id} className="bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-start relative group/item">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <BeehiveIcon className="w-3.5 h-3.5 text-amber-500"/>
                                                <span className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Arnia {m.hiveName}</span>
                                            </div>
                                            {m.notes && (
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded mt-1 border-l-2 border-slate-200 dark:border-slate-600">
                                                    "{m.notes}"
                                                </p>
                                            )}
                                        </div>
                                        <div className="relative ml-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMovementMenuId(openMovementMenuId === m.id ? null : m.id);
                                                }} 
                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                            >
                                                <MoreVerticalIcon className="w-4 h-4"/>
                                            </button>
                                            {openMovementMenuId === m.id && (
                                                <div className="absolute right-0 top-full bg-white dark:bg-slate-700 shadow-xl border border-slate-200 dark:border-slate-600 rounded-lg z-50 overflow-hidden min-w-[100px] mt-1">
                                                    <button 
                                                        onClick={() => {
                                                            setOpenMovementMenuId(null);
                                                            setMovementToEdit(m);
                                                            setIsMovementModalOpen(true);
                                                        }} 
                                                        className="px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-600 w-full text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 transition-colors"
                                                    >
                                                        <EditIcon className="w-3.5 h-3.5"/>Modifica
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setOpenMovementMenuId(null);
                                                            setDeleteConfirmation({
                                                                type: 'movement', 
                                                                id: m.id, 
                                                                apiaryId: m.apiaryId, 
                                                                hiveId: m.hiveId,
                                                                name: `spostamento arnia ${m.hiveName}`
                                                            });
                                                        }} 
                                                        className="px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 w-full text-left flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5"/>Elimina
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )) : <div className="py-12 text-center text-slate-400 italic">Nessuno spostamento registrato.</div>}
            </div>
            {canAdd && <button onClick={()=>setIsTransferModalOpen(true)} className={`fixed right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 z-40 ${isScrolling?'opacity-0':'opacity-100'}`} style={{bottom:'calc(6rem + env(safe-area-inset-bottom))'}}><PlusIcon className="w-8 h-8"/></button>}
        </div>
    );
};

export default MovementsView;
