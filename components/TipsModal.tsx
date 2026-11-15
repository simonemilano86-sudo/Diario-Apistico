import React from 'react';
import Modal from './Modal';
import { ExternalLinkIcon } from './Icons';

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TipsModal: React.FC<TipsModalProps> = ({ isOpen, onClose }) => {
  const tips = [
    {
      icon: '🖥️',
      title: 'Usa Diario Apistico anche da PC',
      tag: 'Desktop & Browser',
      description:
        'Sapevi che puoi consultare e compilare i tuoi apiari comodamente dalla scrivania? Dal browser di qualsiasi computer hai lo schermo grande per stampare registri, rivedere le fioriture e organizzare il lavoro.',
      action: {
        label: 'Apri app.diarioapistico.com',
        url: 'https://app.diarioapistico.com',
      },
    },
    {
      icon: '⚡',
      title: 'Lavori Rapidi su Tutto l\'Apiario',
      tag: 'Risparmia Tempo',
      description:
        'Quando posi il candito, somministri sciroppo o fai il gocciolato a tutte le casse, non aprirle una alla volta! Compila l\'ispezione sulla prima arnia e attiva lo switch "Tutte le arnie": le azioni e note verranno registrate istantaneamente su tutte le arnie dell\'apiario.',
    },
    {
      icon: '📖',
      title: 'Il Registro Lavori (Quaderno in alto)',
      tag: 'Organizzazione',
      description:
        'Toccando l\'icona del quaderno nell\'angolo in alto della schermata Home hai un riepilogo cronologico completo di tutte le attività, trattamenti sanitari ed eventi programmati, senza dover sfogliare arnia per arnia.',
    },
    {
      icon: '👥',
      title: 'Condivisione con Aiutanti & Soci',
      tag: 'Gestione Team',
      description:
        'Hai operai o collaboratori? Dalla sezione "Gestione Team" puoi invitarli tramite email assegnando loro il ruolo di collaboratori. Potranno registrare controlli e trattamenti dal proprio telefono, ma non avranno i permessi per cancellare dati o arnie.',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💡 Trucchi & Consigli per l'Apicoltore">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Ecco alcune delle funzioni più utili per sfruttare al massimo l'app sul campo e in azienda.
        </p>

        <div className="space-y-3">
          {tips.map((tip, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 transition hover:border-amber-400 dark:hover:border-amber-500"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
                  {tip.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {tip.title}
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                      {tip.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {tip.description}
                  </p>

                  {tip.action && (
                    <div className="mt-3">
                      <a
                        href={tip.action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm"
                      >
                        <span>{tip.action.label}</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TipsModal;
