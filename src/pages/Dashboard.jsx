import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, Star, Shield, Edit3, Plus, Trash2, Eye,
  Package, Calendar, TrendingUp, Clock, Camera, LogOut,
  ChevronRight, X, Check, Minus, Wallet, Search, Copy, Download,
  HelpCircle, Home, Mail, Truck, MapPin, CreditCard, FileText, Zap,
  MessageCircle, Navigation, LayoutGrid, Bell, CalendarCheck, Layers, Tag,
  Gift, MoreVertical, Gamepad2, Music, EyeOff, Pause, Play, Lightbulb,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { supabase } from '../lib/supabase'
import { getPaymentMethodLabel, getPaymentStatusInfo } from '../lib/payments'
import {
  bookingThreadText,
  mailtoHref,
  otherPartyContact,
  whatsappHref,
  bookingWhatsAppLink,
} from '../lib/alerts'
import { fetchInspections } from '../lib/inspections'
import InspectionPanel from '../components/InspectionPanel'
import BookingThread from '../components/BookingThread'
import LiveTrackingModal from '../components/LiveTrackingModal'
import BookingStepper from '../components/BookingStepper'
import DepositRefundModal from '../components/DepositRefundModal'
import DeliveryAddressDisplay from '../components/DeliveryAddressDisplay'
import SignatureModal from '../components/SignatureModal'
import DashboardWallet from './DashboardWallet'
import BookingPaymentBreakup, { parseBookingFinancials } from '../components/BookingPaymentBreakup'
import { useWallet } from '../hooks/useWallet'
import { adjustListingStock } from '../lib/stockService'
import { updateBookingTracking } from '../lib/trackingService'
import { formatLocationDisplay } from '../lib/cities'
import { getListingHeroPhoto } from '../lib/listingPhotos'
import { shiftIso } from '../lib/bookingDates'
import { MESSAGES, getHandoverPin, getReturnPin } from '../lib/messages'
import AccountDeletionModal from '../components/AccountDeletionModal'
import { askForReviewText, reviewLink, RATING_LABELS } from '../lib/reviews'

import './dashboard.css'

const TABS = ['overview', 'listings', 'bookings', 'incoming', 'wallet']
const BOOKING_SELECT = '*, listings(id, title, emoji, photos, category, location, contact_phone, price_day, fulfillment_type, hub_id), renter:profiles!renter_id(id, full_name, phone, email, kyc_status, rating), lister:profiles!lister_id(id, full_name, phone, email, kyc_status, rating)'
const LISTING_SELECT = '*, profiles(full_name, rating, kyc_status)'
const PAID_STATUSES = ['confirmed', 'active', 'completed']
const STATUS_CHIPS = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled']

const TAB_META = {
  overview: { label: 'Overview', title: 'My Dashboard', sub: 'Rentals, listings and payouts at a glance.' },
  listings: { label: 'My Listings', title: 'My Listings', sub: 'Manage your gear, track performance and keep your availability up to date.' },
  bookings: { label: 'My Bookings', title: 'My Bookings', sub: 'Track rentals, payments and handovers in one place.' },
  incoming: { label: 'Incoming', title: 'Incoming Requests', sub: 'Approve renters, hand over gear and settle deposits.' },
  wallet: { label: 'Wallet', title: 'Wallet & Earnings', sub: 'Track your earnings, manage payouts and grow with referrals.' },
}

const LISTING_STATUS_OPTIONS = [
  { id: 'all', label: 'All status' },
  { id: 'live', label: 'Live' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'low', label: 'Low stock' },
]

const LISTING_SORTS = {
  newest: { label: 'Newest', fn: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) },
  oldest: { label: 'Oldest', fn: (a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')) },
  priceHigh: { label: 'Price: high to low', fn: (a, b) => Number(b.price_day || 0) - Number(a.price_day || 0) },
  priceLow: { label: 'Price: low to high', fn: (a, b) => Number(a.price_day || 0) - Number(b.price_day || 0) },
}

const STATUS_LABEL = {
  pending: 'Pending Approval',
  confirmed: 'Confirmed',
  active: 'Active Rental',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
}

function rupee(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function firstName(profile, user) {
  const raw = profile?.full_name || user?.email?.split('@')[0] || 'there'
  return raw.split(' ')[0]
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const start = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((start.getTime() - today.getTime()) / 86400000)
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(String(iso).length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtRange(booking) {
  const days = Number(booking.total_days || 1)
  return `${fmtDate(booking.start_date)} – ${fmtDate(booking.end_date)} (${days} day${days === 1 ? '' : 's'})`
}

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return fmtDate(iso)
}

function relDay(dateStr) {
  const days = daysUntil(dateStr)
  if (days === null) return ''
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function bookingRef(id) {
  return `LD-${String(id || '').slice(0, 8).toUpperCase()}`
}

// Short "when" hint for rows — null when plain dates already say enough
function whenHint(booking) {
  const status = booking.status || 'pending'
  const days = daysUntil(booking.start_date)
  if (status === 'cancelled' || days === null) return null
  if (days < 0 && status === 'active') return 'Happening now'
  if (days === 0) return 'Starts today'
  if (days === 1) return 'Starts tomorrow'
  if (days > 1 && days < 14 && ['pending', 'confirmed'].includes(status)) return `Starts in ${days} days`
  return null
}

function bookingEarn(booking) {
  if (booking.subtotal != null) return Number(booking.subtotal)
  return Math.max(0, Number(booking.total_amount || 0) - Number(booking.deposit || 0))
}

function depositInfo(booking) {
  const status = booking.status || 'pending'
  if (booking.deposit_status === 'refunded') return { label: 'Refunded', tone: 'is-ok' }
  if (booking.deposit_status === 'partially_refunded') {
    return { label: `${rupee(booking.deposit_deduction_amount)} held`, tone: 'is-gold', title: booking.deposit_deduction_reason }
  }
  if (booking.deposit_status === 'forfeited') return { label: 'Forfeited', tone: 'is-danger', title: booking.deposit_deduction_reason }
  if (status === 'cancelled') return { label: 'Released', tone: '' }
  if (Number(booking.deposit || 0) > 0 && status === 'completed') return { label: 'Settlement pending', tone: 'is-cyan' }
  return { label: 'In escrow', tone: '' }
}

function pactInfo(booking) {
  if (booking.renter_signature && booking.lister_signature) return { label: 'Signed by both', tone: 'is-ok' }
  if (booking.renter_signature) return { label: 'Borrower signed', tone: 'is-violet' }
  if (booking.lister_signature) return { label: 'Host signed', tone: 'is-violet' }
  return { label: 'Unsigned', tone: '' }
}

function filterBookings(rows, status) {
  if (status === 'all') return rows
  return rows.filter((row) => row.status === status)
}

function searchBookings(rows, query) {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) => [
    row.listings?.title,
    row.renter?.full_name,
    row.lister?.full_name,
    row.id,
    bookingRef(row.id),
  ].some((v) => String(v || '').toLowerCase().includes(q)))
}

function filterListings(rows, chip) {
  if (chip === 'live') return rows.filter((row) => row.is_published !== false && row.is_available)
  if (chip === 'hidden') return rows.filter((row) => row.is_published === false)
  if (chip === 'low') return rows.filter((row) => (row.stock_qty ?? 1) <= 1)
  return rows
}

function useMediaQuery(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatch(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return match
}

function Counter({ end, prefix = '', duration = 900 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    started.current = false
    setCount(0)
    const node = ref.current
    if (!node) return undefined
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return
      started.current = true
      const frames = Math.max(1, Math.round(duration / 16))
      let frame = 0
      const timer = setInterval(() => {
        frame += 1
        setCount(Math.floor((end * frame) / frames))
        if (frame >= frames) clearInterval(timer)
      }, 16)
    })
    obs.observe(node)
    return () => obs.disconnect()
  }, [end, duration])

  return <span ref={ref}>{prefix}{Number(count).toLocaleString('en-IN')}</span>
}

function DeleteModal({ listing, onConfirm, onCancel, loading }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  if (!listing) return null

  return (
    <div className="dash-modal-bg" onClick={onCancel} role="presentation">
      <div className="dash-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="dash-del-title">
        <button type="button" className="dash-modal__x" aria-label="Close delete dialog" onClick={onCancel}>
          <X size={14} />
        </button>
        <div className="dash-modal__icon"><Trash2 size={28} /></div>
        <h2 id="dash-del-title">Delete Listing?</h2>
        <p>This permanently removes the listing. Cannot undo.</p>
        <div className="dash-modal__preview">
          <span aria-hidden="true">{listing.emoji || '🎮'}</span>
          <div>
            <b>{listing.title}</b>
            <span>{rupee(listing.price_day)}/day · {listing.location}</span>
          </div>
        </div>
        <div className="dash-modal__acts">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={loading} aria-label="Confirm delete listing">
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, tone, sub, active, onClick, prefix = '' }) {
  const body = (
    <>
      <span className="dash-stat__icon">{icon}</span>
      <span className="dash-stat__text">
        <span className="dash-stat__label">{label}</span>
        <span className="dash-stat__val">
          {typeof value === 'number' ? <Counter end={value} prefix={prefix} /> : value}
        </span>
        {sub ? <span className="dash-stat__sub">{sub}</span> : null}
      </span>
    </>
  )

  // Info-only tiles (no destination) render static, without the chevron affordance
  if (!onClick) return <div className={`dash-stat is-static is-${tone}`}>{body}</div>

  return (
    <button
      type="button"
      className={`dash-stat is-${tone}${active ? ' is-on' : ''}`}
      onClick={onClick}
      aria-label={`${label}: ${prefix}${value}`}
      aria-pressed={active}
    >
      {body}
      <ChevronRight size={18} className="dash-stat__chev" />
    </button>
  )
}

function listingState(listing, rented) {
  if (listing.is_published === false) return { label: 'Hidden', tone: 'is-muted' }
  if ((listing.stock_qty ?? 1) <= 0) return { label: 'Out of stock', tone: 'is-danger' }
  if (!listing.is_available) return { label: 'Paused', tone: 'is-gold' }
  if (rented) return { label: 'Rented', tone: 'is-cyan' }
  return { label: 'Available', tone: 'is-ok' }
}

