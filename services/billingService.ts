import { supabase } from './supabase';

const AUTH_TOKEN_STORAGE_KEY = 'sb-uqvovgxdfleosaodpyyb-auth-token';

export interface StripeSubscriptionInfo {
  hasSubscription: boolean;
  subscriptionId: string | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

async function getValidAccessToken(): Promise<string> {
  let validStoredToken: string | null = null;
  try {
    const raw = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access_token) {
        const expiresAtMs = parsed?.expires_at ? parsed.expires_at * 1000 : 0;
        if (expiresAtMs > Date.now() + 60000) {
          return parsed.access_token;
        }
        if (!expiresAtMs || expiresAtMs > Date.now()) {
          validStoredToken = parsed.access_token;
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
        setTimeout(() => reject(new Error('AUTH_SESSION_TIMEOUT')), 5000)
      ),
    ]);

    const session = sessionRes.data?.session || null;
    const isExpiringSoon =
      session?.expires_at ? session.expires_at * 1000 <= Date.now() + 30000 : false;

    if (!session || isExpiringSoon) {
      const refreshed = await Promise.race([
        supabase.auth.refreshSession(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AUTH_REFRESH_TIMEOUT')), 5000)
        ),
      ]).catch(() => null);

      if (refreshed && refreshed.data?.session?.access_token) {
        return refreshed.data.session.access_token;
      }
    }

    if (session?.access_token) {
      return session.access_token;
    }

    if (validStoredToken) {
      return validStoredToken;
    }

    throw new Error('Sessione non valida. Effettua nuovamente il login.');
  } catch (err) {
    if (validStoredToken) return validStoredToken;
    throw err instanceof Error &&
      err.message !== 'AUTH_SESSION_TIMEOUT' &&
      err.message !== 'AUTH_REFRESH_TIMEOUT'
      ? err
      : new Error('Sessione scaduta o non disponibile. Ricarica l’app ed effettua di nuovo il login.');
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
          return errBody.details ? `${base}: ${base !== errBody.details ? errBody.details : ''}` : String(base);
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

async function invokeBillingAction<T>(payload: Record<string, unknown>): Promise<T> {
  const accessToken = await getValidAccessToken();
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: payload,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    const msg = await extractInvokeErrorMessage(error, data);
    throw new Error(msg);
  }

  return data as T;
}

export async function getStripeSubscriptionStatus(): Promise<StripeSubscriptionInfo> {
  return invokeBillingAction<StripeSubscriptionInfo>({ action: 'status' });
}

export async function cancelStripeSubscriptionInApp(): Promise<StripeSubscriptionInfo> {
  return invokeBillingAction<StripeSubscriptionInfo>({ action: 'cancel' });
}

export async function reactivateStripeSubscriptionInApp(): Promise<StripeSubscriptionInfo> {
  return invokeBillingAction<StripeSubscriptionInfo>({ action: 'reactivate' });
}

export async function linkStripeCheckoutSession(
  sessionId: string
): Promise<'premium' | 'team' | 'enterprise' | null> {
  if (!sessionId) return null;
  try {
    const res = await invokeBillingAction<{
      linked: boolean;
      plan?: 'premium' | 'team' | 'enterprise';
    }>({
      action: 'link_session',
      sessionId,
    });
    return res?.plan || null;
  } catch (err) {
    console.warn('Avviso collegamento sessione Stripe:', err);
    return null;
  }
}

export function buildMarketingWebsiteUrl(
  explicitUserId?: string | null,
  explicitEmail?: string | null
): string {
  const base = 'https://diarioapistico.com';
  try {
    const url = new URL(base);
    let uid = explicitUserId || null;
    let email = explicitEmail || null;

    if (!uid) {
      const rawUid = localStorage.getItem('beewise-user-id');
      if (rawUid) {
        try {
          uid = JSON.parse(rawUid);
        } catch {
          uid = rawUid;
        }
      }
    }

    if (!email) {
      const rawUser = localStorage.getItem('beewise:user');
      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser);
          if (parsedUser?.email) email = parsedUser.email;
        } catch {
          // ignore
        }
      }
    }

    if (uid && typeof uid === 'string') {
      url.searchParams.set('uid', uid);
    }
    if (email && typeof email === 'string') {
      url.searchParams.set('email', email);
    }

    return url.toString();
  } catch {
    return base;
  }
}

export function openMarketingWebsite(
  explicitUserId?: string | null,
  explicitEmail?: string | null
): void {
  const targetUrl = buildMarketingWebsiteUrl(explicitUserId, explicitEmail);
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
