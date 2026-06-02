import React, { useEffect } from 'react';
import { Apiary, Hive, Inspection, CalendarEvent, ProductionRecord, HiveMovement } from '../types';
import { TrashIcon, RotateCcwIcon, BackArrowIcon, BeeIcon, ClipboardIcon, StylizedFlowerIcon, CalendarIcon, JarIcon, TransferIcon } from './Icons';

interface TrashViewProps {
  apiaries: Apiary[];
  events: CalendarEvent[];
  onRestore: (id: string, type: string) => void;
  onBack: () => void;
}

const TrashView: React.FC<TrashViewProps> = ({ apiaries, events, onRestore, onBack }) => {
  useEffect(() => {
    // Scrolla sia la finestra che l'eventuale contenitore principale
    window.scrollTo(0, 0);
    const mainContainer = document.querySelector('.overflow-y-auto');
    if (mainContainer) mainContainer.scrollTo(0, 0);
  }, []);

  const deletedApiaries = apiaries.filter(a => a._deleted);
  
  const deletedHives: { hive: Hive, apiaryName: string }[] = [];
  apiaries.forEach(a => {
    (a.hives || []).forEach(h => {
      if (h._deleted) deletedHives.push({ hive: h, apiaryName: a.name });
    });
  });

  const deletedInspections: { inspection: Inspection, hiveName: string, apiaryName: string }[] = [];
  apiaries.forEach(a => {
    (a.hives || []).forEach(h => {
      (h.inspections || []).forEach(i => {
        if (i._deleted) deletedInspections.push({ inspection: i, hiveName: h.name, apiaryName: a.name });
      });
    });
  });

  const deletedEvents = events.filter(e => e._deleted);

  const deletedProductions: { record: ProductionRecord, hiveName: string, apiaryName: string }[] = [];
  apiaries.forEach(a => {
    (a.hives || []).forEach(h => {
      (h.productionRecords || []).forEach(r => {
        if (r._deleted) deletedProductions.push({ record: r, hiveName: h.name, apiaryName: a.name });
      });
    });
  });

  const deletedMovements: { movement: HiveMovement, hiveName: string, apiaryName: string }[] = [];
  apiaries.forEach(a => {
    (a.hives || []).forEach(h => {
      (h.movements || []).forEach(m => {
        if (m._deleted) deletedMovements.push({ movement: m, hiveName: h.name, apiaryName: a.name });
      });
    });
  });

  const hasItems = deletedApiaries.length > 0 || deletedHives.length > 0 || deletedInspections.length > 0 || deletedEvents.length > 0 || deletedProductions.length > 0 || deletedMovements.length > 0;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Sconosciuta';
    return new Date(timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getDaysRemaining = (timestamp?: number) => {
    if (!timestamp) return 0;
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    const remaining = tenDaysMs - (Date.now() - timestamp);
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex justify-start items-center mb-6 h-10">
        <button onClick={onBack} className="w-10 h-10 bg-white dark:bg-slate-800 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 transition-colors">
          <BackArrowIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 text-center shadow-sm">
        <div className="bg-red-100 dark:bg-red-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-red-600">
          <TrashIcon className="w-7 h-7"/>
        </div>
        <h2 className="text-xl font-bold">Cestino</h2>
      </div>

      <p className="text-sm text-slate-500 mb-6 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
        Gli elementi in questo elenco verranno cancellati definitivamente dopo 10 giorni dalla data di eliminazione. Puoi ripristinarli in qualsiasi momento prima della scadenza.
      </p>

      {!hasItems ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <TrashIcon className="w-16 h-16 mb-4 opacity-20" />
          <p>Il cestino è vuoto</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Apiari */}
          {deletedApiaries.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <StylizedFlowerIcon className="w-5 h-5 text-emerald-500" /> Apiari
              </h3>
              <div className="space-y-3">
                {deletedApiaries.map(a => (
                  <div key={a.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-bold">{a.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Eliminato il: {formatDate(a._deletedAt)}</p>
                      <p className="text-xs font-semibold text-amber-600 mt-0.5">Scadenza tra {getDaysRemaining(a._deletedAt)} giorni</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Ripristina</span>
                      <button onClick={() => onRestore(a.id, 'apiary')} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors">
                        <RotateCcwIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Arnie */}
          {deletedHives.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <BeeIcon className="w-5 h-5 text-amber-500" /> Arnie
              </h3>
              <div className="space-y-3">
                {deletedHives.map(({ hive, apiaryName }) => (
                  <div key={hive.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-bold">{hive.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Apiario: {apiaryName}</p>
                      <p className="text-xs text-slate-500">Eliminato il: {formatDate(hive._deletedAt)}</p>
                      <p className="text-xs font-semibold text-amber-600 mt-0.5">Scadenza tra {getDaysRemaining(hive._deletedAt)} giorni</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Ripristina</span>
                      <button onClick={() => onRestore(hive.id, 'hive')} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors">
                        <RotateCcwIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Ispezioni */}
          {deletedInspections.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <ClipboardIcon className="w-5 h-5 text-teal-500" /> Ispezioni
              </h3>
              <div className="space-y-3">
                {deletedInspections.map(({ inspection, hiveName, apiaryName }) => (
                  <div key={inspection.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-bold">Ispezione del {new Date(inspection.date).toLocaleDateString('it-IT')}</h4>
                      <p className="text-xs text-slate-500 mt-1">Arnia {hiveName} ({apiaryName})</p>
                      <p className="text-xs text-slate-500">Eliminato il: {formatDate(inspection._deletedAt)}</p>
                      <p className="text-xs font-semibold text-amber-600 mt-0.5">Scadenza tra {getDaysRemaining(inspection._deletedAt)} giorni</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Ripristina</span>
                      <button onClick={() => onRestore(inspection.id, 'inspection')} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors">
                        <RotateCcwIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Eventi */}
          {deletedEvents.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-500" /> Eventi Calendario
              </h3>
              <div className="space-y-3">
                {deletedEvents.map(e => (
                  <div key={e.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-bold">{e.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{new Date(e.startDate).toLocaleDateString('it-IT')} {e.startTime}</p>
                      <p className="text-xs text-slate-500">Eliminato il: {formatDate(e._deletedAt)}</p>
                      <p className="text-xs font-semibold text-amber-600 mt-0.5">Scadenza tra {getDaysRemaining(e._deletedAt)} giorni</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Ripristina</span>
                      <button onClick={() => onRestore(e.id, 'event')} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors">
                        <RotateCcwIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Produzione */}
          {deletedProductions.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <JarIcon className="w-5 h-5 text-amber-600" /> Raccolti-Produzione
              </h3>
              <div className="space-y-3">
                {deletedProductions.map(({ record, hiveName, apiaryName }) => (
                  <div key={record.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-bold">{record.honeyType || 'Raccolto'} - {record.melariQuantity || 0} melari</h4>
                      <p className="text-xs text-slate-500 mt-1">Arnia {hiveName} ({apiaryName}) - {new Date(record.date).toLocaleDateString('it-IT')}</p>
                      <p className="text-xs text-slate-500">Eliminato il: {formatDate(record._deletedAt)}</p>
                      <p className="text-xs font-semibold text-amber-600 mt-0.5">Scadenza tra {getDaysRemaining(record._deletedAt)} giorni</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Ripristina</span>
                      <button onClick={() => onRestore(record.id, 'production')} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors">
                        <RotateCcwIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Nomadismo */}
          {deletedMovements.length > 0 && (
            <section>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <TransferIcon className="w-5 h-5 text-blue-500" /> Spostamenti
              </h3>
              <div className="space-y-3">
                {deletedMovements.map(({ movement, hiveName, apiaryName }) => (
                  <div key={movement.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-bold">Spostamento Arnia {hiveName}</h4>
                      <p className="text-xs text-slate-500 mt-1">Da {movement.fromApiaryName} a {movement.toApiaryName}</p>
                      <p className="text-xs text-slate-500">Eliminato il: {formatDate(movement._deletedAt)}</p>
                      <p className="text-xs font-semibold text-amber-600 mt-0.5">Scadenza tra {getDaysRemaining(movement._deletedAt)} giorni</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Ripristina</span>
                      <button onClick={() => onRestore(movement.id, 'movement')} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors">
                        <RotateCcwIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default TrashView;
