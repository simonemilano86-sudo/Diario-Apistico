
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './services/supabase';
import useLocalStorage from './hooks/useLocalStorage';
import { Apiary, Hive, Inspection, User, View, CalendarEvent, HiveMovement, ProductionRecord, SeasonalNote, TeamMember } from './types';
import { loadFromCloud, saveToCloud, checkLastUpdate } from './services/db';
import { smartMergeApiaries, smartMergeEvents, smartMergeNotes } from './utils/smartMerge';
import { logger } from './services/logger';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import ApiaryCard from './components/ApiaryCard';
import ApiaryDetails from './components/ApiaryDetails';
import HiveDetails from './components/HiveDetails';
import AiAssistant from './components/AiAssistant';
import CalendarView from './components/CalendarView';
import ToolsView from './components/ToolsView'; 
import TeamManagement from './components/TeamManagement';
import ConstructionView from './components/ConstructionView';
import Modal from './components/Modal';

import AuthModal from './components/AuthModal';
import ApiaryModal from './components/ApiaryModal';
import HiveModal from './components/HiveModal';
import InspectionModal from './components/InspectionModal';
import TransferModal from './components/TransferModal';
import MovementModal from './components/MovementModal';
import ProductionModal from './components/ProductionModal';
import NfcModal from './components/NfcModal';
import NfcView from './components/NfcView';
import CalendarEventModal from './components/CalendarEventModal';

import { PlusIcon, BeeIcon, StylizedFlowerIcon, TransferIcon, JarIcon, BackArrowIcon, CloudIcon, SearchIcon, ScaleIcon, NfcIcon, TrashIcon, EditIcon, MoreVerticalIcon, MapPinIcon, ChevronDownIcon, ChevronUpIcon, FlowerIcon, GridIcon, WarningIcon, ConstructionIcon } from './components/Icons';

type DeleteItem = 
    | { type: 'apiary'; id: string; name: string }
    | { type: 'hive'; id: string; name: string }
    | { type: 'inspection'; id: string }
    | { type: 'movement'; id: string }
    | { type: 'production'; id: string }
    | { type: 'production-group'; apiaryId: string; date: string; apiaryName: string }
    | { type: 'event'; id: string };

