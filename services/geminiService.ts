import { supabase } from './supabase';

export interface AiAdviceResponse {
    text: string;
    tokensUsed?: number;
    tokensLimit?: number;
    plan?: string;
    quotaExceeded?: boolean;
    errorMessage?: string;
}

const askBeekeepingAssistant = async (prompt: string, imageBase64?: string, history?: any[]): Promise<AiAdviceResponse> => {
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
            return {
                text: "Devi accedere per utilizzare l'Assistente IA.",
                errorMessage: "Devi accedere per utilizzare l'Assistente IA.",
            };
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
            if (data.quota_exceeded) {
                return {
                    text: data.error,
                    tokensUsed: data.tokens_used,
                    tokensLimit: data.tokens_limit,
                    plan: data.plan,
                    quotaExceeded: true,
                    errorMessage: data.error,
                };
            }
            throw new Error(data.error);
        }

        return {
            text: data?.text || "Nessuna risposta generata dall'IA.",
            tokensUsed: typeof data?.tokens_used === 'number' ? data.tokens_used : undefined,
            tokensLimit: typeof data?.tokens_limit === 'number' ? data.tokens_limit : undefined,
            plan: data?.plan,
        };
    } catch (error: any) {
        console.error("Error calling Gemini Edge Function:", error);
        const msg = `Si è verificato un errore con l'assistente: ${error.message || 'Errore di connessione'}`;
        return {
            text: msg,
            errorMessage: msg,
        };
    }
};

const getBeekeepingAdvice = async (prompt: string, imageBase64?: string, history?: any[]): Promise<string> => {
    const res = await askBeekeepingAssistant(prompt, imageBase64, history);
    return res.text;
};

export { getBeekeepingAdvice, askBeekeepingAssistant };