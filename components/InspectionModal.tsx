
import React, { useState, useEffect, useRef } from 'react';
import { Inspection, Temperament } from '../types';
import Modal from './Modal';
import { MicrophoneIcon, StopCircleIcon, TrashIcon, ThermometerIcon, ChevronUpIcon, ChevronDownIcon, WarningIcon } from './Icons';
import { logger } from '../services/logger';
import { VoiceRecorder } from 'capacitor-voice-recorder';

interface InspectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (inspection: Inspection, bulkOptions?: { applyActions: boolean; applyNotes: boolean }) => void;
    inspectionToEdit: Inspection | null;
    currentTemperature?: number;
}

const InspectionModal: React.FC<InspectionModalProps> = ({ isOpen, onClose, onSave, inspectionToEdit, currentTemperature }) => {
    const getCurrentTime = () => {
        const now = new Date();
        return now.toTimeString().slice(0, 5);
    };

    const initialInspectionState: Omit<Inspection, 'id'> = {
        date: new Date().toISOString().split('T')[0],
        time: getCurrentTime(),
        sawQueen: false,
        sawEggs: false,
        noBrood: false,
        occupiedFrames: undefined,
        broodFrames: undefined,
        diaphragms: undefined,
        disease: '',
        feeding: '',
        treatment: '',
        honeyStores: undefined,
        temperament: undefined,
        actions: '',
        notes: '',
        audioNote: '',
        temperature: undefined
    };

    const [inspection, setInspection] = useState<Omit<Inspection, 'id'>>(initialInspectionState);
    const [applyActionsToAll, setApplyActionsToAll] = useState(false);
    
    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    // Historical Temperature State
    const [isTempModalOpen, setIsTempModalOpen] = useState(false);
    const [historicalTemp, setHistoricalTemp] = useState(20);
    
    // Alert Modal State (per errori/avvisi)
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const occupiedFramesOptions = Array.from({ length: 10 }, (_, i) => i + 1);
    const broodFramesOptions = Array.from({ length: 11 }, (_, i) => i);
    const diaphragmOptions = Array.from({ length: 6 }, (_, i) => i);
    
    // Liste ordinate alfabeticamente (con "Nessuna" sempre per primo)
    const diseaseOptions = [
        "Nessuna", 
        "Aethina Tumida", 
        "Alta infestazione di Varroa", 
        "Covata Calcificata", 
        "Nosema", 
        "Peste Americana", 
        "Peste Europea", 
        "Tarma della Cera"
    ];
    
    const feedingOptions = ["Nessuna", "Liquida", "Candito"];
    
    const treatmentOptions = [
        "Nessuno", 
        "Api Bioxal gocciolato", 
        "Api Bioxal Sublimato", 
        "Apiguard", 
        "Apilife Var", 
        "Apistan", 
        "Apivar", 
        "Blocco di Covata", 
        "Calistrip Biox", 
        "Maqs", 
        "Trattamento con Acidi Naturali", 
        "Vorromed"
    ];

    useEffect(() => {
        if (inspectionToEdit) {
            setInspection(inspectionToEdit);
            setAudioUrl(inspectionToEdit.audioNote || null);
        } else {
            setInspection({
                ...initialInspectionState,
                date: new Date().toISOString().split('T')[0],
                time: getCurrentTime(),
                temperature: currentTemperature
            });
            setAudioUrl(null);
            setAudioBlob(null);
        }
        setIsRecording(false);
        setApplyActionsToAll(false);
        setIsTempModalOpen(false);
        setAlertMessage(null);
    }, [inspectionToEdit, isOpen, currentTemperature]);

    const startRecording = async () => {
        try {
            logger.log("Avvio registrazione nativa (VoiceRecorder)...");
            const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
            if (!canRecord.value) {
                setAlertMessage("Il tuo dispositivo non sembra supportare la registrazione vocale nativa.");
                return;
            }
            const permission = await VoiceRecorder.requestAudioRecordingPermission();
            if (!permission.value) {
                setAlertMessage("Permesso microfono negato. Vai nelle impostazioni dell'app Android e abilita il microfono per Diario Apistico.");
                return;
            }
            await VoiceRecorder.startRecording();
            setIsRecording(true);
            logger.log("Registrazione avviata con successo.");
        } catch (error: any) {
            const errorDetails = `Errore Plugin Audio: ${error.message}`;
            logger.log(errorDetails, "error");
            setAlertMessage(errorDetails);
        }
    };

    const stopRecording = async () => {
        if (!isRecording) return;
        try {
            const result = await VoiceRecorder.stopRecording();
            setIsRecording(false);
            if (result.value && result.value.recordDataBase64) {
                const base64Data = result.value.recordDataBase64;
                const mimeType = result.value.mimeType || 'audio/aac';
                const audioDataUrl = `data:${mimeType};base64,${base64Data}`;
                setAudioUrl(audioDataUrl);
                const res = await fetch(audioDataUrl);
                const blob = await res.blob();
                setAudioBlob(blob);
                logger.log("Audio catturato e processato.");
            } else {
                logger.log("Nessun dato audio ricevuto dal plugin.", "warn");
            }
        } catch (error: any) {
            logger.log(`Errore Stop Recording: ${error.message}`, "error");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 15 * 1024 * 1024) { 
                setAlertMessage("File troppo grande. Max 15MB."); 
                return; 
            }
            const blob = new Blob([file], { type: file.type });
            setAudioBlob(blob);
            setAudioUrl(URL.createObjectURL(blob));
        }
    };

    const deleteAudio = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setInspection(prev => ({ ...prev, audioNote: '' }));
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'date') {
            setInspection(prev => ({ ...prev, [name]: value }));
            
            // Check if date is in the past (> 24h logic approx implies different day)
            const selectedDate = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today to start of day
            
            if (selectedDate < today) {
                setHistoricalTemp(20); // Reset to default
                setIsTempModalOpen(true);
            } else {
                if (currentTemperature) {
                    setInspection(prev => ({ ...prev, temperature: Math.round(currentTemperature) }));
                }
            }
            return;
        }

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setInspection(prev => {
                const newState = { ...prev, [name]: checked };
                if (name === 'sawEggs' && checked) newState.noBrood = false;
                if (name === 'noBrood' && checked) newState.sawEggs = false;
                return newState;
            });
        } else if (['occupiedFrames', 'broodFrames', 'diaphragms'].includes(name)) {
            setInspection(prev => ({ ...prev, [name]: value === "" ? undefined : parseInt(value) }));
        } else {
            setInspection(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleConfirmTemp = () => {
        setInspection(prev => ({ ...prev, temperature: historicalTemp }));
        setIsTempModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let finalAudioBase64 = inspection.audioNote;
        if (audioBlob) {
            try { 
                finalAudioBase64 = await blobToBase64(audioBlob); 
            } catch (err) { 
                setAlertMessage("Errore conversione audio."); 
                return; 
            }
        } else if (audioUrl === null) {
            finalAudioBase64 = '';
        }

        let finalTemp = inspection.temperature;
        if (finalTemp === undefined && currentTemperature !== undefined) {
            finalTemp = Math.round(currentTemperature);
        }

        const inspectionData: Inspection = inspectionToEdit
            ? { ...inspectionToEdit, ...inspection, audioNote: finalAudioBase64, temperature: finalTemp }
            : { 
                ...inspection, 
                id: Date.now().toString(), 
                audioNote: finalAudioBase64,
                temperature: finalTemp
              };
        onSave(inspectionData, { applyActions: applyActionsToAll, applyNotes: false });
    };

    const SelectInput = ({ label, name, value, options }: { label: string, name: string, value: string | number | undefined, options: (string|number)[] }) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <select
                id={name}
                name={name}
                value={value === undefined ? "" : value}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md"
            >
                <option value="">--</option>
                {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
            </select>
        </div>
    );

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={inspectionToEdit ? 'Modifica Ispezione' : 'Registra Nuova Ispezione'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data</label>
                            <input type="date" id="date" name="date" value={inspection.date} onChange={handleChange} required className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Orario</label>
                            <input type="time" id="time" name="time" value={inspection.time || ''} onChange={handleChange} className="mt-1 block w-full shadow-sm sm:text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md" />
                        </div>
                    </div>

                    <fieldset className="space-y-2 border-b border-slate-200 dark:border-slate-700 pb-4">
                        <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Osservazioni Rapide</legend>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input id="sawQueen" name="sawQueen" type="checkbox" checked={inspection.sawQueen} onChange={handleChange} className="sr-only peer" />
                                <div className="w-11 h-6 relative flex-shrink-0 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Regina Vista</span>
                            </label>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input id="sawEggs" name="sawEggs" type="checkbox" checked={inspection.sawEggs} onChange={handleChange} className="sr-only peer" />
                                <div className="w-11 h-6 relative flex-shrink-0 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-green-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Uova</span>
                            </label>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input id="noBrood" name="noBrood" type="checkbox" checked={inspection.noBrood || false} onChange={handleChange} className="sr-only peer" />
                                <div className="w-11 h-6 relative flex-shrink-0 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-red-600"></div>
                                <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">No Covata</span>
                            </label>
                        </div>
                    </fieldset>

                    <div className="grid grid-cols-3 gap-3">
                        <SelectInput label="Telai Presid." name="occupiedFrames" value={inspection.occupiedFrames} options={occupiedFramesOptions} />
                        <SelectInput label="Telai Covata" name="broodFrames" value={inspection.broodFrames} options={broodFramesOptions} />
                        <SelectInput label="Diaframmi" name="diaphragms" value={inspection.diaphragms} options={diaphragmOptions} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="honeyStores" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Scorte di Miele</label>
                            <select id="honeyStores" name="honeyStores" value={inspection.honeyStores || ""} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md">
                                <option value="">--</option>
                                <option>Scarse</option>
                                <option>Medie</option>
                                <option>Abbondanti</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="temperament" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Temperamento</label>
                            <select id="temperament" name="temperament" value={inspection.temperament || ""} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md">
                                <option value="">--</option>
                                {Object.values(Temperament).map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectInput label="Trattamenti" name="treatment" value={inspection.treatment || 'Nessuno'} options={treatmentOptions} />
                        <SelectInput label="Nutrizione" name="feeding" value={inspection.feeding || 'Nessuna'} options={feedingOptions} />
                    </div>

                    <SelectInput label="Malattia" name="disease" value={inspection.disease || 'Nessuna'} options={diseaseOptions} />

                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <label htmlFor="actions" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Azioni Intraprese/Note Generali</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="applyActionsToAll" checked={applyActionsToAll} onChange={(e) => setApplyActionsToAll(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 relative flex-shrink-0 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                                <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">tutte le arnie</span>
                            </label>
                        </div>
                        <textarea id="actions" name="actions" rows={3} value={inspection.actions} onChange={handleChange} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md" placeholder="es. Aggiunto melario..."></textarea>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-md p-4 bg-slate-50 dark:bg-slate-800/50">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Nota Vocale</p>
                        <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                        {!audioUrl && !isRecording && (
                            <div className="grid grid-cols-1 gap-3">
                                <button type="button" onClick={startRecording} className="flex flex-row items-center justify-center gap-2 py-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 transition border border-slate-300 dark:border-slate-600">
                                    <MicrophoneIcon className="w-6 h-6 text-red-500" />
                                    <span className="font-medium">Registra</span>
                                </button>
                            </div>
                        )}
                        {isRecording && (
                            <div className="flex flex-col items-center justify-center py-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 animate-pulse">
                                <p className="text-red-600 font-semibold mb-2">Registrazione in corso...</p>
                                <button type="button" onClick={stopRecording} className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-md">
                                    <StopCircleIcon className="w-6 h-6" />
                                    <span>Stop</span>
                                </button>
                            </div>
                        )}
                        {audioUrl && !isRecording && (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                <audio src={audioUrl} controls className="h-10 w-full" />
                                <button type="button" onClick={deleteAudio} className="p-2 text-slate-400 hover:text-red-500 rounded-full" title="Elimina Audio">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600">Salva Ispezione</button>
                    </div>
                </form>
            </Modal>

            {/* Popup Temperatura Storica */}
            <Modal isOpen={isTempModalOpen} onClose={() => setIsTempModalOpen(false)} title="Temperatura Storica">
                <div className="flex flex-col items-center justify-center py-6">
                    <ThermometerIcon className="w-12 h-12 text-amber-500 mb-4" />
                    <p className="text-center text-slate-600 dark:text-slate-300 mb-6 text-sm px-4">
                        Quale era la temperatura circa di questo giorno?
                    </p>
                    
                    <div className="flex items-center gap-6 mb-8">
                        <button 
                            type="button"
                            onClick={() => setHistoricalTemp(prev => prev - 1)}
                            className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                        >
                            <ChevronDownIcon className="w-6 h-6" />
                        </button>
                        
                        <div className="text-4xl font-bold text-slate-800 dark:text-white w-20 text-center">
                            {historicalTemp}°
                        </div>
                        
                        <button 
                            type="button"
                            onClick={() => setHistoricalTemp(prev => prev + 1)}
                            className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                        >
                            <ChevronUpIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <button 
                        type="button"
                        onClick={handleConfirmTemp}
                        className="w-full max-w-xs px-6 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition shadow-md"
                    >
                        Conferma
                    </button>
                </div>
            </Modal>

            {/* Modal per Avvisi ed Errori */}
            <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} title="Attenzione">
                <div className="flex flex-col items-center justify-center p-4 text-center">
                    <WarningIcon className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-slate-700 dark:text-slate-300 mb-6">
                        {alertMessage}
                    </p>
                    <button 
                        onClick={() => setAlertMessage(null)}
                        className="px-6 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition"
                    >
                        Chiudi
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default InspectionModal;
