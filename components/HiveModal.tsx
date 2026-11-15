import React, { useState, useEffect, useMemo } from 'react';
import { Hive, HiveStatus, QueenRace } from '../types';
import Modal from './Modal';
import { WarningIcon, BeehiveIcon, PlusIcon } from './Icons';

interface HiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (hive: Omit<Hive, 'id' | 'inspections'> | Omit<Hive, 'id' | 'inspections'>[]) => void;
    hiveToEdit: Hive | null;
    existingHives: Hive[];
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

// Funzione helper per trovare il numero progressivo successivo
const getSuggestedStartNumber = (hives: Hive[]): number => {
    const activeHives = hives.filter(h => !h._deleted);
    if (activeHives.length === 0) {
        return 1;
    }

    // Estraiamo i numeri progressivi ragionevoli (< 1000) dalle arnie esistenti
    const extractedNumbers: number[] = [];
    activeHives.forEach(h => {
        const trimmed = h.name.trim();
        // Cerca numeri finali (es. "Arnia 6", "N.6", o semplicemente "6")
        const match = trimmed.match(/(?:^|\D)(\d+)$/);
        if (match) {
            const val = parseInt(match[1], 10);
            // Ignoriamo anni (es. 2024, 2025, 2137...) e numeri anomali > 999
            if (!isNaN(val) && val > 0 && val < 1000) {
                extractedNumbers.push(val);
            }
        }
    });

    if (extractedNumbers.length > 0) {
        // Se 1 non è presente nell'apiario, si parte da 1
        const hasOne = extractedNumbers.includes(1) || activeHives.some(h => {
            const lower = h.name.trim().toLowerCase();
            return lower === '1' || lower === 'arnia 1' || lower.endsWith(' 1');
        });

        if (!hasOne) {
            return 1;
        }

        // Se 1 è già presente, prendi il numero progressivo più alto già salvato e fai +1
        const maxNum = Math.max(...extractedNumbers);
        return maxNum + 1;
    }

    // Se ci sono già arnie registrate (es. 6 arnie con nomi personalizzati), parti da 6 + 1 = 7
    return activeHives.length + 1;
};

