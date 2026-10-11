/**
 * Event digest mailer — emails each active subscriber the upcoming events in
 * their city (next 7 days by default) via Resend (https://resend.com).
 *
 * Usage: node scripts/send_event_digest.cjs [--dry] [--days=7]
 * Env (.env.local): RESEND_API_KEY, EMAIL_FROM (e.g. "Local Den <events@yourdomain.com>"),
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL (e.g. https://yoursite.com)
 * Run weekly via cron / GitHub Actions, right after events_agent.cjs.
 */
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const { RESEND_API_KEY, EMAIL_FROM, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const SITE_URL = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '')
const DRY = process.argv.includes('--dry')
const DAYS = Number((process.argv.find((a) => a.startsWith('--days=')) || '--days=7').split('=')[1]) || 7

const sb = (p, opts = {}) => fetch(`${VITE_SUPABASE_URL}/rest/v1/${p}`, {
  ...opts,
  headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
})
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const fmt = (d) => new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

function render(city, events, token) {
  const rows = events.map((e) => `
    <tr><td style="padding:14px 0;border-bottom:1px solid #2a2a44">
      <div style="font-size:11px;letter-spacing:2px;color:#00e5ff;text-transform:uppercase">${esc(e.category)}</div>
      <div style="font-size:17px;font-weight:700;color:#fff;margin:2px 0">${esc(e.title)}</div>
      <div style="font-size:13px;color:#b8b8d0">📍 ${esc([e.venue, e.city].filter(Boolean).join(', '))}<br>🗓 ${fmt(e.event_date)}${e.price_label ? ' · ' + esc(e.price_label) : ''}</div>
      ${e.ticket_url ? `<a href="${esc(e.ticket_url)}" style="display:inline-block;margin-top:8px;color:#ff2e6d;font-size:13px">Get tickets →</a>` : ''}
    </td></tr>`).join('')
  return `<div style="background:#0a0a14;padding:24px;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:auto">
      <h1 style="color:#ff2e6d;font-size:22px;margin:0 0 4px">Happening in ${esc(city)} 🎧</h1>
      <p style="color:#b8b8d0;font-size:13px;margin:0 0 12px">Music, DJ nights & gaming — next ${DAYS} days.</p>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      <p style="margin-top:20px"><a href="${SITE_URL}/live" style="background:#ff2e6d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">See all events & book artists</a></p>
      <p style="color:#6c6c88;font-size:11px;margin-top:24px">You subscribed to event alerts. <a href="${SITE_URL}/live?unsubscribe=${token}" style="color:#6c6c88">Unsubscribe</a></p>
    </div></div>`
}

async function send(to, subject, html, token) {
  if (DRY) return console.log(`[dry] would email ${to}: ${subject}`)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM, to, subject, html,
      headers: { 'List-Unsubscribe': `<${SITE_URL}/live?unsubscribe=${token}>` },
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

;(async () => {
  if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || (!DRY && (!RESEND_API_KEY || !EMAIL_FROM))) {
    console.error('Missing env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM')
    process.exit(1)
  }
  const now = new Date()
  const until = new Date(now.getTime() + DAYS * 86400000)
  const events = await (await sb(`live_events?is_active=eq.true&event_date=gte.${now.toISOString()}&event_date=lte.${until.toISOString()}&order=event_date`)).json()
  const subs = await (await sb('live_subscribers?is_active=eq.true&select=*')).json()
  if (!Array.isArray(events) || !Array.isArray(subs)) throw new Error('Failed to load data')
  let sent = 0
  for (const s of subs) {
    const mine = events.filter((e) => e.city === s.city && s.interests.includes(e.category)).slice(0, 12)
    if (!mine.length) continue
    try {
      await send(s.email, `${mine.length} events in ${s.city} this week 🎶`, render(s.city, mine, s.unsubscribe_token), s.unsubscribe_token)
      if (!DRY) await sb(`live_subscribers?id=eq.${s.id}`, { method: 'PATCH', body: JSON.stringify({ last_sent_at: now.toISOString() }) })
      sent++
      await new Promise((r) => setTimeout(r, 250)) // stay under rate limits
    } catch (err) { console.error(`✗ ${s.email}:`, err.message) }
  }
  console.log(`✓ ${sent}/${subs.length} subscribers emailed`)
})()
