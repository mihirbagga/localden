/**
 * District (district.in) events importer — free, no API key.
 *
 * Reads the public schema.org Event data District embeds on its city/genre pages
 * (pages that robots.txt allows), maps it to live_events, and upserts into Supabase.
 * Every event links back to its District page for tickets (source = 'district').
 * Polite by design: few requests, a delay between them, identifying User-Agent.
 *
 * Usage: node scripts/events_district.cjs [--dry]
 * Env (.env.local): VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
const DRY = process.argv.includes('--dry')

// Our city name -> District's slug for it. Add cities here (see src/lib/liveCities.js).
const CITIES = { Bengaluru: 'bengaluru', Gurugram: 'gurgaon' }
// District genre pages to read, and the category they imply (null = decide by keywords)
const GENRES = { music: 'music', nightlife: 'dj', 'fests-fairs': null, expos: null, sports: null, performances: null }
const UA = 'LocalDenEventsBot/1.0 (+events aggregator; links back to source)'
const DELAY_MS = 2500

const GAMING = /\b(gaming|esports?|e-sports?|valorant|bgmi|pubg|fortnite|cs:?go|counter.?strike|lan party|gamers?|game ?jam|console|tekken|fifa|dota|minecraft|anime|comic.?con|cosplay)\b/i
const MUSIC = /\b(live|concert|band|unplugged|music|festival|fest|tour|gig|sufi|rock|jazz|rap|hip.?hop|singer)\b/i
const DJ = /\b(dj|edm|techno|house|club night|party|rave|nightlife)\b/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function eventsFromHtml(html) {
  const out = []
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/g)) {
    let json
    try { json = JSON.parse(m[1]) } catch { continue }
    for (const block of [].concat(json)) {
      if (block['@type'] !== 'ItemList') continue
      for (const el of block.itemListElement || []) {
        if (el.item && el.item['@type'] === 'Event') out.push(el.item)
      }
    }
  }
  return out
}

function pickCategory(ev, hint) {
  const text = `${ev.name} ${ev.description || ''}`
  if (GAMING.test(text)) return 'gaming'
  if (hint) return hint
  if (DJ.test(text)) return 'dj'
  if (MUSIC.test(text)) return 'music'
  return null // not music/gaming related -> skip
}

function priceLabel(offers) {
  const o = [].concat(offers || [])[0]
  if (!o) return null
  const p = o.lowPrice ?? o.price
  if (p == null || p === '' || Number.isNaN(Number(p))) return null
  if (Number(p) === 0) return 'Free'
  return `₹${Number(p).toLocaleString('en-IN')} onwards`
}

function toRow(ev, city, hint) {
  const category = pickCategory(ev, hint)
  const date = ev.startDate && new Date(ev.startDate)
  if (!category || !date || Number.isNaN(+date) || date < new Date(Date.now() - 86400000)) return null
  const images = [].concat(ev.image || [])
  return {
    title: String(ev.name).slice(0, 200),
    category,
    city,
    venue: ev.location?.name || null,
    description: ev.description ? String(ev.description).slice(0, 160) : null,
    image_url: images[1] || images[0] || null,
    event_date: date.toISOString(),
    ticket_url: /^https:\/\/www\.district\.in\//.test(ev.url || '') ? ev.url : null,
    price_label: priceLabel(ev.offers),
    source: 'district',
  }
}

async function upsert(rows) {
  const res = await fetch(`${VITE_SUPABASE_URL}/rest/v1/live_events?on_conflict=title,city,event_date`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
}

;(async () => {
  if (!DRY && (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  for (const [city, slug] of Object.entries(CITIES)) {
    const seen = new Map()
    for (const [genre, hint] of Object.entries(GENRES)) {
      const url = `https://www.district.in/events/${genre}-in-${slug}-book-tickets`
      try {
        const evs = eventsFromHtml(await getPage(url))
        for (const ev of evs) {
          const row = toRow(ev, city, hint)
          if (row) seen.set(`${row.title}|${row.event_date}`, row)
        }
        console.log(`  ${city} / ${genre}: ${evs.length} listed`)
      } catch (err) {
        console.log(`  ${city} / ${genre}: skipped (${err.message})`)
      }
      await sleep(DELAY_MS)
    }
    const rows = [...seen.values()]
    if (DRY) {
      rows.slice(0, 8).forEach((r) => console.log(`   • [${r.category}] ${r.title} — ${r.venue || '?'} — ${r.event_date.slice(0, 10)} ${r.price_label || ''}`))
    } else if (rows.length) {
      await upsert(rows)
    }
    console.log(`✓ ${city}: ${rows.length} events ${DRY ? '(dry run, not saved)' : 'saved'}`)
  }
})().catch((e) => { console.error('✗', e.message); process.exit(1) })
