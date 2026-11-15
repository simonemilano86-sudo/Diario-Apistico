import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

const AUTH_TOKEN_STORAGE_KEY = 'sb-uqvovgxdfleosaodpyyb-auth-token';

async function getValidAccessToken(): Promise<string> {
  let fallbackToken: string | null = null;
  try {
    const raw = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access_token) {
        fallbackToken = parsed.access_token;
        if (parsed?.expires_at && parsed.expires_at * 1000 > Date.now() + 60000) {
          return parsed.access_token;
        }
      }
    }
  } catch {
    // ignore storage errors
  }

  try {
    const sessionRes = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AUTH_SESSION_TIMEOUT')), 3000)
      ),
    ]);
    if (sessionRes.error && !fallbackToken) throw sessionRes.error;
    const token = sessionRes.data?.session?.access_token || fallbackToken;
    if (!token) throw new Error('Sessione non valida. Effettua nuovamente il login.');
    return token;
  } catch (err) {
    if (fallbackToken) return fallbackToken;
    throw err instanceof Error && err.message !== 'AUTH_SESSION_TIMEOUT'
      ? err
      : new Error('Sessione scaduta o non disponibile. Ricarica l’app e riprova.');
  }
}

async function extractInvokeErrorMessage(error: any, data: any): Promise<string> {
  if (data && typeof data === 'object' && (data.error || data.details)) {
    return data.details ? `${data.error || 'Errore'}: ${data.details}` : String(data.error);
  }

  const ctx = error?.context;
  if (ctx) {
    try {
      const target = typeof ctx.clone === 'function' ? ctx.clone() : ctx;
      if (typeof target.json === 'function') {
        const errBody = await target.json();
        if (errBody && (errBody.error || errBody.message)) {
          const base = errBody.error || errBody.message;
          return errBody.details ? `${base}: ${errBody.details}` : String(base);
        }
      }
    } catch {
      try {
        const target = typeof ctx.clone === 'function' ? ctx.clone() : ctx;
        if (typeof target.text === 'function') {
          const text = await target.text();
          if (text) return text;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return error?.message || 'Errore nella comunicazione con il server Stripe.';
}

export function getPortalReturnUrl(): string {
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    const { protocol, hostname, origin } = window.location;
    if (
      protocol === 'https:' &&
      (hostname === 'app.diarioapistico.com' ||
        hostname === 'diarioapistico.com' ||
        hostname.endsWith('.diarioapistico.com') ||
        hostname.endsWith('.run.app'))
    ) {
      return `${origin}/`;
    }
  }
  return 'https://app.diarioapistico.com/';
}

export async function createStripePortalUrl(): Promise<string> {
  const accessToken = await getValidAccessToken();
  const returnUrl = getPortalReturnUrl();

  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { returnUrl },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const msg = await extractInvokeErrorMessage(error, data);
    throw new Error(msg);
  }

  if (!data?.url) {
    throw new Error('Link del portale clienti Stripe non ricevuto dal server.');
  }

  return String(data.url);
}
