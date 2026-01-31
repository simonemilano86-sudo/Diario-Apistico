
import { supabase } from './supabase';
import { Apiary, CalendarEvent, LocationData, SeasonalNote } from '../types';

export interface UserData {
    apiaries: Apiary[];
    calendarEvents: CalendarEvent[];
    savedLocation: LocationData | null;
    seasonalNotes: SeasonalNote[];
    lastUpdated: string;
}

export const saveToCloud = async (userId: string, data: Omit<UserData, 'lastUpdated'>) => {
    try {
        const { error } = await supabase
            .from('user_data')
            .upsert({ 
                user_id: userId, 
                content: data, 
                updated_at: new Date().toISOString() 
            });
        
        if (error) throw error;
        console.log('Dati salvati in cloud con successo');
        return true;
    } catch (error) {
        console.error('Errore durante il salvataggio in cloud:', error);
        return false;
    }
};

export const loadFromCloud = async (userId: string): Promise<UserData | null> => {
    try {
        const { data, error } = await supabase
            .from('user_data')
            .select('content')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // Nessun dato trovato (nuovo utente), non è un errore critico
                return null;
            }
            throw error;
        }

        return data?.content as UserData;
    } catch (error) {
        console.error('Errore durante il caricamento dal cloud:', error);
        return null;
    }
};