function OwnerListingCard({ listing, stats, rented, onToggle, onStock, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const menuRef = useRef(null)
  const state = listingState(listing, rented)
  const photo = !imgError ? getListingHeroPhoto(listing) : null
  const published = listing.is_published !== false
  const CatIcon = listing.category === 'music' ? Music : Gamepad2

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const run = (fn) => () => { setMenuOpen(false); fn() }

  return (
    <article className={`dash-lcard is-${listing.category === 'music' ? 'cyan' : 'magenta'}`}>
      <div className="dash-lcard__media">
        {photo ? (
          <img
            src={photo}
            alt={listing.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : <span aria-hidden="true">{listing.emoji || '🎮'}</span>}
        <span className="dash-lcard__cat">{listing.subcategory || listing.category || 'Gear'}</span>
        <span className={`dash-lcard__state ${state.tone}`}>{state.label}</span>

        <div className="dash-menu" ref={menuRef}>
          <button
            type="button"
            className="dash-menu__btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${listing.title}`}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen ? (
            <div className="dash-menu__pop" role="menu">
              <button type="button" role="menuitem" onClick={run(() => onToggle(listing, 'is_published'))}>
                {published ? <><EyeOff size={14} /> Hide from search</> : <><Eye size={14} /> Publish</>}
              </button>
              <button type="button" role="menuitem" onClick={run(() => onToggle(listing, 'is_available'))}>
                {listing.is_available ? <><Pause size={14} /> Pause bookings</> : <><Play size={14} /> Resume bookings</>}
              </button>
              <div className="dash-menu__stock">
                <span>Stock</span>
                <span className="dash-stepper" role="group" aria-label={`Stock for ${listing.title}`}>
                  <button type="button" onClick={() => onStock(listing, -1)} aria-label="Decrease stock"><Minus size={12} /></button>
                  <span>{listing.stock_qty ?? 1}</span>
                  <button type="button" onClick={() => onStock(listing, 1)} aria-label="Increase stock"><Plus size={12} /></button>
                </span>
              </div>
              <button type="button" role="menuitem" className="is-danger" onClick={run(() => onDelete(listing))}>
                <Trash2 size={14} /> Delete listing
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="dash-lcard__body">
        <h3>{listing.title}</h3>
        <p className="dash-lcard__meta">
          <span><MapPin size={13} /> {listing.location ? formatLocationDisplay(listing.location) : 'Local'}</span>
          <span><CatIcon size={13} /> {listing.category === 'music' ? 'Music' : 'Gaming'}</span>
        </p>
        <p className="dash-lcard__price">{rupee(listing.price_day)} <span>/ day</span></p>

        <dl className="dash-lcard__stats">
          <div><dt><CalendarCheck size={13} /> Bookings</dt><dd>{stats.bookings}</dd></div>
          <div><dt><TrendingUp size={13} /> Earned</dt><dd>{rupee(stats.earned)}</dd></div>
          <div>
            <dt><Star size={13} /> Rating</dt>
            <dd>{Number(listing.rating) > 0 ? `${listing.rating} (${listing.total_reviews || 0})` : 'New'}</dd>
          </div>
        </dl>

        <div className="dash-lcard__acts">
          <Link to={`/listing/${listing.id}`} className="dash-btn is-sm"><Eye size={14} /> View</Link>
          <Link to={`/list-item/edit/${listing.id}`} className="dash-btn is-sm is-cyan"><Edit3 size={14} /> Edit</Link>
        </div>
      </div>
    </article>
  )
}

function Thumb({ listing, size = '' }) {
  const photo = listing?.photos?.[0]
  return (
    <span className={`dash-thumb${size ? ` is-${size}` : ''}`} aria-hidden="true">
      {photo ? <img src={photo} alt="" loading="lazy" /> : (listing?.emoji || '🎮')}
    </span>
  )
}

function StatusPill({ status }) {
  return <span className={`dash-status is-${status}`}>{STATUS_LABEL[status] || status}</span>
}

function BookingRow({ booking, role, selected, onSelect, needsReview }) {
  const listing = booking.listings
  const status = booking.status || 'pending'
  const party = role === 'lister' ? booking.renter : booking.lister
  const hint = whenHint(booking)

  return (
    <button
      type="button"
      className={`dash-row${selected ? ' is-on' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${listing?.title || 'Booking'} ${STATUS_LABEL[status] || status}`}
    >
      <Thumb listing={listing} />
      <span className="dash-row__body">
        <strong>{listing?.title || 'Listing'}</strong>
        <span className="dash-row__meta">
          <Calendar size={12} /> {fmtRange(booking)}
          {hint ? <span className="dash-row__hint">· {hint}</span> : null}
        </span>
        <span className="dash-row__meta">
          <User size={12} /> {role === 'lister' ? 'Renter' : 'Host'}: {party?.full_name || '—'}
          {party?.kyc_status === 'verified' ? <span className="dash-tag is-ok">Verified</span> : null}
          {needsReview ? <span className="dash-tag is-gold"><Star size={11} /> Rate it</span> : null}
        </span>
      </span>
      <span className="dash-row__side">
        <b>{rupee(booking.total_amount)}</b>
        <StatusPill status={status} />
      </span>
      <ChevronRight size={18} className="dash-row__chev" />
    </button>
  )
}

function MiniStars({ value }) {
  return (
    <span className="dash-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={13} fill={value >= s ? 'currentColor' : 'transparent'} className={value >= s ? 'is-on' : ''} />
      ))}
    </span>
  )
}

function ReviewQuote({ review }) {
  return (
    <div className="dash-review__quote">
      <div className="dash-review__rating">
        <MiniStars value={review.rating} />
        <b>{RATING_LABELS[review.rating]}</b>
        <time dateTime={review.created_at}>{timeAgo(review.created_at)}</time>
      </div>
      {review.highlights?.length ? (
        <div className="dash-review__tags">
          {review.highlights.map((t) => <span key={t} className="dash-tag">{t}</span>)}
        </div>
      ) : null}
      {review.comment ? <p>“{review.comment}”</p> : null}
    </div>
  )
}

const ASKED_KEY = 'ldReviewAsked'

function readAsked(id) {
  try {
    return JSON.parse(localStorage.getItem(ASKED_KEY) || '{}')[id] || null
  } catch {
    return null
  }
}

