import React from 'react';
import { Apiary, Hive } from '../types';
import { BackArrowIcon, PlusIcon, EditIcon, TrashIcon, TransferIcon, BeehiveIcon } from './Icons';
import HiveCard from './HiveCard';

interface ApiaryDetailsProps {
    apiary: Apiary;
    onBack: () => void;
    onSelectHive: (hive: Hive) => void;
    onAddHive: () => void;
    onDeleteApiary: () => void;
    onEditApiary: () => void;
    onDeleteHive: (hiveId: string) => void;
    onTransferHives: () => void;
}

const ApiaryDetails: React.FC<ApiaryDetailsProps> = ({ apiary, onBack, onSelectHive, onAddHive, onDeleteApiary, onEditApiary, onDeleteHive, onTransferHives }) => {
    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition">
                    <BackArrowIcon className="w-5 h-5"/>
                    Tutti gli Apiari
                </button>
                <div className="flex gap-2">
                    <button onClick={onTransferHives} className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition shadow-sm border border-blue-200 dark:border-blue-800" title="Trasferisci Arnie (Nomadismo)">
                        <TransferIcon className="w-5 h-5"/>
                        <span className="hidden sm:inline">Trasferisci</span>
                    </button>
                    <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
                    <button onClick={onEditApiary} className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition shadow-sm" title="Modifica Apiario">
                        <EditIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={onDeleteApiary} className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition shadow-sm" title="Elimina Apiario">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg mb-6">
                <h2 className="text-3xl font-bold mb-2">{apiary.name}</h2>
                <p className="text-slate-500 dark:text-slate-400">{apiary.location}</p>
            </div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold">Arnie in questo Apiario ({apiary.hives.length})</h3>
                {apiary.hives.length > 0 && (
                    <button onClick={onAddHive} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition shadow-sm">
                        <PlusIcon className="w-5 h-5"/>
                        Aggiungi Arnia
                    </button>
                )}
            </div>

            {apiary.hives.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {apiary.hives.map(hive => (
                        <HiveCard key={hive.id} hive={hive} onSelect={onSelectHive} onDelete={onDeleteHive} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg shadow-md flex flex-col items-center justify-center">
                    <BeehiveIcon className="w-24 h-24 text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">Nessuna arnia in questo apiario.</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Clicca "Aggiungi Arnia" per iniziare!</p>
                    <button onClick={onAddHive} className="mt-6 flex items-center mx-auto gap-2 px-6 py-3 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition shadow-sm font-medium">
                        <PlusIcon className="w-5 h-5"/>
                        Aggiungi Arnia
                    </button>
                </div>
            )}
        </div>
    );
};

export default ApiaryDetails;