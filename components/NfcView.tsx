
import React, { useState } from 'react';
import { Apiary, Hive } from '../types';
import { BackArrowIcon, NfcIcon, PlusIcon, SearchIcon, XCircleIcon, TrashIcon } from './Icons';
import Modal from './Modal';

interface NfcViewProps {
    apiaries: Apiary[];
    onBack: () => void;
    onOpenConfig: () => void;
    onRemoveTag: (hiveId: string) => void;
    isScrolling?: boolean;
}

const NfcView: React.FC<NfcViewProps> = ({ apiaries, onBack, onOpenConfig, onRemoveTag, isScrolling }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [hiveToRemoveTag, setHiveToRemoveTag] = useState<{id: string, name: string} | null>(null);

    // Flatten all hives that have an NFC tag
    const taggedHives = apiaries.flatMap(apiary => 
        apiary.hives
            .filter(h => h.nfcTagId)
            .map(h => ({ ...h, apiaryName: apiary.name }))
    );

    const filteredHives = taggedHives.filter(h => {
        const q = searchQuery.toLowerCase();
        return (
            h.name.toLowerCase().includes(q) ||
            h.apiaryName.toLowerCase().includes(q) ||
            h.nfcTagId?.toLowerCase().includes(q)
        );
    });

    const confirmRemoveTag = () => {
        if (hiveToRemoveTag) {
            onRemoveTag(hiveToRemoveTag.id);
            setHiveToRemoveTag(null);
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-6 h-10">
                <button onClick={onBack} className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"><BackArrowIcon className="w-5 h-5"/></button>
                
                <div className="flex items-center gap-2">
                     {/* Barra di Ricerca */}
                     <div className={`flex items-center transition-all duration-300 ${isSearchVisible ? 'w-40 sm:w-64' : 'w-10'}`}>
                        {isSearchVisible ? (
                            <div className="relative w-full">
                                <input 
                                    autoFocus
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cerca arnia, ID..."
                                    className="w-full py-2 pl-3 pr-8 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
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
                                title="Cerca Tag"
                            >
                                <SearchIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm mb-4 overflow-hidden border border-slate-200 dark:border-slate-700">
                 <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                    <NfcIcon className="w-8 h-8 text-indigo-500 mb-2"/>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-none">Registro NFC</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Gestisci i tag associati alle tue arnie.</p>
                 </div>
            </div>

            <div className="space-y-4">
                {filteredHives.length > 0 ? filteredHives.map((hive) => (
                     <div key={`${hive.id}-${hive.nfcTagId}`} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                        <div className="bg-slate-50 dark:bg-slate-700/30 px-4 py-2 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-base">{hive.name}</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{hive.apiaryName}</p>
                            </div>
                            <button 
                                onClick={() => setHiveToRemoveTag({id: hive.id, name: hive.name})}
                                className="p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm"
                                title="Rimuovi Associazione"
                            >
                                <TrashIcon className="w-4 h-4"/>
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-800/50">
                                <NfcIcon className="w-4 h-4 text-indigo-500"/>
                                <span className="font-mono text-xs truncate">ID: {hive.nfcTagId}</span>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-16 text-slate-400 italic bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <NfcIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p>{searchQuery ? `Nessun risultato per "${searchQuery}"` : "Nessun tag NFC associato."}</p>
                        <p className="text-xs mt-2">Clicca "+" per associare un tag.</p>
                    </div>
                )}
            </div>

            {/* FAB per Configura Nuovo Tag - Raised up */}
            <button 
                onClick={onOpenConfig}
                className={`fixed right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all duration-300 z-50 ${isScrolling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                title="Configura Nuovo Tag"
                style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
            >
                <PlusIcon className="w-8 h-8"/>
            </button>

            {/* Confirm Remove Tag Modal */}
            <Modal isOpen={!!hiveToRemoveTag} onClose={() => setHiveToRemoveTag(null)} title="Rimuovi Tag NFC">
                <div className="space-y-4">
                    <p className="text-slate-700 dark:text-slate-300">
                        Sei sicuro di voler rimuovere l'associazione NFC per l'arnia <strong>{hiveToRemoveTag?.name}</strong>?
                    </p>
                    <div className="flex justify-end gap-4 pt-4">
                        <button onClick={() => setHiveToRemoveTag(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500">Annulla</button>
                        <button onClick={confirmRemoveTag} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Rimuovi</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default NfcView;
