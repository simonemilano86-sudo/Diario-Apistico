
import React, { useState, useEffect, useRef } from 'react';
import { Apiary, SeasonalNote, BloomRecord } from '../types';
import { logger } from '../services/logger';
import { BackArrowIcon, LeafIcon, TrashIcon, PlusIcon, SearchIcon, BellIcon, MailIcon, EditIcon, MoreVerticalIcon, XCircleIcon, WarningIcon } from './Icons';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import Modal from './Modal';

interface ToolsViewProps {
    apiaries: Apiary[];
    onBack: () => void;
    notes: SeasonalNote[];
    onSaveNote: (note: SeasonalNote) => void;
    isBloomModalOpen: boolean;
    setIsBloomModalOpen: (isOpen: boolean) => void;
    isScrolling?: boolean;
}

// Lista completa ordinata e deduplicata per l'autocomplete (nuova fioritura)
const PLANTS = [
    'Acacia (Robinia)', 'Acero', 'Acero campestre', 'Acero montano', 'Acero negundo', 'Acero palmato', 'Acero riccio',
    'Achillea', 'Achillea millefolium', 'Aglio in fiore', 'Agrumi', 'Ailanto', 'Albicocco', 'Alloro', 'Aneto', 'Anguria',
    'Arancio', 'Asfodelo', 'Aster', 'Avena', 'Bagolaro', 'Bardana', 'Basilico in fiore', 'Betulla', 'Biancospino',
    'Borragine', 'Bosso', 'Broccolo in fiore', 'Calendula', 'Campanula', 'Canapa', 'Caprifoglio', 'Caprifoglio selvatico',
    'Cardo', 'Cardo mariano', 'Cardo selvatico', 'Carota selvatica', 'Carpino', 'Carpino nero', 'Carrubo', 'Castagno',
    'Cavolfiore in fiore', 'Cavolo in fiore', 'Cece', 'Cedro', 'Centaurea', 'Centaurea cyanus', 'Centaurea scabiosa',
    'Cetriolo', 'Ciliegio', 'Cipolla in fiore', 'Cipresso', 'Cisto', 'Cisto bianco', 'Cisto ladanifero', 'Cisto marino',
    'Clementino', 'Clematide', 'Colza', 'Convolvolo', 'Corbezzolo', 'Coriandolo', 'Corniolo', 'Cosmos', 'Cotone', 'Cumino',
    'Dente di leone', 'Digitalis', 'Echium', 'Echium vulgare', 'Edera', 'Erba cipollina in fiore', 'Erba medica', 'Erica',
    'Erica arborea', 'Erica carnea', 'Erica multiflora', 'Eucalipto', 'Euforbia', 'Euforbia arborea', 'Evodia', 'Facelia',
    'Faggio', 'Fava', 'Favino', 'Finocchio coltivato in fiore', 'Finocchio selvatico', 'Fiordaliso', 'Fotinia', 'Fragola',
    'Fragola selvatica', 'Frassino', 'Frassino maggiore', 'Ginepro', 'Ginestra', 'Ginestra dei carbonai', 'Ginestra odorosa',
    'Girasole', 'Grano saraceno', 'Ippocastano', 'Ipomea', 'Issopo', 'Knautia', 'Lampone', 'Lauro', 'Laurus nobilis',
    'Lavanda', 'Lavanda vera', 'Lavandino', 'Leccio', 'Lenticchia', 'Ligustro', 'Ligustro lucido', 'Ligustro selvatico',
    'Limone', 'Lino', 'Loosestrife', 'Lupinella', 'Lythrum', 'Maggiorana', 'Mais', 'Malva', 'Malva sylvestris', 'Mandorlo',
    'Marruca', 'Melata', 'Meliloto bianco', 'Meliloto giallo', 'Melissa', 'Melograno', 'Melone', 'Melo', 'Menta', 'Mentastro',
    'Mirto', 'Nepeta', 'Nespolo', 'Nespolo del Giappone', 'Nespolo selvatico', 'Nocciolo', 'Oleandro', 'Olmo', 'Ontano',
    'Ontano bianco', 'Ontano nero', 'Origano', 'Orzo', 'Paliurus spina-christi', 'Papavero', 'Paulownia', 'Pero', 'Pesco',
    'Phacelia tanacetifolia', 'Pioppo', 'Pioppo bianco', 'Pioppo nero', 'Pioppo tremulo', 'Pisello', 'Pompelmo',
    'Porro in fiore', 'Portulaca', 'Prezzemolo in fiore', 'Propoli', 'Prugnolo', 'Quercia', 'Ravanello in fiore', 'Reseda',
    'Riso', 'Robinia pseudoacacia', 'Rosmarino', 'Rovere', 'Roverella', 'Rovo', 'Rovo comune', 'Rucola selvatica', 'Salice',
    'Salice bianco', 'Salice caprea', 'Salice cinerea', 'Salice purpurea', 'Salice viminale', 'Salvia', 'Salvia officinale',
    'Salvia sclarea', 'Sambuco', 'Santoreggia', 'Scabiosa', 'Sedum', 'Sedum spectabile', 'Segale', 'Senape', 'Senecio',
    'Sofora del Giappone', 'Soia', 'Solidago', 'Sorghetto', 'Sorgo', 'Sorbo', 'Sorbo degli uccellatori', 'Sorbo domestico',
    'Sorbo montano', 'Spartium junceum', 'Sughera', 'Sulla', 'Susino', 'Tamerice', 'Tarassaco', 'Tarassaco tardivo',
    'Tetradium daniellii', 'Tiglio', 'Tiglio argentato', 'Tiglio cordato', 'Tiglio selvatico', 'Timo', 'Timo serpillo',
    'Trifoglio', 'Trifoglio alessandrino', 'Trifoglio bianco', 'Trifoglio incarnato', 'Trifoglio rosso', 'Veccia',
    'Veccia sativa', 'Veccia villosa', 'Verbascum', 'Verbena', 'Verbena bonariensis', 'Visciolo', 'Vitalba', 'Zinnia',
    'Zucca', 'Zucchino'
];

