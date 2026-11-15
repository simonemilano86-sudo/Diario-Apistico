import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: any;

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Metodo non consentito' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signature = req.headers.get('stripe-signature') || req.headers.get('Stripe-Signature');
    const rawBody = await req.text();

    let event: Stripe.Event;

    // Se è configurato il webhook secret, verifichiamo la firma crittografica
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error('⚠️ Verifica firma Stripe fallita:', err.message);
        return new Response(JSON.stringify({ error: `Firma non valida: ${err.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // In assenza temporanea del secret (es. prima configurazione o test), leggiamo il JSON direttamente
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET non ancora impostato nei secrets di Supabase. Esecuzione in modalità fallback.');
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    console.log(`🔔 Ricevuto evento Stripe: ${event.type} (ID: ${event.id})`);

    // Inizializza il client Supabase con privilegi di amministratore (Service Role)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // GESTIONE DEGLI EVENTI STRIPE
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const customerEmail = session.customer_details?.email || session.customer_email;
        const clientReferenceId = session.client_reference_id; // Passato dall'app se presente
        
        // Riconoscimento del piano:
        // 1) session.metadata.plan
        // 2) price/product metadata o nome prodotto da Stripe line_items (per Payment Links)
        // 3) fallback su importo (amount_total) -> fallback finale 'premium'
        const parsePlan = (raw?: string | null): 'premium' | 'team' | 'enterprise' | null => {
          const p = raw?.toLowerCase().trim();
          if (p === 'team' || p === 'enterprise' || p === 'premium') return p;
          return null;
        };

        let targetPlan: 'premium' | 'team' | 'enterprise' | null = parsePlan(session.metadata?.plan);

        if (!targetPlan && stripeKey && session.id) {
          try {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
              limit: 5,
              expand: ['data.price.product'],
            });

            for (const item of lineItems.data) {
              const price = item.price as Stripe.Price | null;
              const product = (price?.product && typeof price.product !== 'string')
                ? (price.product as Stripe.Product)
                : null;

              targetPlan =
                parsePlan(price?.metadata?.plan) ||
                parsePlan(product?.metadata?.plan);

              if (!targetPlan) {
                const label = `${product?.name || ''} ${item.description || ''}`.toLowerCase();
                if (label.includes('azienda') || label.includes('enterprise')) {
                  targetPlan = 'enterprise';
                } else if (label.includes('team')) {
                  targetPlan = 'team';
                } else if (label.includes('singolo') || label.includes('premium')) {
                  targetPlan = 'premium';
                }
              }

              if (targetPlan) break;
            }
          } catch (lineErr: any) {
            console.warn('⚠️ Impossibile leggere line_items da Stripe:', lineErr?.message || lineErr);
          }
        }

        if (!targetPlan && typeof session.amount_total === 'number' && session.amount_total > 0) {
          if (session.amount_total >= 900) {
            targetPlan = 'enterprise';
          } else if (session.amount_total >= 450) {
            targetPlan = 'team';
          } else {
            targetPlan = 'premium';
          }
        }

        const resolvedPlan: 'premium' | 'team' | 'enterprise' = targetPlan || 'premium';

        console.log(`💳 Pagamento completato! Email: ${customerEmail}, UserID: ${clientReferenceId}, Piano: ${resolvedPlan}`);

        let resolvedUserId = clientReferenceId;

        // Se non abbiamo il clientReferenceId (es. pagamento dal sito vetrina), cerchiamo l'utente per email
        if (!resolvedUserId && customerEmail) {
          console.log(`🔍 Cerco utente Supabase per email: ${customerEmail}`);
          
          // 1. Cerca nella tabella public.users
          const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('id')
            .ilike('email', customerEmail)
            .maybeSingle();

          if (userRow?.id) {
            resolvedUserId = userRow.id;
          } else {
            // 2. Se non presente in public.users, cerca in auth.users
            try {
              const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
              const matchedAuthUser = authData?.users?.find(
                u => u.email?.toLowerCase() === customerEmail.toLowerCase()
              );
              if (matchedAuthUser?.id) {
                resolvedUserId = matchedAuthUser.id;
              }
            } catch (authLookupErr) {
              console.warn('Errore ricerca in auth.users:', authLookupErr);
            }
          }
        }

        if (!resolvedUserId) {
          console.warn(`⚠️ Impossibile trovare un utente corrispondente all'email: ${customerEmail}. Registrazione transazione orfana.`);
          return new Response(JSON.stringify({ 
            received: true, 
            warning: `Utente non trovato per email ${customerEmail}. Il pagamento è registrato ma richiede associazione.` 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`✅ Assegno piano ${resolvedPlan} all'utente ID: ${resolvedUserId}`);

        // Aggiorna o inserisce nella tabella user_quotas
        const { error: quotaError } = await supabaseAdmin
          .from('user_quotas')
          .upsert({
            user_id: resolvedUserId,
            plan: resolvedPlan,
            tokens_used: 0,
            last_reset: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (quotaError) {
          console.error('❌ Errore aggiornamento user_quotas:', quotaError);
          throw quotaError;
        }

        // Se esiste la colonna plan o role in public.users, aggiorniamola per coerenza
        try {
          await supabaseAdmin
            .from('users')
            .update({ plan: resolvedPlan })
            .eq('id', resolvedUserId);
        } catch (_) {
          // Ignora se la colonna non esiste
        }

        // Salviamo l'ID utente Supabase nei metadata del Customer e della Subscription su Stripe
        // così disdetta e rinnovi funzionano anche se Google Pay / Stripe Link usano un'email diversa
        if (stripeKey) {
          try {
            const sessionCustomerId =
              typeof session.customer === 'string' ? session.customer : session.customer?.id;
            if (sessionCustomerId) {
              await stripe.customers.update(sessionCustomerId, {
                metadata: {
                  supabase_user_id: resolvedUserId,
                  ...(customerEmail ? { checkout_email: customerEmail } : {}),
                },
              });
            }

            const sessionSubId =
              typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription?.id;
            if (sessionSubId) {
              await stripe.subscriptions.update(sessionSubId, {
                metadata: {
                  supabase_user_id: resolvedUserId,
                  plan: resolvedPlan,
                },
              });
            }
          } catch (metaUpdateErr) {
            console.warn('Avviso aggiornamento metadata su Stripe:', metaUpdateErr);
          }
        }

        console.log(`🎉 Utente ${resolvedUserId} (${customerEmail}) promosso con successo a ${resolvedPlan}!`);

        // --- SISTEMA REFERRAL: PREMIA L'INVITANTE (+1 MESE GRATIS) ---
        try {
          const { data: referralRecord } = await supabaseAdmin
            .from('referrals')
            .select('id, referrer_id')
            .or(`referred_id.eq.${resolvedUserId},referred_email.ilike.${customerEmail}`)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (referralRecord && referralRecord.referrer_id) {
            console.log(`🎁 Trovato referral in sospeso! Referrer: ${referralRecord.referrer_id}`);

            // 1. Marca il referral come premiato
            await supabaseAdmin
              .from('referrals')
              .update({
                status: 'rewarded',
                rewarded_at: new Date().toISOString(),
                referred_id: resolvedUserId,
              })
              .eq('id', referralRecord.id);

            // 2. Calcola la scadenza (+30 giorni) per chi ha invitato
            const { data: refQuota } = await supabaseAdmin
              .from('user_quotas')
              .select('plan, valid_until')
              .eq('user_id', referralRecord.referrer_id)
              .maybeSingle();

            const now = new Date();
            let newValidUntil: Date;
            if (refQuota?.valid_until && new Date(refQuota.valid_until) > now) {
              newValidUntil = new Date(new Date(refQuota.valid_until).getTime() + 30 * 24 * 60 * 60 * 1000);
            } else {
              newValidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            }

            const isLifetime = refQuota?.plan === 'premium' && !refQuota?.valid_until;

            await supabaseAdmin
              .from('user_quotas')
              .upsert({
                user_id: referralRecord.referrer_id,
                plan: 'premium',
                valid_until: isLifetime ? null : newValidUntil.toISOString(),
                tokens_used: 0,
              }, { onConflict: 'user_id' });

            console.log(`✅ Assegnato +1 mese gratis al referrer ID: ${referralRecord.referrer_id}`);

            // 3. Invia email di ringraziamento con Resend
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            if (resendApiKey) {
              const { data: refUser } = await supabaseAdmin.auth.admin.getUserById(referralRecord.referrer_id);
              const refEmail = refUser?.user?.email;

              if (refEmail) {
                await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: 'info@diarioapistico.com',
                    to: [refEmail],
                    subject: '🎉 Complimenti! Hai guadagnato 1 Mese di Diario Apistico Premium!',
                    html: `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
                        <div style="text-align: center; margin-bottom: 20px;">
                          <span style="font-size: 44px;">🎁</span>
                          <h2 style="color: #d97706; margin: 8px 0;">Il tuo passaparola è stato premiato!</h2>
                        </div>
                        <p style="font-size: 15px; line-height: 1.6;">
                          Un tuo collega apicoltore si è appena abbonato a <b>Diario Apistico</b> grazie al tuo invito personale.
                        </p>
                        <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
                          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #92400e;">
                            Abbiamo aggiunto +1 Mese di Premium Gratuito al tuo account!
                          </p>
                        </div>
                        <p style="font-size: 14px; color: #64748b;">
                          Continua a invitare i tuoi colleghi apicoltori per accumulare altri mesi gratuiti.
                        </p>
                        <div style="text-align: center; margin-top: 25px;">
                          <a href="https://app.diarioapistico.com" style="background-color: #f59e0b; color: #ffffff; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 10px; display: inline-block;">
                            Apri Diario Apistico
                          </a>
                        </div>
                      </div>
                    `,
                  }),
                }).catch((e: any) => console.warn('Avviso invio email Resend referral:', e));
              }
            }
          }
        } catch (refErr) {
          console.warn('Avviso controllo referral:', refErr);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        // Gestione cancellazione abbonamento: riporta l'utente al piano 'free'
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;

        console.log(`🛑 Abbonamento cancellato per Stripe Customer: ${customerId}`);

        try {
          let resolvedUserId: string | null = subscription.metadata?.supabase_user_id || null;
          let customerEmail: string | null = null;

          if (stripeKey && customerId) {
            // Verifichiamo se il cliente ha un altro abbonamento ancora attivo prima di passare a free
            const activeSubs = await stripe.subscriptions.list({
              customer: customerId,
              status: 'active',
              limit: 5,
            });
            if (activeSubs.data.length > 0) {
              console.log(
                `ℹ️ Il cliente ${customerId} ha ancora un altro abbonamento attivo; nessun downgrade a free.`
              );
              break;
            }

            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted) {
              if (!resolvedUserId && customer.metadata?.supabase_user_id) {
                resolvedUserId = customer.metadata.supabase_user_id;
              }
              if (customer.email) {
                customerEmail = customer.email;
              }
            }

            // Fallback su Checkout Sessions del customer (legge client_reference_id se Google Pay / Link aveva cambiato email)
            if (!resolvedUserId) {
              try {
                const custSessions = await stripe.checkout.sessions.list({
                  customer: customerId,
                  limit: 10,
                });
                const matchedSession = custSessions.data.find((s) => !!s.client_reference_id);
                if (matchedSession?.client_reference_id) {
                  resolvedUserId = matchedSession.client_reference_id;
                }
              } catch (sessLookupErr) {
                console.warn('Avviso ricerca checkout.sessions in disdetta:', sessLookupErr);
              }
            }
          }

          if (!resolvedUserId && customerEmail) {
            const { data: userRow } = await supabaseAdmin
              .from('users')
              .select('id')
              .ilike('email', customerEmail)
              .maybeSingle();

            if (userRow?.id) {
              resolvedUserId = userRow.id;
            } else {
              try {
                const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
                const matchedAuthUser = authData?.users?.find(
                  (u: any) => u.email?.toLowerCase() === customerEmail!.toLowerCase()
                );
                if (matchedAuthUser?.id) {
                  resolvedUserId = matchedAuthUser.id;
                }
              } catch (authLookupErr) {
                console.warn('Errore ricerca in auth.users (disdetta):', authLookupErr);
              }
            }
          }

          if (resolvedUserId) {
            await supabaseAdmin
              .from('user_quotas')
              .update({ plan: 'free' })
              .eq('user_id', resolvedUserId);

            try {
              await supabaseAdmin
                .from('users')
                .update({ plan: 'free' })
                .eq('id', resolvedUserId);
            } catch (_) {
              // Ignoriamo se la colonna plan non esiste su public.users
            }

            console.log(
              `✅ Piano resettato a free per utente ${resolvedUserId} (${customerEmail || customerId})`
            );
          } else {
            console.warn(
              `⚠️ Nessun utente Supabase trovato per disdetta Customer ${customerId} (${customerEmail})`
            );
          }
        } catch (subErr) {
          console.warn('Errore gestione disdetta abbonamento:', subErr);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        // Rinnovo periodico (mensile o annuale): azzera i token consumati del mese
        const invoice = event.data.object as Stripe.Invoice;
        const customerEmail = invoice.customer_email;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

        let resolvedUserId: string | null = null;

        if (stripeKey && customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer && !customer.deleted && customer.metadata?.supabase_user_id) {
              resolvedUserId = customer.metadata.supabase_user_id;
            }
            if (!resolvedUserId) {
              const custSessions = await stripe.checkout.sessions.list({
                customer: customerId,
                limit: 10,
              });
              const matchedSession = custSessions.data.find((s) => !!s.client_reference_id);
              if (matchedSession?.client_reference_id) {
                resolvedUserId = matchedSession.client_reference_id;
              }
            }
          } catch (invCustErr) {
            console.warn('Avviso recupero customer in invoice.payment_succeeded:', invCustErr);
          }
        }

        if (!resolvedUserId && customerEmail) {
          const { data: userRow } = await supabaseAdmin
            .from('users')
            .select('id')
            .ilike('email', customerEmail)
            .maybeSingle();

          if (userRow?.id) {
            resolvedUserId = userRow.id;
          }
        }

        if (resolvedUserId) {
          console.log(
            `🔄 Rinnovo riuscito per utente ${resolvedUserId} (${customerEmail || customerId}). Azzeramento token.`
          );
          await supabaseAdmin
            .from('user_quotas')
            .update({ tokens_used: 0, last_reset: new Date().toISOString() })
            .eq('user_id', resolvedUserId);
        }
        break;
      }

      default:
        console.log(`Evento non gestito: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ Errore durante l\'elaborazione del webhook:', err);
    return new Response(JSON.stringify({ error: err.message || 'Errore interno server' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
