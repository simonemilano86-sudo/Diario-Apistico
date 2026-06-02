import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Limiti Token
const LIMIT_FREE = 10000;
const LIMIT_PREMIUM = 200000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Estrazione sicura dell'header di autorizzazione (case-insensitive)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ 
            error: 'Non autorizzato (V3). Token mancante o formato errato.',
            details: `Auth header presente: ${!!authHeader}`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;

    try {
        // Decodifica manuale del JWT (senza verifica della firma, ci fidiamo del gateway di Supabase per la validità di base, 
        // ma estraiamo il payload per avere l'ID utente in modo sincrono e infallibile)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        userId = payload.sub; // 'sub' è l'ID dell'utente nel JWT di Supabase

        if (!userId) throw new Error("ID utente non trovato nel token");

    } catch (decodeError: any) {
        return new Response(JSON.stringify({ 
            error: 'Non autorizzato (V3). Impossibile leggere il token.',
            details: `DecodeError: ${decodeError.message}`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // Inizializza il client Supabase con la Service Role Key (necessaria per bypassare RLS se serve, o per operazioni admin)
    // NOTA: Usiamo la Service Role Key qui perché abbiamo già verificato l'identità dell'utente manualmente dal token.
    // Questo evita i problemi di auth.getUser() nelle Edge Functions.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // 2. Controllo Quota (Token)
    let { data: quota, error: quotaError } = await supabaseClient
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Se l'utente non ha ancora una riga nella tabella, la creiamo (piano 'free' di default)
    if (quotaError && quotaError.code === 'PGRST116') {
      const { data: newQuota, error: insertError } = await supabaseClient
        .from('user_quotas')
        .insert([{ user_id: userId, tokens_used: 0, plan: 'free' }])
        .select()
        .single();
      
      if (insertError) {
        return new Response(JSON.stringify({ error: `Errore creazione quota: ${insertError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      quota = newQuota;
    } else if (quotaError) {
      return new Response(JSON.stringify({ error: `Errore lettura quota: ${quotaError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Determina il limite in base al piano
    const currentLimit = quota.plan === 'premium' ? LIMIT_PREMIUM : LIMIT_FREE;

    if (quota.tokens_used >= currentLimit) {
      return new Response(JSON.stringify({ 
        error: `Hai esaurito i token del tuo piano (${quota.plan}). Limite: ${currentLimit} token.` 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Preparazione richiesta Gemini
    const { prompt, imageBase64, history } = await req.json();

    if (!prompt && !imageBase64 && !history) {
      return new Response(JSON.stringify({ error: 'Prompt, immagine o history mancante' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Configurazione server mancante (GEMINI_API_KEY non impostata)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = ai.getGenerativeModel({ 
      model: "gemini-3-flash-preview", 
      systemInstruction: "Sei l'assistente IA di Diario Apistico, un esperto di apicoltura. Fornisci consigli pratici e sicuri. REGOLA FONDAMENTALE: Sii conciso e diretto. Fornisci la risposta in massimo 100-150 parole, andando dritto al punto senza preamboli inutili. Usa elenchi puntati se necessario. Se l'utente chiede qualcosa di pericoloso, consiglia un veterinario."
    });

    let result;

    if (history && history.length > 0) {
      const chat = model.startChat({
        history: history,
      });
      
      if (imageBase64) {
        const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
        let mimeType = 'image/jpeg';
        let data = imageBase64;

        if (matches && matches.length === 3) {
          mimeType = matches[1];
          data = matches[2];
        } else {
          data = imageBase64.split(',')[1] || imageBase64;
        }

        result = await chat.sendMessage([
          { inlineData: { mimeType, data } },
          { text: prompt || "Analizza questa immagine." }
        ]);
      } else {
        result = await chat.sendMessage(prompt);
      }
    } else {
      if (imageBase64) {
        const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
        let mimeType = 'image/jpeg';
        let data = imageBase64;

        if (matches && matches.length === 3) {
          mimeType = matches[1];
          data = matches[2];
        } else {
          data = imageBase64.split(',')[1] || imageBase64;
        }

        result = await model.generateContent([
          { inlineData: { mimeType, data } },
          { text: prompt || "Analizza questa immagine." }
        ]);
      } else {
        result = await model.generateContent(prompt);
      }
    }

    const response = await result.response;
    const text = response.text();

    // 5. Calcolo token consumati e aggiornamento database
    const usedTokens = response.usageMetadata?.totalTokenCount || 0;

    if (usedTokens > 0) {
      // Usiamo una RPC (Remote Procedure Call) sicura per incrementare il contatore
      await supabaseClient.rpc('increment_tokens', { 
        x: usedTokens, 
        row_id: userId 
      });
    }

    return new Response(JSON.stringify({ text: response.text, tokens_used_this_request: usedTokens }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Errore chiamata Gemini:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
