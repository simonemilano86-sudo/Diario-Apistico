
import React from 'react';
import { Hive, HiveStatus } from '../types';
import { CheckCircleIcon, WarningIcon, TrashIcon } from './Icons';

interface HiveCardProps {
    hive: Hive;
    onSelect: (hive: Hive) => void;
    onDelete?: (hiveId: string) => void;
}

const statusStyles: Record<HiveStatus, { bg: string, text: string, icon: React.ReactNode }> = {
    [HiveStatus.HEALTHY]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: <CheckCircleIcon className="w-4 h-4" /> },
    [HiveStatus.NEEDS_ATTENTION]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', icon: <WarningIcon className="w-4 h-4" /> },
    [HiveStatus.WEAK]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: <WarningIcon className="w-4 h-4" /> },
    [HiveStatus.QUEENLESS]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: <WarningIcon className="w-4 h-4" /> },
    [HiveStatus.DRONE_LAYING]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: <WarningIcon className="w-4 h-4" /> },
    [HiveStatus.VIRGIN_QUEEN]: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', icon: <CheckCircleIcon className="w-4 h-4" /> },
    [HiveStatus.HONEY_BOUND]: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200', icon: <WarningIcon className="w-4 h-4" /> },
};

const getQueenColor = (year: number): string => {
    const lastDigit = year % 10;
    switch (lastDigit) {
        case 1: case 6: return 'bg-white border border-slate-400';
        case 2: case 7: return 'bg-yellow-400 border border-yellow-500/20';
        case 3: case 8: return 'bg-red-500 border border-red-600/20';
        case 4: case 9: return 'bg-green-500 border border-green-600/20';
        case 5: case 0: return 'bg-blue-500 border border-blue-600/20';
        default: return 'bg-slate-400';
    }
};

const HiveCard: React.FC<HiveCardProps> = ({ hive, onSelect, onDelete }) => {
    // Fallback if hive has an old status that doesn't exist anymore
    const style = statusStyles[hive.status] || statusStyles[HiveStatus.HEALTHY];
    const lastInspection = hive.inspections.length > 0 ? hive.inspections.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

    return (
        <div 
            onClick={() => onSelect(hive)}
            className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-md cursor-pointer border border-transparent hover:border-amber-500/30 transition-colors"
        >
            {/* Queen Year Indicator (Top Left) */}
            <div 
                className="absolute top-4 left-4 z-10" 
                title={`Anno Regina: ${hive.queenYear}`}
            >
                <div className={`w-3 h-3 rounded-full shadow-sm ${getQueenColor(hive.queenYear)}`}></div>
            </div>

            {/* Delete Button (Top Right) */}
            {onDelete && (
                <div 
                    className="absolute top-2 right-4 z-50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(hive.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        type="button"
                        className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors shadow-sm cursor-pointer"
                        title="Elimina"
                    >
                        <TrashIcon className="w-4 h-4"/>
                    </button>
                </div>
            )}

            <div className="p-5 pt-12">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white truncate pr-10">{hive.name}</h3>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                        {style.icon}
                        {hive.status}
                    </span>
                </div>
            </div>
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                    <div className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Ultima:</span> {lastInspection ? new Date(lastInspection.date).toLocaleDateString() : 'Mai'}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Razza:</span> {hive.queenRace}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HiveCard;