
import React, { useState, useEffect } from 'react';
import { Hive, HiveStatus, QueenRace } from '../types';
import Modal from './Modal';
import { WarningIcon } from './Icons';

interface HiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (hive: Omit<Hive, 'id' | 'inspections'>) => void;
    hiveToEdit: Hive | null;
}

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

const HiveModal: React.FC<HiveModalProps> = ({ isOpen, onClose, onSave, hiveToEdit }) => {
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
    const [hive, setHive] = useState<Omit<Hive, 'id' | 'inspections'>>({
        name: '',
        queenYear: currentYear,
        status: HiveStatus.HEALTHY,
        queenRace: QueenRace.LIGUSTICA,
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hiveToEdit) {
            setHive(hiveToEdit);
        } else {
            setHive({
                name: '',
                queenYear: currentYear,
                status: HiveStatus.HEALTHY,
                queenRace: QueenRace.LIGUSTICA,
            });
        }
        setError(null);
    }, [hiveToEdit, isOpen, currentYear]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setHive(prev => ({ ...prev, [name]: name === 'queenYear' ? parseInt(value) : value }));
        setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (hive.name.trim() === '') {
            setError("Il nome dell'arnia è obbligatorio.");
            return;
        }
        onSave(hive);
    };

    const renderSelect = (id: string, label: string, value: string, options: object) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <select
                id={id}
                name={id}
                value={value}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            >
                {Object.entries(options).map(([key, val]) => <option key={key} value={val}>{val}</option>)}
            </select>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={hiveToEdit ? 'Modifica Arnia' : 'Aggiungi Nuova Arnia'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-md flex items-center gap-2 text-sm">
                        <WarningIcon className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={hive.name}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                    />
                </div>
                <div>
                    <label htmlFor="queenYear" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Anno della Regina</label>
                    <div className="flex items-center gap-3 mt-1">
                        <select
                            id="queenYear"
                            name="queenYear"
                            value={hive.queenYear}
                            onChange={handleChange}
                            className="block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        >
                            {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                        <span className={`w-6 h-6 rounded-full flex-shrink-0 ${getQueenColor(hive.queenYear)}`}></span>
                    </div>
                </div>

                {renderSelect('status', 'Stato', hive.status, HiveStatus)}
                {renderSelect('queenRace', 'Sottospecie / Razza Regina', hive.queenRace, QueenRace)}

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Annulla</button>
                    <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition">Salva Arnia</button>
                </div>
            </form>
        </Modal>
    );
};

export default HiveModal;
