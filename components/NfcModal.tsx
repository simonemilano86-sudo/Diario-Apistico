
import React, { useState, useEffect } from 'react';
import { Apiary, Hive } from '../types';
import Modal from './Modal';
import { NfcIcon } from './Icons';
import { CapacitorNfc } from '@capgo/capacitor-nfc';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { logger } from '../services/logger';

// Dichiarazione globale per i plugin Cordova/Phonegap
declare global {
    interface Window {
        nfc: any;
        ndef: any;
        util: any;
    }
}

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
    const [manualTagId, setManualTagId] = useState(''); 
    const [showDebugLogs, setShowDebugLogs] = useState(false);

    // Funzione per il segnale acustico migliorata
    const playBeep = () => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(1200, context.currentTime); 
            gainNode.gain.setValueAtTime(0.15, context.currentTime);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.1);
        } catch (e) {
            console.error("Audio error:", e);
        }
    };

    // Funzione per la vibrazione
    const triggerSensation = async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                await Haptics.impact({ style: ImpactStyle.Heavy });
            }
            playBeep();
            logger.log("🔔 Feedback Rilevamento Tag");
        } catch (e) {
            console.error("Haptics error:", e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setSelectedApiaryId('');
            setSelectedHiveId('');
            setScannedTagId(null);
            setIsScanning(false);
        } else {
            // Stop scanning when modal closes
            stopScanning();
        }

        return () => {
            stopScanning();
        };
    }, [isOpen]);

    const stopScanning = async () => {
        try {
            if (isScanning) {
                setIsScanning(false);
            }
            if (Capacitor.isNativePlatform()) {
                await (CapacitorNfc as any).removeAllListeners();
                const stop = (CapacitorNfc as any).stopScanning || (CapacitorNfc as any).stop || (CapacitorNfc as any).close;
                if (stop) {
                    await stop.call(CapacitorNfc);
                    logger.log("[Diagnostic] Sensore Antenna Disattivato");
                }
            }
        } catch (e) {
            console.error("Error stopping NFC:", e);
        }
    };

    const selectedApiary = apiaries.find(a => a.id === selectedApiaryId);
    const availableHives = selectedApiary ? selectedApiary.hives : [];

    const startScanning = async () => {
        if (isScanning) return;
        setIsScanning(true);
        setScannedTagId(null);

        logger.log(`[Diagnostic] Avvio antenna in LETTURA ID`);

        if (!Capacitor.isNativePlatform()) {
            setTimeout(() => {
                const mockId = manualTagId || `MOCK-${Math.floor(Math.random() * 1000)}`;
                setScannedTagId(mockId);
                setIsScanning(false);
                if (selectedHiveId) {
                    onSave(selectedHiveId, mockId);
                }
            }, 1000);
            return;
        }

        try {
            await (CapacitorNfc as any).removeAllListeners();
            
            await CapacitorNfc.addListener('tagDiscovered', async (data: any) => {
                triggerSensation();
                let tagId = "unknown";
                const toHex = (arr: number[]) => arr.map(i => i.toString(16).padStart(2, '0')).join(':').toUpperCase();

                if (data.id && Array.isArray(data.id)) tagId = toHex(data.id);
                else if (data.tag?.id && Array.isArray(data.tag.id)) tagId = toHex(data.tag.id);
                else if (typeof data.id === 'string') tagId = data.id;

                logger.log(`[Diagnostic] ID Tag Rilevato: ${tagId}`);
                setScannedTagId(tagId);
                stopScanning();

                // Associazione automatica se l'arnia è selezionata
                if (selectedHiveId) {
                    logger.log(`✅ Associazione ID ${tagId} a arnia ${selectedHiveId}`);
                    onSave(selectedHiveId, tagId);
                }
            });

            const start = (CapacitorNfc as any).startScanning || (CapacitorNfc as any).scan;
            if (start) {
                await start.call(CapacitorNfc);
                logger.log("[Diagnostic] Sensore Antenna Attivato - Avvicina il tag");
            }
        } catch (err: any) {
            logger.log(`[Diagnostic] Errore Sensore: ${err.message}`, "error");
            setIsScanning(false);
        }
    };

    const handleSave = async () => {
        if (selectedHiveId && scannedTagId) {
            onSave(selectedHiveId, scannedTagId);
            onClose();
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={
                <div className="flex items-center justify-between w-full pr-8">
                    <span>Configura Tag NFC</span>
                    <button 
                        onClick={() => setShowDebugLogs(!showDebugLogs)}
                        className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
                        title="Vedi Log Diagnostici"
                    >
                        <NfcIcon className="w-5 h-5 text-amber-500" />
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {showDebugLogs && (
                    <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-green-400 max-h-40 overflow-y-auto mb-4 border border-slate-700">
                        <div className="flex justify-between items-center mb-2 border-bottom border-slate-700 pb-1">
                            <span className="text-white font-bold uppercase">Diagnostica Real-time</span>
                            <button onClick={() => logger.clear()} className="text-red-400 underline italic">Svuota</button>
                        </div>
                        {logger.getLogs().slice().reverse().map((log, i) => (
                            <div key={i} className={`${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : ''}`}>
                                [{log.timestamp}] {log.message}
                            </div>
                        ))}
                    </div>
                )}
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
                                {h.name} {h.nfcTagId ? '(Associata)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Scan Section */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                    {!isScanning && !scannedTagId && (
                        <>
                            <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-full mb-3">
                                <NfcIcon className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                            </div>
                            <button 
                                onClick={() => startScanning()}
                                disabled={!selectedHiveId}
                                className="w-full py-4 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition disabled:opacity-50 shadow-lg shadow-amber-500/20"
                            >
                                LEGGI E ASSOCIA TAG
                            </button>
                            <p className="text-xs text-slate-400 mt-2">Avvicina il tag dopo aver cliccato</p>
                            
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
                            <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-full mb-3 mx-auto w-fit">
                                <NfcIcon className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-bounce" />
                            </div>
                            <p className="text-amber-600 dark:text-amber-400 font-bold">AVVICINA IL TAG ORA...</p>
                            <p className="text-xs text-slate-400 mt-1">L'app leggerà l'ID e salverà l'associazione</p>
                            <button onClick={() => setIsScanning(false)} className="mt-4 text-xs text-slate-500 underline">Annulla</button>
                        </div>
                    )}

                    {scannedTagId && (
                        <div className="text-center">
                            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-3 mx-auto w-fit">
                                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <p className="text-green-600 font-bold">Associazione Riuscita!</p>
                            <code className="block mt-1 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-xs font-mono">{scannedTagId}</code>
                            <button onClick={() => startScanning()} className="mt-4 text-xs text-amber-500 underline">Cambia Tag</button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition">Chiudi</button>
                </div>
            </div>
        </Modal>
    );
};

export default NfcModal;