const App: React.FC = () => {
    // --- STATE ---
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<View>('dashboard');
    
    // Local Storage
    const [apiaries, setApiaries] = useLocalStorage<Apiary[]>('beewise-apiaries', []);
    const [calendarEvents, setCalendarEvents] = useLocalStorage<CalendarEvent[]>('beewise-events', []);
    const [seasonalNotes, setSeasonalNotes] = useLocalStorage<SeasonalNote[]>('beewise-seasonal-notes', []);
    const [savedLocation, setSavedLocation] = useLocalStorage<any>('beewise-location', null);
    const [deletedIds, setDeletedIds] = useLocalStorage<string[]>('beewise-deleted-ids', []);
    const [teamMembers, setTeamMembers] = useLocalStorage<TeamMember[]>('beewise-team-members', []);

    // Sync
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [serverTimestamp, setServerTimestamp] = useState<string | null>(null);

    // Selection
    const [selectedApiary, setSelectedApiary] = useState<Apiary | null>(null);
    const [selectedHive, setSelectedHive] = useState<Hive | null>(null);
    
    // Scroll
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Filters & UI State
    const [productionTab, setProductionTab] = useState<'honey' | 'pollen' | 'propolis' | 'all'>('all');
    const [isAddingProduction, setIsAddingProduction] = useState(false);
    const [prodFilters, setProdFilters] = useState({ apiary: '', type: '' });
    const [isProdFilterOpen, setIsProdFilterOpen] = useState(false);
    const [isProdFabMenuOpen, setIsProdFabMenuOpen] = useState(false);
    const [expandedProdGroups, setExpandedProdGroups] = useState<Set<string>>(new Set());
    const [movementFilters, setMovementFilters] = useState({ text: '', fromApiary: '', toApiary: '', dateStart: '', dateEnd: '' });
    const [isMovementFilterOpen, setIsMovementFilterOpen] = useState(false);
    const [openMovementMenuId, setOpenMovementMenuId] = useState<string | null>(null);
    const [openProductionMenuId, setOpenProductionMenuId] = useState<string | null>(null);
    const [openProdGroupMenuId, setOpenProdGroupMenuId] = useState<string | null>(null);

    // Modals
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isAuthAlertOpen, setIsAuthAlertOpen] = useState(false);
    const [isApiaryModalOpen, setIsApiaryModalOpen] = useState(false);
    const [isHiveModalOpen, setIsHiveModalOpen] = useState(false);
    const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
    const [isBloomModalOpen, setIsBloomModalOpen] = useState(false);
    const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
    const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteItem | null>(null);

    // Edit Targets
    const [apiaryToEdit, setApiaryToEdit] = useState<Apiary | null>(null);
    const [hiveToEdit, setHiveToEdit] = useState<Hive | null>(null);
    const [inspectionToEdit, setInspectionToEdit] = useState<Inspection | null>(null);
    const [movementToEdit, setMovementToEdit] = useState<HiveMovement | null>(null);
    const [productionToEdit, setProductionToEdit] = useState<ProductionRecord | null>(null);
    const [calendarEventToEdit, setCalendarEventToEdit] = useState<CalendarEvent | null>(null);

    // PERMISSIONS CONSTANTS
    const userRole = user?.role || 'admin';
    const canDelete = userRole === 'admin';
    const canEdit = userRole === 'admin' || userRole === 'editor';
    const canAdd = userRole === 'admin' || userRole === 'editor';
    const hasTeamMembers = teamMembers.length > 1;

    // --- RESET FILTERS ---
    useEffect(() => {
        setIsProdFilterOpen(false);
        setIsMovementFilterOpen(false);
        if (view !== 'production') setProdFilters({ apiary: '', type: '' });
        if (view !== 'movements') setMovementFilters({ text: '', fromApiary: '', toApiary: '', dateStart: '', dateEnd: '' });
    }, [view]);

    // --- GLOBAL SCROLL ---
    useEffect(() => {
        const handleGlobalScroll = () => {
            setIsScrolling(true);
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => { setIsScrolling(false); }, 300);
        };
        window.addEventListener('scroll', handleGlobalScroll, { capture: true, passive: true });
        return () => {
            window.removeEventListener('scroll', handleGlobalScroll, { capture: true });
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        };
    }, []);

    // --- BACK BUTTON ---
    useEffect(() => {
        const backListener = CapacitorApp.addListener('backButton', (data) => {
            if (isAuthModalOpen) { setIsAuthModalOpen(false); return; }
            if (isAuthAlertOpen) { setIsAuthAlertOpen(false); return; }
            if (isLogoutModalOpen) { setIsLogoutModalOpen(false); return; }
            if (isApiaryModalOpen) { setIsApiaryModalOpen(false); return; }
            if (isHiveModalOpen) { setIsHiveModalOpen(false); return; }
            if (isInspectionModalOpen) { setIsInspectionModalOpen(false); return; }
            if (isTransferModalOpen) { setIsTransferModalOpen(false); return; }
            if (isMovementModalOpen) { setIsMovementModalOpen(false); return; }
            if (isProductionModalOpen) { setIsProductionModalOpen(false); return; }
            if (isBloomModalOpen) { setIsBloomModalOpen(false); return; }
            if (isScaleModalOpen) { setIsScaleModalOpen(false); return; }
            if (isNfcModalOpen) { setIsNfcModalOpen(false); return; }
            if (isCalendarModalOpen) { setIsCalendarModalOpen(false); return; }
            if (deleteConfirmation) { setDeleteConfirmation(null); return; }
            if (isAddingProduction) { setIsAddingProduction(false); return; }
            if (isProdFabMenuOpen) { setIsProdFabMenuOpen(false); return; }
            if (isMovementFilterOpen) { setIsMovementFilterOpen(false); return; }
            if (isProdFilterOpen) { setIsProdFilterOpen(false); return; }

            if (view === 'hiveDetails') { setView('apiaryDetails'); setSelectedHive(null); } 
            else if (view === 'apiaryDetails') { setView('dashboard'); setSelectedApiary(null); } 
            else if (view === 'teamManagement') { setView('dashboard'); }
            else if (view === 'seasonalNotes' || view === 'production' || view === 'movements' || view === 'nfc') { setView('tools'); } 
            else if (view !== 'dashboard') { setView('dashboard'); } 
            else { CapacitorApp.exitApp(); }
        });
        return () => { backListener.then(handler => handler.remove()); };
    }, [view, isAuthModalOpen, isAuthAlertOpen, isLogoutModalOpen, isApiaryModalOpen, isHiveModalOpen, isInspectionModalOpen, isTransferModalOpen, isMovementModalOpen, isProductionModalOpen, isBloomModalOpen, isScaleModalOpen, isNfcModalOpen, isCalendarModalOpen, deleteConfirmation, isAddingProduction, isProdFabMenuOpen, isMovementFilterOpen, isProdFilterOpen]);

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = () => { 
            if (openMovementMenuId) setOpenMovementMenuId(null); 
            if (openProductionMenuId) setOpenProductionMenuId(null);
            if (openProdGroupMenuId) setOpenProdGroupMenuId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openMovementMenuId, openProductionMenuId, openProdGroupMenuId]);

    // --- AUTH & SYNC ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser({
                    name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Utente',
                    email: session.user.email || '',
                    picture: session.user.user_metadata.avatar_url || '',
                    role: 'admin' 
                });
                handleCloudSync(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUser({
                    name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Utente',
                    email: session.user.email || '',
                    picture: session.user.user_metadata.avatar_url || '',
                    role: 'admin'
                });
                setIsAuthModalOpen(false);
                setIsAuthAlertOpen(false);
                handleCloudSync(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setApiaries([]); 
                setCalendarEvents([]);
                setSeasonalNotes([]);
                setDeletedIds([]); 
                setTeamMembers([]);
                setServerTimestamp(null);
                setView('dashboard');
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (user && teamMembers.length === 0) {
            setTeamMembers([{ 
                id: 'owner', 
                email: user.email, 
                name: user.name + ' (Tu)', 
                role: 'admin', 
                status: 'active' 
            }]);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const intervalId = setInterval(async () => {
            if (isSyncing) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const cloudTs = await checkLastUpdate(session.user.id);
            if (cloudTs && cloudTs !== serverTimestamp) {
                console.log("Rilevati cambiamenti remoti, scarico aggiornamenti...");
                handleCloudSync(session.user.id);
            }
        }, 5000); 
        return () => clearInterval(intervalId);
    }, [user, isSyncing, serverTimestamp]);

    const handleCloudSync = async (userId: string) => {
        setIsSyncing(true);
        try {
            const { data: cloudData, updatedAt } = await loadFromCloud(userId);
            if (cloudData) {
                const cloudDeletedIds = cloudData.deletedIds || [];
                const localDeletedIds = deletedIds || [];
                const mergedDeletedIds = Array.from(new Set([...localDeletedIds, ...cloudDeletedIds]));
                
                setApiaries(prev => smartMergeApiaries(prev, cloudData.apiaries, mergedDeletedIds));
                setCalendarEvents(prev => smartMergeEvents(prev, cloudData.calendarEvents, mergedDeletedIds));
                setSeasonalNotes(prev => smartMergeNotes(prev, cloudData.seasonalNotes, mergedDeletedIds));
                setDeletedIds(mergedDeletedIds);
                
                if (cloudData.savedLocation) setSavedLocation(cloudData.savedLocation);
                if (updatedAt) setServerTimestamp(updatedAt);
                setLastSyncTime(new Date());
            }
        } catch (e) { logger.log("Sync Error", "error"); } finally { setIsSyncing(false); }
    };

    const triggerSave = useCallback(async () => { setHasUnsavedChanges(true); }, []);

    useEffect(() => {
        if (!user || !hasUnsavedChanges) return;
        const timer = setTimeout(async () => {
             const { data: { session } } = await supabase.auth.getSession();
             if (session?.user) {
                 setIsSyncing(true);
                 const { data: cloudData } = await loadFromCloud(session.user.id);
                 const mergedDeletedIds = Array.from(new Set([...deletedIds, ...(cloudData?.deletedIds || [])]));
                 const mergedApiaries = smartMergeApiaries(apiaries, cloudData?.apiaries || [], mergedDeletedIds);
                 const mergedEvents = smartMergeEvents(calendarEvents, cloudData?.calendarEvents || [], mergedDeletedIds);
                 const mergedNotes = smartMergeNotes(seasonalNotes, cloudData?.seasonalNotes || [], mergedDeletedIds);
                 const { success, updatedAt } = await saveToCloud(session.user.id, { 
                     apiaries: mergedApiaries, calendarEvents: mergedEvents, seasonalNotes: mergedNotes, 
                     savedLocation: savedLocation || cloudData?.savedLocation, deletedIds: mergedDeletedIds 
                 });
                 if (success) {
                     setLastSyncTime(new Date());
                     setHasUnsavedChanges(false);
                     setApiaries(mergedApiaries);
                     setCalendarEvents(mergedEvents);
                     setSeasonalNotes(mergedNotes);
                     setDeletedIds(mergedDeletedIds);
                     if (updatedAt) setServerTimestamp(updatedAt);
                 } else { logger.log("Salvataggio fallito, riproverò.", "warn"); }
                 setIsSyncing(false);
             }
        }, 2000); 
        return () => clearTimeout(timer);
    }, [apiaries, calendarEvents, seasonalNotes, savedLocation, deletedIds, user, hasUnsavedChanges]);

    // REFRESH DETAILS
    useEffect(() => {
        if (selectedApiary) {
            const freshApiary = apiaries.find(a => a.id === selectedApiary.id);
            if (freshApiary) {
                setSelectedApiary(freshApiary);
                if (selectedHive) {
                    const freshHive = freshApiary.hives.find(h => h.id === selectedHive.id);
                    if (freshHive) setSelectedHive(freshHive);
                }
            } else {
                setSelectedApiary(null);
                setSelectedHive(null);
                if (view === 'apiaryDetails' || view === 'hiveDetails') setView('dashboard');
            }
        }
    }, [apiaries]);

    const handleAddApiaryClick = () => {
        if (!canAdd) return;
        setApiaryToEdit(null);
        setIsApiaryModalOpen(true);
    };

    const handleSaveApiary = (apiaryData: Omit<Apiary, 'id' | 'hives'>) => {
        if (!canAdd && !apiaryToEdit) return;
        if (!canEdit && apiaryToEdit) return;
        if (apiaryToEdit) {
            setApiaries(prev => prev.map(a => a.id === apiaryToEdit.id ? { ...a, ...apiaryData } : a));
        } else {
            const newApiary: Apiary = { id: Date.now().toString(), ...apiaryData, hives: [] };
            setApiaries(prev => [...prev, newApiary]);
        }
        setIsApiaryModalOpen(false);
        triggerSave();
    };

    const requestDeleteApiary = (id: string) => {
        if (!canDelete) return;
        const ap = apiaries.find(a => a.id === id);
        if (ap) setDeleteConfirmation({ type: 'apiary', id, name: ap.name });
    };

    const handleAddHive = () => {
        if (!canAdd) return;
        setHiveToEdit(null);
        setIsHiveModalOpen(true);
    };

    const handleSaveHive = (hiveData: Omit<Hive, 'id' | 'inspections'>) => {
        if (!selectedApiary) return;
        if (!canAdd && !hiveToEdit) return;
        if (!canEdit && hiveToEdit) return;
        let updatedApiaries = [...apiaries];
        const apiaryIndex = updatedApiaries.findIndex(a => a.id === selectedApiary.id);
        if (apiaryIndex === -1) return;
        if (hiveToEdit) {
            const updatedHives = selectedApiary.hives.map(h => h.id === hiveToEdit.id ? { ...h, ...hiveData } : h);
            updatedApiaries[apiaryIndex] = { ...selectedApiary, hives: updatedHives };
        } else {
            const newHive: Hive = { id: Date.now().toString(), ...hiveData, inspections: [] };
            updatedApiaries[apiaryIndex] = { ...selectedApiary, hives: [...selectedApiary.hives, newHive] };
        }
        setApiaries(updatedApiaries);
        setSelectedApiary(updatedApiaries[apiaryIndex]);
        setIsHiveModalOpen(false);
        triggerSave();
    };

    const handleDirectHiveUpdate = (updatedHive: Hive) => {
        if (!canEdit) return;
        if (!selectedApiary) return;
        setApiaries(prev => prev.map(a => {
            if (a.id === selectedApiary.id) {
                return { ...a, hives: a.hives.map(h => h.id === updatedHive.id ? updatedHive : h) };
            }
            return a;
        }));
        triggerSave();
    };

    const requestDeleteHive = (hiveId: string) => {
        if (!canDelete) return;
        const hive = selectedApiary?.hives.find(h => h.id === hiveId);
        if (hive) setDeleteConfirmation({ type: 'hive', id: hiveId, name: hive.name });
    };

    const handleAddInspection = () => {
        if (!canAdd) return;
        setInspectionToEdit(null);
        setIsInspectionModalOpen(true);
    };

    const handleSaveInspection = (inspection: Inspection, bulkOptions?: { applyActions: boolean; applyNotes: boolean }) => {
        if (!selectedHive || !selectedApiary) return;
        if (!canAdd && !inspectionToEdit) return;
        if (!canEdit && inspectionToEdit) return;
        const targetHiveIds = (bulkOptions?.applyActions || bulkOptions?.applyNotes) 
            ? selectedApiary.hives.map(h => h.id) : [selectedHive.id];
        const inspectionWithAudit = { ...inspection, createdBy: user?.name };
        const updatedApiaries = apiaries.map(apiary => {
            if (apiary.id !== selectedApiary.id) return apiary;
            const updatedHives = apiary.hives.map(hive => {
                if (!targetHiveIds.includes(hive.id)) return hive;
                let newInspection = { ...inspectionWithAudit, id: inspectionToEdit ? inspection.id : Date.now().toString() + Math.random() };
                if (hive.id !== selectedHive.id) {
                    newInspection = { ...inspectionWithAudit, id: Date.now().toString() + Math.random(), occupiedFrames: undefined, broodFrames: undefined, diaphragms: undefined, honeyStores: undefined, actions: bulkOptions?.applyActions ? inspection.actions : '', notes: bulkOptions?.applyNotes ? inspection.notes : '' };
                }
                let newInspections = [...hive.inspections];
                if (inspectionToEdit && hive.id === selectedHive.id) newInspections = newInspections.map(i => i.id === inspectionToEdit.id ? newInspection : i);
                else newInspections.push(newInspection);
                return { ...hive, inspections: newInspections };
            });
            return { ...apiary, hives: updatedHives };
        });
        setApiaries(updatedApiaries);
        setIsInspectionModalOpen(false);
        triggerSave();
    };

    const handleSaveProduction = (record: ProductionRecord, target?: { apiaryId: string, hiveIds: string[] }) => {
        if (!canAdd && !productionToEdit) return;
        if (!canEdit && productionToEdit) return;
        const apiaryId = target?.apiaryId || selectedApiary?.id;
        const hiveIds = target?.hiveIds || (selectedHive ? [selectedHive.id] : []);
        if (!apiaryId || hiveIds.length === 0) return;
        const recordWithAudit = { ...record, createdBy: user?.name };
        const updatedApiaries = apiaries.map(a => {
            if (a.id === apiaryId) {
                const updatedHives = a.hives.map(h => {
                    if (hiveIds.includes(h.id)) {
                        let newRecords = h.productionRecords || [];
                        if (productionToEdit && productionToEdit.id === record.id) {
                            newRecords = newRecords.map(r => r.id === record.id ? recordWithAudit : r);
                        } else {
                            const uniqueRecord = { ...recordWithAudit, id: Date.now().toString() + Math.random().toString().slice(2,5) };
                            newRecords = [...newRecords, uniqueRecord];
                        }
                        return { ...h, productionRecords: newRecords };
                    }
                    return h;
                });
                return { ...a, hives: updatedHives };
            }
            return a;
        });
        setApiaries(updatedApiaries);
        setIsProductionModalOpen(false);
        triggerSave();
    };

    const handleSaveEvent = (event: CalendarEvent) => { 
        if (!canAdd && !calendarEventToEdit) return;
        if (!canEdit && calendarEventToEdit) return;
        const eventWithAudit = { ...event, createdBy: user?.name };
        setCalendarEvents(prev => {
            const exists = prev.find(e => e.id === event.id);
            if (exists) return prev.map(e => e.id === event.id ? eventWithAudit : e);
            return [...prev, eventWithAudit];
        }); 
        triggerSave(); 
    };
    
    const requestDeleteEvent = (id: string) => {
        if (!canDelete) return;
        setDeleteConfirmation({ type: 'event', id: id });
    };

    const handleSaveNote = (note: SeasonalNote) => {
        if (!canEdit) return;
        setSeasonalNotes(prev => {
            const exists = prev.find(n => n.id === note.id);
            if (exists) return prev.map(n => n.id === note.id ? note : n);
            return [...prev, note];
        });
        triggerSave();
    };

    const handleTransfer = (targetApiaryId: string, hiveIds: string[], date: string, time: string, notes: string) => {
        if (!canAdd) return;
        const nextApiaries = JSON.parse(JSON.stringify(apiaries));
        const targetApiaryIndex = nextApiaries.findIndex((a: Apiary) => a.id === targetApiaryId);
        if (targetApiaryIndex === -1) return;
        hiveIds.forEach(hiveId => {
            let sourceApiaryIndex = -1;
            let hiveIndex = -1;
            for (let i = 0; i < nextApiaries.length; i++) {
                const idx = nextApiaries[i].hives.findIndex((h: Hive) => h.id === hiveId);
                if (idx !== -1) { sourceApiaryIndex = i; hiveIndex = idx; break; }
            }
            if (sourceApiaryIndex !== -1 && hiveIndex !== -1) {
                const [hiveToMove] = nextApiaries[sourceApiaryIndex].hives.splice(hiveIndex, 1);
                const movement: HiveMovement = { id: Date.now().toString() + Math.random().toString().slice(2,5), date, time, notes, fromApiaryName: nextApiaries[sourceApiaryIndex].name, toApiaryName: nextApiaries[targetApiaryIndex].name, createdBy: user?.name };
                hiveToMove.movements = [...(hiveToMove.movements || []), movement];
                nextApiaries[targetApiaryIndex].hives.push(hiveToMove);
            }
        });
        setApiaries(nextApiaries);
        setIsTransferModalOpen(false);
        triggerSave();
    };

    const handleSaveMovement = (updatedMovement: HiveMovement) => {
        if (!canEdit) return;
        const updatedApiaries = apiaries.map(apiary => ({
            ...apiary,
            hives: apiary.hives.map(hive => {
                const movementIndex = hive.movements?.findIndex(m => m.id === updatedMovement.id);
                if (movementIndex !== undefined && movementIndex > -1) {
                    const newMovements = [...(hive.movements || [])];
                    newMovements[movementIndex] = updatedMovement;
                    return { ...hive, movements: newMovements };
                }
                return hive;
            })
        }));
        setApiaries(updatedApiaries);
        setIsMovementModalOpen(false);
        triggerSave();
    };

    const handleSelectApiary = (apiary: Apiary) => { setSelectedApiary(apiary); setView('apiaryDetails'); };
    const handleSelectHive = (hive: Hive) => { setSelectedHive(hive); setView('hiveDetails'); };

    const handleSaveNfcAssociation = (hiveId: string, nfcTagId: string) => {
        if (!canEdit) return;
        const updatedApiaries = apiaries.map(apiary => ({
            ...apiary,
            hives: apiary.hives.map(h => h.id === hiveId ? { ...h, nfcTagId } : h)
        }));
        setApiaries(updatedApiaries);
        triggerSave();
    };

    const handleRemoveNfcTag = (hiveId: string) => {
        if (!canEdit) return;
        const updatedApiaries = apiaries.map(apiary => ({
            ...apiary,
            hives: apiary.hives.map(h => h.id === hiveId ? { ...h, nfcTagId: undefined } : h)
        }));
        setApiaries(updatedApiaries);
        triggerSave();
    };

    const executeDelete = async () => {
        if (!deleteConfirmation || !canDelete) return;
        const { type, id } = deleteConfirmation as any;
        
        if (type !== 'production-group') {
            setDeletedIds(prev => [...prev, id]);
        }

        if (type === 'apiary') setApiaries(prev => prev.filter(a => a.id !== id));
        if (type === 'hive' && selectedApiary) {
            const updatedApiaries = apiaries.map(a => a.id === selectedApiary.id ? { ...a, hives: a.hives.filter(h => h.id !== id) } : a);
            setApiaries(updatedApiaries);
        }
        if (type === 'inspection' && selectedHive && selectedApiary) {
             const updatedApiaries = apiaries.map(a => a.id === selectedApiary.id ? { ...a, hives: a.hives.map(h => h.id === selectedHive.id ? { ...h, inspections: h.inspections.filter(i => i.id !== id) } : h) } : a);
             setApiaries(updatedApiaries);
        }
        if (type === 'event') setCalendarEvents(prev => prev.filter(e => e.id !== id));
        
        if (type === 'production') {
             const updatedApiaries = apiaries.map(a => ({
                 ...a,
                 hives: a.hives.map(h => {
                     if (h.productionRecords?.some(r => r.id === id)) {
                         return { ...h, productionRecords: h.productionRecords.filter(r => r.id !== id) };
                     }
                     return h;
                 })
             }));
             setApiaries(updatedApiaries);
        }

        if (type === 'production-group') {
            const { apiaryId, date } = deleteConfirmation as { apiaryId: string, date: string };
            const idsToDelete: string[] = [];
            const targetApiary = apiaries.find(a => a.id === apiaryId);
            if (targetApiary) {
                targetApiary.hives.forEach(h => {
                    h.productionRecords?.forEach(r => { if (r.date === date) idsToDelete.push(r.id); });
                });
            }
            if (idsToDelete.length > 0) {
                setDeletedIds(prev => [...prev, ...idsToDelete]);
            }
            const updatedApiaries = apiaries.map(apiary => {
                if (apiary.id !== apiaryId) return apiary;
                const updatedHives = apiary.hives.map(hive => ({
                    ...hive,
                    productionRecords: (hive.productionRecords || []).filter(r => r.date !== date)
                }));
                return { ...apiary, hives: updatedHives };
            });
            setApiaries(updatedApiaries);
        }
        if (type === 'movement') {
            const updatedApiaries = apiaries.map(a => ({
                ...a,
                hives: a.hives.map(h => ({ ...h, movements: (h.movements || []).filter(m => m.id !== id) }))
            }));
            setApiaries(updatedApiaries);
        }
        triggerSave();
        setDeleteConfirmation(null);
    };

    // --- VIEW RENDERERS ---
    const renderDashboard = () => {
        const totalHives = apiaries.reduce((acc, apiary) => acc + (apiary.hives ? apiary.hives.length : 0), 0);
        return (
            <div className="animate-fade-in pb-20">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Bentornato, {user?.name.split(' ')[0] || 'Apicoltore'}!</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Hai <span className="font-bold text-amber-500">{apiaries.length}</span> apiari e <span className="font-bold text-amber-500">{totalHives}</span> arnie attive.
                            </p>
                        </div>
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-500"><BeeIcon className="w-8 h-8" /></div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-end px-1"><h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">I tuoi Apiari</h2></div>
                    {apiaries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {apiaries.map(apiary => (
                                <ApiaryCard key={apiary.id} apiary={apiary} onSelect={handleSelectApiary} onDelete={() => requestDeleteApiary(apiary.id)} onEdit={(e) => { e.stopPropagation(); setApiaryToEdit(apiary); setIsApiaryModalOpen(true); }} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700">
                            <div className="bg-slate-100 dark:bg-slate-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><PlusIcon className="w-8 h-8 text-slate-400" /></div>
                            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Nessun Apiario</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 mb-4">Inizia aggiungendo il tuo primo apiario.</p>
                        </div>
                    )}
                </div>
                {canAdd && (
                    <button onClick={handleAddApiaryClick} className={`fixed right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-all duration-300 z-50 ${isScrolling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} title="Aggiungi Apiario" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}><PlusIcon className="w-8 h-8" /></button>
                )}
            </div>
        );
    };

    const renderToolsHub = () => {
        const toolCards = [
            { id: 'seasonal', label: 'Fioriture Stagionali', icon: <StylizedFlowerIcon className="w-8 h-8 text-emerald-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else setView('seasonalNotes'); } },
            { id: 'production', label: 'Produzione', icon: <JarIcon className="w-8 h-8 text-amber-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else setView('production'); } },
            { id: 'movements', label: 'Nomadismo', icon: <TransferIcon className="w-8 h-8 text-blue-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else setView('movements'); } },
            { id: 'nfc', label: 'Configura NFC', icon: <NfcIcon className="w-8 h-8 text-indigo-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else setView('nfc'); } },
            { id: 'scale', label: 'Bilancia', icon: <ScaleIcon className="w-8 h-8 text-red-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else setIsScaleModalOpen(true); } },
        ];
        return (
            <div className="animate-fade-in p-4">
                <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white text-center">Strumenti & Gestione</h2>
                <div className="grid grid-cols-2 gap-4">
                    {toolCards.map(tool => (
                        <div key={tool.id} onClick={tool.action} className="h-40 flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02]">
                            <div className="mb-3">{tool.icon}</div>
                            <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 text-center">{tool.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const toggleProductionGroup = (groupKey: string) => {
        const newSet = new Set(expandedProdGroups);
        if (newSet.has(groupKey)) newSet.delete(groupKey); else newSet.add(groupKey);
        setExpandedProdGroups(newSet);
    };
    const clearProdFilters = () => { setProdFilters({ apiary: '', type: '' }); setIsProdFilterOpen(false); };

    const renderProductionView = () => {
        const allRecords = apiaries.flatMap(apiary => apiary.hives.flatMap(hive => (hive.productionRecords || []).map(record => ({ ...record, hiveName: hive.name, apiaryName: apiary.name, hiveId: hive.id, apiaryId: apiary.id }))));
        const uniqueHoneyTypes = Array.from(new Set(allRecords.map(r => r.honeyType).filter(t => t))).sort();
        const uniquePollenTypes = Array.from(new Set(allRecords.map(r => r.pollenType).filter(t => t))).sort();
        const activeFiltersCount = [prodFilters.apiary, prodFilters.type].filter(Boolean).length;
        let typeOptions: string[] = [];
        let typeLabel = "Tipo";
        let showTypeFilter = true;
        if (productionTab === 'honey') { typeOptions = uniqueHoneyTypes; typeLabel = "Tipo di Miele"; } 
        else if (productionTab === 'pollen') { typeOptions = uniquePollenTypes; typeLabel = "Tipo di Polline"; } 
        else if (productionTab === 'propolis') { showTypeFilter = false; } 
        else { typeOptions = Array.from(new Set([...uniqueHoneyTypes, ...uniquePollenTypes])).sort(); typeLabel = "Tipo (Miele/Polline)"; }

        const filteredRecords = allRecords.filter(r => {
            if (prodFilters.apiary && r.apiaryName !== prodFilters.apiary) return false;
            if (prodFilters.type) { const recordType = r.honeyType || r.pollenType; if (recordType !== prodFilters.type) return false; }
            if (productionTab === 'all') return true;
            if (productionTab === 'honey') return r.melariQuantity !== undefined;
            if (productionTab === 'pollen') return r.pollenGrams !== undefined;
            if (productionTab === 'propolis') return r.propolisNets !== undefined;
            return true;
        });

        const groupedRecords: Record<string, any> = {};
        filteredRecords.forEach(record => {
            const key = `${record.apiaryId}-${record.date}`;
            if (!groupedRecords[key]) { groupedRecords[key] = { key, date: record.date, apiaryId: record.apiaryId, apiaryName: record.apiaryName, records: [], totals: { honey: 0, pollen: 0, propolis: 0, honeyTypes: new Set(), pollenTypes: new Set() } }; }
            groupedRecords[key].records.push(record);
            if (record.melariQuantity) { groupedRecords[key].totals.honey += record.melariQuantity; if (record.honeyType) groupedRecords[key].totals.honeyTypes.add(record.honeyType); }
            if (record.pollenGrams) { groupedRecords[key].totals.pollen += record.pollenGrams; if (record.pollenType) groupedRecords[key].totals.pollenTypes.add(record.pollenType); }
            if (record.propolisNets) groupedRecords[key].totals.propolis += record.propolisNets;
        });
        const sortedGroups = Object.values(groupedRecords).sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <div className="animate-fade-in pb-20">
                <div className="flex justify-between items-center mb-6 h-10">
                    <button onClick={() => setView('tools')} className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"><BackArrowIcon className="w-5 h-5"/></button>
                    <div className="flex items-center gap-2">
                         <div className="relative">
                            <button onClick={() => setIsProdFilterOpen(!isProdFilterOpen)} className={`flex items-center justify-center w-10 h-10 rounded-full border transition shadow-sm ${activeFiltersCount > 0 ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}><SearchIcon className="w-5 h-5" /> {activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFiltersCount}</span>}</button>
                        </div>
                    </div>
                </div>
                {isProdFilterOpen && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-4 animate-fade-in">
                        <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Filtri Produzione</h3><button onClick={clearProdFilters} className="text-xs text-red-500 hover:underline">Resetta tutto</button></div>
                        <div className="space-y-3">
                            <div><label className="block text-xs font-semibold text-slate-500 mb-1">Apiario</label><select value={prodFilters.apiary} onChange={(e) => setProdFilters({...prodFilters, apiary: e.target.value})} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"><option value="">Tutti</option>{apiaries.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
                            {showTypeFilter && (
                                <div><label className="block text-xs font-semibold text-slate-500 mb-1">{typeLabel}</label><select value={prodFilters.type} onChange={(e) => setProdFilters({...prodFilters, type: e.target.value})} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white disabled:opacity-50" disabled={typeOptions.length === 0}><option value="">Tutti</option>{typeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            )}
                        </div>
                    </div>
                )}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-4 overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div className="p-5 flex flex-col items-center text-center">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Produzione Globale</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 mb-4">Monitora i raccolti di miele, polline e propoli.</p>
                        <div className="flex gap-2 w-full">
                            <button onClick={() => setProductionTab(productionTab === 'honey' ? 'all' : 'honey')} className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-bold border ${productionTab === 'honey' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-amber-600 dark:text-amber-500 border-transparent hover:bg-slate-200 dark:hover:bg-slate-600'}`}><JarIcon className="w-4 h-4" /><span>Miele</span></button>
                            <button onClick={() => setProductionTab(productionTab === 'pollen' ? 'all' : 'pollen')} className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-bold border ${productionTab === 'pollen' ? 'bg-yellow-500 text-white border-yellow-600 shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-600'}`}><FlowerIcon className="w-4 h-4" /><span>Polline</span></button>
                            <button onClick={() => setProductionTab(productionTab === 'propolis' ? 'all' : 'propolis')} className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-bold border ${productionTab === 'propolis' ? 'bg-amber-800 text-white border-amber-900 shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-600'}`}><GridIcon className="w-4 h-4" /><span>Propoli</span></button>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    {sortedGroups.length > 0 ? sortedGroups.map((group: any) => {
                        const isExpanded = expandedProdGroups.has(group.key);
                        const honeyTypesStr = Array.from(group.totals.honeyTypes).join(', ');
                        const pollenTypesStr = Array.from(group.totals.pollenTypes).join(', ');
                        return (
                            <div key={group.key} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                                <div onClick={() => toggleProductionGroup(group.key)} className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-t-lg relative">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <div><h3 className="font-bold text-base text-slate-800 dark:text-white leading-tight">{group.apiaryName}</h3><span className="text-xs font-medium text-slate-500 dark:text-slate-400">{new Date(group.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span></div>
                                        <button className="text-slate-400">{isExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}</button>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-wrap gap-1.5 text-xs">
                                            {group.totals.honey > 0 && (<div className="flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800"><JarIcon className="w-3 h-3" /><span className="font-bold text-[10px]">{group.totals.honey} Melari</span>{honeyTypesStr && <span className="text-[9px] opacity-75 truncate max-w-[80px]">({honeyTypesStr})</span>}</div>)}
                                            {group.totals.pollen > 0 && (<div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-100 dark:border-yellow-800"><FlowerIcon className="w-3 h-3" /><span className="font-bold text-[10px]">{group.totals.pollen}g</span>{pollenTypesStr && <span className="text-[9px] opacity-75 truncate max-w-[80px]">({pollenTypesStr})</span>}</div>)}
                                            {group.totals.propolis > 0 && (<div className="flex items-center gap-1 text-amber-800 dark:text-amber-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-800"><GridIcon className="w-3 h-3" /><span className="font-bold text-[10px]">{group.totals.propolis} Reti</span></div>)}
                                        </div>
                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => setOpenProdGroupMenuId(openProdGroupMenuId === group.key ? null : group.key)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"><MoreVerticalIcon className="w-4 h-4"/></button>
                                            {openProdGroupMenuId === group.key && (
                                                <div className="absolute right-0 bottom-full mb-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                                                    {canDelete && (<button onClick={(e) => { e.stopPropagation(); setOpenProdGroupMenuId(null); setDeleteConfirmation({ type: 'production-group', apiaryId: group.apiaryId, date: group.date, apiaryName: group.apiaryName } as any); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><TrashIcon className="w-4 h-4"/> Elimina</button>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-2 space-y-1 rounded-b-lg">
                                        {group.records.map((r: any, i: number) => (
                                            <div key={`${r.id}-${i}`} className="flex justify-between items-start p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 group relative">
                                                <div className="absolute top-2 right-2 z-10">
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenProductionMenuId(openProductionMenuId === r.id ? null : r.id); }} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"><MoreVerticalIcon className="w-4 h-4"/></button>
                                                    {openProductionMenuId === r.id && (
                                                        <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                                                            {canEdit && (<button onClick={(e) => { e.stopPropagation(); setOpenProductionMenuId(null); const apiary = apiaries.find(a => a.id === r.apiaryId); const hive = apiary?.hives.find(h => h.id === r.hiveId); if (apiary && hive) { setSelectedApiary(apiary); setSelectedHive(hive); } setProductionToEdit(r); setIsProductionModalOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"><EditIcon className="w-4 h-4"/> Modifica</button>)}
                                                            {canDelete && (<><div className="h-px bg-slate-100 dark:bg-slate-600"></div><button onClick={(e) => { e.stopPropagation(); setOpenProductionMenuId(null); setDeleteConfirmation({ type: 'production', id: r.id }); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><TrashIcon className="w-4 h-4"/> Elimina</button></>)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 pr-8">
                                                    <div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-100 dark:bg-slate-700 px-1.5 rounded">Arnia {r.hiveName}</span></div>
                                                    {r.melariQuantity !== undefined && <div className="text-amber-600 text-xs"><span className="font-semibold">{r.melariQuantity} Melari</span> <span className="text-slate-400">({r.honeyType})</span></div>}
                                                    {r.pollenGrams !== undefined && <div className="text-yellow-600 text-xs"><span className="font-semibold">{r.pollenGrams}g Polline</span> <span className="text-slate-400">({r.pollenType || 'Millefiori'})</span></div>}
                                                    {r.propolisNets !== undefined && <div className="text-amber-800 dark:text-amber-500 text-xs"><span className="font-semibold">{r.propolisNets} Reti Propoli</span></div>}
                                                    {r.createdBy && <p className="text-[9px] text-slate-400 italic mt-1">Aggiunto da: {r.createdBy}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }) : <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700"><JarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" /><p className="text-slate-500 dark:text-slate-400 font-medium">Nessun record di produzione.</p></div>}
                </div>
                {isProdFabMenuOpen && (<div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setIsProdFabMenuOpen(false)}></div>)}
                <div className={`fixed right-6 flex flex-col gap-3 items-end z-50 transition-all duration-300 transform ${isProdFabMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`} style={{ bottom: 'calc(10rem + env(safe-area-inset-bottom))' }}>
                    <button onClick={() => { setIsProdFabMenuOpen(false); setProductionTab('propolis'); setProductionToEdit(null); setIsProductionModalOpen(true); }} className="flex items-center gap-3 group"><span className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium whitespace-nowrap">Propoli</span><div className="w-12 h-12 bg-amber-700 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-800 transition"><GridIcon className="w-6 h-6"/></div></button>
                    <button onClick={() => { setIsProdFabMenuOpen(false); setProductionTab('pollen'); setProductionToEdit(null); setIsProductionModalOpen(true); }} className="flex items-center gap-3 group"><span className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium whitespace-nowrap">Polline</span><div className="w-12 h-12 bg-yellow-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-yellow-600 transition"><FlowerIcon className="w-6 h-6"/></div></button>
                    <button onClick={() => { setIsProdFabMenuOpen(false); setProductionTab('honey'); setProductionToEdit(null); setIsProductionModalOpen(true); }} className="flex items-center gap-3 group"><span className="bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg shadow-md text-sm font-medium whitespace-nowrap">Miele</span><div className="w-12 h-12 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition"><JarIcon className="w-6 h-6"/></div></button>
                </div>
                {canAdd && <button onClick={() => setIsProdFabMenuOpen(!isProdFabMenuOpen)} className={`fixed right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-all duration-300 z-50 ${isScrolling && !isProdFabMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}><PlusIcon className={`w-8 h-8 transition-transform duration-300 ${isProdFabMenuOpen ? 'rotate-45' : ''}`}/></button>}
            </div>
        );
    };

    const renderMovementsView = () => {
        const allMovements = apiaries.flatMap(apiary => apiary.hives.flatMap(hive => (hive.movements || []).map(m => ({ ...m, hiveName: hive.name, hiveId: hive.id })))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const filteredMovements = allMovements.filter(m => {
            const matchesText = !movementFilters.text || m.notes?.toLowerCase().includes(movementFilters.text.toLowerCase()) || m.hiveName.toLowerCase().includes(movementFilters.text.toLowerCase());
            const matchesFrom = !movementFilters.fromApiary || m.fromApiaryName === movementFilters.fromApiary;
            const matchesTo = !movementFilters.toApiary || m.toApiaryName === movementFilters.toApiary;
            const matchesStart = !movementFilters.dateStart || m.date >= movementFilters.dateStart;
            const matchesEnd = !movementFilters.dateEnd || m.date <= movementFilters.dateEnd;
            return matchesText && matchesFrom && matchesTo && matchesStart && matchesEnd;
        });
        return (
            <div className="animate-fade-in pb-20">
                <div className="flex justify-between items-center mb-6 h-10">
                    <button onClick={() => setView('tools')} className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"><BackArrowIcon className="w-5 h-5"/></button>
                    <div className="flex items-center gap-2"><button onClick={() => setIsMovementFilterOpen(!isMovementFilterOpen)} className={`flex items-center justify-center w-10 h-10 rounded-full border transition shadow-sm ${isMovementFilterOpen ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}><SearchIcon className="w-5 h-5" /></button></div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-4 overflow-hidden border border-slate-200 dark:border-slate-700"><div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col items-center text-center"><TransferIcon className="w-8 h-8 text-blue-500 mb-2"/><h2 className="text-xl font-bold text-slate-800 dark:text-white leading-none">Nomadismo</h2><p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Registro storico degli spostamenti.</p></div></div>
                {isMovementFilterOpen && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 mb-4 animate-fade-in"><div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Filtra Spostamenti</h3><button onClick={() => setMovementFilters({ text: '', fromApiary: '', toApiary: '', dateStart: '', dateEnd: '' })} className="text-xs text-red-500 hover:underline">Resetta</button></div><div className="space-y-3"><input type="text" placeholder="Cerca arnia o note..." value={movementFilters.text} onChange={(e) => setMovementFilters({...movementFilters, text: e.target.value})} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" /><div className="grid grid-cols-2 gap-2"><input type="date" value={movementFilters.dateStart} onChange={(e) => setMovementFilters({...movementFilters, dateStart: e.target.value})} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" /><input type="date" value={movementFilters.dateEnd} onChange={(e) => setMovementFilters({...movementFilters, dateEnd: e.target.value})} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white" /></div></div></div>
                )}
                <div className="space-y-3">
                    {filteredMovements.length > 0 ? filteredMovements.map(m => (
                        <div key={m.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 relative group">
                            <div className="absolute top-2 right-2 z-10"><button onClick={(e) => { e.stopPropagation(); setOpenMovementMenuId(openMovementMenuId === m.id ? null : m.id); }} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"><MoreVerticalIcon className="w-4 h-4"/></button>
                                {openMovementMenuId === m.id && (
                                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                                        {canEdit && (<button onClick={(e) => { e.stopPropagation(); setOpenMovementMenuId(null); setMovementToEdit(m); setIsMovementModalOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"><EditIcon className="w-4 h-4"/> Modifica</button>)}
                                        {canDelete && (<><div className="h-px bg-slate-100 dark:bg-slate-600"></div><button onClick={(e) => { e.stopPropagation(); setOpenMovementMenuId(null); setDeleteConfirmation({ type: 'movement', id: m.id }); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><TrashIcon className="w-4 h-4"/> Elimina</button></>)}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-start pr-6"><div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide bg-slate-100 dark:bg-slate-700 px-1.5 rounded">Arnia {m.hiveName}</span><h4 className="font-bold text-slate-800 dark:text-white text-sm mt-1">{new Date(m.date).toLocaleDateString()} {m.time && <span className="font-normal text-slate-500">({m.time})</span>}</h4></div></div>
                            <div className="flex items-center gap-2 mt-2 text-xs"><span className="font-semibold text-slate-600 dark:text-slate-300">{m.fromApiaryName}</span><BackArrowIcon className="w-3 h-3 text-slate-400 rotate-180" /><span className="font-semibold text-blue-600 dark:text-blue-400">{m.toApiaryName}</span></div>
                            {m.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic border-l-2 border-slate-200 dark:border-slate-600 pl-2">"{m.notes}"</p>}
                            {m.createdBy && <p className="text-[9px] text-slate-400 italic mt-1 text-right">Reg. da: {m.createdBy}</p>}
                        </div>
                    )) : (<div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700"><TransferIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" /><p className="text-slate-500 dark:text-slate-400 text-sm">Nessun movimento trovato.</p></div>)}
                </div>
                {canAdd && (<button onClick={() => setIsTransferModalOpen(true)} className={`fixed right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all duration-300 z-50 ${isScrolling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} title="Nuovo Spostamento" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}><PlusIcon className="w-8 h-8"/></button>)}
            </div>
        );
    };

    return (
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 flex flex-col">
            <Header currentView={view} setCurrentView={(v) => { if (!user && (v === 'calendar' || v === 'aiAssistant')) setIsAuthAlertOpen(true); else setView(v); setSelectedApiary(null); setSelectedHive(null); }} user={user} onOpenAuth={() => setIsAuthModalOpen(true)} onLogout={() => setIsLogoutModalOpen(true)} isSyncing={isSyncing} hasUnsavedChanges={hasUnsavedChanges} lastSyncTime={lastSyncTime} />
            <main className="container mx-auto px-4 py-6 pb-24 flex-grow overflow-y-auto">
                {view === 'dashboard' && renderDashboard()}
                {view === 'tools' && renderToolsHub()}
                {view === 'production' && renderProductionView()}
                {view === 'movements' && renderMovementsView()}
                {view === 'teamManagement' && <TeamManagement onBack={() => setView('dashboard')} user={user} teamMembers={teamMembers} onUpdateMembers={setTeamMembers} />}
                {view === 'nfc' && <NfcView apiaries={apiaries} onBack={() => setView('tools')} onOpenConfig={() => setIsNfcModalOpen(true)} onRemoveTag={handleRemoveNfcTag} isScrolling={isScrolling} />}
                {view === 'apiaryDetails' && selectedApiary && (<ApiaryDetails apiary={selectedApiary} onBack={() => setView('dashboard')} onSelectHive={handleSelectHive} onAddHive={handleAddHive} onDeleteApiary={() => requestDeleteApiary(selectedApiary.id)} onEditApiary={() => { setApiaryToEdit(selectedApiary); setIsApiaryModalOpen(true); }} onDeleteHive={requestDeleteHive} onEditHive={(h) => { setHiveToEdit(h); setIsHiveModalOpen(true); }} onTransferHives={() => setIsTransferModalOpen(true)} isScrolling={isScrolling} canDelete={canDelete} canEdit={canEdit} canAdd={canAdd} />)}
                {view === 'hiveDetails' && selectedHive && (<HiveDetails hive={selectedHive} onBack={() => setView('apiaryDetails')} onAddInspection={handleAddInspection} onAddProduction={() => { setProductionToEdit(null); setIsProductionModalOpen(true); }} onEditHive={(h) => { setHiveToEdit(h); setIsHiveModalOpen(true); }} onUpdateHive={handleDirectHiveUpdate} onDeleteHive={(id) => requestDeleteHive(id)} onDeleteInspection={(id) => setDeleteConfirmation({ type: 'inspection', id })} onEditInspection={(i) => { setInspectionToEdit(i); setIsInspectionModalOpen(true); }} onDeleteMovement={() => {}} onEditMovement={() => {}} onDeleteProduction={(id) => setDeleteConfirmation({ type: 'production', id })} onEditProduction={(r) => { setProductionToEdit(r); if (r.melariQuantity !== undefined) setProductionTab('honey'); else if (r.pollenGrams !== undefined) setProductionTab('pollen'); else setProductionTab('propolis'); setIsProductionModalOpen(true); }} onOpenCalendar={() => setView('calendar')} isScrolling={isScrolling} canDelete={canDelete} canEdit={canEdit} canAdd={canAdd} hasTeamMembers={hasTeamMembers} />)}
                {view === 'aiAssistant' && <AiAssistant />}
                {view === 'calendar' && (<CalendarView apiaries={apiaries} events={calendarEvents} onAddEvent={(e) => { setCalendarEventToEdit(null); handleSaveEvent(e); }} onDeleteEvent={requestDeleteEvent} onEditEvent={(e) => { setCalendarEventToEdit(e); setIsCalendarModalOpen(true); }} initialApiaryId={selectedApiary?.id} initialHiveId={selectedHive?.id} onBack={selectedApiary ? () => setView(selectedHive ? 'hiveDetails' : 'apiaryDetails') : undefined} onOpenModal={() => { setCalendarEventToEdit(null); setIsCalendarModalOpen(true); }} isScrolling={isScrolling} canDelete={canDelete} />)}
                {view === 'seasonalNotes' && (<ToolsView apiaries={apiaries} onBack={() => setView('tools')} notes={seasonalNotes} onSaveNote={handleSaveNote} isBloomModalOpen={isBloomModalOpen} setIsBloomModalOpen={setIsBloomModalOpen} isScrolling={isScrolling} />)}
            </main>
            <BottomNavigation currentView={view} setCurrentView={(v) => { if (!user && (v === 'calendar' || v === 'aiAssistant')) { setIsAuthAlertOpen(true); return; } setView(v); if (['dashboard', 'tools', 'calendar', 'aiAssistant'].includes(v)) { setSelectedApiary(null); setSelectedHive(null); } }} />
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            <Modal isOpen={isAuthAlertOpen} onClose={() => setIsAuthAlertOpen(false)} title="Attenzione"><div className="space-y-4 text-center"><WarningIcon className="w-12 h-12 text-amber-500 mx-auto" /><p className="text-lg font-medium text-slate-800 dark:text-slate-200">Accedi per continuare</p><p className="text-sm text-slate-500 dark:text-slate-400">Devi effettuare l'accesso per utilizzare questa funzionalità, altrimenti i tuoi dati non verranno salvati in cloud.</p><div className="pt-4"><button onClick={() => setIsAuthAlertOpen(false)} className="w-full py-2 bg-amber-500 text-white rounded-md font-semibold hover:bg-amber-600 transition shadow-sm">OK</button></div></div></Modal>
            <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title={hasUnsavedChanges ? "Attenzione: Dati non salvati" : "Conferma Uscita"}><div className="space-y-4">{hasUnsavedChanges ? (<div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800"><div className="flex items-start gap-3"><CloudIcon className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-amber-800 dark:text-amber-400 mb-1">Modifiche in attesa di sincronizzazione</p><p className="text-sm text-amber-700 dark:text-amber-300">Hai dati non ancora salvati nel cloud (probabilmente a causa della mancanza di rete).</p><p className="text-sm font-bold text-red-600 dark:text-red-400 mt-2">Se esci ora, PERDERAI definitivamente questi dati.</p><p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">Ti consigliamo di aspettare che torni la connessione.</p></div></div></div>) : (<p className="text-slate-600 dark:text-slate-300">Vuoi uscire dall'account?</p>)}<div className="flex justify-end gap-3 pt-2"><button onClick={() => setIsLogoutModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition">Annulla</button><button onClick={async () => { setIsLogoutModalOpen(false); const performLocalLogout = () => { setUser(null); setApiaries([]); setCalendarEvents([]); setSeasonalNotes([]); setDeletedIds([]); setTeamMembers([]); setServerTimestamp(null); setView('dashboard'); }; try { await Promise.race([ supabase.auth.signOut(), new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500)) ]); } catch (e) { console.log("Logout forced locally (offline or timeout)", e); } finally { performLocalLogout(); } }} className={`px-4 py-2 text-white rounded-md font-medium transition ${hasUnsavedChanges ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'}`}>{hasUnsavedChanges ? "Esci e Perdi Dati" : "Esci"}</button></div></div></Modal>
            <Modal isOpen={isScaleModalOpen} onClose={() => setIsScaleModalOpen(false)} title="Bilancia Arnia"><div className="flex flex-col items-center justify-center p-6 text-center"><ConstructionIcon className="w-16 h-16 text-amber-500 mb-4" /><h3 className="text-lg font-bold text-slate-800 dark:text-white">Work in Progress</h3><p className="text-slate-500 dark:text-slate-400 mt-2">Questa funzionalità per monitorare il peso delle arnie sarà presto disponibile.</p><button onClick={() => setIsScaleModalOpen(false)} className="mt-6 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition">Chiudi</button></div></Modal>
            <Modal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} title="Conferma Eliminazione"><div className="space-y-4"><p className="text-slate-700 dark:text-slate-300">{deleteConfirmation?.type === 'apiary' && `Sei sicuro di voler eliminare l'apiario "${deleteConfirmation.name}"?`} {deleteConfirmation?.type === 'hive' && `Sei sicuro di voler eliminare l'arnia "${deleteConfirmation.name}"?`} {deleteConfirmation?.type === 'inspection' && "Eliminare definitivamente questa ispezione?"} {deleteConfirmation?.type === 'production' && "Eliminare questo registro?"} {deleteConfirmation?.type === 'production-group' && "Sei sicuro di voler eliminare TUTTI i record di produzione per questo apiario in questa data?"} {deleteConfirmation?.type === 'event' && "Eliminare questo evento?"} {deleteConfirmation?.type === 'movement' && "Eliminare questo registro di spostamento?"}</p><div className="flex justify-end gap-4 pt-4"><button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md">Annulla</button><button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Elimina</button></div></div></Modal>
            <ApiaryModal isOpen={isApiaryModalOpen} onClose={() => setIsApiaryModalOpen(false)} onSave={handleSaveApiary} apiaryToEdit={apiaryToEdit} />
            <HiveModal isOpen={isHiveModalOpen} onClose={() => setIsHiveModalOpen(false)} onSave={handleSaveHive} hiveToEdit={hiveToEdit} />
            <InspectionModal isOpen={isInspectionModalOpen} onClose={() => setIsInspectionModalOpen(false)} onSave={handleSaveInspection} inspectionToEdit={inspectionToEdit} currentTemperature={20} />
            <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} allApiaries={apiaries} onTransfer={handleTransfer} sourceApiary={selectedApiary || undefined} />
            <MovementModal isOpen={isMovementModalOpen} onClose={() => setIsMovementModalOpen(false)} onSave={handleSaveMovement} movementToEdit={movementToEdit} apiaries={apiaries} />
            <ProductionModal isOpen={isProductionModalOpen} onClose={() => setIsProductionModalOpen(false)} onSave={handleSaveProduction} recordToEdit={productionToEdit} selectedType={productionTab === 'all' ? 'honey' : productionTab} apiaries={apiaries} initialApiaryId={selectedApiary?.id} initialHiveId={selectedHive?.id} />
            <NfcModal isOpen={isNfcModalOpen} onClose={() => setIsNfcModalOpen(false)} apiaries={apiaries} onSave={handleSaveNfcAssociation} />
            <CalendarEventModal isOpen={isCalendarModalOpen} onClose={() => setIsCalendarModalOpen(false)} onSave={handleSaveEvent} apiaries={apiaries} initialApiaryId={selectedApiary?.id} initialHiveId={selectedHive?.id} eventToEdit={calendarEventToEdit} />
        </div>
    );
};
export default App;
