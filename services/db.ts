import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import { Apiary, CalendarEvent, LocationData, SeasonalNote, TeamOption } from '../types';

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

const getContext = (userId: string, teamIdOverride?: string | null) => {
  const teamId = teamIdOverride !== undefined ? teamIdOverride : getCurrentTeamId();
  if (teamId) {
    return { table: 'team_data' as const, column: 'team_id' as const, idToUse: teamId, teamId };
  }
  return { table: 'user_data' as const, column: 'user_id' as const, idToUse: userId, teamId: null };
};

// --- COMPRESSIONE PAYLOAD ---
async function preparePayloadContent(data: UserData): Promise<any> {
  if (typeof window.CompressionStream !== 'undefined') {
    try {
      const jsonString = JSON.stringify(data);
      const stream = new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'));
      const response = new Response(stream);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
      }
      return { _compressed: true, data: btoa(binary) };
    } catch (e) {
      console.warn('Compression failed, falling back to uncompressed', e);
      return data;
    }
  }
  return data;
}

async function parsePayloadContent(content: any): Promise<UserData | null> {
  if (!content) return null;
  if (content._compressed && content.data) {
    try {
      const binary = atob(content.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const response = new Response(stream);
      const jsonString = await response.text();
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('Decompression failed', e);
      return null;
    }
  }
  return content as UserData;
}

export const fetchTeamsForUser = async (userId: string): Promise<TeamOption[]> => {
  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('team_id, role, status, teams(name)')
      .eq('user_id', userId)
      .eq('status', 'active');

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
  data: UserData,
  teamIdOverride?: string | null
): Promise<{ success: boolean; updatedAt?: string }> => {
  try {
    const ctx = getContext(userId, teamIdOverride);

    // Fast-path: Check if we have a valid token locally to bypass getSession() hangs
    let isSessionHealthy = false;
    let localToken = null;
    try {
        const tokenStr = localStorage.getItem('sb-uqvovgxdfleosaodpyyb-auth-token');
        if (tokenStr) {
            const parsed = JSON.parse(tokenStr);
            if (parsed?.access_token && parsed?.expires_at && (parsed.expires_at * 1000 > Date.now() + 60000)) {
                isSessionHealthy = true;
                localToken = parsed.access_token;
            }
        }
    } catch (err) {}

    let useDirectFetch = isSessionHealthy;
    let sessionPromise;
    
    if (!isSessionHealthy) {
        // Only call getSession if we don't have a healthy local token
        sessionPromise = supabase.auth.getSession();
        const startTime = Date.now();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 2000));
        
        try {
            await Promise.race([sessionPromise, timeoutPromise]);
            console.log(`Session check took ${Date.now() - startTime}ms`);
        } catch (e) {
            console.warn(`Session check timed out after ${Date.now() - startTime}ms, using direct fetch fallback for save`);
            useDirectFetch = true;
        }
    }

    const contentToSave = await preparePayloadContent(data);
    const payload: any =
      ctx.table === 'team_data'
        ? { team_id: ctx.idToUse, content: contentToSave, last_updated_by: userId }
        : { user_id: ctx.idToUse, content: contentToSave };

    let returnedData, error;
    if (useDirectFetch) {
        const tokenStr = localStorage.getItem('sb-uqvovgxdfleosaodpyyb-auth-token');
        let token = SUPABASE_ANON_KEY;
        if (tokenStr) {
            try {
                const parsed = JSON.parse(tokenStr);
                if (parsed?.access_token) token = parsed.access_token;
            } catch (err) {}
        }
        const url = `${SUPABASE_URL}/rest/v1/${ctx.table}?on_conflict=${ctx.column}&select=updated_at`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Direct fetch failed: ${res.statusText}`);
        const json = await res.json();
        returnedData = json;
        error = null;
    } else {
        const res = await supabase
          .from(ctx.table)
          .upsert(payload, { onConflict: ctx.column })
          .select('updated_at');
        returnedData = res.data;
        error = res.error;
    }

    if (error) throw error;
    
    const updatedAt = returnedData && returnedData.length > 0 
      ? returnedData[0].updated_at 
      : new Date().toISOString();

    return { success: true, updatedAt };
  } catch (error) {
    console.error('Errore durante il salvataggio:', error);
    return { success: false };
  }
};

export const loadFromCloud = async (
  userId: string,
  teamIdOverride?: string | null
): Promise<{ data: UserData | null; updatedAt: string | null }> => {
  try {
    const ctx = getContext(userId, teamIdOverride);
    
    // Fast-path: Check if we have a valid token locally to bypass getSession() hangs
    let isSessionHealthy = false;
    let localToken = null;
    try {
        const tokenStr = localStorage.getItem('sb-uqvovgxdfleosaodpyyb-auth-token');
        if (tokenStr) {
            const parsed = JSON.parse(tokenStr);
            if (parsed?.access_token && parsed?.expires_at && (parsed.expires_at * 1000 > Date.now() + 60000)) {
                isSessionHealthy = true;
                localToken = parsed.access_token;
            }
        }
    } catch (err) {}

    let useDirectFetch = isSessionHealthy;
    let sessionPromise;
    
    if (!isSessionHealthy) {
        // Only call getSession if we don't have a healthy local token
        sessionPromise = supabase.auth.getSession();
        const startTime = Date.now();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 2000));
        
        try {
            await Promise.race([sessionPromise, timeoutPromise]);
            console.log(`Session check took ${Date.now() - startTime}ms`);
        } catch (e) {
            console.warn(`Session check timed out after ${Date.now() - startTime}ms, using direct fetch fallback for load`);
            useDirectFetch = true;
        }
    }

    let data, error;
    if (useDirectFetch) {
        const tokenStr = localStorage.getItem('sb-uqvovgxdfleosaodpyyb-auth-token');
        let token = SUPABASE_ANON_KEY;
        if (tokenStr) {
            try {
                const parsed = JSON.parse(tokenStr);
                if (parsed?.access_token) token = parsed.access_token;
            } catch (err) {}
        }
        const url = `${SUPABASE_URL}/rest/v1/${ctx.table}?${ctx.column}=eq.${ctx.idToUse}&select=content,updated_at`;
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error(`Direct fetch failed: ${res.statusText}`);
        const json = await res.json();
        data = json.length > 0 ? json[0] : null;
        error = null;
    } else {
        const res = await supabase
          .from(ctx.table)
          .select('content, updated_at')
          .eq(ctx.column, ctx.idToUse)
          .maybeSingle();
        data = res.data;
        error = res.error;
    }

    console.log('loadFromCloud: result', { data, error });

    if (error) throw error;

    const content = await parsePayloadContent(data?.content);
    const updatedAt = (data as any)?.updated_at ?? null;

    return { data: content, updatedAt };
  } catch (error) {
    console.error('Errore durante il caricamento:', error);
    return { data: null, updatedAt: null };
  }
};

export const checkLastUpdate = async (userId: string, teamIdOverride?: string | null): Promise<string | null> => {
  try {
    const ctx = getContext(userId, teamIdOverride);

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

export const fetchScaleData = async (scaleIdOrApiaryId: string, limit = 10000): Promise<ScaleDataPoint[]> => {
  try {
    const { data, error } = await supabase
      .from('scale_data')
      .select('*')
      .or(`apiaryId.eq.${scaleIdOrApiaryId},scaleId.eq.${scaleIdOrApiaryId}`)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching scale data:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Exception fetching scale data:', error);
    return [];
  }
};

export const fetchUserScales = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('scales_registry')
      .select('*')
      .eq('userId', userId);
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('fetchUserScales error:', e);
    return [];
  }
};

export const registerScale = async (scaleData: any) => {
  try {
    const { data, error } = await supabase
      .from('scales_registry')
      .upsert(scaleData, { onConflict: 'scaleId' })
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  } catch (e) {
    console.error('registerScale error:', e);
    return null;
  }
};

export const saveScaleCommand = async (command: Partial<ScaleCommand>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('scale_commands')
      .insert([
        {
          ...command,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('Error saving scale command:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Exception saving scale command:', error);
    return false;
  }
};

export const fetchUserPlan = async (userId: string): Promise<'free' | 'premium' | null> => {
  try {
    const { data, error } = await supabase
      .from('user_quotas')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching user plan:', error);
      return null;
    }
    
    return data?.plan === 'premium' ? 'premium' : 'free';
  } catch (error) {
    console.error('Exception fetching user plan:', error);
    return null;
  }
};

export const upgradeToPremium = async (userId: string, plan: 'premium' | 'team' | 'enterprise' = 'premium'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_quotas')
      .upsert({ user_id: userId, plan: plan, tokens_used: 0 }, { onConflict: 'user_id' });
      
    if (error) {
      console.error('Error upgrading to premium:', error);
      return false;
    }
    
    // Aggiorniamo anche la cache locale immediatamente
    localStorage.setItem(`beewise:plan:${userId}`, plan);
    
    return true;
  } catch (error) {
    console.error('Exception upgrading to premium:', error);
    return false;
  }
};