function ReviewBox({ booking, role, info, partyName, phone, email }) {
  const { showToast } = useToast()
  const [askedAt, setAskedAt] = useState(() => readAsked(booking.id))
  const mine = info?.mine
  const theirs = info?.theirs
  const first = partyName.split(' ')[0]
  const text = askForReviewText({ booking, asRole: role, partyName })
  const waLink = phone ? whatsappHref(phone, text) : ''
  const mailLink = email ? mailtoHref(email, `Quick review for ${booking.listings?.title || 'your rental'}?`, text) : ''

  const markAsked = () => {
    const now = new Date().toISOString()
    setAskedAt(now)
    try {
      const all = JSON.parse(localStorage.getItem(ASKED_KEY) || '{}')
      localStorage.setItem(ASKED_KEY, JSON.stringify({ ...all, [booking.id]: now }))
    } catch {
      /* storage blocked — the reminder still sent */
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewLink(booking.id))
      markAsked()
      showToast('Review link copied — send it to ' + first, 'success')
    } catch {
      showToast('Could not copy link', 'error')
    }
  }

  return (
    <section className="dash-box dash-review">
      <h3><Star size={14} /> Reviews</h3>
      <div className="dash-review__grid">
        <div className="dash-review__col">
          <span className="dash-review__label">Your review of {first}</span>
          {mine ? (
            <ReviewQuote review={mine} />
          ) : (
            <>
              <p className="dash-review__muted">How was {first} as a {role === 'lister' ? 'renter' : 'host'}? Tap a star to start.</p>
              <div className="dash-review__pick" role="group" aria-label="Start a review">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Link key={s} to={`/review/${booking.id}?rating=${s}`} aria-label={`Rate ${s} star${s === 1 ? '' : 's'}`}>
                    <Star size={22} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="dash-review__col">
          <span className="dash-review__label">{first}’s review of you</span>
          {theirs ? (
            <>
              <ReviewQuote review={theirs} />
              {theirs.improvement ? (
                <div className="dash-review__tip">
                  <Lightbulb size={15} />
                  <div>
                    <strong>How you can make it better</strong>
                    <p>{theirs.improvement}</p>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="dash-review__muted">
                Not reviewed yet. Reviews build trust and help you {role === 'lister' ? 'get more bookings' : 'get approved faster'}.
              </p>
              <div className="dash-review__ask">
                {waLink ? (
                  <a href={waLink} target="_blank" rel="noreferrer" className="dash-btn is-sm is-ok" onClick={markAsked}>
                    <MessageCircle size={13} /> Ask {first} for a review
                  </a>
                ) : null}
                {mailLink ? (
                  <a href={mailLink} className="dash-btn is-sm" onClick={markAsked} aria-label={`Email ${first} a review request`}>
                    <Mail size={13} /> {waLink ? 'Email' : `Email ${first}`}
                  </a>
                ) : null}
                <button type="button" className="dash-btn is-sm" onClick={copyLink}>
                  <Copy size={13} /> Copy link
                </button>
              </div>
              {askedAt ? <small className="dash-review__asked"><Check size={12} /> Asked {timeAgo(askedAt)}</small> : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function BookingDetail({ booking, role, inline, reviewInfo, onStatus, onExtendRental }) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const listing = booking.listings
  const listingId = listing?.id
  const status = booking.status || 'pending'

  const listerActs = role === 'lister'
  const [other, setOther] = useState(null)
  const [forcePhase, setForcePhase] = useState('')
  const [pendingStatus, setPendingStatus] = useState('')
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [showBreakup, setShowBreakup] = useState(false)

  const handleSaveDirectSignature = async (payload) => {
    const isRenter = role === 'renter'
    const sigField = isRenter ? 'renter_signature' : 'lister_signature'
    const dateField = isRenter ? 'renter_signed_at' : 'lister_signed_at'

    booking[sigField] = payload.signatureUrl
    booking[dateField] = payload.signedAt

    try {
      const { error: rpcErr } = await supabase.rpc('sign_booking_agreement', {
        p_booking_id: booking.id,
        p_signature: payload.signatureUrl,
      })
      if (rpcErr) {
        await supabase
          .from('bookings')
          .update({
            [sigField]: payload.signatureUrl,
            [dateField]: payload.signedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id)
      }

      if (booking.renter_signature && booking.lister_signature) {
        const { uploadSignedAgreementPDF } = await import('../lib/rentalAgreement')
        const renterName = booking.renter?.full_name || (isRenter ? payload.signerName : 'Borrower')
        const listerName = booking.lister?.full_name || (!isRenter ? payload.signerName : 'Host')
        const agreementUrl = await uploadSignedAgreementPDF(booking, booking.listings, renterName, listerName)
        if (agreementUrl) booking.agreement_url = agreementUrl
        showToast('✓ Pact sealed with both signatures and saved to cloud!', 'success')
      } else {
        showToast('✓ Your digital signature was recorded!', 'success')
      }
      onStatus(booking, booking.status)
    } catch (err) {
      showToast(err.message || 'Could not save signature', 'error')
    }
  }

  useEffect(() => {
    const otherId = role === 'lister' ? booking.renter_id : booking.lister_id
    let cancelled = false
    supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', otherId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setOther(data) })
    return () => { cancelled = true }
  }, [role, booking.renter_id, booking.lister_id])

  const partyName = role === 'lister'
    ? (booking.renter?.full_name || other?.full_name || 'Renter')
    : (booking.lister?.full_name || other?.full_name || 'Lister')
  const partyPhone = role === 'lister'
    ? (booking.renter?.phone || other?.phone || '')
    : (booking.lister?.phone || other?.phone || '')
  const partyKyc = role === 'lister'
    ? (booking.renter?.kyc_status || other?.kyc_status || 'unverified')
    : (booking.lister?.kyc_status || other?.kyc_status || 'unverified')
  const partyId = role === 'lister' ? booking.renter_id : booking.lister_id

  const contact = {
    ...otherPartyContact({ ...booking, renter: other, lister: other }, role),
    ...(other || {}),
  }
  const phone = partyPhone || contact.phone
  const thread = bookingThreadText(booking)
  const wa = phone ? whatsappHref(phone, thread) : ''
  const mail = contact.email ? mailtoHref(contact.email, `लोकल Den · ${listing?.title || 'Booking'}`, thread) : ''
  const fin = parseBookingFinancials(booking)
  const deposit = depositInfo(booking)
  const pact = pactInfo(booking)
  const payStatus = getPaymentStatusInfo(booking.payment_status, booking.payment_method)
  const bothSigned = Boolean(booking.renter_signature && booking.lister_signature)

  const askThenStatus = async (next) => {
    if (next === 'active' || next === 'completed') {
      const need = next === 'active' ? 'checkin' : 'checkout'
      try {
        const rows = await fetchInspections(booking.id)
        const hasMine = rows.some((row) => row.phase === need && row.submitted_by === user?.id)
        if (!hasMine) {
          setPendingStatus(next)
          setForcePhase(need)
          return
        }
      } catch {
        /* table missing — don't block status */
      }
    }
    onStatus(booking, next)
  }

  const { confirm } = useConfirm()

  const handleConfirmCash = async () => {
    const ok = await confirm({
      title: 'Confirm Cash Received',
      message: `Confirm that you received ₹${booking.total_amount} in cash from ${partyName}?`,
      confirmText: 'Yes, Cash Received',
      variant: 'success',
    })
    if (!ok) return
    try {
      const { error } = await supabase.rpc('confirm_booking_payment', {
        p_booking_id: booking.id,
        p_note: 'Cash verified by lister',
      })
      if (error) {
        if (/does not exist/i.test(error.message || '')) {
          await supabase.from('bookings').update({ payment_status: 'paid', updated_at: new Date().toISOString() }).eq('id', booking.id)
        } else {
          throw error
        }
      }
      booking.payment_status = 'paid'
      onStatus(booking, booking.status)
    } catch (err) {
      console.error('Confirm cash error:', err?.message)
    }
  }

  const copyRef = () => {
    navigator.clipboard?.writeText(bookingRef(booking.id))
    showToast('Booking ID copied', 'success')
  }

  const downloadPact = async () => {
    try {
      const { generateAgreementPDF, uploadSignedAgreementPDF } = await import('../lib/rentalAgreement')
      const myName = profile?.full_name || user?.email?.split('@')[0] || ''
      const renterName = role === 'renter' ? (booking.renter?.full_name || myName || 'Borrower') : partyName
      const listerName = role === 'lister' ? (booking.lister?.full_name || myName || 'Host') : partyName
      await generateAgreementPDF(booking, booking.listings, renterName, listerName, {
        renterPhone: role === 'renter' ? (booking.renter?.phone || profile?.phone) : phone,
        listerPhone: role === 'lister' ? (booking.lister?.phone || profile?.phone) : phone,
        download: true,
      })
      if (bothSigned) {
        const url = await uploadSignedAgreementPDF(booking, booking.listings, renterName, listerName)
        if (url) booking.agreement_url = url
      }
    } catch (err) {
      console.error('Agreement generation error:', err)
      showToast('Failed to generate agreement PDF', 'error')
    }
  }

  return (
    <article className={`dash-detail${inline ? ' is-inline' : ''}`} aria-label={`${listing?.title || 'Booking'} details`}>
      <header className="dash-detail__head">
        <Thumb listing={listing} size="lg" />
        <div className="dash-detail__title">
          <h2>{listing?.title || 'Listing'}</h2>
          <button type="button" className="dash-detail__id" onClick={copyRef} aria-label="Copy booking ID">
            Booking ID: {bookingRef(booking.id)} <Copy size={12} />
          </button>
          <span><Calendar size={13} /> {fmtRange(booking)}</span>
        </div>
        <StatusPill status={status} />
      </header>

      <BookingStepper
        booking={booking}
        role={role}
        partyPhone={phone}
        partyName={partyName}
        onAction={(next) => askThenStatus(next)}
        onOpenInspection={(phase) => setForcePhase(phase)}
        onOpenRefund={() => setRefundModalOpen(true)}
        onOpenSignature={() => setSignatureOpen(true)}
        onExtendRental={onExtendRental}
      />

      <div className="dash-detail__grid">
        <section className="dash-box">
          <h3><FileText size={14} /> Rental summary</h3>
          <dl className="dash-kv">
            <div>
              <dt>Rental duration</dt>
              <dd>{booking.total_days || 1} day{Number(booking.total_days || 1) === 1 ? '' : 's'}</dd>
            </div>
            <div>
              <dt>{role === 'lister' ? 'Renter' : 'Host'}</dt>
              <dd>
                {partyId ? <Link to={`/lister/${partyId}`}>{partyName}</Link> : partyName}
                {partyKyc === 'verified' ? <span className="dash-tag is-ok">Verified</span> : null}
              </dd>
            </div>
            {phone ? (
              <div>
                <dt>Phone</dt>
                <dd><a href={`tel:${phone}`}>{phone}</a></dd>
              </div>
            ) : null}
            <div>
              <dt>Handover type</dt>
              <dd>
                {booking.delivery_type === 'delivery' ? <Truck size={13} /> : <MapPin size={13} />}
                {booking.delivery_type || 'pickup'}
              </dd>
            </div>
            <div>
              <dt>Rental pact</dt>
              <dd><span className={`dash-tag ${pact.tone}`}>{pact.label}</span></dd>
            </div>
          </dl>
        </section>

        <section className="dash-box">
          <h3>
            <CreditCard size={14} /> Payment summary
            <button type="button" className="dash-link" onClick={() => setShowBreakup((v) => !v)} aria-expanded={showBreakup}>
              {showBreakup ? 'Hide breakup' : 'View breakup'} <ChevronRight size={12} />
            </button>
          </h3>
          <dl className="dash-kv">
            <div>
              <dt>Rental ({booking.total_days || 1}d)</dt>
              <dd>{rupee(fin.subtotal)}</dd>
            </div>
            {fin.deliveryFee > 0 ? (
              <div><dt>Delivery</dt><dd>{rupee(fin.deliveryFee)}</dd></div>
            ) : null}
            {fin.insuranceAmount > 0 ? (
              <div><dt>Protection</dt><dd>{rupee(fin.insuranceAmount)}</dd></div>
            ) : null}
            {fin.discountAmount > 0 ? (
              <div className="is-minus"><dt>Discount</dt><dd>−{rupee(fin.discountAmount)}</dd></div>
            ) : null}
            {fin.walletAmount > 0 ? (
              <div className="is-minus"><dt>Wallet credit</dt><dd>−{rupee(fin.walletAmount)}</dd></div>
            ) : null}
            <div>
              <dt>Deposit</dt>
              <dd>
                {rupee(booking.deposit)}
                <span className={`dash-tag ${deposit.tone}`} title={deposit.title || ''}>{deposit.label}</span>
              </dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                {getPaymentMethodLabel(booking.payment_method)}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${payStatus.badgeClass}`}>{payStatus.label}</span>
              </dd>
            </div>
            <div className="is-total">
              <dt>Total</dt>
              <dd>{rupee(booking.total_amount)}</dd>
            </div>
          </dl>
          {booking.payment_ref ? <p className="dash-detail__ref">Ref: {booking.payment_ref}</p> : null}
        </section>
      </div>

      {showBreakup ? <BookingPaymentBreakup booking={booking} role={role} defaultExpanded /> : null}

      {booking.delivery_type === 'delivery' && booking.delivery_address ? (
        <section className="dash-box">
          <h3><MapPin size={14} /> Delivery</h3>
          <DeliveryAddressDisplay address={booking.delivery_address} />
        </section>
      ) : null}

      {['confirmed', 'active', 'completed'].includes(status) ? (
        <InspectionPanel
          booking={booking}
          role={role}
          forcePhase={forcePhase}
          onForceHandled={() => setForcePhase('')}
          onAfterSave={(phase) => {
            if (pendingStatus === 'active' && phase === 'checkin') onStatus(booking, 'active')
            if (pendingStatus === 'completed' && phase === 'checkout') onStatus(booking, 'completed')
            setPendingStatus('')
            setForcePhase('')
          }}
        />
      ) : null}

      <div className="dash-detail__cta">
        {status !== 'cancelled' ? (
          <button type="button" className="dash-btn" onClick={downloadPact} aria-label="Download or view rental agreement PDF">
            <Download size={15} /> {bothSigned ? 'Signed pact PDF' : 'Rental pact PDF'}
          </button>
        ) : null}
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className="dash-btn is-ok" aria-label={`WhatsApp ${partyName}`}>
            <MessageCircle size={15} /> WhatsApp {partyName.split(' ')[0]}
          </a>
        ) : (
          <Link to="/contact" className="dash-btn"><HelpCircle size={15} /> Get support</Link>
        )}
      </div>

      {status === 'completed' ? (
        <ReviewBox
          booking={booking}
          role={role}
          info={reviewInfo}
          partyName={partyName}
          phone={phone}
          email={contact.email}
        />
      ) : null}

      <div className="dash-detail__more">
        {status !== 'cancelled' ? (
          <button type="button" className="dash-btn is-sm is-cyan" onClick={() => setTrackingOpen(true)}>
            <Navigation size={13} /> Live tracking
          </button>
        ) : null}
        {listingId ? (
          <Link to={`/listing/${listingId}`} className="dash-btn is-sm"><Eye size={13} /> Open listing</Link>
        ) : null}

        {/* Contextual WhatsApp alerts with PINs */}
        {status === 'confirmed' && phone ? (
          <a
            href={bookingWhatsAppLink('pickup_reminder', booking, phone, { handoverPin: getHandoverPin(booking.id) })}
            target="_blank"
            rel="noreferrer"
            className="dash-btn is-sm is-ok"
            title="Send pickup reminder with Handover PIN via WhatsApp"
          >
            📲 Pickup + PIN reminder
          </a>
        ) : null}
        {status === 'active' && phone ? (
          <a
            href={bookingWhatsAppLink('return_reminder', booking, phone, { returnPin: getReturnPin(booking.id) })}
            target="_blank"
            rel="noreferrer"
            className="dash-btn is-sm is-ok"
            title="Send return reminder with Return PIN via WhatsApp"
          >
            📲 Return + PIN reminder
          </a>
        ) : null}
        {mail ? (
          <a href={mail} className="dash-btn is-sm" aria-label={`Email ${partyName}`}><Mail size={13} /> Email</a>
        ) : null}

        {listerActs && status === 'completed' && Number(booking.deposit || 0) > 0 && !['refunded', 'partially_refunded', 'forfeited'].includes(booking.deposit_status) ? (
          <button type="button" className="dash-btn is-sm is-ok" onClick={() => setRefundModalOpen(true)}>
            💰 Process deposit refund
          </button>
        ) : null}

        {listerActs && booking.payment_method === 'cash' && booking.payment_status !== 'paid' && status !== 'cancelled' ? (
          <button type="button" className="dash-btn is-sm is-ok" onClick={handleConfirmCash} aria-label="Confirm cash payment received">
            💵 Confirm cash received
          </button>
        ) : null}

        {['active', 'completed'].includes(status) ? (
          <Link to={`/dispute/${booking.id}`} className="dash-btn is-sm is-danger" aria-label="Raise dispute">⚖️ Dispute</Link>
        ) : null}
        {wa ? (
          <Link to="/contact" className="dash-btn is-sm"><HelpCircle size={13} /> Support</Link>
        ) : null}

        {listerActs && status !== 'completed' && status !== 'cancelled' ? (
          <label className="dash-detail__status">
            Set status
            <select
              className="select-dark"
              value={status}
              onChange={(e) => onStatus(booking, e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active / Handed Over</option>
              <option value="completed">Completed / Returned</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        ) : null}
      </div>

      <BookingThread booking={booking} />

      {trackingOpen && (
        <LiveTrackingModal booking={booking} onClose={() => setTrackingOpen(false)} />
      )}
      {refundModalOpen && (
        <DepositRefundModal
          booking={booking}
          onClose={() => setRefundModalOpen(false)}
          onRefundSuccess={(res) => {
            Object.assign(booking, res)
            onStatus(booking, booking.status)
          }}
        />
      )}
      {signatureOpen && (
        <SignatureModal
          booking={booking}
          signerName={user?.user_metadata?.full_name || user?.email}
          signerRole={role}
          onClose={() => setSignatureOpen(false)}
          onSaveSignature={handleSaveDirectSignature}
        />
      )}
    </article>
  )
}

function BookingsPanel({ rows, role, loading, filter, onFilter, selectedId, onSelect, onStatus, onExtendRental, empty, reviewIndex = {} }) {
  const isWide = useMediaQuery('(min-width: 1024px)')
  const [query, setQuery] = useState('')

  const counts = useMemo(
    () => Object.fromEntries(STATUS_CHIPS.map((chip) => [chip, filterBookings(rows, chip).length])),
    [rows]
  )
  const shown = useMemo(() => searchBookings(filterBookings(rows, filter), query), [rows, filter, query])

  // Desktop always shows a detail pane, so fall back to the first row
  const selected = shown.find((row) => row.id === selectedId) || (isWide ? shown[0] : null)

  const detail = selected ? (
    <BookingDetail
      key={selected.id}
      booking={selected}
      role={role}
      inline={!isWide}
      reviewInfo={reviewIndex[selected.id]}
      onStatus={onStatus}
      onExtendRental={onExtendRental}
    />
  ) : null

  return (
    <div className="dash-split">
      <div className="dash-split__list">
        <div className="dash-search">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search by gear, ${role === 'lister' ? 'renter' : 'host'} or booking ID`}
            aria-label="Search bookings"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>
          ) : null}
        </div>

        <div className="dash-chips" role="group" aria-label="Filter by status">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              className={`dash-chip${filter === chip ? ' is-on' : ''}`}
              onClick={() => onFilter(chip)}
              aria-pressed={filter === chip}
            >
              {chip} <small>{counts[chip]}</small>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="dash-rows"><div className="dash-skel" /><div className="dash-skel" /><div className="dash-skel" /></div>
        ) : rows.length === 0 ? (
          empty
        ) : shown.length === 0 ? (
          <EmptyBlock emoji="🔍" title="No matches" body="Try another status or search term." />
        ) : (
          <div className="dash-rows">
            {shown.map((booking) => (
              <Fragment key={booking.id}>
                <BookingRow
                  booking={booking}
                  role={role}
                  selected={selected?.id === booking.id}
                  needsReview={booking.status === 'completed' && !reviewIndex[booking.id]?.mine}
                  onSelect={() => onSelect(!isWide && selected?.id === booking.id ? null : booking.id)}
                />
                {!isWide && selected?.id === booking.id ? detail : null}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {isWide ? (
        <aside className="dash-split__detail">
          {detail || <div className="dash-detail is-empty">Select a booking to see its details.</div>}
        </aside>
      ) : null}
    </div>
  )
}

function PendingInbox({ rows, onApprove, onDecline }) {
  if (!rows.length) return null
  return (
    <section className="dash-inbox" aria-label="Pending requests">
      <span className="dash-eyebrow is-green">
        <Zap size={13} /> {rows.length} request{rows.length === 1 ? '' : 's'} waiting
      </span>
      <p>Approve in 1 tap to lock in earnings and send the renter their 4-digit handover OTP.</p>
      {rows.map((req) => (
        <div key={req.id} className="dash-inbox__item">
          <div className="dash-inbox__top">
            <Thumb listing={req.listings} size="sm" />
            <div className="dash-inbox__body">
              <div>
                <strong>{req.listings?.title || 'Gear Rental'}</strong>
                <span className="dash-tag is-ok">You earn {rupee(bookingEarn(req))}</span>
              </div>
              <span>
                {req.renter?.full_name || 'Renter'}
                {req.renter?.kyc_status === 'verified' ? ' (✓ KYC)' : ''} · {fmtRange(req)} · {req.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
              </span>
            </div>
            <div className="dash-inbox__acts">
              <button type="button" className="dash-btn is-sm is-ok is-solid" onClick={() => onApprove(req, true)}>
                <Check size={13} /> Confirm &amp; WhatsApp
              </button>
              <button type="button" className="dash-btn is-sm is-cyan" onClick={() => onApprove(req, false)}>
                Confirm only
              </button>
              <button type="button" className="dash-btn is-sm is-danger" onClick={() => onDecline(req)}>
                Decline
              </button>
            </div>
          </div>
          <BookingPaymentBreakup booking={req} role="lister" defaultExpanded={false} />
        </div>
      ))}
    </section>
  )
}

function EmptyBlock({ emoji, title, body, to, cta, large }) {
  return (
    <div className={`dash-empty${large ? ' is-lg' : ''}`}>
      <div className="dash-empty__emoji" aria-hidden="true">{emoji}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {to && cta ? <Link to={to} className="dash-btn is-primary">{cta}</Link> : null}
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, signOut, updateProfile, uploadAvatar, isAdmin } = useAuth()
  const walletState = useWallet()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'overview'
  const [bookFilter, setBookFilter] = useState('all')
  const [incomingFilter, setIncomingFilter] = useState('all')
  const [listFilter, setListFilter] = useState('all')
  const [listQuery, setListQuery] = useState('')
  const [listCategory, setListCategory] = useState('all')
  const [listSort, setListSort] = useState('newest')
  const [openBook, setOpenBook] = useState(null)

  const [myListings, setMyListings] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [incoming, setIncoming] = useState([])
  const [loadingL, setLoadingL] = useState(true)
  const [loadingB, setLoadingB] = useState(true)
  const [loadingIn, setLoadingIn] = useState(true)
  const [reviews, setReviews] = useState([])
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    setNameVal(profile?.full_name || '')
  }, [profile?.full_name])

  const setTab = (next) => {
    const nextParams = new URLSearchParams(params)
    if (next === 'overview') nextParams.delete('tab')
    else nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  const loadListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select(LISTING_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMyListings(data || [])
    setLoadingL(false)
  }

  const loadBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('renter_id', user.id)
      .order('created_at', { ascending: false })
    setMyBookings(data || [])
    setLoadingB(false)
  }

  const loadIncoming = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('lister_id', user.id)
      .order('created_at', { ascending: false })
    setIncoming(data || [])
    setLoadingIn(false)
  }

  const loadReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .or(`reviewer_id.eq.${user.id},reviewee_id.eq.${user.id}`)
    setReviews(data || [])
  }

  useEffect(() => {
    if (!user) return undefined
    loadListings()
    loadBookings()
    loadIncoming()
    loadReviews()

    const channel = supabase
      .channel(`dash-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `renter_id=eq.${user.id}` }, loadBookings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `lister_id=eq.${user.id}` }, loadIncoming)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings', filter: `user_id=eq.${user.id}` }, loadListings)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews', filter: `reviewee_id=eq.${user.id}` }, loadReviews)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // booking_id → { mine, theirs } so rows and the detail pane know what's reviewed
  const reviewIndex = useMemo(() => {
    const map = {}
    reviews.forEach((row) => {
      map[row.booking_id] = map[row.booking_id] || {}
      if (row.reviewer_id === user?.id) map[row.booking_id].mine = row
      else if (!row.is_hidden) map[row.booking_id].theirs = row
    })
    return map
  }, [reviews, user?.id])

  const toReview = useMemo(
    () => [...myBookings, ...incoming].filter((row) => row.status === 'completed' && !reviewIndex[row.id]?.mine),
    [myBookings, incoming, reviewIndex]
  )

  const liveListings = myListings.filter((row) => row.is_available && row.is_published !== false).length
  const pendingIn = incoming.filter((row) => row.status === 'pending').length
  const completedBookings = myBookings.filter((row) => row.status === 'completed').length
  const earned = incoming.filter((row) => PAID_STATUSES.includes(row.status)).reduce((sum, row) => sum + bookingEarn(row), 0)

  const nextUp = useMemo(() => {
    if (pendingIn > 0) {
      return {
        title: `${pendingIn} incoming request${pendingIn === 1 ? '' : 's'} awaiting your response`,
        sub: 'Confirm or decline quickly so your renter can plan their session.',
        cta: 'Review Requests',
        go: () => { setTab('incoming'); setIncomingFilter('pending') },
      }
    }
    const pipeline = [...myBookings, ...incoming]
      .filter((row) => ['confirmed', 'active'].includes(row.status))
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0]
    if (pipeline) {
      const days = daysUntil(pipeline.start_date)
      const title = pipeline.listings?.title || 'Upcoming Rental'
      let sub = `${pipeline.start_date} → ${pipeline.end_date}`
      if (days === 0) sub = 'Handover is today! Remember to take quick check-in photos.'
      else if (days === 1) sub = 'Starts tomorrow — coordinate handover time on WhatsApp.'
      else if (days > 1) sub = `Starts in ${days} days — everything is locked in.`
      return {
        title,
        sub,
        cta: 'Open Booking',
        go: () => {
          setTab(pipeline.renter_id === user?.id ? 'bookings' : 'incoming')
          setOpenBook(pipeline.id)
        },
      }
    }
    if (toReview.length > 0) {
      const row = toReview[0]
      return {
        title: `Rate your rental: ${row.listings?.title || 'recent booking'}`,
        sub: `${toReview.length} completed booking${toReview.length === 1 ? '' : 's'} waiting for your review. Takes 30 seconds.`,
        cta: 'Leave a review',
        href: `/review/${row.id}`,
      }
    }
    if (myListings.length === 0) {
      return {
        title: 'Turn your idle gear into weekend income',
        sub: 'List a console, controller, guitar, or DJ rig in under 2 minutes.',
        cta: '+ List Your Gear',
        href: '/list-item',
      }
    }
    if (myBookings.length === 0) {
      return {
        title: 'Ready for your next gaming or jam session?',
        sub: 'Explore verified gear available across Bengaluru & Gurugram.',
        cta: 'Explore Gear',
        href: '/browse',
      }
    }
    return {
      title: 'All caught up!',
      sub: 'No pending actions right now. Browse new drops or list another item.',
      cta: 'Browse Catalog',
      href: '/browse',
    }
  }, [pendingIn, myBookings, incoming, myListings.length, user?.id, toReview])

  const checks = [
    {
      done: profile?.kyc_status === 'verified' || profile?.kyc_status !== 'required',
      title: profile?.kyc_status === 'verified'
        ? 'Identity Verified (KYC)'
        : profile?.kyc_status === 'required'
          ? 'KYC Verification Requested'
          : 'Account Ready to Rent & List',
      sub: profile?.kyc_status === 'verified'
        ? 'Your Verified badge is live across all listings and bookings.'
        : profile?.kyc_status === 'submitted'
          ? 'Our trust team is reviewing your documents.'
          : profile?.kyc_status === 'required'
            ? 'Complete quick ID verification to unlock high-value rentals.'
            : 'No extra documents needed right now — rent and list freely!',
      go: () => navigate('/kyc'),
    },
    {
      done: myListings.length > 0,
      title: 'List Your First Gear',
      sub: myListings.length ? `${myListings.length} item${myListings.length === 1 ? '' : 's'} on your gear shelf` : 'Put your idle console or instrument to work',
      go: () => (myListings.length ? setTab('listings') : navigate('/list-item')),
    },
    {
      done: myBookings.length + incoming.length > 0,
      title: 'First Rental Activity',
      sub: myBookings.length + incoming.length ? 'Active member of the Local Den community' : 'Book gear for the weekend or receive your first request',
      go: () => setTab(incoming.length ? 'incoming' : 'bookings'),
    },
  ]

  const setupDone = checks.filter((item) => item.done).length

  const activity = useMemo(() => {
    const listingRows = myListings.slice(0, 4).map((row) => ({
      id: `l-${row.id}`,
      title: row.title,
      sub: `Listed · ${row.location ? formatLocationDisplay(row.location) : 'Local'}`,
      tone: 'magenta',
      at: row.created_at,
      go: () => setTab('listings'),
    }))
    const rentRows = myBookings.slice(0, 4).map((row) => ({
      id: `b-${row.id}`,
      title: row.listings?.title || 'Booking',
      sub: `You booked · ${STATUS_LABEL[row.status] || row.status}`,
      tone: 'cyan',
      at: row.created_at,
      go: () => { setTab('bookings'); setOpenBook(row.id) },
    }))
    const inRows = incoming.slice(0, 4).map((row) => ({
      id: `i-${row.id}`,
      title: row.listings?.title || 'Incoming',
      sub: `Renter request · ${STATUS_LABEL[row.status] || row.status}`,
      tone: 'gold',
      at: row.created_at,
      go: () => { setTab('incoming'); setOpenBook(row.id) },
    }))
    return [...listingRows, ...rentRows, ...inRows]
      .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
      .slice(0, 6)
  }, [myListings, myBookings, incoming])

  // Next handovers (confirmed) and returns (active) across both roles, soonest first
  const agenda = useMemo(() => {
    const rows = [
      ...myBookings.map((row) => ({ row, role: 'renter', tab: 'bookings' })),
      ...incoming.map((row) => ({ row, role: 'lister', tab: 'incoming' })),
    ]
    return rows
      .filter(({ row }) => ['confirmed', 'active'].includes(row.status))
      .map(({ row, role, tab: target }) => {
        const isReturn = row.status === 'active'
        const party = role === 'lister' ? row.renter : row.lister
        return {
          id: row.id,
          date: isReturn ? row.end_date : row.start_date,
          kind: isReturn ? 'Return due' : (row.delivery_type === 'delivery' ? 'Delivery' : 'Handover'),
          tone: isReturn ? 'is-gold' : 'is-cyan',
          title: row.listings?.title || 'Booking',
          sub: `${role === 'lister' ? 'Renting out to' : 'Renting from'} ${party?.full_name || (role === 'lister' ? 'renter' : 'host')}`,
          go: () => openBooking(target, row.id),
        }
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 4)
  }, [myBookings, incoming])

  // Per-listing performance from bookings on the user's own gear
  const listingStats = useMemo(() => {
    const map = {}
    incoming.forEach((row) => {
      const id = row.listing_id || row.listings?.id
      if (!id || row.status === 'cancelled') return
      map[id] = map[id] || { bookings: 0, earned: 0 }
      map[id].bookings += 1
      if (PAID_STATUSES.includes(row.status)) map[id].earned += bookingEarn(row)
    })
    return map
  }, [incoming])

  const rentedIds = useMemo(
    () => new Set(incoming.filter((row) => row.status === 'active').map((row) => row.listing_id || row.listings?.id)),
    [incoming]
  )

  const listCategories = useMemo(
    () => [...new Set(myListings.map((row) => row.subcategory || row.category).filter(Boolean))].sort(),
    [myListings]
  )

  const shownListings = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return filterListings(myListings, listFilter)
      .filter((row) => listCategory === 'all' || (row.subcategory || row.category) === listCategory)
      .filter((row) => !q || [row.title, row.subcategory, row.location].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort(LISTING_SORTS[listSort].fn)
  }, [myListings, listFilter, listCategory, listQuery, listSort])

  const avgDailyPrice = myListings.length
    ? Math.round(myListings.reduce((sum, row) => sum + Number(row.price_day || 0), 0) / myListings.length)
    : 0

  const referralRewards = walletState.entries
    .filter((row) => String(row.kind || '').startsWith('referral') && row.amount > 0)
    .reduce((sum, row) => sum + row.amount, 0)

  const paidIncoming = useMemo(() => incoming.filter((row) => PAID_STATUSES.includes(row.status)), [incoming])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('listings').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setMyListings((prev) => prev.filter((row) => row.id !== deleteTarget.id))
    setDeleteTarget(null)
    showToast(MESSAGES.listing.deleted, 'success')
  }

  const bumpStock = async (listing, delta) => {
    const nextQty = Math.max(0, (listing.stock_qty ?? 1) + delta)
    const nextTotal = Math.max(nextQty, listing.stock_total ?? nextQty)
    const { error } = await supabase
      .from('listings')
      .update({ stock_qty: nextQty, stock_total: nextTotal, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setMyListings((prev) => prev.map((row) => (
      row.id === listing.id ? { ...row, stock_qty: nextQty, stock_total: nextTotal } : row
    )))
    showToast(MESSAGES.listing.stockUpdated(nextQty, nextTotal), 'success')
  }

  const toggleListing = async (listing, field) => {
    const next = !listing[field]
    const { error } = await supabase
      .from('listings')
      .update({ [field]: next, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setMyListings((prev) => prev.map((row) => (
      row.id === listing.id ? { ...row, [field]: next } : row
    )))
    const msg = field === 'is_published'
      ? (next ? MESSAGES.listing.availabilityOn : MESSAGES.listing.availabilityOff)
      : (next ? MESSAGES.listing.availabilityOn : MESSAGES.listing.availabilityOff)
    showToast(msg, 'success')
  }

  const setBookingStatus = async (booking, status) => {
    if (status === 'cancelled') {
      const ok = await confirm({
        title: 'Cancel This Booking?',
        message: 'Are you sure you want to cancel this booking? Reserved dates will reopen on the calendar and unit stock will be restored.',
        confirmText: 'Yes, Cancel Booking',
        variant: 'danger',
      })
      if (!ok) return
    }
    // 1. Try secure RPC first (bypasses RLS mismatch, handles role permissions)
    let updatedOk = false
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_booking_status', {
        p_booking_id: booking.id,
        p_status: status,
      })
      if (!rpcErr) {
        if (rpcRes?.success) {
          updatedOk = true
        } else if (rpcRes?.error) {
          showToast(rpcRes.error, 'error')
          return
        }
      }
    } catch {
      /* proceed to direct table update fallback */
    }

    // 2. Direct table update fallback if RPC not present
    if (!updatedOk) {
      const { data: updated, error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', booking.id)
        .select('id')
      if (error) {
        showToast(error.message, 'error')
        return
      }
      if (!updated?.length) {
        showToast('Could not update booking status. Run migration SQL in Supabase.', 'error')
        return
      }
    }

    // Auto-return stock if booking is cancelled, declined, completed, or returned
    const listingId = booking.listing_id || booking.listings?.id
    if (['cancelled', 'declined', 'completed', 'returned'].includes(status) && listingId) {
      await adjustListingStock(listingId, 1)
      loadListings?.()
    }

    // Synchronize live tracking state
    try {
      if (status === 'confirmed') {
        await updateBookingTracking(booking.id, { tracking_status: 'confirmed' })
      } else if (status === 'active') {
        await updateBookingTracking(booking.id, { tracking_status: 'delivered', verified: true })
      } else if (status === 'completed') {
        await updateBookingTracking(booking.id, { tracking_status: 'completed' })
      }
    } catch (err) {
      console.warn('Sync tracking error:', err?.message)
    }

    const apply = (prev) => prev.map((row) => (row.id === booking.id ? { ...row, status } : row))
    setMyBookings(apply)
    setIncoming(apply)
    showToast(MESSAGES.booking.statusUpdated(status), 'success')
  }

  const handleExtendRental = async (booking) => {
    const extraDayRate = Number(booking.price_per_day || booking.listings?.price_day || 399)
    const nextEndDate = shiftIso(booking.end_date, 1)
    const nextDays = Number(booking.total_days || 1) + 1
    const nextSubtotal = Number(booking.subtotal || 0) + extraDayRate
    const nextTotal = Number(booking.total_amount || 0) + extraDayRate

    const ok = await confirm({
      title: 'Extend Rental by +1 Day?',
      message: `Extend "${booking.listings?.title || 'your gear'}" until ${nextEndDate} for +₹${extraDayRate.toLocaleString('en-IN')}?`,
      confirmText: `Extend (+₹${extraDayRate})`,
      variant: 'info',
    })
    if (!ok) return

    const { error } = await supabase
      .from('bookings')
      .update({
        end_date: nextEndDate,
        total_days: nextDays,
        subtotal: nextSubtotal,
        total_amount: nextTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    if (error) {
      showToast(error.message || 'Could not extend rental dates.', 'error')
      return
    }

    const patch = {
      end_date: nextEndDate,
      total_days: nextDays,
      subtotal: nextSubtotal,
      total_amount: nextTotal,
    }
    setMyBookings((prev) => prev.map((row) => (row.id === booking.id ? { ...row, ...patch } : row)))
    setIncoming((prev) => prev.map((row) => (row.id === booking.id ? { ...row, ...patch } : row)))
    showToast(`🎉 Rental extended to ${nextEndDate}! (+1 day added)`, 'success')
  }

  const allListingsPaused = myListings.length > 0 && myListings.every((l) => !l.is_available)

  const toggleVacationMode = async () => {
    if (!myListings.length) return
    const nextAvailable = allListingsPaused
    const inStockCount = myListings.filter((l) => l.stock_qty == null || l.stock_qty > 0).length
    const ok = await confirm({
      title: nextAvailable ? 'Resume In-Stock Listings?' : 'Pause All Listings (Vacation Mode)?',
      message: nextAvailable
        ? `Make your ${inStockCount} in-stock listing${inStockCount === 1 ? '' : 's'} bookable again right away? (Out-of-stock items will remain paused).`
        : `Temporarily pause new bookings across all ${myListings.length} of your listings while you're away? Existing bookings stay unaffected.`,
      confirmText: nextAvailable ? '⚡ Resume In-Stock Listings' : '🏖️ Enable Vacation Mode',
      variant: nextAvailable ? 'success' : 'warning',
    })
    if (!ok) return

    let dbQuery = supabase
      .from('listings')
      .update({ is_available: nextAvailable, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    if (nextAvailable) {
      dbQuery = dbQuery.or('stock_qty.is.null,stock_qty.gt.0')
    }

    const { error } = await dbQuery

    if (error) {
      showToast(error.message || 'Could not update listings.', 'error')
      return
    }
    setMyListings((prev) =>
      prev.map((row) => {
        if (!nextAvailable) return { ...row, is_available: false }
        if (row.stock_qty == null || row.stock_qty > 0) return { ...row, is_available: true }
        return row
      })
    )
    showToast(
      nextAvailable
        ? '⚡ Your in-stock listings are back live and open for bookings!'
        : '🏖️ Vacation Mode active — all your listings are paused until you resume.',
      'success'
    )
  }

  const handleHostQuickApprove = async (booking, openWhatsApp = false) => {
    await setBookingStatus(booking, 'confirmed')
    if (openWhatsApp) {
      const renterPhone = booking.renter?.phone
      if (renterPhone) {
        const pin = getHandoverPin(booking.id)
        const fin = parseBookingFinancials(booking)
        const { formatCustomerConfirmationMessage } = await import('../lib/whatsappSmsService')
        const text = formatCustomerConfirmationMessage({
          bookingId: booking.id,
          listing: booking.listings,
          renterName: booking.renter?.full_name,
          startDate: booking.start_date,
          endDate: booking.end_date,
          days: booking.total_days,
          subtotal: fin.subtotal,
          deliveryFee: fin.deliveryFee,
          deliveryDistanceKm: fin.deliveryDistanceKm,
          warehouseNote: fin.warehouseNote,
          deposit: fin.deposit,
          protectionAmount: fin.insuranceAmount,
          discountAmount: fin.discountAmount,
          walletAmount: fin.walletAmount,
          paidAmount: fin.paidAmount,
          total: fin.totalAmount,
          deliveryType: booking.delivery_type,
          deliveryAddress: booking.delivery_address,
          handoverPin: pin,
        })
        window.open(whatsappHref(renterPhone, text), '_blank', 'noopener,noreferrer')
      }
    }
  }

  const pendingIncomingRows = useMemo(
    () => incoming.filter((row) => row.status === 'pending'),
    [incoming]
  )

  const activeRenterBooking = useMemo(
    () => myBookings.find((row) => ['active', 'confirmed'].includes(row.status)),
    [myBookings]
  )

  const saveName = async () => {
    const next = nameVal.trim()
    if (!next) {
      showToast('Please enter a display name before saving.', 'error')
      return
    }
    setSaving(true)
    try {
      await updateProfile({ full_name: next })
      showToast(MESSAGES.profile.nameSaved, 'success')
      setEditName(false)
    } catch (err) {
      showToast(err.message || 'Could not update your display name.', 'error')
    }
    setSaving(false)
  }

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadAvatar(file)
      showToast(MESSAGES.profile.avatarUpdated, 'success')
    } catch (err) {
      showToast(err.message || 'Could not upload photo. Please try an image under 5 MB.', 'error')
    }
  }

  const jumpStat = (nextTab, filter) => {
    setTab(nextTab)
    if (filter) setBookFilter(filter)
    if (nextTab === 'listings' && filter) setListFilter(filter)
  }

  const openBooking = (nextTab, id) => {
    if (nextTab === 'bookings') setBookFilter('all')
    if (nextTab === 'incoming') setIncomingFilter('all')
    setTab(nextTab)
    setOpenBook(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const meta = TAB_META[tab]
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'My Account'

  return (
    <div className="dash">
      <div className="grid-floor" />
      <GameBackground />

      <div className="dash-wrap">
        <nav className="dash-crumbs" aria-label="Breadcrumb">
          <Home size={14} />
          {tab === 'overview' ? (
            <b>Dashboard</b>
          ) : (
            <>
              <button type="button" onClick={() => setTab('overview')}>Dashboard</button>
              <span aria-hidden="true">/</span>
              <b>{meta.label}</b>
            </>
          )}
        </nav>

        <header className="dash-head">
          <div>
            <h1>{meta.title}</h1>
            <p>{tab === 'overview' ? `${greeting()}, ${firstName(profile, user)}. ${meta.sub}` : meta.sub}</p>
          </div>
          <Link to="/contact" className="dash-btn"><HelpCircle size={16} /> Need help?</Link>
        </header>

        <section className="dash-profile">
          <label className="dash-avatar">
            <span className="dash-avatar__face">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" />
                : (profile?.full_name?.[0]?.toUpperCase() || <User size={20} />)}
            </span>
            <span className="dash-avatar__cam" aria-hidden="true"><Camera size={10} /></span>
            <input type="file" accept="image/*" onChange={handleAvatar} aria-label="Upload profile photo" />
          </label>

          {editName ? (
            <div className="dash-name-edit">
              <input
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                className="input-dark"
                aria-label="Your display name"
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                autoFocus
              />
              <button type="button" onClick={saveName} disabled={saving} className="dash-btn is-sm is-primary" aria-label="Save name">
                {saving ? '...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditName(false)} className="dash-btn is-sm" aria-label="Cancel name edit">Cancel</button>
            </div>
          ) : (
            <div className="dash-profile__id">
              <strong>{displayName}</strong>
              {profile?.kyc_status === 'verified' ? (
                <span className="dash-tag is-ok"><Shield size={11} /> Verified</span>
              ) : (
                <Link to="/kyc" className="dash-tag is-gold">
                  {profile?.kyc_status === 'submitted' ? 'KYC in review' : 'Complete KYC'}
                </Link>
              )}
              {profile?.rating > 0 ? (
                <span className="dash-tag is-gold"><Star size={11} /> {profile.rating}</span>
              ) : null}
            </div>
          )}

          <span className="dash-profile__sep" aria-hidden="true" />
          <span className="dash-profile__mail"><Mail size={14} /> {user?.email}</span>

          {!editName ? (
            <>
              <span className="dash-profile__sep" aria-hidden="true" />
              <button type="button" className="dash-link" onClick={() => setEditName(true)} aria-label="Edit display name">
                <Edit3 size={14} /> Edit profile
              </button>
            </>
          ) : null}

          <div className="dash-profile__end">
            <button
              type="button"
              className="dash-btn is-sm"
              onClick={() => { signOut(); navigate('/') }}
              aria-label="Sign out"
            >
              <LogOut size={13} /> Sign out
            </button>
            <button
              type="button"
              className="dash-btn is-sm is-quiet"
              onClick={() => setShowDeleteModal(true)}
              title="Delete account & personal data (GDPR / DPDP privacy)"
            >
              <Trash2 size={13} /> Delete account
            </button>
          </div>
        </section>

        {/* Stat row adapts to the tab: listing health, wallet money, or the account overview */}
        <div className="dash-stats">
          {tab === 'listings' ? (
            <>
              <StatCard key="l-total" icon={<Package size={20} />} label="Total Listings" value={myListings.length} tone="magenta"
                sub={`${listCategories.length} categor${listCategories.length === 1 ? 'y' : 'ies'}`}
                active={listFilter === 'all'} onClick={() => setListFilter('all')} />
              <StatCard key="l-live" icon={<CalendarCheck size={20} />} label="Available" value={liveListings} tone="green"
                sub="Live & bookable" active={listFilter === 'live'} onClick={() => setListFilter('live')} />
              <StatCard key="l-rented" icon={<Layers size={20} />} label="Rented" value={rentedIds.size} tone="cyan"
                sub="Out with renters now" onClick={() => { setTab('incoming'); setIncomingFilter('active') }} />
              <StatCard key="l-avg" icon={<Tag size={20} />} label="Avg. Daily Price" value={avgDailyPrice} prefix="₹" tone="gold"
                sub="Across all listings" />
            </>
          ) : tab === 'wallet' ? (
            <>
              <StatCard key="w-avail" icon={<Wallet size={20} />} label="Available Balance" value={walletState.wallet.available || 0} prefix="₹" tone="magenta"
                sub="Withdraw or spend on rentals" />
              <StatCard key="w-pending" icon={<Clock size={20} />} label="Pending Payout" value={walletState.wallet.pending || 0} prefix="₹" tone="gold"
                sub="Requested, being processed" />
              <StatCard key="w-life" icon={<TrendingUp size={20} />} label="Lifetime Earnings" value={earned} prefix="₹" tone="green"
                sub="From rentals of your gear" onClick={() => setTab('incoming')} />
              <StatCard key="w-ref" icon={<Gift size={20} />} label="Referral Rewards" value={referralRewards} prefix="₹" tone="cyan"
                sub={`${walletState.referrals.length} friend${walletState.referrals.length === 1 ? '' : 's'} invited`} />
            </>
          ) : (
            <>
              <StatCard
                key="o-listings"
                icon={<Package size={20} />}
                label="My Listings"
                value={myListings.length}
                tone="magenta"
                sub={`${liveListings} live`}
                onClick={() => jumpStat('listings')}
              />
              <StatCard
                key="o-bookings"
                icon={<Calendar size={20} />}
                label="Total Bookings"
                value={myBookings.length}
                tone="cyan"
                sub={`${completedBookings} completed`}
                active={tab === 'bookings'}
                onClick={() => jumpStat('bookings', 'all')}
              />
              <StatCard
                key="o-earned"
                icon={<TrendingUp size={20} />}
                label="Total Earnings"
                value={earned}
                prefix="₹"
                tone="gold"
                sub={walletState.wallet.available ? `₹${walletState.wallet.available} in wallet` : 'Wallet ready'}
                onClick={() => jumpStat('wallet')}
              />
              <StatCard
                key="o-incoming"
                icon={<Bell size={20} />}
                label="Incoming Requests"
                value={incoming.length}
                tone="green"
                sub={pendingIn ? `${pendingIn} need action` : 'None waiting'}
                active={tab === 'incoming'}
                onClick={() => { setTab('incoming'); setIncomingFilter(pendingIn ? 'pending' : 'all') }}
              />
            </>
          )}
        </div>

        <section className="dash-panel">
          <div className="dash-tabs" role="tablist" aria-label="Dashboard sections">
            {[
              { id: 'overview', label: 'Overview', icon: <LayoutGrid size={15} />, count: 0 },
              { id: 'listings', label: 'My Listings', icon: <Package size={15} />, count: myListings.length },
              { id: 'bookings', label: 'My Bookings', icon: <Calendar size={15} />, count: myBookings.length },
              { id: 'incoming', label: 'Incoming', icon: <Clock size={15} />, count: incoming.length, pulse: pendingIn > 0 },
              { id: 'wallet', label: 'Wallet', icon: <Wallet size={15} />, count: 0 },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`dash-tab${tab === item.id ? ' is-on' : ''}${item.pulse ? ' has-pulse' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.icon} {item.label}
                {item.count > 0 ? <span className="dash-tab__count">{item.count}</span> : null}
              </button>
            ))}
          </div>

          <div className="dash-panel__body" role="tabpanel">
            {tab === 'overview' && (
              <div className="dash-ov">
                <div className="dash-ov__main">
                  <PendingInbox
                    rows={pendingIncomingRows}
                    onApprove={handleHostQuickApprove}
                    onDecline={(req) => setBookingStatus(req, 'cancelled')}
                  />

                  {activeRenterBooking && (
                    <div className="dash-callout is-live">
                      <Thumb listing={activeRenterBooking.listings} size="lg" />
                      <div className="dash-callout__body">
                        <span className="dash-eyebrow">
                          {activeRenterBooking.status === 'active' ? '● Live session in progress' : 'Confirmed upcoming session'}
                        </span>
                        <h3>{activeRenterBooking.listings?.title || 'Your Rental'}</h3>
                        <p>
                          {fmtRange(activeRenterBooking)} ·{' '}
                          {activeRenterBooking.status === 'confirmed'
                            ? 'Share your handover OTP with the host/rider when receiving the gear.'
                            : 'Extend by +1 day in 1 tap, or use your return OTP when handing back.'}
                        </p>
                      </div>
                      <div className="dash-callout__acts">
                        <div className="dash-pin">
                          <span>{activeRenterBooking.status === 'confirmed' ? 'Handover OTP' : 'Return OTP'}</span>
                          <strong>
                            {activeRenterBooking.status === 'confirmed'
                              ? getHandoverPin(activeRenterBooking.id)
                              : getReturnPin(activeRenterBooking.id)}
                          </strong>
                        </div>
                        <button type="button" className="dash-btn is-sm is-gold is-solid" onClick={() => handleExtendRental(activeRenterBooking)}>
                          <Zap size={13} /> +1 day
                        </button>
                        <button type="button" className="dash-btn is-sm" onClick={() => openBooking('bookings', activeRenterBooking.id)}>
                          Open pass <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="dash-callout is-magenta is-hero">
                    <span className="dash-callout__icon"><Zap size={22} /></span>
                    <div className="dash-callout__body">
                      <span className="dash-eyebrow">Next up</span>
                      <h3>{nextUp.title}</h3>
                      <p>{nextUp.sub}</p>
                    </div>
                    {nextUp.href ? (
                      <Link to={nextUp.href} className="dash-btn is-primary">{nextUp.cta} <ChevronRight size={15} /></Link>
                    ) : (
                      <button type="button" className="dash-btn is-primary" onClick={nextUp.go}>{nextUp.cta} <ChevronRight size={15} /></button>
                    )}
                  </div>

                  {agenda.length > 0 && (
                    <div className="dash-card">
                      <div className="dash-card__head is-cyan">
                        <h3><CalendarCheck size={15} /> Upcoming handovers &amp; returns</h3>
                      </div>
                      <div className="dash-agenda">
                        {agenda.map((item) => {
                          const d = new Date(`${item.date}T00:00:00`)
                          return (
                            <button key={item.id} type="button" className={`dash-agenda__row ${item.tone}`} onClick={item.go}>
                              <span className="dash-agenda__date">
                                <b>{d.getDate() || '–'}</b>
                                <span>{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
                              </span>
                              <span className="dash-item__body">
                                <strong>{item.title}</strong>
                                <span>{item.sub}</span>
                              </span>
                              <span className="dash-agenda__meta">
                                <span className={`dash-tag ${item.tone}`}>{item.kind}</span>
                                <small>{relDay(item.date)}</small>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="dash-card">
                    <div className="dash-card__head is-cyan">
                      <h3><Calendar size={15} /> Recent bookings</h3>
                      {myBookings.length > 0 ? (
                        <button type="button" className="dash-link" onClick={() => setTab('bookings')}>View all <ChevronRight size={13} /></button>
                      ) : null}
                    </div>
                    {loadingB ? (
                      <div className="dash-rows"><div className="dash-skel" /><div className="dash-skel" /></div>
                    ) : myBookings.length === 0 ? (
                      <EmptyBlock emoji="📅" title="No bookings yet" body="Find gear across Bengaluru & Gurugram." to="/browse" cta="Browse gear" />
                    ) : (
                      <div className="dash-rows">
                        {myBookings.slice(0, 3).map((booking) => (
                          <BookingRow key={booking.id} booking={booking} role="renter" needsReview={booking.status === 'completed' && !reviewIndex[booking.id]?.mine} onSelect={() => openBooking('bookings', booking.id)} />
                        ))}
                      </div>
                    )}
                  </div>

                  {incoming.length > 0 && (
                    <div className="dash-card">
                      <div className="dash-card__head is-green">
                        <h3><Clock size={15} /> Incoming on your gear</h3>
                        <button type="button" className="dash-link" onClick={() => setTab('incoming')}>View all <ChevronRight size={13} /></button>
                      </div>
                      {loadingIn ? (
                        <div className="dash-rows"><div className="dash-skel" /><div className="dash-skel" /></div>
                      ) : (
                        <div className="dash-rows">
                          {incoming.slice(0, 3).map((booking) => (
                            <BookingRow key={booking.id} booking={booking} role="lister" needsReview={booking.status === 'completed' && !reviewIndex[booking.id]?.mine} onSelect={() => openBooking('incoming', booking.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <aside className="dash-ov__side">
                  <div className="dash-card">
                    <div className="dash-card__head is-green">
                      <h3><Check size={15} /> {setupDone === checks.length ? 'All set' : 'Get set up'}</h3>
                      <span className="dash-ov__count">{setupDone}/{checks.length}</span>
                    </div>
                    <div className="dash-meter is-green" role="progressbar" aria-valuemin={0} aria-valuemax={checks.length} aria-valuenow={setupDone}>
                      <span style={{ width: `${(setupDone / checks.length) * 100}%` }} />
                    </div>
                    <div className="dash-list dash-ov__checks">
                      {checks.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          className={`dash-item${item.done ? ' is-done' : ''}`}
                          onClick={item.go}
                        >
                          <span className="dash-item__icon is-check">{item.done ? <Check size={12} /> : null}</span>
                          <span className="dash-item__body">
                            <strong>{item.title}</strong>
                            <span>{item.sub}</span>
                          </span>
                          {item.done ? null : <ChevronRight size={15} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dash-card">
                    <div className="dash-card__head"><h3><Zap size={15} /> Quick actions</h3></div>
                    <div className="dash-tiles">
                      {[
                        { to: '/list-item', icon: <Plus size={18} />, label: 'List gear', desc: 'Earn from idle gear', tone: 'magenta' },
                        { to: '/browse', icon: <Eye size={18} />, label: 'Browse', desc: 'Find gear', tone: 'cyan' },
                        { to: '/terms#damage', icon: <Shield size={18} />, label: 'Damage policy', desc: 'Before you rent', tone: 'gold' },
                        isAdmin
                          ? { to: '/admin', icon: <Shield size={18} />, label: 'Admin', desc: 'Users, payouts', tone: 'green' }
                          : { to: '/contact', icon: <HelpCircle size={18} />, label: 'Support', desc: 'We reply fast', tone: 'green' },
                      ].map((item) => (
                        <Link key={item.to} to={item.to} className={`dash-tile is-${item.tone}`}>
                          <span className="dash-item__icon">{item.icon}</span>
                          <strong>{item.label}</strong>
                          <span>{item.desc}</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="dash-card">
                    <div className="dash-card__head">
                      <h3><Package size={15} /> Your listings</h3>
                      {myListings.length > 0 ? (
                        <button type="button" className="dash-link" onClick={() => setTab('listings')}>Manage <ChevronRight size={13} /></button>
                      ) : null}
                    </div>
                    {loadingL ? (
                      <div className="dash-rows"><div className="dash-skel" /><div className="dash-skel" /></div>
                    ) : myListings.length === 0 ? (
                      <EmptyBlock emoji="📦" title="No listings yet" body="List your first item." to="/list-item" cta="+ List item" />
                    ) : (
                      <div className="dash-list">
                        {myListings.slice(0, 3).map((listing) => {
                          const state = listingState(listing, rentedIds.has(listing.id))
                          return (
                            <button
                              key={listing.id}
                              type="button"
                              className="dash-item"
                              onClick={() => navigate(`/listing/${listing.id}`)}
                              aria-label={`Open ${listing.title}`}
                            >
                              <Thumb listing={listing} size="sm" />
                              <span className="dash-item__body">
                                <strong>{listing.title}</strong>
                                <span>{rupee(listing.price_day)}/day · {(listingStats[listing.id]?.bookings || 0)} bookings</span>
                              </span>
                              <span className={`dash-tag ${state.tone}`}>{state.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="dash-card">
                    <div className="dash-card__head is-cyan"><h3><Clock size={15} /> Activity</h3></div>
                    {activity.length === 0 ? (
                      <EmptyBlock emoji="⚡️" title="Quiet so far" body="List or book to fill this feed." />
                    ) : (
                      <ol className="dash-timeline">
                        {activity.map((row) => (
                          <li key={row.id}>
                            <button type="button" className={`dash-timeline__row is-${row.tone}`} onClick={row.go}>
                              <span className="dash-timeline__dot" aria-hidden="true" />
                              <span className="dash-item__body">
                                <strong>{row.title}</strong>
                                <span>{row.sub}</span>
                              </span>
                              <time dateTime={row.at}>{timeAgo(row.at)}</time>
                            </button>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </aside>
              </div>
            )}

            {tab === 'listings' && (
              <>
                <div className="dash-toolbar">
                  <div className="dash-search">
                    <Search size={15} />
                    <input
                      type="search"
                      value={listQuery}
                      onChange={(e) => setListQuery(e.target.value)}
                      placeholder="Search your listings…"
                      aria-label="Search your listings"
                    />
                    {listQuery ? (
                      <button type="button" onClick={() => setListQuery('')} aria-label="Clear search"><X size={14} /></button>
                    ) : null}
                  </div>
                  <select className="dash-select" value={listCategory} onChange={(e) => setListCategory(e.target.value)} aria-label="Filter by category">
                    <option value="all">All categories</option>
                    {listCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <select className="dash-select" value={listFilter} onChange={(e) => setListFilter(e.target.value)} aria-label="Filter by status">
                    {LISTING_STATUS_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                  </select>
                  <select className="dash-select" value={listSort} onChange={(e) => setListSort(e.target.value)} aria-label="Sort listings">
                    {Object.entries(LISTING_SORTS).map(([id, opt]) => <option key={id} value={id}>Sort: {opt.label}</option>)}
                  </select>
                  <div className="dash-toolbar__end">
                    {myListings.length > 0 && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={allListingsPaused}
                        className={`dash-switch${allListingsPaused ? ' is-on' : ''}`}
                        onClick={toggleVacationMode}
                        title="Pause new bookings on all listings while you're away"
                      >
                        <span className="dash-switch__track" aria-hidden="true"><span /></span>
                        Vacation mode
                      </button>
                    )}
                    <Link to="/list-item" className="dash-btn is-primary"><Plus size={15} /> New listing</Link>
                  </div>
                </div>

                <p className="dash-toolbar__count">
                  {shownListings.length} listing{shownListings.length === 1 ? '' : 's'}
                  {shownListings.length !== myListings.length ? ` of ${myListings.length}` : ''}
                </p>

                {loadingL ? (
                  <div className="dash-listings">
                    {[1, 2, 3].map((n) => <div key={n} className="dash-skel is-card" />)}
                  </div>
                ) : myListings.length === 0 ? (
                  <EmptyBlock large emoji="📦" title="No listings yet" body="Put your idle console or instrument to work." to="/list-item" cta="+ List Your First Item" />
                ) : shownListings.length === 0 ? (
                  <EmptyBlock emoji="🔍" title="No matches" body="Try another category, status or search term." />
                ) : (
                  <div className="dash-listings">
                    {shownListings.map((listing) => (
                      <OwnerListingCard
                        key={listing.id}
                        listing={listing}
                        stats={listingStats[listing.id] || { bookings: 0, earned: 0 }}
                        rented={rentedIds.has(listing.id)}
                        onToggle={toggleListing}
                        onStock={bumpStock}
                        onDelete={setDeleteTarget}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'bookings' && (
              <BookingsPanel
                rows={myBookings}
                role="renter"
                loading={loadingB}
                filter={bookFilter}
                onFilter={setBookFilter}
                selectedId={openBook}
                onSelect={setOpenBook}
                onStatus={setBookingStatus}
                onExtendRental={handleExtendRental}
                reviewIndex={reviewIndex}
                empty={<EmptyBlock large emoji="📅" title="No bookings yet" body="Browse gear across Bengaluru & Gurugram." to="/browse" cta="Browse Listings" />}
              />
            )}

            {tab === 'incoming' && (
              <>
                <PendingInbox
                  rows={pendingIncomingRows}
                  onApprove={handleHostQuickApprove}
                  onDecline={(req) => setBookingStatus(req, 'cancelled')}
                />
                <BookingsPanel
                  rows={incoming}
                  role="lister"
                  loading={loadingIn}
                  filter={incomingFilter}
                  onFilter={setIncomingFilter}
                  selectedId={openBook}
                  onSelect={setOpenBook}
                  onStatus={setBookingStatus}
                  reviewIndex={reviewIndex}
                  empty={<EmptyBlock large emoji="📥" title="No incoming bookings" body="Renters who book your gear show up here." />}
                />
              </>
            )}

            {tab === 'wallet' && (
              <DashboardWallet
                earnings={paidIncoming}
                wallet={walletState.wallet}
                entries={walletState.entries}
                referrals={walletState.referrals}
                code={walletState.code}
                loading={walletState.loading}
                onRefresh={walletState.refresh}
              />
            )}
          </div>
        </section>
      </div>

      <DeleteModal
        listing={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {showDeleteModal && (
        <AccountDeletionModal
          user={user}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
