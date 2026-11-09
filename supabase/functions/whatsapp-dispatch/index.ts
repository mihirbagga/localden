// Sends queued WhatsApp messages from public.whatsapp_outbox through the
// configured webhook (Make / Zapier / n8n / WATI / Evolution API).
//
// Called by:
//   • pg_cron every minute (header x-dispatch-secret)      → { action: 'process' }
//   • Admin → WhatsApp screen (admin JWT)                  → process | direct | retry | reminders
//
// Secrets: WHATSAPP_WEBHOOK_URL, WA_DISPATCH_SECRET, SITE_URL (optional)
// Deploy:  supabase functions deploy whatsapp-dispatch --no-verify-jwt
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { render, type Ctx } from './templates.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dispatch-secret',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const MAX_ATTEMPTS = 5
const BATCH = 25
const MAX_BATCHES = 4
const DEFAULT_ADMIN_PHONE = '919034695091'

const BOOKING_SELECT =
  '*, listings(id, title, emoji, location, contact_phone, price_day), renter:profiles!renter_id(id, full_name, phone), lister:profiles!lister_id(id, full_name, phone)'

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function cleanPhone(raw?: string | null) {
  const digits = String(raw || '').replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

async function loadSettings(db: SupabaseClient) {
  const { data } = await db.from('site_settings').select('value').eq('id', 'whatsapp_notifications').maybeSingle()
  return (data?.value || {}) as Record<string, any>
}

async function postWebhook(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`)
}

// Build message + phone for one outbox row
async function compose(db: SupabaseClient, row: Record<string, any>, site: string, settings: Record<string, any>) {
  const ctx: Ctx = { event: row.event, role: row.recipient_role, site }

  if (row.booking_id) {
    const { data } = await db.from('bookings').select(BOOKING_SELECT).eq('id', row.booking_id).maybeSingle()
    ctx.booking = data
  }
  if (row.recipient_id) {
    const { data } = await db.from('profiles').select('id, full_name, phone, kyc_status').eq('id', row.recipient_id).maybeSingle()
    ctx.recipient = data
  }
  if (row.event === 'admin_kyc_submitted' && row.ref_id) {
    const { data } = await db.from('profiles').select('id, full_name, phone').eq('id', row.ref_id).maybeSingle()
    ctx.recipient = data
  }
  if (row.event === 'review_received' && row.ref_id) {
    const { data } = await db.from('reviews').select('*').eq('id', row.ref_id).maybeSingle()
    ctx.review = data
  }
  if (row.event === 'payout_update' && row.ref_id) {
    const { data } = await db.from('payout_requests').select('*').eq('id', row.ref_id).maybeSingle()
    ctx.payout = data
  }
  if (row.event === 'listing_live' && row.ref_id) {
    const { data } = await db.from('listings').select('id, title, price_day, location, contact_phone').eq('id', row.ref_id).maybeSingle()
    ctx.listing = data
  }

  const b = ctx.booking
  let phone = ''
  if (row.recipient_role === 'admin') phone = settings.admin_phone || DEFAULT_ADMIN_PHONE
  else if (row.recipient_role === 'renter') phone = b?.renter?.phone || ctx.recipient?.phone || ''
  else if (row.recipient_role === 'lister') phone = b?.lister?.phone || b?.listings?.contact_phone || ctx.recipient?.phone || ''
  else phone = ctx.recipient?.phone || ctx.listing?.contact_phone || ''

  // For lister-side booking messages, the recipient profile is the lister
  if (row.recipient_role === 'renter' && b?.renter) ctx.recipient = { ...b.renter, ...ctx.recipient }
  if (row.recipient_role === 'lister' && b?.lister) ctx.recipient = { ...b.lister, ...ctx.recipient }

  return { phone: cleanPhone(phone), message: render(ctx) }
}

async function processQueue(db: SupabaseClient, webhook: string, site: string) {
  const settings = await loadSettings(db)
  const stats = { sent: 0, failed: 0, skipped: 0, retrying: 0 }

  for (let i = 0; i < MAX_BATCHES; i++) {
    const { data: rows, error } = await db.rpc('wa_claim_batch', { p_limit: BATCH })
    if (error) throw error
    if (!rows?.length) break

    for (const row of rows) {
      try {
        if (settings.enabled === false) {
          await db.from('whatsapp_outbox').update({ status: 'skipped', last_error: 'WhatsApp disabled in settings' }).eq('id', row.id)
          stats.skipped++
          continue
        }

        const { phone, message } = await compose(db, row, site, settings)
        if (!message || phone.length < 10) {
          await db.from('whatsapp_outbox').update({
            status: 'skipped',
            phone: phone || null,
            message,
            last_error: !message ? 'Nothing to send for this event' : 'No phone number on file',
          }).eq('id', row.id)
          stats.skipped++
          continue
        }

        await postWebhook(webhook, {
          event: row.event,
          recipient_phone: phone,
          message,
          data: { outbox_id: row.id, booking_id: row.booking_id, recipient_role: row.recipient_role },
        })
        await db.from('whatsapp_outbox').update({
          status: 'sent', phone, message, sent_at: new Date().toISOString(), last_error: null,
        }).eq('id', row.id)
        stats.sent++
      } catch (err) {
        const giveUp = row.attempts >= MAX_ATTEMPTS
        // Exponential backoff: 2, 4, 8, 16 minutes
        const next = new Date(Date.now() + 2 ** row.attempts * 60_000).toISOString()
        await db.from('whatsapp_outbox').update({
          status: giveUp ? 'failed' : 'queued',
          next_attempt_at: next,
          last_error: String((err as Error)?.message || err).slice(0, 500),
        }).eq('id', row.id)
        if (giveUp) stats.failed++
        else stats.retrying++
      }
    }
  }
  return stats
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const body = await req.json().catch(() => ({}))
  const action = body.action || 'process'

  // ── Auth: cron secret, or a signed-in admin ──
  const secret = Deno.env.get('WA_DISPATCH_SECRET') || ''
  const fromCron = Boolean(secret) && safeEqual(req.headers.get('x-dispatch-secret') || '', secret)
  if (!fromCron) {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: userData } = await asUser.auth.getUser()
    if (!userData?.user) return json({ error: 'Sign in again.' }, 401)
    const { data: isAdmin } = await asUser.rpc('current_user_is_admin')
    if (!isAdmin) return json({ error: 'Admins only.' }, 403)
  }

  const site = (Deno.env.get('SITE_URL') || 'https://localden.online').replace(/\/$/, '')
  const settings = await loadSettings(db)
  // Secret first; the public settings field is only a transition fallback
  const webhook = Deno.env.get('WHATSAPP_WEBHOOK_URL') || settings.webhook_url || ''
  const webhookSource = Deno.env.get('WHATSAPP_WEBHOOK_URL') ? 'secret' : settings.webhook_url ? 'legacy_public_setting' : 'missing'

  try {
    if (action === 'status') {
      return json({ webhook: webhookSource, cronSecret: Boolean(secret), site })
    }

    if (!webhook) return json({ error: 'WHATSAPP_WEBHOOK_URL is not set on the server.', webhook: webhookSource }, 500)

    if (action === 'direct') {
      if (fromCron) return json({ error: 'Not allowed' }, 403)
      const phone = cleanPhone(body.phone)
      const message = String(body.message || '').slice(0, 4000)
      if (phone.length < 10 || !message) return json({ error: 'Phone and message are required.' }, 400)
      const event = String(body.event || 'admin_direct').slice(0, 60)
      let status = 'sent'
      let lastError: string | null = null
      try {
        await postWebhook(webhook, { event, recipient_phone: phone, message, data: body.data || {} })
      } catch (err) {
        status = 'failed'
        lastError = String((err as Error)?.message || err)
      }
      await db.from('whatsapp_outbox').insert({
        event, recipient_role: 'admin', dedupe_key: `direct:${crypto.randomUUID()}`,
        status, attempts: 1, phone, message, last_error: lastError,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      })
      return json({ ok: status === 'sent', status, error: lastError, webhook: webhookSource })
    }

    if (action === 'retry') {
      if (!body.id) return json({ error: 'id is required' }, 400)
      await db.from('whatsapp_outbox')
        .update({ status: 'queued', attempts: 0, next_attempt_at: new Date().toISOString(), last_error: null })
        .eq('id', body.id)
    }

    if (action === 'reminders') {
      const { error } = await db.rpc('wa_enqueue_reminders')
      if (error) throw error
    }

    const stats = await processQueue(db, webhook, site)
    return json({ ok: true, ...stats, webhook: webhookSource })
  } catch (err) {
    console.error('whatsapp-dispatch error', err)
    return json({ error: String((err as Error)?.message || err) }, 500)
  }
})
