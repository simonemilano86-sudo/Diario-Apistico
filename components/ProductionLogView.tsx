import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx-js-style';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Apiary, Harvest, User, HoneyType } from '../types';
import { BackArrowIcon, ClipboardIcon, PlusIcon, EditIcon, TrashIcon, JarIcon } from './Icons';
import Modal from './Modal';

interface ProductionLogViewProps {
    apiaries: Apiary[];
    onBack: () => void;
    user: User | null;
    onOpenPremium: () => void;
    onAddHarvest: (apiaryId: string, harvest: Harvest) => void;
    onEditHarvest: (apiaryId: string, harvest: Harvest) => void;
    onDeleteHarvest: (apiaryId: string, harvestId: string) => void;
    canEdit: boolean;
    canDelete: boolean;
}

const ProductionLogView: React.FC<ProductionLogViewProps> = ({ apiaries, onBack, user, onOpenPremium, onAddHarvest, onEditHarvest, onDeleteHarvest, canEdit, canDelete }) => {
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterApiaryId, setFilterApiaryId] = useState<string>('all');
    
    // Dati Aziendali
    const companyName = localStorage.getItem('diario_apistico_company_name') || '';
    const bdnCode = localStorage.getItem('diario_apistico_bdn_code') || '';

    const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
    const [harvestToEdit, setHarvestToEdit] = useState<{apiaryId: string, harvest: Harvest} | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{apiaryId: string, harvestId: string} | null>(null);

    // Form state
    const [formApiaryId, setFormApiaryId] = useState<string>('');
    const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [formProductSelect, setFormProductSelect] = useState<string>(HoneyType.MILLEFIORI);
    const [formProductCustom, setFormProductCustom] = useState<string>('');
    const [formBatchNumber, setFormBatchNumber] = useState<string>('');
    const [formSupers, setFormSupers] = useState<string>('');
    const [formKg, setFormKg] = useState<string>('');
    const [formNotes, setFormNotes] = useState<string>('');

    const openAddModal = () => {
        setHarvestToEdit(null);
        setFormApiaryId(apiaries[0]?.id || '');
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormProductSelect(HoneyType.MILLEFIORI);
        setFormProductCustom('');
        setFormBatchNumber('');
        setFormSupers('');
        setFormKg('');
        setFormNotes('');
        setIsHarvestModalOpen(true);
    };

    const openEditModal = (apiaryId: string, harvest: Harvest) => {
        setHarvestToEdit({apiaryId, harvest});
        setFormApiaryId(apiaryId);
        setFormDate(harvest.date);
        
        const isStandardType = Object.values(HoneyType).includes(harvest.product as HoneyType);
        if (isStandardType) {
            setFormProductSelect(harvest.product);
            setFormProductCustom('');
        } else {
            setFormProductSelect(HoneyType.ALTRO);
            setFormProductCustom(harvest.product);
        }

        setFormBatchNumber(harvest.batchNumber || '');
        setFormSupers(harvest.totalSupers?.toString() || '');
        setFormKg(harvest.totalKg.toString());
        setFormNotes(harvest.notes || '');
        setIsHarvestModalOpen(true);
    };

    const handleSaveHarvest = () => {
        const finalProduct = formProductSelect === HoneyType.ALTRO ? formProductCustom : formProductSelect;
        if (!formApiaryId || !formDate || !finalProduct || !formKg) return;
        
        const newHarvest: Harvest = {
            id: harvestToEdit ? harvestToEdit.harvest.id : crypto.randomUUID(),
            date: formDate,
            product: finalProduct,
            batchNumber: formBatchNumber || undefined,
            totalSupers: formSupers ? parseInt(formSupers) : undefined,
            totalKg: parseFloat(formKg),
            operator: user?.name || user?.email || 'Operatore',
            notes: formNotes
        };

        if (harvestToEdit) {
            onEditHarvest(formApiaryId, newHarvest);
            // If apiary changed, we need to handle it. For simplicity, we assume apiary doesn't change or we handle it in App.tsx
            if (formApiaryId !== harvestToEdit.apiaryId) {
                onDeleteHarvest(harvestToEdit.apiaryId, harvestToEdit.harvest.id);
                onAddHarvest(formApiaryId, newHarvest);
            }
        } else {
            onAddHarvest(formApiaryId, newHarvest);
        }
        setIsHarvestModalOpen(false);
    };

    const allHarvests = useMemo(() => {
        const harvests: {
            apiaryName: string;
            apiaryId: string;
            harvest: Harvest;
        }[] = [];

        apiaries.forEach(apiary => {
            if (apiary.harvests) {
                apiary.harvests.forEach(h => {
                    harvests.push({
                        apiaryName: apiary.name,
                        apiaryId: apiary.id,
                        harvest: h
                    });
                });
            }
        });

        return harvests.sort((a, b) => new Date(b.harvest.date).getTime() - new Date(a.harvest.date).getTime());
    }, [apiaries]);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        allHarvests.forEach(h => {
            const year = new Date(h.harvest.date).getFullYear().toString();
            years.add(year);
        });
        const currentYear = new Date().getFullYear().toString();
        years.add(currentYear);
        return Array.from(years).sort().reverse();
    }, [allHarvests]);

    const filteredHarvests = useMemo(() => {
        return allHarvests.filter(h => {
            const yearMatch = filterYear === 'all' || new Date(h.harvest.date).getFullYear().toString() === filterYear;
            const apiaryMatch = filterApiaryId === 'all' || h.apiaryId === filterApiaryId;
            return yearMatch && apiaryMatch;
        });
    }, [allHarvests, filterYear, filterApiaryId]);

    const summaryByProduct = useMemo(() => {
        const summary: Record<string, { supers: number, kg: number }> = {};
        filteredHarvests.forEach(h => {
            if (!summary[h.harvest.product]) {
                summary[h.harvest.product] = { supers: 0, kg: 0 };
            }
            summary[h.harvest.product].supers += h.harvest.totalSupers || 0;
            summary[h.harvest.product].kg += h.harvest.totalKg || 0;
        });
        return summary;
    }, [filteredHarvests]);

    const handleExportExcel = async () => {
        if (user?.plan === 'free') {
            onOpenPremium();
            return;
        }

        if (filteredHarvests.length === 0) return;

        // Intestazione Aziendale
        const companyHeader = [
            ['RESOCONTO PRODUZIONE'],
            [`NOME ALLEVATORE: ${companyName}`],
            [`CODICE BDN: ${bdnCode.toUpperCase()}`],
            [] // Riga vuota
        ];

        const headers = ['DATA', 'APIARIO', 'PRODOTTO', 'NUMERO LOTTO', 'MELARI ESTRATTI', 'KG OTTENUTI', 'OPERATORE', 'NOTE'];
        const data = filteredHarvests.map(h => [
            new Date(h.harvest.date).toLocaleDateString('it-IT'),
            h.apiaryName,
            h.harvest.product,
            h.harvest.batchNumber || '-',
            h.harvest.totalSupers || '-',
            h.harvest.totalKg,
            h.harvest.operator || '-',
            h.harvest.notes || '-'
        ]);
        
        const wsData = [...companyHeader, headers, ...data];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Aumenta l'altezza della riga dell'header
        ws['!rows'] = [];
        ws['!rows'][4] = { hpt: 30 }; // hpt = height in points

        // Stili per le celle
        const borderStyle = {
            top: { style: "thin", color: { rgb: "D1D5DB" } },
            bottom: { style: "thin", color: { rgb: "D1D5DB" } },
            left: { style: "thin", color: { rgb: "D1D5DB" } },
            right: { style: "thin", color: { rgb: "D1D5DB" } }
        };

        const titleStyle = {
            font: { bold: true, sz: 14, color: { rgb: "D97706" } } // Amber
        };

        const companyInfoStyle = {
            font: { bold: true, sz: 11 }
        };

        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "D97706" } }, // Amber-600
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

        ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Resoconto Produzione");

        const fileName = `resoconto_produzione_${filterYear !== 'all' ? filterYear : 'completo'}.xlsx`;

        if (Capacitor.isNativePlatform()) {
            try {
                const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Cache
                });
                await Share.share({
                    title: 'Resoconto Produzione',
                    text: 'Ecco il resoconto della produzione esportato in Excel.',
                    url: savedFile.uri,
                    dialogTitle: 'Condividi o salva il resoconto'
                });
            } catch (error) {
                console.error('Errore durante il salvataggio o la condivisione:', error);
                alert('Si è verificato un errore durante l\'esportazione del file.');
            }
        } else {
            XLSX.writeFile(wb, fileName);
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="w-10 h-10 bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600">
                        <BackArrowIcon className="w-5 h-5"/>
                    </button>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <JarIcon className="w-6 h-6 text-amber-600" />
                        Resoconto Produzione
                    </h2>
                </div>
            </div>

            <div className="space-y-6">
                {/* Filtri e Azioni */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
                        <div className="flex gap-4 w-full sm:w-auto">
                            <div className="flex-1 sm:w-32">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Anno</label>
                                <select 
                                    value={filterYear} 
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="all">Tutti gli anni</option>
                                    {availableYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 sm:w-48">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Apiario</label>
                                <select 
                                    value={filterApiaryId} 
                                    onChange={(e) => setFilterApiaryId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value="all">Tutti gli apiari</option>
                                    {apiaries.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={handleExportExcel}
                                disabled={filteredHarvests.length === 0}
                                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                                    filteredHarvests.length > 0 
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' 
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <ClipboardIcon className="w-4 h-4" />
                                Esporta Excel
                            </button>
                            {canEdit && (
                                <button 
                                    onClick={openAddModal}
                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 shadow-md transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Nuovo Lotto
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Riassunto */}
                {Object.keys(summaryByProduct).length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-800 dark:text-white">Riassunto Produzione {filterYear !== 'all' ? filterYear : ''}</h3>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(summaryByProduct).map(([product, totals]) => (
                                <div key={product} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                                    <span className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2">{product}</span>
                                    <span className="text-3xl font-black text-amber-600 dark:text-amber-500">{totals.kg.toFixed(1)} <span className="text-sm font-normal">Kg</span></span>
                                    {totals.supers > 0 && <span className="text-xs text-amber-700/70 dark:text-amber-500/70 mt-1">da {totals.supers} melari</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tabella Dettaglio */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-slate-800 dark:text-white">Dettaglio Lotti di Smielatura</h3>
                    </div>
                    {filteredHarvests.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Data</th>
                                        <th className="px-4 py-3 font-semibold">Apiario</th>
                                        <th className="px-4 py-3 font-semibold">Prodotto</th>
                                        <th className="px-4 py-3 font-semibold text-right">Melari</th>
                                        <th className="px-4 py-3 font-semibold text-right">Kg</th>
                                        <th className="px-4 py-3 font-semibold text-center">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHarvests.map((h, idx) => (
                                        <tr key={h.harvest.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                {new Date(h.harvest.date).toLocaleDateString('it-IT')}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                                {h.apiaryName}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                                {h.harvest.product}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                                                {h.harvest.totalSupers || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-500">
                                                {h.harvest.totalKg}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center gap-2">
                                                    {canEdit && (
                                                        <button onClick={() => openEditModal(h.apiaryId, h.harvest)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button onClick={() => setDeleteConfirmation({apiaryId: h.apiaryId, harvestId: h.harvest.id})} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center justify-center">
                            <JarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Nessun lotto di smielatura trovato.</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Registra la tua prima smielatura usando il pulsante "Nuovo Lotto".</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Aggiungi/Modifica Lotto */}
            <Modal isOpen={isHarvestModalOpen} onClose={() => setIsHarvestModalOpen(false)} title={harvestToEdit ? "Modifica Lotto" : "Registra Smielatura"}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Apiario di provenienza</label>
                        <select value={formApiaryId} onChange={e => setFormApiaryId(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                            {apiaries.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Data Smielatura</label>
                        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Prodotto</label>
                        <select 
                            value={formProductSelect} 
                            onChange={e => setFormProductSelect(e.target.value)} 
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                        >
                            {Object.values(HoneyType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {formProductSelect === HoneyType.ALTRO && (
                            <input 
                                type="text" 
                                value={formProductCustom} 
                                onChange={e => setFormProductCustom(e.target.value)} 
                                placeholder="Specifica il prodotto..." 
                                className="w-full mt-2 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white" 
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Numero Lotto (opzionale)</label>
                        <input type="text" value={formBatchNumber} onChange={e => setFormBatchNumber(e.target.value)} placeholder="es. L-2026-01" className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Melari estratti (opzionale)</label>
                            <input type="number" value={formSupers} onChange={e => setFormSupers(e.target.value)} placeholder="es. 15" className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Kg ottenuti *</label>
                            <input type="number" step="0.1" value={formKg} onChange={e => setFormKg(e.target.value)} placeholder="es. 150.5" className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Note (opzionale)</label>
                        <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Giorni di decantazione, umidità, ecc." className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white h-24 resize-none"></textarea>
                    </div>
                    <button onClick={handleSaveHarvest} disabled={!formApiaryId || !formDate || (formProductSelect === HoneyType.ALTRO ? !formProductCustom : !formProductSelect) || !formKg} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold shadow-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                        Salva Lotto
                    </button>
                </div>
            </Modal>

            {/* Modal Conferma Eliminazione */}
            {deleteConfirmation && (
                <Modal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} title="Elimina Lotto">
                    <div className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-300">Sei sicuro di voler eliminare questo lotto di smielatura? L'operazione non può essere annullata.</p>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setDeleteConfirmation(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                Annulla
                            </button>
                            <button onClick={() => { onDeleteHarvest(deleteConfirmation.apiaryId, deleteConfirmation.harvestId); setDeleteConfirmation(null); }} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors shadow-md">
                                Elimina
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ProductionLogView;
