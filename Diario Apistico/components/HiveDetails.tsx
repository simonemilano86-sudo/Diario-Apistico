
import React from 'react';
import { Hive, Inspection, HiveStatus, HiveMovement, QueenRace, ProductionRecord } from '../types';
import { PlusIcon, BackArrowIcon, EditIcon, TrashIcon, TransferIcon, BeehiveIcon, CheckCircleIcon, WarningIcon, ChevronUpIcon, ChevronDownIcon, HistoryIcon, MapPinIcon, JarIcon, FlowerIcon, MicrophoneIcon, CalendarIcon, GridIcon } from './Icons';
import HiveCard from './HiveCard';

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
}

const InspectionCard: React.FC<{inspection: Inspection, index: number, onDelete: (id: string) => void, onEdit: (inspection: Inspection) => void}> = ({ inspection, index, onDelete, onEdit }) => (
    <div className="relative border-b border-slate-200 dark:border-slate-700 pb-8 mb-6 last:border-0 last:pb-0 last:mb-0 group">
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2 flex-wrap">
                {new Date(inspection.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                <span className="flex items-center gap-1">
                    {inspection.time && (
                        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                            ({inspection.time})
                        </span>
                    )}
                    {inspection.temperature !== undefined && (
                        <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">
                            {inspection.temperature}°C
                        </span>
                    )}
                </span>
            </h4>
            <div className="flex gap-2">
                <button 
                    onClick={() => onEdit(inspection)} 
                    type="button"
                    className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors shadow-sm"
                    title="Modifica ispezione"
                >
                    <EditIcon className="w-4 h-4"/>
                </button>
                <button 
                    onClick={() => onDelete(inspection.id)} 
                    type="button"
                    className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors shadow-sm"
                    title="Elimina ispezione"
                >
                    <TrashIcon className="w-4 h-4"/>
                </button>
            </div>
        </div>
        
        {/* Main Grid for Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-sm mb-3">
            <div className={`flex items-center gap-2 ${inspection.sawQueen ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {inspection.sawQueen ? <CheckCircleIcon className="w-4 h-4"/> : <div className="w-4 h-4 rounded-full border border-current" />}
                <span>Regina</span>
            </div>
            
            <div className={`flex items-center gap-2 ${
                inspection.sawEggs ? 'text-green-600 dark:text-green-400' :
                inspection.noBrood ? 'text-red-500 dark:text-red-400' :
                'text-slate-400 dark:text-slate-500'
            }`}>
                {inspection.sawEggs ? <CheckCircleIcon className="w-4 h-4"/> : (inspection.noBrood ? <WarningIcon className="w-4 h-4"/> : <div className="w-4 h-4 rounded-full border border-current" />)}
                <span>
                    {inspection.sawEggs ? 'Uova' : (inspection.noBrood ? 'No Covata' : 'Covata?')}
                </span>
            </div>
            
            <p><span className="font-semibold text-slate-600 dark:text-slate-300">Telai Presidiati:</span> {inspection.occupiedFrames ?? '--'}</p>
            <p><span className="font-semibold text-slate-600 dark:text-slate-300">Telai Covata:</span> {inspection.broodFrames ?? '--'}</p>
            <p><span className="font-semibold text-slate-600 dark:text-slate-300">Diaframmi:</span> {inspection.diaphragms ?? '--'}</p>
            <p><span className="font-semibold text-slate-600 dark:text-slate-300">Miele:</span> {inspection.honeyStores ?? '--'}</p>
        </div>

        {/* Secondary Info (Disease, Feeding, Treatment) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md">
            {inspection.disease && inspection.disease !== 'Nessuna' && (
                <p className="text-red-600 dark:text-red-400 font-medium">
                    <span className="text-slate-600 dark:text-slate-300 font-normal">Malattia:</span> {inspection.disease}
                </p>
            )}
            {inspection.treatment && inspection.treatment !== 'Nessuno' && (
                <p className="text-blue-600 dark:text-blue-400 font-medium">
                    <span className="text-slate-600 dark:text-slate-300 font-normal">Trattamento:</span> {inspection.treatment}
                </p>
            )}
            {inspection.feeding && inspection.feeding !== 'Nessuna' && (
                 <p className="text-amber-600 dark:text-amber-400 font-medium">
                    <span className="text-slate-600 dark:text-slate-300 font-normal">Nutrizione:</span> {inspection.feeding}
                </p>
            )}
             <p>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Temperamento:</span> {inspection.temperament || '--'}
            </p>
        </div>

        {/* Audio Note */}
        {inspection.audioNote && (
            <div className="mb-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-md border border-amber-100 dark:border-amber-900/30">
                <MicrophoneIcon className="w-5 h-5 text-amber-500" />
                <audio controls src={inspection.audioNote} className="h-8 w-full max-w-[250px]" />
            </div>
        )}

        {inspection.actions && <p className="text-sm"><span className="font-semibold text-slate-700 dark:text-slate-200">Azioni:</span> <span className="text-slate-600 dark:text-slate-300">{inspection.actions}</span></p>}
        {inspection.notes && <p className="text-sm mt-1 italic text-slate-500 dark:text-slate-400">"{inspection.notes}"</p>}
        
        {/* Counter Number */}
        <div className="absolute bottom-2 right-0 font-bold text-2xl text-slate-200 dark:text-slate-700 select-none pointer-events-none">
            #{index}
        </div>
    </div>
);

const ProductionCard: React.FC<{record: ProductionRecord, onDelete: (id: string) => void, onEdit: (record: ProductionRecord) => void}> = ({ record, onDelete, onEdit }) => (
    <div className="relative pl-6 border-l-2 border-amber-300 dark:border-amber-700 pb-6 first:border-l-transparent">
         <div className="flex justify-between items-start">
            <div>
                <div className="mb-1 font-bold text-lg text-slate-700 dark:text-slate-200">
                    {new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                <div className="space-y-1">
                    {record.melariQuantity !== undefined && (
                        <div>
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <JarIcon className="w-4 h-4" />
                                <span className="font-medium">{record.honeyType}:</span>
                                <span>{record.melariQuantity} {record.melariQuantity === 1 ? 'melario' : 'melari'}</span>
                            </div>
                            {record.melariNotes && (
                                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 ml-6 italic">
                                    {record.melariNotes}
                                </p>
                            )}
                        </div>
                    )}
                    {record.pollenGrams !== undefined && (
                        <div>
                            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                                <FlowerIcon className="w-4 h-4" />
                                <span className="font-medium">Polline:</span>
                                <span>{record.pollenGrams}g</span>
                            </div>
                            {record.pollenNotes && (
                                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 ml-6 italic">
                                    {record.pollenNotes}
                                </p>
                            )}
                        </div>
                    )}
                    {record.propolisNets !== undefined && (
                        <div>
                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-500">
                                <GridIcon className="w-4 h-4" />
                                <span className="font-medium">Propoli:</span>
                                <span>{record.propolisNets} {record.propolisNets === 1 ? 'rete' : 'reti'}</span>
                            </div>
                            {record.propolisNotes && (
                                <p className="text-xs text-amber-800/70 dark:text-amber-500/70 ml-6 italic">
                                    {record.propolisNotes}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Removed General Notes Display */}
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => onEdit(record)} 
                    className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors shadow-sm"
                    title="Modifica produzione"
                >
                    <EditIcon className="w-4 h-4"/>
                </button>
                <button 
                    onClick={() => onDelete(record.id)} 
                    className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors shadow-sm"
                    title="Elimina produzione"
                >
                    <TrashIcon className="w-4 h-4"/>
                </button>
            </div>
        </div>
    </div>
);


const HiveDetails: React.FC<HiveDetailsProps> = ({ hive, onBack, onAddInspection, onAddProduction, onEditHive, onUpdateHive, onDeleteHive, onDeleteInspection, onEditInspection, onDeleteMovement, onEditMovement, onDeleteProduction, onEditProduction, onOpenCalendar }) => {
    const sortedInspections = [...hive.inspections].sort((a,b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        if (b.time && a.time) return b.time.localeCompare(a.time);
        return 0;
    });

    // Sort movements by Date descending. If dates are equal, sort by ID descending (newest created first)
    const sortedMovements = hive.movements ? [...hive.movements].sort((a,b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        // Fallback to ID descending to ensure latest created is top if dates are same
        return b.id.localeCompare(a.id);
    }) : [];

    // Sort production by Date descending. If dates are equal, sort by ID descending
    const sortedProduction = hive.productionRecords ? [...hive.productionRecords].sort((a,b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return b.id.localeCompare(a.id);
    }) : [];

    const updateHiveField = (field: keyof Hive, value: any) => {
        onUpdateHive({ ...hive, [field]: value });
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition">
                    <BackArrowIcon className="w-5 h-5"/>
                    Torna all'Apiario
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={onOpenCalendar}
                        className="p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors shadow-sm" 
                        title="Pianifica sul Calendario"
                    >
                        <CalendarIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => onEditHive(hive)} className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors shadow-sm" title="Modifica dettagli completi">
                        <EditIcon className="w-5 h-5"/>
                    </button>
                    <button 
                        onClick={() => onDeleteHive(hive.id)} 
                        type="button"
                        className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors shadow-sm"
                        title="Elimina arnia"
                    >
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg mb-6">
                <h2 className="text-3xl font-bold mb-4">{hive.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Status Select */}
                    <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-2 text-center h-full flex flex-col justify-center relative group">
                        <label htmlFor="status-select" className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">Stato</label>
                        <div className="flex items-center justify-center w-full relative">
                            <select 
                                id="status-select"
                                value={hive.status} 
                                onChange={(e) => updateHiveField('status', e.target.value)}
                                className="w-full bg-transparent text-lg font-semibold text-slate-800 dark:text-slate-100 text-center appearance-none cursor-pointer focus:outline-none z-10"
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
                            <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronDownIcon className="w-4 h-4 text-slate-400"/>
                            </div>
                        </div>
                    </div>

                    {/* Queen Race Select (Replaces Temperament) */}
                    <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-2 text-center h-full flex flex-col justify-center relative group">
                        <label htmlFor="race-select" className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 block">Sottospecie / Razza</label>
                        <div className="flex items-center justify-center w-full relative">
                            <select 
                                id="race-select"
                                value={hive.queenRace} 
                                onChange={(e) => updateHiveField('queenRace', e.target.value)}
                                className="w-full bg-transparent text-lg font-semibold text-slate-800 dark:text-slate-100 text-center appearance-none cursor-pointer focus:outline-none z-10 truncate px-4"
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
                            <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronDownIcon className="w-4 h-4 text-slate-400"/>
                            </div>
                        </div>
                    </div>

                    {/* Queen Year Stepper */}
                    <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-2 text-center h-full flex flex-col justify-center">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Anno Regina</p>
                        <div className="flex items-center justify-center gap-3">
                            <button 
                                onClick={() => updateHiveField('queenYear', hive.queenYear - 1)}
                                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 transition"
                            >
                                <ChevronDownIcon className="w-5 h-5"/>
                            </button>
                            
                            <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full border border-slate-300 shadow-sm ${getQueenColor(hive.queenYear)}`}></span>
                                <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">{hive.queenYear}</p>
                            </div>

                            <button 
                                onClick={() => updateHiveField('queenYear', hive.queenYear + 1)}
                                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 transition"
                            >
                                <ChevronUpIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
            
            {/* Inspection, Movement and Production Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Inspections Column */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4 h-10">
                        <h3 className="text-2xl font-semibold">Storico Ispezioni</h3>
                        <div className="flex gap-2">
                            <button onClick={onAddProduction} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition shadow-sm">
                                <JarIcon className="w-5 h-5"/>
                                <span className="hidden sm:inline">Produzione</span>
                            </button>
                            <button onClick={onAddInspection} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition shadow-sm">
                                <PlusIcon className="w-5 h-5"/>
                                <span className="hidden sm:inline">Registra Ispezione</span>
                                <span className="sm:hidden">Nuova</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                        {sortedInspections.length > 0 ? (
                            sortedInspections.map((insp, index) => (
                                <InspectionCard 
                                    key={insp.id} 
                                    inspection={insp} 
                                    index={sortedInspections.length - index} 
                                    onDelete={onDeleteInspection} 
                                    onEdit={onEditInspection} 
                                />
                            ))
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-slate-500 dark:text-slate-400">Nessuna ispezione registrata.</p>
                                <p className="text-slate-500 dark:text-slate-400">Clicca "Registra Ispezione" per aggiungere la prima!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Movements and Production History */}
                <div className="lg:col-span-1 space-y-8">
                    
                    {/* Movements Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 h-10">
                            <HistoryIcon className="w-6 h-6 text-slate-500"/>
                            <h3 className="text-xl font-semibold">Cronologia Spostamenti</h3>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 max-h-[400px] overflow-y-auto">
                            {sortedMovements.length > 0 ? (
                                <ul className="space-y-0">
                                    {sortedMovements.map((move, idx) => (
                                        <li key={idx} className="relative pl-6 border-l-2 border-amber-300 dark:border-amber-700 pb-6 first:border-l-transparent">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="mb-1 font-bold text-lg text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                                        {new Date(move.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                        {move.time && (
                                                            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                                                                ({move.time})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="text-red-500 dark:text-red-400 font-medium">Da: </span>
                                                        <span className="text-slate-700 dark:text-slate-200">{move.fromApiaryName}</span>
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="text-green-600 dark:text-green-400 font-medium">A: </span>
                                                        <span className="text-slate-700 dark:text-slate-200">{move.toApiaryName}</span>
                                                    </div>
                                                    {move.notes && (
                                                        <div className="text-sm mt-1 italic text-slate-500 dark:text-slate-400">
                                                            "{move.notes}"
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Action Buttons for Movements */}
                                                <div className="flex flex-col gap-2 ml-2">
                                                    <button 
                                                        onClick={() => onEditMovement(move)} 
                                                        className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors shadow-sm"
                                                        title="Modifica Spostamento"
                                                    >
                                                        <EditIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeleteMovement(move.id || String(idx))} 
                                                        className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors shadow-sm"
                                                        title="Elimina Spostamento"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-6">
                                    <MapPinIcon className="w-8 h-8 mx-auto text-slate-300 mb-2"/>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Nessuno spostamento registrato.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Production History Section */}
                    <div>
                         <div className="flex items-center gap-2 mb-4 h-10">
                            <JarIcon className="w-6 h-6 text-yellow-500"/>
                            <h3 className="text-xl font-semibold">Storico Produzione</h3>
                        </div>

                         <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 max-h-[400px] overflow-y-auto">
                            {sortedProduction.length > 0 ? (
                                <div className="space-y-4 pt-2">
                                    {sortedProduction.map(record => (
                                        <ProductionCard key={record.id} record={record} onDelete={onDeleteProduction} onEdit={onEditProduction} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <JarIcon className="w-8 h-8 mx-auto text-slate-300 mb-2"/>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Nessuna produzione registrata.</p>
                                </div>
                            )}
                         </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HiveDetails;