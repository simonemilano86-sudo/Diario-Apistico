import React, { useEffect } from 'react';
import { Apiary, ProductionRecord, HoneyType } from '../types';
import { BackArrowIcon, SearchIcon, JarIcon, FlowerIcon, GridIcon, ChevronUpIcon, ChevronDownIcon, MoreVerticalIcon, EditIcon, TrashIcon, PlusIcon } from './Icons';

interface ProductionViewProps {
    apiaries: Apiary[];
    onBack: () => void;
    onOpenResoconto: () => void;
    productionTab: 'honey' | 'pollen' | 'propolis' | 'all';
    setProductionTab: (tab: 'honey' | 'pollen' | 'propolis' | 'all') => void;
    prodFilters: { apiary: string, type: string };
    setProdFilters: (filters: { apiary: string, type: string }) => void;
    isProdFilterOpen: boolean;
    setIsProdFilterOpen: (open: boolean) => void;
    expandedProdGroups: Set<string>;
    setExpandedProdGroups: (groups: Set<string>) => void;
    openProductionMenuId: string | null;
    setOpenProductionMenuId: (id: string | null) => void;
    openProdGroupMenuId: string | null;
    setOpenProdGroupMenuId: (id: string | null) => void;
    setIsProductionModalOpen: (open: boolean) => void;
    setProductionToEdit: (record: ProductionRecord | null) => void;
    setDeleteConfirmation: (item: any) => void;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    isScrolling: boolean;
    isProdFabMenuOpen: boolean;
    setIsProdFabMenuOpen: (open: boolean) => void;
}

