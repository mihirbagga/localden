import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, Star, Shield, Edit3, Plus, Trash2, Eye,
  Package, Calendar, TrendingUp, Clock, Camera, LogOut,
  ChevronRight, X, Check, Minus,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import './dashboard.css'

const TABS = ['overview', 'listings', 'bookings', 'incoming']
const BOOKING_SELECT = '*, listings(id, title, emoji, category, location)'
const LISTING_SELECT = '*, profiles(full_name, rating, kyc_status)'
const PAID_STATUSES = ['confirmed', 'active', 'completed']
const STATUS_CHIPS = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled']
const LISTING_CHIPS = ['all', 'live', 'hidden', 'low']

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Done',
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

function bookingEarn(booking) {
  if (booking.subtotal != null) return Number(booking.subtotal)
  return Math.max(0, Number(booking.total_amount || 0) - Number(booking.deposit || 0))
}

function listingTone(listing) {
  if (listing.is_published === false) return { label: 'Hidden', cls: 'is-off' }
  if (listing.is_available) return { label: `Live · ${listing.stock_qty ?? 1}`, cls: 'is-live' }
  return { label: 'Off', cls: 'is-off' }
}

function filterBookings(rows, status) {
  if (status === 'all') return rows
  return rows.filter((row) => row.status === status)
}

function filterListings(rows, chip) {
  if (chip === 'live') return rows.filter((row) => row.is_published !== false && row.is_available)
  if (chip === 'hidden') return rows.filter((row) => row.is_published === false)
  if (chip === 'low') return rows.filter((row) => (row.stock_qty ?? 1) <= 1)
  return rows
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
  return (
    <button
      type="button"
      className={`dash-stat is-${tone}${active ? ' is-on' : ''}`}
      onClick={onClick}
      aria-label={`${label}: ${prefix}${value}`}
      aria-pressed={active}
    >
      <div className="dash-stat__icon">{icon}</div>
      <div className="dash-stat__val">
        {typeof value === 'number' ? <Counter end={value} prefix={prefix} /> : value}
      </div>
      <div className="dash-stat__label">{label}</div>
      {sub ? <div className="dash-stat__sub">{sub}</div> : null}
    </button>
  )
}

