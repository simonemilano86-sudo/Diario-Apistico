import React from 'react';
import { Apiary } from '../types';
import { TrashIcon, EditIcon } from './Icons';

interface ApiaryCardProps {
    apiary: Apiary;
    onSelect: (apiary: Apiary) => void;
    onDelete: () => void;
    onEdit: (e: React.MouseEvent) => void;
}

const ApiaryCard: React.FC<ApiaryCardProps> = ({ apiary, onSelect, onDelete, onEdit }) => {
    return (
        <div 
            onClick={() => onSelect(apiary)}
            className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
        >
            {/* Action Buttons - Posizionati con z-index alto e gestione stopPropagation */}
            <div className="absolute top-2 right-2 flex gap-2 z-50">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(e);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    type="button"
                    className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors shadow-sm"
                    title="Modifica"
                >
                    <EditIcon className="w-4 h-4"/>
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    type="button"
                    className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors shadow-sm"
                    title="Elimina"
                >
                    <TrashIcon className="w-4 h-4"/>
                </button>
            </div>

            {/* Content */}
            <div className="p-5 pt-10 sm:pt-5">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white truncate pr-20">{apiary.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{apiary.location || 'Nessuna posizione impostata'}</p>
            </div>
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                    <div className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Numero Arnie:</span> {apiary.hives.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiaryCard;