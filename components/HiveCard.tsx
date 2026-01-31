
import React, { useState, useRef, useEffect } from 'react';
import { Hive, HiveStatus } from '../types';
import { CheckCircleIcon, WarningIcon, TrashIcon, EditIcon, MoreVerticalIcon } from './Icons';

interface HiveCardProps {
    hive: Hive;
    onSelect: (hive: Hive) => void;
    onDelete?: (hiveId: string) => void;
    onEdit?: (hive: Hive) => void;
}

const statusStyles: Record<HiveStatus, { bg: string, text: string, icon: React.ReactNode }> = {
    [HiveStatus.HEALTHY]: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: <CheckCircleIcon className="w-3 h-3" /> },
    [HiveStatus.NEEDS_ATTENTION]: { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200', icon: <WarningIcon className="w-3 h-3" /> },
    [HiveStatus.WEAK]: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: <WarningIcon className="w-3 h-3" /> },
    [HiveStatus.QUEENLESS]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: <WarningIcon className="w-3 h-3" /> },
    [HiveStatus.DRONE_LAYING]: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: <WarningIcon className="w-3 h-3" /> },
    [HiveStatus.VIRGIN_QUEEN]: { bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200', icon: <CheckCircleIcon className="w-3 h-3" /> },
    [HiveStatus.HONEY_BOUND]: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200', icon: <WarningIcon className="w-3 h-3" /> },
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

const HiveCard: React.FC<HiveCardProps> = ({ hive, onSelect, onDelete, onEdit }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Fallback if hive has an old status that doesn't exist anymore
    const style = statusStyles[hive.status] || statusStyles[HiveStatus.HEALTHY];
    const lastInspection = hive.inspections.length > 0 ? hive.inspections.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div 
            onClick={() => onSelect(hive)}
            className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all duration-300 cursor-pointer overflow-visible"
        >
            {/* Queen Year Indicator (Top Left) */}
            <div 
                className="absolute top-2 left-2 z-10" 
                title={`Anno Regina: ${hive.queenYear}`}
            >
                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${getQueenColor(hive.queenYear)}`}></div>
            </div>

            {/* Menu Button (Top Right) */}
            <div className="absolute top-0.5 right-0.5 z-20" ref={menuRef}>
                <button 
                    onClick={toggleMenu}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                    <MoreVerticalIcon className="w-4 h-4"/>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                        {onEdit && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onEdit(hive);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
                            >
                                <EditIcon className="w-4 h-4"/> Modifica
                            </button>
                        )}
                        <div className="h-px bg-slate-100 dark:bg-slate-600"></div>
                        {onDelete && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onDelete(hive.id);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4"/> Elimina
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="p-2 pt-6">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white truncate pr-4 leading-tight">{hive.name}</h3>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium w-fit ${style.bg} ${style.text}`}>
                        {style.icon}
                        {hive.status}
                    </span>
                </div>
            </div>
            <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 rounded-b-lg">
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col">
                        <span className="font-semibold uppercase tracking-wide opacity-70 text-[8px]">Ultima Ispezione</span>
                        <span>{lastInspection ? new Date(lastInspection.date).toLocaleDateString(undefined, {day: 'numeric', month: 'short'}) : '--'}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="font-semibold uppercase tracking-wide opacity-70 text-[8px]">Razza</span>
                        <span className="truncate max-w-[70px]">{hive.queenRace}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HiveCard;
