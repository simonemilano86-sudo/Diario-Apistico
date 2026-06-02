// supabase/functions/send-invite/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

type Body = {
  team_id: string
  email: string
  name: string
  role?: "ADMIN" | "OPERATOR"
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const APP_URL_ENV = Deno.env.get("APP_URL") // es: http://localhost:5173

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function normEmail(e?: string | null) {
  return (e ?? "").trim().toLowerCase()
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } })
  }

  try {
    if (req.method !== "POST") return json(405, { error: "Method not allowed" })

    const APP_URL = APP_URL_ENV || req.headers.get("origin") || "http://localhost:5173"

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json(401, { error: "Missing Authorization header" })

    const body = (await req.json()) as Body
    let team_id = body.team_id
    const email = normEmail(body.email)
    const name = body.name
    const role = body.role ?? "OPERATOR"

    if (!team_id || !email) return json(400, { error: "team_id e email sono obbligatori" })

    // 1) client "utente" (per capire chi sta invitando)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    const inviter = userData?.user
    if (userErr || !inviter) return json(401, { error: "Unauthorized" })

    // 3) service client
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let new_team_id: string | null = null;

    if (team_id === 'personal') {
      // Create a new team for the user
      const teamName = `Team di ${inviter.user_metadata?.full_name || inviter.email?.split('@')[0] || 'Utente'}`;
      
      const { data: newTeam, error: teamErr } = await serviceClient
        .from('teams')
        .insert({ name: teamName })
        .select('id')
        .single();
        
      if (teamErr) return json(500, { error: "Errore creazione team", details: teamErr.message });
      
      team_id = newTeam.id;
      new_team_id = team_id;

      // Make the user an ADMIN of the new team
      const { error: memErr } = await serviceClient
        .from('memberships')
        .insert({
          team_id: team_id,
          user_id: inviter.id,
          role: 'ADMIN',
          status: 'active'
        });
        
      if (memErr) return json(500, { error: "Errore creazione membership", details: memErr.message });

      // Copy user_data to team_data
      const { data: uData, error: udErr } = await serviceClient
        .from('user_data')
        .select('content')
        .eq('user_id', inviter.id)
        .maybeSingle();
        
      if (uData && uData.content) {
        await serviceClient
          .from('team_data')
          .insert({
            team_id: team_id,
            content: uData.content,
            last_updated_by: inviter.id
          });
      }
    } else {
      // 2) check che l'invitante sia ADMIN su quel team
      const { data: inviterMembership, error: memErr } = await userClient
        .from("memberships")
        .select("role")
        .eq("team_id", team_id)
        .eq("user_id", inviter.id)
        .maybeSingle()

      if (memErr) return json(403, { error: "Membership check failed", details: memErr.message })
      if (!inviterMembership || (inviterMembership.role !== "ADMIN" && inviterMembership.role !== "OWNER")) {
        return json(403, { error: "Solo ADMIN può invitare utenti" })
      }
    }

    // 4) Controllo rimosso: la verifica se l'utente è già membro 
    // verrà gestita al momento dell'accettazione dell'invito per evitare
    // errori con le API Admin di Supabase.

    // 5) reinvio: se c'è invito pendente, update token+scadenza, altrimenti insert
    const { data: pendingInvite, error: pendErr } = await serviceClient
      .from("invitations")
      .select("id, token")
      .eq("team_id", team_id)
      .eq("email", email)
      .is("claimed_at", null)
      .maybeSingle()

    if (pendErr) return json(400, { error: "Pending invite lookup failed", details: pendErr.message })

    const newToken = crypto.randomUUID()
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    let invite: any

    if (pendingInvite) {
      const { data, error } = await serviceClient
        .from("invitations")
        .update({
          token: newToken,
          expires_at: newExpiry,
          role,
          name,
          invited_by: inviter.id,
        })
        .eq("id", pendingInvite.id)
        .select("id, email, token, expires_at, role")
        .single()

      if (error) return json(400, { error: "Update invitation failed", details: error.message })
      invite = data
    } else {
      const { data, error } = await serviceClient
        .from("invitations")
        .insert({
          email,
          team_id,
          role,
          name,
          token: newToken,
          expires_at: newExpiry,
          invited_by: inviter.id,
        })
        .select("id, email, token, expires_at, role")
        .single()

      if (error) return json(400, { error: "Insert invitation failed", details: error.message })
      invite = data
    }

    // UPDATE: Use hash-based routing #/accept-invite to ensure index.html is served and handled by SPA router
    const inviteLink = `https://diario-apistico-633774739064.us-west1.run.app/#/accept-invite`
    const inviteCode = invite.token;


    // 6) invio email Resend
    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "info@diarioapistico.com",
        to: [email],
        subject: `Invito a collaborare su Diario Apistico`,
        html: `<p>Sei stato invitato come <b>${role}</b>. <br/>
               <a href="${inviteLink}">Clicca qui per andare all'app</a><br/>
               Il tuo codice invito è: <b>${inviteCode}</b></p>`,
      }),
    })

    const resendText = await resendResp.text()
    if (!resendResp.ok) {
      return json(502, {
        error: "Resend failed",
        status: resendResp.status,
        details: resendText,
        invite_link: inviteLink,
        new_team_id,
      })
    }

    return json(200, {
      success: true,
      invitation_id: invite.id,
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
      invite_link: inviteLink,
      new_team_id,
    })
  } catch (e) {
    console.error("send-invite crashed:", e)
    return json(500, { error: "send-invite crashed", details: String(e) })
  }
})