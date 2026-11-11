
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
import { Apiary, ScaleDataPoint, ScaleCommand, Scale } from '../types';
import { fetchScaleData, saveScaleCommand, fetchUserScales, registerScale } from '../services/db';
import { supabase } from '../services/supabase';
import { useSupabaseAuth } from '../src/context/SupabaseAuthContext';
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
    JarIcon
} from './Icons';
import { motion, AnimatePresence } from 'motion/react';

interface ScaleDashboardProps {
    apiaries: Apiary[];
    onBack: () => void;
}

const ARDUINO_CODE = `/* 
 * BEEWISE - FIRMWARE BILANCIA (Lilygo T-A7670E)
 * APN Vodafone: mobile.vodafone.it
 * Taratura Target: 22850.0
 */
#define TINY_GSM_MODEM_SIM7000
#include <TinyGsmClient.h>
#include "HX711.h"

// PIN SUGGERITI: DOUT=21, SCK=22 (o 32/33 se 21/22 occupati da I2C)
float calibration_factor = 22850.0; 

// ... vedi file arduino/scale_fw.ino completo ...
`;

const ScaleDashboard: React.FC<ScaleDashboardProps> = ({ apiaries, onBack }) => {
    const { user } = useSupabaseAuth();
    const [scales, setScales] = useState<Scale[]>([]);
    const [selectedScaleId, setSelectedScaleId] = useState<string>('');
    const [scaleData, setScaleData] = useState<ScaleDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [commandStatus, setCommandStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week');
    const [showCode, setShowCode] = useState(false);
    const [hiveTare, setHiveTare] = useState<number>(35); // Tara media arnia completa
    const [isSimulating, setIsSimulating] = useState(false);
    
    // UI per registrazione
    const [isRegistering, setIsRegistering] = useState(false);
    const [newScaleForm, setNewScaleForm] = useState({ id: '', name: '', secret: 'beewise_2024' });

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
        const success = await registerScale({
            scale_id: newScaleForm.id,
            name: newScaleForm.name || newScaleForm.id,
            user_id: user.id,
            secret_key: newScaleForm.secret,
            created_at: new Date().toISOString()
        });
        
        if (success) {
            setIsRegistering(false);
            setNewScaleForm({ id: '', name: '', secret: 'beewise_2024' });
            await loadUserScales();
            setSelectedScaleId(newScaleForm.id);
        }
        setIsLoading(false);
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

    const [calibData, setCalibData] = useState({ real: 0, read: 0, currentFactor: 22850.0 });
    const calculatedFactor = useMemo(() => {
        if (calibData.real > 0 && calibData.read > 0) {
            // Formula: NuovoFattore = FattoreCorrente * (LetturaBilancia / PesoReale)
            return Math.round(calibData.currentFactor * (calibData.read / calibData.real));
        }
        return null;
    }, [calibData]);

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
                time: new Date(d.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
                fullTime: new Date(d.timestamp).toLocaleString(),
                weight: d.weight,
                gain: Number(gain.toFixed(2)),
                honey: Math.max(0, d.weight - hiveTare),
                battery: d.battery
            };
        }); // Recharts preferisce ordine cronologico per AreaChart (già sorted in filteredData)
    }, [filteredData, hiveTare]);

    return (
        <div className="animate-fade-in pb-20 p-4 max-w-lg mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button 
                    onClick={onBack} 
                    className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                >
                    <BackArrowIcon className="w-5 h-5"/>
                </button>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Bilancia Pro</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowCode(true)}
                        className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                        title="Codice Arduino"
                    >
                        <RefreshIcon className="w-5 h-5 rotate-45"/> 
                    </button>
                    <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshIcon className="w-5 h-5"/>
                    </button>
                </div>
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
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ID Bilancia (es: Simo1)</label>
                                    <input 
                                        type="text"
                                        value={newScaleForm.id}
                                        onChange={(e) => setNewScaleForm({...newScaleForm, id: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome (es: Poggio)</label>
                                    <input 
                                        type="text"
                                        value={newScaleForm.name}
                                        onChange={(e) => setNewScaleForm({...newScaleForm, name: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Secret Key (Default: beewise_2024)</label>
                                <input 
                                    type="text"
                                    value={newScaleForm.secret}
                                    onChange={(e) => setNewScaleForm({...newScaleForm, secret: e.target.value})}
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
            </div>

            {!selectedScaleId && !isRegistering && (
                <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl text-center text-sm text-amber-700 dark:text-amber-400 font-medium mb-6">
                    <WarningIcon className="w-5 h-5 mx-auto mb-2 opacity-60" />
                    Registra o seleziona una bilancia per iniziare a veder il peso.
                </div>
            )}

            {/* Alerts */}
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
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <ScaleIcon className="w-4 h-4 text-amber-600" />
                        </div>
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

            {/* Honey Estimation Feature */}
            <div className="bg-amber-500 rounded-3xl p-6 text-white mb-6 shadow-xl shadow-amber-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <JarIcon className="w-24 h-24 rotate-12" />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Miele Stimato</p>
                            <h4 className="text-4xl font-black">{honeyEstimate} <span className="text-lg">kg</span></h4>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl text-center">
                            <p className="text-[8px] font-bold uppercase leading-tight">Tara Arnia</p>
                            <p className="text-sm font-black">{hiveTare}kg</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input 
                            type="range" 
                            min="20" 
                            max="50" 
                            value={hiveTare} 
                            onChange={(e) => setHiveTare(Number(e.target.value))}
                            className="flex-1 accent-white"
                        />
                        <span className="text-[10px] font-bold opacity-80 whitespace-nowrap">Regola Tara</span>
                    </div>
                </div>
            </div>

            {/* Scale Trend Graph */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter italic">
                        <HistoryIcon className="w-5 h-5 text-amber-500" />
                        Andamento Peso
                    </h3>
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl self-end">
                        {(['week', 'month', 'all'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                                    dateRange === range
                                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-md transform scale-105'
                                    : 'text-slate-500'
                                }`}
                            >
                                {range === 'week' ? '7 Giorni' : range === 'month' ? '30 Giorni' : 'Tutto'}
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
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                />
                                <YAxis 
                                    yId="weight"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                    domain={['dataMin - 1', 'dataMax + 1']}
                                    hide={false}
                                />
                                <YAxis 
                                    yId="gain"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 8, fill: '#10b981', fontWeight: 700 }}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        borderRadius: '20px', 
                                        border: 'none', 
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                        fontSize: '12px',
                                        padding: '12px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        backdropFilter: 'blur(4px)'
                                    }}
                                    labelStyle={{ fontWeight: 800, marginBottom: '4px', color: '#1e293b' }}
                                />
                                <Bar 
                                    yId="gain"
                                    dataKey="gain" 
                                    name="Gaudagno Giornaliero (kg)"
                                    barSize={20}
                                    radius={[4, 4, 0, 0]}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.gain >= 0 ? '#10b981' : '#ef4444'} 
                                            fillOpacity={0.4}
                                        />
                                    ))}
                                </Bar>
                                <Area 
                                    yId="weight"
                                    type="monotone" 
                                    dataKey="weight" 
                                    name="Peso Totale (kg)"
                                    stroke="#f59e0b" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorWeight)" 
                                />
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

            {/* Real Time / Command Section */}
            <div className="bg-slate-800 dark:bg-slate-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden mb-10">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                <div className="flex flex-col items-center text-center">
                    <div className={`p-4 rounded-3xl mb-4 transition-all duration-500 ${commandStatus === 'pending' ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse' : 'bg-slate-700'}`}>
                        <RefreshIcon className={`w-8 h-8 text-white ${commandStatus === 'pending' ? 'animate-spin' : ''}`} />
                    </div>
                    <h3 className="text-xl font-black text-white italic tracking-tight uppercase">Peso Real-Time</h3>
                    <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed font-medium">
                        Vuoi sapere quanto pesano ora le tue api? Invia un comando diretto alla Lilygo tramite connessione SIM.
                    </p>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleRequestWeight}
                        disabled={commandStatus === 'pending' || !selectedApiaryId}
                        className={`w-full py-4 rounded-2xl font-black text-lg transition-all duration-300 transform active:scale-95 shadow-lg ${
                            commandStatus === 'pending' ? 'bg-slate-600 text-slate-400 cursor-not-allowed' :
                            commandStatus === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                            commandStatus === 'error' ? 'bg-red-500 text-white shadow-red-500/20' :
                            'bg-white text-slate-900 hover:bg-amber-500 hover:text-white shadow-white/5'
                        }`}
                    >
                        {commandStatus === 'idle' && 'RICHIEDI PESO ORA'}
                        {commandStatus === 'pending' && 'INVIO COMANDO...'}
                        {commandStatus === 'success' && 'COMANDO INVIATO!'}
                        {commandStatus === 'error' && 'ERRORE DI RETE'}
                    </button>
                    
                    <button
                        onClick={simulateData}
                        disabled={isSimulating || !selectedApiaryId}
                        className="w-full mt-3 py-3 rounded-xl bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                    >
                        {isSimulating ? <RefreshIcon className="w-3 h-3 animate-spin"/> : <ScaleIcon className="w-3 h-3"/>}
                        Invia lettura di test (Simulazione senza SIM)
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-4 uppercase tracking-[0.2em] font-black">
                        Costo stimato: <span className="text-slate-300">~0.01€ / comando</span>
                    </p>
                </div>
            </div>
            
            {/* Calibrazione Section */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
                <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter mb-4">
                    <ScaleIcon className="w-5 h-5 text-amber-500" />
                    Assistente Calibrazione
                </h3>
                <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
                    Se la bilancia "ruba" peso o è imprecisa, usa questo calcolatore per trovare il nuovo fattore da inserire nel firmware Arduino.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Peso Reale (kg)</label>
                        <input 
                            type="number"
                            value={calibData.real || ''}
                            onChange={(e) => setCalibData({...calibData, real: Number(e.target.value)})}
                            placeholder="Es: 97"
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-amber-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Peso Letto (kg)</label>
                        <input 
                            type="number"
                            value={calibData.read || ''}
                            onChange={(e) => setCalibData({...calibData, read: Number(e.target.value)})}
                            placeholder="Es: 89"
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-amber-500"
                        />
                    </div>
                </div>
                {calculatedFactor && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Nuovo Fattore Calibrazione:</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-mono font-black text-amber-700 dark:text-amber-400">
                                {calculatedFactor}.0
                            </span>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${calculatedFactor}.0`);
                                    alert("Copiato!");
                                }}
                                className="text-[10px] bg-amber-500 text-white px-3 py-1 rounded-full font-black uppercase"
                            >
                                Copia
                            </button>
                        </div>
                        <p className="text-[9px] text-amber-600/60 mt-2 italic">
                            *Sostituisci questo valore nel firmware Arduino (calibration_factor) e ricarica il codice.
                        </p>
                    </div>
                )}
            </div>
            
            {/* Recent History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cronologia completa</span>
                    <HistoryIcon className="w-4 h-4 text-slate-300" />
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                    {scaleData.slice(0, 10).map((d) => (
                        <div key={d.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-lg font-black text-slate-800 dark:text-white font-mono">
                                    {d.weight.toFixed(2)} <span className="text-[10px] uppercase opacity-40 font-sans">kg</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                    {new Date(d.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                        <BatteryIcon className="w-3 h-3 text-emerald-500" />
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{d.battery}%</span>
                                    </div>
                                    <span className="text-[8px] font-black tracking-widest uppercase opacity-30 text-emerald-500">Online</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {scaleData.length === 0 && (
                        <div className="p-10 text-center flex flex-col items-center">
                            <ScaleIcon className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-2" />
                            <p className="text-sm italic text-slate-400">Nessun record in memoria.</p>
                        </div>
                    )}
                </div>
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
