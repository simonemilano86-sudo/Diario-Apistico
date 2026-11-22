import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI, ThinkingLevel } from "npm:@google/genai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Limiti Token
const LIMIT_FREE = 10000;
const LIMIT_PREMIUM = 200000;

const SYSTEM_INSTRUCTION =
  "Sei l'assistente IA di Diario Apistico, un esperto di apicoltura. Fornisci consigli pratici e sicuri. REGOLA FONDAMENTALE: Sii conciso e diretto. Fornisci la risposta in massimo 100-150 parole, andando dritto al punto senza preamboli inutili. Usa elenchi puntati se necessario. Se l'utente chiede qualcosa di pericoloso, consiglia un veterinario.";

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
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const payload = JSON.parse(jsonPayload);
      userId = payload.sub;

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

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseKey = serviceRoleKey ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      supabaseKey,
      serviceRoleKey ? undefined : { global: { headers: { Authorization: authHeader } } }
    );

    // Controllo Quota (Token)
    let { data: quota, error: quotaError } = await supabaseClient
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

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

    const isPaidPlanRaw =
      quota.plan === 'premium' || quota.plan === 'team' || quota.plan === 'enterprise';

    let effectivePlan: string = quota.plan || 'free';
    let currentUsed: number = Number(quota.tokens_used) || 0;
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Controllo scadenza piano temporaneo / referral / regalo (valid_until)
    if (isPaidPlanRaw && quota.valid_until) {
      const expiresAt = new Date(quota.valid_until).getTime();
      if (!Number.isNaN(expiresAt) && expiresAt < now.getTime()) {
        effectivePlan = 'free';
        currentUsed = 0;
        if (serviceRoleKey) {
          await supabaseClient
            .from('user_quotas')
            .update({
              plan: 'free',
              valid_until: null,
              tokens_used: 0,
              last_reset: nowIso,
            })
            .eq('user_id', userId);
        }
      }
    }

    const isPaidPlan =
      effectivePlan === 'premium' || effectivePlan === 'team' || effectivePlan === 'enterprise';

    // 2. Reset mensile automatico (ogni 30 giorni) per i piani a pagamento (inclusi annuali/regali/referral)
    if (isPaidPlan) {
      const lastResetMs = quota.last_reset ? new Date(quota.last_reset).getTime() : 0;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (!lastResetMs || Number.isNaN(lastResetMs)) {
        if (serviceRoleKey) {
          await supabaseClient
            .from('user_quotas')
            .update({ last_reset: nowIso })
            .eq('user_id', userId);
        }
      } else if (now.getTime() - lastResetMs >= thirtyDaysMs) {
        currentUsed = 0;
        if (serviceRoleKey) {
          await supabaseClient
            .from('user_quotas')
            .update({ tokens_used: 0, last_reset: nowIso })
            .eq('user_id', userId);
        }
      }
    }

    const currentLimit = isPaidPlan ? LIMIT_PREMIUM : LIMIT_FREE;

    if (currentUsed >= currentLimit) {
      return new Response(JSON.stringify({
        error: `Hai esaurito i token del tuo piano (${effectivePlan}). Limite: ${currentLimit} token.`,
        quota_exceeded: true,
        tokens_used: currentUsed,
        tokens_limit: currentLimit,
        plan: effectivePlan,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Preparazione richiesta Gemini con SDK @google/genai
    const { prompt, imageBase64, history } = await req.json();

    if (!prompt && !imageBase64 && !history) {
      return new Response(JSON.stringify({ error: 'Prompt, immagine o history mancante' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Configurazione server mancante (GEMINI_API_KEY non impostata)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const userParts: any[] = [];
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
      userParts.push({ inlineData: { mimeType, data } });
    }
    userParts.push({ text: prompt || "Analizza questa immagine." });

    const sanitizedHistory = Array.isArray(history)
      ? history
          .filter(
            (m: any) => m && (m.role === 'user' || m.role === 'model') && Array.isArray(m.parts) && m.parts.length > 0
          )
          .slice(-12)
      : [];

    const contents = [
      ...sanitizedHistory,
      { role: 'user', parts: userParts },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
      },
    });

    const text = response.text || '';
    const usedTokens = response.usageMetadata?.totalTokenCount || 0;
    const newTokensUsed = currentUsed + usedTokens;

    if (usedTokens > 0) {
      await supabaseClient.rpc('increment_tokens', {
        x: usedTokens,
        row_id: userId,
      });
    }

    return new Response(JSON.stringify({
      text,
      tokens_used_this_request: usedTokens,
      tokens_used: newTokensUsed,
      tokens_limit: currentLimit,
      plan: effectivePlan,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Errore chiamata Gemini:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Errore interno Gemini' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
