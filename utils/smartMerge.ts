import { Apiary, Hive, Inspection, CalendarEvent, SeasonalNote } from '../types';

// Helper per filtrare via gli elementi eliminati
const isNotDeleted = (id: string, deletedIds: Set<string>) => !deletedIds.has(id);

// Generic merge for arrays of objects with 'id' (SAFE)
function mergeArrays<T extends { id: string }>(
  local: T[] = [],
  cloud: T[] = [],
  deletedIds: Set<string>
): T[] {
  const mergedMap = new Map<string, T>();

  const safeLocal = Array.isArray(local) ? local : [];
  const safeCloud = Array.isArray(cloud) ? cloud : [];

  // 1. Start with Cloud data
  safeCloud.forEach((item) => {
    if (item?.id && isNotDeleted(item.id, deletedIds)) {
      mergedMap.set(item.id, item);
    }
  });

  // 2. Overlay Local data (PRIORITÀ AI DATI LOCALI)
  safeLocal.forEach((item) => {
    if (item?.id && isNotDeleted(item.id, deletedIds)) {
      mergedMap.set(item.id, item);
    }
  });

  return Array.from(mergedMap.values());
}

function mergeInspections(
  local: Inspection[] = [],
  cloud: Inspection[] = [],
  deletedIds: Set<string>
): Inspection[] {
  // Le ispezioni sono storiche.
  const merged = mergeArrays(local, cloud, deletedIds);
  // Ordiniamo per data decrescente per coerenza
  return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function mergeHives(
  local: Hive[] = [],
  cloud: Hive[] = [],
  deletedIds: Set<string>
): Hive[] {
  const safeLocal = Array.isArray(local) ? local : [];
  const safeCloud = Array.isArray(cloud) ? cloud : [];

  const mergedHives: Hive[] = [];
  const allIds = new Set([...safeLocal.map((h) => h.id), ...safeCloud.map((h) => h.id)]);

  allIds.forEach((id) => {
    if (!isNotDeleted(id, deletedIds)) return; // Salta se eliminato

    const localHive = safeLocal.find((h) => h.id === id);
    const cloudHive = safeCloud.find((h) => h.id === id);

    if (localHive && cloudHive) {
      // MERGE PROFONDO
      mergedHives.push({
        ...cloudHive,
        ...localHive,
        inspections: mergeInspections(localHive.inspections || [], cloudHive.inspections || [], deletedIds),
        movements: mergeArrays(localHive.movements || [], cloudHive.movements || [], deletedIds),
        productionRecords: mergeArrays(localHive.productionRecords || [], cloudHive.productionRecords || [], deletedIds),
      });
    } else if (localHive) {
      mergedHives.push(localHive);
    } else if (cloudHive) {
      mergedHives.push(cloudHive);
    }
  });

  return mergedHives;
}

export function smartMergeApiaries(
  local: Apiary[] = [],
  cloud: Apiary[] = [],
  deletedIds: string[] = []
): Apiary[] {
  const deletedSet = new Set(deletedIds);
  const mergedApiaries: Apiary[] = [];

  const allIds = new Set([...local.map((a) => a.id), ...cloud.map((a) => a.id)]);

  allIds.forEach((id) => {
    if (!isNotDeleted(id, deletedSet)) return;

    const localApiary = local.find((a) => a.id === id);
    const cloudApiary = cloud.find((a) => a.id === id);

    if (localApiary && cloudApiary) {
      mergedApiaries.push({
        ...cloudApiary,
        ...localApiary,
        hives: mergeHives(localApiary.hives || [], cloudApiary.hives || [], deletedSet),
      });
    } else if (localApiary) {
      mergedApiaries.push(localApiary);
    } else if (cloudApiary) {
      mergedApiaries.push(cloudApiary);
    }
  });

  return mergedApiaries;
}

export function smartMergeEvents(
  local: CalendarEvent[] = [],
  cloud: CalendarEvent[] = [],
  deletedIds: string[] = []
): CalendarEvent[] {
  return mergeArrays(local, cloud, new Set(deletedIds));
}

export function smartMergeNotes(
  local: SeasonalNote[] = [],
  cloud: SeasonalNote[] = [],
  deletedIds: string[] = []
): SeasonalNote[] {
  const deletedSet = new Set(deletedIds);
  const merged: SeasonalNote[] = [];

  const safeLocal = Array.isArray(local) ? local : [];
  const safeCloud = Array.isArray(cloud) ? cloud : [];

  const allIds = new Set([...safeLocal.map((n) => n.id), ...safeCloud.map((n) => n.id)]);

  allIds.forEach((id) => {
    if (!isNotDeleted(id, deletedSet)) return;

    const l = safeLocal.find((n) => n.id === id);
    const c = safeCloud.find((n) => n.id === id);

    if (l && c) {
      // Per le note usiamo il timestamp perché hanno un campo 'updatedAt' esplicito
      const lDate = new Date(l.updatedAt).getTime();
      const cDate = new Date(c.updatedAt).getTime();
      const winningNote = lDate >= cDate ? l : c;

      merged.push({
        ...winningNote,
        blooms: winningNote.blooms || [],
      });
    } else if (l) merged.push(l);
    else if (c) merged.push(c);
  });

  return merged;
}