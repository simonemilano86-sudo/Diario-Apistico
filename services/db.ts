import { supabase } from './supabase';
import { Apiary, CalendarEvent, LocationData, SeasonalNote } from '../types';

export interface UserData {
  apiaries: Apiary[];
  calendarEvents: CalendarEvent[];
  savedLocation: LocationData | null;
  seasonalNotes: SeasonalNote[];
  deletedIds?: string[];
}

const CURRENT_TEAM_KEY = 'beewise-current-team-id';

export const getCurrentTeamId = () => {
  try {
    return localStorage.getItem(CURRENT_TEAM_KEY);
  } catch {
    return null;
  }
};

export const setCurrentTeamId = (teamId: string | null) => {
  try {
    if (!teamId) localStorage.removeItem(CURRENT_TEAM_KEY);
    else localStorage.setItem(CURRENT_TEAM_KEY, teamId);
  } catch {
    // ignore
  }
};

const getContext = (userId: string) => {
  const teamId = getCurrentTeamId();
  if (teamId) {
    return { table: 'team_data' as const, column: 'team_id' as const, idToUse: teamId, teamId };
  }
  return { table: 'user_data' as const, column: 'user_id' as const, idToUse: userId, teamId: null };
};

export type TeamOption = { team_id: string; team_name: string; role?: string };

/**
 * Elenca i team dell'utente dalla tabella memberships.
 * Richiede FK memberships.team_id -> teams.id per usare la join "teams(name)".
 */
export const fetchTeamsForUser = async (userId: string): Promise<TeamOption[]> => {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('team_id, role, teams(name)')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || [])
      .map((r: any) => ({
        team_id: r.team_id,
        team_name: r.teams?.name || 'Senza nome',
        role: r.role,
      }))
      .filter((t: TeamOption) => !!t.team_id);
  } catch (e: any) {
    console.warn('fetchTeamsForUser error:', e?.message || e);
    return [];
  }
};

export const saveToCloud = async (
  userId: string,
  data: UserData
): Promise<{ success: boolean; updatedAt?: string }> => {
  try {
    const ctx = getContext(userId);

    const payload: any =
      ctx.table === 'team_data'
        ? { team_id: ctx.idToUse, content: data, last_updated_by: userId }
        : { user_id: ctx.idToUse, content: data };

    const { data: returnedData, error } = await supabase
      .from(ctx.table)
      .upsert(payload, { onConflict: ctx.column })
      .select('updated_at')
      .single();

    if (error) throw error;
    return { success: true, updatedAt: returnedData?.updated_at };
  } catch (error) {
    console.error('Errore durante il salvataggio:', error);
    return { success: false };
  }
};

export const loadFromCloud = async (
  userId: string
): Promise<{ data: UserData | null; updatedAt: string | null }> => {
  try {
    const ctx = getContext(userId);

    const { data, error } = await supabase
      .from(ctx.table)
      .select('content, updated_at')
      .eq(ctx.column, ctx.idToUse)
      .maybeSingle();

    if (error) throw error;

    const content = (data?.content ?? null) as UserData | null;
    const updatedAt = (data as any)?.updated_at ?? null;

    // Se non c'è riga, torna null (chi chiama gestisce i default)
    return { data: content, updatedAt };
  } catch (error) {
    console.error('Errore durante il caricamento:', error);
    return { data: null, updatedAt: null };
  }
};

export const checkLastUpdate = async (userId: string): Promise<string | null> => {
  try {
    const ctx = getContext(userId);

    const { data, error } = await supabase
      .from(ctx.table)
      .select('updated_at')
      .eq(ctx.column, ctx.idToUse)
      .maybeSingle();

    if (error) throw error;
    return (data as any)?.updated_at ?? null;
  } catch {
    return null;
  }
};