function BookingCard({ booking, role, open, onToggle, onStatus }) {
  const listing = booking.listings
  const listingId = listing?.id
  const status = booking.status || 'pending'
  const days = daysUntil(booking.start_date)
  let when = `${booking.start_date} → ${booking.end_date}`
  if (days === 0) when = 'Starts today'
  if (days === 1) when = 'Starts tomorrow'
  if (days > 1 && days < 14) when = `Starts in ${days} days`
  if (days < 0 && status === 'active') when = 'Happening now'
  if (days < 0 && status === 'completed') when = 'Returned'

  const listerActs = role === 'lister'
  const renterActs = role === 'renter'

  return (
    <div className={`dash-book${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="dash-book__top"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${listing?.title || 'Booking'} ${STATUS_LABEL[status] || status}`}
      >
        <div className="dash-book__emoji">{listing?.emoji || '🎮'}</div>
        <div className="dash-book__body">
          <strong>{listing?.title || 'Listing'}</strong>
          <span>{when} · {booking.total_days} day{booking.total_days === 1 ? '' : 's'}</span>
        </div>
        <div className="dash-book__money">
          <b>{rupee(booking.total_amount)}</b>
          <span className={`dash-status is-${status}`}>{STATUS_LABEL[status] || status}</span>
        </div>
      </button>

      {open ? (
        <div className="dash-book__more">
          <div className="dash-book__facts">
            <div>
              <span>Pay</span>
              <b>{booking.payment_method || '—'} · {booking.payment_status || 'pending'}</b>
            </div>
            <div>
              <span>Deposit</span>
              <b>{rupee(booking.deposit)}</b>
            </div>
            <div>
              <span>Rent</span>
              <b>{rupee(bookingEarn(booking))}</b>
            </div>
            <div>
              <span>Handover</span>
              <b>{booking.delivery_type || 'pickup'}</b>
            </div>
          </div>
          <div className="dash-book__acts">
            {listingId ? (
              <Link to={`/listing/${listingId}`} className="is-cyan">Open listing</Link>
            ) : null}
            {listerActs && status === 'pending' ? (
              <>
                <button type="button" className="is-ok" onClick={() => onStatus(booking, 'confirmed')} aria-label="Confirm booking">Confirm</button>
                <button type="button" className="is-danger" onClick={() => onStatus(booking, 'cancelled')} aria-label="Decline booking">Decline</button>
              </>
            ) : null}
            {listerActs && status === 'confirmed' ? (
              <button type="button" className="is-ok" onClick={() => onStatus(booking, 'active')} aria-label="Mark booking active">Mark handed over</button>
            ) : null}
            {listerActs && status === 'active' ? (
              <button type="button" className="is-ok" onClick={() => onStatus(booking, 'completed')} aria-label="Mark booking complete">Mark returned</button>
            ) : null}
            {renterActs && status === 'pending' ? (
              <button type="button" className="is-danger" onClick={() => onStatus(booking, 'cancelled')} aria-label="Cancel booking">Cancel request</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EmptyBlock({ emoji, title, body, to, cta, large }) {
  return (
    <div className={`dash-empty${large ? ' is-lg' : ''}`}>
      <div className="dash-empty__emoji" aria-hidden="true">{emoji}</div>
      <h3 className="font-bungee text-white text-xl">{title}</h3>
      <p>{body}</p>
      {to && cta ? <Link to={to} className="btn-primary">{cta}</Link> : null}
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, signOut, updateProfile, uploadAvatar, isAdmin } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'overview'
  const [path, setPath] = useState('rent')
  const [bookFilter, setBookFilter] = useState('all')
  const [listFilter, setListFilter] = useState('all')
  const [openBook, setOpenBook] = useState(null)

  const [myListings, setMyListings] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [incoming, setIncoming] = useState([])
  const [loadingL, setLoadingL] = useState(true)
  const [loadingB, setLoadingB] = useState(true)
  const [loadingIn, setLoadingIn] = useState(true)
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

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

  useEffect(() => {
    if (!user) return undefined
    loadListings()
    loadBookings()
    loadIncoming()

    const channel = supabase
      .channel(`dash-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `renter_id=eq.${user.id}` }, loadBookings)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `lister_id=eq.${user.id}` }, loadIncoming)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings', filter: `user_id=eq.${user.id}` }, loadListings)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const liveListings = myListings.filter((row) => row.is_available && row.is_published !== false).length
  const pendingIn = incoming.filter((row) => row.status === 'pending').length
  const completedBookings = myBookings.filter((row) => row.status === 'completed').length
  const earned = incoming.filter((row) => PAID_STATUSES.includes(row.status)).reduce((sum, row) => sum + bookingEarn(row), 0)

  const nextUp = useMemo(() => {
    if (pendingIn > 0) {
      return {
        title: `${pendingIn} booking${pendingIn === 1 ? '' : 's'} waiting`,
        sub: 'Confirm or decline so the renter is not stuck.',
        cta: 'Review incoming',
        go: () => { setTab('incoming'); setBookFilter('pending') },
      }
    }
    const pipeline = [...myBookings, ...incoming]
      .filter((row) => ['confirmed', 'active'].includes(row.status))
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0]
    if (pipeline) {
      const days = daysUntil(pipeline.start_date)
      const title = pipeline.listings?.title || 'Booking'
      let sub = `${pipeline.start_date} → ${pipeline.end_date}`
      if (days === 0) sub = 'Handover is today. Snap photos.'
      else if (days === 1) sub = 'Tomorrow. Confirm pickup point.'
      else if (days > 1) sub = `In ${days} days. Keep phone on.`
      return {
        title,
        sub,
        cta: 'Open booking',
        go: () => {
          setTab(pipeline.renter_id === user?.id ? 'bookings' : 'incoming')
          setOpenBook(pipeline.id)
        },
      }
    }
    if (myListings.length === 0) {
      return { title: 'Idle gear earns nothing', sub: 'List a console or guitar. 5 minutes.', cta: 'List gear', href: '/list-item' }
    }
    if (myBookings.length === 0) {
      return { title: 'No rentals yet', sub: 'Browse Bangalore gear for this weekend.', cta: 'Browse', href: '/browse' }
    }
    return { title: 'All quiet', sub: 'Nothing urgent. Browse or list another item.', cta: 'Browse', href: '/browse' }
  }, [pendingIn, myBookings, incoming, myListings.length, user?.id])

  const checks = [
    {
      done: profile?.kyc_status === 'verified',
      title: 'KYC verified',
      sub: profile?.kyc_status === 'verified' ? 'You look legit' : 'Admin verifies you. Contact support to start.',
      go: () => navigate('/contact'),
    },
    {
      done: myListings.length > 0,
      title: 'First listing live',
      sub: myListings.length ? `${myListings.length} on your shelf` : 'List gear and start earning',
      go: () => (myListings.length ? setTab('listings') : navigate('/list-item')),
    },
    {
      done: myBookings.length + incoming.length > 0,
      title: 'First booking',
      sub: myBookings.length + incoming.length ? 'You are in the game' : 'Rent something or wait for a ping',
      go: () => setTab(incoming.length ? 'incoming' : 'bookings'),
    },
  ]

  const activity = useMemo(() => {
    const listingRows = myListings.slice(0, 4).map((row) => ({
      id: `l-${row.id}`,
      title: row.title,
      sub: `Listed · ${row.location || 'Bangalore'}`,
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

  const shownListings = filterListings(myListings, listFilter)
  const shownBooks = filterBookings(myBookings, bookFilter)
  const shownIncoming = filterBookings(incoming, bookFilter)

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
    showToast('Listing deleted', 'success')
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
    showToast(`Stock is now ${nextQty}`, 'success')
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
      ? (next ? 'Listing is public' : 'Listing hidden')
      : (next ? 'Marked available' : 'Marked unavailable')
    showToast(msg, 'success')
  }

  const setBookingStatus = async (booking, status) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', booking.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    const apply = (prev) => prev.map((row) => (row.id === booking.id ? { ...row, status } : row))
    setMyBookings(apply)
    setIncoming(apply)
    showToast(`Booking ${STATUS_LABEL[status] || status}`, 'success')
  }

  const saveName = async () => {
    const next = nameVal.trim()
    if (!next) {
      showToast('Name cannot be empty', 'error')
      return
    }
    setSaving(true)
    try {
      await updateProfile({ full_name: next })
      showToast('Name saved', 'success')
      setEditName(false)
    } catch (err) {
      showToast(err.message || 'Could not save name', 'error')
    }
    setSaving(false)
  }

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadAvatar(file)
      showToast('Photo updated', 'success')
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error')
    }
  }

  const jumpStat = (nextTab, filter) => {
    setTab(nextTab)
    if (filter) setBookFilter(filter)
    if (nextTab === 'listings' && filter) setListFilter(filter)
  }

  return (
    <div className="dash">
      <div className="grid-floor" />
      <GameBackground />

      <div className="dash-wrap">
        <header className="dash-hello">
          <h1>{greeting()}, {firstName(profile, user)}</h1>
          <p>Tap a stat. Expand a booking. Confirm, hide, or bump stock without leaving this page.</p>
        </header>

        <section className="dash-profile">
          <label className="dash-avatar">
            <div className="dash-avatar__face">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" />
                : (profile?.full_name?.[0]?.toUpperCase() || <User size={28} />)}
            </div>
            <span className="dash-avatar__cam" aria-hidden="true"><Camera size={12} /></span>
            <input type="file" accept="image/*" onChange={handleAvatar} aria-label="Upload profile photo" />
          </label>

          <div className="dash-profile__body">
            {editName ? (
              <div className="dash-name-edit">
                <input
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="input-dark"
                  aria-label="Your display name"
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                />
                <button type="button" onClick={saveName} disabled={saving} className="btn-primary" aria-label="Save name">
                  {saving ? '...' : 'Save'}
                </button>
                <button type="button" onClick={() => setEditName(false)} className="btn-outline" aria-label="Cancel name edit">Cancel</button>
              </div>
            ) : (
              <div className="dash-name-row">
                <h2>{profile?.full_name || user?.email?.split('@')[0] || 'My Account'}</h2>
                <button type="button" className="dash-icon-btn" onClick={() => setEditName(true)} aria-label="Edit display name">
                  <Edit3 size={14} />
                </button>
              </div>
            )}
            <div className="dash-meta">
              <span>{user?.email}</span>
              {profile?.kyc_status === 'verified' ? (
                <span className="dash-pill is-ok"><Shield size={11} /> Verified</span>
              ) : (
                <Link to="/contact" className="dash-pill is-warn">Complete KYC</Link>
              )}
              {profile?.rating > 0 ? (
                <span className="dash-pill is-gold"><Star size={11} /> {profile.rating}</span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="btn-outline"
            onClick={() => { signOut(); navigate('/') }}
            aria-label="Sign out"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </section>

        <div className="dash-stats">
          <StatCard
            icon={<Package size={18} />}
            label="My Listings"
            value={myListings.length}
            tone="magenta"
            sub={`${liveListings} live`}
            active={tab === 'listings'}
            onClick={() => jumpStat('listings')}
          />
          <StatCard
            icon={<Calendar size={18} />}
            label="Bookings Made"
            value={myBookings.length}
            tone="cyan"
            sub={`${completedBookings} completed`}
            active={tab === 'bookings'}
            onClick={() => jumpStat('bookings')}
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Earnings"
            value={earned}
            prefix="₹"
            tone="gold"
            sub="confirmed + done"
            active={tab === 'incoming'}
            onClick={() => jumpStat('incoming', 'all')}
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Incoming"
            value={incoming.length}
            tone="green"
            sub={pendingIn ? `${pendingIn} need action` : 'none waiting'}
            active={tab === 'incoming'}
            onClick={() => jumpStat('incoming', pendingIn ? 'pending' : 'all')}
          />
        </div>

        <div className="dash-tabs" role="tablist" aria-label="Dashboard sections">
          {[
            { id: 'overview', label: 'Overview', icon: <User size={14} />, count: 0 },
            { id: 'listings', label: 'My Listings', icon: <Package size={14} />, count: myListings.length },
            { id: 'bookings', label: 'My Bookings', icon: <Calendar size={14} />, count: myBookings.length },
            { id: 'incoming', label: 'Incoming', icon: <Clock size={14} />, count: incoming.length, pulse: pendingIn > 0 },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-label={item.label}
              className={`dash-tab${tab === item.id ? ' is-on' : ''}${item.pulse ? ' has-pulse' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.icon} {item.label}
              {item.count > 0 ? <span className="dash-tab__count">{item.count}</span> : null}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            <div className="dash-paths" role="tablist" aria-label="Dashboard focus">
              <button
                type="button"
                className={`dash-path is-rent${path === 'rent' ? ' is-on' : ''}`}
                aria-selected={path === 'rent'}
                onClick={() => setPath('rent')}
              >
                <strong>I rent gear</strong>
                <span>Bookings, KYC, weekend plans</span>
              </button>
              <button
                type="button"
                className={`dash-path is-earn${path === 'earn' ? ' is-on' : ''}`}
                aria-selected={path === 'earn'}
                onClick={() => setPath('earn')}
              >
                <strong>I earn from gear</strong>
                <span>Listings, incoming, payouts</span>
              </button>
            </div>

            <div className="dash-next">
              <div>
                <strong>NEXT UP</strong>
                <p>{nextUp.title}</p>
                <span>{nextUp.sub}</span>
              </div>
              {nextUp.href ? (
                <Link to={nextUp.href} className="btn-primary">{nextUp.cta}</Link>
              ) : (
                <button type="button" className="btn-primary" onClick={nextUp.go} aria-label={nextUp.cta}>
                  {nextUp.cta}
                </button>
              )}
            </div>

            <div className="dash-grid">
              <div className="dash-card">
                <div className="dash-card__head"><h3>QUICK ACTIONS</h3></div>
                {[
                  { to: '/list-item', icon: <Plus size={16} />, label: 'List a new item', desc: 'Earn from idle gear', tone: 'magenta' },
                  { to: '/browse', icon: <Eye size={16} />, label: 'Browse listings', desc: 'Find gear this weekend', tone: 'cyan' },
                  { to: '/terms#damage', icon: <Shield size={16} />, label: 'Damage policy', desc: 'Read before you rent', tone: 'gold' },
                  isAdmin && { to: '/admin', icon: <Shield size={16} />, label: 'Admin panel', desc: 'Users, stock, payouts', tone: 'green' },
                ].filter(Boolean).map((item) => (
                  <Link key={item.to} to={item.to} className="dash-action">
                    <div className={`dash-action__icon is-${item.tone}`}>{item.icon}</div>
                    <div className="flex-1">
                      <strong>{item.label}</strong>
                      <span>{item.desc}</span>
                    </div>
                    <ChevronRight size={14} />
                  </Link>
                ))}
              </div>

              <div className="dash-card">
                <div className="dash-card__head"><h3>SETUP</h3></div>
                {checks.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className={`dash-check${item.done ? ' is-done' : ''}`}
                    onClick={item.go}
                    aria-label={item.title}
                  >
                    <span className="dash-check__box">{item.done ? <Check size={12} /> : null}</span>
                    <span>
                      <strong>{item.title}</strong>
                      <span>{item.sub}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="dash-card">
                <div className="dash-card__head">
                  <h3>{path === 'earn' ? 'YOUR GEAR' : 'RECENT LISTINGS'}</h3>
                  <button type="button" className="dash-ghost" onClick={() => setTab('listings')} aria-label="View all listings">View all</button>
                </div>
                {loadingL ? (
                  <><div className="dash-skel" /><div className="dash-skel" /></>
                ) : myListings.length === 0 ? (
                  <EmptyBlock emoji="📦" title="No listings yet" body="List your first item." to="/list-item" cta="+ List item" />
                ) : (
                  myListings.slice(0, 3).map((listing) => {
                    const tone = listingTone(listing)
                    return (
                      <button
                        key={listing.id}
                        type="button"
                        className="dash-mini"
                        onClick={() => navigate(`/listing/${listing.id}`)}
                        aria-label={`Open ${listing.title}`}
                      >
                        <span className="dash-mini__emoji" aria-hidden="true">{listing.emoji}</span>
                        <span className="flex-1 min-w-0">
                          <strong>{listing.title}</strong>
                          <span>{rupee(listing.price_day)}/day · {listing.location}</span>
                        </span>
                        <span className={`dash-status ${tone.cls === 'is-live' ? 'is-active' : 'is-pending'}`}>{tone.label}</span>
                      </button>
                    )
                  })
                )}
              </div>

              <div className="dash-card">
                <div className="dash-card__head is-cyan"><h3>ACTIVITY</h3></div>
                {activity.length === 0 ? (
                  <EmptyBlock emoji="⚡️" title="Quiet so far" body="List or book to fill this feed." />
                ) : (
                  <div className="dash-feed">
                    {activity.map((row) => (
                      <button key={row.id} type="button" className="dash-feed__row" onClick={row.go} aria-label={row.title}>
                        <span className={`dash-feed__dot is-${row.tone}`} />
                        <span>
                          <strong>{row.title}</strong>
                          <span>{row.sub}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="dash-card dash-span-2">
                <div className="dash-card__head is-cyan">
                  <h3>{path === 'earn' ? 'INCOMING' : 'YOUR BOOKINGS'}</h3>
                  <button
                    type="button"
                    className="dash-ghost"
                    onClick={() => setTab(path === 'earn' ? 'incoming' : 'bookings')}
                    aria-label="View all bookings"
                  >
                    View all
                  </button>
                </div>
                {path === 'earn' ? (
                  loadingIn ? <><div className="dash-skel" /><div className="dash-skel" /></> : (
                    incoming.length === 0
                      ? <EmptyBlock emoji="📥" title="No incoming yet" body="Renters who book your gear land here." />
                      : incoming.slice(0, 3).map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          role="lister"
                          open={openBook === booking.id}
                          onToggle={() => setOpenBook(openBook === booking.id ? null : booking.id)}
                          onStatus={setBookingStatus}
                        />
                      ))
                  )
                ) : (
                  loadingB ? <><div className="dash-skel" /><div className="dash-skel" /></> : (
                    myBookings.length === 0
                      ? <EmptyBlock emoji="📅" title="No bookings yet" body="Find gear across Bangalore." to="/browse" cta="Browse gear" />
                      : myBookings.slice(0, 3).map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          role="renter"
                          open={openBook === booking.id}
                          onToggle={() => setOpenBook(openBook === booking.id ? null : booking.id)}
                          onStatus={setBookingStatus}
                        />
                      ))
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'listings' && (
          <div>
            <div className="dash-toolbar">
              <p>{shownListings.length} listing{shownListings.length === 1 ? '' : 's'}</p>
              <div className="dash-chips" role="group" aria-label="Filter listings">
                {LISTING_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`dash-chip${listFilter === chip ? ' is-on' : ''}`}
                    onClick={() => setListFilter(chip)}
                    aria-pressed={listFilter === chip}
                    aria-label={`Filter listings ${chip}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <Link to="/list-item" className="btn-primary"><Plus size={14} /> New Listing</Link>
            </div>

            {loadingL ? (
              <div className="dash-listings">
                {[1, 2, 3].map((n) => <div key={n} className="dash-skel is-card" />)}
              </div>
            ) : shownListings.length === 0 ? (
              <EmptyBlock large emoji="📦" title="No listings here" body="List gear or change the filter." to="/list-item" cta="+ List Your First Item" />
            ) : (
              <div className="dash-listings">
                {shownListings.map((listing) => {
                  const published = listing.is_published !== false
                  return (
                    <div key={listing.id} className="dash-own">
                      <ListingCard listing={listing} />
                      <div className="dash-own__bar">
                        <Link to={`/listing/${listing.id}`} className="is-view" aria-label={`View ${listing.title}`}>
                          <Eye size={12} /> View
                        </Link>
                        <button
                          type="button"
                          className={published ? 'is-live' : 'is-off'}
                          onClick={() => toggleListing(listing, 'is_published')}
                          aria-label={published ? `Hide ${listing.title}` : `Publish ${listing.title}`}
                        >
                          {published ? 'Hide' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => bumpStock(listing, -1)}
                          aria-label={`Decrease stock for ${listing.title}`}
                        >
                          <Minus size={12} /> {listing.stock_qty ?? 1}
                        </button>
                        <button
                          type="button"
                          onClick={() => bumpStock(listing, 1)}
                          aria-label={`Increase stock for ${listing.title}`}
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => setDeleteTarget(listing)}
                          aria-label={`Delete ${listing.title}`}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'bookings' && (
          <div>
            <div className="dash-toolbar">
              <p>{shownBooks.length} as renter</p>
              <div className="dash-chips" role="group" aria-label="Filter bookings">
                {STATUS_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`dash-chip${bookFilter === chip ? ' is-on' : ''}`}
                    onClick={() => setBookFilter(chip)}
                    aria-pressed={bookFilter === chip}
                    aria-label={`Filter bookings ${chip}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            {loadingB ? (
              <><div className="dash-skel" /><div className="dash-skel" /><div className="dash-skel" /></>
            ) : shownBooks.length === 0 ? (
              <EmptyBlock large emoji="📅" title="No bookings here" body="Browse Bangalore or change filter." to="/browse" cta="Browse Listings" />
            ) : (
              <div className="dash-books">
                {shownBooks.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    role="renter"
                    open={openBook === booking.id}
                    onToggle={() => setOpenBook(openBook === booking.id ? null : booking.id)}
                    onStatus={setBookingStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'incoming' && (
          <div>
            <div className="dash-toolbar">
              <p>{shownIncoming.length} on your listings{pendingIn ? ` · ${pendingIn} waiting` : ''}</p>
              <div className="dash-chips" role="group" aria-label="Filter incoming bookings">
                {STATUS_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={`dash-chip${bookFilter === chip ? ' is-on' : ''}`}
                    onClick={() => setBookFilter(chip)}
                    aria-pressed={bookFilter === chip}
                    aria-label={`Filter incoming ${chip}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            {loadingIn ? (
              <><div className="dash-skel" /><div className="dash-skel" /></>
            ) : shownIncoming.length === 0 ? (
              <EmptyBlock large emoji="📥" title="No incoming bookings" body="Renters who book your gear show up here." />
            ) : (
              <div className="dash-books">
                {shownIncoming.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    role="lister"
                    open={openBook === booking.id}
                    onToggle={() => setOpenBook(openBook === booking.id ? null : booking.id)}
                    onStatus={setBookingStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteModal
        listing={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
