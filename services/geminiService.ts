import { supabase } from './supabase';

const getBeekeepingAdvice = async (prompt: string, imageBase64?: string, history?: any[]): Promise<string> => {
    try {
        // Verifica e aggiorna la sessione se il token è vicino alla scadenza
        let { data: { session } } = await supabase.auth.getSession();

        if (session?.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
            const { data: refreshed } = await supabase.auth.refreshSession();
            if (refreshed.session) {
                session = refreshed.session;
            }
        }

        if (!session) {
            return "Devi accedere per utilizzare l'Assistente IA.";
        }

        const { data, error } = await supabase.functions.invoke('ask-gemini', {
            body: { prompt, imageBase64, history },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (error) {
            let detailedMsg = error.message || "Errore di comunicazione con il server";
            try {
                if ((error as any).context && typeof (error as any).context.json === 'function') {
                    const errBody = await (error as any).context.json();
                    if (errBody?.error) {
                        detailedMsg = errBody.error;
                    } else if (errBody?.message) {
                        detailedMsg = errBody.message;
                    }
                }
            } catch {
                // fallback al messaggio standard
            }
            console.error("Errore dalla Edge Function:", detailedMsg, error);
            throw new Error(detailedMsg);
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