import { supabase } from './supabase'

export type InviteRole = 'ADMIN' | 'OPERATOR'

export async function sendPremiumInvite(params: {
  email: string
  name: string
}) {
  const { data: sessionData, error: sessErr } = await supabase.auth.getSession()
  if (sessErr) throw sessErr
  const access_token = sessionData.session?.access_token
  if (!access_token) throw new Error('Sessione non valida / utente non loggato')

  const { data, error } = await supabase.functions.invoke('send-reminder', { // Usiamo send-reminder o ne creiamo una nuova? 
    // Per semplicità usiamo un body specifico riconosciuto da una edge function
    body: {
      type: 'PREMIUM_GIFT',
      email: params.email,
      name: params.name,
    },
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })

  if (error) throw error
  return data
}

export async function claimPremiumInvite(token: string) {
  // 1. Verifica token nella tabella premium_invites
  const { data, error } = await supabase
    .from('premium_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (error || !data) throw new Error('Invito non valido o già utilizzato');

  // 2. Aggiorna lo stato dell'invito
  const { error: updateErr } = await supabase
    .from('premium_invites')
    .update({ status: 'used', used_at: new Date().toISOString() })
    .eq('token', token);

  if (updateErr) throw updateErr;

  return data;
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