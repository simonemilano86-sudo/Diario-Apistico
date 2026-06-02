import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from './services/supabase';
import useLocalStorage from './hooks/useLocalStorage';
import {
  Apiary,
  Hive,
  Inspection,
  User,
  View,
  CalendarEvent,
  HiveMovement,
  ProductionRecord,
  SeasonalNote,
  TeamMember,
  TeamOption,
  Message,
} from './types';
import {
  loadFromCloud,
  saveToCloud,
  checkLastUpdate,
  fetchTeamsForUser,
  setCurrentTeamId,
  getCurrentTeamId,
  fetchUserPlan,
  upgradeToPremium,
} from './services/db';
import { smartMergeApiaries, smartMergeEvents, smartMergeNotes } from './utils/smartMerge';
import { logger } from './services/logger';

import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import DashboardView from './components/DashboardView';
import ProductionView from './components/ProductionView';
import ProductionLogView from './components/ProductionLogView';
import MovementsView from './components/MovementsView';
import ApiaryDetails from './components/ApiaryDetails';
import ApiaryLogView from './components/ApiaryLogView';
import HiveDetails from './components/HiveDetails';
import AiAssistant from './components/AiAssistant';
import CalendarView from './components/CalendarView';
import ToolsView from './components/ToolsView';
import TreatmentsLogView from './components/TreatmentsLogView';
import TeamManagement from './components/TeamManagement';
import Modal from './components/Modal';
import ScaleDashboard from './src/components/ScaleDashboard';
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
import WelcomeModal from './components/WelcomeModal';
import PremiumModal from './components/PremiumModal';
import MultiAccessModal from './components/MultiAccessModal';
import FeedbackModal from './components/AppFeedbackModal';
import TrashView from './components/TrashView';
import PremiumGiftModal from './components/PremiumGiftModal';

import {
  StylizedFlowerIcon,
  TransferIcon,
  JarIcon,
  NfcIcon,
  ScaleIcon,
  WarningIcon,
  CloudIcon,
  BeeIcon,
  ClipboardIcon,
  TrashIcon,
  UsersIcon,
  SparklesIcon,
} from './components/Icons';

type DeleteItem =
  | { type: 'apiary'; id: string; name: string }
  | { type: 'hive'; id: string; name: string }
  | { type: 'inspection'; id: string }
  | { type: 'movement'; id: string }
  | { type: 'production'; id: string }
  | { type: 'production-group'; apiaryId: string; date: string; apiaryName: string }
  | { type: 'event'; id: string };

export let isPasswordRecoveryFlow = false;
export const resetPasswordRecoveryFlow = () => { isPasswordRecoveryFlow = false; };

