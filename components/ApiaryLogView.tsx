import React, { useMemo, useState, useEffect } from 'react';
import { Apiary, Hive, Inspection } from '../types';
import {
    BackArrowIcon,
    BeehiveIcon,
    CheckCircleIcon,
    WarningIcon,
    MicrophoneIcon,
    ClipboardIcon,
} from './Icons';

interface ApiaryLogViewProps {
    apiary: Apiary;
    onBack: () => void;
    onSelectHive?: (hive: Hive) => void;
}

const getInspectionTimestamp = (insp: Inspection): number => {
    if (!insp?.date) return 0;
    const ms = new Date(insp.date).getTime();
    return Number.isNaN(ms) ? 0 : ms;
};

const compareInspectionsDesc = (
    a: { insp: Inspection; idx: number },
    b: { insp: Inspection; idx: number }
): number => {
    const dateDiff = getInspectionTimestamp(b.insp) - getInspectionTimestamp(a.insp);
    if (dateDiff !== 0) return dateDiff;

    const timeA = a.insp.time || '';
    const timeB = b.insp.time || '';
    if (timeA !== timeB) return timeB.localeCompare(timeA);

    const idNumA = /^\d+$/.test(String(a.insp.id || '')) ? Number(a.insp.id) : 0;
    const idNumB = /^\d+$/.test(String(b.insp.id || '')) ? Number(b.insp.id) : 0;
    if (idNumA !== idNumB) return idNumB - idNumA;

    return b.idx - a.idx;
};

const getActiveInspectionsSorted = (hive: Hive): Inspection[] => {
    const raw = Array.isArray(hive.inspections) ? hive.inspections : [];
    return raw
        .map((insp, idx) => ({ insp, idx }))
        .filter(({ insp }) => insp && !insp._deleted)
        .sort(compareInspectionsDesc)
        .map(({ insp }) => insp);
};

const formatInspectionDate = (dateStr?: string): string => {
    if (!dateStr) return 'Data non disponibile';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const InspectionSummaryBody: React.FC<{ inspection: Inspection }> = ({ inspection }) => {
    const hasDisease = inspection.disease && inspection.disease !== 'Nessuna';
    const hasTreatment = inspection.treatment && inspection.treatment !== 'Nessuno';
    const hasFeeding = inspection.feeding && inspection.feeding !== 'Nessuna';
    const hasMetrics =
        inspection.occupiedFrames !== undefined ||
        inspection.broodFrames !== undefined ||
        inspection.diaphragms !== undefined ||
        inspection.honeyStores !== undefined ||
        inspection.temperament !== undefined;

    return (
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {/* Data, Orario, Temperatura */}
            <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {formatInspectionDate(inspection.date)}
                    {inspection.time && (
                        <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                            ({inspection.time})
                        </span>
                    )}
                </span>
                {inspection.temperature !== undefined && (
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {inspection.temperature}°C
                    </span>
                )}
            </div>

            {/* Osservazioni Rapide & Telai */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span
                    className={`inline-flex items-center gap-1 ${
                        inspection.sawQueen
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : 'text-slate-400 dark:text-slate-500'
                    }`}
                >
                    {inspection.sawQueen ? (
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                    ) : (
                        <span className="w-3 h-3 rounded-full border border-current inline-block" />
                    )}
                    Regina
                </span>

                <span
                    className={`inline-flex items-center gap-1 ${
                        inspection.sawEggs
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : inspection.noBrood
                            ? 'text-red-500 dark:text-red-400 font-medium'
                            : 'text-slate-400 dark:text-slate-500'
                    }`}
                >
                    {inspection.sawEggs ? (
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                    ) : inspection.noBrood ? (
                        <WarningIcon className="w-3.5 h-3.5" />
                    ) : (
                        <span className="w-3 h-3 rounded-full border border-current inline-block" />
                    )}
                    {inspection.sawEggs ? 'Uova' : inspection.noBrood ? 'No Covata' : 'Covata?'}
                </span>

                {hasMetrics && (
                    <>
                        {inspection.occupiedFrames !== undefined && (
                            <span>
                                <strong className="text-slate-500 dark:text-slate-400">Presid:</strong>{' '}
                                {inspection.occupiedFrames}
                            </span>
                        )}
                        {inspection.broodFrames !== undefined && (
                            <span>
                                <strong className="text-slate-500 dark:text-slate-400">Covata:</strong>{' '}
                                {inspection.broodFrames}
                            </span>
                        )}
                        {inspection.diaphragms !== undefined && (
                            <span>
                                <strong className="text-slate-500 dark:text-slate-400">Diafr:</strong>{' '}
                                {inspection.diaphragms}
                            </span>
                        )}
                        {inspection.honeyStores && (
                            <span>
                                <strong className="text-slate-500 dark:text-slate-400">Miele:</strong>{' '}
                                {inspection.honeyStores}
                            </span>
                        )}
                        {inspection.temperament && (
                            <span>
                                <strong className="text-slate-500 dark:text-slate-400">Temp:</strong>{' '}
                                {inspection.temperament}
                            </span>
                        )}
                    </>
                )}
            </div>

            {/* Trattamenti / Nutrizione / Malattie */}
            {(hasTreatment || hasFeeding || hasDisease) && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {hasTreatment && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                            Tratt: {inspection.treatment}
                            {inspection.treatmentQuantity ? ` (${inspection.treatmentQuantity})` : ''}
                        </span>
                    )}
                    {hasFeeding && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold">
                            Nutr: {inspection.feeding}
                        </span>
                    )}
                    {hasDisease && (
                        <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-semibold">
                            Malattia: {inspection.disease}
                        </span>
                    )}
                </div>
            )}

            {/* Azioni & Note */}
            {inspection.actions && inspection.actions.trim() !== '' && (
                <p className="text-slate-700 dark:text-slate-200 leading-snug">
                    <span className="font-semibold">Azioni/Note:</span> {inspection.actions}
                </p>
            )}
            {inspection.notes && inspection.notes.trim() !== '' && (
                <p className="italic text-slate-500 dark:text-slate-400 leading-snug">
                    "{inspection.notes}"
                </p>
            )}

            {/* Nota Vocale */}
            {inspection.audioNote && (
                <div
                    className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded-md border border-amber-100 dark:border-amber-900/30"
                    onClick={(e) => e.stopPropagation()}
                >
                    <MicrophoneIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <audio controls src={inspection.audioNote} className="h-6 w-full max-w-[200px]" />
                </div>
            )}
        </div>
    );
};

