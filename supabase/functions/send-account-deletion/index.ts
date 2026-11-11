import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders } })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Metodo non consentito' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      console.warn("Manca RESEND_API_KEY nei Secrets di Supabase");
      return new Response(JSON.stringify({ error: 'Manca RESEND_API_KEY nei secrets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, name } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email mancante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipientName = name || 'Apicoltore';
    const deletionDate = new Date().toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; opacity: 0.95; font-size: 14px; }
          .content { padding: 32px 24px; }
          .badge { display: inline-block; background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
          .info-box { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .info-row:last-child { margin-bottom: 0; }
          .info-label { color: #64748b; }
          .info-val { font-weight: 600; color: #0f172a; }
          .footer { background: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 40px; margin-bottom: 8px;">🐝</div>
            <h1>Diario Apistico</h1>
            <p>Conferma di eliminazione account</p>
          </div>
          <div class="content">
            <span class="badge">Operazione Completata</span>
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Ciao ${recipientName},</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
              Ti confermiamo che il tuo account su <strong>Diario Apistico</strong> e tutti i dati a esso associati sono stati <strong>definitivamente eliminati</strong> dai nostri server, come da tua richiesta.
            </p>

            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Account eliminato:</span>
                <span class="info-val">${email}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Data e ora richiesta:</span>
                <span class="info-val">${deletionDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Stato dati:</span>
                <span class="info-val" style="color: #ef4444;">Cancellati definitivamente</span>
              </div>
            </div>

            <p style="font-size: 13px; line-height: 1.5; color: #475569;">
              <strong>Cosa è successo ai tuoi dati:</strong>
            </p>
            <ul style="font-size: 13px; line-height: 1.6; color: #475569; padding-left: 20px; margin-top: 4px;">
              <li>Tutti gli apiari, arnie, controlli e annotazioni sono stati rimossi.</li>
              <li>Eventuali sessioni attive su smartphone, tablet e PC sono state terminate.</li>
              <li>Eventuali rinnovi di abbonamento sono stati interrotti.</li>
            </ul>

            <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-top: 24px;">
              Ti ringraziamo di cuore per aver utilizzato Diario Apistico per prenderti cura delle tue api. Se in futuro vorrai tornare, saremo sempre felici di accoglierti nuovamente.
            </p>
          </div>
          <div class="footer">
            <p style="margin: 0 0 4px;"><strong>Diario Apistico</strong> - Il gestionale smart per la tua apicoltura</p>
            <p style="margin: 0;">Questa è un'email automatica di sicurezza inviata a seguito della cancellazione del tuo account.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`[Account Deletion] Invio email di conferma cancellazione a: ${email}`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Diario Apistico <info@diarioapistico.com>',
        to: email,
        subject: '🐝 Conferma Eliminazione Account - Diario Apistico',
        html: emailHtml,
      }),
    })

    if (!res.ok) {
      const errTxt = await res.text()
      console.error(`Errore Resend account-deletion: ${errTxt}`)
      return new Response(JSON.stringify({ success: false, error: errTxt }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resData = await res.json()
    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Errore Edge Function send-account-deletion:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
