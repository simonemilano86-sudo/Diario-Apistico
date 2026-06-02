import React, { useState } from 'react';
import Modal from './Modal';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleContinue = () => {
    if (isChecked) {
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      disableBackdropClick={true}
      title="🐝 Benvenuto su Diario Apistico!"
    >
      <div className="space-y-5 p-2">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Versione Free:
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            I tuoi dati sono salvati solo sul tuo telefono. Se fai il logout, disinstalli l'app o cambi telefono, i dati andranno persi se non sincronizzati.
          </p>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-500/30 dark:border-amber-500/20">
          <h3 className="font-bold text-amber-600 dark:text-amber-500 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Versione Premium:
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-500/80 leading-relaxed">
            Attiva la sincronizzazione cloud per avere i tuoi dati sempre al sicuro, sincronizzati su tutti i tuoi dispositivi e protetti anche se cambi telefono.
          </p>
        </div>

        <div className="flex items-start space-x-3 mt-6 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex items-center h-5 mt-0.5">
            <input
              type="checkbox"
              id="understand-checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-5 h-5 text-amber-500 rounded border-slate-300 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700 dark:ring-offset-slate-800"
            />
          </div>
          <label 
            htmlFor="understand-checkbox" 
            className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
          >
            Ho capito, continua.
          </label>
        </div>

        <button
          onClick={handleContinue}
          disabled={!isChecked}
          className={`w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200 ${
            isChecked
              ? 'bg-amber-500 hover:bg-amber-600 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
          }`}
        >
          Inizia a usare l'app
        </button>
      </div>
    </Modal>
  );
};

export default WelcomeModal;
