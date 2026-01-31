
import React, { useState } from 'react';
import { Apiary, Hive } from '../types';
import Modal from './Modal';
import { TransferIcon } from './Icons';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceApiary: Apiary;
    allApiaries: Apiary[];
    onTransfer: (targetApiaryId: string, hiveIds: string[], date: string, time: string, notes: string) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, sourceApiary, allApiaries, onTransfer }) => {
    const [targetApiaryId, setTargetApiaryId] = useState<string>('');
    const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [transferTime, setTransferTime] = useState<string>(new Date().toTimeString().slice(0, 5));
    const [notes, setNotes] = useState<string>('');
    const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());

    const availableTargets = allApiaries.filter(a => a.id !== sourceApiary.id);

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
        if (selectedHiveIds.size === sourceApiary.hives.length) {
            setSelectedHiveIds(new Set());
        } else {
            setSelectedHiveIds(new Set(sourceApiary.hives.map(h => h.id)));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetApiaryId || selectedHiveIds.size === 0) return;
        
        onTransfer(targetApiaryId, Array.from(selectedHiveIds), transferDate, transferTime, notes);
        onClose();
        // Reset state
        setSelectedHiveIds(new Set());
        setTargetApiaryId('');
        setNotes('');
        setTransferTime(new Date().toTimeString().slice(0, 5));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Trasferimento Arnie (Nomadismo)">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Selezione Apiario Destinazione */}
                <div>
                    <label htmlFor="targetApiary" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Apiario di Destinazione
                    </label>
                    <select
                        id="targetApiary"
                        value={targetApiaryId}
                        onChange={(e) => setTargetApiaryId(e.target.value)}
                        required
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                    >
                        <option value="">-- Seleziona Apiario --</option>
                        {availableTargets.map(apiary => (
                            <option key={apiary.id} value={apiary.id}>{apiary.name}</option>
                        ))}
                    </select>
                    {availableTargets.length === 0 && (
                        <p className="text-sm text-red-500 mt-1">Nessun altro apiario disponibile. Creane uno nuovo prima.</p>
                    )}
                </div>

                {/* Selezione Data e Ora */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Data Trasferimento
                        </label>
                        <input
                            type="date"
                            id="date"
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                            required
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Ora
                        </label>
                        <input
                            type="time"
                            id="time"
                            value={transferTime}
                            onChange={(e) => setTransferTime(e.target.value)}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>
                </div>

                {/* Selezione Arnie */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Seleziona Arnie da Spostare
                        </label>
                        <button 
                            type="button" 
                            onClick={handleSelectAll}
                            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium"
                        >
                            {selectedHiveIds.size === sourceApiary.hives.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
                        </button>
                    </div>
                    
                    <div className="border border-slate-200 dark:border-slate-700 rounded-md max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-800/50 p-2">
                        {sourceApiary.hives.length > 0 ? (
                            <div className="space-y-2">
                                {sourceApiary.hives.map(hive => (
                                    <div key={hive.id} className="flex items-center p-2 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors">
                                        <input
                                            id={`hive-${hive.id}`}
                                            type="checkbox"
                                            checked={selectedHiveIds.has(hive.id)}
                                            onChange={() => handleToggleHive(hive.id)}
                                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor={`hive-${hive.id}`} className="ml-3 block text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer flex-grow">
                                            {hive.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 p-2 text-center">Nessuna arnia presente in questo apiario.</p>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">
                        {selectedHiveIds.size} di {sourceApiary.hives.length} arnie selezionate
                    </p>
                </div>

                {/* Note */}
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Note (Opzionale)
                    </label>
                    <textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        placeholder="Es. Spostamento notturno per fioritura acacia..."
                    ></textarea>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">
                        Annulla
                    </button>
                    <button 
                        type="submit" 
                        disabled={selectedHiveIds.size === 0 || !targetApiaryId}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <TransferIcon className="w-5 h-5" />
                        Trasferisci
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default TransferModal;