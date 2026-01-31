import { GoogleGenAI } from "@google/genai";

const getBeekeepingAdvice = async (prompt: string, imageBase64?: string): Promise<string> => {
    try {
        // Initialization using process.env.API_KEY directly as per guidelines
        // The API key is assumed to be pre-configured and valid via vite.config.ts replacement.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let contents: any;

        if (imageBase64) {
            // Extract mimeType and base64 data from Data URL if present
            const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
            let mimeType = 'image/jpeg'; // Default fallback
            let data = imageBase64;

            if (matches && matches.length === 3) {
                mimeType = matches[1];
                data = matches[2];
            } else {
                // Legacy fallback for raw base64 or data url without regex match
                data = imageBase64.split(',')[1] || imageBase64;
            }
            
            contents = {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: data
                        }
                    }
                ]
            };
        } else {
            contents = prompt;
        }

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: contents,
            config: {
                systemInstruction: `Sei l'assistente IA di Diario Apistico, un esperto di apicoltura. Il tuo obiettivo è fornire consigli chiari, pratici e sicuri agli apicoltori. Struttura le tue risposte con markdown per la leggibilità. Usa intestazioni, elenchi puntati e testo in grassetto. Se l'utente ti invia una foto, analizzala attentamente per identificare problemi, malattie o caratteristiche dell'arnia. Se un utente chiede qualcosa di potenzialmente pericoloso o che richiede competenze locali, consiglia vivamente di consultare un apicoltore esperto locale o un veterinario. Inizia sempre la risposta con un saluto cordiale.`,
            },
        });
        
        return response.text || "Nessuna risposta generata dall'IA.";
    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        return `Si è verificato un errore con l'assistente: ${error.message || 'Errore di connessione'}`;
    }
};

export { getBeekeepingAdvice };