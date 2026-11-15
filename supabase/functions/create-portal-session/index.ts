import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function resolveSafeReturnUrl(rawReturnUrl?: string | null): string {
  const defaultUrl = 'https://app.diarioapistico.com/';
  if (!rawReturnUrl || typeof rawReturnUrl !== 'string') return defaultUrl;

  try {
    const parsed = new URL(rawReturnUrl);
    if (parsed.protocol !== 'https:') return defaultUrl;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'app.diarioapistico.com' ||
      host === 'diarioapistico.com' ||
      host.endsWith('.diarioapistico.com') ||
      host.endsWith('.run.app')
    ) {
      return parsed.toString();
    }
  } catch {
    // ignore invalid URL
  }
  return defaultUrl;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json(405, { error: 'Metodo non consentito' });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY mancante nei Secrets di Supabase.');
      return json(500, {
        error: 'Configurazione pagamenti incompleta sul server (manca STRIPE_SECRET_KEY).',
      });
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return json(401, { error: 'Sessione non valida. Effettua di nuovo il login.' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return json(401, { error: 'Token di autenticazione mancante. Effettua di nuovo il login.' });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    let userId: string | null = userData?.user?.id || null;
    let userEmail: string | null =
      userData?.user?.email || userData?.user?.user_metadata?.email || null;

    if ((!userId || !userEmail || userErr) && supabaseServiceKey) {
      try {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: adminUserData, error: adminErr } = await adminClient.auth.getUser(token);
        if (!adminErr && adminUserData?.user) {
          userId = adminUserData.user.id || userId;
          userEmail =
            adminUserData.user.email || adminUserData.user.user_metadata?.email || userEmail;
        }
      } catch (fallbackErr) {
        console.warn('Fallback adminClient.auth.getUser fallito:', fallbackErr);
      }
    }

    if (!userId && !userEmail) {
      console.error('Autenticazione fallita in create-portal-session:', userErr?.message || 'utente assente');
      return json(401, {
        error: 'Sessione scaduta o utente non autenticato. Esci e rientra nell’account, poi riprova.',
      });
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = resolveSafeReturnUrl(body?.returnUrl);

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const candidateMap = new Map<string, Stripe.Customer>();
    const addCandidate = (c: Stripe.Customer | Stripe.DeletedCustomer | null | undefined) => {
      if (c && !('deleted' in c && c.deleted) && c.id) {
        candidateMap.set(c.id, c as Stripe.Customer);
      }
    };

    // 1) Ricerca per supabase_user_id salvato nei metadata del Customer Stripe
    if (userId) {
      try {
        const safeId = userId.replace(/'/g, '');
        const byMeta = await stripe.customers.search({
          query: `metadata['supabase_user_id']:'${safeId}'`,
          limit: 10,
        });
        for (const c of byMeta.data) addCandidate(c);
      } catch (searchErr) {
        console.warn('Avviso customers.search per supabase_user_id:', searchErr);
      }
    }

    // 2) Ricerca per email dell'account (esatta + minuscola)
    if (userEmail) {
      const rawEmail = userEmail.trim();
      const lowerEmail = rawEmail.toLowerCase();

      const exactList = await stripe.customers.list({ email: rawEmail, limit: 10 });
      for (const c of exactList.data) addCandidate(c);

      if (lowerEmail !== rawEmail) {
        const lowerList = await stripe.customers.list({ email: lowerEmail, limit: 10 });
        for (const c of lowerList.data) addCandidate(c);
      }
    }

    // 3) Fallback fondamentale per Google Pay / Apple Pay / Stripe Link con email diversa:
    //    cerchiamo nelle Checkout Sessions chi ha acquistato con client_reference_id === userId
    if (userId && candidateMap.size === 0) {
      try {
        const recentSessions = await stripe.checkout.sessions.list({ limit: 100 });
        for (const sess of recentSessions.data) {
          if (sess.client_reference_id === userId && sess.customer) {
            const custId =
              typeof sess.customer === 'string' ? sess.customer : sess.customer.id;
            if (custId && !candidateMap.has(custId)) {
              const retrieved = await stripe.customers.retrieve(custId);
              addCandidate(retrieved);
            }
          }
        }
      } catch (sessErr) {
        console.warn('Avviso ricerca checkout.sessions per client_reference_id:', sessErr);
      }
    }

    const customerCandidates = Array.from(candidateMap.values());

    if (customerCandidates.length === 0) {
      return json(404, {
        error:
          'Nessun abbonamento Stripe attivo trovato per questo account. Se il piano è stato attivato manualmente o tramite codice regalo, non richiede annullamento su Stripe.',
      });
    }

    // Diamo priorità al Customer che ha un abbonamento attivo, in prova o scaduto/past_due
    let chosenCustomer: Stripe.Customer = customerCandidates[0];
    let foundPrioritySub = false;

    for (const candidate of customerCandidates) {
      const subs = await stripe.subscriptions.list({
        customer: candidate.id,
        status: 'all',
        limit: 5,
      });

      const hasActiveOrPending = subs.data.some((s) =>
        ['active', 'trialing', 'past_due', 'unpaid', 'paused'].includes(s.status)
      );

      if (hasActiveOrPending) {
        chosenCustomer = candidate;
        foundPrioritySub = true;
        break;
      }

      if (!foundPrioritySub && subs.data.length > 0) {
        chosenCustomer = candidate;
      }
    }

    // Assicuriamoci che supabase_user_id sia salvato sul Customer scelto per futuri webhook di disdetta
    if (userId && chosenCustomer.metadata?.supabase_user_id !== userId) {
      try {
        await stripe.customers.update(chosenCustomer.id, {
          metadata: {
            ...(chosenCustomer.metadata || {}),
            supabase_user_id: userId,
            ...(userEmail ? { app_email: userEmail.trim().toLowerCase() } : {}),
          },
        });
      } catch (metaErr) {
        console.warn('Avviso salvataggio metadata su Stripe Customer:', metaErr);
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: chosenCustomer.id,
      return_url: returnUrl,
    });

    return json(200, { url: portalSession.url });
  } catch (err: any) {
    console.error('Errore create-portal-session:', err);
    const msg = String(err?.message || 'Impossibile aprire il portale abbonamento.');

    if (msg.toLowerCase().includes('no configuration provided')) {
      return json(500, {
        error:
          'Il Portale Clienti Stripe non è ancora stato salvato nella Dashboard Stripe (Impostazioni → Fatturazione → Portale clienti → Salva).',
      });
    }

    return json(500, { error: msg });
  }
});
