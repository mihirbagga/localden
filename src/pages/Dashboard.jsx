import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User, Star, Shield, Edit3, Plus, Trash2, Eye,
  Package, Calendar, TrendingUp, Clock, CheckCircle,
  XCircle, AlertCircle, Camera, LogOut, ChevronRight, X
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/* ── Delete Confirmation Modal ──────────────────────── */
function DeleteModal({ listing, onConfirm, onCancel, loading }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  if (!listing) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      {/* Modal box — stop click propagation so backdrop click closes */}
      <div
        className="relative w-full max-w-md rounded-3xl p-7"
        style={{
          background: 'rgba(14,14,28,0.98)',
          border:     '1px solid rgba(255,46,109,0.35)',
          boxShadow:  '0 0 60px rgba(255,46,109,0.2), 0 24px 80px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(255,46,109,0.12)', border: '1px solid rgba(255,46,109,0.3)' }}>
          <Trash2 size={28} style={{ color: '#ff2e6d' }} />
        </div>

        {/* Heading */}
        <h2 className="font-bungee text-2xl text-white text-center mb-2">Delete Listing?</h2>
        <p className="font-display text-sm text-center mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
          This will permanently remove your listing. This action cannot be undone.
        </p>

        {/* Listing preview */}
        <div className="flex items-center gap-3 p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(255,46,109,0.06)', border: '1px solid rgba(255,46,109,0.15)' }}>
          <span className="text-3xl">{listing.emoji || '🎮'}</span>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-white text-sm truncate">{listing.title}</div>
            <div className="text-xs font-display mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              ₹{listing.price_day}/day · {listing.location}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="btn-outline flex-1 py-3"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2"
            style={{
              background: loading ? 'rgba(255,46,109,0.4)' : 'linear-gradient(90deg, #ff2e6d, #c0004e)',
              color:      'white',
              boxShadow:  loading ? 'none' : '0 0 20px rgba(255,46,109,0.4)',
            }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <><Trash2 size={14} /> Yes, Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ── Stat card ──────────────────────────────────── */
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="glass rounded-2xl p-5"
      style={{ border: `1px solid ${color}20` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="font-bungee text-2xl mb-0.5" style={{ color }}>{value}</div>
      <div className="text-sm font-display font-semibold text-white">{label}</div>
      {sub && <div className="text-xs font-display mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</div>}
    </div>
  )
}

/* ── Tab button ─────────────────────────────────── */
function Tab({ label, icon, active, onClick, count }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-bold transition-all duration-300"
      style={{
        background: active ? 'rgba(255,46,109,0.12)' : 'rgba(255,255,255,0.04)',
        border:     `1px solid ${active ? 'rgba(255,46,109,0.4)' : 'rgba(255,255,255,0.08)'}`,
        color:      active ? '#ff2e6d' : 'rgba(255,255,255,0.5)',
      }}>
      {icon} {label}
      {count > 0 && (
        <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full font-bungee"
          style={{ background: active ? 'rgba(255,46,109,0.2)' : 'rgba(255,255,255,0.08)', color: active ? '#ff2e6d' : 'rgba(255,255,255,0.4)' }}>
          {count}
        </span>
      )}
    </button>
  )
}

/* ── Booking row ────────────────────────────────── */
function BookingRow({ booking }) {
  const statusConfig = {
    pending:   { label: 'Pending',   color: '#ffd23f', bg: 'rgba(255,210,63,0.1)'  },
    confirmed: { label: 'Confirmed', color: '#00e5ff', bg: 'rgba(0,229,255,0.1)'   },
    active:    { label: 'Active',    color: '#00ff94', bg: 'rgba(0,255,148,0.1)'   },
    completed: { label: 'Done',      color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' },
    cancelled: { label: 'Cancelled', color: '#ff6b9d', bg: 'rgba(255,46,109,0.1)' },
  }
  const s = statusConfig[booking.status] || statusConfig.pending

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Emoji */}
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        {booking.listings?.emoji || '🎮'}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-white text-sm truncate mb-0.5">
          {booking.listings?.title || 'Listing'}
        </div>
        <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Calendar size={10} className="inline mr-1" />
          {booking.start_date} → {booking.end_date} · {booking.total_days} day{booking.total_days !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <div className="font-bungee text-sm" style={{ color: '#ffd23f' }}>₹{booking.total_amount}</div>
        <span className="text-xs font-display px-2 py-0.5 rounded-full"
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user, profile, signOut, updateProfile, uploadAvatar } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab]           = useState('overview')
  const [myListings, setMyListings] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loadingL, setLoadingL] = useState(true)
  const [loadingB, setLoadingB] = useState(true)
  const [editName, setEditName] = useState(false)
  const [nameVal, setNameVal]       = useState(profile?.full_name || '')
  const [saving, setSaving]         = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)  // full listing object
  const [deleting, setDeleting]     = useState(false)


  /* ── Fetch my listings ─────────────────── */
  useEffect(() => {
    if (!user) return
    supabase.from('listings')
      .select('*, profiles(full_name, rating, kyc_status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setMyListings(data || []); setLoadingL(false) })
  }, [user])

  /* ── Fetch my bookings (as renter) ─────── */
  useEffect(() => {
    if (!user) return
    supabase.from('bookings')
      .select('*, listings(title, emoji, category)')
      .eq('renter_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setMyBookings(data || []); setLoadingB(false) })
  }, [user])

  /* ── Stats ─────────────────────────────── */
  const totalEarned   = myListings.reduce((s, l) => s + (l.total_bookings || 0) * (l.price_day || 0), 0)
  const activeListings = myListings.filter(l => l.is_available).length
  const completedBookings = myBookings.filter(b => b.status === 'completed').length

  /* ── Delete listing ─────────────────────── */
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from('listings').delete().eq('id', deleteTarget.id)
    setMyListings(prev => prev.filter(l => l.id !== deleteTarget.id))
    setDeleting(false)
    setDeleteTarget(null)
  }

  /* ── Save name ──────────────────────────── */
  const saveName = async () => {
    setSaving(true)
    await updateProfile({ full_name: nameVal })
    setSaving(false)
    setEditName(false)
  }

  /* ── Avatar upload ──────────────────────── */
  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { await uploadAvatar(file) } catch (err) { console.error(err) }
  }

  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <div className="grid-floor" />
      <GameBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Profile header ───────────────── */}
        <div className="glass rounded-3xl p-6 mb-8"
          style={{ border: '1px solid rgba(255,46,109,0.15)' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <label className="cursor-pointer group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center font-bungee text-3xl text-white transition-all group-hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg, #ff2e6d, #00e5ff)' }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (profile?.full_name?.[0]?.toUpperCase() || <User size={28} />)
                  }
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background: '#ff2e6d', border: '2px solid #0a0a14' }}>
                  <Camera size={12} className="text-white" />
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </label>
            </div>

            {/* Name + email */}
            <div className="flex-1">
              {editName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={nameVal} onChange={e => setNameVal(e.target.value)}
                    className="input-dark py-1.5 px-3 text-sm"
                    style={{ maxWidth: 220 }}
                    onKeyDown={e => e.key === 'Enter' && saveName()} />
                  <button onClick={saveName} disabled={saving}
                    className="btn-primary py-1.5 px-3 text-sm">
                    {saving ? '...' : 'Save'}
                  </button>
                  <button onClick={() => setEditName(false)}
                    className="btn-outline py-1.5 px-3 text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-bungee text-2xl text-white">
                    {profile?.full_name || user?.email?.split('@')[0] || 'My Account'}
                  </h1>
                  <button onClick={() => setEditName(true)}
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    className="hover:text-white transition-colors">
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <span className="text-sm font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {user?.email}
                </span>
                {profile?.kyc_status === 'verified' ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#00ff94' }}>
                    <Shield size={11} /> Verified
                  </span>
                ) : (
                  <span className="text-xs font-display px-2 py-0.5 rounded-full cursor-pointer"
                    style={{ background: 'rgba(255,210,63,0.1)', border: '1px solid rgba(255,210,63,0.3)', color: '#ffd23f' }}>
                    ⚡ Complete KYC
                  </span>
                )}
                {profile?.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={11} style={{ fill: '#ffd23f', color: '#ffd23f' }} />
                    <span className="text-xs font-bold" style={{ color: '#ffd23f' }}>{profile.rating}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sign out */}
            <button onClick={() => { signOut(); navigate('/') }}
              className="flex items-center gap-2 btn-outline text-sm py-2 px-4">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* ── Stats row ────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Package size={18}/>}     label="My Listings"       value={myListings.length}    color="#ff2e6d" sub={`${activeListings} active`} />
          <StatCard icon={<Calendar size={18}/>}    label="Bookings Made"     value={myBookings.length}    color="#00e5ff" sub={`${completedBookings} completed`} />
          <StatCard icon={<TrendingUp size={18}/>}  label="Est. Earnings"     value={`₹${totalEarned}`}   color="#ffd23f" sub="from your listings" />
          <StatCard icon={<Star size={18}/>}        label="Your Rating"       value={profile?.rating || '—'} color="#00ff94" sub={`${profile?.total_reviews || 0} reviews`} />
        </div>

        {/* ── Tabs ─────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Tab label="Overview"    icon={<User size={14}/>}     active={tab==='overview'} onClick={() => setTab('overview')} count={0} />
          <Tab label="My Listings" icon={<Package size={14}/>}  active={tab==='listings'} onClick={() => setTab('listings')} count={myListings.length} />
          <Tab label="My Bookings" icon={<Calendar size={14}/>} active={tab==='bookings'} onClick={() => setTab('bookings')} count={myBookings.length} />
        </div>

        {/* ─────────── OVERVIEW TAB ────────── */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* Quick actions */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bungee text-sm mb-4" style={{ color: '#ff2e6d', letterSpacing: '0.06em' }}>
                QUICK ACTIONS
              </h3>
              <div className="space-y-3">
                {[
                  { to: '/list-item',  icon: <Plus size={16}/>,    label: 'List a new item',      desc: 'Earn from your gear',         color: '#ff2e6d' },
                  { to: '/browse',     icon: <Eye size={16}/>,     label: 'Browse listings',      desc: 'Find gear to rent',           color: '#00e5ff' },
                  { to: '/how-it-works', icon: <Shield size={16}/>, label: 'How it works',        desc: 'Learn about the platform',   color: '#ffd23f' },
                ].map(a => (
                  <Link key={a.to} to={a.to}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${a.color}15`, color: a.color }}>
                      {a.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-display font-bold text-white">{a.label}</div>
                      <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.desc}</div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent listings preview */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bungee text-sm" style={{ color: '#ff2e6d', letterSpacing: '0.06em' }}>
                  RECENT LISTINGS
                </h3>
                <button onClick={() => setTab('listings')}
                  className="text-xs font-display" style={{ color: '#00e5ff' }}>
                  View all →
                </button>
              </div>
              {loadingL ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
                </div>
              ) : myListings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📦</div>
                  <p className="text-sm font-display mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>No listings yet</p>
                  <Link to="/list-item" className="btn-primary text-sm py-2 px-4">+ List Your First Item</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {myListings.slice(0, 3).map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-xl">{l.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-display font-semibold text-white truncate">{l.title}</div>
                        <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          ₹{l.price_day}/day · {l.location}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-display ${l.is_available ? '' : ''}`}
                        style={{
                          background: l.is_available ? 'rgba(0,255,148,0.1)' : 'rgba(255,46,109,0.1)',
                          color: l.is_available ? '#00ff94' : '#ff6b9d',
                        }}>
                        {l.is_available ? 'Live' : 'Off'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent bookings preview */}
            <div className="glass rounded-2xl p-5 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bungee text-sm" style={{ color: '#00e5ff', letterSpacing: '0.06em' }}>
                  RECENT BOOKINGS
                </h3>
                <button onClick={() => setTab('bookings')}
                  className="text-xs font-display" style={{ color: '#ff2e6d' }}>
                  View all →
                </button>
              </div>
              {loadingB ? (
                <div className="space-y-3">
                  {[1,2].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
                </div>
              ) : myBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm font-display mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>No bookings yet</p>
                  <Link to="/browse" className="btn-secondary text-sm py-2 px-4">Browse Gear to Rent</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {myBookings.slice(0, 3).map(b => <BookingRow key={b.id} booking={b} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────── MY LISTINGS TAB ──────── */}
        {tab === 'listings' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="font-display text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {myListings.length} listing{myListings.length !== 1 ? 's' : ''}
              </p>
              <Link to="/list-item" className="btn-primary text-sm py-2 px-4">
                <Plus size={14} /> New Listing
              </Link>
            </div>

            {loadingL ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1,2,3].map(i => <div key={i} className="h-72 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
              </div>
            ) : myListings.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="font-bungee text-2xl text-white mb-2">No listings yet</h3>
                <p className="font-display mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  List your gear and start earning from it!
                </p>
                <Link to="/list-item" className="btn-primary">+ List Your First Item</Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myListings.map(listing => (
                  <div key={listing.id} className="relative group">
                    <ListingCard listing={listing} />
                    {/* Owner action overlay */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                      <Link to={`/listing/${listing.id}`}
                        className="flex items-center gap-1.5 text-xs font-display font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(0,229,255,0.9)', color: '#0a0a14' }}>
                        <Eye size={11} /> View
                      </Link>
                      <button onClick={() => setDeleteTarget(listing)}
                        className="flex items-center gap-1.5 text-xs font-display font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(255,46,109,0.9)', color: 'white' }}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────── MY BOOKINGS TAB ──────── */}
        {tab === 'bookings' && (
          <div>
            <p className="font-display text-sm mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {myBookings.length} booking{myBookings.length !== 1 ? 's' : ''} as renter
            </p>

            {loadingB ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
              </div>
            ) : myBookings.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="font-bungee text-2xl text-white mb-2">No bookings yet</h3>
                <p className="font-display mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Find gear to rent across Bangalore!
                </p>
                <Link to="/browse" className="btn-primary">Browse Listings</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myBookings.map(b => <BookingRow key={b.id} booking={b} />)}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Delete confirmation modal ──────── */}
      <DeleteModal
        listing={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