const App: React.FC = () => {
  // --- STATE CORE ---
  const [user, setUser] = useLocalStorage<User | null>('beewise:user', null);
  // Forza sempre il caricamento iniziale a true per aspettare la conferma di Supabase
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>('beewise-user-id', null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log("App tornata ONLINE");
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log("App andata OFFLINE");
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pulisce i dati fantasma al caricamento se l'utente non è loggato
  useEffect(() => {
    if (!user && !loading) {
      setApiaries([]);
      setCalendarEvents([]);
      setSeasonalNotes([]);
      setTeamMembers([]);
    }
  }, [user, loading]);
  
  // --- SESSION GUARD STATE ---
  const [localSessionId] = useState(() => crypto.randomUUID());
  const [isDoubleLogin, setIsDoubleLogin] = useState(false);
  const hasUpdatedSessionRef = useRef(false);

  const updateDbSessionId = useCallback(async (userId: string, email?: string, name?: string) => {
    if (hasUpdatedSessionRef.current || !isOnline) {
      if (!isOnline) console.log(`[SessionGuard] Device offline, skipping session update.`);
      return;
    }
    
    try {
      console.log(`[SessionGuard] Tentativo di salvataggio nuovo ID sessione su Supabase: ${localSessionId} per utente ${userId}`);
      hasUpdatedSessionRef.current = true; // Imposta subito per evitare chiamate concorrenti
      
      // Prima proviamo con un update
      let { data, error } = await supabase
        .from('users')
        .update({ current_session_id: localSessionId })
        .eq('id', userId)
        .select();
        
      // Se l'update non ha modificato nessuna riga (utente non esiste), facciamo un upsert
      if (!error && (!data || data.length === 0)) {
        console.log(`[SessionGuard] Utente non trovato in 'users', creo la riga...`);
        const upsertResult = await supabase
          .from('users')
          .upsert({ 
            id: userId, 
            email: email || '', 
            full_name: name || 'Utente',
            current_session_id: localSessionId 
          })
          .select();
        data = upsertResult.data;
        error = upsertResult.error;
      }
        
      if (error) {
        console.error('[SessionGuard] ERRORE durante il salvataggio su Supabase:', error);
        hasUpdatedSessionRef.current = false; // Permetti un nuovo tentativo in caso di errore
      } else {
        console.log('[SessionGuard] Salvataggio riuscito! Dati aggiornati:', data);
        setIsDoubleLogin(false);
      }
    } catch (e) {
      console.error('[SessionGuard] Eccezione durante updateDbSessionId:', e);
      hasUpdatedSessionRef.current = false;
    }
  }, [localSessionId, isOnline]);

  // --- SESSION GUARD: Update DB on login ---
  useEffect(() => {
    if (currentUserId && user) {
      updateDbSessionId(currentUserId, user.email, user.name);
    }
  }, [currentUserId, user, updateDbSessionId]);

  // --- REALTIME LISTENER FOR SESSION GUARD & PLAN UPDATES ---
  useEffect(() => {
    if (!currentUserId) return;

    console.log(`[SessionGuard] Avvio ascolto Realtime per utente ${currentUserId}...`);

    const sessionChannel = supabase
      .channel(`public:session_guard:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('[SessionGuard] 🔔 RICEVUTO EVENTO REALTIME DA SUPABASE (users):', payload);
          
          const newDbSessionId = payload.new.current_session_id;
          const userEmail = payload.new.email;

          if (userEmail === 'simonemilano86@gmail.com') {
            console.log('[SessionGuard] Utente Simone rilevato. Ignoro il controllo doppio login.');
            setIsDoubleLogin(false);
            return;
          }

          console.log(`[SessionGuard] Confronto ID: Locale = ${localSessionId}, Database = ${newDbSessionId}`);

          if (user?.plan === 'premium' || user?.plan === 'team' || user?.plan === 'enterprise') {
            console.log(`[SessionGuard] Piano ${user.plan} rilevato. Accesso multiplo consentito.`);
            setIsDoubleLogin(false);
            return;
          }

          if (newDbSessionId && newDbSessionId !== localSessionId) {
            console.log('[SessionGuard] 🚨 DOPPIO LOGIN RILEVATO! Blocco la sessione.');
            setIsDoubleLogin(true);
          } else {
            console.log('[SessionGuard] Nessun doppio login. Gli ID coincidono o sono vuoti.');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_quotas',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('[SessionGuard] 🔔 RICEVUTO EVENTO REALTIME DA SUPABASE (user_quotas):', payload);
          if (payload.new && payload.new.plan) {
            const newPlan = payload.new.plan;
            console.log(`[SessionGuard] Aggiornamento piano in tempo reale: ${newPlan}`);
            setUser(prev => prev ? { ...prev, plan: newPlan } : null);
            // Non c'è bisogno di chiamare localStorage.setItem qui perché useLocalStorage lo fa già
            // ma lo facciamo per sicurezza per le chiavi legacy
            localStorage.setItem(`beewise:plan:${currentUserId}`, newPlan);
            
            // Se il nuovo piano permette l'accesso multiplo, sblocca l'utente immediatamente
            if (newPlan === 'premium' || newPlan === 'team' || newPlan === 'enterprise') {
                setIsDoubleLogin(false);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[SessionGuard] Stato connessione Realtime:', status);
      });

    return () => {
      console.log('[SessionGuard] Chiusura canali Realtime...');
      supabase.removeChannel(sessionChannel);
    };
  }, [currentUserId, localSessionId, user?.plan, setUser]);

  const [view, setView] = useState<View>('dashboard');
  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const scopeMenuRef = useRef<HTMLDivElement>(null);

  const scopeKey = activeTeamId ? `team:${activeTeamId}` : 'personal';

  // Local Storage Scoped
  const [apiaries, setApiaries] = useLocalStorage<Apiary[]>(`beewise:${scopeKey}:apiaries`, []);
  const [calendarEvents, setCalendarEvents] = useLocalStorage<CalendarEvent[]>(`beewise:${scopeKey}:events`, []);
  const [seasonalNotes, setSeasonalNotes] = useLocalStorage<SeasonalNote[]>(`beewise:${scopeKey}:seasonal-notes`, []);
  const [savedLocation, setSavedLocation] = useLocalStorage<any>(`beewise:${scopeKey}:location`, null);
  const [deletedIds, setDeletedIds] = useLocalStorage<string[]>(`beewise:${scopeKey}:deleted-ids`, []);
  const [teamMembers, setTeamMembers] = useLocalStorage<TeamMember[]>(`beewise:${scopeKey}:team-members`, []);
  const [hasSeenWelcome, setHasSeenWelcome] = useLocalStorage<boolean>('beewise:has-seen-welcome-v3', false);
  const [aiMessages, setAiMessages] = useLocalStorage<Message[]>(`beewise:${scopeKey}:ai-messages`, []);

  // Sync & Control
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [serverTimestamp, setServerTimestamp] = useState<string | null>(null);

  const isSyncingRef = useRef(false);
  const isSavingRef = useRef(false);
  const isSwitchingRef = useRef(false);
  const activeTeamIdRef = useRef<string | null>(null);
  const unsavedChangesCounterRef = useRef(0);

  // Data Refs
  const apiariesRef = useRef(apiaries);
  const eventsRef = useRef(calendarEvents);
  const notesRef = useRef(seasonalNotes);
  const savedLocationRef = useRef(savedLocation);
  const deletedIdsRef = useRef(deletedIds);

  useEffect(() => { apiariesRef.current = apiaries; }, [apiaries]);
  useEffect(() => { eventsRef.current = calendarEvents; }, [calendarEvents]);
  useEffect(() => { notesRef.current = seasonalNotes; }, [seasonalNotes]);
  useEffect(() => { savedLocationRef.current = savedLocation; }, [savedLocation]);
  useEffect(() => { deletedIdsRef.current = deletedIds; }, [deletedIds]);
  useEffect(() => { activeTeamIdRef.current = activeTeamId; }, [activeTeamId]);

  // --- DERIVED ACTIVE STATE (Excludes Soft Deleted Items) ---
  const activeApiaries = useMemo(() => {
    return apiaries.filter(a => !a._deleted).map(a => ({
      ...a,
      hives: (a.hives || []).filter(h => !h._deleted).map(h => ({
        ...h,
        inspections: (h.inspections || []).filter(i => !i._deleted),
        productionRecords: (h.productionRecords || []).filter(r => !r._deleted),
        movements: (h.movements || []).filter(m => !m._deleted)
      }))
    }));
  }, [apiaries]);

  const activeEvents = useMemo(() => calendarEvents.filter(e => !e._deleted), [calendarEvents]);
  const activeNotes = useMemo(() => seasonalNotes.filter(n => !n._deleted).map(n => ({
    ...n,
    blooms: (n.blooms || []).filter(b => !b._deleted)
  })), [seasonalNotes]);

  // View States
  const [selectedApiary, setSelectedApiary] = useState<Apiary | null>(null);
  const [selectedHive, setSelectedHive] = useState<Hive | null>(null);
  const [apiaryToFix, setApiaryToFix] = useState<Apiary | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(true);

  const pendingSyncApiaries = useMemo(() => activeApiaries.filter(a => a.pendingLocationSync), [activeApiaries]);
  useEffect(() => {
    if (selectedApiary) {
      const updatedApiary = activeApiaries.find(a => a.id === selectedApiary.id);
      if (updatedApiary) {
        setSelectedApiary(updatedApiary);
        if (selectedHive) {
          const updatedHive = updatedApiary.hives.find(h => h.id === selectedHive.id);
          if (updatedHive) {
            setSelectedHive(updatedHive);
          } else {
            // Se l'arnia è stata eliminata (non più in activeHives), deselezionala
            setSelectedHive(null);
          }
        }
      } else {
        // Se l'apiario è stato eliminato, torna alla dashboard
        setSelectedApiary(null);
        setSelectedHive(null);
        if (view === 'apiaryDetails' || view === 'hiveDetails') {
          setView('dashboard');
        }
      }
    }
  }, [activeApiaries, selectedApiary?.id, selectedHive?.id]);
  const [productionTab, setProductionTab] = useState<'honey' | 'pollen' | 'propolis' | 'all'>('all');
  const [prodFilters, setProdFilters] = useState({ apiary: '', type: '' });
  const [isProdFilterOpen, setIsProdFilterOpen] = useState(false);
  const [isProdFabMenuOpen, setIsProdFabMenuOpen] = useState(false);
  const [expandedProdGroups, setExpandedProdGroups] = useState<Set<string>>(new Set());
  const [movementFilters, setMovementFilters] = useState({ text: '', fromApiary: '', toApiary: '', dateStart: '', dateEnd: '' });
  const [isMovementFilterOpen, setIsMovementFilterOpen] = useState(false);
  const [openMovementMenuId, setOpenMovementMenuId] = useState<string | null>(null);
  const [openProductionMenuId, setOpenProductionMenuId] = useState<string | null>(null);
  const [openProdGroupMenuId, setOpenProdGroupMenuId] = useState<string | null>(null);

  // --- AUTOMATIC CLEANUP (Delete permanently after 10 days) ---
  useEffect(() => {
    if (!apiaries.length && !calendarEvents.length) return;
    
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let hasChanged = false;
    let newDeletedIds: string[] = [];

    const processItem = (item: any) => {
      if (item._deleted && (now - (item._deletedAt || 0) > tenDaysMs)) {
        newDeletedIds.push(item.id);
        hasChanged = true;
        return null;
      }
      return item;
    };

    const nextApiaries = apiaries.map(a => {
      const cleanedApiary = processItem(a);
      if (!cleanedApiary) return null;
      return {
        ...cleanedApiary,
        hives: (cleanedApiary.hives || []).map((h: any) => {
          const cleanedHive = processItem(h);
          if (!cleanedHive) return null;
          return {
            ...cleanedHive,
            inspections: (cleanedHive.inspections || []).map((i: any) => processItem(i)).filter(Boolean),
            productionRecords: (cleanedHive.productionRecords || []).map((r: any) => processItem(r)).filter(Boolean),
            movements: (cleanedHive.movements || []).map((m: any) => processItem(m)).filter(Boolean)
          };
        }).filter(Boolean)
      };
    }).filter(Boolean);

    const nextEvents = calendarEvents.map(e => processItem(e)).filter(Boolean);

    if (hasChanged) {
      console.log(`[SoftDelete] Pulizia automatica: rimossi definitivamente ${newDeletedIds.length} elementi scaduti.`);
      setApiaries(nextApiaries as Apiary[]);
      apiariesRef.current = nextApiaries as Apiary[];
      setCalendarEvents(nextEvents as CalendarEvent[]);
      eventsRef.current = nextEvents as CalendarEvent[];
      setDeletedIds(prev => [...prev, ...newDeletedIds]);
      setHasUnsavedChanges(true);
      setTimeout(() => forceSync(), 1000);
    }
  }, [apiaries.length, calendarEvents.length]); // Solo al caricamento o cambio lunghezze

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'recovery' | 'update_password'>('signin');
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
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isMultiAccessModalOpen, setIsMultiAccessModalOpen] = useState(false);
  const [isPremiumGiftModalOpen, setIsPremiumGiftModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteItem | null>(null);

  const [apiaryToEdit, setApiaryToEdit] = useState<Apiary | null>(null);
  const [hiveToEdit, setHiveToEdit] = useState<Hive | null>(null);
  const [inspectionToEdit, setInspectionToEdit] = useState<Inspection | null>(null);
  const [movementToEdit, setMovementToEdit] = useState<HiveMovement | null>(null);
  const [productionToEdit, setProductionToEdit] = useState<ProductionRecord | null>(null);
  const [calendarEventToEdit, setCalendarEventToEdit] = useState<CalendarEvent | null>(null);

  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (view === 'apiaryDetails' && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [view]);

  // --- LOGICA HISTORY PER BACK SWIPE ---
  const isNavigatingRef = useRef(false);

  // Helper per cambiare vista gestendo la cronologia
  const navigateTo = useCallback((nextView: View, apiaryId: string | null = null, hiveId: string | null = null) => {
    if (isNavigatingRef.current) return;
    
    // Se torniamo alla dashboard, svuotiamo la cronologia se eravamo in una sottovista profonda
    // ma usiamo pushState per permettere lo swipe back dal dettaglio alla home
    window.history.pushState({ view: nextView, apiaryId, hiveId }, '');
    setView(nextView);
  }, []);

  // Listener per link NFC e Deep Links (Supabase Auth)
  useEffect(() => {
    const handler = CapacitorApp.addListener('appUrlOpen', async (event) => {
      const url = event.url;
      
      // Gestione NFC
      if (url.includes('beewise://hive/')) {
        const hiveId = url.split('/').pop();
        if (hiveId) {
          // Cerca l'arnia e l'apiario corrispondente
          for (const apiary of apiariesRef.current) {
            const hive = apiary.hives.find(h => h.id === hiveId);
            if (hive) {
              setSelectedApiary(apiary);
              setSelectedHive(hive);
              navigateTo('hiveDetails', apiary.id, hive.id);
              break;
            }
          }
        }
      }
      
      // Gestione Supabase Auth (Deep Links)
      if (url.includes('com.beewise.diario://auth/callback')) {
        logger.log(`Deep link ricevuto: ${url}`, 'info');
        
        // Estrai il codice PKCE dall'URL
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        
        if (code) {
          logger.log(`Codice PKCE trovato, scambio per sessione...`, 'info');
          
          const isRecovery = localStorage.getItem('beewise_recovery_pending') === 'true';
          if (isRecovery) {
            isPasswordRecoveryFlow = true;
          }
          
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            logger.log(`Errore exchangeCodeForSession: ${error.message}`, 'error');
          } else {
            logger.log(`Sessione stabilita tramite deep link!`, 'info');
            if (isRecovery) {
              localStorage.removeItem('beewise_recovery_pending');
              setAuthModalMode('update_password');
              setIsAuthModalOpen(true);
            }
          }
        } else {
          // Fallback per implicit flow (hash) se presente
          if (url.includes('#')) {
            const hashParams = new URLSearchParams(url.split('#')[1]);
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');
            
            if (accessToken && refreshToken) {
              if (type === 'recovery') {
                // Se è un implicit flow esplicito per recovery, settiamo il flag per onAuthStateChange
                localStorage.setItem('beewise_recovery_pending', 'true');
              }
              
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
            }
          }
        }
      }
    });
    return () => {
      handler.then(h => h.remove());
    };
  }, [navigateTo]);

  useEffect(() => {
    const handler = CapacitorApp.addListener('backButton', () => {
      // Check if any modal is open
      if (isAuthModalOpen) setIsAuthModalOpen(false);
      else if (isAuthAlertOpen) setIsAuthAlertOpen(false);
      else if (isApiaryModalOpen) setIsApiaryModalOpen(false);
      else if (isHiveModalOpen) setIsHiveModalOpen(false);
      else if (isInspectionModalOpen) setIsInspectionModalOpen(false);
      else if (isTransferModalOpen) setIsTransferModalOpen(false);
      else if (isMovementModalOpen) setIsMovementModalOpen(false);
      else if (isProductionModalOpen) setIsProductionModalOpen(false);
      else if (isBloomModalOpen) setIsBloomModalOpen(false);
      else if (isScaleModalOpen) setIsScaleModalOpen(false);
      else if (isNfcModalOpen) setIsNfcModalOpen(false);
      else if (isCalendarModalOpen || calendarEventToEdit) {
        setIsCalendarModalOpen(false);
        setCalendarEventToEdit(null);
      }
      else if (isLogoutModalOpen) setIsLogoutModalOpen(false);
      else if (deleteConfirmation) setDeleteConfirmation(null);
      // If no modal, navigate back
      else if (view !== 'dashboard') {
        window.history.back();
      }
      // If on dashboard, exit app
      else {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      handler.then(h => h.remove());
    };
  }, [
    isAuthModalOpen, isAuthAlertOpen, isApiaryModalOpen, isHiveModalOpen, 
    isInspectionModalOpen, isTransferModalOpen, isMovementModalOpen, 
    isProductionModalOpen, isBloomModalOpen, isScaleModalOpen, 
    isNfcModalOpen, isCalendarModalOpen, calendarEventToEdit, isLogoutModalOpen, 
    deleteConfirmation, view
  ]);

  // Sincronizza lo stato React con la cronologia del browser
  useEffect(() => {
    // Inizializza lo stato base se non esiste
    if (!window.history.state) {
      window.history.replaceState({ view: 'dashboard', apiaryId: null, hiveId: null }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        isNavigatingRef.current = true;
        const { view: targetView, apiaryId, hiveId } = event.state;
        
        // Se c'è un apiario nel cronologia, cercalo
        if (apiaryId) {
          const foundApiary = apiariesRef.current.find(a => a.id === apiaryId);
          setSelectedApiary(foundApiary || null);
          
          if (hiveId && foundApiary) {
            const foundHive = foundApiary.hives.find(h => h.id === hiveId);
            setSelectedHive(foundHive || null);
          } else {
            setSelectedHive(null);
          }
        } else {
          setSelectedApiary(null);
          setSelectedHive(null);
        }

        setView(targetView);
        
        // Reset del flag dopo il ciclo di render
        setTimeout(() => { isNavigatingRef.current = false; }, 100);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- NETWORK WRAPPER ---
  const withTimeout = useCallback(async <T,>(promise: Promise<T>, ms: number = 60000): Promise<T> => {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), ms);
    });
    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }, []);

  const triggerSave = useCallback(() => {
    if (isSwitchingRef.current) return;
    unsavedChangesCounterRef.current += 1;
    setHasUnsavedChanges(true);
  }, []);

  // Funzione per forzare il salvataggio immediato (es. click su nuvola)
  const forceSync = useCallback(async (overridePlan?: string | React.MouseEvent | React.TouchEvent) => {
    if (!user || isSavingRef.current || isSyncingRef.current) return;
    
    // Se l'utente è offline, salviamo solo localmente e usciamo
    if (!isOnline) {
      logger.log("Force sync skipped: Device is offline. Data saved locally.", "info");
      setHasUnsavedChanges(true); // Manterrà l'indicatore di modifiche in attesa
      return;
    }
    
    // Se l'utente è free, non sincronizziamo con il cloud
    const effectivePlan = typeof overridePlan === 'string' ? overridePlan : user.plan;
    if (effectivePlan === 'free') {
      logger.log("Force sync skipped: User is on free plan", "info");
      setIsPremiumModalOpen(true);
      return;
    }

    setIsSaving(true);
    isSavingRef.current = true;
    const snapshotTeamId = activeTeamIdRef.current;
    const currentCounter = unsavedChangesCounterRef.current;
    
    try {
      const userId = currentUserId || localStorage.getItem('beewise-user-id');
      if (!userId) throw new Error("User ID missing");

      // Carichiamo i dati dal cloud per il merge
      let cloudData: any = null;
      try {
        const cloudResult = await withTimeout(loadFromCloud(userId, snapshotTeamId), 15000);
        cloudData = cloudResult.data;
      } catch (e) {
        logger.log("Forcing save without cloud merge due to timeout", "warn");
      }

      const mergedDeletedIds = Array.from(new Set([...deletedIdsRef.current, ...(cloudData?.deletedIds || [])]));
      const mergedApiaries = smartMergeApiaries(apiariesRef.current, cloudData?.apiaries || [], mergedDeletedIds);
      const mergedEvents = smartMergeEvents(eventsRef.current, cloudData?.calendarEvents || [], mergedDeletedIds);
      const mergedNotes = smartMergeNotes(notesRef.current, cloudData?.seasonalNotes || [], mergedDeletedIds);

      const saveResult = await withTimeout(saveToCloud(userId, { 
        apiaries: mergedApiaries, 
        calendarEvents: mergedEvents, 
        seasonalNotes: mergedNotes, 
        savedLocation: savedLocationRef.current, 
        deletedIds: mergedDeletedIds 
      }, snapshotTeamId), 30000);
      
      if (saveResult.success) {
          setLastSyncTime(new Date()); 
          if (unsavedChangesCounterRef.current === currentCounter) {
              setHasUnsavedChanges(false); 
          }
          if (saveResult.updatedAt) setServerTimestamp(saveResult.updatedAt);
          
          setApiaries(mergedApiaries);
          setCalendarEvents(mergedEvents);
          setSeasonalNotes(mergedNotes);
          logger.log("Sincronizzazione forzata completata con successo", "info");
      } else {
          throw new Error("Save failed on server");
      }
    } catch (e: any) {
      logger.log(`Force Sync Error: ${e.message}`, 'error');
      alert("Errore di sincronizzazione: controlla la connessione e riprova.");
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [user, currentUserId, withTimeout, setApiaries, setCalendarEvents, setSeasonalNotes]);

  // Monitoring online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.log("Dispositivo tornato online, sincronizzazione in coda...", "info");
      // Forza un tentativo di sync appena torna la connessione
      setTimeout(() => forceSync(), 2000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      logger.log("Dispositivo offline, sincronizzazione cloud sospesa.", "warn");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [forceSync]);

  // --- SYNC CORE ---
  const handleCloudSync = useCallback(async (userId: string, forcedTeamId?: string | null, isFromRealtime: boolean = false) => {
    if ((isSavingRef.current && !isFromRealtime) || isSyncingRef.current || isSwitchingRef.current) return;
    
    // Se l'utente è offline, non sincronizziamo
    if (!isOnline) {
      logger.log("Sync skipped: Device is offline", "info");
      return;
    }

    // Se l'utente è free, non sincronizziamo con il cloud
    if (user?.plan === 'free') {
      logger.log("Sync skipped: User is on free plan", "info");
      return;
    }

    setIsSyncing(true);
    isSyncingRef.current = true;
    try {
      const { data: cloudData, updatedAt } = await withTimeout(loadFromCloud(userId, forcedTeamId), 120000);
      if (forcedTeamId !== activeTeamIdRef.current) return;
      if (cloudData) {
        const mergedDeletedIds = Array.from(new Set([...deletedIdsRef.current, ...(cloudData.deletedIds || [])]));
        const mergedApiaries = smartMergeApiaries(apiariesRef.current, cloudData.apiaries || [], mergedDeletedIds);
        const mergedEvents = smartMergeEvents(eventsRef.current, cloudData.calendarEvents || [], mergedDeletedIds);
        const mergedNotes = smartMergeNotes(notesRef.current, cloudData.seasonalNotes || [], mergedDeletedIds);

        setApiaries(mergedApiaries);
        setCalendarEvents(mergedEvents);
        setSeasonalNotes(mergedNotes);
        setDeletedIds(mergedDeletedIds);
        
        if (cloudData.savedLocation) setSavedLocation(cloudData.savedLocation);
        if (updatedAt) setServerTimestamp(updatedAt);
        setLastSyncTime(new Date());
      }
    } catch (e: any) {
      logger.log(`Sync Error: ${e.message} | userId: ${userId} | teamId: ${forcedTeamId}`, 'error');
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [setApiaries, setCalendarEvents, setSeasonalNotes, setDeletedIds, setSavedLocation, withTimeout, user?.plan]);

  const switchScope = async (nextTeamId: string | null) => {
    if (nextTeamId === activeTeamId) return;
    setIsScopeMenuOpen(false);

    // Protezione contro perdita dati al cambio account/team
    if (hasUnsavedChanges) {
        const proceed = window.confirm("Hai modifiche non salvate in questo profilo. Se cambi ora, potresti perderle. Vuoi cambiare comunque?");
        if (!proceed) return;
    }

    isSwitchingRef.current = true;
    setIsSaving(false);
    isSavingRef.current = false;
    setHasUnsavedChanges(false);

    // Hard reset states e Ref
    setApiaries([]);
    setCalendarEvents([]);
    setSeasonalNotes([]);
    setDeletedIds([]);
    apiariesRef.current = [];
    eventsRef.current = [];
    notesRef.current = [];
    deletedIdsRef.current = [];
    
    setSelectedApiary(null);
    setSelectedHive(null);
    
    setCurrentTeamId(nextTeamId);
    setActiveTeamId(nextTeamId);
    activeTeamIdRef.current = nextTeamId;
    
    // Al cambio scope, resettiamo la cronologia per evitare confusione
    window.history.replaceState({ view: 'dashboard', apiaryId: null, hiveId: null }, '');

    setTimeout(() => {
      isSwitchingRef.current = false;
      if (currentUserId) handleCloudSync(currentUserId, nextTeamId);
    }, 500);
  };

  // --- BOOTSTRAP ---
  useEffect(() => {
    // Controllo URL per web (se non siamo in Capacitor)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      
      if (urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery') {
        isPasswordRecoveryFlow = true;
        // Puliamo l'URL per evitare che ricaricando la pagina si riapra il modale
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    let mounted = true;

    const safeFetch = async <T,>(promise: Promise<T>, fallback: T, timeoutMs = 5000): Promise<T> => {
      let timeoutId: any;
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      });
      try {
        // Se siamo offline, usiamo subito il fallback senza attendere il timeout della rete
        if (!navigator.onLine && timeoutMs > 1000) {
           return fallback;
        }
        const res = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn("Safe fetch timeout/error:", err);
        return fallback;
      }
    };

    const bootstrap = async () => {
      try {
        // Forza offline se la rete è assente per velocizzare l'avvio
        if (!navigator.onLine) {
           console.log("App avviata OFFLINE (rilevata da navigator.onLine)");
           setLoading(false);
           return;
        }

        // Aggiunto timeout per evitare che getSession blocchi l'app all'infinito
        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await safeFetch(sessionPromise, { data: { session: null } }, 5000);
        
        if (!mounted) return;
        if (session?.user) {
          // Prova a recuperare il nome dalla tabella public.users
          const userPromise = supabase
            .from('users')
            .select('full_name')
            .ilike('email', session.user.email)
            .maybeSingle();
          
          const planPromise = fetchUserPlan(session.user.id);
          const cachedPlanStr = localStorage.getItem(`beewise:plan:${session.user.id}`);
          const cachedPlan = (cachedPlanStr === 'premium' || cachedPlanStr === 'free') ? cachedPlanStr : null;
          
          // Fallback robusto: se siamo offline, usa la cache o mantieni il piano corrente se già presente
          const planFallback = (user?.plan as 'free' | 'premium' | null) || cachedPlan || 'free';

          const teamsPromise = fetchTeamsForUser(session.user.id);

          const [userResult, userPlanResult, teams] = await Promise.all([
            safeFetch(userPromise, { data: null, error: null }, 10000),
            safeFetch(planPromise, null, 10000), // Se safeFetch fallisce (timeout), restituisce null
            safeFetch(teamsPromise, [], 10000)
          ]);

          // Se userPlanResult è null (errore rete), usiamo il fallback persistente
          const userPlan = userPlanResult || planFallback;

          const userData = userResult?.data;

          let nameToUse = userData?.full_name || session.user.user_metadata.full_name;
          
          // Fix specifico per Fiammetta
          if (session.user.email?.toLowerCase() === 'fiammettarenzi@gmail.com') {
              nameToUse = 'Fiammetta';
          }
          // Fix specifico per Gianluca
          if (session.user.email?.toLowerCase() === 'silvestri.gianluca79@gmail.com') {
              nameToUse = 'Gianluca';
          }

          // Aggiorna la cache locale con il piano reale dal server
          if (userPlan) {
              localStorage.setItem(`beewise:plan:${session.user.id}`, userPlan);
          }

          setUser({
            name: nameToUse || session.user.email || 'Utente',
            email: session.user.email || '',
            picture: session.user.user_metadata.avatar_url || '',
            role: 'admin',
            plan: userPlan,
          });
          setCurrentUserId(session.user.id);
          
          // --- SESSION GUARD: Update DB with local session ID ---
          // updateDbSessionId(session.user.id); // Rimosso da qui perché viene già chiamato in onAuthStateChange
          
          setAvailableTeams(teams);
          
          // Logica standard per operatori o utenti singoli
          const storedTeam = getCurrentTeamId();
          
          // Verifica che il team salvato esista ancora tra quelli disponibili
          const isValidTeam = storedTeam === 'personal' || storedTeam === null || teams.some(t => t.team_id === storedTeam);
          const finalTeamId = (isValidTeam && storedTeam !== 'personal') ? storedTeam : null;
          
          if (!isValidTeam) {
              setCurrentTeamId('personal');
          }
          
          setActiveTeamId(finalTeamId);
          activeTeamIdRef.current = finalTeamId;
        } else {
          setUser(null);
          setCurrentUserId(null);
        }
      } catch (err) {
        console.warn("Bootstrap session check timed out or failed", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("DEBUG: Auth event =", event, "session =", session);
      
      // Eseguiamo la logica in modo asincrono per non bloccare il lock interno di Supabase
      setTimeout(async () => {
        try {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            
            // Controlla se c'è un recupero password in sospeso
            if (localStorage.getItem('beewise_recovery_pending') === 'true' || isPasswordRecoveryFlow) {
                localStorage.removeItem('beewise_recovery_pending');
                isPasswordRecoveryFlow = true; // Keep it true to prevent subsequent events from closing the modal
                setAuthModalMode('update_password');
                setIsAuthModalOpen(true);
            } else {
                // Chiudi il modale se l'utente si è loggato con successo (es. tramite link di conferma)
                setIsAuthModalOpen(false);
            }

            // Aggiungiamo un timeout per evitare che la query si blocchi all'infinito
            const userPromise = supabase
              .from('users')
              .select('full_name')
              .ilike('email', session.user.email)
              .maybeSingle();
            
            const planPromise = fetchUserPlan(session.user.id);
            const cachedPlanStr = localStorage.getItem(`beewise:plan:${session.user.id}`);
            const cachedPlan = (cachedPlanStr === 'premium' || cachedPlanStr === 'free') ? cachedPlanStr : null;
            
            // Fallback robusto
            const planFallback = (user?.plan as 'free' | 'premium' | null) || cachedPlan || 'free';

            const teamsPromise = fetchTeamsForUser(session.user.id);

            const [userResult, userPlanResult, teams] = await Promise.all([
              safeFetch(userPromise, { data: null, error: null }, 10000),
              safeFetch(planPromise, null, 10000),
              safeFetch(teamsPromise, [], 10000)
            ]);

            // Se userPlanResult è null, preserviamo quello che avevamo
            const userPlan = userPlanResult || planFallback;

            const userData = userResult?.data;

            let nameToUse = userData?.full_name || session.user.user_metadata.full_name;
            
            // Fix specifico per Fiammetta
            if (session.user.email?.toLowerCase() === 'fiammettarenzi@gmail.com') {
                nameToUse = 'Fiammetta';
            }
            // Fix specifico per Gianluca
            if (session.user.email?.toLowerCase() === 'silvestri.gianluca79@gmail.com') {
                nameToUse = 'Gianluca';
            }

            // Aggiorna la cache locale con il piano reale dal server
            if (userPlan) {
                localStorage.setItem(`beewise:plan:${session.user.id}`, userPlan);
            }

            setUser({ 
                name: nameToUse || session.user.email || 'Utente', 
                email: session.user.email || '', 
                picture: session.user.user_metadata.avatar_url || '',
                role: 'admin',
                plan: userPlan
            });
            setCurrentUserId(session.user.id);
            
            // --- SESSION GUARD: Update DB with local session ID ---
            // updateDbSessionId(session.user.id); // Rimosso da qui, gestito da un useEffect dedicato
            
            setAvailableTeams(teams);
            
            // Logica standard per operatori o utenti singoli
            const storedTeam = getCurrentTeamId();
            
            // Verifica che il team salvato esista ancora tra quelli disponibili
            const isValidTeam = storedTeam === null || teams.some(t => t.team_id === storedTeam);
            const finalTeamId = isValidTeam ? storedTeam : null;
            
            if (!isValidTeam) {
                setCurrentTeamId(null);
            }
            
            setActiveTeamId(finalTeamId);
            activeTeamIdRef.current = finalTeamId;
          }
          
          if (event === 'PASSWORD_RECOVERY') {
            isPasswordRecoveryFlow = true;
            setAuthModalMode('update_password');
            setIsAuthModalOpen(true);
          }
          
          if (event === 'SIGNED_OUT') {
            setUser(null); setCurrentUserId(null); setApiaries([]); setCalendarEvents([]); setSeasonalNotes([]); setDeletedIds([]); setAvailableTeams([]); setActiveTeamId(null); activeTeamIdRef.current = null;
            setIsDoubleLogin(false);
          }
        } catch (e) {
          console.error("Errore imprevisto in onAuthStateChange:", e);
        } finally {
          setLoading(false);
        }
      }, 0);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // --- AUTO-SYNC ON USER CHANGE (CRUCIALE PER PROFILO PERSONALE) ---
  useEffect(() => {
    if (currentUserId && isOnline) {
      // Inseriamo un piccolo ritardo di sicurezza (500ms) per essere certi che la sessione 
      // Supabase sia stata iniettata correttamente negli header delle richieste fetch.
      const timer = setTimeout(() => {
        handleCloudSync(currentUserId, activeTeamIdRef.current);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUserId, handleCloudSync, isOnline]);

  // --- REALTIME LISTENER FOR DATA SYNC ---
  useEffect(() => {
    if (!currentUserId || user?.plan === 'free') return;

    console.log(`[DataSync] Avvio ascolto Realtime per dati utente ${currentUserId}...`);

    let dataChannel = supabase.channel(`public:data_sync:${currentUserId}:${activeTeamId || 'personal'}`);

    dataChannel = dataChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_data',
        filter: `user_id=eq.${currentUserId}`,
      },
      (payload) => {
        console.log('[DataSync] 🔔 RICEVUTO EVENTO REALTIME DA SUPABASE (user_data):', payload);
        if (activeTeamIdRef.current === null) {
          // Se stiamo salvando noi, ignoriamo l'evento per evitare loop
          if (isSavingRef.current) {
              console.log('[DataSync] Ignoro evento perché sto salvando io');
              return;
          }
          
          // Aggiungiamo un piccolo ritardo per evitare conflitti
          setTimeout(() => {
            if (activeTeamIdRef.current === null) {
              console.log('[DataSync] Forzo merge dati dal cloud...');
              handleCloudSync(currentUserId, null, true);
            }
          }, 1000);
        }
      }
    );

    // Ascolta team_data se c'è un team attivo
    if (activeTeamId) {
      dataChannel = dataChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_data',
          filter: `team_id=eq.${activeTeamId}`,
        },
        (payload) => {
          console.log('[DataSync] 🔔 RICEVUTO EVENTO REALTIME DA SUPABASE (team_data):', payload);
          if (activeTeamIdRef.current === activeTeamId) {
            // Se stiamo salvando noi, ignoriamo l'evento per evitare loop
            if (isSavingRef.current) {
                console.log('[DataSync] Ignoro evento perché sto salvando io');
                return;
            }
            
            // Aggiungiamo un piccolo ritardo per evitare conflitti
            setTimeout(() => {
              if (activeTeamIdRef.current === activeTeamId) {
                console.log('[DataSync] Forzo merge dati dal cloud...');
                handleCloudSync(currentUserId, activeTeamId, true);
              }
            }, 1000);
          }
        }
      );
    }

    dataChannel.subscribe();

    return () => {
      console.log('[DataSync] Chiusura canali Realtime dati...');
      supabase.removeChannel(dataChannel);
    };
  }, [currentUserId, user?.plan, activeTeamId, handleCloudSync]);

  // --- AUTO-SAVE ---
  useEffect(() => {
    if (!user || !hasUnsavedChanges || isSwitchingRef.current || !isOnline) return;
    
    // Se l'utente è free, non facciamo l'auto-save sul cloud
    // Il flag hasUnsavedChanges resta true per avvisare dell'eventuale perdita dati al logout
    if (user.plan === 'free') {
      return;
    }

    let timer: any;
    let isMounted = true;
    
    const attemptSave = async () => {
      // Se stiamo già sincronizzando o salvando, riproviamo tra poco invece di uscire e basta
      if (isSyncingRef.current || isSavingRef.current || isSwitchingRef.current) {
          if (isMounted) timer = setTimeout(attemptSave, 2000);
          return; 
      }
      
      setIsSaving(true);
      isSavingRef.current = true;
      const snapshotTeamId = activeTeamIdRef.current;
      const currentCounter = unsavedChangesCounterRef.current;
      
      try {
        const userId = currentUserId || localStorage.getItem('beewise-user-id');
        if (!userId) { setIsSaving(false); isSavingRef.current = false; return; }
        
        let cloudData: any = null;
        try {
          // Timeout più breve per il merge in auto-save per non bloccare l'utente
          const cloudResult = await withTimeout(loadFromCloud(userId, snapshotTeamId), 10000);
          cloudData = cloudResult.data;
        } catch (e) {
          logger.log("Auto-save proceeds without cloud merge", "warn");
        }
        
        if (snapshotTeamId !== activeTeamIdRef.current) { setIsSaving(false); isSavingRef.current = false; return; }
        
        const mergedDeletedIds = Array.from(new Set([...deletedIdsRef.current, ...(cloudData?.deletedIds || [])]));
        const mergedApiaries = smartMergeApiaries(apiariesRef.current, cloudData?.apiaries || [], mergedDeletedIds);
        const mergedEvents = smartMergeEvents(eventsRef.current, cloudData?.calendarEvents || [], mergedDeletedIds);
        const mergedNotes = smartMergeNotes(notesRef.current, cloudData?.seasonalNotes || [], mergedDeletedIds);

        const saveResult = await withTimeout(saveToCloud(userId, { 
          apiaries: mergedApiaries, 
          calendarEvents: mergedEvents, 
          seasonalNotes: mergedNotes, 
          savedLocation: savedLocationRef.current, 
          deletedIds: mergedDeletedIds 
        }, snapshotTeamId), 30000);
        
        if (saveResult.success) {
            setLastSyncTime(new Date()); 
            if (unsavedChangesCounterRef.current === currentCounter) {
                setHasUnsavedChanges(false); 
            }
            if (saveResult.updatedAt) setServerTimestamp(saveResult.updatedAt);
            
            setApiaries(mergedApiaries);
            setCalendarEvents(mergedEvents);
            setSeasonalNotes(mergedNotes);
        } else {
            // Se fallisce (es. timeout), riprova tra poco
            if (isMounted) timer = setTimeout(attemptSave, 5000);
        }
      } catch (e: any) {
        logger.log(`Auto-Save Error: ${e.message}`, 'error');
        // Se fallisce, riprova tra poco
        if (isMounted) timer = setTimeout(attemptSave, 5000);
      } finally { 
        setIsSaving(false); 
        isSavingRef.current = false; 
      }
    };

    timer = setTimeout(attemptSave, 2000); // Ridotto a 2 secondi per maggiore reattività
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [user, hasUnsavedChanges, currentUserId, withTimeout, setApiaries, setCalendarEvents, setSeasonalNotes, setDeletedIds]);

  // --- HANDLERS ---
  const handleSelectApiary = (apiary: Apiary) => { 
    setSelectedApiary(apiary); 
    navigateTo('apiaryDetails', apiary.id); 
  };
  
  const handleSelectHive = (hive: Hive) => { 
    setSelectedHive(hive); 
    navigateTo('hiveDetails', selectedApiary?.id || null, hive.id); 
  };
  
  const handleLogout = async () => { 
    setIsLogoutModalOpen(false); 
    
    try {
        await withTimeout(supabase.auth.signOut(), 3000);
    } catch (e) {
        logger.log("Logout server timeout, forcing local cleanup", "warn");
    }
    
    // Pulisce solo le chiavi relative all'app, preservando le preferenze globali come il popup di benvenuto
    Object.keys(localStorage).forEach(key => {
        if ((key.startsWith('beewise') || key.startsWith('sb-')) && key !== 'beewise:has-seen-welcome-v2') {
            localStorage.removeItem(key);
        }
    });
    
    // Forza l'aggiornamento degli stati React per svuotare la UI immediatamente
    setUser(null);
    setCurrentUserId(null);
    setApiaries([]);
    setCalendarEvents([]);
    setSeasonalNotes([]);
    setTeamMembers([]);
    setHasUnsavedChanges(false); 
    navigateTo('dashboard'); 
  };

  const handleDirectHiveUpdate = useCallback((updatedHive: Hive) => {
    if (!selectedApiary) return;
    const nextApiaries = apiaries.map(a => 
      a.id !== selectedApiary.id 
        ? a 
        : { ...a, hives: a.hives.map(h => h.id === updatedHive.id ? updatedHive : h) }
    );
    setApiaries(nextApiaries);
    apiariesRef.current = nextApiaries; // Aggiornamento immediato Ref
    setSelectedHive(updatedHive);
    triggerSave();
  }, [selectedApiary, apiaries, setApiaries, triggerSave]);

  const handleAddHarvest = (apiaryId: string, harvest: Harvest) => {
    setApiaries(prev => prev.map(a => {
      if (a.id === apiaryId) {
        return { ...a, harvests: [...(a.harvests || []), harvest] };
      }
      return a;
    }));
    triggerSave();
  };

  const handleEditHarvest = (apiaryId: string, harvest: Harvest) => {
    setApiaries(prev => prev.map(a => {
      if (a.id === apiaryId) {
        return { ...a, harvests: (a.harvests || []).map(h => h.id === harvest.id ? harvest : h) };
      }
      return a;
    }));
    triggerSave();
  };

  const handleDeleteHarvest = (apiaryId: string, harvestId: string) => {
    setApiaries(prev => prev.map(a => {
      if (a.id === apiaryId) {
        return { ...a, harvests: (a.harvests || []).filter(h => h.id !== harvestId) };
      }
      return a;
    }));
    triggerSave();
  };

  const handleSaveApiary = (apiary: Omit<Apiary, 'id' | 'hives'>) => {
    const apiaryToSave: Apiary = apiaryToEdit ? { ...apiaryToEdit, ...apiary } : { ...apiary, id: crypto.randomUUID(), hives: [] };
    
    // Se stiamo "fixando" un apiario che era in attesa di sync, rimuoviamo il flag
    if (apiaryToFix && apiaryToSave.id === apiaryToFix.id) {
      apiaryToSave.pendingLocationSync = false;
      setApiaryToFix(null);
    }

    const nextApiaries = apiaries.find(a => a.id === apiaryToSave.id) 
        ? apiaries.map(a => a.id === apiaryToSave.id ? apiaryToSave : a) 
        : [...apiaries, apiaryToSave];
    setApiaries(nextApiaries);
    apiariesRef.current = nextApiaries;
    setIsApiaryModalOpen(false); setApiaryToEdit(null); triggerSave();
  };

  const handleSaveHive = (hive: Omit<Hive, 'id' | 'inspections'>) => {
    if (!selectedApiary) return;
    const hiveToSave: Hive = hiveToEdit ? { ...hiveToEdit, ...hive } : { ...hive, id: crypto.randomUUID(), inspections: [] };
    const nextApiaries = apiaries.map(a => a.id !== selectedApiary.id ? a : { ...a, hives: hiveToEdit ? a.hives.map(h => h.id === hiveToEdit.id ? hiveToSave : h) : [...a.hives, hiveToSave] });
    setApiaries(nextApiaries);
    apiariesRef.current = nextApiaries;
    setIsHiveModalOpen(false); setHiveToEdit(null); triggerSave();
  };

  const handleSaveInspection = (inspection: Inspection, bulkOptions?: { applyActions: boolean }) => {
    if (!selectedHive || !selectedApiary) return;
    const inspWithAudit = { ...inspection, createdBy: user?.name || user?.email };
    const nextApiaries = apiaries.map(a => {
        if (a.id !== selectedApiary.id) return a;
        return { ...a, hives: a.hives.map(h => {
                if (h.id === selectedHive.id) { const exists = h.inspections?.find(i => i.id === inspection.id); return { ...h, inspections: exists ? h.inspections.map(i => i.id === inspection.id ? inspWithAudit : i) : [...(h.inspections || []), inspWithAudit] }; }
                if (bulkOptions?.applyActions) return { ...h, inspections: [...(h.inspections || []), { ...inspWithAudit, id: crypto.randomUUID(), sawQueen: false, sawEggs: false, noBrood: false }] };
                return h;
            })
        };
    });
    setApiaries(nextApiaries);
    apiariesRef.current = nextApiaries;
    setIsInspectionModalOpen(false); setInspectionToEdit(null); triggerSave();
  };

  const handleSaveProduction = (record: ProductionRecord, target?: { apiaryId: string, hiveIds: string[], hiveQuantities?: Record<string, number> }) => {
    const apiaryId = target?.apiaryId || selectedApiary?.id;
    const hiveIds = target?.hiveIds || (selectedHive ? [selectedHive.id] : []);
    if (!apiaryId || hiveIds.length === 0) return;
    const recordWithAudit = { ...record, createdBy: user?.name || user?.email };
    const nextApiaries = apiaries.map(a => {
        if (a.id !== apiaryId) return a;
        return { ...a, hives: a.hives.map(h => {
                if (!hiveIds.includes(h.id)) return h;
                
                // Determina la quantità specifica per questa arnia se disponibile
                const specificQuantity = target?.hiveQuantities && target.hiveQuantities[h.id] !== undefined 
                    ? target.hiveQuantities[h.id] 
                    : record.melariQuantity;

                const hiveRecord = { ...recordWithAudit, melariQuantity: specificQuantity };
                
                let newRecords = h.productionRecords || [];
                if (productionToEdit && productionToEdit.id === record.id) newRecords = newRecords.map(r => r.id === record.id ? hiveRecord : r);
                else newRecords = [...newRecords, { ...hiveRecord, id: crypto.randomUUID() }];
                return { ...h, productionRecords: newRecords };
            })
        };
    });
    setApiaries(nextApiaries);
    apiariesRef.current = nextApiaries; // CRUCIALE: Aggiornamento immediato del ref
    setIsProductionModalOpen(false); setProductionToEdit(null); triggerSave();
  };

  const executeDelete = useCallback(async () => {
    if (!deleteConfirmation) return;
    const { type, id } = deleteConfirmation as any;
    
    // Per il Cestino (Soft Delete), non aggiungiamo subito a deletedIds
    // Lo faremo solo dopo 10 giorni tramite cleanup.
    // Se è un production-group o un caso particolare, gestiamo diversamente.
    
    let nextApiaries = [...apiaries];
    let nextEvents = [...calendarEvents];
    const now = Date.now();

    switch (type) {
      case 'apiary': 
        nextApiaries = apiaries.map(a => a.id === id ? { ...a, _deleted: true, _deletedAt: now } : a); 
        break;
      case 'hive': {
        const { apiaryId } = deleteConfirmation as any;
        nextApiaries = apiaries.map(a => {
          if (apiaryId && a.id !== apiaryId) return a;
          if (!a.hives) return a;
          return { ...a, hives: a.hives.map(h => h.id === id ? { ...h, _deleted: true, _deletedAt: now } : h) };
        });
        break;
      }
      case 'inspection': {
        const { apiaryId, hiveId } = deleteConfirmation as any;
        nextApiaries = apiaries.map(a => {
          if (apiaryId && a.id !== apiaryId) return a;
          return {
            ...a,
            hives: a.hives.map(h => {
              if (hiveId && h.id !== hiveId) return h;
              return {
                ...h,
                inspections: (h.inspections || []).map(i => i.id === id ? { ...i, _deleted: true, _deletedAt: now } : i)
              };
            })
          };
        });
        break;
      }
      case 'event': 
        nextEvents = calendarEvents.map(e => e.id === id ? { ...e, _deleted: true, _deletedAt: now } : e); 
        break;
      case 'production': {
        const { apiaryId, hiveId } = deleteConfirmation as any;
        nextApiaries = apiaries.map(a => {
          if (apiaryId && a.id !== apiaryId) return a;
          return {
            ...a,
            hives: a.hives.map(h => {
              if (hiveId && h.id !== hiveId) return h;
              return {
                ...h,
                productionRecords: (h.productionRecords || []).map(r => r.id === id ? { ...r, _deleted: true, _deletedAt: now } : r)
              };
            })
          };
        });
        break;
      }
      case 'production-group': {
        const { apiaryId, date } = deleteConfirmation as any;
        nextApiaries = apiaries.map(a => a.id !== apiaryId ? a : {
          ...a,
          hives: a.hives.map(h => ({
            ...h,
            productionRecords: (h.productionRecords || []).map(r => r.date === date ? { ...r, _deleted: true, _deletedAt: now } : r)
          }))
        });
        break;
      }
      case 'movement': {
        const { apiaryId, hiveId } = deleteConfirmation as any;
        nextApiaries = apiaries.map(a => {
          if (apiaryId && a.id !== apiaryId) return a;
          return {
            ...a,
            hives: a.hives.map(h => {
              if (hiveId && h.id !== hiveId) return h;
              return {
                ...h,
                movements: (h.movements || []).map(m => m.id === id ? { ...m, _deleted: true, _deletedAt: now } : m)
              };
            })
          };
        });
        break;
      }
    }
    
    setApiaries(nextApiaries);
    apiariesRef.current = nextApiaries;
    setCalendarEvents(nextEvents);
    eventsRef.current = nextEvents;
    
    triggerSave();
    setHasUnsavedChanges(true);
    setTimeout(() => forceSync(), 100);
    setDeleteConfirmation(null);
  }, [deleteConfirmation, apiaries, calendarEvents, forceSync]);

  const handleRestore = useCallback((id: string, type: string) => {
    let nextApiaries = [...apiaries];
    let nextEvents = [...calendarEvents];

    switch (type) {
      case 'apiary':
        nextApiaries = apiaries.map(a => a.id === id ? { ...a, _deleted: false, _deletedAt: undefined } : a);
        break;
      case 'hive':
        nextApiaries = apiaries.map(a => ({
          ...a,
          hives: (a.hives || []).map(h => h.id === id ? { ...h, _deleted: false, _deletedAt: undefined } : h)
        }));
        break;
      case 'inspection':
        nextApiaries = apiaries.map(a => ({
          ...a,
          hives: (a.hives || []).map(h => ({
            ...h,
            inspections: (h.inspections || []).map(i => i.id === id ? { ...i, _deleted: false, _deletedAt: undefined } : i)
          }))
        }));
        break;
      case 'event':
        nextEvents = calendarEvents.map(e => e.id === id ? { ...e, _deleted: false, _deletedAt: undefined } : e);
        break;
      case 'production':
        nextApiaries = apiaries.map(a => ({
          ...a,
          hives: (a.hives || []).map(h => ({
            ...h,
            productionRecords: (h.productionRecords || []).map(r => r.id === id ? { ...r, _deleted: false, _deletedAt: undefined } : r)
          }))
        }));
        break;
      case 'movement':
        nextApiaries = apiaries.map(a => ({
          ...a,
          hives: (a.hives || []).map(h => ({
            ...h,
            movements: (h.movements || []).map(m => m.id === id ? { ...m, _deleted: false, _deletedAt: undefined } : m)
          }))
        }));
        break;
    }

    setApiaries(nextApiaries);
    apiariesRef.current = nextApiaries;
    setCalendarEvents(nextEvents);
    eventsRef.current = nextEvents;
    
    setHasUnsavedChanges(true);
    setTimeout(() => forceSync(), 100);
  }, [apiaries, calendarEvents, forceSync]);

  const userRole = useMemo(() => activeTeamId ? availableTeams.find(t => t.team_id === activeTeamId)?.role?.toLowerCase() || 'operator' : 'admin', [activeTeamId, availableTeams]);
  const canDelete = userRole === 'admin' || userRole === 'owner';
  const canEdit = userRole === 'admin' || userRole === 'editor' || userRole === 'owner' || userRole === 'operator';

  useEffect(() => {
    const handleScroll = () => { setIsScrolling(true); if (scrollTimeout.current) clearTimeout(scrollTimeout.current); scrollTimeout.current = setTimeout(() => setIsScrolling(false), 300); };
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isDoubleLogin) {
    return (
      <>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 z-50 fixed inset-0">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-red-500/30 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Accesso Rilevato Altrove</h2>
            <p className="text-slate-300 mb-8">
              Il tuo account è stato appena utilizzato su un altro dispositivo o browser. 
              Per motivi di sicurezza e per evitare conflitti nei dati, questa sessione è stata messa in pausa.
            </p>
            <button 
              onClick={async () => {
                console.log('[SessionGuard] Reclaiming session...');
                setIsDoubleLogin(false);
                hasUpdatedSessionRef.current = false; // Permette di forzare un nuovo aggiornamento
                await updateDbSessionId(currentUserId!, user?.email, user?.name);
              }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg mb-4"
            >
              Usa qui e disconnetti l'altro
            </button>
            
            <button
              onClick={() => setIsMultiAccessModalOpen(true)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Sblocca l'accesso simultaneo
            </button>
          </div>
        </div>
        
        <MultiAccessModal 
          isOpen={isMultiAccessModalOpen} 
          onClose={() => setIsMultiAccessModalOpen(false)} 
          currentPlan={user?.plan || 'free'}
          onUpgrade={async (plan) => {
            if (user && currentUserId) {
              const success = await upgradeToPremium(currentUserId, plan);
              if (success) {
                setUser({ ...user, plan });
                localStorage.setItem(`beewise:plan:${user.id}`, plan);
                setIsMultiAccessModalOpen(false);
                setIsDoubleLogin(false); // Sblocca la sessione se fa l'upgrade
                // Se passa a un piano a pagamento, forza il sync
                setHasUnsavedChanges(true);
                setTimeout(() => {
                    forceSync(plan);
                }, 500);
              } else {
                console.error("Errore durante l'upgrade del piano nel database");
              }
            }
          }} 
        />
      </>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
      <Header 
        currentView={view} 
        loading={loading}
        isOnline={isOnline}
        setCurrentView={(v) => { if (!user && (v === 'calendar' || v === 'aiAssistant')) setIsAuthAlertOpen(true); else navigateTo(v); setSelectedApiary(null); setSelectedHive(null); }} 
        user={user} 
        onOpenAuth={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }} 
        onLogout={() => setIsLogoutModalOpen(true)} 
        isSyncing={isSyncing || isSaving} 
        hasUnsavedChanges={hasUnsavedChanges} 
        lastSyncTime={lastSyncTime} 
        onSync={forceSync}
        onOpenPremium={() => setIsPremiumModalOpen(true)}
        onFeedbackClick={() => setIsFeedbackModalOpen(true)}
      />
      
      <main ref={mainRef} className="container mx-auto px-4 py-6 pb-24 flex-grow overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full mt-20">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-500 font-medium text-center">Caricamento...</p>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 mt-20">
            <BeeIcon className="w-24 h-24 text-amber-500 mb-6 opacity-80 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Benvenuto in Diario Apistico</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Accedi per gestire i tuoi apiari, collaborare con il tuo team e sincronizzare i dati sul cloud in modo sicuro.
            </p>
            <button
              onClick={() => { setAuthModalMode('signin'); setIsAuthModalOpen(true); }}
              className="px-8 py-3 bg-amber-500 text-white font-bold rounded-full hover:bg-amber-600 transition-colors shadow-md text-lg mx-auto"
            >
              Accedi o Registrati
            </button>
          </div>
        ) : (
          <>
            {view === 'dashboard' && <DashboardView user={user} apiaries={activeApiaries} availableTeams={availableTeams} activeTeamId={activeTeamId} isScopeMenuOpen={isScopeMenuOpen} setIsScopeMenuOpen={setIsScopeMenuOpen} scopeMenuRef={scopeMenuRef} switchScope={switchScope} handleSelectApiary={handleSelectApiary} requestDeleteApiary={canDelete ? (id, name) => setDeleteConfirmation({ type: 'apiary', id, name }) : undefined} setApiaryToEdit={setApiaryToEdit} setIsApiaryModalOpen={setIsApiaryModalOpen} canAdd={canEdit} isScrolling={isScrolling} hasUnsavedChanges={hasUnsavedChanges} onSync={forceSync} />}
            
            {view === 'production' && <ProductionView apiaries={activeApiaries} onBack={() => navigateTo('tools')} onOpenResoconto={() => navigateTo('productionLog')} productionTab={productionTab} setProductionTab={setProductionTab} prodFilters={prodFilters} setProdFilters={setProdFilters} isProdFilterOpen={isProdFilterOpen} setIsProdFilterOpen={setIsProdFilterOpen} expandedProdGroups={expandedProdGroups} setExpandedProdGroups={setExpandedProdGroups} openProductionMenuId={openProductionMenuId} setOpenProductionMenuId={setOpenProductionMenuId} openProdGroupMenuId={openProdGroupMenuId} setOpenProdGroupMenuId={setOpenProdGroupMenuId} setIsProductionModalOpen={setIsProductionModalOpen} setProductionToEdit={setProductionToEdit} setDeleteConfirmation={setDeleteConfirmation} canAdd={canEdit} canEdit={canEdit} canDelete={canDelete} isScrolling={isScrolling} isProdFabMenuOpen={isProdFabMenuOpen} setIsProdFabMenuOpen={setIsProdFabMenuOpen} />}
            {view === 'productionLog' && <ProductionLogView apiaries={activeApiaries} onBack={() => navigateTo('production')} user={user} onOpenPremium={() => setIsMultiAccessModalOpen(true)} onAddHarvest={handleAddHarvest} onEditHarvest={handleEditHarvest} onDeleteHarvest={handleDeleteHarvest} canEdit={canEdit} canDelete={canDelete} />}
    
            {view === 'movements' && <MovementsView apiaries={activeApiaries} onBack={() => navigateTo('tools')} movementFilters={movementFilters} setMovementFilters={setMovementFilters} isMovementFilterOpen={isMovementFilterOpen} setIsMovementFilterOpen={setIsMovementFilterOpen} openMovementMenuId={openMovementMenuId} setOpenMovementMenuId={setOpenMovementMenuId} setIsTransferModalOpen={setIsTransferModalOpen} setIsMovementModalOpen={setIsMovementModalOpen} setMovementToEdit={setMovementToEdit} setDeleteConfirmation={setDeleteConfirmation} canAdd={canEdit} canEdit={canEdit} canDelete={canDelete} isScrolling={isScrolling} />}
    
            {view === 'treatmentsLog' && <TreatmentsLogView apiaries={activeApiaries} onBack={() => navigateTo('tools')} user={user} onOpenPremium={() => setIsMultiAccessModalOpen(true)} />}

            {view === 'tools' && (
              <div className="animate-fade-in p-4">
                <h2 className="text-2xl font-bold mb-6 text-center">Strumenti & Gestione</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'treatments', label: 'Registro Trattamenti', icon: <ClipboardIcon className="w-8 h-8 text-teal-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else navigateTo('treatmentsLog'); } },
                    { id: 'seasonal', label: 'Fioriture', icon: <StylizedFlowerIcon className="w-8 h-8 text-emerald-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else navigateTo('seasonalNotes'); } },
                    { id: 'production', label: 'Produzione', icon: <JarIcon className="w-8 h-8 text-amber-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else navigateTo('production'); } },
                    { id: 'movements', label: 'Nomadismo', icon: <TransferIcon className="w-8 h-8 text-blue-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else navigateTo('movements'); } },
                    ...(user?.email?.toLowerCase() === 'simonemilano86@gmail.com' ? [
                      { id: 'scale', label: 'Bilancia', icon: <ScaleIcon className="w-8 h-8 text-red-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else navigateTo('bilancia'); } },
                      { id: 'nfc', label: 'Configura NFC', icon: <NfcIcon className="w-8 h-8 text-indigo-600"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else navigateTo('nfc'); } },
                      { id: 'gift', label: 'Regala Premium', icon: <SparklesIcon className="w-8 h-8 text-amber-500"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else setIsPremiumGiftModalOpen(true); } },
                    ] : []),
                    { id: 'trash', label: 'Cestino', icon: <TrashIcon className="w-8 h-8 text-red-500"/>, action: () => { if (!user) setIsAuthAlertOpen(true); else navigateTo('trash'); } },
                  ].map(t => (
                    <div key={t.id} onClick={t.action} className="relative h-40 flex flex-col items-center justify-center p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]">
                      <div className="mb-3">{t.icon}</div><span className="font-semibold text-sm text-center">{t.label}</span>
                      {t.isPremium && user?.plan === 'free' && (
                        <div className="absolute top-2 right-2 p-1 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                          <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
    
            {view === 'apiaryDetails' && selectedApiary && <ApiaryDetails apiary={selectedApiary} onBack={() => { window.history.back(); }} onSelectHive={handleSelectHive} onAddHive={() => { setHiveToEdit(null); setIsHiveModalOpen(true); }} onDeleteApiary={canDelete ? () => setDeleteConfirmation({ type: 'apiary', id: selectedApiary.id, name: selectedApiary.name }) : undefined} onDeleteHive={(id) => setDeleteConfirmation({ type: 'hive', id, name: selectedApiary.hives.find(h=>h.id===id)?.name || 'Arnia', apiaryId: selectedApiary.id })} onEditApiary={() => { setApiaryToEdit(selectedApiary); setIsApiaryModalOpen(true); }} onEditHive={(hive) => { setHiveToEdit(hive); setIsHiveModalOpen(true); }} onTransferHives={() => setIsTransferModalOpen(true)} isScrolling={isScrolling} canDelete={canDelete} canEdit={canEdit} canAdd={canEdit} onOpenLog={() => navigateTo('apiaryLog', selectedApiary.id)} />}
            {view === 'apiaryLog' && selectedApiary && <ApiaryLogView apiary={selectedApiary} onBack={() => window.history.back()} />}
    
            {view === 'hiveDetails' && selectedHive && selectedApiary && <HiveDetails hive={selectedHive} onBack={() => { window.history.back(); }} onAddInspection={() => { setInspectionToEdit(null); setIsInspectionModalOpen(true); }} onAddProduction={() => { setProductionToEdit(null); setIsProductionModalOpen(true); }} onEditHive={(h) => { setHiveToEdit(h); setIsHiveModalOpen(true); }} onUpdateHive={handleDirectHiveUpdate} onDeleteHive={(id) => setDeleteConfirmation({ type: 'hive', id, name: selectedHive.name, apiaryId: selectedApiary.id })} onDeleteInspection={(id) => { if (canDelete) setDeleteConfirmation({ type: 'inspection', id, apiaryId: selectedApiary.id, hiveId: selectedHive.id }); }} onEditInspection={(i) => { setInspectionToEdit(i); setIsInspectionModalOpen(true); }} onDeleteMovement={(id) => { if (canDelete) setDeleteConfirmation({ type: 'movement', id, apiaryId: selectedApiary.id, hiveId: selectedHive.id }); }} onEditMovement={(m) => { setMovementToEdit(m); setIsMovementModalOpen(true); }} onDeleteProduction={(id) => { if (canDelete) setDeleteConfirmation({ type: 'production', id, apiaryId: selectedApiary.id, hiveId: selectedHive.id }); }} onEditProduction={(r) => { setProductionToEdit(r); setIsProductionModalOpen(true); }} onOpenCalendar={() => { if (user?.plan === 'free') { setIsPremiumModalOpen(true); } else { navigateTo('calendar'); } }} isScrolling={isScrolling} canDelete={canDelete} canEdit={canEdit} canAdd={canEdit} hasTeamMembers={teamMembers.length > 1} currentUserEmail={user?.email} currentUserName={user?.name} />}
    
            {view === 'calendar' && <CalendarView apiaries={activeApiaries} events={activeEvents} onAddEvent={(e) => { const ev = {...e, createdBy: user?.email}; setCalendarEvents(prev => [...prev, ev]); triggerSave(); }} onDeleteEvent={(id) => setDeleteConfirmation({ type: 'event', id })} onEditEvent={(e) => { setCalendarEventToEdit(e); setIsCalendarModalOpen(true); }} onBack={() => window.history.back()} onOpenModal={() => { if (user?.plan === 'free') { setIsMultiAccessModalOpen(true); } else { setCalendarEventToEdit(null); setIsCalendarModalOpen(true); } }} isScrolling={isScrolling} canDelete={canDelete} />}
            {view === 'aiAssistant' && <AiAssistant user={user} messages={aiMessages} setMessages={setAiMessages} />}
            {view === 'seasonalNotes' && <ToolsView apiaries={activeApiaries} onBack={() => window.history.back()} notes={activeNotes} onSaveNote={(n) => { setSeasonalNotes(prev => { const ex = prev.find(x=>x.id===n.id); return ex ? prev.map(x=>x.id===n.id?n:x) : [...prev, n]; }); triggerSave(); }} isBloomModalOpen={isBloomModalOpen} setIsBloomModalOpen={setIsBloomModalOpen} isScrolling={isScrolling} />}
            {view === 'bilancia' && <ScaleDashboard apiaries={activeApiaries} onBack={() => window.history.back()} />}
            {view === 'nfc' && <NfcView apiaries={activeApiaries} onBack={() => window.history.back()} onOpenConfig={() => setIsNfcModalOpen(true)} onRemoveTag={(hid) => { setApiaries(prev => prev.map(a => ({ ...a, hives: a.hives.map(h => h.id === hid ? { ...h, nfcTagId: undefined } : h) }))); triggerSave(); }} isScrolling={isScrolling} onTagScanned={(id) => { const a = apiaries.find(ap => ap.hives.some(h => h.nfcTagId?.toUpperCase() === id.toUpperCase())); if (a) { const h = a.hives.find(hv => hv.nfcTagId?.toUpperCase() === id.toUpperCase())!; setSelectedApiary(a); setSelectedHive(h); navigateTo('hiveDetails', a.id, h.id); } else alert('Tag non associato.'); }} />}
            {view === 'teamManagement' && <TeamManagement onBack={() => window.history.back()} user={user} teamMembers={teamMembers} onUpdateMembers={setTeamMembers} onOpenPremium={() => setIsPremiumModalOpen(true)} onOpenMultiAccess={() => setIsMultiAccessModalOpen(true)} />}
            {view === 'trash' && <TrashView apiaries={apiaries} events={calendarEvents} onRestore={handleRestore} onBack={() => window.history.back()} />}
          </>
        )}
      </main>

      <BottomNavigation currentView={view} setCurrentView={(v) => { if (!user && (v === 'calendar' || v === 'aiAssistant' || v === 'tools')) setIsAuthAlertOpen(true); else navigateTo(v); setSelectedApiary(null); setSelectedHive(null); }} />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          setIsAuthModalOpen(false);
          resetPasswordRecoveryFlow();
        }} 
        defaultMode={authModalMode}
      />
      <PremiumModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} userId={currentUserId} onUpgradeSuccess={() => { 
          if (user) {
              setUser({ ...user, plan: 'premium' });
              // Forza il salvataggio in cloud di tutti i dati locali appena l'utente diventa premium
              setHasUnsavedChanges(true);
              setTimeout(() => {
                  forceSync('premium');
              }, 500);
          } 
      }} />
      <PremiumGiftModal isOpen={isPremiumGiftModalOpen} onClose={() => setIsPremiumGiftModalOpen(false)} />
      <MultiAccessModal 
        isOpen={isMultiAccessModalOpen} 
        onClose={() => setIsMultiAccessModalOpen(false)} 
        currentPlan={user?.plan || 'free'}
        onUpgrade={async (plan) => {
          if (user && currentUserId) {
            // Seleziona il piano corretto nel database (per ora usiamo upgradeToPremium per semplicità, 
            // ma in futuro si potrebbe differenziare per team/enterprise)
            const success = await upgradeToPremium(currentUserId, plan);
            if (success) {
              setUser({ ...user, plan });
              localStorage.setItem(`beewise:plan:${user.id}`, plan);
              setIsMultiAccessModalOpen(false);
              setIsDoubleLogin(false); // Sblocca la sessione se fa l'upgrade
              // Se passa a un piano a pagamento, forza il sync
              setHasUnsavedChanges(true);
              setTimeout(() => {
                  forceSync(plan);
              }, 500);
            } else {
              console.error("Errore durante l'upgrade del piano nel database");
            }
          }
        }} 
      />
      <Modal isOpen={isAuthAlertOpen} onClose={() => setIsAuthAlertOpen(false)} title="Accesso Richiesto"><div className="space-y-4 text-center p-4"><p className="text-slate-600 dark:text-slate-300">Devi accedere per sincronizzare i dati.</p><button onClick={() => { setIsAuthAlertOpen(false); setAuthModalMode('signin'); setIsAuthModalOpen(true); }} className="px-6 py-2 bg-amber-500 text-white font-bold rounded-full hover:bg-amber-600">Accedi</button></div></Modal>
      <ApiaryModal 
        isOpen={isApiaryModalOpen} 
        onClose={() => {
          setIsApiaryModalOpen(false);
          setApiaryToEdit(null);
          setApiaryToFix(null);
        }} 
        onSave={handleSaveApiary} 
        apiaryToEdit={apiaryToEdit} 
        existingApiaries={activeApiaries} 
        isOnline={isOnline}
      />
      <HiveModal isOpen={isHiveModalOpen} onClose={() => setIsHiveModalOpen(false)} onSave={handleSaveHive} hiveToEdit={hiveToEdit} existingHives={selectedApiary?.hives || []} />
      <InspectionModal isOpen={isInspectionModalOpen} onClose={() => setIsInspectionModalOpen(false)} onSave={handleSaveInspection} inspectionToEdit={inspectionToEdit} />
      <TransferModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setIsTransferModalOpen(false)} 
        allApiaries={activeApiaries} 
        onTransfer={(targetApiaryId, hiveIds, date, time, notes) => {
          // Usiamo setApiaries con il callback di stato per garantire l'atomicità
          setApiaries(prevApiaries => {
            // 1. Deep clone per sicurezza totale e per rompere qualsiasi riferimento residuo
            const nextApiaries = JSON.parse(JSON.stringify(prevApiaries));
            
            // 2. Trova l'apiario di destinazione nel nuovo array
            const targetApiary = nextApiaries.find((a: any) => a.id === targetApiaryId);
            if (!targetApiary) {
              logger.log(`Errore Nomadismo: Apiario target¹ ${targetApiaryId} non trovato`, 'error');
              return prevApiaries;
            }

            // 3. Sposta ogni arnia una alla volta
            hiveIds.forEach((hid: string) => {
              let movedHive: Hive | null = null;
              let sourceApiaryName = "Ignoto";

              // Cerchiamo l'arnia in TUTTI gli apiari per rimuoverla da dovunque si trovi
              // (Questo risolve anche eventuali duplicati pre-esistenti rimuovendoli tutti)
              for (const apiary of nextApiaries) {
                const hiveIndex = apiary.hives.findIndex((h: any) => h.id === hid);
                if (hiveIndex !== -1) {
                  // Se l'arnia è già nel target, non facciamo nulla (o potremmo volerla aggiornare, ma lo skip è più sicuro)
                  if (apiary.id === targetApiaryId) {
                    continue; 
                  }
                  
                  // Estraiamo l'arnia (Rimozione fisica)
                  const [removed] = apiary.hives.splice(hiveIndex, 1);
                  movedHive = removed;
                  sourceApiaryName = apiary.name;
                  // Continuiamo il loop per rimuovere eventuali altri duplicati della stessa arnia
                }
              }

              // 4. Se abbiamo trovato e rimosso l'arnia, la aggiungiamo al target
              if (movedHive) {
                const movement: HiveMovement = {
                  id: crypto.randomUUID(),
                  date,
                  time,
                  notes,
                  fromApiaryName: sourceApiaryName,
                  toApiaryName: targetApiary.name,
                  createdBy: user?.email || 'utente'
                };

                // Aggiorniamo l'oggetto arnia
                movedHive.movements = [...(movedHive.movements || []), movement];
                
                // Inserimento fisico nel target
                targetApiary.hives.push(movedHive);
                
                logger.log(`[Nomadismo Successo] Arnia ${movedHive.name} spostata da ${sourceApiaryName} a ${targetApiary.name}`);
              }
            });

            // Aggiorniamo il ref per la sincronizzazione immediata
            apiariesRef.current = nextApiaries;
            
            // Se eravamo nell'apiario di partenza, lo stato selezionato si aggiornerà via useEffect
            return nextApiaries;
          });

          setIsTransferModalOpen(false);
          // Forza il salvataggio immediato sul cloud
          setHasUnsavedChanges(true);
          setTimeout(() => forceSync(), 100); 
        }} 
        sourceApiary={selectedApiary || undefined} 
      />
      <MovementModal isOpen={isMovementModalOpen} onClose={() => setIsMovementModalOpen(false)} onSave={(m) => { const next = apiaries.map(a => ({...a, hives: a.hives.map(h => ({...h, movements: h.movements?.map(mv => mv.id === m.id ? m : mv)}))})); setApiaries(next); apiariesRef.current = next; setIsMovementModalOpen(false); setMovementToEdit(null); triggerSave(); }} movementToEdit={movementToEdit} apiaries={activeApiaries} />
      <ProductionModal isOpen={isProductionModalOpen} onClose={() => setIsProductionModalOpen(false)} onSave={handleSaveProduction} recordToEdit={productionToEdit} selectedType={productionTab === 'all' ? 'honey' : productionTab} apiaries={activeApiaries} initialApiaryId={selectedApiary?.id} initialHiveId={selectedHive?.id} />
      <CalendarEventModal isOpen={isCalendarModalOpen || !!calendarEventToEdit} onClose={() => { setIsCalendarModalOpen(false); setCalendarEventToEdit(null); }} onSave={(e) => { const next = calendarEvents.find(x=>x.id===e.id) ? calendarEvents.map(x=>x.id===e.id?e:x) : [...calendarEvents, e]; setCalendarEvents(next); eventsRef.current = next; triggerSave(); }} apiaries={activeApiaries} eventToEdit={calendarEventToEdit} initialApiaryId={selectedApiary?.id} initialHiveId={selectedHive?.id} />
      <NfcModal isOpen={isNfcModalOpen} onClose={() => setIsNfcModalOpen(false)} apiaries={activeApiaries} onSave={(hid, tag) => { const next = apiaries.map(a => ({...a, hives: a.hives.map(h => h.id === hid ? {...h, nfcTagId: tag} : h)})); setApiaries(next); apiariesRef.current = next; triggerSave(); }} />
      <Modal isOpen={isScaleModalOpen} onClose={() => setIsScaleModalOpen(false)} title="Bilancia"><div className="p-10 text-center"><ScaleIcon className="w-16 h-16 mx-auto mb-4 text-slate-300"/><h3 className="text-lg font-bold">Bilancia Smart</h3><p className="text-sm text-slate-500 mt-2">Funzionalità in arrivo!</p></div></Modal>
      
      {/* Modale Logout con protezione dati non sincronizzati */}
      <Modal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        title={(hasUnsavedChanges || !isOnline || (user?.plan === 'free' && isOnline)) ? "⚠️ Attenzione: Rischio Dati" : "Conferma Logout"}
      >
        <div className="space-y-4">
            {(hasUnsavedChanges || !isOnline || user?.plan === 'free') ? (
                <div className="flex flex-col items-center text-center py-2">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full mb-3">
                        <WarningIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                    
                    <h3 className="font-bold text-red-600 dark:text-red-400 text-lg uppercase tracking-tight">
                        {user?.plan === 'free' && isOnline
                          ? "Piano Free: Solo Locale" 
                          : (!isOnline ? "Modalità Offline" : "Sincronizzazione in corso")}
                    </h3>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl my-4 text-left border border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            {user?.plan === 'free' && isOnline ? (
                                "Con il piano Free i tuoi dati restano solo su questo telefono. Se fai il log out, l'app pulisce la memoria locale per la tua privacy e perderai tutto quello che hai inserito."
                            ) : !isOnline ? (
                                "Attenzione: Sei offline. Le tue ultime modifiche sono salvate sul telefono ma non sincronizzate. Se esci ora, i dati non ancora salvati nel cloud andranno PERSI definitivamente."
                            ) : (
                                "Sincronizzazione in corso... Stiamo salvando le tue ultime modifiche nel cloud. Esci solo quando la nuvola in alto diventa verde per non perdere nulla."
                            )}
                        </p>
                    </div>

                    {!isOnline && user?.plan !== 'free' && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/30">
                            <CloudIcon className="w-5 h-5 text-amber-500" />
                            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium tracking-tight">
                                Torna online per mettere al sicuro i dati nel cloud.
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-slate-700 dark:text-slate-300 text-center">Sei sicuro di voler uscire dal tuo account?</p>
            )}

            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button 
                    onClick={() => setIsLogoutModalOpen(false)} 
                    className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                    {(hasUnsavedChanges || !isOnline || user?.plan === 'free') ? "Resta nell'app (Consigliato)" : "Annulla"}
                </button>
                <button 
                    onClick={handleLogout} 
                    className={`w-full py-3 rounded-xl font-bold transition ${(hasUnsavedChanges || !isOnline || user?.plan === 'free') ? 'text-red-600 dark:text-red-400 text-xs opacity-60 hover:opacity-100 border border-red-200 dark:border-red-800' : 'bg-red-600 text-white hover:bg-red-700 shadow-md'}`}
                >
                    {(hasUnsavedChanges || !isOnline || user?.plan === 'free') ? "Esci (CANCELLA DATI LOCALI)" : "Sì, Logout"}
                </button>
            </div>
        </div>
      </Modal>

      {deleteConfirmation && (<Modal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} title="Elimina"><div className="space-y-4"><p>Eliminare {(deleteConfirmation as any).name || 'questo elemento'}?</p><div className="flex justify-end gap-3"><button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600">Annulla</button><button onClick={executeDelete} className="px-4 py-2 bg-red-600 text-white rounded">Elimina</button></div></div></Modal>)}
      
      {console.log("DEBUG RENDER: hasSeenWelcome=", hasSeenWelcome, "loading=", loading, "user=", !!user)}
      {isOnline && pendingSyncApiaries.length > 0 && !isApiaryModalOpen && showSyncModal && (
        <Modal 
          isOpen={true} 
          onClose={() => setShowSyncModal(false)} 
          title="Sincronizzazione Posizione Richiesta"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg flex items-center gap-3">
              <WarningIcon className="w-6 h-6 flex-shrink-0" />
              <p>Hai registrato degli apiari mentre eri offline. Per procedere, devi confermare la loro posizione esatta su Google Maps ora che sei tornato online.</p>
            </div>
            
            <div className="space-y-2">
              {pendingSyncApiaries.map(apiary => (
                <div key={apiary.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <div className="flex-grow pr-3">
                    <p className="font-bold text-sm truncate">{apiary.name}</p>
                    <p className="text-xs text-slate-500 italic truncate">{apiary.location}</p>
                  </div>
                  <button
                    onClick={() => {
                      setApiaryToFix(apiary);
                      setApiaryToEdit(apiary);
                      setIsApiaryModalOpen(true);
                      // Non chiudiamo showSyncModal qui così se ne ha più di uno torna visibile
                    }}
                    className="flex-shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-md hover:bg-amber-600 transition"
                  >
                    Correggi Ora
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <button 
                onClick={() => setShowSyncModal(false)}
                className="text-slate-500 text-sm hover:underline"
              >
                Sincronizza più tardi
              </button>
            </div>
          </div>
        </Modal>
      )}

      {!hasSeenWelcome && !loading && !!user && (
        <WelcomeModal 
          isOpen={true} 
          onClose={() => setHasSeenWelcome(true)} 
        />
      )}

      <FeedbackModal 
        isOpen={isFeedbackModalOpen} 
        onClose={() => setIsFeedbackModalOpen(false)} 
        user={user} 
      />
    </div>
  );
};

import { SupabaseAuthProvider } from './src/context/SupabaseAuthContext';

const AppWithProvider: React.FC = () => {
  return (
    <SupabaseAuthProvider>
      <App />
    </SupabaseAuthProvider>
  );
};

export default AppWithProvider;