const ApiaryLogView: React.FC<ApiaryLogViewProps> = ({ apiary, onBack, onSelectHive }) => {
    const [activeTab, setActiveTab] = useState<'byHive' | 'timeline'>('byHive');

    useEffect(() => {
        window.scrollTo(0, 0);
        const mainContainer = document.querySelector('.overflow-y-auto');
        if (mainContainer) mainContainer.scrollTo(0, 0);
    }, []);

    const activeHives = useMemo(() => {
        return [...(apiary.hives || [])]
            .filter((h) => h && !h._deleted)
            .sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
            );
    }, [apiary.hives]);

    const hivesWithLatest = useMemo(() => {
        return activeHives.map((hive) => {
            const sorted = getActiveInspectionsSorted(hive);
            return {
                hive,
                latest: sorted.length > 0 ? sorted[0] : null,
                totalCount: sorted.length,
            };
        });
    }, [activeHives]);

    const timelineEntries = useMemo(() => {
        const entries: { hive: Hive; insp: Inspection; idx: number }[] = [];
        activeHives.forEach((hive) => {
            (hive.inspections || []).forEach((insp, idx) => {
                if (insp && !insp._deleted) {
                    entries.push({ hive, insp, idx });
                }
            });
        });
        return entries.sort(compareInspectionsDesc);
    }, [activeHives]);

    return (
        <div className="animate-fade-in p-2 sm:p-4 pb-20">
            <div className="flex items-center gap-4 mb-5">
                <button
                    onClick={onBack}
                    className="flex items-center justify-center w-10 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-full shadow-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition border border-slate-200 dark:border-slate-600 shrink-0"
                    title="Torna indietro"
                >
                    <BackArrowIcon className="w-6 h-6" />
                </button>
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white truncate">
                        Log Ispezioni: {apiary.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {timelineEntries.length}{' '}
                        {timelineEntries.length === 1 ? 'ispezione registrata' : 'ispezioni registrate'} su{' '}
                        {activeHives.length} {activeHives.length === 1 ? 'arnia' : 'arnie'}
                    </p>
                </div>
            </div>

            {/* Selettore Vista */}
            <div className="flex bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl mb-5 border border-slate-200 dark:border-slate-700">
                <button
                    type="button"
                    onClick={() => setActiveTab('byHive')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
                        activeTab === 'byHive'
                            ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    Ultime per Arnia ({activeHives.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition ${
                        activeTab === 'timeline'
                            ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    Cronologia ({timelineEntries.length})
                </button>
            </div>

            {activeTab === 'byHive' ? (
                activeHives.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <BeehiveIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Nessuna arnia attiva in questo apiario.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {hivesWithLatest.map(({ hive, latest, totalCount }) => (
                            <div
                                key={hive.id}
                                onClick={() => onSelectHive && onSelectHive(hive)}
                                className={`bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${
                                    onSelectHive
                                        ? 'cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition'
                                        : ''
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/70">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <BeehiveIcon className="w-5 h-5 text-amber-500 shrink-0" />
                                        <h3 className="font-bold text-base text-slate-800 dark:text-white truncate">
                                            {hive.name}
                                        </h3>
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full shrink-0">
                                        {totalCount} {totalCount === 1 ? 'ispezione' : 'ispezioni'}
                                    </span>
                                </div>
                                {latest ? (
                                    <InspectionSummaryBody inspection={latest} />
                                ) : (
                                    <p className="text-xs text-slate-400 italic">Nessuna ispezione.</p>
                                )}
                            </div>
                        ))}
                    </div>
                )
            ) : timelineEntries.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <ClipboardIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Nessuna ispezione registrata in questo apiario.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {timelineEntries.map(({ hive, insp }, index) => (
                        <div
                            key={`${hive.id}-${insp.id}-${index}`}
                            onClick={() => onSelectHive && onSelectHive(hive)}
                            className={`bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${
                                onSelectHive
                                    ? 'cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition'
                                    : ''
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-700/70">
                                <div className="flex items-center gap-2 min-w-0">
                                    <BeehiveIcon className="w-5 h-5 text-amber-500 shrink-0" />
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                        {hive.name}
                                    </h3>
                                </div>
                                {insp.createdBy && (
                                    <span className="text-[10px] text-slate-400 italic truncate max-w-[140px]">
                                        {insp.createdBy}
                                    </span>
                                )}
                            </div>
                            <InspectionSummaryBody inspection={insp} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ApiaryLogView;
