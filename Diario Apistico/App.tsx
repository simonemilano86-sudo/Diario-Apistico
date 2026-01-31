
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Apiary, Hive, Inspection, View, User, LocationData, HiveMovement, ProductionRecord, CalendarEvent, SeasonalNote } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';
import HiveModal from './components/HiveModal';
import HiveDetails from './components/HiveDetails';
import InspectionModal from './components/InspectionModal';
import AiAssistant from './components/AiAssistant';
import ApiaryCard from './components/ApiaryCard';
import ApiaryDetails from './components/ApiaryDetails';
import ApiaryModal from './components/ApiaryModal';
import Modal from './components/Modal';
import TransferModal from './components/TransferModal';
import MovementModal from './components/MovementModal';
import ProductionModal from './components/ProductionModal';
import WeatherWidget from './components/WeatherWidget';
import CalendarView from './components/CalendarView';
import AuthModal from './components/AuthModal';
import ToolsView from './components/ToolsView';
import { PlusIcon, BeeIcon, WarningIcon, BookOpenIcon } from './components/Icons';
import { supabase } from './services/supabase';
import { loadFromCloud, saveToCloud } from './services/db';
import { App as CapacitorApp } from '@capacitor/app';
import { logger } from './services/logger';

// Stato per gestire la conferma di eliminazione
type DeleteItem = 
    | { type: 'apiary'; id: string; name: string }
    | { type: 'hive'; id: string; name: string }
    | { type: 'inspection'; id: string }
    | { type: 'movement'; id: string }
    | { type: 'production'; id: string }
    | { type: 'event'; id: string };

