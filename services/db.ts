
import { supabase } from './supabase';
import { Apiary, CalendarEvent, LocationData, SeasonalNote } from '../types';

export interface UserData {
    apiaries: Apiary[];
    calendarEvents: CalendarEvent[];
    savedLocation: LocationData | null;
    seasonalNotes: SeasonalNote[];
    deletedIds?: string[]; // Nuovo campo per tracciare gli ID eliminati globalmente
}

// Modificato per restituire il timestamp aggiornato e lo status
export const saveToCloud = async (userId: string, data: UserData): Promise<{ success: boolean; updatedAt?: string }> => {
    try {
        const { data: returnedData, error } = await supabase
            .from('user_data')
            .upsert({ 
                user_id: userId, 
                content: data, 
                updated_at: new Date().toISOString() 
            })
            .select('updated_at')
            .single();
        
        if (error) throw error;
        console.log('Dati salvati in cloud con successo');
        return { success: true, updatedAt: returnedData?.updated_at };
    } catch (error) {
        console.error('Errore durante il salvataggio in cloud:', error);
        return { success: false };
    }
};

// Modificato per restituire anche il timestamp del server
export const loadFromCloud = async (userId: string): Promise<{ data: UserData | null; updatedAt: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('content, updated_at')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // Nessun dato trovato (nuovo utente)
                return { data: null, updatedAt: null };
            }
            throw error;
        }

        return { data: data?.content as UserData, updatedAt: data?.updated_at };
    } catch (error) {
        console.error('Errore durante il caricamento dal cloud:', error);
        return { data: null, updatedAt: null };
    }
};

// Controllo leggero per il polling
export const checkLastUpdate = async (userId: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('updated_at')
            .eq('user_id', userId)
            .single();
        
        if (error) return null;
        return data?.updated_at;
    } catch (error) {
        return null;
    }
};
