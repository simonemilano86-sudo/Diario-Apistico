import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Apiary, Inspection, User } from '../types';
import { BackArrowIcon, ClipboardIcon, SearchIcon } from './Icons';
import Modal from './Modal';

interface TreatmentsLogViewProps {
    apiaries: Apiary[];
    onBack: () => void;
    user: User | null;
    onOpenPremium: () => void;
}

const TreatmentsLogView: React.FC<TreatmentsLogViewProps> = ({ apiaries, onBack, user, onOpenPremium }) => {
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterApiaryId, setFilterApiaryId] = useState<string>('all');
    
    // Dati Aziendali
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [bdnCode, setBdnCode] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
        const mainContainer = document.querySelector('.overflow-y-auto');
        if (mainContainer) mainContainer.scrollTo(0, 0);

        const savedName = localStorage.getItem('diario_apistico_company_name');
        const savedBdn = localStorage.getItem('diario_apistico_bdn_code');
        if (savedName) setCompanyName(savedName);
        if (savedBdn) setBdnCode(savedBdn);
    }, []);

    const saveCompanyData = () => {
        localStorage.setItem('diario_apistico_company_name', companyName);
        localStorage.setItem('diario_apistico_bdn_code', bdnCode);
        setIsCompanyModalOpen(false);
    };

    // Estrai tutti i trattamenti e nutrizioni
    const allTreatments = useMemo(() => {
        const treatments: {
            id: string;
            date: string;
            apiaryName: string;
            apiaryLocation: string;
            apiaryId: string;
            hiveName: string;
            type: string;
            product: string;
            lot?: string;
            quantity?: string;
            withdrawal?: string;
            operator?: string;
        }[] = [];

        apiaries.forEach(apiary => {
            apiary.hives.forEach(hive => {
                hive.inspections?.forEach(insp => {
                    if (insp.treatment && insp.treatment !== 'Nessuno' && insp.treatment !== 'Blocco di Covata') {
                        treatments.push({
                            id: insp.id,
                            date: insp.date,
                            apiaryName: apiary.name,
                            apiaryLocation: apiary.location || '',
                            apiaryId: apiary.id,
                            hiveName: hive.name,
                            type: 'Trattamento',
                            product: insp.treatment || '',
                            lot: insp.treatmentLot || '',
                            quantity: insp.treatmentQuantity || '',
                            withdrawal: insp.treatmentWithdrawal || '0 giorni',
                            operator: insp.treatmentOperator || ''
                        });
                    }
                });
            });
        });

        // Ordina dal più vecchio al più recente (ordine cronologico)
        return treatments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [apiaries]);

    // Anni disponibili per il filtro
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        allTreatments.forEach(t => {
            if (t.date) {
                years.add(t.date.substring(0, 4));
            }
        });
        const currentYear = new Date().getFullYear().toString();
        years.add(currentYear);
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allTreatments]);

    // Applica i filtri
    const filteredTreatments = useMemo(() => {
        return allTreatments.filter(t => {
            const matchYear = filterYear === 'all' || t.date.startsWith(filterYear);
            const matchApiary = filterApiaryId === 'all' || t.apiaryId === filterApiaryId;
            return matchYear && matchApiary;
        });
    }, [allTreatments, filterYear, filterApiaryId]);

    const handleExportExcel = async () => {
        if (user?.plan === 'free') {
            onOpenPremium();
            return;
        }

        if (!companyName || !bdnCode) {
            setIsCompanyModalOpen(true);
            return;
        }

        if (filteredTreatments.length === 0) return;

        // Intestazione Aziendale
        const companyHeader = [
            ['REGISTRO TRATTAMENTI'],
            [`NOME ALLEVATORE: ${companyName}`],
            [`CODICE BDN: ${bdnCode.toUpperCase()}`],
            [] // Riga vuota
        ];

        const headers = ['N° REV / PIN REV', 'FORNITORE E DOC. ACQUISTO', 'DATA INIZIO TRATTAMENTO', 'IDENT. APIARIO / INDIRIZZO', 'IDENT. ALVEARE TRATTATO', 'DENOMINAZIONE MEDICINALE VETERINARIO', 'QUANTITÀ SOMMINISTRATA', 'DURATA TRATTAMENTO', 'TEMPO DI ATTESA', 'N. CONFEZIONI RESIDUE', 'OPERATORE / FIRMA'];
        
        const dataRows = filteredTreatments.map(t => {
            // Formatta la data in formato italiano DD/MM/YYYY
            const dateObj = new Date(t.date);
            const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
            
            return [
                '', // N° REV / PIN REV (vuoto per compilazione manuale)
                '', // FORNITORE E DOC. ACQUISTO (vuoto)
                formattedDate,
                `${t.apiaryName} - ${t.apiaryLocation}`,
                t.hiveName,
                t.product, // Qui mettiamo solo il nome poichè il lotto lo abbiamo rimosso
                t.quantity || '-',
                '', // DURATA TRATTAMENTO (vuoto)
                t.withdrawal || '-',
                '', // N. CONFEZIONI RESIDUE (vuoto)
                t.operator || ''
            ];
        });

        // Crea il foglio di lavoro
        const wsData = [...companyHeader, headers, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Aumenta l'altezza della riga dell'header per far entrare il testo a capo
        ws['!rows'] = [];
        ws['!rows'][4] = { hpt: 45 }; // hpt = height in points

        // Stili per le celle
        const borderStyle = {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } }
        };

        const titleStyle = {
            font: { bold: true, sz: 14, color: { rgb: "0F766E" } }
        };

        const companyInfoStyle = {
            font: { bold: true, sz: 11 }
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "0F766E" } }, // Verde bosco / Teal scuro
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: borderStyle
        };

        const rowStyleEven = {
            fill: { fgColor: { rgb: "F3F4F6" } }, // Grigio chiarissimo
            border: borderStyle,
            alignment: { vertical: "center", wrapText: true }
        };

        const rowStyleOdd = {
            fill: { fgColor: { rgb: "FFFFFF" } }, // Bianco
            border: borderStyle,
            alignment: { vertical: "center", wrapText: true }
        };

        // Applica gli stili a tutte le celle
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[address]) continue;
                
                if (R === 0) {
                    ws[address].s = titleStyle;
                } else if (R === 1 || R === 2) {
                    ws[address].s = companyInfoStyle;
                } else if (R === 4) { // Riga degli header della tabella
                    ws[address].s = headerStyle;
                } else if (R > 4) { // Righe dei dati
                    ws[address].s = (R - 4) % 2 === 0 ? rowStyleEven : rowStyleOdd;
                }
            }
        }

        // Imposta la larghezza delle colonne
        ws['!cols'] = [
            { wch: 18 }, // N° REV / PIN REV
            { wch: 25 }, // FORNITORE E DOC. ACQUISTO
            { wch: 22 }, // DATA INIZIO TRATTAMENTO
            { wch: 35 }, // IDENT. APIARIO / INDIRIZZO
            { wch: 22 }, // IDENT. ALVEARE TRATTATO
            { wch: 35 }, // DENOMINAZIONE MEDICINALE VETERINARIO
            { wch: 22 }, // QUANTITÀ SOMMINISTRATA
            { wch: 20 }, // DURATA TRATTAMENTO
            { wch: 15 }, // TEMPO DI ATTESA
            { wch: 20 }, // N. CONFEZIONI RESIDUE
            { wch: 20 }  // OPERATORE / FIRMA
        ];

        // Crea la cartella di lavoro e aggiungi il foglio
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Trattamenti");

        const fileName = `registro_trattamenti_${filterYear !== 'all' ? filterYear : 'completo'}.xlsx`;

        if (Capacitor.isNativePlatform()) {
            try {
                // Genera il file in formato base64 per Capacitor
                const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
                
                // Salva il file nella cache del dispositivo
                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Cache
                });

                // Apri il menu di condivisione nativo (WhatsApp, Email, Salva in File, ecc.)
                await Share.share({
                    title: 'Registro Trattamenti',
                    text: 'Ecco il registro dei trattamenti esportato in Excel.',
                    url: savedFile.uri,
                    dialogTitle: 'Condividi o salva il registro'
                });
            } catch (error) {
                console.error('Errore durante il salvataggio o la condivisione:', error);
                alert('Si è verificato un errore durante l\'esportazione del file.');
            }
        } else {
            // Fallback per il web (PC)
            XLSX.writeFile(wb, fileName);
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 h-10">
                <button onClick={onBack} className="w-10 h-10 bg-white dark:bg-slate-800 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <BackArrowIcon className="w-5 h-5"/>
                </button>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsGuideModalOpen(true)}
                        className="w-10 h-10 bg-white dark:bg-slate-800 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        title="Guida ai Trattamenti"
                    >
                        <span className="text-xl">📖</span>
                    </button>
                    <button 
                        onClick={() => setIsCompanyModalOpen(true)}
                        className="w-10 h-10 bg-white dark:bg-slate-800 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        title="Dati Aziendali"
                    >
                        <span className="text-xl">🪪</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 text-center shadow-sm">
                <div className="bg-teal-100 dark:bg-teal-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-teal-600">
                    <ClipboardIcon className="w-7 h-7"/>
                </div>
                <h2 className="text-xl font-bold">Registro Trattamenti</h2>
            </div>

            <div className="space-y-6">
                {/* Banner Informativo */}
                <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-xl p-4 mb-6 flex gap-3 items-start">
                    <div className="text-xl">💡</div>
                    <p className="text-sm text-teal-800 dark:text-teal-200 leading-relaxed">
                        Questo registro si compila da solo. I trattamenti inseriti durante le ispezioni compariranno automaticamente qui. Esporta i dati in un clic e semplifica la compilazione del registro per l'ASL e la BDN!
                    </p>
                </div>

                {/* Filtri ed Esportazione */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
                        <div className="flex gap-4 w-full sm:w-auto">
                            <div className="flex-1 sm:flex-none">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Anno</label>
                                <select 
                                    value={filterYear} 
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="all">Tutti gli anni</option>
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 sm:flex-none">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Apiario</label>
                                <select 
                                    value={filterApiaryId} 
                                    onChange={(e) => setFilterApiaryId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="all">Tutti gli apiari</option>
                                    {apiaries.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleExportExcel}
                            disabled={filteredTreatments.length === 0}
                            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                                filteredTreatments.length > 0 
                                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md' 
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <ClipboardIcon className="w-4 h-4" />
                            Esporta in Excel
                        </button>
                    </div>
                </div>

                {/* Tabella Dati */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    {filteredTreatments.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">Data</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Apiario</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Arnia</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Tipo</th>
                                        <th className="px-4 py-3 min-w-[150px]">Prodotto/Note</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Quantità</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Operatore</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTreatments.map((t, i) => (
                                        <tr key={`${t.id}-${i}`} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-4 py-3 font-medium whitespace-nowrap">
                                                {new Date(t.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">{t.apiaryName}</td>
                                            <td className="px-4 py-3 whitespace-nowrap font-medium">{t.hiveName}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{t.product}</td>
                                            <td className="px-4 py-3 text-slate-500">{t.quantity || '-'}</td>
                                            <td className="px-4 py-3 text-slate-500">{t.operator || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <SearchIcon className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">Nessun trattamento registrato</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                Vai in un apiario, ispeziona un'arnia e aggiungi un trattamento per vederlo comparire qui!
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Dati Aziendali */}
            <Modal isOpen={isCompanyModalOpen} onClose={() => setIsCompanyModalOpen(false)} title="Dati Aziendali (ASL/BDN)">
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            Questi dati sono obbligatori per esportare un registro trattamenti valido ai fini di legge. Verranno salvati sul tuo dispositivo.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Allevatore / Ragione Sociale</label>
                        <input 
                            type="text" 
                            value={companyName} 
                            onChange={e => setCompanyName(e.target.value)}
                            placeholder="es. Mario Rossi"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Codice Aziendale BDN</label>
                        <input 
                            type="text" 
                            value={bdnCode} 
                            onChange={e => setBdnCode(e.target.value)}
                            placeholder="es. IT000XX000"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none uppercase"
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            onClick={() => setIsCompanyModalOpen(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Annulla
                        </button>
                        <button 
                            onClick={saveCompanyData}
                            disabled={!companyName || !bdnCode}
                            className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Salva Dati
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Guida ai Trattamenti */}
            <Modal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} title="Guida ai Trattamenti">
                <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                    <p className="mb-4">
                        Di seguito una tabella riassuntiva dei farmaci veterinari più comuni in Italia, con i relativi principi attivi e i tempi di attesa per la posa dei melari.
                    </p>
                    
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-bold">Farmaco</th>
                                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-bold">Principio Attivo</th>
                                    <th className="p-3 border-b border-slate-200 dark:border-slate-700 font-bold">Tempo di Attesa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                <tr>
                                    <td className="p-3 font-semibold">Api Bioxal</td>
                                    <td className="p-3">Acido Ossalico</td>
                                    <td className="p-3 text-teal-600 dark:text-teal-400 font-bold">0 giorni</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold">Apivar</td>
                                    <td className="p-3">Amitraz</td>
                                    <td className="p-3 text-teal-600 dark:text-teal-400 font-bold">0 giorni</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold">Apiguard</td>
                                    <td className="p-3">Timolo</td>
                                    <td className="p-3 text-teal-600 dark:text-teal-400 font-bold">0 giorni</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold">Apilife Var</td>
                                    <td className="p-3">Oli essenziali</td>
                                    <td className="p-3 text-teal-600 dark:text-teal-400 font-bold">0 giorni</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold">Formic Pro</td>
                                    <td className="p-3">Acido Formico</td>
                                    <td className="p-3 text-teal-600 dark:text-teal-400 font-bold">0 giorni</td>
                                </tr>
                                <tr>
                                    <td className="p-3 font-semibold">Apistan</td>
                                    <td className="p-3">Tau-fluvalinate</td>
                                    <td className="p-3 text-teal-600 dark:text-teal-400 font-bold">0 giorni</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800 mt-4">
                        <p className="text-amber-800 dark:text-amber-200 text-xs font-bold uppercase mb-1">⚠️ Attenzione</p>
                        <p className="text-amber-800 dark:text-amber-200 text-xs">
                            "0 giorni" significa che non c'è un tempo legale di sospensione previsto dal produttore. Tuttavia, <strong>è sempre vietato effettuare trattamenti con i melari posati</strong> per evitare di inquinare il miele. I melari vanno rimessi solo a trattamento concluso (o dopo la sublimazione/gocciolamento).
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            onClick={() => setIsGuideModalOpen(false)}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TreatmentsLogView;
