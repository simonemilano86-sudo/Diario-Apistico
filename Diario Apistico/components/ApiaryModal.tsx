import React, { useState, useEffect } from 'react';
import { Apiary } from '../types';
import Modal from './Modal';

interface ApiaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiary: Omit<Apiary, 'id' | 'hives'>) => void;
    apiaryToEdit: Apiary | null;
}

const ApiaryModal: React.FC<ApiaryModalProps> = ({ isOpen, onClose, onSave, apiaryToEdit }) => {
    const [apiary, setApiary] = useState({ name: '', location: '' });

    useEffect(() => {
        if (apiaryToEdit) {
            setApiary({ name: apiaryToEdit.name, location: apiaryToEdit.location });
        } else {
            setApiary({ name: '', location: '' });
        }
    }, [apiaryToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setApiary(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (apiary.name.trim() === '') {
            alert("Il nome dell'apiario è obbligatorio.");
            return;
        }
        onSave(apiary);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={apiaryToEdit ? 'Modifica Apiario' : 'Aggiungi Nuovo Apiario'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome Apiario</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={apiary.name}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Posizione</label>
                    <input
                        type="text"
                        id="location"
                        name="location"
                        value={apiary.location}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Annulla</button>
                    <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition">Salva Apiario</button>
                </div>
            </form>
        </Modal>
    );
};

export default ApiaryModal;
