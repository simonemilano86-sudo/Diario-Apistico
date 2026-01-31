
import { supabase } from './supabase'

export async function acceptInvitation(token: string) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr) throw userErr
  if (!user) throw new Error('Utente non loggato')

  const { data, error } = await supabase.rpc('accept_invitation', {
    p_token: token,
    p_user_id: user.id,
  })

  if (error) throw error
  return data
}

export async function readTeamData(teamId: string) {
  const { data, error } = await supabase
    .from('team_data')
    .select('*')
    .eq('team_id', teamId)

  if (error) throw error
  return data
}
