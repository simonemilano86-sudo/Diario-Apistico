
import React, { useState, useEffect, useMemo } from 'react';
import { 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    AreaChart, 
    Area,
    BarChart,
    Bar,
    Cell,
    ComposedChart,
    Line
} from 'recharts';
import { Apiary, ScaleDataPoint, ScaleCommand, Scale } from '../../types';
import { fetchScaleData, saveScaleCommand, fetchUserScales, registerScale } from '../../services/db';
import { supabase } from '../../services/supabase';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import Modal from '../../components/Modal';
import { 
    BackArrowIcon, 
    ScaleIcon, 
    BatteryIcon, 
    RefreshIcon, 
    CalendarIcon,
    WarningIcon,
    HistoryIcon,
    PlusIcon,
    HomeIcon,
    JarIcon,
    SettingsIcon,
    SearchIcon
} from '../../components/Icons';
import { motion, AnimatePresence } from 'motion/react';

interface ScaleDashboardProps {
    apiaries: Apiary[];
    onBack: () => void;
}

const ARDUINO_CODE = `/* 
 * BEEWISE - FIRMWARE BILANCIA (Lilygo T-A7670E)
 * APN Wind Tre: internet.it
 * ID Bilancia: Bil_001
 * Taratura Target: 23447.0
 */
#define TINY_GSM_MODEM_A7670
#include <TinyGsmClient.h>
#include "HX711.h"

// ID della bilancia da impostare nel firmware
const char scaleId[] = "Bil_001"; 
const char apn[] = "internet.it";

// ... vedi codice arduino completo ricevuto in chat ...
`;

