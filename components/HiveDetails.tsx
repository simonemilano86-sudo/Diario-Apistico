
import React, { useState, useRef, useEffect } from 'react';
import { Hive, Inspection, HiveStatus, HiveMovement, QueenRace, ProductionRecord } from '../types';
import { PlusIcon, BackArrowIcon, EditIcon, TrashIcon, BeehiveIcon, CheckCircleIcon, WarningIcon, ChevronUpIcon, ChevronDownIcon, MicrophoneIcon, CalendarIcon, SearchIcon, XCircleIcon, MoreVerticalIcon } from './Icons';
import HiveCard from './HiveCard';
import WeatherWidget from './WeatherWidget';

const getQueenColor = (year: number): string => {
    const lastDigit = year % 10;
    switch (lastDigit) {
        case 1: case 6: return 'bg-white border border-slate-400';
        case 2: case 7: return 'bg-yellow-400';
        case 3: case 8: return 'bg-red-500';
        case 4: case 9: return 'bg-green-500';
        case 5: case 0: return 'bg-blue-500';
        default: return 'bg-slate-400';
    }
};

interface HiveDetailsProps {
    hive: Hive;
    onBack: () => void;
    onAddInspection: () => void;
    onAddProduction: () => void;
    onEditHive: (hive: Hive) => void;
    onUpdateHive: (hive: Hive) => void;
    onDeleteHive: (hiveId: string) => void;
    onDeleteInspection: (inspectionId: string) => void;
    onEditInspection: (inspection: Inspection) => void;
    onDeleteMovement: (movementId: string) => void;
    onEditMovement: (movement: HiveMovement) => void;
    onDeleteProduction: (productionId: string) => void;
    onEditProduction: (record: ProductionRecord) => void;
    onOpenCalendar: () => void;
    isScrolling?: boolean;
    canDelete?: boolean;
    canEdit?: boolean;
    canAdd?: boolean;
    hasTeamMembers?: boolean;
}

