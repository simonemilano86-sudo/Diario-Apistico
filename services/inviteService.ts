import { supabase } from './supabase'

export type InviteRole = 'ADMIN' | 'OPERATOR'

export async function sendPremiumInvite(params: {
  email: string
  name: string
  token?: string
  duration?: string
}) {
  const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) throw sessErr
  const access_token = sessionData.session?.access_token
  if (!access_token) throw new Error('Sessione non valida / utente non loggato')

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

  if (error) throw error
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

  const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) throw sessErr
  const access_token = sessionData.session?.access_token
  if (!access_token) throw new Error('Sessione non valida / utente non loggato')

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

  if (error) throw error
  return data
}