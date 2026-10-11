/**
 * AI Events Agent — fetches upcoming music + gaming events for a city using
 * Gemini with Google Search grounding, then upserts them into Supabase.
 *
 * Usage: node scripts/events_agent.cjs "Mumbai" ["Delhi" ...]
 * Env (.env.local): GEMINI_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Schedule via cron / GitHub Actions daily.
 */
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const { GEMINI_API_KEY, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
const DEFAULT_CITIES = ['Bengaluru', 'Gurugram']

async function fetchEvents(city) {
  const today = new Date().toISOString().slice(0, 10)
  const prompt = `Today is ${today}. Search the web for upcoming events in ${city}, India in the next 60 days: live music concerts, DJ nights, festivals, and gaming events (esports tournaments, LAN parties, gaming expos, console nights).
Return ONLY a JSON array (no markdown) of up to 15 items with keys:
title, category ("music"|"gaming"|"dj"|"other"), venue, description (max 160 chars), event_date (ISO 8601 with +05:30), ticket_url (real URL or null), price_label (e.g. "₹499 onwards" or "Free" or null).
Only include real, verifiable events. Skip anything uncertain.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const json = await res.json()
  const text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  const items = JSON.parse(match[0])
  return items
    .filter((e) => e.title && e.event_date && !Number.isNaN(Date.parse(e.event_date)))
    .map((e) => ({
      title: String(e.title).slice(0, 200),
      category: ['music', 'gaming', 'dj', 'other'].includes(e.category) ? e.category : 'other',
      city,
      venue: e.venue || null,
      description: e.description || null,
      event_date: new Date(e.event_date).toISOString(),
      ticket_url: /^https?:\/\//.test(e.ticket_url || '') ? e.ticket_url : null,
      price_label: e.price_label || null,
      source: 'ai',
    }))
}

async function upsert(rows) {
  if (!rows.length) return
  const res = await fetch(`${VITE_SUPABASE_URL}/rest/v1/live_events?on_conflict=title,city,event_date`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
}

;(async () => {
  if (!GEMINI_API_KEY || !VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing GEMINI_API_KEY, VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const cities = process.argv.slice(2)
  if (!cities.length) cities.push(...DEFAULT_CITIES)
  for (const city of cities) {
    try {
      const rows = await fetchEvents(city)
      await upsert(rows)
      console.log(`✓ ${city}: ${rows.length} events saved`)
    } catch (err) {
      console.error(`✗ ${city}:`, err.message)
    }
  }
})()

