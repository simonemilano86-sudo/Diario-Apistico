import { supabase } from './supabase';

const getBeekeepingAdvice = async (prompt: string, imageBase64?: string, history?: any[]): Promise<string> => {
    try {
        // Verifica che l'utente sia autenticato prima di chiamare la funzione
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            return "Devi accedere per utilizzare l'Assistente IA.";
        }

        // Chiama la Edge Function di Supabase
        console.log("Inviando richiesta a Gemini con token:", session.access_token ? "Presente" : "Mancante");

        const { data, error } = await supabase.functions.invoke('ask-gemini', {
            body: { prompt, imageBase64, history },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (error) {
            console.error("Errore dalla Edge Function:", error);
            throw new Error(error.message || "Errore di comunicazione con il server");
        }

        if (data && data.error) {
            throw new Error(data.error);
        }

        return data?.text || "Nessuna risposta generata dall'IA.";
    } catch (error: any) {
        console.error("Error calling Gemini Edge Function:", error);
        return `Si è verificato un errore con l'assistente: ${error.message || 'Errore di connessione'}`;
    }
};

export { getBeekeepingAdvice };