const HiveModal: React.FC<HiveModalProps> = ({ isOpen, onClose, onSave, hiveToEdit, existingHives }) => {
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

    // Modalità: 'single' o 'batch' (in blocco)
    const [creationMode, setCreationMode] = useState<'single' | 'batch'>('single');

    // Stato arnia singola
    const [hive, setHive] = useState<Omit<Hive, 'id' | 'inspections'>>({
        name: '',
        queenYear: currentYear,
        status: HiveStatus.HEALTHY,
        queenRace: QueenRace.LIGUSTICA,
    });

    // Stato aggiunta in blocco
    const [batchQuantity, setBatchQuantity] = useState<number>(5);
    const [batchPrefix, setBatchPrefix] = useState<string>('Arnia ');
    const [batchStartNumber, setBatchStartNumber] = useState<number>(1);
    const [batchQueenYear, setBatchQueenYear] = useState<number>(currentYear);
    const [batchStatus, setBatchStatus] = useState<HiveStatus>(HiveStatus.HEALTHY);
    const [batchQueenRace, setBatchQueenRace] = useState<QueenRace>(QueenRace.LIGUSTICA);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hiveToEdit) {
            setCreationMode('single');
            setHive(hiveToEdit);
        } else {
            const suggested = getSuggestedStartNumber(existingHives);
            setCreationMode('single');
            setHive({
                name: `Arnia ${suggested}`,
                queenYear: currentYear,
                status: HiveStatus.HEALTHY,
                queenRace: QueenRace.LIGUSTICA,
            });
            setBatchQuantity(5);
            setBatchPrefix('Arnia ');
            setBatchStartNumber(suggested);
            setBatchQueenYear(currentYear);
            setBatchStatus(HiveStatus.HEALTHY);
            setBatchQueenRace(QueenRace.LIGUSTICA);
        }
        setError(null);
    }, [hiveToEdit, isOpen, currentYear, existingHives]);

    // Calcolo anteprima nomi in blocco
    const generatedBatchNames = useMemo(() => {
        const names: string[] = [];
        const count = Math.min(Math.max(1, batchQuantity || 1), 100);
        const start = isNaN(batchStartNumber) ? 1 : batchStartNumber;
        for (let i = 0; i < count; i++) {
            names.push(`${batchPrefix}${start + i}`);
        }
        return names;
    }, [batchQuantity, batchPrefix, batchStartNumber]);

    // Verifica duplicati per la modalità in blocco
    const duplicateBatchNames = useMemo(() => {
        const existingSet = new Set(
            existingHives
                .filter(h => !h._deleted)
                .map(h => h.name.trim().toLowerCase())
        );
        return generatedBatchNames.filter(name => existingSet.has(name.trim().toLowerCase()));
    }, [generatedBatchNames, existingHives]);

    const handleSingleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setHive(prev => ({ ...prev, [name]: name === 'queenYear' ? parseInt(value) : value }));
        setError(null);
    };

    const handleSubmitSingle = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = hive.name.trim();
        if (trimmedName === '') {
            setError("Il nome dell'arnia è obbligatorio.");
            return;
        }
        if (existingHives.some(h => !h._deleted && h.name.toLowerCase() === trimmedName.toLowerCase() && h.id !== hiveToEdit?.id)) {
            setError("Esiste già un'arnia con questo nome in questo apiario.");
            return;
        }
        onSave(hive);
    };

    const handleSubmitBatch = (e: React.FormEvent) => {
        e.preventDefault();
        if (batchQuantity < 1) {
            setError("Inserisci una quantità di almeno 1 arnia.");
            return;
        }
        if (batchQuantity > 100) {
            setError("Puoi creare al massimo 100 arnie alla volta.");
            return;
        }
        if (duplicateBatchNames.length > 0) {
            setError(`Attenzione: ${duplicateBatchNames.length === 1 ? "l'arnia" : 'le arnie'} "${duplicateBatchNames.slice(0, 3).join(', ')}${duplicateBatchNames.length > 3 ? '...' : ''}" ${duplicateBatchNames.length === 1 ? 'esiste' : 'esistono'} già in questo apiario. Cambia prefisso o numero di partenza.`);
            return;
        }

        const newHives: Omit<Hive, 'id' | 'inspections'>[] = generatedBatchNames.map(name => ({
            name,
            queenYear: batchQueenYear,
            status: batchStatus,
            queenRace: batchQueenRace,
        }));

        onSave(newHives);
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={hiveToEdit ? 'Modifica Arnia' : 'Aggiungi Arnia'}
        >
            {/* Selettore Modalità (Solo in creazione, non in modifica) */}
            {!hiveToEdit && (
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-5">
                    <button
                        type="button"
                        onClick={() => { setCreationMode('single'); setError(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                            creationMode === 'single'
                                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <BeehiveIcon className="w-4 h-4" />
                        <span>Singola Arnia</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setCreationMode('batch'); setError(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                            creationMode === 'batch'
                                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>Aggiunta in Blocco</span>
                    </button>
                </div>
            )}

            {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in">
                    <WarningIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* FORM MODALITÀ SINGOLA */}
            {creationMode === 'single' && (
                <form onSubmit={handleSubmitSingle} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Nome o Numero Arnia
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={hive.name}
                            onChange={handleSingleChange}
                            required
                            placeholder="es. Arnia 1"
                            className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="queenYear" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Anno della Regina
                        </label>
                        <div className="flex items-center gap-3 mt-1">
                            <select
                                id="queenYear"
                                name="queenYear"
                                value={hive.queenYear}
                                onChange={handleSingleChange}
                                className="block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                            >
                                {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                            </select>
                            <span 
                                title={`Colore marcatura regina ${hive.queenYear}`}
                                className={`w-6 h-6 rounded-full flex-shrink-0 ${getQueenColor(hive.queenYear)}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Stato</label>
                        <select
                            id="status"
                            name="status"
                            value={hive.status}
                            onChange={handleSingleChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        >
                            {Object.entries(HiveStatus).map(([key, val]) => <option key={key} value={val}>{val}</option>)}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="queenRace" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sottospecie / Razza Regina</label>
                        <select
                            id="queenRace"
                            name="queenRace"
                            value={hive.queenRace}
                            onChange={handleSingleChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
                        >
                            {Object.entries(QueenRace).map(([key, val]) => <option key={key} value={val}>{val}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-600 transition text-sm font-medium">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition text-sm font-bold shadow-sm">
                            {hiveToEdit ? 'Aggiorna Arnia' : 'Salva Arnia'}
                        </button>
                    </div>
                </form>
            )}

            {/* FORM MODALITÀ IN BLOCCO (QUANTITÀ MULTIPLA) */}
            {creationMode === 'batch' && (
                <form onSubmit={handleSubmitBatch} className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
                        Crea rapidamente un gruppo di arnie numerate in modo progressivo e pronte per l'apiario.
                    </div>

                    {/* Quantità di arnie */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Quantità di arnie da aggiungere
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setBatchQuantity(prev => Math.max(1, prev - 1))}
                                className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-lg flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={batchQuantity}
                                onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-24 text-center py-2 font-bold text-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                            />
                            <button
                                type="button"
                                onClick={() => setBatchQuantity(prev => Math.min(100, prev + 1))}
                                className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-lg flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                            >
                                +
                            </button>
                            <div className="flex gap-1.5 ml-auto">
                                {[5, 10, 20].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setBatchQuantity(n)}
                                        className={`px-2.5 py-1 text-xs rounded-md font-semibold border ${
                                            batchQuantity === n 
                                                ? 'bg-amber-500 text-white border-amber-500' 
                                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        +{n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Prefisso e Numero di partenza */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Prefisso Nome
                            </label>
                            <input
                                type="text"
                                value={batchPrefix}
                                onChange={(e) => setBatchPrefix(e.target.value)}
                                placeholder="es. Arnia "
                                className="mt-1 block w-full shadow-sm text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                            />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">es. "Arnia ", "Cassa ", o vuoto</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Numero di partenza
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={batchStartNumber}
                                onChange={(e) => setBatchStartNumber(parseInt(e.target.value) || 1)}
                                className="mt-1 block w-full shadow-sm text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                            />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Continua automaticamente</p>
                        </div>
                    </div>

                    {/* Box Anteprima Nomi Generati */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Anteprima ({generatedBatchNames.length} arnie)
                            </span>
                            {duplicateBatchNames.length > 0 && (
                                <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <WarningIcon className="w-3.5 h-3.5" /> Duplicati rilevati
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {generatedBatchNames.slice(0, 15).map(name => {
                                const isDup = duplicateBatchNames.includes(name);
                                return (
                                    <span 
                                        key={name}
                                        className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                            isDup
                                                ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700'
                                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                                        }`}
                                    >
                                        {name}
                                    </span>
                                );
                            })}
                            {generatedBatchNames.length > 15 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 self-center">
                                    +{generatedBatchNames.length - 15} altre...
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Proprietà Comuni */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Anno della Regina
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                                <select
                                    value={batchQueenYear}
                                    onChange={(e) => setBatchQueenYear(parseInt(e.target.value))}
                                    className="block w-full shadow-sm text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                                >
                                    {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                                <span 
                                    title={`Colore marcatura ${batchQueenYear}`}
                                    className={`w-5 h-5 rounded-full flex-shrink-0 ${getQueenColor(batchQueenYear)}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Stato Iniziale
                            </label>
                            <select
                                value={batchStatus}
                                onChange={(e) => setBatchStatus(e.target.value as HiveStatus)}
                                className="mt-1 block w-full shadow-sm text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                            >
                                {Object.entries(HiveStatus).map(([key, val]) => <option key={key} value={val}>{val}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Sottospecie / Razza Regina
                        </label>
                        <select
                            value={batchQueenRace}
                            onChange={(e) => setBatchQueenRace(e.target.value as QueenRace)}
                            className="mt-1 block w-full shadow-sm text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500"
                        >
                            {Object.entries(QueenRace).map(([key, val]) => <option key={key} value={val}>{val}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-600 transition text-sm font-medium">Annulla</button>
                        <button 
                            type="submit" 
                            disabled={duplicateBatchNames.length > 0}
                            className={`px-4 py-2 text-white rounded-md transition text-sm font-bold shadow-sm ${
                                duplicateBatchNames.length > 0 
                                    ? 'bg-slate-400 cursor-not-allowed' 
                                    : 'bg-amber-500 hover:bg-amber-600'
                            }`}
                        >
                            Crea {batchQuantity} Arnie
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default HiveModal;
