
import React, { useState, useEffect } from 'react';
import { ProductionRecord, HoneyType, Apiary } from '../types';
import Modal from './Modal';
import { JarIcon, FlowerIcon, GridIcon, WarningIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';

interface ProductionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: ProductionRecord, target?: { apiaryId: string, hiveIds: string[] }) => void;
    recordToEdit?: ProductionRecord | null;
    selectedType: 'honey' | 'pollen' | 'propolis';
    apiaries: Apiary[];
    initialApiaryId?: string;
    initialHiveId?: string;
}

const ProductionModal: React.FC<ProductionModalProps> = ({ 
    isOpen, onClose, onSave, recordToEdit, selectedType, 
    apiaries, initialApiaryId, initialHiveId 
}) => {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [honeyType, setHoneyType] = useState<HoneyType | ''>(''); 
    const [melariQuantity, setMelariQuantity] = useState<number | undefined>(undefined);
    const [melariNotes, setMelariNotes] = useState<string>('');
    const [pollenGrams, setPollenGrams] = useState<number | undefined>(undefined);
    const [pollenType, setPollenType] = useState<string>('Millefiori');
    const [pollenNotes, setPollenNotes] = useState<string>('');
    const [propolisNets, setPropolisNets] = useState<number | undefined>(undefined);
    const [propolisNotes, setPropolisNotes] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Target Selection State (for global add)
    const [targetApiaryId, setTargetApiaryId] = useState('');
    const [targetHiveIds, setTargetHiveIds] = useState<Set<string>>(new Set());

    // Quantità melari richieste: 1/2 (0.5), 1, 1.5, 2, 2.5, 3
    const melariOptions = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    const pollenOptions = Array.from({ length: 8 }, (_, i) => (i + 1) * 250);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            // Reset Fields
            if (recordToEdit) {
                setDate(recordToEdit.date);
                setHoneyType(recordToEdit.honeyType || '');
                setMelariQuantity(recordToEdit.melariQuantity);
                setMelariNotes(recordToEdit.melariNotes || '');
                setPollenGrams(recordToEdit.pollenGrams);
                setPollenType(recordToEdit.pollenType || 'Millefiori');
                setPollenNotes(recordToEdit.pollenNotes || '');
                setPropolisNets(recordToEdit.propolisNets);
                setPropolisNotes(recordToEdit.propolisNotes || '');
            } else {
                setDate(new Date().toISOString().split('T')[0]);
                setHoneyType(''); 
                setMelariQuantity(undefined);
                setMelariNotes('');
                setPollenGrams(undefined);
                setPollenType('Millefiori');
                setPollenNotes('');
                setPropolisNets(undefined);
                setPropolisNotes('');
            }

            // Initialize Context
            if (initialApiaryId) {
                setTargetApiaryId(initialApiaryId);
                if (initialHiveId) {
                    setTargetHiveIds(new Set([initialHiveId]));
                } else {
                    setTargetHiveIds(new Set());
                }
            } else {
                // Se c'è un solo apiario, selezionalo automaticamente
                if (apiaries.length === 1) {
                    setTargetApiaryId(apiaries[0].id);
                    setTargetHiveIds(new Set());
                } else {
                    setTargetApiaryId('');
                    setTargetHiveIds(new Set());
                }
            }
        }
    }, [recordToEdit, isOpen, initialApiaryId, initialHiveId, apiaries]);

    const effectiveApiary = apiaries.find(a => a.id === targetApiaryId);

    const handleToggleHive = (hiveId: string) => {
        const newSet = new Set(targetHiveIds);
        if (newSet.has(hiveId)) newSet.delete(hiveId);
        else newSet.add(hiveId);
        setTargetHiveIds(newSet);
    };

    const handleSelectAllHives = () => {
        if (effectiveApiary) {
             if (targetHiveIds.size === effectiveApiary.hives.length) setTargetHiveIds(new Set());
             else setTargetHiveIds(new Set(effectiveApiary.hives.map(h => h.id)));
        }
    };

    const incrementPropolis = () => {
        setPropolisNets(prev => (prev || 0) + 1);
        setError(null);
    };

    const decrementPropolis = () => {
        setPropolisNets(prev => (prev && prev > 1) ? prev - 1 : 1);
        setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        // Target Validation
        if (!targetApiaryId) {
            setError("Devi selezionare un apiario.");
            return;
        }
        if (targetHiveIds.size === 0) {
            setError("Devi selezionare almeno un'arnia.");
            return;
        }

        // Data Validation
        if (selectedType === 'honey') {
            if (!honeyType) { setError("Seleziona il tipo di miele."); return; }
            if (melariQuantity === undefined) { setError("Seleziona la quantità di melari."); return; }
        }
        if (selectedType === 'pollen' && pollenGrams === undefined) { setError("Seleziona la quantità di polline."); return; }
        if (selectedType === 'propolis' && propolisNets === undefined) { setError("Inserisci il numero di reti di propoli."); return; }

        const newRecord: ProductionRecord = {
            id: recordToEdit ? recordToEdit.id : Date.now().toString(),
            date,
            honeyType: selectedType === 'honey' ? (honeyType as HoneyType) : undefined,
            melariQuantity: selectedType === 'honey' ? melariQuantity : undefined,
            melariNotes: selectedType === 'honey' ? melariNotes : undefined,
            pollenGrams: selectedType === 'pollen' ? pollenGrams : undefined,
            pollenType: selectedType === 'pollen' ? pollenType : undefined,
            pollenNotes: selectedType === 'pollen' ? pollenNotes : undefined,
            propolisNets: selectedType === 'propolis' ? propolisNets : undefined,
            propolisNotes: selectedType === 'propolis' ? propolisNotes : undefined,
            notes: '' 
        };

        // Passa il target esplicito al padre
        onSave(newRecord, { apiaryId: targetApiaryId, hiveIds: Array.from(targetHiveIds) });
        onClose();
    };

    const getTitle = () => {
        if (recordToEdit) return "Modifica Produzione";
        switch (selectedType) {
            case 'honey': return "Registra Miele";
            case 'pollen': return "Registra Polline";
            case 'propolis': return "Registra Propoli";
            default: return "Registra Produzione";
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-md flex items-center gap-2 text-sm">
                        <WarningIcon className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Context Selection (Show only if not pre-set via props) */}
                {!initialApiaryId && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                         {/* Mostra la select solo se ci sono più apiari. Se ce n'è uno, è auto-selezionato. */}
                         {apiaries.length > 1 && (
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apiario</label>
                                <select
                                    value={targetApiaryId}
                                    onChange={(e) => { setTargetApiaryId(e.target.value); setTargetHiveIds(new Set()); setError(null); }}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                >
                                    <option value="">-- Seleziona Apiario --</option>
                                    {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                         )}
                        
                        {targetApiaryId && effectiveApiary && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">
                                        Arnie ({targetHiveIds.size}) 
                                        {/* Se singolo apiario, mostriamo il nome qui per chiarezza */}
                                        {apiaries.length === 1 && <span className="ml-1 text-slate-400 font-normal normal-case">in {effectiveApiary.name}</span>}
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={handleSelectAllHives} 
                                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:underline"
                                    >
                                        {targetHiveIds.size === effectiveApiary.hives.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                    {effectiveApiary.hives.length > 0 ? effectiveApiary.hives.map(h => (
                                        <div 
                                            key={h.id} 
                                            onClick={() => handleToggleHive(h.id)} 
                                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                                targetHiveIds.has(h.id) 
                                                ? 'bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600' 
                                                : 'bg-white border-slate-200 dark:bg-slate-700 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-500'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${targetHiveIds.has(h.id) ? 'bg-amber-500 border-amber-500' : 'border-slate-400'}`}>
                                                {targetHiveIds.has(h.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate select-none">
                                                {h.name}
                                            </span>
                                        </div>
                                    )) : <p className="col-span-2 text-xs text-slate-400 italic text-center">Nessuna arnia in questo apiario.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Data */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Raccolto</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                        required
                    />
                </div>

                {/* Container Cards */}
                <div className="space-y-4">
                    
                    {/* Card Melari */}
                    {selectedType === 'honey' && (
                        <div className={`border rounded-xl p-4 transition-all duration-200 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shadow-sm`}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
                                    <JarIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Melari</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tipo di Miele</label>
                                        <select 
                                            value={honeyType} 
                                            onChange={(e) => { setHoneyType(e.target.value as HoneyType); setError(null); }}
                                            className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                                        >
                                            <option value="">-- Seleziona Tipo --</option>
                                            {Object.values(HoneyType).map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quantità (N° Melari)</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1">
                                        {melariOptions.map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => { setMelariQuantity(melariQuantity === opt ? undefined : opt); setError(null); }}
                                                className={`py-2 px-1 text-sm rounded-md font-medium transition ${
                                                    melariQuantity === opt 
                                                    ? 'bg-amber-500 text-white shadow-sm' 
                                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Note Melari</label>
                                    <input
                                        type="text"
                                        value={melariNotes}
                                        onChange={(e) => setMelariNotes(e.target.value)}
                                        placeholder="Es. Umidità al 20%..."
                                        className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Card Polline */}
                    {selectedType === 'pollen' && (
                        <div className={`border rounded-xl p-4 transition-all duration-200 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shadow-sm`}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full">
                                    <FlowerIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Polline</h3>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tipo di Polline</label>
                                    <input
                                        type="text"
                                        value={pollenType}
                                        onChange={(e) => setPollenType(e.target.value)}
                                        placeholder="Es. Millefiori, Salice, Erica..."
                                        className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quantità (Grammi)</label>
                                    <div className="grid grid-cols-4 gap-1 mt-1">
                                        {pollenOptions.map(grams => (
                                            <button
                                                key={grams}
                                                type="button"
                                                onClick={() => { setPollenGrams(pollenGrams === grams ? undefined : grams); setError(null); }}
                                                className={`py-1.5 px-1 text-xs rounded-md font-medium transition ${
                                                    pollenGrams === grams
                                                    ? 'bg-yellow-400 text-slate-900 shadow-sm' 
                                                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                {grams}g
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Note Polline</label>
                                    <input
                                        type="text"
                                        value={pollenNotes}
                                        onChange={(e) => setPollenNotes(e.target.value)}
                                        placeholder="Es. Raccolto fresco..."
                                        className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Card Propoli */}
                    {selectedType === 'propolis' && (
                        <div className={`border rounded-xl p-4 transition-all duration-200 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shadow-sm`}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-amber-700/20 text-amber-800 dark:text-amber-500 rounded-full">
                                    <GridIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Propoli</h3>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quantità (Reti)</label>
                                    <div className="flex items-center gap-3 mt-1">
                                        <button 
                                            type="button" 
                                            onClick={decrementPropolis}
                                            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                                        >
                                            <ChevronDownIcon className="w-5 h-5" />
                                        </button>
                                        
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="100" 
                                                value={propolisNets === undefined ? '' : propolisNets}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                    setPropolisNets(val);
                                                    setError(null);
                                                }}
                                                placeholder="0"
                                                className="w-20 p-2 text-center border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white font-bold"
                                            />
                                            <span className="text-sm text-slate-600 dark:text-slate-300">Reti</span>
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={incrementPropolis}
                                            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                                        >
                                            <ChevronUpIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Note</label>
                                    <input
                                        type="text"
                                        value={propolisNotes}
                                        onChange={(e) => setPropolisNotes(e.target.value)}
                                        placeholder="..."
                                        className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Annulla</button>
                    <button type="submit" className="px-6 py-2 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-700 transition shadow-sm">Salva</button>
                </div>
            </form>
        </Modal>
    );
};

export default ProductionModal;
