import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY mancante nei Secrets di Supabase.');
      return json(500, {
        error: 'Configurazione pagamenti incompleta sul server (manca STRIPE_SECRET_KEY).',
      });
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return json(401, { error: 'Sessione non valida. Effettua di nuovo il login.' });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user || !user.email) {
      return json(401, { error: 'Utente non autenticato o email mancante.' });
    }

    const body = await req.json().catch(() => ({}));
    const returnUrl = resolveSafeReturnUrl(body?.returnUrl);

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const rawEmail = user.email.trim();
    const lowerEmail = rawEmail.toLowerCase();

    // Cerchiamo i clienti Stripe per email (provando prima esatta, poi minuscola se diversa)
    const customerCandidates: Stripe.Customer[] = [];
    const exactList = await stripe.customers.list({ email: rawEmail, limit: 10 });
    customerCandidates.push(...exactList.data);

    if (customerCandidates.length === 0 && lowerEmail !== rawEmail) {
      const lowerList = await stripe.customers.list({ email: lowerEmail, limit: 10 });
      customerCandidates.push(...lowerList.data);
    }

    if (customerCandidates.length === 0) {
      return json(404, {
        error:
          'Nessun abbonamento Stripe trovato per questa email. Se il piano è stato attivato manualmente o tramite invito/regalo, non è gestibile dal portale di fatturazione.',
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
          'Il Portale Clienti Stripe non è ancora stato attivato nella Dashboard Stripe (Impostazioni → Fatturazione → Portale clienti → Salva).',
      });
    }

    return json(500, { error: msg });
  }
});
