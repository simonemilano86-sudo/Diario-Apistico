
import React, { useState, useEffect } from 'react';
import { Apiary, Hive } from '../types';
import Modal from './Modal';
import { NfcIcon } from './Icons';
import { CapacitorNfc } from '@capgo/capacitor-nfc';
import { Capacitor } from '@capacitor/core';
import { logger } from '../services/logger';

interface NfcModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiaries: Apiary[];
    onSave: (hiveId: string, nfcTagId: string) => void;
}

const NfcModal: React.FC<NfcModalProps> = ({ isOpen, onClose, apiaries, onSave }) => {
    const [selectedApiaryId, setSelectedApiaryId] = useState<string>('');
    const [selectedHiveId, setSelectedHiveId] = useState<string>('');
    const [scannedTagId, setScannedTagId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [manualTagId, setManualTagId] = useState(''); // For Web debugging

    useEffect(() => {
        if (isOpen) {
            setSelectedApiaryId('');
            setSelectedHiveId('');
            setScannedTagId(null);
            setIsScanning(false);
            setManualTagId('');
        }
    }, [isOpen]);

    const selectedApiary = apiaries.find(a => a.id === selectedApiaryId);
    
    // Filtriamo le arnie che NON hanno già un tag, o permettiamo sovrascrittura?
    // Meglio mostrare tutte, magari indicando se hanno già un tag.
    const availableHives = selectedApiary ? selectedApiary.hives : [];

    const startScan = async () => {
        setIsScanning(true);
        setScannedTagId(null);

        if (!Capacitor.isNativePlatform()) {
            // Simulation for Web
            setTimeout(() => {
                const fakeId = manualTagId || `mock-tag-${Math.floor(Math.random() * 1000)}`;
                setScannedTagId(fakeId);
                setIsScanning(false);
            }, 1500);
            return;
        }

        try {
            // Start listening for tags
            await CapacitorNfc.removeAllListeners();
            await CapacitorNfc.addListener('nfcTag', (data: any) => {
                // data.id is usually an array of numbers, convert to hex string
                // But the plugin might return it differently depending on version.
                // Assuming data.id is standard behavior or we try to extract UID.
                let tagId = "unknown";
                
                // Helper to convert decimal array to hex string
                const toHex = (arr: number[]) => arr.map(i => i.toString(16).padStart(2, '0')).join(':').toUpperCase();

                if (data.id && Array.isArray(data.id)) {
                    tagId = toHex(data.id);
                } else if (data.tag && data.tag.id && Array.isArray(data.tag.id)) {
                    tagId = toHex(data.tag.id);
                } else if (typeof data.id === 'string') {
                    tagId = data.id;
                } else {
                    tagId = JSON.stringify(data).slice(0, 20); // Fallback
                }

                logger.log(`Tag Scanned: ${tagId}`);
                setScannedTagId(tagId);
                setIsScanning(false);
                CapacitorNfc.removeAllListeners(); // Stop listening after one scan
            });

            // Start the actual scan session (needed on Android mostly to trigger UI)
            // Note: @capgo/capacitor-nfc logic might vary slightly, ensuring simple read.
            // On iOS this triggers the system modal.
            logger.log("Avvio scansione NFC...");
        } catch (err: any) {
            logger.log(`Errore NFC: ${err.message}`, "error");
            setIsScanning(false);
            alert("Errore avvio scansione NFC: " + err.message);
        }
    };

    const handleSave = () => {
        if (selectedHiveId && scannedTagId) {
            onSave(selectedHiveId, scannedTagId);
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configura Tag NFC">
            <div className="space-y-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Associa un tag NFC fisico a un'arnia per identificarla rapidamente.
                </p>

                {/* Apiary Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apiario</label>
                    <select 
                        value={selectedApiaryId} 
                        onChange={(e) => { setSelectedApiaryId(e.target.value); setSelectedHiveId(''); }}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                    >
                        <option value="">-- Seleziona Apiario --</option>
                        {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>

                {/* Hive Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Arnia</label>
                    <select 
                        value={selectedHiveId} 
                        onChange={(e) => setSelectedHiveId(e.target.value)}
                        disabled={!selectedApiaryId}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50"
                    >
                        <option value="">-- Seleziona Arnia --</option>
                        {availableHives.map(h => (
                            <option key={h.id} value={h.id}>
                                {h.name} {h.nfcTagId ? '(Già associata)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Scan Section */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                    {!isScanning && !scannedTagId && (
                        <>
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-full mb-3">
                                <NfcIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <button 
                                onClick={startScan}
                                disabled={!selectedHiveId}
                                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                Avvia Scansione
                            </button>
                            <p className="text-xs text-slate-400 mt-2">Avvicina il tag al retro del telefono</p>
                            
                            {/* Web Debug Input */}
                            {!Capacitor.isNativePlatform() && (
                                <div className="mt-4 w-full">
                                    <input 
                                        type="text" 
                                        placeholder="Debug: ID Manuale" 
                                        value={manualTagId} 
                                        onChange={e => setManualTagId(e.target.value)}
                                        className="text-xs p-1 border rounded w-full text-center"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {isScanning && (
                        <div className="text-center animate-pulse">
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-full mb-3 mx-auto w-fit">
                                <NfcIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <p className="text-indigo-600 dark:text-indigo-400 font-bold">In attesa del Tag...</p>
                            <button onClick={() => setIsScanning(false)} className="mt-4 text-xs text-slate-500 underline">Annulla</button>
                        </div>
                    )}

                    {scannedTagId && (
                        <div className="text-center">
                            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-3 mx-auto w-fit">
                                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <p className="text-slate-800 dark:text-white font-bold">Tag Rilevato!</p>
                            <code className="block mt-1 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-xs font-mono">{scannedTagId}</code>
                            <button onClick={startScan} className="mt-4 text-xs text-indigo-500 underline">Scansiona di nuovo</button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Annulla</button>
                    <button 
                        onClick={handleSave} 
                        disabled={!selectedHiveId || !scannedTagId}
                        className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
                    >
                        Salva Associazione
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default NfcModal;
