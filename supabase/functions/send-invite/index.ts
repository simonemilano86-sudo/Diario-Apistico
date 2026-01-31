
// supabase/functions/send-invite/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

type Body = {
  team_id: string
  email: string
  role?: "ADMIN" | "OPERATOR"
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

const roleMap = {
  'ADMIN': 'Amministratore (accesso completo)',
  'OPERATOR': 'Operatore (può leggere e inserire dati)'
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: { ...corsHeaders } 
    })
  }

  console.log("send-invite hit", { method: req.method, url: req.url })

  try {
    // Determinazione dinamica dell'APP_URL per evitare 'undefined'
    const APP_URL = Deno.env.get("APP_URL") || req.headers.get("origin") || "http://localhost:5173";
    
    // LOG ENV (senza stampare chiavi intere!)
    const hasResend = !!RESEND_API_KEY
    const hasService = !!SUPABASE_SERVICE_ROLE_KEY
    console.log("env check", { hasResend, hasService, APP_URL })

    if (req.method !== "POST") return json(405, { error: "Method not allowed" })

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json(401, { error: "Missing Authorization header" })

    const body = (await req.json()) as Body
    const team_id = body.team_id
    
    // NORMALIZZAZIONE OBBLIGATORIA: trim e lowercase per Resend/DB matching
    const email = body.email?.trim().toLowerCase();
    const role = body.role ?? "OPERATOR"

    if (!team_id || !email) return json(400, { error: "team_id e email sono obbligatori" })

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json(401, { error: "Unauthorized" })

    const { data: membership, error: memErr } = await userClient
      .from("memberships")
      .select("role")
      .eq("team_id", team_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (memErr) return json(403, { error: "Membership check failed", details: memErr.message })
    if (!membership || membership.role !== "ADMIN") {
      return json(403, { error: "Solo ADMIN può invitare utenti" })
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let invite;

    // Tentativo di inserimento
    const { data: insertedInvite, error: insErr } = await serviceClient
      .from("invitations")
      .insert({
        email,
        team_id,
        role,
        invited_by: user.id,
      })
      .select("id, email, token, expires_at, role")
      .single()

    if (insErr) {
      const isDuplicate =
        (insErr as any).code === "23505" ||
        insErr.message?.toLowerCase().includes("duplicate key") ||
        String((insErr as any).details || "").includes("unique_pending_invite")

      if (isDuplicate) {
        console.log("DEBUG: invite existed → regenerating token")

        const { data: updatedInvite, error: updErr } = await serviceClient
          .from("invitations")
          .update({
            token: crypto.randomUUID(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            invited_by: user.id
          })
          .eq("email", email)
          .eq("team_id", team_id)
          .is("claimed_at", null)
          .select("id, email, token, expires_at, role")
          .maybeSingle()

        if (updErr) return json(400, { error: "Errore durante il reinvio", details: updErr.message })
        if (!updatedInvite) return json(400, { error: "L'utente ha già accettato l'invito o è già un membro attivo del team." })

        invite = updatedInvite
      } else {
        return json(400, { error: "Insert invitation failed", details: insErr.message })
      }
    } else {
      invite = insertedInvite
    }

    const inviteLink = `${APP_URL}/accept-invite?token=${invite.token}`
    const senderName = user.user_metadata?.full_name || user.email;
    const humanRole = roleMap[invite.role as keyof typeof roleMap] || invite.role;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [invite.email], // Sarà lowercase grazie all'insert/update normalizzato
        subject: `${senderName} ti ha invitato su Diario Apistico`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #334155;">
            <h2 style="color: #f59e0b; margin-bottom: 24px;">🐝 Invito a collaborare</h2>
            <p style="font-size: 16px; line-height: 1.5;">Ciao!</p>
            <p style="font-size: 16px; line-height: 1.5;"><strong>${senderName}</strong> ti ha invitato a unirti al suo team su <strong>Diario Apistico</strong>.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">Tuo Ruolo:</p>
              <p style="margin: 4px 0 0 0; font-size: 18px; color: #1e293b; font-weight: bold;">${humanRole}</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteLink}" style="background-color: #f59e0b; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Accetta Invito</a>
            </div>

            <p style="font-size: 13px; color: #94a3b8; margin-top: 40px; border-top: 1px solid #f1f5f9; pt: 20px;">
              Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
              <a href="${inviteLink}" style="color: #f59e0b;">${inviteLink}</a>
            </p>
          </div>
        `,
      }),
    })

    const resendText = await resendResp.text()
    
    if (!resendResp.ok) {
      let clientError = "Errore durante l'invio dell'email di invito.";
      
      // Gestione specifica limitazioni Resend Free
      if (resendResp.status === 403 || resendResp.status === 400) {
        try {
          const errData = JSON.parse(resendText);
          if (errData.message?.toLowerCase().includes("testing emails") || errData.name === "validation_error") {
            clientError = "Resend (Test Mode): Puoi inviare inviti solo al tuo indirizzo email registrato (assicurati di scriverla correttamente e tutto minuscolo) finché non verifichi un dominio personalizzato.";
          }
        } catch (_) {}
      }

      return json(resendResp.status, {
        error: clientError,
        status: resendResp.status,
        details: resendText,
        invite_link: inviteLink // Restituiamo il link così l'utente può copiarlo manualmente
      })
    }

    return json(200, {
      success: true,
      invitation_id: invite.id,
      email: invite.email,
      role: invite.role,
      expires_at: invite.expires_at,
    })
  } catch (e) {
    console.error("send-invite crashed:", e)
    return json(500, { error: "send-invite crashed", details: String(e) })
  }
})