const ProductionView: React.FC<ProductionViewProps> = ({
    apiaries, onBack, onOpenResoconto, productionTab, setProductionTab, prodFilters, setProdFilters,
    isProdFilterOpen, setIsProdFilterOpen, expandedProdGroups, setExpandedProdGroups,
    openProductionMenuId, setOpenProductionMenuId, openProdGroupMenuId, setOpenProdGroupMenuId,
    setIsProductionModalOpen, setProductionToEdit, setDeleteConfirmation, canAdd, canEdit, canDelete, isScrolling,
    isProdFabMenuOpen, setIsProdFabMenuOpen
}) => {
    // Resetta i gruppi espansi quando si entra nella vista o si cambia scheda (miele, polline, propoli)
    useEffect(() => {
        setExpandedProdGroups(new Set());
    }, [productionTab, setExpandedProdGroups]);

    const allRecords = apiaries.flatMap(apiary => 
        apiary.hives.flatMap(hive => 
            (hive.productionRecords || []).map(record => ({ 
                ...record, 
                hiveName: hive.name, 
                apiaryName: apiary.name, 
                hiveId: hive.id, 
                apiaryId: apiary.id 
            }))
        )
    );

    const uniqueHoneyTypes = Array.from(new Set(allRecords.map(r => r.honeyType).filter((t): t is HoneyType => !!t))).sort() as string[];
    const uniquePollenTypes = Array.from(new Set(allRecords.map(r => r.pollenType).filter((t): t is string => !!t))).sort() as string[];
    const activeFiltersCount = [prodFilters.apiary, prodFilters.type].filter(Boolean).length;
    
    let typeOptions: string[] = [];
    let typeLabel = "Tipo";
    if (productionTab === 'honey') { typeOptions = uniqueHoneyTypes; typeLabel = "Tipo Miele"; } 
    else if (productionTab === 'pollen') { typeOptions = uniquePollenTypes; typeLabel = "Tipo Polline"; } 
    else { typeOptions = Array.from(new Set([...uniqueHoneyTypes, ...uniquePollenTypes])).sort(); }

    const filteredRecords = allRecords.filter(r => {
        if (prodFilters.apiary && r.apiaryName !== prodFilters.apiary) return false;
        if (prodFilters.type && (r.honeyType || r.pollenType) !== prodFilters.type) return false;
        if (productionTab === 'all') return true;
        if (productionTab === 'honey') return r.melariQuantity !== undefined;
        if (productionTab === 'pollen') return r.pollenGrams !== undefined;
        if (productionTab === 'propolis') return r.propolisNets !== undefined;
        return true;
    });

    const groupedByApiary: Record<string, any> = {};
    filteredRecords.forEach(r => {
        const apiaryId = r.apiaryId;
        if (!groupedByApiary[apiaryId]) {
            groupedByApiary[apiaryId] = {
                id: apiaryId,
                name: r.apiaryName,
                totals: { honey: 0, pollen: 0, propolis: 0 },
                types: {}
            };
        }
        
        const apiaryGroup = groupedByApiary[apiaryId];
        
        if (r.melariQuantity) {
            apiaryGroup.totals.honey += r.melariQuantity;
            const typeKey = `honey-${r.honeyType || 'Sconosciuto'}`;
            if (!apiaryGroup.types[typeKey]) {
                apiaryGroup.types[typeKey] = { id: typeKey, category: 'honey', name: r.honeyType || 'Sconosciuto', records: [], total: 0 };
            }
            apiaryGroup.types[typeKey].records.push({...r, displayQuantity: r.melariQuantity, displayNotes: r.melariNotes});
            apiaryGroup.types[typeKey].total += r.melariQuantity;
        }
        
        if (r.pollenGrams) {
            apiaryGroup.totals.pollen += r.pollenGrams;
            const typeKey = `pollen-${r.pollenType || 'Sconosciuto'}`;
            if (!apiaryGroup.types[typeKey]) {
                apiaryGroup.types[typeKey] = { id: typeKey, category: 'pollen', name: r.pollenType || 'Sconosciuto', records: [], total: 0 };
            }
            apiaryGroup.types[typeKey].records.push({...r, displayQuantity: r.pollenGrams, displayNotes: r.pollenNotes});
            apiaryGroup.types[typeKey].total += r.pollenGrams;
        }
        
        if (r.propolisNets) {
            apiaryGroup.totals.propolis += r.propolisNets;
            const typeKey = `propolis-Generica`;
            if (!apiaryGroup.types[typeKey]) {
                apiaryGroup.types[typeKey] = { id: typeKey, category: 'propolis', name: 'Propoli', records: [], total: 0 };
            }
            apiaryGroup.types[typeKey].records.push({...r, displayQuantity: r.propolisNets, displayNotes: r.propolisNotes});
            apiaryGroup.types[typeKey].total += r.propolisNets;
        }
    });

    const sortedApiaries = Object.values(groupedByApiary).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const toggleGroup = (key: string) => {
        const newSet = new Set(expandedProdGroups);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
        setExpandedProdGroups(newSet);
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex justify-between items-center mb-6 h-10">
                <button onClick={onBack} className="w-10 h-10 bg-white dark:bg-slate-700 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 flex-shrink-0"><BackArrowIcon className="w-5 h-5"/></button>
                <div className="flex gap-2">
                    <button 
                        onClick={onOpenResoconto} 
                        className="w-10 h-10 sm:w-auto sm:px-4 bg-amber-500 text-white rounded-full font-bold shadow-md hover:bg-amber-600 flex items-center justify-center sm:gap-2"
                        title="Resoconto"
                    >
                        <GridIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Resoconto</span>
                    </button>
                    <button onClick={() => setIsProdFilterOpen(!isProdFilterOpen)} className={`w-10 h-10 rounded-full border flex items-center justify-center relative transition-colors ${activeFiltersCount > 0 ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/50 dark:border-amber-700 dark:text-amber-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}><SearchIcon className="w-5 h-5"/>{activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeFiltersCount}</span>}</button>
                </div>
            </div>
            {isProdFilterOpen && (<div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 animate-fade-in"><div className="flex justify-between mb-3"><h3 className="text-sm font-bold">Filtri Produzione</h3><button onClick={() => setProdFilters({apiary:'',type:''})} className="text-xs text-red-500">Resetta</button></div><div className="space-y-3"><div><label className="text-xs font-bold text-slate-500">Apiario</label><select value={prodFilters.apiary} onChange={e=>setProdFilters({...prodFilters,apiary:e.target.value})} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700"><option value="">Tutti</option>{apiaries.map(a=><option key={a.id} value={a.name}>{a.name}</option>)}</select></div><div><label className="text-xs font-bold text-slate-500">{typeLabel}</label><select value={prodFilters.type} onChange={e=>setProdFilters({...prodFilters,type:e.target.value})} className="w-full text-sm p-2 border rounded-md dark:bg-slate-700"><option value="">Tutti</option>{typeOptions.map(t=><option key={t} value={t}>{t}</option>)}</select></div></div></div>)}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 text-center relative group">
                <div className="bg-amber-100 dark:bg-amber-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-600">
                    <JarIcon className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold">Produzione Globale</h2>
                <div className="flex gap-2 w-full mt-4">
                    <button onClick={()=>setProductionTab(productionTab==='honey'?'all':'honey')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition ${productionTab==='honey'?'bg-amber-500 text-white border-amber-600 shadow-md':'bg-slate-100 dark:bg-slate-700'}`}><JarIcon className="w-4 h-4 inline mr-1"/>Miele</button>
                    <button onClick={()=>setProductionTab(productionTab==='pollen'?'all':'pollen')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition ${productionTab==='pollen'?'bg-yellow-500 text-white border-yellow-600 shadow-md':'bg-slate-100 dark:bg-slate-700'}`}><FlowerIcon className="w-4 h-4 inline mr-1"/>Polline</button>
                    <button onClick={()=>setProductionTab(productionTab==='propolis'?'all':'propolis')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition ${productionTab==='propolis'?'bg-amber-800 text-white border-amber-900 shadow-md':'bg-slate-100 dark:bg-slate-700'}`}><GridIcon className="w-4 h-4 inline mr-1"/>Propoli</button>
                </div>
            </div>
            <div className="space-y-3">
                {sortedApiaries.length > 0 ? sortedApiaries.map((apiary:any) => (
                    <div key={apiary.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div onClick={() => toggleGroup(`apiary-${apiary.id}`)} className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 relative">
                            <div className="flex justify-between items-start">
                                <div><h3 className="font-bold text-slate-800 dark:text-white leading-tight">{apiary.name}</h3></div>
                                <div className="flex items-center gap-2">
                                    {expandedProdGroups.has(`apiary-${apiary.id}`)?<ChevronUpIcon className="w-4 h-4"/>:<ChevronDownIcon className="w-4 h-4"/>}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {apiary.totals.honey > 0 && <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 text-[10px] px-1.5 py-0.5 rounded border border-amber-100">{apiary.totals.honey} Melari</span>}
                                {apiary.totals.pollen > 0 && <span className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded border border-yellow-100">{apiary.totals.pollen}g Polline</span>}
                                {apiary.totals.propolis > 0 && <span className="bg-orange-50 dark:bg-orange-900/20 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-orange-100">{apiary.totals.propolis} Reti</span>}
                            </div>
                        </div>
                        {expandedProdGroups.has(`apiary-${apiary.id}`) && (
                            <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-2 space-y-2">
                                {Object.values(apiary.types).sort((a:any, b:any) => a.name.localeCompare(b.name)).map((typeGroup:any) => (
                                    <div key={typeGroup.id} className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                        <div onClick={(e) => { e.stopPropagation(); toggleGroup(`type-${apiary.id}-${typeGroup.id}`); }} className="p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                {typeGroup.category === 'honey' && <JarIcon className="w-4 h-4 text-amber-600" />}
                                                {typeGroup.category === 'pollen' && <FlowerIcon className="w-4 h-4 text-yellow-600" />}
                                                {typeGroup.category === 'propolis' && <GridIcon className="w-4 h-4 text-amber-800" />}
                                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                                                    {typeGroup.category === 'honey' ? 'Miele' : typeGroup.category === 'pollen' ? 'Polline' : 'Propoli'} {typeGroup.category !== 'propolis' ? `- ${typeGroup.name}` : ''}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-500">
                                                    {typeGroup.total} {typeGroup.category === 'honey' ? 'Melari' : typeGroup.category === 'pollen' ? 'g' : 'Reti'}
                                                </span>
                                                {expandedProdGroups.has(`type-${apiary.id}-${typeGroup.id}`)?<ChevronUpIcon className="w-4 h-4"/>:<ChevronDownIcon className="w-4 h-4"/>}
                                            </div>
                                        </div>
                                        {expandedProdGroups.has(`type-${apiary.id}-${typeGroup.id}`) && (
                                            <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-2 space-y-1">
                                                {typeGroup.records.sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r:any) => (
                                                    <div key={r.id} className="flex justify-between items-start p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 relative">
                                                        <div className="flex-1 pr-6">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] font-bold uppercase text-slate-500">Arnia {r.hiveName}</span>
                                                                <span className="text-[10px] text-slate-400">{new Date(r.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <div className={`text-xs font-semibold ${typeGroup.category === 'honey' ? 'text-amber-600' : typeGroup.category === 'pollen' ? 'text-yellow-600' : 'text-amber-800'}`}>
                                                                {r.displayQuantity} {typeGroup.category === 'honey' ? 'Melari' : typeGroup.category === 'pollen' ? 'g' : 'Reti'}
                                                            </div>
                                                            {r.displayNotes && (
                                                                <div className="mt-1 text-[10px] text-slate-600 dark:text-slate-400 italic">
                                                                    "{r.displayNotes}"
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="relative">
                                                            <button onClick={e=>{e.stopPropagation();setOpenProductionMenuId(openProductionMenuId===r.id?null:r.id);}} className="p-1 text-slate-400"><MoreVerticalIcon className="w-4 h-4"/></button>
                                                            {openProductionMenuId===r.id && (
                                                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg z-[100] min-w-[120px] py-1">
                                                                    <button onClick={()=>{setOpenProductionMenuId(null);setProductionToEdit(r);setIsProductionModalOpen(true);}} className="px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left flex items-center gap-2 text-slate-700 dark:text-slate-200"><EditIcon className="w-3 h-3"/>Modifica</button>
                                                                    <button onClick={()=>{setOpenProductionMenuId(null);setDeleteConfirmation({type:'production',id:r.id, apiaryId: r.apiaryId, hiveId: r.hiveId});}} className="px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 w-full text-left flex items-center gap-2"><TrashIcon className="w-3 h-3"/>Elimina</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )) : <div className="py-12 text-center text-slate-400 italic">Nessun record di produzione.</div>}
            </div>
            {canAdd && (
                <>
                    {isProdFabMenuOpen && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={()=>setIsProdFabMenuOpen(false)}></div>}
                    <div className={`fixed right-6 flex flex-col gap-3 items-end z-50 transition-all ${isProdFabMenuOpen?'opacity-100':'opacity-0 pointer-events-none'}`} style={{bottom:'calc(10rem + env(safe-area-inset-bottom))'}}>
                        <button onClick={()=>{setIsProdFabMenuOpen(false);setProductionTab('propolis');setProductionToEdit(null);setIsProductionModalOpen(true);}} className="flex items-center gap-2 bg-white dark:bg-slate-700 px-4 py-2 rounded-full shadow-lg text-sm font-bold"><GridIcon className="w-4 h-4"/>Propoli</button>
                        <button onClick={()=>{setIsProdFabMenuOpen(false);setProductionTab('pollen');setProductionToEdit(null);setIsProductionModalOpen(true);}} className="flex items-center gap-2 bg-white dark:bg-slate-700 px-4 py-2 rounded-full shadow-lg text-sm font-bold"><FlowerIcon className="w-4 h-4"/>Polline</button>
                        <button onClick={()=>{setIsProdFabMenuOpen(false);setProductionTab('honey');setProductionToEdit(null);setIsProductionModalOpen(true);}} className="flex items-center gap-2 bg-white dark:bg-slate-700 px-4 py-2 rounded-full shadow-lg text-sm font-bold"><JarIcon className="w-4 h-4"/>Miele</button>
                    </div>
                    <button onClick={()=>setIsProdFabMenuOpen(!isProdFabMenuOpen)} className={`fixed right-6 w-14 h-14 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 z-50 transition-transform ${isProdFabMenuOpen?'rotate-45':''}`} style={{bottom:'calc(6rem + env(safe-area-inset-bottom))'}}><PlusIcon className="w-8 h-8"/></button>
                </>
            )}
        </div>
    );
};

export default ProductionView;