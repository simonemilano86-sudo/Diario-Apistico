
import { supabase } from './supabase'

export type InviteRole = 'ADMIN' | 'OPERATOR'

export async function sendInvite(params: {
  teamId: string
  email: string
  role?: InviteRole
}) {
  const role = params.role ?? 'OPERATOR'

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr) throw userErr
  if (!user) throw new Error('Utente non loggato')

  const { data, error } = await supabase.functions.invoke('send-invite', {
    body: {
      team_id: params.teamId,
      email: params.email,
      role,
    },
  })

  if (error) throw error
  return data
}
