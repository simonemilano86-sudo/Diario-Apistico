
import React, { useState, useEffect, useRef } from 'react';
import { Apiary, SeasonalNote } from '../types';
import { logger } from '../services/logger';
import { BackArrowIcon, LeafIcon, ToolsIcon, PaletteIcon, TypographyIcon, UnderlineIcon, BoldIcon, TrashIcon, CheckCircleIcon } from './Icons';

interface ToolsViewProps {
    apiaries: Apiary[];
    onBack: () => void;
    notes: SeasonalNote[];
    onSaveNote: (note: SeasonalNote) => void;
}

const ToolsView: React.FC<ToolsViewProps> = ({ apiaries, onBack, notes, onSaveNote }) => {
    const [selectedCategory, setSelectedCategory] = useState<'blooms' | 'works' | 'debug' | null>(null);
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [selectedApiaryIds, setSelectedApiaryIds] = useState<Set<string>>(new Set());
    
    const [editorContent, setEditorContent] = useState('');
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [activeTool, setActiveTool] = useState<'none' | 'color' | 'font'>('none');
    const [copyFeedback, setCopyFeedback] = useState(false);
    
    const editorRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [noteStyle, setNoteStyle] = useState({ fontFamily: 'sans-serif', fontSize: '16px', color: '#e2e8f0' });
    const [viewportHeight, setViewportHeight] = useState<string>('100%');

    const currentYear = new Date().getFullYear();
    const startYear = 2024;
    const years = Array.from({ length: (currentYear - startYear) + 1 }, (_, i) => startYear + i);
    const colors = ['#e2e8f0', '#fca5a5', '#fcd34d', '#86efac', '#93c5fd', '#d8b4fe'];
    const fonts = [{ label: 'Sans', value: 'sans-serif' }, { label: 'Serif', value: 'serif' }, { label: 'Mono', value: 'monospace' }, { label: 'Hand', value: 'cursive' }];
    const fontSizes = [{ label: 'S', value: '2' }, { label: 'M', value: '3' }, { label: 'L', value: '5' }, { label: 'XL', value: '6' }];

    useEffect(() => {
        const handleResize = () => { if (window.visualViewport) setViewportHeight(`${window.visualViewport.height}px`); };
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
            handleResize();
        }
        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
        };
    }, []);

    useEffect(() => {
        if (!selectedCategory || selectedCategory === 'debug') return;
        const existingNote = notes.find(n => n.type === selectedCategory && n.year === year);
        if (existingNote) {
            setCurrentNoteId(existingNote.id);
            setEditorContent(existingNote.content);
            setSelectedApiaryIds(new Set(existingNote.apiaryIds));
            if (existingNote.style) setNoteStyle(existingNote.style);
        } else {
            setCurrentNoteId(null);
            setEditorContent('');
            setSelectedApiaryIds(new Set());
            setNoteStyle({ fontFamily: 'sans-serif', fontSize: '16px', color: '#e2e8f0' });
        }
        setSaveStatus('idle');
    }, [selectedCategory, year, notes]);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== editorContent) {
            editorRef.current.innerHTML = editorContent;
        }
    }, [editorContent, selectedCategory]);

    const handleSave = () => {
        if (!selectedCategory || selectedCategory === 'debug') return;
        setSaveStatus('saving');
        const note: SeasonalNote = {
            id: currentNoteId || Date.now().toString(),
            type: selectedCategory as 'blooms' | 'works',
            year,
            apiaryIds: Array.from(selectedApiaryIds),
            content: editorContent,
            updatedAt: new Date().toISOString(),
            style: noteStyle
        };
        onSaveNote(note);
        setCurrentNoteId(note.id);
        setTimeout(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }, 500);
    };

    const handleCopyLogs = () => {
        const logText = logger.getLogs().map(l => `[${l.timestamp}] ${l.level.toUpperCase()}: ${l.message}`).join('\n');
        navigator.clipboard.writeText(logText).then(() => {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        });
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (editorRef.current) setEditorContent(editorRef.current.innerHTML);
    };

    const preventFocusLoss = (e: React.MouseEvent) => e.preventDefault();

    if (!selectedCategory) {
        return (
            <div className="animate-fade-in flex flex-col h-[calc(100vh-80px)] p-4 max-w-4xl mx-auto">
                <div className="flex-shrink-0 mb-2">
                    <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition text-sm">
                        <BackArrowIcon className="w-4 h-4"/>
                        Torna alla Home
                    </button>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 text-center">Diario Stagionale</h2>
                <div className="flex flex-col md:flex-row gap-4 flex-grow h-full overflow-hidden pb-4">
                    <button onClick={() => setSelectedCategory('blooms')} className="flex-1 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-2 border-green-200 dark:border-green-700 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
                        <div className="bg-green-500 text-white p-4 rounded-full mb-3 shadow-md"><LeafIcon className="w-12 h-12" /></div>
                        <h3 className="text-xl font-bold text-green-800 dark:text-green-200">Fioriture</h3>
                    </button>
                    <button onClick={() => setSelectedCategory('works')} className="flex-1 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-2 border-amber-200 dark:border-amber-700 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
                        <div className="bg-amber-500 text-white p-4 rounded-full mb-3 shadow-md"><ToolsIcon className="w-12 h-12" /></div>
                        <h3 className="text-xl font-bold text-amber-800 dark:text-amber-200">Lavori</h3>
                    </button>
                </div>
                {/* Pulsante Debug Segreto */}
                <button onClick={() => setSelectedCategory('debug')} className="mt-4 text-slate-400 text-[10px] text-center opacity-30 hover:opacity-100 transition">Vedi Log di Sistema</button>
            </div>
        );
    }

    if (selectedCategory === 'debug') {
        return (
            <div className="fixed inset-0 bg-slate-900 text-slate-200 flex flex-col z-50 p-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 1.5rem)' }}>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setSelectedCategory(null)} className="p-2 bg-slate-800 rounded-md"><BackArrowIcon className="w-6 h-6"/></button>
                    <h2 className="text-lg font-bold">Log di Sistema</h2>
                    <div className="flex gap-2">
                         <button onClick={handleCopyLogs} className={`flex items-center gap-1 p-2 rounded-md transition ${copyFeedback ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                            {copyFeedback ? <CheckCircleIcon className="w-5 h-5" /> : <BoldIcon className="w-5 h-5 rotate-90" />}
                            <span className="text-xs font-bold">{copyFeedback ? 'Copiato!' : 'Copia Log'}</span>
                        </button>
                        <button onClick={() => { logger.clear(); }} className="p-2 text-red-400"><TrashIcon className="w-6 h-6"/></button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto font-mono text-[10px] space-y-1 bg-black p-3 rounded-lg border border-slate-700">
                    {logger.getLogs().length > 0 ? logger.getLogs().map((entry, idx) => (
                        <div key={idx} className={entry.level === 'error' ? 'text-red-400' : entry.level === 'warn' ? 'text-yellow-400' : 'text-green-400'}>
                            <span className="opacity-50">[{entry.timestamp}]</span> {entry.message}
                        </div>
                    )) : <div className="text-slate-500 italic">Nessun log presente...</div>}
                </div>
                <p className="text-[10px] text-slate-400 mt-2 bg-slate-800/50 p-2 rounded">
                    <strong>Ambiente:</strong> {window.isSecureContext ? '✅ Sicuro (HTTPS)' : '❌ Non Sicuro (HTTP)'}<br/>
                    <strong>UserAgent:</strong> {navigator.userAgent.slice(0, 50)}...
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Copia i log e incollali nella chat se riscontri problemi col microfono.</p>
            </div>
        );
    }

    const categoryTitle = selectedCategory === 'blooms' ? 'Fioriture' : 'Lavori';

    return (
        <div ref={containerRef} className="fixed inset-0 bg-[#1e1e1e] text-slate-200 flex flex-col z-50" style={{ height: viewportHeight }}>
            <div className="flex justify-between items-center px-4 py-3 bg-[#1e1e1e] border-b border-white/5 flex-shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top), 1.5rem)' }}>
                <button onClick={() => setSelectedCategory(null)} className="text-slate-400 hover:text-white transition p-1"><BackArrowIcon className="w-6 h-6"/></button>
                <h2 className="text-lg font-medium text-slate-200">{categoryTitle}</h2>
                <button onClick={handleSave} className={`px-3 py-1 rounded text-sm font-semibold transition ${saveStatus === 'saved' ? 'text-green-400' : 'text-amber-500 hover:text-amber-400'}`}>
                    {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? 'Salvato' : 'Salva'}
                </button>
            </div>
            <div className="px-4 py-2 bg-[#1e1e1e] flex gap-2 overflow-x-auto border-b border-white/5 scrollbar-hide flex-shrink-0">
                <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="bg-[#2d2d2d] text-xs text-slate-300 px-3 py-1.5 rounded-full border-none focus:ring-0">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="flex gap-2">
                    {apiaries.map(apiary => (
                        <button key={apiary.id} onClick={() => { const newSet = new Set(selectedApiaryIds); if (newSet.has(apiary.id)) newSet.delete(apiary.id); else newSet.add(apiary.id); setSelectedApiaryIds(newSet); }} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${selectedApiaryIds.has(apiary.id) ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-[#2d2d2d] text-slate-400 border border-transparent'}`}>{apiary.name}</button>
                    ))}
                </div>
            </div>
            <div ref={editorRef} contentEditable onInput={(e) => setEditorContent(e.currentTarget.innerHTML)} className="flex-grow w-full p-6 bg-[#1e1e1e] text-slate-200 border-none outline-none overflow-y-auto whitespace-pre-wrap leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600" data-placeholder="Inizia a scrivere qui..." style={{ fontFamily: noteStyle.fontFamily, fontSize: noteStyle.fontSize, color: noteStyle.color, caretColor: '#f59e0b' }} />
            {activeTool !== 'none' && (
                <div className="bg-[#262626] border-t border-white/5 p-4 pb-2 animate-slide-up flex-shrink-0">
                    {activeTool === 'color' && <div className="flex justify-around items-center">{colors.map(color => <button key={color} onMouseDown={preventFocusLoss} onClick={() => execCmd('foreColor', color)} className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition" style={{ backgroundColor: color }} />)}</div>}
                    {activeTool === 'font' && <div className="space-y-4">
                        <div className="flex justify-between items-center gap-2">{fonts.map(font => <button key={font.value} onMouseDown={preventFocusLoss} onClick={() => execCmd('fontName', font.value)} className="px-3 py-1 text-xs rounded transition bg-[#333] text-slate-400 hover:text-white" style={{ fontFamily: font.value }}>{font.label}</button>)}</div>
                        <div className="flex justify-between items-center bg-[#333] rounded-lg p-1">{fontSizes.map(size => <button key={size.value} onMouseDown={preventFocusLoss} onClick={() => execCmd('fontSize', size.value)} className="flex-1 py-1 text-xs rounded transition text-slate-400 hover:text-white">{size.label}</button>)}</div>
                    </div>}
                </div>
            )}
            <div className="bg-[#262626] border-t border-white/5 p-2 flex items-center gap-2 flex-shrink-0" style={{ paddingBottom: '0.5rem' }}>
                <button onMouseDown={preventFocusLoss} onClick={() => setActiveTool(activeTool === 'color' ? 'none' : 'color')} className={`p-2 rounded-full transition ${activeTool === 'color' ? 'bg-white/10 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}><PaletteIcon className="w-6 h-6" /></button>
                <button onMouseDown={preventFocusLoss} onClick={() => setActiveTool(activeTool === 'font' ? 'none' : 'font')} className={`p-2 rounded-full transition ${activeTool === 'font' ? 'bg-white/10 text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}><TypographyIcon className="w-6 h-6" /></button>
                <button onMouseDown={preventFocusLoss} onClick={() => execCmd('bold')} className="p-2 rounded-full transition text-slate-400 hover:text-slate-200 hover:bg-white/5"><BoldIcon className="w-6 h-6" /></button>
                <button onMouseDown={preventFocusLoss} onClick={() => execCmd('underline')} className="p-2 rounded-full transition text-slate-400 hover:text-slate-200 hover:bg-white/5"><UnderlineIcon className="w-6 h-6" /></button>
                <div className="flex-grow"></div>
            </div>
        </div>
    );
};

export default ToolsView;
