// supabase/functions/send-invite/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

type Body = {
  team_id?: string
  email: string
  name: string
  role?: "ADMIN" | "OPERATOR"
  type?: "PREMIUM_GIFT" | "TEAM_INVITE"
  token?: string
  duration?: string
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

    const APP_URL = APP_URL_ENV || req.headers.get("origin") || "https://app.diarioapistico.com"

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return json(401, { error: "Missing Authorization header" })

    const body = (await req.json()) as Body
    const email = normEmail(body.email)
    const name = body.name || "Apicoltore"
    let team_id = body.team_id
    const role = body.role === "ADMIN" ? "ADMIN" : "OPERATOR"
    const isPremiumGift = body.type === "PREMIUM_GIFT"

    if (!isPremiumGift && (!team_id || !email)) {
      console.error("send-invite validation failed: missing team_id or email", { team_id, hasEmail: !!email })
      return json(400, { error: "team_id e email sono obbligatori" })
    }
    if (isPremiumGift && !email) {
      console.error("send-invite validation failed: missing email for PREMIUM_GIFT")
      return json(400, { error: "email è obbligatoria per il regalo Premium" })
    }

    // 1) client "utente" (per capire chi sta invitando)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    const inviter = userData?.user
    if (userErr || !inviter) {
      console.error("send-invite unauthorized:", userErr)
      return json(401, { error: "Unauthorized" })
    }

    // Service client (bypasses RLS to insert into premium_gifts or invitations)
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // --- RAMO REGALO PREMIUM ---
    if (isPremiumGift) {
      const giftToken = body.token || crypto.randomUUID()
      const durationDesc = body.duration === '1_month' ? '1 Mese'
        : body.duration === '2_months' ? '2 Mesi'
        : body.duration === '6_months' ? '6 Mesi'
        : body.duration === '1_year' ? '1 Anno'
        : 'A Vita'

      // Salva nella tabella premium_gifts
      const { error: giftInsertErr } = await serviceClient
        .from('premium_gifts')
        .insert({
          email,
          token: giftToken,
          status: 'pending'
        })
        .select()
        .single()

      if (giftInsertErr) {
        console.error("Errore inserimento premium_gifts:", giftInsertErr)
        return json(500, { error: "Errore salvataggio regalo", details: giftInsertErr.message })
      }

      const inviteLink = `https://app.diarioapistico.com/accept-invite?token=${giftToken}&email=${encodeURIComponent(email)}`

      // Invio email con Resend
      const inviterName = inviter.user_metadata?.full_name || inviter.email?.split('@')[0] || "Simone"
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Diario Apistico <info@diarioapistico.com>",
          to: [email],
          subject: `🎁 ${inviterName} ti ha regalato Diario Apistico Premium!`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">🎁</span>
                <h1 style="color: #d97706; margin: 8px 0 4px; font-size: 24px;">Hai un regalo speciale!</h1>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Da parte di ${inviterName}</p>
              </div>

              <p style="font-size: 15px; line-height: 1.6;">
                Ciao <b>${name}</b>,<br/>
                hai ricevuto in regalo l'accesso a <b>Diario Apistico Premium (${durationDesc})</b>!
              </p>

              <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #92400e; font-size: 14px;">Cosa include il tuo Premium:</p>
                <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 13px; color: #78350f; line-height: 1.5;">
                  <li>Assistente Apistico AI illimitato</li>
                  <li>Sincronizzazione Cloud in tempo reale</li>
                  <li>Tracciamento arnie, fioriture e trattamenti</li>
                  <li>Notifiche e gestione multi-apiario</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteLink}" style="background-color: #f59e0b; color: #ffffff; font-weight: bold; font-size: 16px; padding: 14px 28px; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                  Attiva il Tuo Regalo Ora 🚀
                </a>
              </div>

              <p style="font-size: 12px; color: #64748b; text-align: center;">
                Oppure copia questo link nel browser:<br/>
                <a href="${inviteLink}" style="color: #d97706; word-break: break-all;">${inviteLink}</a>
              </p>

              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                Codice Univoco: <code>${giftToken}</code><br/>
                Diario Apistico &bull; La piattaforma per gli apicoltori moderni
              </div>
            </div>
          `,
        }),
      })

      const resendText = await resendResp.text()
      if (!resendResp.ok) {
        console.warn("Resend email warning:", resendText)
      }

      return json(200, {
        success: true,
        type: 'PREMIUM_GIFT',
        email,
        token: giftToken,
        invite_link: inviteLink,
        email_sent: resendResp.ok
      })
    }

    let new_team_id: string | null = null;
    let createdNewTeamId: string | null = null;

    const rollbackCreatedTeam = async () => {
      if (!createdNewTeamId) return;
      const targetId = createdNewTeamId;
      createdNewTeamId = null;
      try {
        await serviceClient.from('team_data').delete().eq('team_id', targetId);
        await serviceClient.from('memberships').delete().eq('team_id', targetId);
        await serviceClient.from('teams').delete().eq('id', targetId);
        console.log("Rolled back newly created team after error:", targetId);
      } catch (rbErr) {
        console.error("Failed to rollback team:", targetId, rbErr);
      }
    };

    if (team_id === 'personal') {
      // 1a) Verifica se l'utente ha già un team di cui è ADMIN o OWNER: evita duplicati!
      const { data: existingAdminTeams, error: existingAdminErr } = await serviceClient
        .from('memberships')
        .select('team_id')
        .eq('user_id', inviter.id)
        .eq('status', 'active')
        .in('role', ['ADMIN', 'OWNER'])
        .limit(1);

      if (existingAdminErr) {
        console.error("Existing admin team lookup failed:", existingAdminErr);
      }

      if (existingAdminTeams && existingAdminTeams.length > 0 && existingAdminTeams[0].team_id) {
        team_id = existingAdminTeams[0].team_id;
        new_team_id = team_id;
      } else {
        // 1b) Genera un nome team univoco anche in caso di omonimia tra utenti diversi
        const rawDisplayName = (
          inviter.user_metadata?.full_name ||
          inviter.email?.split('@')[0] ||
          'Utente'
        ).trim();
        const baseTeamName = `Team di ${rawDisplayName}`;
        const emailHandle = (inviter.email?.split('@')[0] || '').trim();

        const { data: similarTeams } = await serviceClient
          .from('teams')
          .select('name')
          .ilike('name', `${baseTeamName}%`);

        const takenNames = new Set(
          (similarTeams || []).map((t: any) => String(t.name || '').trim().toLowerCase())
        );

        let teamName = baseTeamName;
        if (takenNames.has(teamName.toLowerCase())) {
          if (emailHandle && emailHandle.toLowerCase() !== rawDisplayName.toLowerCase()) {
            const handleCandidate = `${baseTeamName} (${emailHandle})`;
            if (!takenNames.has(handleCandidate.toLowerCase())) {
              teamName = handleCandidate;
            }
          }
          if (takenNames.has(teamName.toLowerCase())) {
            let suffix = 2;
            while (takenNames.has(`${teamName} #${suffix}`.toLowerCase())) {
              suffix++;
            }
            teamName = `${teamName} #${suffix}`;
          }
        }

        let { data: newTeam, error: teamErr } = await serviceClient
          .from('teams')
          .insert({ name: teamName, created_by: inviter.id })
          .select('id')
          .single();

        if (teamErr && /created_by/i.test(teamErr.message || '')) {
          const retryTeam = await serviceClient
            .from('teams')
            .insert({ name: teamName })
            .select('id')
            .single();
          newTeam = retryTeam.data;
          teamErr = retryTeam.error;
        }

        if (teamErr || !newTeam?.id) {
          console.error("Errore creazione team:", teamErr);
          return json(500, { error: "Errore creazione team", details: teamErr?.message || "Unknown" });
        }

        team_id = newTeam.id;
        new_team_id = team_id;
        createdNewTeamId = team_id;

        // Make the user an ADMIN of the new team
        const { error: memErr } = await serviceClient
          .from('memberships')
          .insert({
            team_id: team_id,
            user_id: inviter.id,
            role: 'ADMIN',
            status: 'active'
          });

        if (memErr) {
          console.error("Errore creazione membership:", memErr);
          await rollbackCreatedTeam();
          return json(500, { error: "Errore creazione membership", details: memErr.message });
        }

        // Copy user_data to team_data (una sola copia iniziale)
        const { data: uData } = await serviceClient
          .from('user_data')
          .select('content')
          .eq('user_id', inviter.id)
          .maybeSingle();

        if (uData && uData.content) {
          const { error: tdErr } = await serviceClient
            .from('team_data')
            .insert({
              team_id: team_id,
              content: uData.content,
              last_updated_by: inviter.id
            });
          if (tdErr) {
            console.error("Errore copia iniziale team_data:", tdErr);
          }
        }
      }
    } else {
      // 2) check che l'invitante sia ADMIN su quel team
      const { data: inviterMembership, error: memErr } = await serviceClient
        .from("memberships")
        .select("role, status")
        .eq("team_id", team_id)
        .eq("user_id", inviter.id)
        .eq("status", "active")
        .maybeSingle()

      if (memErr) {
        console.error("Membership check failed:", memErr)
        return json(403, { error: "Membership check failed", details: memErr.message })
      }
      if (!inviterMembership || (inviterMembership.role !== "ADMIN" && inviterMembership.role !== "OWNER")) {
        console.error("Invite denied - not ADMIN/OWNER:", { userId: inviter.id, team_id, role: inviterMembership?.role })
        return json(403, { error: "Solo ADMIN può invitare utenti" })
      }
    }

    // 5) reinvio: se c'è invito pendente, update token+scadenza, altrimenti insert
    // Usiamo limit(1) al posto di maybeSingle() per non fallire se ci sono più righe pendenti storiche
    const { data: pendingInvites, error: pendErr } = await serviceClient
      .from("invitations")
      .select("id, token")
      .eq("team_id", team_id)
      .eq("email", email)
      .is("claimed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)

    if (pendErr) {
      console.error("Pending invite lookup failed:", pendErr)
      await rollbackCreatedTeam()
      return json(400, { error: "Pending invite lookup failed", details: pendErr.message })
    }

    const pendingInvite = pendingInvites && pendingInvites.length > 0 ? pendingInvites[0] : null
    const newToken = crypto.randomUUID()
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    let invite: any

    if (pendingInvite) {
      const updatePayload: Record<string, any> = {
        token: newToken,
        expires_at: newExpiry,
        role,
        name,
        invited_by: inviter.id,
      }
      let { data, error } = await serviceClient
        .from("invitations")
        .update(updatePayload)
        .eq("id", pendingInvite.id)
        .select("id, email, token, role")
        .single()

      if (error && /name|expires_at/i.test(error.message || "")) {
        console.warn("Retrying invitation update without optional columns:", error.message)
        if (/name/i.test(error.message || "")) delete updatePayload.name
        if (/expires_at/i.test(error.message || "")) delete updatePayload.expires_at
        const retry = await serviceClient
          .from("invitations")
          .update(updatePayload)
          .eq("id", pendingInvite.id)
          .select("id, email, token, role")
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) {
        console.error("Update invitation failed:", error)
        await rollbackCreatedTeam()
        return json(400, { error: "Update invitation failed", details: error.message })
      }
      invite = data
    } else {
      const insertPayload: Record<string, any> = {
        email,
        team_id,
        role,
        name,
        token: newToken,
        expires_at: newExpiry,
        invited_by: inviter.id,
      }
      let { data, error } = await serviceClient
        .from("invitations")
        .insert(insertPayload)
        .select("id, email, token, role")
        .single()

      if (error && /name|expires_at/i.test(error.message || "")) {
        console.warn("Retrying invitation insert without optional columns:", error.message)
        if (/name/i.test(error.message || "")) delete insertPayload.name
        if (/expires_at/i.test(error.message || "")) delete insertPayload.expires_at
        const retry = await serviceClient
          .from("invitations")
          .insert(insertPayload)
          .select("id, email, token, role")
          .single()
        data = retry.data
        error = retry.error
      }

      if (error) {
        console.error("Insert invitation failed:", error)
        await rollbackCreatedTeam()
        return json(400, { error: "Insert invitation failed", details: error.message })
      }
      invite = data
    }

    // Use App Links friendly URL /accept-invite
    const inviteLink = `https://app.diarioapistico.com/accept-invite?token=${invite.token}`
    const inviteCode = invite.token
    const inviterName = inviter.user_metadata?.full_name || inviter.email?.split('@')[0] || "Un amministratore"
    const roleLabel = role === "ADMIN" ? "Amministratore" : "Operatore"

    // 6) invio email Resend
    let emailSent = false
    let emailError: string | null = null
    try {
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Diario Apistico <info@diarioapistico.com>",
          to: [email],
          subject: `🐝 ${inviterName} ti ha invitato a collaborare su Diario Apistico`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 44px;">🐝</span>
                <h1 style="color: #d97706; margin: 8px 0 4px; font-size: 24px;">Invito al Team</h1>
                <p style="color: #64748b; font-size: 14px; margin: 0;">Diario Apistico &bull; Da parte di ${inviterName}</p>
              </div>

              <p style="font-size: 15px; line-height: 1.6;">
                Ciao <b>${name}</b>,<br/>
                <b>${inviterName}</b> ti ha invitato a collaborare alla gestione dei suoi apiari su <b>Diario Apistico</b> con il ruolo di <b>${roleLabel}</b>.
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${inviteLink}" style="background-color: #f59e0b; color: #ffffff; font-weight: bold; font-size: 16px; padding: 14px 28px; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                  Accetta l'Invito
                </a>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 6px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Il tuo codice invito</p>
                <code style="font-size: 14px; color: #b45309; font-weight: bold; word-break: break-all;">${inviteCode}</code>
              </div>

              <p style="font-size: 13px; color: #475569; line-height: 1.5; background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px; padding: 12px;">
                <strong>Hai già l'app aperta?</strong> Puoi accettare anche direttamente dentro Diario Apistico andando su <b>Profilo &rarr; Gestione Team &rarr; Inviti Ricevuti</b> (se usi questa stessa email).
              </p>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">
                Se il pulsante non si apre, copia questo link:<br/>
                <a href="${inviteLink}" style="color: #d97706; word-break: break-all;">${inviteLink}</a>
              </p>

              <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                Diario Apistico &bull; La piattaforma per gli apicoltori moderni
              </div>
            </div>
          `,
        }),
      })

      const resendText = await resendResp.text()
      if (resendResp.ok) {
        emailSent = true
      } else {
        emailError = resendText
        console.error("Resend failed:", resendResp.status, resendText)
      }
    } catch (resendErr: any) {
      emailError = String(resendErr?.message || resendErr)
      console.error("Resend network error:", emailError)
    }

    return json(200, {
      success: true,
      invitation_id: invite.id,
      email: invite.email,
      role: invite.role,
      invite_link: inviteLink,
      new_team_id,
      email_sent: emailSent,
      email_error: emailError,
    })
  } catch (e) {
    console.error("send-invite crashed:", e)
    return json(500, { error: "send-invite crashed", details: String(e) })
  }
})