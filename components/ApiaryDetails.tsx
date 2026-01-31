
import React, { useState } from 'react';
import { Apiary, Hive } from '../types';
import { BackArrowIcon, PlusIcon, BeehiveIcon, MapPinIcon, SearchIcon, XCircleIcon } from './Icons';
import HiveCard from './HiveCard';
import WeatherWidget from './WeatherWidget';

interface ApiaryDetailsProps {
    apiary: Apiary;
    onBack: () => void;
    onSelectHive: (hive: Hive) => void;
    onAddHive: () => void;
    onDeleteApiary: () => void;
    onEditApiary: () => void;
    onDeleteHive: (hiveId: string) => void;
    onEditHive: (hive: Hive) => void;
    onTransferHives: () => void;
    onWeatherUpdate?: (temp: number) => void;
    isScrolling?: boolean;
    canDelete?: boolean;
    canEdit?: boolean;
    canAdd?: boolean;
}

const ApiaryDetails: React.FC<ApiaryDetailsProps> = ({ 
    apiary, onBack, onSelectHive, onAddHive, onDeleteApiary, onEditApiary, 
    onDeleteHive, onEditHive, onTransferHives, onWeatherUpdate, isScrolling,
    canDelete = true, canEdit = true, canAdd = true
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    // Controllo robusto: il widget appare solo se abbiamo latitudine e longitudine
    const hasCoordinates = apiary.latitude !== undefined && apiary.latitude !== null && 
                           apiary.longitude !== undefined && apiary.longitude !== null;

    // Logica di filtro e ordinamento
    const filteredHives = apiary.hives.filter(h => 
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        h.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.queenRace.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        // Ordinamento naturale
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
        <div className="animate-fade-in relative pb-20">
            {/* Header Toolbar */}
            <div className="flex justify-between items-center mb-6 h-10">
                <button 
                    onClick={onBack} 
                    className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600" 
                    title="Torna indietro"
                >
                    <BackArrowIcon className="w-6 h-6"/>
                </button>
                
                <div className="flex items-center gap-2">
                    {apiary.hives.length > 0 && (
                        <>
                            <div className={`flex items-center transition-all duration-300 ${isSearchVisible ? 'w-48 sm:w-64' : 'w-10'}`}>
                                {isSearchVisible ? (
                                    <div className="relative w-full">
                                        <input 
                                            type="text" 
                                            autoFocus
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Cerca arnia..."
                                            className="w-full py-2 pl-3 pr-8 text-sm border border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
                                        />
                                        <button 
                                            onClick={() => { setSearchQuery(''); setIsSearchVisible(false); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                        >
                                            <XCircleIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsSearchVisible(true)}
                                        className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition shadow-sm"
                                        title="Cerca Arnie"
                                    >
                                        <SearchIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Weather Widget */}
            {hasCoordinates ? (
                <div className="mb-8">
                    <WeatherWidget 
                        latitude={apiary.latitude!} 
                        longitude={apiary.longitude!} 
                        locationName={apiary.name}
                        onWeatherUpdate={onWeatherUpdate}
                    />
                </div>
            ) : (
                <div className="bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-8 text-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{apiary.name}</h2>
                    <MapPinIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Meteo non disponibile.</p>
                    {canEdit && (
                        <button 
                            onClick={onEditApiary}
                            className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-md text-xs font-bold hover:bg-amber-600 transition shadow-sm"
                        >
                            Imposta Posizione
                        </button>
                    )}
                </div>
            )}

            {apiary.hives.length > 0 ? (
                filteredHives.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredHives.map(hive => (
                            <HiveCard 
                                key={hive.id} 
                                hive={hive} 
                                onSelect={onSelectHive} 
                                onDelete={canDelete ? onDeleteHive : undefined} 
                                onEdit={canEdit ? onEditHive : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <SearchIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-slate-500 dark:text-slate-400">Nessuna arnia trovata per "{searchQuery}".</p>
                        <button onClick={() => setSearchQuery('')} className="mt-2 text-amber-500 font-medium hover:underline">Mostra tutte</button>
                    </div>
                )
            ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow-md flex flex-col items-center justify-center">
                    <BeehiveIcon className="w-24 h-24 text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">Nessuna arnia in questo apiario.</p>
                    {canAdd && <p className="text-slate-500 dark:text-slate-400 mt-2">Clicca il tasto "+" in basso per iniziare!</p>}
                </div>
            )}

            {/* FAB per aggiungere Arnia */}
            {canAdd && (
                <button 
                    onClick={onAddHive} 
                    className={`fixed right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-all duration-300 z-50 ${isScrolling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    title="Aggiungi Arnia"
                    style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
                >
                    <PlusIcon className="w-8 h-8"/>
                </button>
            )}
        </div>
    );
};

export default ApiaryDetails;
