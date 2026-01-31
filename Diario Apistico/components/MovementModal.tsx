
import React, { useState, useEffect } from 'react';
import { HiveMovement } from '../types';
import Modal from './Modal';

interface MovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (movement: HiveMovement) => void;
    movementToEdit: HiveMovement | null;
}

const MovementModal: React.FC<MovementModalProps> = ({ isOpen, onClose, onSave, movementToEdit }) => {
    const [movement, setMovement] = useState<HiveMovement>({
        id: '',
        date: '',
        time: '',
        notes: '',
        fromApiaryName: '',
        toApiaryName: ''
    });

    useEffect(() => {
        if (movementToEdit) {
            setMovement({
                ...movementToEdit,
                time: movementToEdit.time || '',
                notes: movementToEdit.notes || ''
            });
        }
    }, [movementToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMovement(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(movement);
    };

    if (!movementToEdit) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Modifica Dettagli Spostamento">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Modifica i dettagli storici di questo spostamento. Questo aggiorna solo il registro, non sposta nuovamente l'arnia.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data Spostamento</label>
                        <input
                            type="date"
                            id="date"
                            name="date"
                            value={movement.date}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Orario</label>
                        <input
                            type="time"
                            id="time"
                            name="time"
                            value={movement.time}
                            onChange={handleChange}
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="fromApiaryName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Da (Nome Apiario)</label>
                    <input
                        type="text"
                        id="fromApiaryName"
                        name="fromApiaryName"
                        value={movement.fromApiaryName}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>
                <div>
                    <label htmlFor="toApiaryName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">A (Nome Apiario)</label>
                    <input
                        type="text"
                        id="toApiaryName"
                        name="toApiaryName"
                        value={movement.toApiaryName}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Note</label>
                    <textarea
                        id="notes"
                        name="notes"
                        value={movement.notes}
                        onChange={handleChange}
                        rows={3}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Annulla</button>
                    <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition">Salva Modifiche</button>
                </div>
            </form>
        </Modal>
    );
};

export default MovementModal;