const InspectionCard: React.FC<{inspection: Inspection, index: number, onEdit: (inspection: Inspection) => void, onDelete: (id: string) => void, canEdit: boolean, canDelete: boolean, hasTeamMembers: boolean }> = ({ inspection, index, onEdit, onDelete, canEdit, canDelete, hasTeamMembers }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    // Determina se mostrare il nome dell'autore
    const showAuthor = hasTeamMembers && inspection.createdBy;

    return (
        <div className="relative border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 last:border-0 last:mb-0 p-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            
            {/* Menu Context */}
            {(canEdit || canDelete) && (
                <div className="absolute top-1 right-0 z-20" ref={menuRef}>
                    <button 
                        onClick={toggleMenu}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                        <MoreVerticalIcon className="w-4 h-4"/>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                            {canEdit && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMenuOpen(false);
                                        onEdit(inspection);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
                                >
                                    <EditIcon className="w-4 h-4"/> Modifica
                                </button>
                            )}
                            {canEdit && canDelete && <div className="h-px bg-slate-100 dark:bg-slate-600"></div>}
                            {canDelete && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMenuOpen(false);
                                        onDelete(inspection.id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                >
                                    <TrashIcon className="w-4 h-4"/> Elimina
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between items-center mb-0.5 pr-6">
                <h4 className="font-bold text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2 flex-wrap leading-tight">
                    {new Date(inspection.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    <span className="flex items-center gap-1">
                        {inspection.time && (
                            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                ({inspection.time})
                            </span>
                        )}
                        {inspection.temperature !== undefined && (
                            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1 bg-slate-100 dark:bg-slate-700 px-1 rounded">
                                {inspection.temperature}°C
                            </span>
                        )}
                    </span>
                </h4>
            </div>
            
            {/* Main Grid for Metrics - Ultra Compact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-0.5 gap-x-2 text-[11px] mb-1 text-slate-700 dark:text-slate-300">
                <div className={`flex items-center gap-1.5 ${inspection.sawQueen ? 'text-green-600 dark:text-green-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                    {inspection.sawQueen ? <CheckCircleIcon className="w-3 h-3"/> : <div className="w-3 h-3 rounded-full border border-current" />}
                    <span>Regina</span>
                </div>
                
                <div className={`flex items-center gap-1.5 ${
                    inspection.sawEggs ? 'text-green-600 dark:text-green-400 font-medium' :
                    inspection.noBrood ? 'text-red-500 dark:text-red-400 font-medium' :
                    'text-slate-400 dark:text-slate-500'
                }`}>
                    {inspection.sawEggs ? <CheckCircleIcon className="w-3 h-3"/> : (inspection.noBrood ? <WarningIcon className="w-3 h-3"/> : <div className="w-3 h-3 rounded-full border border-current" />)}
                    <span>
                        {inspection.sawEggs ? 'Uova' : (inspection.noBrood ? 'No Covata' : 'Covata?')}
                    </span>
                </div>
                
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Presid:</span> {inspection.occupiedFrames ?? '--'}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Covata:</span> {inspection.broodFrames ?? '--'}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Diafram:</span> {inspection.diaphragms ?? '--'}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Miele:</span> {inspection.honeyStores ?? '--'}</p>
            </div>

            {/* Secondary Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5 text-[10px] mb-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-md border border-slate-100 dark:border-slate-700/50">
                {inspection.disease && inspection.disease !== 'Nessuna' && (
                    <p className="text-red-600 dark:text-red-400 font-medium truncate">
                        <span className="text-slate-600 dark:text-slate-300 font-normal">Malattia:</span> {inspection.disease}
                    </p>
                )}
                {inspection.treatment && inspection.treatment !== 'Nessuno' && (
                    <p className="text-blue-600 dark:text-blue-400 font-medium truncate">
                        <span className="text-slate-600 dark:text-slate-300 font-normal">Tratt:</span> {inspection.treatment}
                    </p>
                )}
                {inspection.feeding && inspection.feeding !== 'Nessuna' && (
                     <p className="text-amber-600 dark:text-amber-400 font-medium truncate">
                        <span className="text-slate-600 dark:text-slate-300 font-normal">Nutr:</span> {inspection.feeding}
                    </p>
                )}
                 <p className="truncate">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Temp:</span> {inspection.temperament || '--'}
                </p>
            </div>

            {/* Audio Note */}
            {inspection.audioNote && (
                <div className="mb-1 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 p-1 rounded-md border border-amber-100 dark:border-amber-900/30">
                    <MicrophoneIcon className="w-3 h-3 text-amber-500" />
                    <audio controls src={inspection.audioNote} className="h-5 w-full max-w-[150px]" />
                </div>
            )}

            {inspection.actions && <p className="text-[11px] leading-tight mt-0.5"><span className="font-semibold text-slate-700 dark:text-slate-200">Azioni:</span> <span className="text-slate-600 dark:text-slate-300 line-clamp-2">{inspection.actions}</span></p>}
            {inspection.notes && <p className="text-[11px] mt-0.5 italic text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">"{inspection.notes}"</p>}
            
            {/* Audit Info - MOSTRATO SOLO SE CI SONO ALTRI MEMBRI DEL TEAM */}
            {showAuthor && (
                <p className="text-[9px] text-slate-400 italic mt-1 text-right">Aggiunto da: {inspection.createdBy}</p>
            )}

            {/* Counter Number - Posizione dinamica: se mostriamo l'autore va sopra (bottom-5), altrimenti in basso (bottom-1) */}
            <div className={`absolute right-2 font-bold text-lg text-slate-100 dark:text-slate-700 select-none pointer-events-none ${showAuthor ? 'bottom-5' : 'bottom-1'}`}>
                #{index}
            </div>
        </div>
    );
};

const HiveDetails: React.FC<HiveDetailsProps> = ({ 
    hive, onBack, onAddInspection, onAddProduction, onEditHive, onUpdateHive, 
    onDeleteHive, onDeleteInspection, onEditInspection, onDeleteMovement, onEditMovement, 
    onDeleteProduction, onEditProduction, onOpenCalendar, isScrolling,
    canDelete = true, canEdit = true, canAdd = true, hasTeamMembers = false
}) => {
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const currentYear = new Date().getFullYear();

    const sortedInspections = [...hive.inspections].sort((a,b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        if (b.time && a.time) return b.time.localeCompare(a.time);
        return 0;
    });

    const filteredInspections = sortedInspections.filter(insp => {
        if (!filterMonth) return true;
        const d = new Date(insp.date);
        return d.getMonth() === parseInt(filterMonth);
    });

    const updateHiveField = (field: keyof Hive, value: any) => {
        if (!canEdit) return;
        onUpdateHive({ ...hive, [field]: value });
    };

    const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    return (
        <div className="animate-fade-in relative pb-20">
            
            {/* Header: Back, Title, Filter */}
            <div className="flex justify-between items-center mb-4 h-10">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack} 
                        className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600" 
                        title="Torna indietro"
                    >
                        <BackArrowIcon className="w-6 h-6"/>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filtro Mese con Lente */}
                    <div className={`flex items-center transition-all duration-300 ${isFilterVisible || filterMonth ? 'w-40 sm:w-48' : 'w-10'}`}>
                        {isFilterVisible || filterMonth ? (
                            <div className="relative w-full flex items-center gap-1">
                                <div className="relative w-full">
                                    <select
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(e.target.value)}
                                        className="w-full appearance-none bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-1.5 pl-2.5 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600"
                                        autoFocus
                                    >
                                        <option value="">Tutti</option>
                                        {months.map((m, i) => (
                                            <option key={i} value={i}>{m}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
                                        <ChevronDownIcon className="h-3 w-3" />
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setFilterMonth(''); setIsFilterVisible(false); }}
                                    className="text-slate-400 hover:text-red-500 flex-shrink-0 p-1"
                                >
                                    <XCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsFilterVisible(true)}
                                className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition shadow-sm"
                                title="Filtra per mese"
                            >
                                <SearchIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg mb-3 border border-slate-100 dark:border-slate-700">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    
                    {/* Status Select */}
                    <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md px-2 py-1 text-center h-full flex flex-col justify-center relative group">
                        <label htmlFor="status-select" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0 uppercase tracking-wider block">Stato</label>
                        <div className="flex items-center justify-center w-full relative">
                            <select 
                                id="status-select"
                                value={hive.status} 
                                onChange={(e) => updateHiveField('status', e.target.value)}
                                disabled={!canEdit}
                                className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 text-center appearance-none cursor-pointer focus:outline-none z-10 truncate py-0.5 disabled:cursor-not-allowed"
                            >
                                {Object.values(HiveStatus).map((status) => (
                                    <option 
                                        key={status} 
                                        value={status} 
                                        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    >
                                        {status}
                                    </option>
                                ))}
                            </select>
                            {canEdit && (
                                <div className="absolute inset-0 flex items-center justify-end pr-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronDownIcon className="w-3 h-3 text-slate-400"/>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Queen Race Select */}
                    <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md px-2 py-1 text-center h-full flex flex-col justify-center relative group">
                        <label htmlFor="race-select" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0 uppercase tracking-wider block">Sottospecie</label>
                        <div className="flex items-center justify-center w-full relative">
                            <select 
                                id="race-select"
                                value={hive.queenRace} 
                                onChange={(e) => updateHiveField('queenRace', e.target.value)}
                                disabled={!canEdit}
                                className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-slate-100 text-center appearance-none cursor-pointer focus:outline-none z-10 truncate px-2 py-0.5 disabled:cursor-not-allowed"
                            >
                                {Object.values(QueenRace).map((race) => (
                                    <option 
                                        key={race} 
                                        value={race} 
                                        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    >
                                        {race}
                                    </option>
                                ))}
                            </select>
                            {canEdit && (
                                <div className="absolute inset-0 flex items-center justify-end pr-1 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronDownIcon className="w-3 h-3 text-slate-400"/>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Queen Year Stepper */}
                    <div className="bg-slate-100 dark:bg-slate-700/50 rounded-md px-2 py-1 text-center h-full flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0 uppercase tracking-wider">Anno Regina</p>
                        <div className="flex items-center justify-center gap-1.5">
                            {canEdit && (
                                <button 
                                    onClick={() => updateHiveField('queenYear', hive.queenYear - 1)}
                                    className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 transition"
                                >
                                    <ChevronDownIcon className="w-3 h-3"/>
                                </button>
                            )}
                            
                            <div className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full border border-slate-300 shadow-sm ${getQueenColor(hive.queenYear)}`}></span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{hive.queenYear}</p>
                            </div>

                            {canEdit && (
                                <button 
                                    onClick={() => hive.queenYear < currentYear && updateHiveField('queenYear', hive.queenYear + 1)}
                                    disabled={hive.queenYear >= currentYear}
                                    className={`p-0.5 rounded-full transition ${hive.queenYear >= currentYear ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400'}`}
                                >
                                    <ChevronUpIcon className="w-3 h-3"/>
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Inspections Section */}
            <div className="w-full">
                <div className="flex justify-between items-center mb-3 px-1">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        Ispezioni
                        {filterMonth && <span className="text-sm font-normal text-slate-500 ml-2">({months[parseInt(filterMonth)]})</span>}
                    </h3>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-3 border border-slate-200 dark:border-slate-700 min-h-[100px]">
                    {filteredInspections.length > 0 ? (
                        filteredInspections.map((insp, index) => (
                            <InspectionCard 
                                key={insp.id} 
                                inspection={insp} 
                                index={filteredInspections.length - index} 
                                onEdit={onEditInspection} 
                                onDelete={onDeleteInspection}
                                canEdit={canEdit}
                                canDelete={canDelete}
                                hasTeamMembers={hasTeamMembers}
                            />
                        ))
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                {filterMonth ? "Nessuna ispezione trovata per questo mese." : "Nessuna ispezione registrata."}
                            </p>
                            {!filterMonth && canAdd && <p className="text-xs text-slate-400 mt-1">Clicca sul "+" per aggiungere la prima!</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* FAB per aggiungere Ispezione - Raised up */}
            {canAdd && (
                <button 
                    onClick={onAddInspection}
                    className={`fixed right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-all duration-300 z-50 ${isScrolling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    title="Nuova Ispezione"
                    style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
                >
                    <PlusIcon className="w-8 h-8" />
                </button>
            )}

        </div>
    );
};

export default HiveDetails;
