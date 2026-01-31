import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Gestione CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { ...corsHeaders } 
    })
  }

  try {
    // 2. Controllo configurazione
    if (!RESEND_API_KEY) throw new Error("Manca RESEND_API_KEY nei Secrets di Supabase");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Manca configurazione Supabase");

    // 3. Inizializza client Supabase (Admin Context)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 4. Recupera TUTTI gli utenti e i loro dati
    const { data: usersData, error: dbError } = await supabase
      .from('user_data')
      .select('user_id, content');

    if (dbError) throw dbError;

    const results = [];
    const now = new Date(); // Orario attuale del server (UTC)
    
    console.log(`[JOB 15-MIN] Avvio controllo orario: ${now.toISOString()}`);

    // 5. Ciclo sugli utenti
    for (const record of usersData || []) {
      const content = record.content;
      if (!content || !content.calendarEvents) continue;

      // Filtriamo gli eventi che richiedono notifica email
      const enabledEvents = content.calendarEvents.filter((evt: any) => evt.emailReminder === true);

      for (const event of enabledEvents) {
        // A. Costruiamo la data/ora precisa dell'evento
        const timePart = event.startTime || '09:00';
        const eventIsoString = `${event.startDate}T${timePart}:00`;
        const eventDate = new Date(eventIsoString);

        // B. Calcolo differenza temporale in MINUTI
        const diffInMs = eventDate.getTime() - now.getTime();
        const diffInMinutes = diffInMs / (1000 * 60);

        // LOGICA DI PRECISIONE (Cron ogni 15 minuti):
        // Controlliamo se l'evento inizia tra "adesso" (-1 min buffer) e i prossimi 20 minuti.
        // Esempi:
        // - Cron 17:00, Evento 17:10 (Diff 10 min) -> SI
        // - Cron 17:15, Evento 17:30 (Diff 15 min) -> SI
        // - Cron 17:00, Evento 19:00 (Diff 120 min) -> NO (troppo presto)
        
        const isImminent = diffInMinutes > -2 && diffInMinutes <= 20;

        if (!isImminent) {
            continue;
        }

        // C. Controllo se già inviata (Anti-Spam / Idempotenza)
        const { data: logs } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('user_id', record.user_id)
          .eq('event_id', event.id)
          .single();

        if (logs) {
            // Già gestito
            continue;
        }

        // D. Recupera email utente
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(record.user_id);
        
        if (userError || !user || !user.email) {
            console.error(`Utente ${record.user_id} non trovato o senza email.`);
            continue;
        }

        // E. Invia Email via Resend
        console.log(`Invio email a ${user.email} per evento imminente: ${event.title} (tra ${Math.round(diffInMinutes)} min)`);
        
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: user.email, 
            subject: `🐝 Sta iniziando: ${event.title}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #d97706;">Diario Apistico - Promemoria</h2>
                <p>Ciao, l'attività che hai programmato sta per iniziare (o è appena iniziata):</p>
                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #d97706; margin: 20px 0;">
                  <h3 style="margin: 0;">${event.title}</h3>
                  <p>${event.description || ''}</p>
                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;"/>
                  <p style="font-size: 0.9em; color: #666;">
                    📅 <strong>${event.startDate}</strong><br/>
                    ⏰ <strong>${event.startTime}</strong><br/>
                    📍 ${event.apiaryName}
                  </p>
                </div>
                <p style="font-size: 0.8em; color: #888;">Buon lavoro in apiario!</p>
              </div>
            `
          })
        });

        if (res.ok) {
            // F. Registra invio avvenuto
            await supabase.from('notification_logs').insert({
                user_id: record.user_id,
                event_id: event.id,
                sent_at: new Date().toISOString()
            });
            results.push({ sent: true, email: user.email, event: event.title });
        } else {
            const errTxt = await res.text();
            console.error(`Errore Resend: ${errTxt}`);
            results.push({ sent: false, error: errTxt });
        }
      }
    }

    return new Response(JSON.stringify({ processed: results.length, details: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error: any) {
    console.error("Errore critico:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})