const ScaleDashboard: React.FC<ScaleDashboardProps> = ({ apiaries, onBack }) => {
    const { user } = useSupabaseAuth();
    const [scales, setScales] = useState<Scale[]>([]);
    const [selectedScaleId, setSelectedScaleId] = useState<string>('');
    const [scaleData, setScaleData] = useState<ScaleDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [commandStatus, setCommandStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [dateRange, setDateRange] = useState<'day1' | 'day3' | 'week' | 'month' | 'all'>('day1');
    const [chartType, setChartType] = useState<'mixed' | 'line' | 'area'>('line');
    const [showCode, setShowCode] = useState(false);
    const [hiveTare, setHiveTare] = useState<number>(35); // Tara media arnia completa
    const [isSimulating, setIsSimulating] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [selectedMonthYear, setSelectedMonthYear] = useState<string>('ALL');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMonthSelectModalOpen, setIsMonthSelectModalOpen] = useState(false);
    
    // UI per registrazione
    const [isRegistering, setIsRegistering] = useState(false);
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [newScaleForm, setNewScaleForm] = useState<{
        id: string; 
        name: string; 
        secret: string; 
        apn: string;
        schedule: Scale['schedule']
    }>({ 
        id: '', 
        name: '', 
        secret: 'beewise_2024', 
        apn: 'internet.it',
        schedule: { 
            rules: [
                { 
                    months: [1,2,3,4,5,6,7,8,9,10,11,12], 
                    days: Array.from({length: 31}, (_, i) => i + 1), 
                    times: ['08:00', '20:00'] 
                }
            ]
        }
    });

    const [tempTime, setTempTime] = useState<string>('12:00');
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);

    const currentScale = useMemo(() => scales.find(s => s.scaleId === selectedScaleId), [scales, selectedScaleId]);

    // Carica le bilance dell'utente
    useEffect(() => {
        if (user) {
            loadUserScales();
        }
    }, [user]);

    const loadUserScales = async () => {
        if (!user) return;
        const userScales = await fetchUserScales(user.id);
        console.log('>>> [DEBUG] Bilance trovate per utente:', userScales);
        setScales(userScales);
        
        // Se non c'è una bilancia selezionata, prova a selezionare la prima
        if (userScales.length > 0 && !selectedScaleId) {
            setSelectedScaleId(userScales[0].scaleId);
        }
    };

    const handleRegister = async () => {
        if (!user || !newScaleForm.id) return;
        setIsLoading(true);
        const targetId = newScaleForm.id;
        console.log('>>> [REGISTRAZIONE] Tentativo per:', targetId);
        
        try {
            const success = await registerScale({
                scaleId: targetId,
                name: newScaleForm.name || targetId,
                userId: user.id,
                secretKey: newScaleForm.secret,
                apn: newScaleForm.apn,
                createdAt: new Date().toISOString()
            });
            
            if (success) {
                console.log('>>> [REGISTRAZIONE] Successo!');
                setIsRegistering(false);
                setNewScaleForm({ id: '', name: '', secret: 'beewise_2024', apn: 'internet.it' });
                await loadUserScales();
                setSelectedScaleId(targetId);
            } else {
                console.error('>>> [REGISTRAZIONE] Fallito');
                alert("Non è stato possibile registrare la bilancia. L'ID potrebbe essere già registrato da un altro utente.");
            }
        } catch (e) {
            console.error('>>> [REGISTRAZIONE] Errore:', e);
            alert("Errore durante la registrazione. Riprova tra poco.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetScale = async () => {
        if (!selectedScaleId || !currentScale) return;
        setIsResetting(true);
        setResetError(null);
        setResetSuccess(false);
        
        try {
            const success = await saveScaleCommand({
                scaleId: "Bil_001", 
                apiaryId: currentScale.apiaryId || 'unlinked',
                command: 'RESET'
            });
            
            if (success) {
                setResetSuccess(true);
                setTimeout(() => {
                    setIsResetConfirmOpen(false);
                    setResetSuccess(false);
                }, 3000);
            } else {
                setResetError("Errore nell'invio del comando. Riprova.");
            }
        } catch (e) {
            console.error('Reset failed', e);
            setResetError("Errore di connessione a Supabase.");
        } finally {
            setIsResetting(false);
        }
    };

    const handleUpdateSettings = async () => {
        if (!user || !currentScale) return;
        setIsLoading(true);
        console.log('>>> [SETTINGS] Aggiornamento per:', currentScale.scaleId);
        
        try {
            const success = await registerScale({
                ...currentScale,
                name: newScaleForm.name || currentScale.name,
                apn: newScaleForm.apn || currentScale.apn,
                schedule: newScaleForm.schedule,
                scaleId: currentScale.scaleId // upsert on scaleId
            });
            
            if (success) {
                console.log('>>> [SETTINGS] Aggiornamento completato');
                // Invia comando di aggiornamento schedule alla bilancia
                await saveScaleCommand({
                    scaleId: currentScale.scaleId,
                    command: 'firmware_update', // Possiamo usare un comando specifico o includerlo nel prossimo check-in
                });
                setIsEditingSettings(false);
                await loadUserScales();
            } else {
                alert("Errore nel salvataggio delle impostazioni.");
            }
        } catch (e) {
            console.error('>>> [SETTINGS] Errore:', e);
            alert("Si è verificato un errore durante il salvataggio.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedScaleId) {
            console.log('>>> [DEBUG] Avvio caricamento dati per:', selectedScaleId);
            loadData();
            
            // --- REAL-TIME SUBSCRIPTION ---
            console.log('>>> [REALTIME] Sottoscrizione al canale per:', selectedScaleId);
            const channel = supabase
                .channel(`realtime_scale_data_${selectedScaleId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'scale_data',
                        filter: `scaleId=eq.${selectedScaleId}`
                    },
                    (payload) => {
                        console.log('>>> [REALTIME] Nuova lettura ricevuta:', payload.new);
                        setScaleData(prev => {
                            if (prev.some(p => p.id === payload.new.id)) return prev;
                            return [payload.new as ScaleDataPoint, ...prev];
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [selectedScaleId]);


    const simulateData = async () => {
        if (!selectedScaleId) return;
        setIsSimulating(true);
        
        try {
            const lastWeight = scaleData[0]?.weight || (hiveTare + 10);
            const variation = (Math.random() - 0.3) * 2; // Tendenza al guadagno
            const newPoint = {
                scaleId: selectedScaleId,
                apiaryId: scales.find(s => s.scaleId === selectedScaleId)?.apiaryId || 'unlinked',
                weight: Number((lastWeight + variation).toFixed(2)),
                battery: Math.max(0, Math.min(100, (scaleData[0]?.battery || 95) - (Math.random() * 2))),
                timestamp: new Date().toISOString()
            };

            const { error } = await supabase.from('scale_data').insert([newPoint]);
            
            if (error) throw error;
            
            await loadData();
        } catch (e) {
            console.error('Simulation failed', e);
        } finally {
            setIsSimulating(false);
        }
    };

    const loadData = async () => {
        if (!selectedScaleId) return;
        setIsLoading(true);
        console.log('>>> [DEBUG] Chiamata fetchScaleData per:', selectedScaleId);
        const data = await fetchScaleData(selectedScaleId);
        console.log('>>> [DEBUG] Dati ricevuti da Supabase:', data);
        setScaleData(data);
        setIsLoading(false);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    };

    const handleRequestWeight = async () => {
        if (!selectedScaleId) return;
        setCommandStatus('pending');
        const success = await saveScaleCommand({
            scaleId: selectedScaleId,
            command: 'get_weight'
        });
        
        if (success) {
            setCommandStatus('success');
            setTimeout(() => setCommandStatus('idle'), 3000);
        } else {
            setCommandStatus('error');
            setTimeout(() => setCommandStatus('idle'), 3000);
        }
    };

    const filteredData = useMemo(() => {
        const sorted = [...scaleData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (dateRange === 'all') return sorted;
        
        const now = new Date();
        const limit = new Date();
        if (dateRange === 'day1') limit.setDate(now.getDate() - 1);
        if (dateRange === 'day3') limit.setDate(now.getDate() - 3);
        if (dateRange === 'week') limit.setDate(now.getDate() - 7);
        if (dateRange === 'month') limit.setMonth(now.getMonth() - 1);
        
        return sorted.filter(d => new Date(d.timestamp) >= limit);
    }, [scaleData, dateRange]);

    const latestPoint = scaleData[0];
    const previousPoint = scaleData[1];
    
    const weightChange = latestPoint && previousPoint 
        ? (latestPoint.weight - previousPoint.weight).toFixed(2)
        : '0.00';

    const honeyEstimate = latestPoint ? Math.max(0, latestPoint.weight - hiveTare).toFixed(1) : '0.0';

    // Proposta: Analisi trend per alert e batteria
    const batteryForecast = useMemo(() => {
        if (scaleData.length < 5) return null;
        const recent = scaleData.slice(0, 5);
        const drop = recent[recent.length - 1].battery - recent[0].battery;
        if (drop >= 0) return 'Stabile';
        const days = 5;
        const dailyDrop = Math.abs(drop) / days;
        const remainingDays = Math.floor(latestPoint.battery / dailyDrop);
        return `~${remainingDays} gg`;
    }, [scaleData, latestPoint]);

    const weightAlert = useMemo(() => {
        if (!latestPoint || !previousPoint) return null;
        const diff = latestPoint.weight - previousPoint.weight;
        if (diff < -1.5) return { type: 'sciamatura', msg: 'Calo peso sospetto (>1.5kg)' };
        if (diff > 5) return { type: 'raccolto', msg: 'Forte importazione rilevata!' };
        return null;
    }, [latestPoint, previousPoint]);

    const chartData = useMemo(() => {
        return filteredData.map((d, i) => {
            const prev = i > 0 ? filteredData[i - 1] : null;
            const gain = prev ? d.weight - prev.weight : 0;
            return {
                time: new Date(d.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' + new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                fullTime: new Date(d.timestamp).toLocaleString(),
                weight: d.weight,
                gain: Number(gain.toFixed(2)),
                honey: Math.max(0, d.weight - hiveTare),
                battery: d.battery
            };
        }); // Recharts preferisce ordine cronologico per AreaChart (già sorted in filteredData)
    }, [filteredData, hiveTare]);

    const availableMonthYears = useMemo(() => {
        const monthYearsMap: Record<string, { label: string, key: string, sortKey: number }> = {};
        
        scaleData.forEach(d => {
            const date = new Date(d.timestamp);
            const m = date.getMonth(); // 0-11
            const y = date.getFullYear();
            const key = `${m}-${y}`; // e.g. "4-2026"
            if (!monthYearsMap[key]) {
                const label = date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                monthYearsMap[key] = {
                    label: capitalizedLabel,
                    key,
                    sortKey: y * 12 + m
                };
            }
        });
        
        return Object.values(monthYearsMap).sort((a, b) => b.sortKey - a.sortKey);
    }, [scaleData]);

    const getMonthName = (key: string) => {
        if (key === 'ALL') return 'Tutti i mesi';
        const item = availableMonthYears.find(m => m.key === key);
        return item ? item.label : 'Tutti i mesi';
    };

    const groupedHistory = useMemo(() => {
        const groups: Record<string, { 
            date: string; 
            max: number; 
            min: number; 
            gain: number; 
            readings: ScaleDataPoint[] 
        }> = {};

        // Filtra i dati in base al mese selezionato nel filtro di ricerca
        const filteredScaleData = selectedMonthYear === 'ALL'
            ? scaleData
            : scaleData.filter(d => {
                const date = new Date(d.timestamp);
                const key = `${date.getMonth()}-${date.getFullYear()}`;
                return key === selectedMonthYear;
            });

        filteredScaleData.forEach(d => {
            const dObj = new Date(d.timestamp);
            const dateKey = dObj.toLocaleDateString();
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date: dateKey,
                    max: d.weight,
                    min: d.weight,
                    gain: 0,
                    readings: []
                };
            }
            groups[dateKey].readings.push(d);
            if (d.weight > groups[dateKey].max) groups[dateKey].max = d.weight;
            if (d.weight < groups[dateKey].min) groups[dateKey].min = d.weight;
        });

        return Object.values(groups)
            .sort((a, b) => new Date(b.readings[0].timestamp).getTime() - new Date(a.readings[0].timestamp).getTime())
            .map(group => {
                group.readings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                const first = group.readings[group.readings.length - 1].weight;
                const last = group.readings[0].weight;
                group.gain = last - first;
                return group;
            });
    }, [scaleData, selectedMonthYear]);

    return (
        <div className="animate-fade-in pb-20 p-4 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 h-10">
                <button 
                    onClick={onBack} 
                    className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                >
                    <BackArrowIcon className="w-5 h-5"/>
                </button>
                <div className="flex gap-2">
                    {selectedScaleId && (
                        <button 
                            onClick={() => {
                                if (currentScale) {
                                    setNewScaleForm({
                                        id: currentScale.scaleId,
                                        name: currentScale.name,
                                        secret: currentScale.secretKey,
                                        apn: currentScale.apn || 'internet.it',
                                        schedule: currentScale.schedule || { rules: [{ months: [1,2,3,4,5,6,7,8,9,10,11,12], days: Array.from({length: 31}, (_, i) => i + 1), times: ['08:00', '20:00'] }] }
                                    });
                                    setIsEditingSettings(true);
                                }
                            }}
                            className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-500 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                            title="Impostazioni Bilancia"
                        >
                            <SettingsIcon className="w-5 h-5"/> 
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 text-center shadow-sm">
                <div className="bg-amber-100 dark:bg-amber-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600">
                    <ScaleIcon className="w-7 h-7"/>
                </div>
                <h2 className="text-xl font-bold">Bilancia Pro</h2>
            </div>

            {/* Scale Selector / Registration */}
            <div className="mb-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                    {scales.map(scale => (
                        <button
                            key={scale.id}
                            onClick={() => setSelectedScaleId(scale.scaleId)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border-2 ${
                                selectedScaleId === scale.scaleId
                                ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20 scale-105'
                                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-amber-200'
                            }`}
                        >
                            {scale.name}
                        </button>
                    ))}
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border-2 border-dashed transition-all ${
                            isRegistering 
                            ? 'bg-slate-800 text-white border-slate-800' 
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        <PlusIcon className="w-4 h-4" />
                        {isRegistering ? 'Annulla' : 'Nuova Bilancia'}
                    </button>
                </div>

                <AnimatePresence>
                    {isRegistering && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-amber-500/20 shadow-xl shadow-amber-500/5 space-y-4"
                        >
                            <div className="flex items-center gap-2 mb-2 text-amber-600 font-black uppercase text-xs">
                                <PlusIcon className="w-4 h-4" />
                                Registra Nuova Bilancia
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ID Bilancia</label>
                                    <input 
                                        type="text"
                                        value={newScaleForm.id}
                                        onChange={(e) => setNewScaleForm({...newScaleForm, id: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome</label>
                                    <input 
                                        type="text"
                                        value={newScaleForm.name}
                                        onChange={(e) => setNewScaleForm({...newScaleForm, name: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Configurazione APN</label>
                                <input 
                                    type="text"
                                    value={newScaleForm.apn}
                                    onChange={(e) => setNewScaleForm({...newScaleForm, apn: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-amber-500"
                                />
                            </div>
                            <button 
                                onClick={handleRegister}
                                disabled={!newScaleForm.id || isLoading}
                                className="w-full py-3 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-600 transition disabled:opacity-50"
                            >
                                {isLoading ? 'CARICAMENTO...' : 'CONFERMA REGISTRAZIONE'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isEditingSettings && (
                        <Modal 
                            isOpen={isEditingSettings} 
                            onClose={() => setIsEditingSettings(false)} 
                            title={`IMPOSTAZIONI: ${currentScale?.name}`}
                            disableBackdropClick={true}
                            hideCloseButton={true}
                            alignTop={true}
                        >
                            <div className="space-y-4 pb-2">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome Bilancia</label>
                                        <input 
                                            type="text"
                                            value={newScaleForm.name}
                                            onChange={(e) => setNewScaleForm({...newScaleForm, name: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Configurazione APN</label>
                                        <input 
                                            type="text"
                                            value={newScaleForm.apn}
                                            onChange={(e) => setNewScaleForm({...newScaleForm, apn: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>

                                {/* Sezione Reset */}
                                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 space-y-3">
                                    <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-tight">
                                        Il ripristino azzererà il contatore delle letture temporanee e i dati in attesa di invio per la bilancia {currentScale?.name}. L'operazione non è reversibile.
                                    </p>
                                    <button 
                                        onClick={() => setIsResetConfirmOpen(true)}
                                        className="w-full py-2 bg-red-500 text-white text-[10px] font-black rounded-lg hover:bg-red-600 transition uppercase tracking-widest shadow-lg shadow-red-500/20"
                                    >
                                        Richiedi Reset Bilancia
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    <button 
                                        onClick={handleUpdateSettings}
                                        disabled={isLoading}
                                        className="w-full py-3 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 font-black rounded-xl hover:bg-slate-700 transition text-sm"
                                    >
                                        {isLoading ? 'SALVATAGGIO...' : 'SALVA IMPOSTAZIONI'}
                                    </button>
                                    <button 
                                        onClick={() => setIsEditingSettings(false)}
                                        className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition uppercase text-[10px] tracking-widest"
                                    >
                                        Esci
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )}
                </AnimatePresence>
            </div>

            {!selectedScaleId && !isRegistering && (
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl text-center text-sm text-amber-700 dark:text-amber-400 font-medium mb-6">
                    <WarningIcon className="w-5 h-5 mx-auto mb-2 opacity-60" />
                    Registra o seleziona una bilancia per iniziare a veder il peso.
                </div>
            )}

            <AnimatePresence>
                {isResetConfirmOpen && (
                    <Modal 
                        isOpen={isResetConfirmOpen} 
                        onClose={() => !isResetting && setIsResetConfirmOpen(false)} 
                        title="RIPRISTINO BILANCIA"
                        alignTop={true}
                    >
                        <div className="space-y-6 text-center pb-4">

                            
                            <div className="space-y-2">
                                <p className="text-slate-800 dark:text-white font-bold text-lg leading-snug">
                                    Sei sicuro di voler ripristinare la bilancia?
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    Il ripristino azzererà il contatore delle letture temporanee e i dati in attesa di invio per la bilancia {currentScale?.name}. L'operazione non è reversibile.
                                </p>
                            </div>

                            {resetSuccess ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }} 
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold"
                                >
                                    ✅ Comando inviato con successo!
                                </motion.div>
                            ) : resetError ? (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }} 
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 font-bold"
                                >
                                    ❌ {resetError}
                                </motion.div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={handleResetScale}
                                        disabled={isResetting}
                                        className="w-full py-4 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition shadow-xl shadow-red-500/20 flex items-center justify-center gap-3"
                                    >
                                        {isResetting ? (
                                            <>
                                                <RefreshIcon className="w-5 h-5 animate-spin" />
                                                INVIANDO...
                                            </>
                                        ) : (
                                            'SÌ, RIPRISTINA ORA'
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => setIsResetConfirmOpen(false)}
                                        disabled={isResetting}
                                        className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isMonthSelectModalOpen && (
                    <Modal
                        isOpen={isMonthSelectModalOpen}
                        onClose={() => setIsMonthSelectModalOpen(false)}
                        title="SELEZIONA MESE"
                    >
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {/* Opzione Tutti i mesi */}
                            <button
                                onClick={() => {
                                    setSelectedMonthYear('ALL');
                                    setExpandedDay(null);
                                    setIsMonthSelectModalOpen(false);
                                }}
                                className={`w-full p-4 rounded-2xl flex items-center justify-between text-left border transition-all ${
                                    selectedMonthYear === 'ALL'
                                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-500 text-amber-500'
                                        : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-transparent text-slate-700 dark:text-slate-200'
                                }`}
                            >
                                <span className="font-bold text-sm">Tutti i mesi</span>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    selectedMonthYear === 'ALL'
                                        ? 'border-amber-500 bg-amber-500/10'
                                        : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                    {selectedMonthYear === 'ALL' && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    )}
                                </div>
                            </button>

                            {/* Opzioni mesi singoli */}
                            {availableMonthYears.map(my => {
                                const isSelected = selectedMonthYear === my.key;
                                return (
                                    <button
                                        key={my.key}
                                        onClick={() => {
                                            setSelectedMonthYear(my.key);
                                            setExpandedDay(null);
                                            setIsMonthSelectModalOpen(false);
                                        }}
                                        className={`w-full p-4 rounded-2xl flex items-center justify-between text-left border transition-all ${
                                            isSelected
                                                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-500 text-amber-500'
                                                : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-transparent text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        <span className="font-bold text-sm">{my.label}</span>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'border-amber-500 bg-amber-500/10'
                                                : 'border-slate-300 dark:border-slate-600'
                                        }`}>
                                            {isSelected && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {weightAlert && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border ${
                            weightAlert.type === 'sciamatura' 
                                ? 'bg-red-50 border-red-100 text-red-700' 
                                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        }`}
                    >
                        <WarningIcon className="w-6 h-6 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider">Avviso Sistema</p>
                            <p className="text-sm font-medium">{weightAlert.msg}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Peso Totale</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-800 dark:text-white font-mono">
                            {latestPoint?.weight.toFixed(1) || '--.-'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold uppercase">kg</span>
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-black mt-2 px-2 py-0.5 rounded-full w-fit ${Number(weightChange) >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {Number(weightChange) >= 0 ? '↑' : '↓'} {Math.abs(Number(weightChange))} kg
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <BatteryIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Batteria</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-800 dark:text-white font-mono">
                            {latestPoint?.battery || '--'}
                        </span>
                        <span className="text-xs text-slate-500 font-bold uppercase">%</span>
                    </div>
                    {batteryForecast && (
                        <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                            Autonomia: <span className="text-emerald-500">{batteryForecast}</span>
                        </div>
                    )}
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${latestPoint?.battery || 0}%` }}
                            className={`h-full rounded-full ${
                                (latestPoint?.battery || 0) < 20 ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                        />
                    </div>
                </motion.div>
            </div>

            {/* Scale Trend Graph */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
                <div className="flex flex-col gap-4 mb-6">
                    <div className="space-y-4">
                        <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter italic">
                            <HistoryIcon className="w-5 h-5 text-amber-500" />
                            Andamento Peso
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl w-full justify-between sm:justify-start sm:gap-2">
                            {(['day1', 'day3', 'week', 'month', 'all'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                                        dateRange === range
                                        ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                        : 'text-slate-500'
                                    }`}
                                >
                                    {range === 'day1' ? '1G' : range === 'day3' ? '3G' : range === 'week' ? '7G' : range === 'month' ? '30G' : 'Tutto'}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {(['mixed', 'line', 'area'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setChartType(type)}
                                className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl border-2 transition-all ${
                                    chartType === type
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                    : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700'
                                }`}
                            >
                                {type === 'mixed' ? 'Misto' : type === 'line' ? 'Lineare' : 'Area'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-72 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                                <XAxis 
                                    dataKey="time" 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                                    minTickGap={40}
                                />
                                <YAxis 
                                    yId="weight"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                    domain={['auto', 'auto']}
                                    hide={false}
                                    tickFormatter={(val) => Number.isFinite(val) ? val.toFixed(1) : ''}
                                />
                                <YAxis 
                                    yId="gain"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 8, fill: '#10b981', fontWeight: 700 }}
                                    domain={['auto', 'auto']}
                                    tickFormatter={(val) => Number.isFinite(val) ? val.toFixed(1) : ''}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '20px', 
                                        border: 'none', 
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                        fontSize: '11px',
                                        padding: '12px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(8px)',
                                        color: '#1e293b'
                                    }}
                                    itemStyle={{ fontWeight: 700, padding: 0 }}
                                    labelStyle={{ fontWeight: 800, marginBottom: '4px', color: '#f59e0b', fontSize: '10px' }}
                                />
                                {chartType === 'mixed' && (
                                    <Bar 
                                        yId="gain"
                                        dataKey="gain" 
                                        name="Guadagno (kg)"
                                        barSize={15}
                                        radius={[4, 4, 0, 0]}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.gain >= 0 ? '#10b981' : '#ef4444'} 
                                                fillOpacity={0.3}
                                            />
                                        ))}
                                    </Bar>
                                )}
                                
                                {chartType !== 'line' ? (
                                    <Area 
                                        yId="weight"
                                        type="monotone" 
                                        dataKey="weight" 
                                        name="Peso (kg)"
                                        stroke="#f59e0b" 
                                        strokeWidth={chartType === 'area' ? 4 : 3}
                                        fillOpacity={1} 
                                        fill="url(#colorWeight)"
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                ) : (
                                    <Line 
                                        yId="weight"
                                        type="monotone" 
                                        dataKey="weight" 
                                        name="Peso (kg)"
                                        stroke="#f59e0b" 
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full mb-4">
                                <WarningIcon className="w-12 h-12 opacity-40" />
                            </div>
                            <p className="text-sm font-bold">Nessuna lettura nel periodo scelto</p>
                            <p className="text-[10px] mt-1 opacity-60">I dati SIM appariranno qui automaticamente</p>
                        </div>
                    )}
                </div>
            </div>


            {/* Recent History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 mb-6 transition-all duration-500">
                <button 
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center hover:bg-slate-100 transition-colors"
                >
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cronologia per giorno</span>
                        <span className="text-[8px] text-slate-300 font-bold uppercase">Clicca per i dettagli orari</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isHistoryOpen && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSearchOpen(!isSearchOpen);
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                                    isSearchOpen || selectedMonthYear !== 'ALL' 
                                        ? 'bg-amber-500 text-white shadow-sm' 
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-300'
                                }`}
                                title="Cerca per mese"
                            >
                                <SearchIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <HistoryIcon className={`w-4 h-4 text-slate-400 transition-transform duration-500 ${isHistoryOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>
                
                <AnimatePresence>
                    {isHistoryOpen && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            {/* Membro filtrato / Dropdown di ricerca del mese */}
                            <AnimatePresence>
                                {(isSearchOpen || selectedMonthYear !== 'ALL') && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="bg-amber-50/40 dark:bg-amber-950/10 p-3 border-b border-amber-100/30 dark:border-amber-900/20"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <SearchIcon className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                    Mese Registrazione
                                                </span>
                                            </div>
                                            <div className="relative flex-1 max-w-[170px]">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsMonthSelectModalOpen(true);
                                                    }}
                                                    className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-slate-900 border border-amber-200/50 dark:border-amber-950 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 text-left outline-none hover:border-amber-500 focus:border-amber-500 cursor-pointer shadow-sm transition-colors flex items-center justify-between"
                                                >
                                                    <span className="truncate">{getMonthName(selectedMonthYear)}</span>
                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                {groupedHistory.map((group) => (
                                    <div key={group.date} className="flex flex-col border-b border-slate-50 dark:border-slate-700 last:border-0">
                                        <div 
                                            onClick={() => setExpandedDay(expandedDay === group.date ? null : group.date)}
                                            className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${expandedDay === group.date ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'}`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-amber-500 uppercase tracking-tighter italic">
                                                    {group.date === new Date().toLocaleDateString() ? 'Oggi' : 
                                                     group.date === new Date(Date.now() - 86400000).toLocaleDateString() ? 'Ieri' : group.date}
                                                </span>
                                                <div className="flex gap-2 items-center mt-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase">Max</span>
                                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">{group.max.toFixed(1)}</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-100 dark:bg-slate-700"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] text-slate-400 font-bold uppercase">Min</span>
                                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">{group.min.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] text-slate-400 font-bold uppercase mb-1">Bilancio</span>
                                                <div className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${group.gain >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {group.gain >= 0 ? '↑' : '↓'} {Math.abs(group.gain).toFixed(2)} <span className="text-[8px]">kg</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <AnimatePresence>
                                            {expandedDay === group.date && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-slate-50/50 dark:bg-slate-900/20 px-4 pb-4 overflow-hidden"
                                                >
                                                    <div className="pt-2 space-y-2">
                                                        {group.readings.map((reading) => (
                                                            <div key={reading.id} className="flex justify-between items-center py-2 border-b border-white/50 dark:border-slate-800/50 last:border-0">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50"></div>
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                                        {new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">
                                                                        {reading.weight.toFixed(2)} kg
                                                                    </span>
                                                                    <div className="flex items-center gap-1 min-w-[35px] justify-end">
                                                                        <BatteryIcon className="w-2.5 h-2.5 text-emerald-500 opacity-60" />
                                                                        <span className="text-[10px] font-bold text-slate-400">{reading.battery}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                                {scaleData.length === 0 && (
                                    <div className="p-10 text-center flex flex-col items-center">
                                        <ScaleIcon className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-2" />
                                        <p className="text-sm italic text-slate-400">Nessun record in memoria.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Arduino Code Modal */}
            <AnimatePresence>
                {showCode && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-amber-500 text-white">
                                <div>
                                    <h4 className="text-xl font-black italic">Configurazione Hardware</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Lilygo T-SIM / HX711</p>
                                </div>
                                <button onClick={() => setShowCode(false)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
                                    <PlusIcon className="w-6 h-6 rotate-45" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto font-mono text-xs whitespace-pre bg-slate-900 text-emerald-400 selection:bg-emerald-500 selection:text-white">
                                {ARDUINO_CODE}
                                <div className="mt-4 p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl text-emerald-300 italic">
                                    Nota: Trovi il codice completo nel file "/arduino/scale_fw.ino" nel file explorer dell'app.
                                </div>
                                
                                <div className="mt-8 text-white font-sans whitespace-normal">
                                    <h5 className="font-black uppercase tracking-widest text-amber-500 mb-2">Istruzioni Setup:</h5>
                                    <ul className="space-y-4 text-sm leading-relaxed text-slate-300">
                                        <li className="flex gap-2">
                                            <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">1</span>
                                            <span>Collega la cella di carico Zemic (Rosso E+, Nero E-, Bianco A-, Verde A+) al modulo HX711.</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">2</span>
                                            <span>Collega HX711 alla Lilygo (VCC 3.3V, GND GND, DT PIN 21, SCK PIN 22).</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">3</span>
                                            <span>Inserisci la SIM e carica il firmware tramite Arduino IDE.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
                                <button 
                                    onClick={() => setShowCode(false)}
                                    className="w-full py-4 bg-slate-900 dark:bg-slate-700 text-white font-black rounded-2xl tracking-widest uppercase hover:bg-slate-800 transition"
                                >
                                    Ho capito
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ScaleDashboard;