const ToolsView: React.FC<ToolsViewProps> = ({ apiaries, onBack, notes, onSaveNote, isBloomModalOpen, setIsBloomModalOpen, isScrolling }) => {
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [selectedApiaryIds, setSelectedApiaryIds] = useState<Set<string>>(new Set());
    
    // Editor State
    const [editorContent, setEditorContent] = useState('');
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    
    // Bloom Logic State
    const [blooms, setBlooms] = useState<BloomRecord[]>([]);
    const [openMenuBloomId, setOpenMenuBloomId] = useState<string | null>(null);
    
    // Search / Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [filterApiaryId, setFilterApiaryId] = useState('');
    const [filterPlantName, setFilterPlantName] = useState('');

    // Edit & Delete State
    const [bloomToEdit, setBloomToEdit] = useState<BloomRecord | null>(null);
    const [bloomToDelete, setBloomToDelete] = useState<string | null>(null);

    // Debug & UI Utils
    const [noteStyle, setNoteStyle] = useState({ fontFamily: 'sans-serif', fontSize: '16px', color: '#e2e8f0' });
    const [alertMessage, setAlertMessage] = useState<string | null>(null);

    // Bloom Form State
    const [newBloomPlant, setNewBloomPlant] = useState('');
    const [newBloomStart, setNewBloomStart] = useState('');
    const [newBloomEnd, setNewBloomEnd] = useState('');
    const [newBloomNotes, setNewBloomNotes] = useState('');
    const [newBloomNotify, setNewBloomNotify] = useState(false);
    const [newBloomDaysBefore, setNewBloomDaysBefore] = useState(15);
    const [newBloomEmail, setNewBloomEmail] = useState(false);
    const [plantSearchQuery, setPlantSearchQuery] = useState('');

    const currentYear = new Date().getFullYear();
    const startYear = 2024;
    const endYear = currentYear;
    const years = Array.from({ length: (endYear - startYear) + 1 }, (_, i) => startYear + i);
    
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedData = useRef<string>(''); 

    // Hardcode category to 'blooms' since 'works' is removed
    const selectedCategory = 'blooms';

    // Gestione chiusura menu al click esterno
    useEffect(() => {
        const handleClickOutside = () => {
            if (openMenuBloomId) setOpenMenuBloomId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [openMenuBloomId]);

    // Effetto per caricare i dati
    useEffect(() => {
        const existingNote = notes.find(n => n.type === selectedCategory && n.year === year);
        
        let idsToSelect = new Set<string>();

        if (existingNote) {
            setCurrentNoteId(existingNote.id);
            setEditorContent(existingNote.content || '');
            idsToSelect = new Set(existingNote.apiaryIds);
            setBlooms(existingNote.blooms || []);
            if (existingNote.style) setNoteStyle(existingNote.style);
            
            lastSavedData.current = JSON.stringify({ blooms: existingNote.blooms || [], content: existingNote.content || '' });
        } else {
            setCurrentNoteId(null);
            setEditorContent('');
            idsToSelect = new Set();
            setBlooms([]);
            setNoteStyle({ fontFamily: 'sans-serif', fontSize: '16px', color: '#e2e8f0' });
            lastSavedData.current = JSON.stringify({ blooms: [], content: '' });
        }

        if (apiaries.length === 1) {
            idsToSelect.add(apiaries[0].id);
        }

        setSelectedApiaryIds(idsToSelect);
        setAutoSaveStatus('idle');
    }, [year]); 

    // Effetto Auto-Save Corretto
    useEffect(() => {
        const currentDataString = JSON.stringify({ blooms, content: editorContent });
        
        if (currentDataString === lastSavedData.current) {
            if (autoSaveStatus === 'saving') setAutoSaveStatus('idle');
            return;
        }

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

        setAutoSaveStatus('saving');
        
        safetyTimerRef.current = setTimeout(() => {
            if (autoSaveStatus === 'saving') setAutoSaveStatus('idle');
        }, 5000);
        
        autoSaveTimerRef.current = setTimeout(() => {
            saveCurrentState(blooms, editorContent);
        }, 1500);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        };
    }, [blooms, editorContent, noteStyle]);

    useEffect(() => {
        if (!isBloomModalOpen) {
            setBloomToEdit(null);
            setNewBloomPlant('');
            setNewBloomStart('');
            setNewBloomEnd('');
            setNewBloomNotes('');
            setNewBloomNotify(false);
            setNewBloomEmail(false);
            setPlantSearchQuery('');
        }
    }, [isBloomModalOpen]);

    const saveCurrentState = (currentBlooms: BloomRecord[], currentContent: string) => {
        const note: SeasonalNote = {
            id: currentNoteId || Date.now().toString(),
            type: selectedCategory as 'blooms' | 'works',
            year,
            apiaryIds: Array.from(selectedApiaryIds),
            content: currentContent, 
            blooms: currentBlooms,
            updatedAt: new Date().toISOString(),
            style: noteStyle
        };
        
        lastSavedData.current = JSON.stringify({ blooms: currentBlooms, content: currentContent });

        onSaveNote(note);
        if (!currentNoteId) setCurrentNoteId(note.id);
        
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
    };

    const handleSaveBloom = async () => {
        if (!newBloomPlant || !newBloomStart || selectedApiaryIds.size === 0) {
            return;
        }

        const notificationId = bloomToEdit?.notificationId || Math.floor(Math.random() * 2147483647);
        
        if (newBloomNotify && Capacitor.isNativePlatform()) {
             if (bloomToEdit?.notificationEnabled) {
                 try { await LocalNotifications.cancel({ notifications: [{ id: notificationId }] }); } catch (e) {}
             }

             const targetYear = year + 1;
             const start = new Date(newBloomStart);
             const notifyDate = new Date(targetYear, start.getMonth(), start.getDate());
             notifyDate.setDate(notifyDate.getDate() - newBloomDaysBefore);
             notifyDate.setHours(9, 0, 0, 0);

             if (notifyDate > new Date()) {
                 try {
                     await LocalNotifications.schedule({
                         notifications: [{
                             title: `🌱 Preparati per la fioritura: ${newBloomPlant}`,
                             body: `L'anno scorso la fioritura è iniziata tra circa ${newBloomDaysBefore} giorni.`,
                             id: notificationId,
                             schedule: { at: notifyDate },
                             smallIcon: 'ic_stat_icon_config_sample',
                         }]
                     });
                     logger.log(`Notifica fioritura programmata per ${notifyDate.toLocaleString()}`);
                 } catch (e) {
                     logger.log("Errore notifica fioritura", "error");
                 }
             }
        } else if (!newBloomNotify && bloomToEdit?.notificationEnabled && Capacitor.isNativePlatform()) {
             try { await LocalNotifications.cancel({ notifications: [{ id: notificationId }] }); } catch (e) {}
        }

        const bloomData: BloomRecord = {
            id: bloomToEdit ? bloomToEdit.id : Date.now().toString(),
            plantName: newBloomPlant,
            startDate: newBloomStart,
            endDate: newBloomEnd,
            notes: newBloomNotes,
            notificationEnabled: newBloomNotify,
            notificationDaysBefore: newBloomDaysBefore,
            notificationId,
            emailReminder: newBloomNotify ? newBloomEmail : false,
            apiaryIds: Array.from(selectedApiaryIds)
        };

        let updatedBlooms;
        if (bloomToEdit) {
            updatedBlooms = blooms.map(b => b.id === bloomToEdit.id ? bloomData : b);
        } else {
            updatedBlooms = [...blooms, bloomData];
        }

        setBlooms(updatedBlooms);
        saveCurrentState(updatedBlooms, editorContent);
        setIsBloomModalOpen(false);
    };

    const requestDeleteBloom = (id: string) => {
        setBloomToDelete(id);
    };

    const confirmDeleteBloom = async () => {
        if (!bloomToDelete) return;

        const bloom = blooms.find(b => b.id === bloomToDelete);
        if (bloom?.notificationEnabled && bloom.notificationId && Capacitor.isNativePlatform()) {
            try {
                await LocalNotifications.cancel({ notifications: [{ id: bloom.notificationId }] });
            } catch (e) { logger.log("Errore cancellazione notifica fioritura", "warn"); }
        }
        
        const updatedBlooms = blooms.filter(b => b.id !== bloomToDelete);
        setBlooms(updatedBlooms);
        saveCurrentState(updatedBlooms, editorContent);
        setBloomToDelete(null);
    };

    const openEditBloom = (bloom: BloomRecord) => {
        setBloomToEdit(bloom);
        setNewBloomPlant(bloom.plantName);
        setNewBloomStart(bloom.startDate);
        setNewBloomEnd(bloom.endDate);
        setNewBloomNotes(bloom.notes);
        setNewBloomNotify(bloom.notificationEnabled);
        setNewBloomDaysBefore(bloom.notificationDaysBefore || 15);
        setNewBloomEmail(bloom.emailReminder || false);
        setIsBloomModalOpen(true);
    };

    // --- LOGICA DI FILTRAGGIO ---
    
    // Estrai nomi univoci dalle fioriture esistenti (NON da PLANTS)
    const uniquePlantNames = Array.from(new Set(blooms.map(b => b.plantName))).sort();

    // Conta filtri attivi
    const activeFiltersCount = [filterText, filterApiaryId, filterPlantName].filter(Boolean).length;
    
    const displayedBlooms = blooms.filter(b => {
        // 1. Must match current APIARY TABS context
        if (!b.apiaryIds?.some(id => selectedApiaryIds.has(id))) return false;

        // 2. Text Search
        const textMatch = !filterText || 
            b.plantName.toLowerCase().includes(filterText.toLowerCase()) || 
            b.notes.toLowerCase().includes(filterText.toLowerCase());

        // 3. Specific Apiary Filter (from Panel)
        const apiaryMatch = !filterApiaryId || b.apiaryIds?.includes(filterApiaryId);

        // 4. Specific Plant Name Filter (NEW)
        const plantMatch = !filterPlantName || b.plantName === filterPlantName;

        return textMatch && apiaryMatch && plantMatch;
    }).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const filteredPlants = PLANTS.filter(p => p.toLowerCase().includes(plantSearchQuery.toLowerCase()));
    const isAnyApiarySelected = selectedApiaryIds.size > 0;

    const clearFilters = () => {
        setFilterText('');
        setFilterApiaryId('');
        setFilterPlantName('');
        setIsFilterOpen(false);
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* Header: Toolbar standard allineata a NFC/Dettagli */}
            <div className="flex justify-between items-center mb-6 h-10 flex-shrink-0">
                {/* Sinistra: Tasto Indietro */}
                <button 
                    onClick={onBack} 
                    className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition" 
                    title="Indietro"
                >
                    <BackArrowIcon className="w-5 h-5"/>
                </button>

                {/* Destra: Status + Cerca */}
                <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 hidden sm:block">
                        {autoSaveStatus === 'saving' ? 'Salvataggio...' : autoSaveStatus === 'saved' ? 'Salvato' : ''}
                    </div>
                    
                    {/* Search Button with Badge */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center justify-center w-10 h-10 rounded-full border transition shadow-sm ${
                                activeFiltersCount > 0 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                            }`}
                            title="Filtra Fioriture"
                        >
                            <SearchIcon className="w-5 h-5" />
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Smart Filter Panel - Accordion Style */}
            {isFilterOpen && (
                <div className="mb-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 animate-fade-in flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Cerca tra le tue fioriture</h3>
                        <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">Resetta</button>
                    </div>
                    
                    <div className="space-y-3">
                        {/* Text Search */}
                        <div>
                            <input 
                                type="text" 
                                placeholder="Cerca nelle note..." 
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-emerald-500"
                            />
                        </div>

                        {/* Dropdowns Row */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Plant Name Filter */}
                            <div className={apiaries.length <= 1 ? "col-span-2" : ""}>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Pianta</label>
                                <select 
                                    value={filterPlantName}
                                    onChange={(e) => setFilterPlantName(e.target.value)}
                                    className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white disabled:opacity-50"
                                    disabled={uniquePlantNames.length === 0}
                                >
                                    <option value="">Tutte le piante</option>
                                    {uniquePlantNames.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Apiary Filter (Only if > 1 apiary exists) */}
                            {apiaries.length > 1 && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Apiario</label>
                                    <select 
                                        value={filterApiaryId}
                                        onChange={(e) => setFilterApiaryId(e.target.value)}
                                        className="w-full text-sm p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    >
                                        <option value="">Tutti gli apiari</option>
                                        {apiaries.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Active Filters Badges */}
            {activeFiltersCount > 0 && !isFilterOpen && (
                <div className="mb-4 flex flex-wrap gap-2 flex-shrink-0">
                    {filterText && (
                        <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full flex items-center gap-1">
                            🔍 "{filterText}"
                            <button onClick={() => setFilterText('')}><XCircleIcon className="w-3 h-3"/></button>
                        </span>
                    )}
                    {filterPlantName && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                            Pianta: {filterPlantName}
                            <button onClick={() => setFilterPlantName('')}><XCircleIcon className="w-3 h-3"/></button>
                        </span>
                    )}
                    {filterApiaryId && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                            Apiario: {apiaries.find(a => a.id === filterApiaryId)?.name || '...'}
                            <button onClick={() => setFilterApiaryId('')}><XCircleIcon className="w-3 h-3"/></button>
                        </span>
                    )}
                </div>
            )}

            {/* Main Title Card */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm mb-4 overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                 <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                    <LeafIcon className="w-8 h-8 text-emerald-500 mb-2"/>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-none">Fioriture Stagionali</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Monitora le fioriture per i tuoi apiari.</p>
                 </div>
            </div>

            {/* Toolbar: Anno e Apiari (Tabs) */}
            <div className="px-1 py-2 flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0 mb-2">
                <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-amber-500 outline-none h-fit">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="flex gap-2">
                    {apiaries.map(apiary => (
                        <button 
                            key={apiary.id} 
                            onClick={() => { 
                                if (apiaries.length === 1) return;
                                const newSet = new Set(selectedApiaryIds); 
                                if (newSet.has(apiary.id)) newSet.delete(apiary.id); 
                                else newSet.add(apiary.id); 
                                setSelectedApiaryIds(newSet); 
                            }} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                                selectedApiaryIds.has(apiary.id) 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' 
                                : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                            } ${apiaries.length === 1 ? 'cursor-default opacity-100' : 'cursor-pointer'}`}
                        >
                            {apiary.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content: Blooms List (Scroll handled by parent now) */}
            <div className="space-y-4 pb-4">
                {displayedBlooms.length > 0 ? (
                displayedBlooms
                    .map(bloom => (
                    // CARD FIORITURA RIDOTTA (Padding p-3, Title text-lg)
                    <div key={bloom.id} className="p-3 rounded-lg border-l-4 border-emerald-500 bg-white dark:bg-slate-800 shadow-sm border-y border-r border-slate-200 dark:border-slate-700 relative group transition-all">
                        <div className="flex justify-between items-start">
                            <div className="w-full pr-8">
                                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 text-lg leading-tight mb-0.5">{bloom.plantName}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {new Date(bloom.startDate).toLocaleDateString()} 
                                    {bloom.endDate ? ` - ${new Date(bloom.endDate).toLocaleDateString()}` : ''}
                                </p>
                                {bloom.notes && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">"{bloom.notes}"</p>}
                                
                                {/* Badges Orizzontali (risparmio spazio verticale) */}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {bloom.notificationEnabled && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-950/40 border border-amber-900/50 px-2 py-1 rounded-md w-fit">
                                            <BellIcon className="w-3 h-3" />
                                            <span>Notifica (-{bloom.notificationDaysBefore}gg)</span>
                                        </div>
                                    )}
                                    {bloom.emailReminder && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-blue-400 bg-blue-950/40 border border-blue-900/50 px-2 py-1 rounded-md w-fit">
                                            <MailIcon className="w-3 h-3" />
                                            <span>Email</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Pulsante Menu 3 Puntini */}
                            <div className="absolute top-2 right-2">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuBloomId(openMenuBloomId === bloom.id ? null : bloom.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                >
                                    <MoreVerticalIcon className="w-5 h-5"/>
                                </button>

                                {/* Dropdown Menu */}
                                {openMenuBloomId === bloom.id && (
                                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuBloomId(null);
                                                openEditBloom(bloom);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
                                        >
                                            <EditIcon className="w-4 h-4"/> Modifica
                                        </button>
                                        <div className="h-px bg-slate-100 dark:bg-slate-600"></div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuBloomId(null);
                                                requestDeleteBloom(bloom.id);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                        >
                                            <TrashIcon className="w-4 h-4"/> Elimina
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        <LeafIcon className="w-16 h-16 mx-auto mb-3 opacity-20 text-emerald-500"/>
                        <p className="text-lg font-medium text-slate-400">
                            {filterText || filterApiaryId || filterPlantName ? "Nessuna fioritura trovata con questi filtri." : "Nessuna fioritura registrata"}
                        </p>
                        {!filterText && !filterApiaryId && !filterPlantName && <p className="text-xs">Seleziona un apiario e aggiungi la prima fioritura per il {year}.</p>}
                    </div>
                )}
            </div>

            {/* FAB per aggiungere Fioritura - Raised up */}
            <button 
                onClick={() => {
                    if (!isAnyApiarySelected) {
                        setAlertMessage("Seleziona almeno un apiario prima di aggiungere una fioritura.");
                        return;
                    }
                    setBloomToEdit(null);
                    setIsBloomModalOpen(true);
                }}
                disabled={!isAnyApiarySelected}
                className={`fixed right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-700 transition-all duration-300 z-50 disabled:opacity-50 disabled:cursor-not-allowed ${isScrolling ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                title="Aggiungi Fioritura"
                style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
            >
                <PlusIcon className="w-8 h-8"/>
            </button>

            <Modal isOpen={isBloomModalOpen} onClose={() => setIsBloomModalOpen(false)} title={bloomToEdit ? "Modifica Fioritura" : "Nuova Fioritura"}>
                {/* Modal Content remains the same */}
                <div className="space-y-4 text-slate-800 dark:text-slate-200">
                    <div>
                        <label className="block text-sm font-medium mb-1">Pianta</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={newBloomPlant || plantSearchQuery} 
                                onChange={(e) => {
                                    setPlantSearchQuery(e.target.value);
                                    setNewBloomPlant(e.target.value);
                                }}
                                placeholder="Cerca o scrivi..." 
                                className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700"
                            />
                            <SearchIcon className="absolute left-2 top-2.5 w-5 h-5 text-slate-400" />
                        </div>
                        {plantSearchQuery && !filteredPlants.includes(newBloomPlant) && (
                            <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 shadow-lg">
                                {filteredPlants.map(plant => (
                                    <div 
                                        key={plant} 
                                        onClick={() => {
                                            setNewBloomPlant(plant);
                                            setPlantSearchQuery('');
                                        }}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-sm"
                                    >
                                        {plant}
                                    </div>
                                ))}
                                {filteredPlants.length === 0 && (
                                    <div className="p-2 text-xs text-slate-500 italic">Nessun suggerimento. Usa "{plantSearchQuery}"</div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Inizio</label>
                            <input type="date" value={newBloomStart} onChange={(e) => setNewBloomStart(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Fine</label>
                            <input type="date" value={newBloomEnd} onChange={(e) => setNewBloomEnd(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">Note specifiche</label>
                        <textarea value={newBloomNotes} onChange={(e) => setNewBloomNotes(e.target.value)} rows={2} placeholder="Es. Raccolto scarso per pioggia..." className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-4">
                        <div className="flex justify-between items-center">
                            <label htmlFor="notify" className="text-sm font-medium flex items-center gap-2 cursor-pointer select-none">
                                <BellIcon className="w-4 h-4 text-amber-500" />
                                Ricordamelo l'anno prossimo
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    id="notify" 
                                    checked={newBloomNotify} 
                                    onChange={(e) => {
                                        setNewBloomNotify(e.target.checked);
                                        if (!e.target.checked) setNewBloomEmail(false);
                                    }} 
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                            </label>
                        </div>
                        
                        {newBloomNotify && (
                            <div className="pl-6 space-y-4 animate-fade-in">
                                <div className="text-sm flex items-center gap-2">
                                    <span>Avvisami</span>
                                    <input 
                                        type="number" 
                                        value={newBloomDaysBefore} 
                                        onChange={(e) => setNewBloomDaysBefore(parseInt(e.target.value))} 
                                        className="w-16 p-1 border border-slate-300 dark:border-slate-600 rounded-md text-center bg-white dark:bg-slate-700"
                                    />
                                    <span>giorni prima</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Data stimata: {new Date(year + 1, new Date(newBloomStart || Date.now()).getMonth(), new Date(newBloomStart || Date.now()).getDate() - newBloomDaysBefore).toLocaleDateString()}
                                </div>
                                
                                <div className="flex justify-between items-center">
                                    <label htmlFor="notifyEmail" className="text-sm font-medium flex items-center gap-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
                                        <MailIcon className="w-4 h-4 text-blue-500" />
                                        Avvisami anche tramite mail
                                    </label>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            id="notifyEmail" 
                                            checked={newBloomEmail} 
                                            onChange={(e) => setNewBloomEmail(e.target.checked)} 
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setIsBloomModalOpen(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md text-sm font-medium">Annulla</button>
                        <button 
                            onClick={handleSaveBloom} 
                            disabled={!newBloomPlant || !newBloomStart || selectedApiaryIds.size === 0}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {bloomToEdit ? "Salva Modifiche" : "Salva Fioritura"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!bloomToDelete}
                onClose={() => setBloomToDelete(null)}
                title="Conferma Eliminazione"
            >
                <div className="space-y-4 text-slate-800 dark:text-slate-200">
                    <p>
                        Sei sicuro di voler eliminare questa fioritura?
                    </p>
                    <div className="flex justify-end gap-4 pt-4">
                        <button onClick={() => setBloomToDelete(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 rounded-md">Annulla</button>
                        <button onClick={confirmDeleteBloom} className="px-4 py-2 bg-red-600 text-white rounded-md">Elimina</button>
                    </div>
                </div>
            </Modal>

            {/* Alert Modal */}
            <Modal isOpen={!!alertMessage} onClose={() => setAlertMessage(null)} title="Attenzione">
                <div className="flex flex-col items-center justify-center p-4 text-center">
                    <WarningIcon className="w-12 h-12 text-amber-500 mb-4" />
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
        </div>
    );
};

export default ToolsView;
