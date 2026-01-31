
import React, { useState, useEffect } from 'react';
import { Apiary, CalendarEvent } from '../types';
import Modal from './Modal';
import { MailIcon, GoogleIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { logger } from '../services/logger';

interface CalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: CalendarEvent) => void;
    apiaries: Apiary[];
    initialApiaryId?: string;
    initialHiveId?: string;
    eventToEdit?: CalendarEvent | null;
}

const CalendarEventModal: React.FC<CalendarEventModalProps> = ({ isOpen, onClose, onSave, apiaries, initialApiaryId, initialHiveId, eventToEdit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [selectedApiaryId, setSelectedApiaryId] = useState<string>('');
    const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());
    const [emailReminder, setEmailReminder] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Nuovi stati per la gestione conferma UI
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingEvent, setPendingEvent] = useState<CalendarEvent | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const selectedApiary = apiaries.find(a => a.id === selectedApiaryId);
    const availableHives = selectedApiary ? selectedApiary.hives : [];

    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setTitle(eventToEdit.title);
                setDescription(eventToEdit.description);
                setDate(eventToEdit.startDate);
                setTime(eventToEdit.startTime);
                setSelectedApiaryId(eventToEdit.apiaryId);
                const hiveIds = eventToEdit.hiveList?.map(h => h.id) || [];
                setSelectedHiveIds(new Set(hiveIds));
                setEmailReminder(eventToEdit.emailReminder || false);
            } else {
                setTitle('');
                setDescription('');
                setDate(new Date().toISOString().split('T')[0]);
                // Imposta l'ora corrente al momento dell'apertura
                setTime(new Date().toTimeString().slice(0, 5));
                setEmailReminder(false);
                
                if (initialApiaryId) {
                    setSelectedApiaryId(initialApiaryId);
                    if (initialHiveId) {
                        setSelectedHiveIds(new Set([initialHiveId]));
                    } else {
                        setSelectedHiveIds(new Set());
                    }
                } else {
                    setSelectedApiaryId('');
                    setSelectedHiveIds(new Set());
                }
            }
            setError(null);
            setIsSaving(false);
            setShowConfirmation(false);
            setPendingEvent(null);
            setToastMessage(null);
        }
    }, [isOpen, initialApiaryId, initialHiveId, eventToEdit]);

    const handleApiaryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedApiaryId(e.target.value);
        setSelectedHiveIds(new Set());
    };

    const handleToggleHive = (hiveId: string) => {
        const newSet = new Set(selectedHiveIds);
        if (newSet.has(hiveId)) newSet.delete(hiveId);
        else newSet.add(hiveId);
        setSelectedHiveIds(newSet);
    };

    const handleSelectAllHives = () => {
        if (selectedHiveIds.size === availableHives.length) setSelectedHiveIds(new Set());
        else setSelectedHiveIds(new Set(availableHives.map(h => h.id)));
    };

    const connectToGoogleCalendar = (event: CalendarEvent) => {
        try {
            const startDate = new Date(`${event.startDate}T${event.startTime}`);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
            const location = apiaries.find(a => a.id === event.apiaryId)?.location || '';
            
            let notes = event.description || '';
            if (event.scope === 'hive') {
                const hiveNames = event.hiveList?.map(h => h.name).join(', ') || 'Nessuna arnia';
                notes += `\n\nArnie: ${hiveNames}`;
            }
            notes += `\n\nCreato con Diario Apistico 🐝`;

            const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
            const queryParams = new URLSearchParams({
                action: 'TEMPLATE',
                text: event.title,
                dates: `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`,
                details: notes,
                location: location
            });
            
            // Apre in un nuovo tab (o app nativa su mobile se intercettato)
            window.open(`https://calendar.google.com/calendar/render?${queryParams.toString()}`, '_blank');
        } catch (e) {
            console.error("Errore automazione Google Calendar", e);
        }
    };

    // Funzione helper per completare il salvataggio
    const finalizeSave = async (event: CalendarEvent) => {
        try {
            onSave(event);

            // Schedule Local Notification
            if (Capacitor.isNativePlatform()) {
                const scheduleDate = new Date(`${event.startDate}T${event.startTime}`);
                const notifId = event.notificationId || Math.floor(Math.random() * 2147483647);
                
                // Cancella eventuale notifica precedente se esiste
                try { await LocalNotifications.cancel({ notifications: [{ id: notifId }] }); } catch (e) {}

                if (scheduleDate > new Date()) {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: `🐝 ${event.title}`,
                            body: event.description || `Attività in apiario: ${event.apiaryName}`,
                            id: notifId,
                            schedule: { at: scheduleDate },
                            smallIcon: 'ic_stat_icon_config_sample',
                        }]
                    });
                    logger.log(`Notifica locale programmata per: ${scheduleDate.toLocaleString()}`);
                }
            }
            
            onClose();
        } catch (e: any) {
            setError("Errore nel salvataggio finale: " + e.message);
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title || !selectedApiaryId) { setError("Compila i campi obbligatori"); return; }
        if (selectedHiveIds.size === 0) { setError("Seleziona almeno un'arnia (o 'Tutte')"); return; }
        
        setIsSaving(true);
        
        try {
            const selectedHivesList = availableHives
                .filter(h => selectedHiveIds.has(h.id))
                .map(h => ({ id: h.id, name: h.name }));

            const notificationId = eventToEdit?.notificationId || Math.floor(Math.random() * 2147483647); 

            const newEvent: CalendarEvent = {
                id: eventToEdit ? eventToEdit.id : Date.now().toString(),
                title,
                description,
                startDate: date,
                startTime: time,
                scope: 'hive',
                apiaryId: selectedApiaryId,
                apiaryName: selectedApiary?.name || 'Sconosciuto',
                hiveList: selectedHivesList,
                notificationId: notificationId,
                emailReminder: emailReminder
            };

            // SE NUOVO EVENTO: Apri Google Calendar e mostra conferma UI
            if (!eventToEdit) {
                connectToGoogleCalendar(newEvent);
                setPendingEvent(newEvent);
                setShowConfirmation(true);
                // Non chiudiamo ancora, aspettiamo la conferma UI
                return; 
            }

            // SE MODIFICA: Salva direttamente
            await finalizeSave(newEvent);

        } catch (err: any) {
            setError("Errore durante il salvataggio: " + err.message);
            logger.log("Errore salvataggio evento: " + err.message, "error");
            setIsSaving(false);
        }
    };

    const handleConfirmYes = () => {
        if (pendingEvent) {
            finalizeSave(pendingEvent);
        }
    };

    const handleConfirmNo = () => {
        setShowConfirmation(false);
        setIsSaving(false);
        setToastMessage("Operazione annullata. L'evento non è stato salvato.");
        setTimeout(() => setToastMessage(null), 4000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={showConfirmation ? "Verifica Salvataggio" : (eventToEdit ? "Modifica Evento" : "Nuovo Evento")}>
            
            {/* Toast Notification all'interno del modale */}
            {toastMessage && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-[90%] bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl z-50 animate-fade-in flex items-center gap-3 border border-slate-700">
                    <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <span className="text-sm font-medium">{toastMessage}</span>
                </div>
            )}

            {showConfirmation ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-6 animate-fade-in">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-5 rounded-full ring-4 ring-amber-50 dark:ring-amber-900/10">
                        <GoogleIcon className="w-16 h-16" />
                    </div>
                    
                    <div className="space-y-3 px-4">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Conferma Google Calendar</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                            Hai completato correttamente il salvataggio dell'evento nell'app di Google Calendar?
                        </p>
                    </div>

                    <div className="flex gap-4 w-full px-4 pt-2">
                        <button
                            onClick={handleConfirmNo}
                            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                        >
                            No, Annulla
                        </button>
                        <button
                            onClick={handleConfirmYes}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2"
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                            Sì, Salvato
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titolo</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Trattamento Invernale" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ora</label>
                            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" required />
                        </div>
                    </div>

                    {/* Selezione Apiario e Arnie (Layout a Griglia) */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apiario</label>
                            <select 
                                value={selectedApiaryId} 
                                onChange={handleApiaryChange} 
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                                required
                            >
                                <option value="">-- Seleziona Apiario --</option>
                                {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        
                        {selectedApiaryId && (
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">
                                        Arnie ({selectedHiveIds.size})
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={handleSelectAllHives} 
                                        className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:underline"
                                    >
                                        {selectedHiveIds.size === availableHives.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                    {availableHives.length > 0 ? availableHives.map(h => (
                                        <div 
                                            key={h.id} 
                                            onClick={() => handleToggleHive(h.id)} 
                                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                                selectedHiveIds.has(h.id) 
                                                ? 'bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600' 
                                                : 'bg-white border-slate-200 dark:bg-slate-700 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-500'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedHiveIds.has(h.id) ? 'bg-amber-500 border-amber-500' : 'border-slate-400'}`}>
                                                {selectedHiveIds.has(h.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate select-none">
                                                {h.name}
                                            </span>
                                        </div>
                                    )) : <p className="col-span-2 text-xs text-slate-400 italic text-center">Nessuna arnia in questo apiario.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dettagli attività..." className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" rows={2}></textarea>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700">
                        <label htmlFor="emailReminder" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                            <MailIcon className="w-4 h-4 text-blue-500" />
                            Promemoria via Email
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="emailReminder" 
                                checked={emailReminder} 
                                onChange={(e) => setEmailReminder(e.target.checked)} 
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                    
                    {error && <p className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded">{error}</p>}
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300">Annulla</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-md hover:bg-amber-600 transition disabled:opacity-50">
                            {isSaving ? 'Attendere...' : 'Salva Evento'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default CalendarEventModal;