const App: React.FC = () => {
    const [apiaries, setApiaries] = useLocalStorage<Apiary[]>('beewise-apiaries', []);
    const [savedLocation, setSavedLocation] = useLocalStorage<LocationData | null>('beewise-location', null);
    const [calendarEvents, setCalendarEvents] = useLocalStorage<CalendarEvent[]>('beewise-events', []);
    const [seasonalNotes, setSeasonalNotes] = useLocalStorage<SeasonalNote[]>('beewise-seasonal-notes', []);
    const [user, setUser] = useState<User | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [view, setView] = useState<View>('dashboard');
    
    // Cloud Sync State
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Weather State
    const [currentTemperature, setCurrentTemperature] = useState<number | undefined>(undefined);

    const [selectedApiary, setSelectedApiary] = useState<Apiary | null>(null);
    const [selectedHive, setSelectedHive] = useState<Hive | null>(null);

    // Calendar preselection state
    const [calendarPreselection, setCalendarPreselection] = useState<{apiaryId: string, hiveId?: string} | null>(null);

    // Modals
    const [isApiaryModalOpen, setIsApiaryModalOpen] = useState(false);
    const [apiaryToEdit, setApiaryToEdit] = useState<Apiary | null>(null);

    const [isHiveModalOpen, setIsHiveModalOpen] = useState(false);
    const [hiveToEdit, setHiveToEdit] = useState<Hive | null>(null);

    const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
    const [inspectionToEdit, setInspectionToEdit] = useState<Inspection | null>(null);

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [movementToEdit, setMovementToEdit] = useState<HiveMovement | null>(null);

    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [productionToEdit, setProductionToEdit] = useState<ProductionRecord | null>(null);

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'recovery' | 'update_password'>('signin');

    const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteItem | null>(null);
    const [isAuthAlertOpen, setIsAuthAlertOpen] = useState(false);
    
    const processedCodesRef = useRef<Set<string>>(new Set());
    const isRecoveryFlowRef = useRef(false);

    // --- LOGICA TASTO INDIETRO ---
    // Ref per accedere allo stato corrente dentro il listener nativo (che è fuori dal ciclo di render React)
    const stateRef = useRef({
        view,
        isApiaryModalOpen,
        isHiveModalOpen,
        isInspectionModalOpen,
        isTransferModalOpen,
        isMovementModalOpen,
        isProductionModalOpen,
        isAuthModalOpen,
        isAuthAlertOpen,
        deleteConfirmation,
        calendarPreselection,
        selectedApiary,
        selectedHive
    });

    // Manteniamo il ref aggiornato ad ogni render
    useEffect(() => {
        stateRef.current = {
            view,
            isApiaryModalOpen,
            isHiveModalOpen,
            isInspectionModalOpen,
            isTransferModalOpen,
            isMovementModalOpen,
            isProductionModalOpen,
            isAuthModalOpen,
            isAuthAlertOpen,
            deleteConfirmation,
            calendarPreselection,
            selectedApiary,
            selectedHive
        };
    }, [
        view,
        isApiaryModalOpen, isHiveModalOpen, isInspectionModalOpen, isTransferModalOpen,
        isMovementModalOpen, isProductionModalOpen, isAuthModalOpen, isAuthAlertOpen,
        deleteConfirmation, calendarPreselection, selectedApiary, selectedHive
    ]);

    useEffect(() => {
        const handleBackButton = async () => {
            const state = stateRef.current;
            
            // 1. Gestione Modali (Priorità Alta) - Chiude il modale se aperto
            if (state.deleteConfirmation) { setDeleteConfirmation(null); return; }
            if (state.isAuthAlertOpen) { setIsAuthAlertOpen(false); return; }
            if (state.isAuthModalOpen) { setIsAuthModalOpen(false); return; }
            if (state.isInspectionModalOpen) { setIsInspectionModalOpen(false); return; }
            if (state.isProductionModalOpen) { setIsProductionModalOpen(false); return; }
            if (state.isMovementModalOpen) { setIsMovementModalOpen(false); return; }
            if (state.isTransferModalOpen) { setIsTransferModalOpen(false); return; }
            if (state.isHiveModalOpen) { setIsHiveModalOpen(false); return; }
            if (state.isApiaryModalOpen) { setIsApiaryModalOpen(false); return; }

            // 2. Gestione Navigazione Viste
            switch (state.view) {
                case 'hiveDetails':
                    setView('apiaryDetails');
                    return;
                
                case 'apiaryDetails':
                    setView('dashboard');
                    setSelectedApiary(null);
                    return;

                case 'calendar':
                    if (state.calendarPreselection) {
                         if (state.calendarPreselection.hiveId) {
                             setView('hiveDetails');
                         } else {
                             setView('apiaryDetails');
                         }
                         setCalendarPreselection(null);
                    } else {
                        setView('dashboard');
                    }
                    return;

                case 'tools':
                case 'aiAssistant':
                    setView('dashboard');
                    return;

                case 'dashboard':
                default:
                    // 3. Uscita App (Se siamo in dashboard e nessun modale)
                    CapacitorApp.exitApp();
                    break;
            }
        };

        let listener: any;
        const setupListener = async () => {
            listener = await CapacitorApp.addListener('backButton', handleBackButton);
        };

        setupListener();

        return () => {
            if (listener) listener.remove();
        };
    }, []);
    // --- FINE LOGICA TASTO INDIETRO ---

    // Funzione centralizzata per caricare i dati dell'utente dal Cloud
    const handleSyncUserData = useCallback(async (uid: string) => {
        setIsSyncing(true);
        try {
            const cloudData = await loadFromCloud(uid);
            if (cloudData) {
                setApiaries(cloudData.apiaries || []);
                setCalendarEvents(cloudData.calendarEvents || []);
                if (cloudData.savedLocation) setSavedLocation(cloudData.savedLocation);
                if (cloudData.seasonalNotes) setSeasonalNotes(cloudData.seasonalNotes);
                setLastSyncTime(new Date());
                logger.log("Dati sincronizzati dal Cloud");
            }
        } catch (err) {
            logger.log("Errore sincronizzazione Cloud", "error");
        } finally {
            setIsSyncing(false);
        }
    }, [setApiaries, setCalendarEvents, setSavedLocation, setSeasonalNotes]);

    const handleDeepLinkUrl = async (url: string) => {
        if (!url) return;
        
        const getParams = (urlString: string) => {
            const params = new Map<string, string>();
            const queryIndex = urlString.indexOf('?');
            if (queryIndex !== -1) {
                const queryStr = urlString.substring(queryIndex + 1).split('#')[0];
                const searchParams = new URLSearchParams(queryStr);
                searchParams.forEach((val, key) => params.set(key, val));
            }
            const hashIndex = urlString.indexOf('#');
            if (hashIndex !== -1) {
                const hashStr = urlString.substring(hashIndex + 1);
                const hashParams = new URLSearchParams(hashStr);
                hashParams.forEach((val, key) => params.set(key, val));
            }
            return params;
        };

        const params = getParams(url);
        const code = params.get('code');
        const type = params.get('type');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (code && processedCodesRef.current.has(code)) return; 
        if (code) processedCodesRef.current.add(code);

        logger.log(`Gestione Link: ${url.split('?')[0]}...`);

        const isLocalRecovery = localStorage.getItem('beewise_recovery_pending') === 'true';
        const isRecovery = type === 'recovery' || isLocalRecovery || url.includes('type=recovery');
        
        if (isRecovery) {
            logger.log("Rilevato flow di recupero password");
            isRecoveryFlowRef.current = true;
            setAuthModalMode('update_password');
            setIsAuthModalOpen(true);
            if (isLocalRecovery) localStorage.removeItem('beewise_recovery_pending');
        } else if (code) {
            setAuthModalMode('signin');
        }

        try {
            if (code) {
                logger.log("Scambio codice per sessione...");
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    logger.log(`Errore scambio codice: ${error.message}`, 'error');
                } else if (isRecovery) {
                    setAuthModalMode('update_password');
                    setIsAuthModalOpen(true);
                }
            } else if (accessToken && refreshToken) {
                await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }
        } catch (e: any) {
            logger.log(`Eccezione link: ${e.message}`, 'error');
        }
    };

    useEffect(() => {
        let isSubscribed = true;
        let listenerHandle: any = null;

        const setup = async () => {
            try {
                listenerHandle = await CapacitorApp.addListener('appUrlOpen', (data) => {
                    if (isSubscribed) handleDeepLinkUrl(data.url);
                });
                const launchUrl = await CapacitorApp.getLaunchUrl();
                if (isSubscribed && launchUrl?.url) {
                    handleDeepLinkUrl(launchUrl.url);
                }
                if (isSubscribed && typeof window !== 'undefined' && window.location.hash) {
                    handleDeepLinkUrl(window.location.href);
                }
            } catch (err) {
                console.log('Capacitor App non disponibile');
            }
        };

        setup();

        return () => {
            isSubscribed = false;
            if (listenerHandle) listenerHandle.remove();
        };
    }, []);

    useEffect(() => {
        // Carica la sessione iniziale e scarica i dati se già loggato
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id);
                setUser({
                    name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Utente',
                    email: session.user.email || '',
                    picture: session.user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=f59e0b&color=fff`
                });
                // Carichiamo i dati dal cloud se l'utente è già loggato all'apertura dell'app
                handleSyncUserData(session.user.id);
            }
        });

        // Gestore unico per i cambiamenti di stato auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            logger.log(`Evento Auth rilevato: ${event}`);

            const isRecovery = event === 'PASSWORD_RECOVERY' || 
                               isRecoveryFlowRef.current || 
                               (window.location.hash && window.location.hash.includes('type=recovery'));

            if (isRecovery) {
                isRecoveryFlowRef.current = true;
                setAuthModalMode('update_password');
                setIsAuthModalOpen(true);
            }

            if (session?.user) {
                setUserId(session.user.id);
                setUser({
                    name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Utente',
                    email: session.user.email || '',
                    picture: session.user.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=f59e0b&color=fff`
                });
                
                if (!isRecovery && authModalMode !== 'update_password') {
                    setIsAuthModalOpen(false);
                }

                if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session.user)) {
                    handleSyncUserData(session.user.id);
                }
            } else if (event === 'SIGNED_OUT') {
                // Se non c'è sessione (per logout o scadenza), puliamo tutto lo stato React
                setUser(null);
                setUserId(null);
                setApiaries([]);
                setCalendarEvents([]);
                setSavedLocation(null);
                setSeasonalNotes([]);
                isRecoveryFlowRef.current = false;
                processedCodesRef.current.clear();
                logger.log("Stato utente pulito dopo Logout");
            }
        });

        return () => subscription.unsubscribe();
    }, [authModalMode, handleSyncUserData, setApiaries, setCalendarEvents, setSavedLocation, setSeasonalNotes]);
    
    useEffect(() => {
        if (!userId || isRecoveryFlowRef.current) return;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            setIsSyncing(true);
            const success = await saveToCloud(userId, {
                apiaries,
                calendarEvents,
                savedLocation,
                seasonalNotes
            });
            if (success) {
                setLastSyncTime(new Date());
            }
            setIsSyncing(false);
        }, 3000);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [apiaries, calendarEvents, savedLocation, seasonalNotes, userId]);

    const handleLogout = async () => {
        logger.log("Esecuzione Logout...");
        
        try {
            // 1. Chiamiamo il server per invalidare la sessione ovunque
            const { error } = await supabase.auth.signOut({ scope: 'global' });
            if (error) throw error;
            
            // 2. Pulizia stati locali immediata
            setUser(null);
            setUserId(null);
            setApiaries([]);
            setCalendarEvents([]);
            setSavedLocation(null);
            setSeasonalNotes([]);
            setLastSyncTime(null);
            setView('dashboard');
            setSelectedApiary(null);
            setSelectedHive(null);
            
            logger.log("Logout completato e sessione rimossa correttamente.");
        } catch (error: any) {
            logger.log(`Errore durante signOut: ${error.message}`, 'error');
            // In caso di errore (es. rete), forziamo comunque la pulizia locale
            setUser(null);
            setUserId(null);
            setApiaries([]);
            setCalendarEvents([]);
            setSavedLocation(null);
            setSeasonalNotes([]);
            setView('dashboard');
        }
    };

    // --- APIARY HANDLERS ---
    const handleAddApiaryClick = () => {
        if (!user) {
            setIsAuthAlertOpen(true);
        } else {
            setApiaryToEdit(null);
            setIsApiaryModalOpen(true);
        }
    };

    const handleSaveApiary = (apiaryData: Omit<Apiary, 'id' | 'hives'>) => {
        if (apiaryToEdit) {
            const updatedApiary = { ...apiaryToEdit, ...apiaryData };
            setApiaries(prev => prev.map(a => a.id === apiaryToEdit.id ? updatedApiary : a));
            if (selectedApiary && selectedApiary.id === apiaryToEdit.id) {
                setSelectedApiary(updatedApiary);
            }
        } else {
            const newApiary: Apiary = { ...apiaryData, id: Date.now().toString(), hives: [] };
            setApiaries(prev => [...prev, newApiary]);
        }
        setApiaryToEdit(null);
        setIsApiaryModalOpen(false);
    };

    const requestDeleteApiary = (apiaryId: string) => {
        const apiary = apiaries.find(a => a.id === apiaryId);
        if (apiary) {
            setDeleteConfirmation({ type: 'apiary', id: apiaryId, name: apiary.name });
        }
    };

    const handleSelectApiary = (apiary: Apiary) => {
        setSelectedApiary(apiary);
        setView('apiaryDetails');
    };

    // --- HIVE HANDLERS ---
    const handleSaveHive = (hiveData: Omit<Hive, 'id' | 'inspections'>) => {
        if (!selectedApiary) return;
        let updatedHives: Hive[];
        if (hiveToEdit) {
            updatedHives = selectedApiary.hives.map(h => h.id === hiveToEdit.id ? { ...hiveToEdit, ...hiveData } : h);
        } else {
            const newHive: Hive = { ...hiveData, id: Date.now().toString(), inspections: [], movements: [], productionRecords: [] };
            updatedHives = [...selectedApiary.hives, newHive];
        }
        const updatedApiary = {...selectedApiary, hives: updatedHives};
        
        setApiaries(prev => prev.map(a => a.id === selectedApiary.id ? updatedApiary : a));
        setSelectedApiary(updatedApiary);
        
        if (selectedHive && hiveToEdit && selectedHive.id === hiveToEdit.id) {
            setSelectedHive(updatedHives.find(h => h.id === selectedHive.id) || null);
        }
        
        setHiveToEdit(null);
        setIsHiveModalOpen(false);
    };

    const handleQuickUpdateHive = (updatedHive: Hive) => {
        if (!selectedApiary) return;
        const updatedHives = selectedApiary.hives.map(h => h.id === updatedHive.id ? updatedHive : h);
        const updatedApiary = {...selectedApiary, hives: updatedHives};
        setApiaries(prev => prev.map(a => a.id === selectedApiary.id ? updatedApiary : a));
        setSelectedApiary(updatedApiary);
        setSelectedHive(updatedHive);
    };

    const requestDeleteHive = (hiveId: string) => {
        const apiary = apiaries.find(a => a.hives.some(h => h.id === hiveId));
        if (apiary) {
            const hive = apiary.hives.find(h => h.id === hiveId);
            if (hive) {
                setDeleteConfirmation({ type: 'hive', id: hiveId, name: hive.name });
            }
        }
    };

    const handleSelectHive = (hive: Hive) => {
        setSelectedHive(hive);
        setView('hiveDetails');
    };

    // --- TRANSFER HANDLER ---
    const handleTransferHives = (targetApiaryId: string, hiveIds: string[], date: string, time: string, notes: string) => {
        if (!selectedApiary) return;

        const sourceApiary = selectedApiary;
        const targetApiary = apiaries.find(a => a.id === targetApiaryId);
        
        if (!targetApiary) return;

        const hivesToMove = sourceApiary.hives.filter(h => hiveIds.includes(h.id));
        const hivesToKeep = sourceApiary.hives.filter(h => !hiveIds.includes(h.id));

        const updatedHivesToMove = hivesToMove.map(hive => ({
            ...hive,
            movements: [
                ...(hive.movements || []),
                {
                    id: Date.now().toString() + Math.random().toString().slice(2, 6),
                    date,
                    time,
                    notes,
                    fromApiaryName: sourceApiary.name,
                    toApiaryName: targetApiary.name
                }
            ]
        }));

        const updatedSourceApiary = { ...sourceApiary, hives: hivesToKeep };
        const updatedTargetApiary = { ...targetApiary, hives: [...targetApiary.hives, ...updatedHivesToMove] };

        setApiaries(prev => prev.map(a => {
            if (a.id === sourceApiary.id) return updatedSourceApiary;
            if (a.id === targetApiary.id) return updatedTargetApiary;
            return a;
        }));

        setSelectedApiary(updatedSourceApiary);
    };

    // --- MOVEMENT EDIT/DELETE HANDLERS ---
    const requestDeleteMovement = (movementId: string) => {
        setDeleteConfirmation({ type: 'movement', id: movementId });
    };

    const handleSaveMovement = (updatedMovement: HiveMovement) => {
        if (!selectedHive || !selectedApiary) return;

        const updatedMovements = (selectedHive.movements || []).map(m => 
            m.id === updatedMovement.id ? updatedMovement : m
        );

        const updatedHive = { ...selectedHive, movements: updatedMovements };
        const updatedHives = selectedApiary.hives.map(h => h.id === selectedHive.id ? updatedHive : h);
        const updatedApiary = { ...selectedApiary, hives: updatedHives };

        setApiaries(prev => prev.map(a => a.id === selectedApiary.id ? updatedApiary : a));
        setSelectedApiary(updatedApiary);
        setSelectedHive(updatedHive);
        setMovementToEdit(null);
        setIsMovementModalOpen(false);
    };

    // --- INSPECTION HANDLERS ---
    const handleSaveInspection = (inspection: Inspection, applyToAllConfig?: { applyActions: boolean, applyNotes: boolean }) => {
        if (!selectedHive || !selectedApiary) return;
        
        const existingInspectionIndex = selectedHive.inspections.findIndex(i => i.id === inspection.id);
        let updatedInspections;
        if (existingInspectionIndex > -1) {
            updatedInspections = selectedHive.inspections.map(i => i.id === inspection.id ? inspection : i);
        } else {
            updatedInspections = [...selectedHive.inspections, inspection];
        }

        const updatedHive = { ...selectedHive, inspections: updatedInspections};
        let updatedHives = selectedApiary.hives.map(h => h.id === selectedHive.id ? updatedHive : h);

        if (applyToAllConfig && (applyToAllConfig.applyActions || applyToAllConfig.applyNotes)) {
            updatedHives = updatedHives.map(h => {
                if (h.id === selectedHive.id) return h;
                const bulkInspection: Inspection = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    date: inspection.date,
                    time: inspection.time,
                    temperature: inspection.temperature, 
                    sawQueen: false,
                    sawEggs: false,
                    noBrood: undefined,
                    occupiedFrames: undefined,
                    broodFrames: undefined,
                    diaphragms: undefined,
                    disease: '',
                    feeding: '',
                    treatment: '',
                    honeyStores: undefined,
                    temperament: undefined,
                    actions: applyToAllConfig.applyActions ? inspection.actions : '',
                    notes: applyToAllConfig.applyNotes ? inspection.notes : '',
                    audioNote: '' 
                };
                return { ...h, inspections: [...h.inspections, bulkInspection] };
            });
        }

        const updatedApiary = { ...selectedApiary, hives: updatedHives };
        
        setApiaries(prev => prev.map(a => a.id === selectedApiary.id ? updatedApiary : a));
        setSelectedApiary(updatedApiary);
        setSelectedHive(updatedHive);
        setInspectionToEdit(null);
        setIsInspectionModalOpen(false);
    };

    const requestDeleteInspection = (inspectionId: string) => {
        setDeleteConfirmation({ type: 'inspection', id: inspectionId });
    };

    // --- PRODUCTION HANDLERS ---
    const handleSaveProduction = (record: ProductionRecord) => {
        if (!selectedHive || !selectedApiary) return;
        
        const existingIndex = (selectedHive.productionRecords || []).findIndex(r => r.id === record.id);
        let updatedProduction;

        if (existingIndex > -1) {
            updatedProduction = (selectedHive.productionRecords || []).map(r => r.id === record.id ? record : r);
        } else {
            updatedProduction = [...(selectedHive.productionRecords || []), record];
        }

        const updatedHive = { ...selectedHive, productionRecords: updatedProduction };
        const updatedHives = selectedApiary.hives.map(h => h.id === selectedHive.id ? updatedHive : h);
        const updatedApiary = { ...selectedApiary, hives: updatedHives };

        setApiaries(prev => prev.map(a => a.id === selectedApiary.id ? updatedApiary : a));
        setSelectedApiary(updatedApiary);
        setSelectedHive(updatedHive);
        setProductionToEdit(null);
        setIsProductionModalOpen(false);
    };

    const requestDeleteProduction = (productionId: string) => {
        setDeleteConfirmation({ type: 'production', id: productionId });
    };

    // --- CALENDAR HANDLERS ---
    const handleAddEvent = (event: CalendarEvent) => {
        setCalendarEvents(prev => [...prev, event]);
    };

    const requestDeleteEvent = (eventId: string) => {
        setDeleteConfirmation({ type: 'event', id: eventId });
    };

    const handleOpenCalendarForHive = (hive: Hive) => {
        const apiary = apiaries.find(a => a.hives.some(h => h.id === hive.id));
        if (apiary) {
            setCalendarPreselection({ apiaryId: apiary.id, hiveId: hive.id });
            setView('calendar');
        }
    };

    // --- SEASONAL NOTES HANDLER ---
    const handleSaveNote = (note: SeasonalNote) => {
        setSeasonalNotes(prev => {
            const index = prev.findIndex(n => n.id === note.id);
            if (index > -1) {
                return prev.map(n => n.id === note.id ? note : n);
            }
            return [...prev, note];
        });
    };

    // --- CONFIRM DELETION LOGIC ---
    const executeDelete = () => {
        if (!deleteConfirmation) return;

        if (deleteConfirmation.type === 'apiary') {
            const apiaryId = deleteConfirmation.id;
            setApiaries(prev => prev.filter(a => a.id !== apiaryId));
            if (selectedApiary?.id === apiaryId) {
                setView('dashboard');
                setSelectedApiary(null);
            }
        } 
        else if (deleteConfirmation.type === 'hive') {
            const hiveId = deleteConfirmation.id;
            const apiary = apiaries.find(a => a.hives.some(h => h.id === hiveId));
            if (apiary) {
                const updatedHives = apiary.hives.filter(h => h.id !== hiveId);
                const updatedApiary = {...apiary, hives: updatedHives};
                setApiaries(prev => prev.map(a => a.id === apiary.id ? updatedApiary : a));
                if (selectedApiary?.id === apiary.id) setSelectedApiary(updatedApiary);
                if (view === 'hiveDetails' && selectedHive?.id === hiveId) {
                    setView('apiaryDetails');
                    setSelectedHive(null);
                }
            }
        } 
        else if (deleteConfirmation.type === 'inspection') {
            const inspectionId = deleteConfirmation.id;
            if (selectedHive && selectedApiary) {
                const updatedInspections = selectedHive.inspections.filter(i => i.id !== inspectionId);
                const updatedHive = {...selectedHive, inspections: updatedInspections};
                const updatedApiary = {
                    ...selectedApiary,
                    hives: selectedApiary.hives.map(h => h.id === selectedHive.id ? updatedHive : h)
                };
                setApiaries(prev => prev.map(a => a.id === selectedApiary.id ? updatedApiary : a));
                setSelectedApiary(updatedApiary);
                setSelectedHive(updatedHive);
            }
        }
        else if (deleteConfirmation.type === 'movement') {
            const movementId = deleteConfirmation.id;
            if (selectedHive && selectedApiary) {
                const updatedMovements = (selectedHive.movements || []).filter(m => m.id !== movementId);
                const updatedHive = { ...selectedHive, movements: updatedMovements };
                const updatedApiary = {
                    ...selectedApiary,
                    hives: selectedApiary.hives.map(h => h.id === selectedHive.id ? updatedHive : h)
                };
                setApiaries(prev => prev.map(a => a.id === selectedApiary.id ? updatedApiary : a));
                setSelectedApiary(updatedApiary);
                setSelectedHive(updatedHive);
            }
        }
        else if (deleteConfirmation.type === 'production') {
            const productionId = deleteConfirmation.id;
            if (selectedHive && selectedApiary) {
                const updatedProduction = (selectedHive.productionRecords || []).filter(r => r.id !== productionId);
                const updatedHive = { ...selectedHive, productionRecords: updatedProduction };
                const updatedApiary = {
                    ...selectedApiary,
                    hives: selectedApiary.hives.map(h => h.id === selectedHive.id ? updatedHive : h)
                };
                setApiaries(prev => prev.map(a => a.id === selectedApiary.id ? updatedApiary : a));
                setSelectedApiary(updatedApiary);
                setSelectedHive(updatedHive);
            }
        }
        else if (deleteConfirmation.type === 'event') {
            setCalendarEvents(prev => prev.filter(e => e.id !== deleteConfirmation.id));
        }

        setDeleteConfirmation(null);
    };

    const renderDashboard = () => (
        <div className="animate-fade-in relative">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold">Diario Apistico</h2>
                    <button 
                        onClick={() => setView('tools')}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition shadow-sm border border-slate-200 dark:border-slate-600"
                        title="Diario Stagionale"
                    >
                        <BookOpenIcon className="w-5 h-5 text-amber-500" />
                        <span className="font-medium hidden sm:inline">Diario Stagionale</span>
                    </button>
                </div>
                
                <WeatherWidget 
                    savedLocation={savedLocation} 
                    onSaveLocation={setSavedLocation} 
                    onWeatherUpdate={setCurrentTemperature}
                />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">I Tuoi Apiari ({apiaries.length})</h2>
                {apiaries.length > 0 && (
                    <button onClick={handleAddApiaryClick} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition shadow-sm">
                        <PlusIcon className="w-5 h-5"/>
                        Aggiungi Apiario
                    </button>
                )}
            </div>
            {apiaries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apiaries.map(apiary => (
                        <ApiaryCard 
                            key={apiary.id} 
                            apiary={apiary} 
                            onSelect={handleSelectApiary}
                            onDelete={() => requestDeleteApiary(apiary.id)}
                            onEdit={(e) => {
                                e.stopPropagation();
                                setApiaryToEdit(apiary);
                                setIsApiaryModalOpen(true);
                            }}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <BeeIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500" />
                    <h3 className="mt-4 text-xl font-semibold">Nessun apiario ancora!</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Inizia aggiungendo il tuo primo apiario.</p>
                    <button onClick={handleAddApiaryClick} className="mt-6 flex items-center mx-auto gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition shadow-sm">
                        <PlusIcon className="w-5 h-5"/>
                        Aggiungi il Tuo Primo Apiario
                    </button>
                </div>
            )}
        </div>
    );

    const [isSupabaseConfigured] = useState(() => {
        // @ts-ignore
        return !supabase.supabaseUrl.includes('INSERISCI_QUI');
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
            <Header 
                currentView={view} 
                setCurrentView={(v) => {
                    setView(v);
                    setSelectedApiary(null);
                    setSelectedHive(null);
                    setCalendarPreselection(null);
                }}
                user={user}
                onOpenAuth={() => {
                    setAuthModalMode('signin');
                    setIsAuthModalOpen(true);
                }}
                onLogout={handleLogout}
                isSyncing={isSyncing}
                lastSyncTime={lastSyncTime}
            />
            {!isSupabaseConfigured && (
                <div className="container mx-auto px-4 mt-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-center gap-3">
                        <WarningIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-red-700 dark:text-red-300">Configurazione Supabase Richiesta</h3>
                            <p className="text-sm text-red-600 dark:text-red-400">
                                Inserisci le credenziali nel file <code>services/supabase.ts</code> per abilitare il cloud.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {view === 'dashboard' && renderDashboard()}
                {view === 'calendar' && (
                    <CalendarView 
                        apiaries={apiaries}
                        events={calendarEvents}
                        onAddEvent={handleAddEvent}
                        onDeleteEvent={requestDeleteEvent}
                        initialApiaryId={calendarPreselection?.apiaryId}
                        initialHiveId={calendarPreselection?.hiveId}
                        onBack={calendarPreselection ? () => {
                            if (calendarPreselection.hiveId) {
                                setView('hiveDetails');
                            } else {
                                setView('apiaryDetails');
                            }
                            setCalendarPreselection(null);
                        } : undefined}
                    />
                )}
                {view === 'tools' && (
                    <ToolsView 
                        apiaries={apiaries}
                        onBack={() => setView('dashboard')}
                        notes={seasonalNotes}
                        onSaveNote={handleSaveNote}
                    />
                )}
                {view === 'apiaryDetails' && selectedApiary && (
                    <ApiaryDetails
                        apiary={selectedApiary}
                        onBack={() => setView('dashboard')}
                        onSelectHive={handleSelectHive}
                        onAddHive={() => { setHiveToEdit(null); setIsHiveModalOpen(true); }}
                        onDeleteApiary={() => requestDeleteApiary(selectedApiary.id)}
                        onEditApiary={() => { setApiaryToEdit(selectedApiary); setIsApiaryModalOpen(true); }}
                        onDeleteHive={requestDeleteHive}
                        onTransferHives={() => setIsTransferModalOpen(true)}
                    />
                )}
                {view === 'hiveDetails' && selectedHive && (
                    <HiveDetails
                        hive={selectedHive}
                        onBack={() => setView('apiaryDetails')}
                        onAddInspection={() => {
                            setInspectionToEdit(null);
                            setIsInspectionModalOpen(true);
                        }}
                        onAddProduction={() => {
                            setProductionToEdit(null);
                            setIsProductionModalOpen(true);
                        }}
                        onEditHive={(hive) => {
                            setHiveToEdit(hive);
                            setIsHiveModalOpen(true);
                        }}
                        onUpdateHive={handleQuickUpdateHive}
                        onDeleteHive={requestDeleteHive}
                        onDeleteInspection={requestDeleteInspection}
                        onEditInspection={(inspection) => {
                            setInspectionToEdit(inspection);
                            setIsInspectionModalOpen(true);
                        }}
                        onDeleteMovement={requestDeleteMovement}
                        onEditMovement={(movement) => {
                            setMovementToEdit(movement);
                            setIsMovementModalOpen(true);
                        }}
                        onDeleteProduction={requestDeleteProduction}
                        onEditProduction={(record) => {
                            setProductionToEdit(record);
                            setIsProductionModalOpen(true);
                        }}
                        onOpenCalendar={() => handleOpenCalendarForHive(selectedHive)}
                    />
                )}
                {view === 'aiAssistant' && <AiAssistant />}
            </main>

            <ApiaryModal isOpen={isApiaryModalOpen} onClose={() => setIsApiaryModalOpen(false)} onSave={handleSaveApiary} apiaryToEdit={apiaryToEdit} />
            <HiveModal isOpen={isHiveModalOpen} onClose={() => setIsHiveModalOpen(false)} onSave={handleSaveHive} hiveToEdit={hiveToEdit} />
            <InspectionModal isOpen={isInspectionModalOpen} onClose={() => setIsInspectionModalOpen(false)} onSave={handleSaveInspection} inspectionToEdit={inspectionToEdit} currentTemperature={currentTemperature} />
            
            {selectedApiary && (
                <TransferModal
                    isOpen={isTransferModalOpen}
                    onClose={() => setIsTransferModalOpen(false)}
                    sourceApiary={selectedApiary}
                    allApiaries={apiaries}
                    onTransfer={handleTransferHives}
                />
            )}
            
            <MovementModal isOpen={isMovementModalOpen} onClose={() => setIsMovementModalOpen(false)} onSave={handleSaveMovement} movementToEdit={movementToEdit} />
            <ProductionModal isOpen={isProductionModalOpen} onClose={() => setIsProductionModalOpen(false)} onSave={handleSaveProduction} recordToEdit={productionToEdit} />
            
            <AuthModal 
                isOpen={isAuthModalOpen}
                onClose={() => {
                    setIsAuthModalOpen(false);
                    isRecoveryFlowRef.current = false;
                }}
                defaultMode={authModalMode}
            />

            {/* Modal Avviso Autenticazione */}
            <Modal
                isOpen={isAuthAlertOpen}
                onClose={() => setIsAuthAlertOpen(false)}
                title="Attenzione"
            >
                <div className="space-y-4 text-center">
                    <WarningIcon className="w-12 h-12 text-amber-500 mx-auto" />
                    <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
                        Accedi per continuare
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Devi essere autenticato per creare nuovi apiari e sincronizzare i tuoi dati in cloud.
                    </p>
                    <div className="pt-4">
                        <button 
                            onClick={() => setIsAuthAlertOpen(false)} 
                            className="w-full py-2 bg-amber-500 text-white rounded-md font-semibold hover:bg-amber-600 transition shadow-sm"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Conferma Eliminazione */}
            <Modal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                title="Conferma Eliminazione"
            >
                <div className="space-y-4">
                    <p className="text-slate-700 dark:text-slate-300">
                        {deleteConfirmation?.type === 'apiary' && `Sei sicuro di voler eliminare l'apiario "${deleteConfirmation.name}" e tutte le sue arnie?`}
                        {deleteConfirmation?.type === 'hive' && `Sei sicuro di voler eliminare l'arnia "${deleteConfirmation.name}"?`}
                        {deleteConfirmation?.type === 'inspection' && "Sei sicuro di voler eliminare definitivamente questa ispezione?"}
                        {deleteConfirmation?.type === 'movement' && "Sei sicuro di voler eliminare questo registro di spostamento?"}
                        {deleteConfirmation?.type === 'production' && "Sei sicuro di voler eliminare questo registro di produzione?"}
                        {deleteConfirmation?.type === 'event' && "Sei sicuro di voler eliminare questo evento dal calendario?"}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Questa azione non può essere annullata.</p>
                    
                    <div className="flex justify-end gap-4 pt-4">
                        <button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Annulla</button>
                        <button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition shadow-sm">Elimina</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default App;
