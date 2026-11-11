import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Check, ShieldAlert, Users, Zap } from 'lucide-react';
import { Plan } from '../types';

export const Billing: React.FC = () => {
  const { plan, changePlan } = useAppContext();

  const handlePlanChange = (newPlan: Plan) => {
    if (newPlan === 'BASE' && plan !== 'BASE') {
      if (confirm('Sei sicuro di voler passare al piano Base? I tuoi collaboratori verranno sospesi.')) {
        changePlan(newPlan);
      }
    } else {
      changePlan(newPlan);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Scegli il piano giusto per il tuo Apiario
        </h2>
        <p className="mt-4 text-xl text-gray-500">
          Lavora da solo o collabora con la tua squadra in tempo reale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Piano Base */}
        <div className={`bg-white rounded-2xl shadow-sm border ${plan === 'BASE' ? 'border-amber-500 ring-2 ring-amber-500 ring-opacity-50' : 'border-gray-200'} p-8 relative flex flex-col`}>
          {plan === 'BASE' && (
            <span className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
              Attuale
            </span>
          )}
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-gray-400" /> Base
          </h3>
          <p className="mt-4 text-sm text-gray-500 flex-grow">
            Perfetto per l'apicoltore singolo che gestisce i propri alveari.
          </p>
          <div className="mt-6">
            <span className="text-4xl font-extrabold text-gray-900">€0</span>
            <span className="text-base font-medium text-gray-500">/mese</span>
          </div>
          <ul className="mt-6 space-y-4 flex-grow">
            <li className="flex items-start">
              <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
              <span className="ml-3 text-sm text-gray-700">1 Login (Solo tu)</span>
            </li>
            <li className="flex items-start">
              <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
              <span className="ml-3 text-sm text-gray-700">Gestione apiari illimitata</span>
            </li>
          </ul>
          <button
            onClick={() => handlePlanChange('BASE')}
            disabled={plan === 'BASE'}
            className={`mt-8 w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
              plan === 'BASE' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50'
            }`}
          >
            {plan === 'BASE' ? 'Piano Attivo' : 'Passa a Base (Downgrade)'}
          </button>
        </div>

        {/* Piano Team Piccolo */}
        <div className={`bg-white rounded-2xl shadow-xl border ${plan === 'TEAM_PICCOLO' ? 'border-amber-500 ring-2 ring-amber-500 ring-opacity-50' : 'border-amber-200'} p-8 relative flex flex-col transform md:-translate-y-4`}>
          {plan === 'TEAM_PICCOLO' && (
            <span className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
              Attuale
            </span>
          )}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-amber-200">
              Più Popolare
            </span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" /> Team Piccolo
          </h3>
          <p className="mt-4 text-sm text-gray-500 flex-grow">
            Ideale per famiglie o piccole aziende agricole.
          </p>
          <div className="mt-6">
            <span className="text-4xl font-extrabold text-gray-900">+€1.50</span>
            <span className="text-base font-medium text-gray-500">/mese</span>
          </div>
          <ul className="mt-6 space-y-4 flex-grow">
            <li className="flex items-start">
              <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
              <span className="ml-3 text-sm text-gray-700 font-medium">Fino a 3 Collaboratori</span>
            </li>
            <li className="flex items-start">
              <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
              <span className="ml-3 text-sm text-gray-700">Ruolo Operatore Pro incluso</span>
            </li>
            <li className="flex items-start">
              <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
              <span className="ml-3 text-sm text-gray-700">Sincronizzazione in tempo reale</span>
            </li>
          </ul>
          <button
            onClick={() => handlePlanChange('TEAM_PICCOLO')}
            disabled={plan === 'TEAM_PICCOLO'}
            className={`mt-8 w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
              plan === 'TEAM_PICCOLO' ? 'bg-amber-100 text-amber-700 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md'
            }`}
          >
            {plan === 'TEAM_PICCOLO' ? 'Piano Attivo' : 'Attiva Team Piccolo'}
          </button>
        </div>

        {/* Piano Azienda */}
        <div className={`bg-white rounded-2xl shadow-sm border ${plan === 'AZIENDA' ? 'border-amber-500 ring-2 ring-amber-500 ring-opacity-50' : 'border-gray-200'} p-8 relative flex flex-col`}>
          {plan === 'AZIENDA' && (
            <span className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider">
              Attuale
            </span>
          )}
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" /> Azienda
          </h3>
          <p className="mt-4 text-sm text-gray-500 flex-grow">
            Per grandi aziende apistiche con molti dipendenti.
          </p>
          <div className="mt-6">
            <span className="text-4xl font-extrabold text-gray-900">+€4.99</span>
            <span className="text-base font-medium text-gray-500">/mese</span>
          </div>
          <ul className="mt-6 space-y-4 flex-grow">
            <li className="flex items-start">
              <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
              <span className="ml-3 text-sm text-gray-700 font-bold">Collaboratori Illimitati</span>
            </li>
            <li className="flex items-start">
              <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
              <span className="ml-3 text-sm text-gray-700">Tutti i ruoli inclusi</span>
            </li>
            <li className="flex items-start">
              <Check className="flex-shrink-0 w-5 h-5 text-green-500" />
              <span className="ml-3 text-sm text-gray-700">Supporto prioritario</span>
            </li>
          </ul>
          <button
            onClick={() => handlePlanChange('AZIENDA')}
            disabled={plan === 'AZIENDA'}
            className={`mt-8 w-full py-3 px-4 rounded-xl font-semibold transition-colors ${
              plan === 'AZIENDA' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            {plan === 'AZIENDA' ? 'Piano Attivo' : 'Attiva Azienda'}
          </button>
        </div>
      </div>
    </div>
  );
};

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
