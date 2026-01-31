
import React, { useState, useEffect } from 'react';
import { Apiary, CalendarEvent } from '../types';
import { CalendarIcon, TrashIcon, GoogleIcon, BackArrowIcon } from './Icons';
import { Capacitor } from '@capacitor/core';
import { logger } from '../services/logger';

interface CalendarViewProps {
    apiaries: Apiary[];
    events: CalendarEvent[];
    onAddEvent: (event: CalendarEvent) => void;
    onDeleteEvent: (id: string) => void;
    initialApiaryId?: string;
    initialHiveId?: string;
    onBack?: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ apiaries, events, onAddEvent, onDeleteEvent, initialApiaryId, initialHiveId, onBack }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [scope, setScope] = useState<'apiary' | 'hive'>('apiary');
    const [selectedApiaryId, setSelectedApiaryId] = useState<string>('');
    const [selectedHiveIds, setSelectedHiveIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialApiaryId) {
            setSelectedApiaryId(initialApiaryId);
            if (initialHiveId) {
                setScope('hive');
                setSelectedHiveIds(new Set([initialHiveId]));
            } else {
                setScope('apiary');
                setSelectedHiveIds(new Set());
            }
        }
    }, [initialApiaryId, initialHiveId]);

    const selectedApiary = apiaries.find(a => a.id === selectedApiaryId);
    const availableHives = selectedApiary ? selectedApiary.hives : [];

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title || !selectedApiaryId) { setError("Compila i campi obbligatori"); return; }
        if (scope === 'hive' && selectedHiveIds.size === 0) { setError("Seleziona una o più arnie"); return; }
        
        setIsSaving(true);
        const selectedHivesList = scope === 'hive' 
            ? availableHives.filter(h => selectedHiveIds.has(h.id)).map(h => ({ id: h.id, name: h.name }))
            : undefined;

        const newEvent: CalendarEvent = {
            id: Date.now().toString(),
            title,
            description,
            startDate: date,
            startTime: time,
            scope,
            apiaryId: selectedApiaryId,
            apiaryName: selectedApiary?.name || 'Sconosciuto',
            hiveList: selectedHivesList
        };

        onAddEvent(newEvent);
        
        // Ritardo per permettere a React di aggiornare lo stato prima di lanciare il plugin nativo
        setTimeout(async () => {
            await handleAddToCalendar(newEvent, true);
            setIsSaving(false);
        }, 100);

        setTitle('');
        setDescription('');
        setSelectedHiveIds(new Set());
    };

    const handleAddToCalendar = async (event: CalendarEvent, isAutoSave = false) => {
        const startDate = new Date(`${event.startDate}T${event.startTime}`);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Durata 1 ora default
        const location = apiaries.find(a => a.id === event.apiaryId)?.location || '';
        
        let notes = event.description || '';
        if (event.scope === 'hive') {
            const hiveNames = event.hiveList?.map(h => h.name).join(', ') || 'Nessuna arnia';
            notes += `\n\nArnie: ${hiveNames}`;
        }
        notes += `\n\nCreato con Diario Apistico 🐝`;

        const isNative = Capacitor.isNativePlatform();

        // Logica per Calendario Nativo (Android)
        const tryNativeCalendar = async () => {
            try {
                logger.log("CALENDAR: Avvio procedura nativa...");

                // 1. Ricerca del plugin corretto
                // Su Android/Cordova il plugin è spesso in window.plugins.calendar
                const findPlugin = () => {
                    const w = window as any;
                    if (w.plugins && w.plugins.calendar) return w.plugins.calendar;
                    if (w.Calendar) return w.Calendar;
                    return null;
                };

                const calendarPlugin = findPlugin();

                if (!calendarPlugin) {
                    logger.log("Plugin Calendario non trovato. Fallback Web.", "warn");
                    return false;
                }

                // 2. Controllo Permessi (o skip se non supportato)
                const checkPermission = (): Promise<void> => {
                    return new Promise((resolve, reject) => {
                        if (typeof calendarPlugin.hasReadWritePermission !== 'function') {
                            resolve(); // Se il metodo non esiste, proviamo direttamente a creare
                            return;
                        }
                        
                        calendarPlugin.hasReadWritePermission((hasIt: boolean) => {
                            if (hasIt) {
                                resolve();
                            } else {
                                calendarPlugin.requestReadWritePermission(
                                    () => resolve(),
                                    (err: any) => reject(new Error("Permesso negato"))
                                );
                            }
                        });
                    });
                };

                await checkPermission();

                // 3. Creazione Evento Interattivo (Apre la UI nativa)
                await new Promise((resolve, reject) => {
                    calendarPlugin.createEventInteractively(
                        event.title,
                        location,
                        notes,
                        startDate,
                        endDate,
                        (res: any) => {
                            logger.log("Evento nativo creato con successo.");
                            resolve(res);
                        },
                        (err: any) => {
                            reject(new Error("Errore creazione evento: " + JSON.stringify(err)));
                        }
                    );
                });

                return true;

            } catch (err: any) {
                logger.log(`Errore Calendario Nativo: ${err.message}`, 'error');
                return false;
            }
        };

        let success = false;
        if (isNative) {
            success = await tryNativeCalendar();
        }

        // Se non siamo su nativo, o se il nativo ha fallito e non è un salvataggio automatico, apri Google Calendar Web
        if (!success && !isAutoSave) {
            openWebCalendar(event, startDate, endDate, location, notes);
        }
    };

    const openWebCalendar = (event: CalendarEvent, startDate: Date, endDate: Date, location: string, notes: string) => {
        const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
        const queryParams = new URLSearchParams({
            action: 'TEMPLATE',
            text: event.title,
            dates: `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`,
            details: notes,
            location: location
        });
        window.open(`https://calendar.google.com/calendar/render?${queryParams.toString()}`, '_blank');
    };

    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
             {onBack && (
                <div className="mb-4">
                    <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition">
                        <BackArrowIcon className="w-5 h-5"/>
                        Torna Indietro
                    </button>
                </div>
             )}

             <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg mb-6">
                <CalendarIcon className="w-12 h-12 mx-auto text-amber-500 mb-2"/>
                <h2 className="text-3xl font-bold">Calendario Apistico</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Pianifica le attività e sincronizzale col tuo calendario.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md h-fit">
                    <h3 className="text-xl font-semibold mb-4 text-amber-600">Nuovo Evento</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titolo</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Trattamento" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" required />
                            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destinatario</label>
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center text-sm"><input type="radio" checked={scope === 'apiary'} onChange={() => setScope('apiary')} /> <span className="ml-1">Apiario</span></label>
                                <label className="flex items-center text-sm"><input type="radio" checked={scope === 'hive'} onChange={() => setScope('hive')} /> <span className="ml-1">Arnie</span></label>
                            </div>
                            <select value={selectedApiaryId} onChange={handleApiaryChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" required>
                                <option value="">-- Seleziona --</option>
                                {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        {scope === 'hive' && selectedApiaryId && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded p-2 max-h-40 overflow-y-auto">
                                <button type="button" onClick={handleSelectAllHives} className="text-[10px] text-amber-600 font-bold mb-2">TUTTE / NESSUNA</button>
                                {availableHives.map(h => (
                                    <div key={h.id} onClick={() => handleToggleHive(h.id)} className={`p-2 mb-1 rounded text-sm cursor-pointer ${selectedHiveIds.has(h.id) ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                        {h.name}
                                    </div>
                                ))}
                            </div>
                        )}
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Note..." className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" rows={2}></textarea>
                        {error && <p className="text-red-500 text-xs">{error}</p>}
                        <button type="submit" disabled={isSaving} className="w-full py-2 bg-amber-500 text-white font-bold rounded-md disabled:opacity-50 hover:bg-amber-600">
                            {isSaving ? 'Salvataggio...' : 'Aggiungi al Calendario'}
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-semibold">Prossimi Eventi</h3>
                    {events.length === 0 ? (
                        <p className="text-slate-400 italic">Nessun evento salvato.</p>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold">{event.title}</h4>
                                    <div className="text-sm text-slate-500">
                                        {new Date(event.startDate).toLocaleDateString()} - {event.startTime} | {event.apiaryName}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleAddToCalendar(event)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-full transition" title="Apri nel Calendario"><GoogleIcon className="w-5 h-5"/></button>
                                    <button onClick={() => onDeleteEvent(event.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition" title="Elimina"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
    