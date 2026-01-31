
import React from 'react';
import { BackArrowIcon, ConstructionIcon } from './Icons';

interface ConstructionViewProps {
    onBack: () => void;
}

const ConstructionView: React.FC<ConstructionViewProps> = ({ onBack }) => {
    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
             <div className="flex justify-start items-center mb-6">
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition">
                    <BackArrowIcon className="w-5 h-5"/>
                    Torna Indietro
                </button>
            </div>

            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg text-center p-6">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-6 rounded-full mb-6">
                    <ConstructionIcon className="w-20 h-20 text-amber-500" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Lavori in Corso</h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md">
                    Questa sezione è attualmente in fase di sviluppo. Torna presto per scoprire nuovi strumenti utili per il tuo diario apistico!
                </p>
            </div>
        </div>
    );
};

export default ConstructionView;
