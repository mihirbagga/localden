import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, MapPin, Music2, Gamepad2, Disc3, Ticket, Sparkles, X, Search,
  Mic2, Bot, Star, Bell, Loader2, ShieldCheck, Check, Clock, Phone, User
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { LIVE_CITIES } from '../lib/liveCities'

const EVENT_FILTERS = [
  { id: 'all', label: 'All Events', icon: Sparkles },
  { id: 'music', label: 'Music', icon: Music2 },
  { id: 'dj', label: 'DJ Nights', icon: Disc3 },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
]

const SOURCE_FILTERS = [
  { id: 'localden', label: '⭐ LocalDen Events' },
  { id: 'all', label: 'All Sources' },
  { id: 'external', label: '🌐 Other Platforms' },
]

const CAT_COLOR = { music: '#ff2e6d', dj: '#b36bff', gaming: '#00e5ff', other: '#ffc53d' }
const TYPE_LABEL = { dj: 'DJ', singer: 'Singer', band: 'Band', instrumentalist: 'Instrumentalist', gamer: 'Gamer', other: 'Artist' }

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  : 'TBA'

function EventCard({ ev, i }) {
  const [imgErr, setImgErr] = useState(false)
  const color = CAT_COLOR[ev.category] || CAT_COLOR.other
  const d = ev.event_date ? new Date(ev.event_date) : null
  const isLocalDen = ev.source === 'localden' || ev.source === 'manual'
  const sourceLabel = isLocalDen
    ? 'LocalDen Official'
    : (ev.source === 'district' ? 'District' : (ev.source === 'bookmyshow' ? 'BookMyShow' : 'Other Platform'))

  return (
    <article
      className={`glass rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-200 ${
        isLocalDen ? 'neon-border-card shadow-lg shadow-[var(--magenta)]/20' : ''
      }`}
      style={{ border: `1px solid ${isLocalDen ? 'var(--magenta)' : color + '33'}`, contentVisibility: 'auto', containIntrinsicSize: '360px' }}
    >
      <div className="relative h-40 overflow-hidden flex items-end p-4 bg-[#0a0a14]">
        {ev.image_url && !imgErr ? (
          <img
            src={ev.image_url}
            alt={ev.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgErr(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${color}44, #0a0a14 80%)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

        {d && (
          <div className="absolute top-3 left-3 text-center rounded-xl px-2.5 py-1 bg-black/75 backdrop-blur z-10" style={{ border: `1px solid ${color}` }}>
            <div className="font-bungee text-lg leading-none" style={{ color }}>{d.getDate()}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/80">{d.toLocaleString('en-IN', { month: 'short' })}</div>
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {isLocalDen ? (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-[var(--magenta)] to-[var(--cyan)] text-white shadow-md">
              ⭐ LOCAL DEN
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-white/80 border border-white/10">
              {sourceLabel}
            </span>
          )}
        </div>

        <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-black" style={{ background: color }}>
          {ev.category}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-base leading-snug line-clamp-2">{ev.title}</h3>
        <p className="text-xs opacity-70 flex items-center gap-1.5 truncate"><MapPin size={13} className="shrink-0" />{[ev.venue, ev.city].filter(Boolean).join(', ')}</p>
        <p className="text-xs opacity-70 flex items-center gap-1.5"><CalendarDays size={13} className="shrink-0" />{fmtDate(ev.event_date)}</p>
        {ev.description && <p className="text-xs opacity-60 line-clamp-2">{ev.description}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color }}>{ev.price_label || ''}</span>
          {ev.ticket_url && (
            <a href={ev.ticket_url} target="_blank" rel="noopener noreferrer" className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
              <Ticket size={13} /> {isLocalDen ? 'Book Pass' : 'Tickets'}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

function ArtistCard({ a, i, onHire }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <article
      className="glass rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-200 neon-border-card"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}
    >
      <div className="relative h-52 overflow-hidden bg-[#0a0a14]">
        {a.image_url && !imgErr ? (
          <img
            src={a.image_url}
            alt={a.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgErr(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#ff2e6d33] to-[#00e5ff22]">
            <Mic2 size={56} className="opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
        {a.is_featured && <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full bg-[#ffc53d] text-black z-10">★ FEATURED</span>}
        <div className="absolute bottom-3 left-4 right-4 z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--magenta)] text-white">{TYPE_LABEL[a.type] || 'Artist'}</span>
          <h3 className="font-bungee text-xl mt-1 text-white truncate">{a.name}</h3>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between text-xs">
          {a.city ? <p className="opacity-70 flex items-center gap-1.5 truncate"><MapPin size={13} className="shrink-0" />{a.city}</p> : <span />}
          <span className="inline-flex items-center gap-1 text-[#ffc53d] font-semibold shrink-0">
            <Star size={13} fill="currentColor" />{Number(a.rating) > 0 ? Number(a.rating).toFixed(1) : 'New'}
            {a.review_count > 0 && <span className="opacity-60 font-normal text-white">({a.review_count})</span>}
          </span>
        </div>
        {a.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {a.genres.map((g) => <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">{g}</span>)}
          </div>
        )}
        {a.bio && <p className="text-xs opacity-60 line-clamp-3">{a.bio}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-sm">{a.price_from ? <>From <b className="text-[var(--cyan)]">₹{a.price_from.toLocaleString('en-IN')}</b></> : 'Price on request'}</span>
          <button className="btn-primary text-xs py-1.5 px-4" onClick={() => onHire(a)}>Book Now</button>
        </div>
      </div>
    </article>
  )
}

function SubscribeBox() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [city, setCity] = useState(LIVE_CITIES[0])
  const [interests, setInterests] = useState(['music', 'dj', 'gaming'])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('unsubscribe')
    if (!token) return
    supabase.rpc('unsubscribe_live', { p_token: token }).then(({ data, error }) => {
      if (!error && data) showToast("You've been unsubscribed from event alerts.", 'success')
      else showToast('Unsubscribe link is invalid.', 'error')
      window.history.replaceState({}, '', window.location.pathname)
    })
  }, [showToast])

  const toggle = (k) => setInterests((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))

  const submit = async (e) => {
    e.preventDefault()
    if (!interests.length) return showToast('Pick at least one interest.', 'error')
    setBusy(true)
    const { error } = await supabase.rpc('subscribe_live', { p_email: email, p_city: city, p_interests: interests })
    setBusy(false)
    if (error) return showToast('Please enter a valid email.', 'error')
    setDone(true)
    showToast(`Subscribed! Weekly events from ${city} are on the way.`, 'success')
  }

  return (
    <div className="glass neon-border-card rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="lg:max-w-xs shrink-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--cyan)]/10 text-[var(--cyan)] text-xs font-semibold mb-2">
            <Bell size={13} />
            <span>VIP Event Alerts</span>
          </div>
          <h2 className="font-bungee text-lg sm:text-xl text-white tracking-wide">
            Never Miss A Night Out
          </h2>
          <p className="text-xs text-white/60 mt-1 leading-relaxed">
            Get handpicked concerts, DJ parties & gaming meetups in your city.
          </p>
        </div>

        {done ? (
          <div className="flex-1 flex items-center justify-center p-4 rounded-xl bg-[var(--cyan)]/10 border border-[var(--cyan)]/30 text-[var(--cyan)] text-sm font-semibold">
            ✓ You're on the list! Weekly event drops are on the way.
          </div>
        ) : (
          <form onSubmit={submit} className="flex-1 max-w-2xl flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  className="input-dark w-full !text-sm !py-2.5 !px-4"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                />
              </div>

              <div className="relative shrink-0 sm:w-36">
                <select
                  className="select-dark w-full !text-xs !py-2.5 !px-3 font-semibold pr-7"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  aria-label="Select city"
                >
                  {LIVE_CITIES.map((c) => (
                    <option key={c} value={c}>📍 {c}</option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-xs">
                  ▼
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary shrink-0 text-xs font-bold uppercase tracking-wider py-2.5 px-6 whitespace-nowrap shadow-lg shadow-[var(--magenta)]/20"
                disabled={busy}
              >
                {busy ? 'Joining…' : 'Subscribe'}
              </button>
            </div>

            <div className="flex items-center flex-wrap gap-2 pt-0.5">
              <span className="text-[11px] text-white/40 uppercase tracking-wider font-semibold mr-1">Interests:</span>
              {[
                ['music', '🎵 Music'],
                ['dj', '🎧 DJ Nights'],
                ['gaming', '🎮 Gaming'],
              ].map(([k, l]) => {
                const active = interests.includes(k)
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => toggle(k)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 font-medium ${
                      active
                        ? 'bg-[var(--magenta)] border-[var(--magenta)] text-white shadow-sm shadow-[var(--magenta)]/40 scale-100'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {l}
                  </button>
                )
              })}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function HireModal({ artist, onClose }) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    name: profile?.full_name || user?.user_metadata?.full_name || '',
    phone: profile?.phone || '',
    event_type: 'Club / Party',
    event_date: '',
    city: artist.city || '',
    budget: artist.price_from ? String(artist.price_from) : '',
    message: '',
  })
  const [saving, setSaving] = useState(false)
  const [booked, setBooked] = useState([])
  const [reviews, setReviews] = useState([])
  const [imgErr, setImgErr] = useState(false)

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    supabase.rpc('artist_booked_dates', { p_artist: artist.id }).then(({ data }) => setBooked(data || []))
    supabase.from('artist_reviews').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setReviews(data || []))
  }, [artist.id])

  const today = new Date().toISOString().slice(0, 10)
  const freeDates = (artist.available_dates || []).filter((d) => d >= today && !booked.includes(d))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return showToast('Please enter your name.', 'error')
    if (!form.phone.trim()) return showToast('Please enter your phone or WhatsApp number.', 'error')
    if (!form.event_date && freeDates.length > 0) return showToast('Please pick an available date.', 'error')

    setSaving(true)
    const { error } = await supabase.from('artist_hire_requests').insert({
      artist_id: artist.id,
      user_id: user?.id || null,
      name: form.name.trim(),
      phone: form.phone.trim(),
      event_type: form.event_type || null,
      event_date: form.event_date || null,
      city: artist.city || form.city || null,
      budget: form.budget ? parseInt(form.budget, 10) : null,
      message: form.message?.trim() || null,
    })
    setSaving(false)
    if (error) return showToast(error.message?.includes('date') ? error.message : 'Could not send request. Please try again.', 'error')
    showToast(`🎉 Request sent! We'll coordinate with ${artist.name} shortly.`, 'success')
    onClose()
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="glass rounded-2xl p-5 sm:p-7 w-full max-w-xl max-h-[92vh] overflow-y-auto neon-border-card border border-white/10 shadow-2xl flex flex-col gap-5 my-auto"
      >
        {/* Top Artist Profile Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-white/15 bg-[#0a0a14] shadow-lg">
              {artist.image_url && !imgErr ? (
                <img
                  src={artist.image_url}
                  alt={artist.name}
                  onError={() => setImgErr(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ff2e6d33] to-[#00e5ff22]">
                  <Mic2 size={30} className="text-[var(--magenta)] opacity-80" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[var(--magenta)] text-white shadow-sm">
                  {TYPE_LABEL[artist.type] || 'Artist'}
                </span>
                <span className="inline-flex items-center gap-1 text-[#ffc53d] text-xs font-semibold">
                  <Star size={13} fill="currentColor" />
                  {Number(artist.rating) > 0 ? Number(artist.rating).toFixed(1) : 'New'}
                  {artist.review_count > 0 && <span className="opacity-60 text-white font-normal">({artist.review_count})</span>}
                </span>
              </div>
              <h2 className="font-bungee text-xl sm:text-2xl text-white mt-1 leading-tight truncate">
                {artist.name}
              </h2>
              {artist.genres?.length > 0 && (
                <p className="text-xs text-white/60 truncate mt-0.5">
                  {artist.genres.slice(0, 3).join(' • ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase tracking-wider text-white/50 block">Pricing</span>
              <span className="text-sm font-bold text-[var(--cyan)]">
                {artist.price_from ? `From ₹${Number(artist.price_from).toLocaleString('en-IN')}` : 'On Request'}
              </span>
            </div>
          </div>
        </div>

        {/* City Availability Card — Strictly shows the artist's operating city */}
        {artist.city ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[var(--cyan)]/10 via-white/5 to-transparent border border-[var(--cyan)]/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--cyan)]/20 text-[var(--cyan)] flex items-center justify-center shrink-0">
                <MapPin size={16} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--cyan)] block">Service City</span>
                <span className="text-sm font-bold text-white">{artist.city}</span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-white/80 bg-black/50 border border-white/10 px-2.5 py-1 rounded-full">
              ✓ Available in {artist.city} only
            </span>
          </div>
        ) : (
          <div>
            <label className="text-xs text-white/70 font-semibold mb-1 block">City for this Event *</label>
            <select className="select-dark w-full" value={form.city} onChange={set('city')} required>
              <option value="">Select city</option>
              {LIVE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* Available Dates Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              <CalendarDays size={14} className="text-[var(--cyan)]" />
              <span>Select An Available Date *</span>
            </label>
            <span className="text-[11px] text-white/50">
              {freeDates.length} open {freeDates.length === 1 ? 'date' : 'dates'}
            </span>
          </div>

          {freeDates.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <span>No pre-scheduled dates open right now.</span>
              <span className="opacity-80">You can propose a date in your notes below.</span>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {freeDates.map((d) => {
                const dateObj = new Date(d + 'T00:00:00')
                const isSelected = form.event_date === d
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => setForm((p) => ({ ...p, event_date: d }))}
                    className={`px-3 py-2 rounded-xl text-center border transition-all duration-200 shrink-0 min-w-[72px] flex flex-col items-center ${
                      isSelected
                        ? 'bg-[var(--cyan)] text-black border-[var(--cyan)] font-extrabold shadow-lg shadow-[var(--cyan)]/30 scale-105'
                        : 'border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-[9px] uppercase tracking-wider opacity-75">
                      {dateObj.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                    <span className="text-base font-extrabold leading-tight my-0.5">
                      {dateObj.getDate()}
                    </span>
                    <span className="text-[10px] opacity-75">
                      {dateObj.toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Event Type & Budget Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/70 font-semibold mb-1 block">Event Type</label>
            <select className="select-dark w-full !text-xs !py-2.5" value={form.event_type} onChange={set('event_type')}>
              {['Club / Party', 'Private Gig / House Party', 'Wedding / Sangeet', 'Corporate Event', 'College Fest', 'Gaming Tournament', 'Birthday Bash', 'Other'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/70 font-semibold mb-1 block">Estimated Budget (₹)</label>
            <input
              type="number"
              min="0"
              className="input-dark w-full !text-xs !py-2.5"
              placeholder={artist.price_from ? `Min ₹${artist.price_from.toLocaleString('en-IN')}` : 'Budget (₹)'}
              value={form.budget}
              onChange={set('budget')}
            />
          </div>
        </div>

        {/* Contact Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/70 font-semibold mb-1 block">Your Name *</label>
            <input
              className="input-dark w-full !text-xs !py-2.5"
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={set('name')}
              required
            />
          </div>

          <div>
            <label className="text-xs text-white/70 font-semibold mb-1 block">Phone / WhatsApp *</label>
            <input
              className="input-dark w-full !text-xs !py-2.5"
              placeholder="e.g. +91 98765 43210"
              value={form.phone}
              onChange={set('phone')}
              required
            />
          </div>
        </div>

        {/* Notes & Requirements */}
        <div>
          <label className="text-xs text-white/70 font-semibold mb-1 block">Event Details & Sound Setup</label>
          <textarea
            className="input-dark w-full !text-xs !py-2.5"
            rows={2}
            placeholder="Venue details, set duration (e.g. 2-3 hrs), crowd size, sound gear needed, music genres..."
            value={form.message}
            onChange={set('message')}
          />
        </div>

        {/* Reviews snippet if available */}
        {reviews.length > 0 && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Recent Review</span>
            <div className="text-xs">
              <span className="text-[#ffc53d]">{'★'.repeat(reviews[0].rating)}</span>{' '}
              <b className="text-white">{reviews[0].reviewer_name}</b>
              {reviews[0].comment && <p className="text-white/70 mt-0.5 line-clamp-2">"{reviews[0].comment}"</p>}
            </div>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="flex items-center justify-around py-2 border-y border-white/10 text-[11px] text-white/60">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[var(--cyan)]" /> Verified Artist</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-[var(--magenta)]" /> 2-Hour Response</span>
          <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Free Coordination</span>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full !py-3 text-xs sm:text-sm font-extrabold tracking-wider uppercase shadow-xl shadow-[var(--magenta)]/30 inline-flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Sending Request…</span>
            </>
          ) : (
            <span>Send Booking Request for {artist.name} →</span>
          )}
        </button>
      </motion.form>
    </motion.div>
  )
}

export default function Live() {
  const [tab, setTab] = useState('events')
  const [filter, setFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('localden')
  const [city, setCity] = useState('All')
  const [q, setQ] = useState('')
  const [events, setEvents] = useState([])
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [hiring, setHiring] = useState(null)

  const [visibleEventsCount, setVisibleEventsCount] = useState(12)
  const [visibleArtistsCount, setVisibleArtistsCount] = useState(12)
  const observerTargetRef = useRef(null)

  // Reset pagination when user alters filters or search
  useEffect(() => {
    setVisibleEventsCount(12)
    setVisibleArtistsCount(12)
  }, [filter, sourceFilter, city, q, tab])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const nowIso = new Date().toISOString()
      const [ev, ar] = await Promise.all([
        supabase.from('live_events').select('*').eq('is_active', true)
          .gte('event_date', nowIso).order('event_date', { ascending: true }),
        supabase.from('live_artists').select('*').eq('is_active', true)
          .order('is_featured', { ascending: false }).order('created_at', { ascending: false }),
      ])
      if (!alive) return
      setEvents(ev.data || [])
      setArtists(ar.data || [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const cities = useMemo(
    () => ['All', ...new Set([...LIVE_CITIES, ...events.map((e) => e.city), ...artists.map((a) => a.city)].filter(Boolean))],
    [events, artists],
  )
  const match = (s) => s.toLowerCase().includes(q.trim().toLowerCase())

  // Filter events and ensure LocalDen events are displayed first, excluding passed events
  const allFilteredEvents = useMemo(() => {
    const now = Date.now()
    const list = events.filter((e) => {
      // Do not show events after the date has passed
      if (e.event_date && new Date(e.event_date).getTime() < now) return false

      const isLocalDen = e.source === 'localden' || e.source === 'manual'
      const matchesCategory = filter === 'all' || e.category === filter
      const matchesSource =
        sourceFilter === 'all' ||
        (sourceFilter === 'localden' && isLocalDen) ||
        (sourceFilter === 'external' && !isLocalDen)
      const matchesCity = city === 'All' || e.city === city
      const matchesQuery = !q || match(`${e.title} ${e.venue || ''}`)
      return matchesCategory && matchesSource && matchesCity && matchesQuery
    })

    // Sort: LocalDen events first, then upcoming by date
    return list.sort((a, b) => {
      const aLocal = a.source === 'localden' || a.source === 'manual'
      const bLocal = b.source === 'localden' || b.source === 'manual'
      if (aLocal && !bLocal) return -1
      if (!aLocal && bLocal) return 1
      return new Date(a.event_date) - new Date(b.event_date)
    })
  }, [events, filter, sourceFilter, city, q])

  const allFilteredArtists = useMemo(() => {
    return artists.filter((a) =>
      (city === 'All' || a.city === city) && (!q || match(`${a.name} ${(a.genres || []).join(' ')}`)))
  }, [artists, city, q])

  // Sliced items for instant virtual performance
  const displayedEvents = useMemo(() => {
    return allFilteredEvents.slice(0, visibleEventsCount)
  }, [allFilteredEvents, visibleEventsCount])

  const displayedArtists = useMemo(() => {
    return allFilteredArtists.slice(0, visibleArtistsCount)
  }, [allFilteredArtists, visibleArtistsCount])

  const hasMore = tab === 'events'
    ? visibleEventsCount < allFilteredEvents.length
    : visibleArtistsCount < allFilteredArtists.length

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    const currentTarget = observerTargetRef.current
    if (!currentTarget || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (tab === 'events') {
            setVisibleEventsCount((prev) => Math.min(prev + 12, allFilteredEvents.length))
          } else {
            setVisibleArtistsCount((prev) => Math.min(prev + 12, allFilteredArtists.length))
          }
        }
      },
      { rootMargin: '300px' }
    )

    observer.observe(currentTarget)
    return () => observer.disconnect()
  }, [hasMore, tab, allFilteredEvents.length, allFilteredArtists.length])

  return (
    <div className="relative min-h-screen pt-28 pb-20">
      <GameBackground />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] text-[var(--cyan)] mb-2">LIVE • MUSIC • GAMING</p>
          <h1 className="font-bungee text-4xl sm:text-6xl leading-tight">
            <span style={{ color: '#ff2e6d', textShadow: '0 0 24px rgba(255,46,109,.6)' }}>Feel the </span>
            <span style={{ color: '#00e5ff', textShadow: '0 0 24px rgba(0,229,255,.6)' }}>Vibe</span>
          </h1>
          <p className="mt-3 opacity-70 max-w-xl mx-auto text-sm sm:text-base">
            Concerts, DJ nights & gaming tournaments happening in your city — plus top artists you can book for your own event.
          </p>
          <p className="mt-2 text-[11px] opacity-50 inline-flex items-center gap-1.5"><Bot size={12} /> Events curated daily by our AI agent</p>
        </header>

        <SubscribeBox />

        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-6">
          <div className="inline-flex p-1 rounded-full glass self-start">
            {[['events', 'Events', CalendarDays], ['artists', 'Hire Artists', Mic2]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-5 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition ${tab === id ? 'bg-[var(--magenta)] text-white' : 'opacity-70'}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-1 md:max-w-md">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input className="input-dark pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
            </div>
            <select className="select-dark w-auto" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
              {cities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {tab === 'events' && (
          <div className="flex flex-col gap-2.5 mb-6">
            {/* Platform / Source Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 shrink-0 mr-1">Organizer:</span>
              {SOURCE_FILTERS.map(({ id, label }) => {
                const active = sourceFilter === id
                return (
                  <button
                    key={id}
                    onClick={() => setSourceFilter(id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-[var(--magenta)] text-white border-[var(--magenta)] shadow-md shadow-[var(--magenta)]/30'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Event Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 shrink-0 mr-1">Category:</span>
              {EVENT_FILTERS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-all ${
                    filter === id
                      ? 'bg-[var(--cyan)] text-black border-transparent font-bold shadow-md shadow-[var(--cyan)]/20'
                      : 'border-white/15 bg-white/5 text-white/80 hover:text-white hover:border-white/25'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-white/10 border-t-[var(--magenta)] rounded-full animate-spin" /></div>
        ) : tab === 'events' ? (
          displayedEvents.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedEvents.map((e, i) => <EventCard key={e.id} ev={e} i={i} />)}
              </div>

              {/* Sentinel element to trigger load on scroll */}
              <div ref={observerTargetRef} className="py-8 flex justify-center items-center">
                {hasMore && (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 py-2 px-4 rounded-full glass border border-white/10">
                    <Loader2 size={15} className="animate-spin text-[var(--magenta)]" />
                    <span>Loading more live events…</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="glass rounded-2xl text-center py-16 px-6">
              <div className="text-5xl mb-3">{sourceFilter === 'localden' ? '⭐' : '🎧'}</div>
              <h3 className="font-bungee text-lg">
                {sourceFilter === 'localden' ? 'No Official LocalDen Events Yet' : 'No Events Found'}
              </h3>
              <p className="text-sm opacity-60 mt-1 max-w-md mx-auto">
                {sourceFilter === 'localden'
                  ? 'Official LocalDen events will appear here once published from the admin panel.'
                  : 'Check back soon — our event crawlers update listings regularly.'}
              </p>
              {sourceFilter === 'localden' && events.some((e) => e.source !== 'localden' && e.source !== 'manual') && (
                <button
                  onClick={() => setSourceFilter('all')}
                  className="btn-outline text-xs py-2 px-4 mt-4 inline-flex items-center gap-1.5"
                >
                  🌐 View Events From Other Platforms ({events.filter((e) => e.source !== 'localden' && e.source !== 'manual').length})
                </button>
              )}
            </div>
          )
        ) : (
          displayedArtists.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedArtists.map((a, i) => <ArtistCard key={a.id} a={a} i={i} onHire={setHiring} />)}
              </div>

              {/* Sentinel element to trigger load on scroll */}
              <div ref={observerTargetRef} className="py-8 flex justify-center items-center">
                {hasMore && (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 py-2 px-4 rounded-full glass border border-white/10">
                    <Loader2 size={15} className="animate-spin text-[var(--magenta)]" />
                    <span>Loading more artists…</span>
                  </div>
                )}
              </div>
            </>
          ) : <Empty emoji="🎤" title="No artists listed yet" body="Artists available for hire will appear here." />
        )}
      </div>

      <AnimatePresence>{hiring && <HireModal artist={hiring} onClose={() => setHiring(null)} />}</AnimatePresence>
    </div>
  )
}

function Empty({ emoji, title, body }) {
  return (
    <div className="glass rounded-2xl text-center py-16 px-6">
      <div className="text-5xl mb-3">{emoji}</div>
      <h3 className="font-bungee text-lg">{title}</h3>
      <p className="text-sm opacity-60 mt-1">{body}</p>
    </div>
  )
}

