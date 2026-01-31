
import React, { useState, useEffect, useRef } from 'react';
import { Inspection, Temperament } from '../types';
import Modal from './Modal';
import { MicrophoneIcon, StopCircleIcon, TrashIcon } from './Icons';
import { logger } from '../services/logger';
import { VoiceRecorder } from 'capacitor-voice-recorder';

// Quick inline icon for upload (Mantenuta per non rompere riferimenti, anche se non usata nel button)
const UploadIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5z"/>
    </svg>
);

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
    const [applyNotesToAll, setApplyNotesToAll] = useState(false);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    // Rimosso mediaRecorderRef (Web) poiché usiamo il plugin nativo
    const fileInputRef = useRef<HTMLInputElement>(null);

    const occupiedFramesOptions = Array.from({ length: 10 }, (_, i) => i + 1);
    const broodFramesOptions = Array.from({ length: 11 }, (_, i) => i);
    const diaphragmOptions = Array.from({ length: 6 }, (_, i) => i);
    
    const diseaseOptions = ["Nessuna", "Covata Calcificata", "Tarma della Cera", "Nosema", "Peste Europea", "Peste Americana", "Aethina Tumida", "Alta infestazione di Varroa"];
    const feedingOptions = ["Nessuna", "Liquida", "Candito"];
    const treatmentOptions = ["Nessuno", "Blocco di Covata", "Api Bioxal gocciolato", "Api Bioxal Sublimato", "Strisce di Formico (artigianali)", "Apilife Var", "Apiguard", "Maqs", "Vorromed", "Apivar", "Apistan", "Calistrip Biox"];

    useEffect(() => {
        if (inspectionToEdit) {
            setInspection(inspectionToEdit);
            setAudioUrl(inspectionToEdit.audioNote || null);
        } else {
            setInspection({
                ...initialInspectionState,
                date: new Date().toISOString().split('T')[0],
                time: getCurrentTime()
            });
            setAudioUrl(null);
            setAudioBlob(null);
        }
        setIsRecording(false);
        setApplyActionsToAll(false);
        setApplyNotesToAll(false);
    }, [inspectionToEdit, isOpen]);

    const startRecording = async () => {
        try {
            logger.log("Avvio registrazione nativa (VoiceRecorder)...");

            // 1. Verifica se il dispositivo può registrare
            const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
            if (!canRecord.value) {
                alert("Il tuo dispositivo non sembra supportare la registrazione vocale nativa.");
                return;
            }

            // 2. Richiedi Permessi
            const permission = await VoiceRecorder.requestAudioRecordingPermission();
            if (!permission.value) {
                alert("Permesso microfono negato. Vai nelle impostazioni dell'app Android e abilita il microfono per Diario Apistico.");
                return;
            }

            // 3. Avvia
            await VoiceRecorder.startRecording();
            setIsRecording(true);
            logger.log("Registrazione avviata con successo.");

        } catch (error: any) {
            const errorDetails = `Errore Plugin Audio: ${error.message}`;
            logger.log(errorDetails, "error");
            alert(errorDetails);
        }
    };

    const stopRecording = async () => {
        if (!isRecording) return;

        try {
            // 4. Stop e recupero dati dal plugin nativo
            const result = await VoiceRecorder.stopRecording();
            setIsRecording(false);

            if (result.value && result.value.recordDataBase64) {
                const base64Data = result.value.recordDataBase64;
                const mimeType = result.value.mimeType || 'audio/aac';
                
                // Creiamo un Data URL per il player audio HTML e per il salvataggio
                const audioDataUrl = `data:${mimeType};base64,${base64Data}`;
                setAudioUrl(audioDataUrl);

                // Convertiamo il base64 in Blob per uniformarlo alla logica di "Carica File"
                // così il metodo handleSubmit funziona allo stesso modo per entrambi i casi.
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
            if (file.size > 15 * 1024 * 1024) { alert("File troppo grande. Max 15MB."); return; }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let finalAudioBase64 = inspection.audioNote;
        
        // Se c'è un nuovo blob (da registrazione o upload), convertilo
        if (audioBlob) {
            try { 
                finalAudioBase64 = await blobToBase64(audioBlob); 
            } catch (err) { 
                alert("Errore conversione audio."); return; 
            }
        } else if (audioUrl === null) {
            // Se l'audio è stato cancellato
            finalAudioBase64 = '';
        }

        const inspectionData: Inspection = inspectionToEdit
            ? { ...inspectionToEdit, ...inspection, audioNote: finalAudioBase64 }
            : { 
                ...inspection, 
                id: Date.now().toString(), 
                audioNote: finalAudioBase64,
                temperature: currentTemperature !== undefined ? Math.round(currentTemperature) : undefined 
              };
        onSave(inspectionData, { applyActions: applyActionsToAll, applyNotes: applyNotesToAll });
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
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center">
                            <input id="sawQueen" name="sawQueen" type="checkbox" checked={inspection.sawQueen} onChange={handleChange} className="h-4 w-4 text-amber-600 border-slate-300 rounded" />
                            <label htmlFor="sawQueen" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">Regina Vista</label>
                        </div>
                        <div className="flex items-center">
                            <input id="sawEggs" name="sawEggs" type="checkbox" checked={inspection.sawEggs} onChange={handleChange} className="h-4 w-4 text-amber-600 border-slate-300 rounded" />
                            <label htmlFor="sawEggs" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">Uova</label>
                        </div>
                        <div className="flex items-center">
                            <input id="noBrood" name="noBrood" type="checkbox" checked={inspection.noBrood || false} onChange={handleChange} className="h-4 w-4 text-amber-600 border-slate-300 rounded" />
                            <label htmlFor="noBrood" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">No Covata</label>
                        </div>
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
                    <SelectInput label="Malattia" name="disease" value={inspection.disease || 'Nessuna'} options={diseaseOptions} />
                    <SelectInput label="Nutrizione" name="feeding" value={inspection.feeding || 'Nessuna'} options={feedingOptions} />
                </div>

                <SelectInput label="Trattamenti" name="treatment" value={inspection.treatment || 'Nessuno'} options={treatmentOptions} />

                <div>
                    <div className="flex justify-between items-start mb-2">
                        <label htmlFor="actions" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Azioni Intraprese</label>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="applyActionsToAll" checked={applyActionsToAll} onChange={(e) => setApplyActionsToAll(e.target.checked)} className="h-3 w-3 text-amber-600 rounded border-slate-300" />
                            <label htmlFor="applyActionsToAll" className="text-xs text-slate-600 dark:text-slate-400">tutte le arnie</label>
                        </div>
                    </div>
                    <textarea id="actions" name="actions" rows={2} value={inspection.actions} onChange={handleChange} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md" placeholder="es. Aggiunto melario..."></textarea>
                </div>

                <div>
                    <div className="flex justify-between items-start mb-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Note Generali</label>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="applyNotesToAll" checked={applyNotesToAll} onChange={(e) => setApplyNotesToAll(e.target.checked)} className="h-3 w-3 text-amber-600 rounded border-slate-300" />
                            <label htmlFor="applyNotesToAll" className="text-xs text-slate-600 dark:text-slate-400">tutte le arnie</label>
                        </div>
                    </div>
                    <textarea id="notes" name="notes" rows={2} value={inspection.notes} onChange={handleChange} className="w-full border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md" placeholder="Dettagli..."></textarea>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-md p-4 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Nota Vocale</p>
                    <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    {!audioUrl && !isRecording && (
                        <div className="grid grid-cols-1 gap-3">
                            <button type="button" onClick={startRecording} className="flex flex-col items-center justify-center gap-1 py-4 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 transition border border-slate-300 dark:border-slate-600">
                                <MicrophoneIcon className="w-8 h-8 text-red-500" />
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
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 rounded-md">Annulla</button>
                    <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600">Salva Ispezione</button>
                </div>
            </form>
        </Modal>
    );
};

export default InspectionModal;
