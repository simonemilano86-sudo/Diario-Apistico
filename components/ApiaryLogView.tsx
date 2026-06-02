import React from 'react';
import { Apiary, Inspection } from '../types';
import { BackArrowIcon, BeehiveIcon } from './Icons';

interface ApiaryLogViewProps {
    apiary: Apiary;
    onBack: () => void;
}

const ApiaryLogView: React.FC<ApiaryLogViewProps> = ({ apiary, onBack }) => {
    const getLatestInspection = (hive: any): Inspection | null => {
        if (!hive.inspections || hive.inspections.length === 0) return null;
        return [...hive.inspections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    };

    return (
        <div className="animate-fade-in p-4 pb-20">
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={onBack} 
                    className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600"
                >
                    <BackArrowIcon className="w-6 h-6"/>
                </button>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Log Ispezioni: {apiary.name}</h2>
            </div>

            <div className="space-y-4">
                {[...apiary.hives].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map(hive => {
                    const latest = getLatestInspection(hive);
                    return (
                        <div key={hive.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 mb-1">
                                <BeehiveIcon className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-base text-slate-800 dark:text-white">{hive.name}</h3>
                            </div>
                            {latest ? (
                                <div className="text-xs text-slate-600 dark:text-slate-300">
                                    <p className="font-medium text-amber-600 dark:text-amber-400">
                                        {new Date(latest.date).toLocaleDateString()}
                                    </p>
                                    <p className="truncate"><span className="font-semibold">Azioni:</span> {latest.actions || 'Nessuna'}</p>
                                    <p className="truncate"><span className="font-semibold">Note:</span> {latest.notes || 'Nessuna'}</p>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Nessuna ispezione.</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ApiaryLogView;
