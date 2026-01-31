
import React, { useState, useEffect } from 'react';
import { ProductionRecord, HoneyType } from '../types';
import Modal from './Modal';
import { JarIcon, FlowerIcon, GridIcon } from './Icons';

interface ProductionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: ProductionRecord) => void;
    recordToEdit?: ProductionRecord | null;
}

const ProductionModal: React.FC<ProductionModalProps> = ({ isOpen, onClose, onSave, recordToEdit }) => {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [honeyType, setHoneyType] = useState<HoneyType>(HoneyType.MILLEFIORI);
    const [melariQuantity, setMelariQuantity] = useState<number | undefined>(undefined);
    const [melariNotes, setMelariNotes] = useState<string>('');
    const [pollenGrams, setPollenGrams] = useState<number | undefined>(undefined);
    const [pollenNotes, setPollenNotes] = useState<string>('');
    const [propolisNets, setPropolisNets] = useState<number | undefined>(undefined);
    const [propolisNotes, setPropolisNotes] = useState<string>('');

    // Quantità melari richieste: 1/2 (0.5), 1, 1.5, 2, 2.5, 3
    const melariOptions = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    
    // Quantità polline: 250g step fino a 2000g
    const pollenOptions = Array.from({ length: 8 }, (_, i) => (i + 1) * 250);

    useEffect(() => {
        if (recordToEdit) {
            setDate(recordToEdit.date);
            setHoneyType(recordToEdit.honeyType || HoneyType.MILLEFIORI);
            setMelariQuantity(recordToEdit.melariQuantity);
            setMelariNotes(recordToEdit.melariNotes || '');
            setPollenGrams(recordToEdit.pollenGrams);
            setPollenNotes(recordToEdit.pollenNotes || '');
            setPropolisNets(recordToEdit.propolisNets);
            setPropolisNotes(recordToEdit.propolisNotes || '');
        } else {
            // Reset when opening fresh
            setDate(new Date().toISOString().split('T')[0]);
            setHoneyType(HoneyType.MILLEFIORI);
            setMelariQuantity(undefined);
            setMelariNotes('');
            setPollenGrams(undefined);
            setPollenNotes('');
            setPropolisNets(undefined);
            setPropolisNotes('');
            setHoneyType(HoneyType.MILLEFIORI);
        }
    }, [recordToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Almeno uno dei due deve essere selezionato
        if (melariQuantity === undefined && pollenGrams === undefined && propolisNets === undefined) {
            alert("Seleziona almeno una quantità di miele, polline o propoli.");
            return;
        }

        const newRecord: ProductionRecord = {
            id: recordToEdit ? recordToEdit.id : Date.now().toString(),
            date,
            honeyType: melariQuantity !== undefined ? honeyType : undefined,
            melariQuantity,
            melariNotes,
            pollenGrams,
            pollenNotes,
            propolisNets,
            propolisNotes,
            notes: '' // Removed general notes
        };

        onSave(newRecord);
        onClose();
        
        // Reset state only if creating new (optional, effect handles edit reset)
        if (!recordToEdit) {
            setMelariQuantity(undefined);
            setMelariNotes('');
            setPollenGrams(undefined);
            setPollenNotes('');
            setPropolisNets(undefined);
            setPropolisNotes('');
            setHoneyType(HoneyType.MILLEFIORI);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={recordToEdit ? "Modifica Produzione" : "Registra Produzione"}>
            <form onSubmit={handleSubmit} className="space-y-6">
                
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
                    <div className={`border rounded-xl p-4 transition-all duration-200 ${melariQuantity !== undefined ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
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
                                        onChange={(e) => setHoneyType(e.target.value as HoneyType)}
                                        className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                                    >
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
                                            onClick={() => setMelariQuantity(melariQuantity === opt ? undefined : opt)}
                                            className={`py-2 px-1 text-sm rounded-md font-medium transition ${
                                                melariQuantity === opt 
                                                ? 'bg-amber-500 text-white shadow-sm' 
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
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
                                    placeholder="Es. Umidità al 20%, da deumidificare..."
                                    className="w-full mt-1 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card Polline */}
                        <div className={`border rounded-xl p-4 transition-all duration-200 ${pollenGrams !== undefined ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full">
                                    <FlowerIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Polline</h3>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quantità (Grammi)</label>
                                    {/* Changed grid-cols-2 to grid-cols-4 for better compactness */}
                                    <div className="grid grid-cols-4 gap-1 mt-1">
                                        {pollenOptions.map(grams => (
                                            <button
                                                key={grams}
                                                type="button"
                                                onClick={() => setPollenGrams(pollenGrams === grams ? undefined : grams)}
                                                className={`py-1.5 px-1 text-xs rounded-md font-medium transition ${
                                                    pollenGrams === grams
                                                    ? 'bg-yellow-400 text-slate-900 shadow-sm' 
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
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

                        {/* Card Propoli */}
                        <div className={`border rounded-xl p-4 transition-all duration-200 ${propolisNets !== undefined ? 'border-amber-700 bg-amber-50 dark:bg-amber-900/40 shadow-md' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-amber-700/20 text-amber-800 dark:text-amber-500 rounded-full">
                                    <GridIcon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Propoli</h3>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Quantità (Reti)</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="100" 
                                            value={propolisNets === undefined ? '' : propolisNets}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                setPropolisNets(val);
                                            }}
                                            placeholder="0"
                                            className="w-20 p-2 text-center border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 dark:text-white font-bold"
                                        />
                                        <span className="text-sm text-slate-600 dark:text-slate-300">Reti</span>
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
                    </div>

                </div>

                {/* Removed General Notes as requested */}

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Annulla</button>
                    <button type="submit" className="px-6 py-2 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-700 transition shadow-sm">Salva Produzione</button>
                </div>
            </form>
        </Modal>
    );
};

export default ProductionModal;