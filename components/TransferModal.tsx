
import React, { useState, useEffect } from 'react';
import { Apiary, Hive } from '../types';
import Modal from './Modal';
import { TransferIcon, MapPinIcon } from './Icons';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceApiary?: Apiary; // Ora opzionale
    allApiaries: Apiary[];
    onTransfer: (targetApiaryId: string, hiveIds: string[], date: string, time: string, notes: string) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, sourceApiary, allApiaries, onTransfer }) => {
    const [selectedSourceId, setSelectedSourceId] = useState<string>('');
    const [targetApiaryId, setTargetApiaryId] = useState<string>('');
    const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [transferTime, setTransferTime] = useState<string>(new Date().toTimeString().slice(0, 5));
    const [notes, setNotes] = useState<string>('');
    const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Se sourceApiary è passato come prop, lo usiamo come default fisso
    useEffect(() => {
        if (isOpen) {
            if (sourceApiary) {
                setSelectedSourceId(sourceApiary.id);
            } else {
                setSelectedSourceId('');
            }
            setTargetApiaryId('');
            setSelectedHiveIds(new Set());
            setNotes('');
            setTransferTime(new Date().toTimeString().slice(0, 5));
            setIsSubmitting(false);
        }
    }, [isOpen, sourceApiary]);

    // Determina l'apiario di partenza effettivo
    const effectiveSourceApiary = sourceApiary || allApiaries.find(a => a.id === selectedSourceId);
    
    // Filtra i target disponibili (non l'apiario di partenza)
    const availableTargets = allApiaries.filter(a => a.id !== effectiveSourceApiary?.id);

    const handleToggleHive = (hiveId: string) => {
        const newSelected = new Set(selectedHiveIds);
        if (newSelected.has(hiveId)) {
            newSelected.delete(hiveId);
        } else {
            newSelected.add(hiveId);
        }
        setSelectedHiveIds(newSelected);
    };

    const handleSelectAll = () => {
        if (!effectiveSourceApiary) return;
        if (selectedHiveIds.size === effectiveSourceApiary.hives.length) {
            setSelectedHiveIds(new Set());
        } else {
            setSelectedHiveIds(new Set(effectiveSourceApiary.hives.map(h => h.id)));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!targetApiaryId || selectedHiveIds.size === 0) return;
        
        setIsSubmitting(true);
        onTransfer(targetApiaryId, Array.from(selectedHiveIds), transferDate, transferTime, notes);
        // onClose viene chiamato dal padre o qui, ma isSubmitting previene doppi invii
        setTimeout(() => onClose(), 100);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nomadismo (Trasferimento)">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Selezione Apiario Partenza (Solo se non preimpostato) */}
                {!sourceApiary && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <label htmlFor="sourceApiary" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Da (Apiario di Partenza)
                        </label>
                        <select
                            id="sourceApiary"
                            value={selectedSourceId}
                            onChange={(e) => {
                                setSelectedSourceId(e.target.value);
                                setSelectedHiveIds(new Set()); // Reset selezione arnie se cambia apiario
                            }}
                            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        >
                            <option value="">-- Seleziona Partenza --</option>
                            {allApiaries.map(apiary => (
                                <option key={apiary.id} value={apiary.id}>{apiary.name} ({apiary.hives.length} arnie)</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Selezione Apiario Destinazione */}
                <div>
                    <label htmlFor="targetApiary" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        A (Apiario di Destinazione)
                    </label>
                    <select
                        id="targetApiary"
                        value={targetApiaryId}
                        onChange={(e) => setTargetApiaryId(e.target.value)}
                        disabled={!effectiveSourceApiary}
                        required
                        className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md disabled:opacity-50"
                    >
                        <option value="">-- Seleziona Destinazione --</option>
                        {availableTargets.map(apiary => (
                            <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                        ))}
                    </select>
                    {effectiveSourceApiary && availableTargets.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">Nessun altro apiario disponibile.</p>
                    )}
                </div>

                {/* Selezione Data e Ora */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data</label>
                        <input
                            type="date"
                            id="date"
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                            required
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md"
                        />
                    </div>
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ora</label>
                        <input
                            type="time"
                            id="time"
                            value={transferTime}
                            onChange={(e) => setTransferTime(e.target.value)}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md"
                        />
                    </div>
                </div>

                {/* Selezione Arnie (Layout a Griglia) */}
                {effectiveSourceApiary && (
                    <div className="animate-fade-in bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">
                                Arnie ({selectedHiveIds.size})
                            </label>
                            <button 
                                type="button" 
                                onClick={handleSelectAll}
                                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:underline"
                            >
                                {selectedHiveIds.size === effectiveSourceApiary.hives.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {effectiveSourceApiary.hives.length > 0 ? (
                                effectiveSourceApiary.hives.map(hive => (
                                    <div
                                        key={hive.id}
                                        onClick={() => handleToggleHive(hive.id)}
                                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                            selectedHiveIds.has(hive.id)
                                            ? 'bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600'
                                            : 'bg-white border-slate-200 dark:bg-slate-700 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-500'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                            selectedHiveIds.has(hive.id) ? 'bg-amber-500 border-amber-500' : 'border-slate-400'
                                        }`}>
                                            {selectedHiveIds.has(hive.id) && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate select-none">
                                            {hive.name}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="col-span-2 text-sm text-slate-500 text-center py-2">Nessuna arnia in questo apiario.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Note */}
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Note</label>
                    <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md"
                        placeholder="Motivo dello spostamento..."
                    ></textarea>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">
                        Annulla
                    </button>
                    <button 
                        type="submit" 
                        disabled={selectedHiveIds.size === 0 || !targetApiaryId || isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        <TransferIcon className="w-5 h-5" />
                        {isSubmitting ? 'Salvataggio...' : 'Trasferisci'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TransferModal;
