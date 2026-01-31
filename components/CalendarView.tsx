
import React, { useState, useEffect, useRef } from 'react';
import { Apiary, CalendarEvent } from '../types';
import { CalendarIcon, TrashIcon, BackArrowIcon, MailIcon, PlusIcon, EditIcon, MoreVerticalIcon } from './Icons';

interface CalendarViewProps {
    apiaries: Apiary[];
    events: CalendarEvent[];
    onAddEvent: (event: CalendarEvent) => void;
    onDeleteEvent: (id: string) => void;
    onEditEvent: (event: CalendarEvent) => void;
    initialApiaryId?: string;
    initialHiveId?: string;
    onBack?: () => void;
    onOpenModal: () => void;
    isScrolling?: boolean;
    canDelete?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ apiaries, events, onDeleteEvent, onEditEvent, onBack, onOpenModal, isScrolling, canDelete }) => {
    const [openMenuEventId, setOpenMenuEventId] = useState<string | null>(null);

    // Gestione chiusura menu al click esterno
    useEffect(() => {
        const handleClickOutside = () => {
            if (openMenuEventId) setOpenMenuEventId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openMenuEventId]);

    return (
        <div className="animate-fade-in pb-20">
             {/* Toolbar */}
             <div className="flex justify-between items-center mb-2 h-10">
                {onBack ? (
                    <button 
                        onClick={onBack} 
                        className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600"
                        title="Indietro"
                    >
                        <BackArrowIcon className="w-5 h-5"/>
                    </button>
                ) : <div className="w-1"></div>}
             </div>

             {/* Header Card */}
             <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm mb-3 overflow-hidden border border-slate-200 dark:border-slate-700">
                 <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                    <CalendarIcon className="w-6 h-6 text-amber-500 mb-1"/>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-none">Calendario Apistico</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">Organizza i lavori e ricevi notifiche.</p>
                 </div>
            </div>

            {/* Lista Eventi */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1 mb-1">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                        I Tuoi Eventi
                    </h3>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {events.length}
                    </span>
                </div>
                
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                        <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Nessun evento in programma.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Usa il tasto "+" in basso per aggiungere un evento.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Sort: Ultimi creati per primi (ID decrescente) */}
                        {events.slice().sort((a,b) => Number(b.id) - Number(a.id)).map(event => (
                            <div key={event.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col relative hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                                
                                {/* Menu Context Button */}
                                <div className="absolute top-2 right-2 z-10">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuEventId(openMenuEventId === event.id ? null : event.id);
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                    >
                                        <MoreVerticalIcon className="w-4 h-4"/>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {openMenuEventId === event.id && (
                                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuEventId(null);
                                                    onDeleteEvent(event.id);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                            >
                                                <TrashIcon className="w-4 h-4"/> Elimina
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-grow w-full pr-6">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-bold text-base text-slate-800 dark:text-slate-200 leading-tight truncate">{event.title}</h4>
                                        <div className="flex gap-1 flex-shrink-0">
                                            {new Date(`${event.startDate}T${event.startTime}`) < new Date() && (
                                                <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.5 rounded font-medium">PASSATO</span>
                                            )}
                                            {event.emailReminder && (
                                                <span className="text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 py-0.5 rounded font-medium flex items-center gap-1" title="Notifica Email Attiva">
                                                    <MailIcon className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:gap-4 gap-0.5">
                                        <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                                            <CalendarIcon className="w-3 h-3"/>
                                            {new Date(event.startDate).toLocaleDateString()} alle {event.startTime}
                                        </span>
                                        <span className="truncate">
                                            📍 {event.apiaryName} 
                                            {event.hiveList && event.hiveList.length > 0 && (
                                                <span className="text-slate-400 ml-1">({event.hiveList.length} arnie)</span>
                                            )}
                                        </span>
                                    </div>
                                    {event.description && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded italic border-l-2 border-amber-200 line-clamp-2">"{event.description}"</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB per aggiungere Evento - Raised up */}
            <button 
                onClick={onOpenModal} 
                className={`fixed right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-all duration-300 z-50 ${isScrolling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                title="Aggiungi Evento"
                style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
            >
                <PlusIcon className="w-8 h-8"/>
            </button>
        </div>
    );
};

export default CalendarView;
