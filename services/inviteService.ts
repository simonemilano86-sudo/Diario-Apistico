import { supabase } from './supabase'

export type InviteRole = 'ADMIN' | 'OPERATOR'

const AUTH_TOKEN_STORAGE_KEY = 'sb-uqvovgxdfleosaodpyyb-auth-token'

async function getValidAccessToken(): Promise<string> {
  // Fast-path: check localStorage token to avoid Capacitor/WebView getSession() hangs
  let fallbackToken: string | null = null
  try {
    const raw = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.access_token) {
        fallbackToken = parsed.access_token
        if (parsed?.expires_at && parsed.expires_at * 1000 > Date.now() + 60000) {
          return parsed.access_token
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
    ])
    if (sessionRes.error && !fallbackToken) throw sessionRes.error
    const token = sessionRes.data?.session?.access_token || fallbackToken
    if (!token) throw new Error('Sessione non valida / utente non loggato')
    return token
  } catch (err) {
    if (fallbackToken) return fallbackToken
    throw err instanceof Error && err.message !== 'AUTH_SESSION_TIMEOUT'
      ? err
      : new Error('Sessione non valida o scaduta. Ricarica l’app ed effettua di nuovo l’accesso.')
  }
}

async function extractInvokeErrorMessage(error: any, data: any): Promise<string> {
  if (data && typeof data === 'object' && (data.error || data.details)) {
    return data.details ? `${data.error || 'Errore'}: ${data.details}` : String(data.error)
  }

  const ctx = error?.context
  if (ctx) {
    try {
      const target = typeof ctx.clone === 'function' ? ctx.clone() : ctx
      if (typeof target.json === 'function') {
        const errBody = await target.json()
        if (errBody && (errBody.error || errBody.message)) {
          const base = errBody.error || errBody.message
          return errBody.details ? `${base}: ${errBody.details}` : String(base)
        }
      }
    } catch {
      try {
        const target = typeof ctx.clone === 'function' ? ctx.clone() : ctx
        if (typeof target.text === 'function') {
          const text = await target.text()
          if (text) return text
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return error?.message || 'Errore nella comunicazione con il server'
}

export async function sendPremiumInvite(params: {
  email: string
  name: string
  token?: string
  duration?: string
}) {
  const access_token = await getValidAccessToken()

  const { data, error } = await supabase.functions.invoke('send-invite', {
    body: {
      type: 'PREMIUM_GIFT',
      email: params.email,
      name: params.name,
      token: params.token,
      duration: params.duration || 'lifetime',
    },
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })

  if (error) {
    const msg = await extractInvokeErrorMessage(error, data)
    throw new Error(msg)
  }
  return data
}

export async function claimPremiumInvite(token: string) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) throw new Error('Utente non loggato')

  // 1. Verifica token nella tabella premium_gifts
  const { data, error } = await supabase
    .from('premium_gifts')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Invito non valido o inesistente')
  if (data.status === 'claimed') throw new Error('Questo regalo Premium è già stato riscattato')

  // 2. Aggiorna lo stato del regalo in premium_gifts
  const { error: updateErr } = await supabase
    .from('premium_gifts')
    .update({ 
      status: 'claimed', 
      claimed_at: new Date().toISOString(),
      claimed_by: user.id 
    })
    .eq('token', token)

  if (updateErr) throw updateErr

  // 3. Attiva il piano Premium su user_quotas
  const { error: quotaErr } = await supabase
    .from('user_quotas')
    .upsert({ user_id: user.id, plan: 'premium', tokens_used: 0 }, { onConflict: 'user_id' })

  if (quotaErr) console.error("Errore aggiornamento quota premium:", quotaErr)

  return data
}

export async function sendInvite(params: {
  teamId: string
  email: string
  name: string
  role?: InviteRole
}) {
  const role = params.role ?? 'OPERATOR'
  const access_token = await getValidAccessToken()

  const { data, error } = await supabase.functions.invoke('send-invite', {
    body: {
      team_id: params.teamId,
      email: params.email,
      name: params.name,
      role,
    },
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })

  if (error) {
    const msg = await extractInvokeErrorMessage(error, data)
    throw new Error(msg)
  }
  return data
}