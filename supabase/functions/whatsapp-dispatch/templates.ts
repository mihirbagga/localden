// WhatsApp message text for every automated event.
// Each template returns the message string, or null to skip sending.

export type Party = { id?: string; full_name?: string | null; phone?: string | null }

export type Ctx = {
  event: string
  role: 'renter' | 'lister' | 'user' | 'admin'
  site: string
  booking?: Record<string, any> | null
  recipient?: Party | null
  review?: Record<string, any> | null
  payout?: Record<string, any> | null
  listing?: Record<string, any> | null
}

const SIGN = '— Team लोकल Den ⚡'

export const rupee = (n: unknown) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const first = (p?: Party | null, fallback = 'there') => (p?.full_name || '').trim().split(' ')[0] || fallback

function day(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(String(iso).length === 10 ? `${iso}T00:00:00+05:30` : iso)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
}

// Same FNV-1a hash as src/lib/messages.js so app and WhatsApp show identical PINs
function pin(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return String((Math.abs(hash) % 9000) + 1000)
}
export const handoverPin = (id: string) => pin(String(id || '0000'))
export const returnPin = (id: string) => pin(`return:${String(id || '0000')}`)

function earn(b: Record<string, any>) {
  if (b.subtotal != null) return Number(b.subtotal)
  return Math.max(0, Number(b.total_amount || 0) - Number(b.deposit || 0))
}

function bookingBits(c: Ctx) {
  const b = c.booking!
  const title = b.listings?.title || 'your gear'
  const days = Number(b.total_days || 1)
  return {
    b,
    title,
    ref: `#${String(b.id).slice(0, 8).toUpperCase()}`,
    dates: `${day(b.start_date)} → ${day(b.end_date)} (${days} day${days === 1 ? '' : 's'})`,
    handover: b.delivery_type === 'delivery' ? '🚚 Doorstep delivery' : '🏠 Self pickup',
    host: b.lister as Party | undefined,
    renter: b.renter as Party | undefined,
    renterLink: `${c.site}/dashboard?tab=bookings`,
    hostLink: `${c.site}/dashboard?tab=incoming`,
    reviewLink: `${c.site}/review/${b.id}`,
  }
}

type Template = (c: Ctx) => string | null

