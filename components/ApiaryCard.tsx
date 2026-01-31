
import React, { useState, useRef, useEffect } from 'react';
import { Apiary } from '../types';
import { TrashIcon, EditIcon, MoreVerticalIcon } from './Icons';

interface ApiaryCardProps {
    apiary: Apiary;
    onSelect: (apiary: Apiary) => void;
    onDelete: () => void;
    onEdit: (e: React.MouseEvent) => void;
}

const ApiaryCard: React.FC<ApiaryCardProps> = ({ apiary, onSelect, onDelete, onEdit }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
            onClick={() => onSelect(apiary)}
            className="group relative bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all duration-300 cursor-pointer overflow-visible"
        >
            {/* Menu Button */}
            <div className="absolute top-2 right-2 z-10" ref={menuRef}>
                <button 
                    onClick={toggleMenu}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                    <MoreVerticalIcon className="w-5 h-5"/>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-100 dark:border-slate-600 z-50 overflow-hidden animate-fade-in">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onEdit(e);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-2"
                        >
                            <EditIcon className="w-4 h-4"/> Modifica
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-600"></div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onDelete();
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                            <TrashIcon className="w-4 h-4"/> Elimina
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5 pt-8 sm:pt-5">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white truncate pr-8">{apiary.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {apiary.location || 'Nessuna posizione'}
                </p>
            </div>
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 rounded-b-xl">
                <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    <span>Arnie attive</span>
                    <span className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                        {apiary.hives?.length || 0}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ApiaryCard;