const T: Record<string, Template> = {
  // ── Booking lifecycle ─────────────────────────────────
  booking_placed: (c) => {
    const x = bookingBits(c)
    return `Hi ${first(c.recipient)}! 🙌 Your request for *${x.title}* is in.

📅 ${x.dates}
${x.handover}
💰 Total: *${rupee(x.b.total_amount)}*

${first(x.host, 'The host')} will confirm shortly — we'll message you the moment they do.
Track it: ${x.renterLink}

${SIGN}`
  },

  booking_requested: (c) => {
    const x = bookingBits(c)
    return `🔔 *New booking request* ${x.ref}

${first(x.renter, 'A renter')} wants *${x.title}*
📅 ${x.dates}
${x.handover}
💰 You earn: *${rupee(earn(x.b))}*

Confirm quickly to lock it in 👉 ${x.hostLink}

${SIGN}`
  },

  admin_new_order: (c) => {
    const x = bookingBits(c)
    const addr = x.b.delivery_type === 'delivery' && x.b.delivery_address
      ? `\n📍 ${typeof x.b.delivery_address === 'string' ? x.b.delivery_address : [x.b.delivery_address.line1, x.b.delivery_address.area, x.b.delivery_address.city].filter(Boolean).join(', ')}`
      : ''
    return `🚀 *NEW ORDER on LocalDen* ${x.ref}
━━━━━━━━━━━━━━
📦 ${x.title}
👤 ${x.renter?.full_name || 'Renter'}${x.renter?.phone ? ` · ${x.renter.phone}` : ''}
🏠 Host: ${x.host?.full_name || '—'}${x.host?.phone ? ` · ${x.host.phone}` : ''}
📅 ${x.dates}
💰 ${rupee(x.b.total_amount)} · ${String(x.b.payment_status || 'pending').toUpperCase()} · ${x.b.payment_method || '—'}
${x.handover}${addr}
━━━━━━━━━━━━━━
👉 ${c.site}/admin`
  },

  booking_confirmed: (c) => {
    const x = bookingBits(c)
    if (c.role === 'renter') {
      return `✅ *Booking confirmed!* ${x.ref}

*${x.title}* is yours for ${x.dates}.
${x.handover} on *${day(x.b.start_date)}*

🔐 Handover PIN: *${handoverPin(x.b.id)}*
Share it only after you've checked the gear.

Host: ${x.host?.full_name || '—'}${x.host?.phone ? ` · ${x.host.phone}` : ''}
Your pass: ${x.renterLink}

${SIGN}`
    }
    return `✅ You confirmed *${x.title}* for ${first(x.renter, 'your renter')} ${x.ref}

📅 Handover on *${day(x.b.start_date)}* · ${x.handover}
🔐 Ask for their 4-digit PIN before handing over, then take quick check-in photos.
Renter: ${x.renter?.full_name || '—'}${x.renter?.phone ? ` · ${x.renter.phone}` : ''}

${x.hostLink}`
  },

  booking_active: (c) => {
    const x = bookingBits(c)
    if (c.role === 'renter') {
      return `🎮 Enjoy *${x.title}*, ${first(c.recipient)}!

↩️ Return by *${day(x.b.end_date)}*
🔐 Return PIN: *${returnPin(x.b.id)}* — share it when you hand the gear back.
Need more time? Extend from your pass: ${x.renterLink}

${SIGN}`
    }
    return `📦 *${x.title}* is now with ${first(x.renter, 'your renter')} ${x.ref}
Due back *${day(x.b.end_date)}*. Verify their return PIN at pickup.

${x.hostLink}`
  },

  booking_completed: (c) => {
    const x = bookingBits(c)
    const deposit = Number(x.b.deposit || 0)
    if (c.role === 'renter') {
      return `🙏 Thanks for renting *${x.title}*, ${first(c.recipient)}!
${deposit > 0 ? `\n💰 Your ${rupee(deposit)} deposit is being settled — we'll message you when it's done.\n` : ''}
⭐ How was it? Rate ${first(x.host, 'your host')} in 30 seconds:
${x.reviewLink}

${SIGN}`
    }
    return `🏁 Rental complete: *${x.title}* ${x.ref}
${deposit > 0 ? `\n💰 Please settle the ${rupee(deposit)} deposit from your dashboard: ${x.hostLink}\n` : ''}
⭐ Rate ${first(x.renter, 'your renter')} — it helps every host:
${x.reviewLink}

${SIGN}`
  },

  booking_cancelled: (c) => {
    const x = bookingBits(c)
    return `❌ *Booking cancelled* ${x.ref}

*${x.title}* · ${x.dates}
${c.role === 'renter'
  ? 'If you paid online, any refund follows our cancellation policy. Find something else 👉 ' + `${c.site}/browse`
  : 'The dates are open again on your calendar.'}

Questions? ${c.site}/contact
${SIGN}`
  },

  // ── Money ─────────────────────────────────────────────
  payment_verified: (c) => {
    const x = bookingBits(c)
    return `💳 Payment received: *${rupee(x.b.paid_amount || x.b.total_amount)}* for *${x.title}* ${x.ref} ✓

${x.renterLink}`
  },

  deposit_settled: (c) => {
    const x = bookingBits(c)
    const s = x.b.deposit_status
    if (s === 'refunded') {
      return `💰 Your deposit of *${rupee(x.b.deposit_refunded_amount || x.b.deposit)}* for *${x.title}* has been refunded ✓\n\n${SIGN}`
    }
    if (s === 'partially_refunded') {
      return `💰 Deposit settled for *${x.title}*: *${rupee(x.b.deposit_refunded_amount)}* refunded, ${rupee(x.b.deposit_deduction_amount)} held.${x.b.deposit_deduction_reason ? `\nReason: ${x.b.deposit_deduction_reason}` : ''}\n\nQuestions? ${c.site}/contact · Disagree? ${c.site}/dispute/${x.b.id}`
    }
    return `⚠️ Your ${rupee(x.b.deposit)} deposit for *${x.title}* was retained.${x.b.deposit_deduction_reason ? `\nReason: ${x.b.deposit_deduction_reason}` : ''}\n\nDisagree? Raise a dispute: ${c.site}/dispute/${x.b.id}`
  },

  payout_update: (c) => {
    const p = c.payout
    if (!p) return null
    const dest = p.payout_method === 'bank' ? 'bank account' : 'UPI'
    if (p.status === 'completed') {
      return `💸 Payout of *${rupee(p.amount)}* sent to your ${dest} ✓${p.transaction_ref ? `\nRef: ${p.transaction_ref}` : ''}\n\n${c.site}/dashboard?tab=wallet`
    }
    return `⚠️ Your payout request of ${rupee(p.amount)} couldn't be processed.${p.admin_notes ? `\nNote: ${p.admin_notes}` : ''}\n\nCheck your wallet: ${c.site}/dashboard?tab=wallet`
  },

  // ── Trust ─────────────────────────────────────────────
  review_received: (c) => {
    const r = c.review
    if (!r) return null
    const stars = '⭐'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 0)))
    return `${stars} You got a new review, ${first(c.recipient)}!
${r.comment ? `\n“${String(r.comment).slice(0, 220)}”\n` : ''}${r.improvement ? '\n💡 They also shared a tip on how to make it even better.\n' : ''}
See it: ${c.site}/dashboard?tab=${r.review_type === 'lister_to_renter' ? 'bookings' : 'incoming'}`
  },

  kyc_update: (c) => {
    const status = c.recipient && (c.recipient as any).kyc_status
    if (status === 'verified') {
      return `🛡️ You're verified, ${first(c.recipient)}! Your Verified badge is now live on your profile, listings and bookings.\n\n${SIGN}`
    }
    if (status === 'rejected') {
      return `⚠️ We couldn't verify your ID yet, ${first(c.recipient)}. Please re-upload clear photos here: ${c.site}/kyc\n\n${SIGN}`
    }
    return null
  },

  admin_kyc_submitted: (c) =>
    `🪪 KYC submitted by ${c.recipient?.full_name || 'a user'}${c.recipient?.phone ? ` · ${c.recipient.phone}` : ''}\nReview: ${c.site}/admin`,

  welcome: (c) => `👋 Welcome to *लोकल Den*, ${first(c.recipient)}!

Rent PS5s, Switches, DJ controllers & instruments from people near you — or list your own idle gear and earn.

🎮 Browse: ${c.site}/browse
📦 List gear: ${c.site}/list-item

${SIGN}`,

  listing_live: (c) => {
    const l = c.listing
    if (!l) return null
    return `🚀 *${l.title}* is live on लोकल Den!

${rupee(l.price_day)}/day · ${l.location || 'your area'}
Share your link to get your first booking faster:
${c.site}/listing/${l.id}

${SIGN}`
  },

  // ── Daily reminders ───────────────────────────────────
  pickup_reminder: (c) => {
    const x = bookingBits(c)
    if (c.role === 'renter') {
      return `⏰ Tomorrow: *${x.title}* ${x.handover.toLowerCase()} (${day(x.b.start_date)})

🔐 Handover PIN: *${handoverPin(x.b.id)}*
Host: ${x.host?.full_name || '—'}${x.host?.phone ? ` · ${x.host.phone}` : ''}

${x.renterLink}`
    }
    return `⏰ Tomorrow: hand over *${x.title}* to ${x.renter?.full_name || 'your renter'}${x.renter?.phone ? ` · ${x.renter.phone}` : ''}
${x.handover} · ${day(x.b.start_date)}
Verify their PIN and take check-in photos.

${x.hostLink}`
  },

  return_reminder: (c) => {
    const x = bookingBits(c)
    return `⏰ *${x.title}* is due back tomorrow (${day(x.b.end_date)}).

🔐 Return PIN: *${returnPin(x.b.id)}*
Want it longer? Extend in 1 tap: ${x.renterLink}`
  },

  return_overdue: (c) => {
    const x = bookingBits(c)
    if (c.role === 'renter') {
      return `⚠️ *${x.title}* was due back on ${day(x.b.end_date)}.

Please return it today, or extend from your pass if you need more time.
${x.renterLink}`
    }
    return `⚠️ *${x.title}* is overdue (due ${day(x.b.end_date)}). We've reminded ${first(x.renter, 'the renter')}.
Need help? ${c.site}/contact

${x.hostLink}`
  },

  review_nudge: (c) => {
    const x = bookingBits(c)
    const other = c.role === 'renter' ? first(x.host, 'your host') : first(x.renter, 'your renter')
    return `⭐ Got 30 seconds? Rate ${other} for *${x.title}* — it really helps the community.

${x.reviewLink}`
  },
}

// Events that don't need a booking row to render
const STANDALONE = new Set(['welcome', 'payout_update', 'review_received', 'kyc_update', 'admin_kyc_submitted', 'listing_live'])

export function render(c: Ctx): string | null {
  const t = T[c.event]
  if (!t) return null
  if (!c.booking && !STANDALONE.has(c.event)) return null
  return t(c)
}
