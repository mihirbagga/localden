import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Star, Shield, Clock, Calendar,
  ChevronLeft, ChevronRight, Share2, Heart, Gamepad2,
  Music, CheckCircle, AlertCircle, User, Phone
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import { useListingById } from '../hooks/useListings'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/* ── Photo Gallery ──────────────────────────────────── */
function PhotoGallery({ photos, emoji, accent }) {
  const [idx, setIdx] = useState(0)
  const hasPhotos = photos?.length > 0

  if (!hasPhotos) {
    return (
      <div className="w-full h-72 md:h-96 rounded-3xl flex items-center justify-center text-9xl select-none"
        style={{
          background: `linear-gradient(135deg, ${accent}18, rgba(10,10,20,0.8))`,
          border: `1px solid ${accent}30`,
          filter: `drop-shadow(0 0 40px ${accent}40)`,
        }}>
        {emoji || '🎮'}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Main image */}
      <div className="relative w-full h-72 md:h-96 rounded-3xl overflow-hidden"
        style={{ border: `1px solid ${accent}25` }}>
        <img src={photos[idx]} alt="listing"
          className="w-full h-full object-cover" />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(10,10,20,0.4), transparent 50%)' }} />

        {/* Arrows */}
        {photos.length > 1 && (
          <>
            <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center transition-all hover:scale-110"
              style={{ border: `1px solid ${accent}40` }}>
              <ChevronLeft size={18} style={{ color: accent }} />
            </button>
            <button onClick={() => setIdx(i => (i + 1) % photos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center transition-all hover:scale-110"
              style={{ border: `1px solid ${accent}40` }}>
              <ChevronRight size={18} style={{ color: accent }} />
            </button>
          </>
        )}

        {/* Dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className="rounded-full transition-all"
                style={{
                  width:      i === idx ? 20 : 8,
                  height:     8,
                  background: i === idx ? accent : 'rgba(255,255,255,0.3)',
                }} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 mt-3">
          {photos.map((p, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all"
              style={{
                border: `2px solid ${i === idx ? accent : 'rgba(255,255,255,0.1)'}`,
                opacity: i === idx ? 1 : 0.6,
              }}>
              <img src={p} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Booking Widget ─────────────────────────────────── */
function BookingWidget({ listing, accent }) {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  // Owner cannot book their own listing
  const isOwner = isAuthenticated && user?.id === listing.user_id

  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [booked, setBooked]       = useState(false)

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000))
    : 0

  const subtotal     = days * (listing.price_day || 0)
  const platformFee  = Math.round(subtotal * 0.2)
  const deposit      = listing.deposit_amount || 5000
  const total        = subtotal + platformFee + deposit

  const handleBook = () => {
    if (!isAuthenticated) return navigate('/login')
    if (!startDate || !endDate) return
    // Razorpay will go here — for now show confirmation
    setBooked(true)
  }

  // Owner sees manage card, not booking widget
  if (isOwner) {
    return (
      <div className="glass rounded-3xl p-6 text-center sticky top-24"
        style={{ border: `1px solid ${accent}25` }}>
        <div className="text-4xl mb-3">🏠</div>
        <h3 className="font-bungee text-lg text-white mb-2">Your Listing</h3>
        <p className="font-display text-sm mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          You can't rent your own item. Share this link with others!
        </p>
        <Link to="/dashboard" className="btn-primary w-full py-3 text-sm">
          Manage in Dashboard →
        </Link>
      </div>
    )
  }

  if (booked) {
    return (
      <div className="glass rounded-3xl p-6 text-center"
        style={{ border: `1px solid rgba(0,255,148,0.3)` }}>
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="font-bungee text-xl text-white mb-2">Booking Requested!</h3>
        <p className="font-display text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          The lister will confirm shortly. Payment via Razorpay coming soon.
        </p>
      </div>
    )
  }

  return (
    <div className="glass rounded-3xl p-6 sticky top-24"
      style={{ border: `1px solid ${accent}25` }}>

      {/* Price headline */}
      <div className="flex items-baseline gap-2 mb-5">
        <span className="font-bungee text-3xl" style={{ color: accent }}>
          ₹{listing.price_day}
        </span>
        <span className="font-display text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>/day</span>
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="field-label mb-1 block">FROM</label>
          <input type="date" value={startDate} min={today}
            onChange={e => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate('') }}
            className="input-dark text-sm py-2.5" style={{ colorScheme: 'dark' }} />
        </div>
        <div>
          <label className="field-label mb-1 block">TO</label>
          <input type="date" value={endDate} min={startDate || today}
            onChange={e => setEndDate(e.target.value)}
            className="input-dark text-sm py-2.5" style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      {/* Price breakdown */}
      {days > 0 && (
        <div className="rounded-2xl p-4 mb-4 space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between text-sm font-display">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>₹{listing.price_day} × {days} day{days > 1 ? 's' : ''}</span>
            <span className="text-white">₹{subtotal}</span>
          </div>
          <div className="flex justify-between text-sm font-display">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Platform fee (20%)</span>
            <span className="text-white">₹{platformFee}</span>
          </div>
          <div className="flex justify-between text-sm font-display">
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Security deposit</span>
            <span className="text-white">₹{deposit}</span>
          </div>
          <div className="flex justify-between font-bungee pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color: accent }}>Total</span>
            <span style={{ color: accent }}>₹{total}</span>
          </div>
          <p className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Deposit returned after rental completes
          </p>
        </div>
      )}

      {/* Book button */}
      <button onClick={handleBook}
        disabled={!startDate || !endDate}
        className="btn-primary w-full py-4 text-base"
        style={{ opacity: (!startDate || !endDate) ? 0.5 : 1 }}>
        <Calendar size={16} />
        {!isAuthenticated ? 'Sign In to Book' : days > 0 ? `Book for ₹${total}` : 'Select Dates'}
      </button>

      {/* Trust note */}
      <p className="text-center text-xs font-display mt-3"
        style={{ color: 'rgba(255,255,255,0.25)' }}>
        <Shield size={10} className="inline mr-1" />
        Free cancellation · Deposit protected
      </p>
    </div>
  )
}

/* ════════════════════════════════════════════════════ */
export default function ListingDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { listing, loading, error } = useListingById(id)
  const [saved, setSaved] = useState(false)

  const isGaming = listing?.category === 'gaming'
  const accent   = isGaming ? '#ff2e6d' : '#00e5ff'

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="relative min-h-screen pt-24 pb-20">
        <div className="grid-floor" /><GameBackground />
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-96 rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-8 rounded-xl w-2/3 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-4 rounded-xl w-1/2 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="h-64 rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
      </div>
    )
  }

  /* Error / not found */
  if (error || !listing) {
    return (
      <div className="relative min-h-screen pt-24 flex items-center justify-center">
        <div className="grid-floor" /><GameBackground />
        <div className="relative z-10 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="font-bungee text-3xl text-white mb-3">Listing Not Found</h2>
          <button onClick={() => navigate('/browse')} className="btn-primary mt-4">
            Browse All Listings
          </button>
        </div>
      </div>
    )
  }

  const lister = listing.profiles

  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <div className="grid-floor" />
      <GameBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Back + actions ──────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 font-display font-semibold text-sm transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setSaved(!saved)}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center transition-all hover:scale-110"
              style={{ color: saved ? '#ff2e6d' : 'rgba(255,255,255,0.4)' }}>
              <Heart size={16} fill={saved ? '#ff2e6d' : 'none'} />
            </button>
            <button className="w-9 h-9 rounded-xl glass flex items-center justify-center transition-all hover:scale-110"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Share2 size={16} />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left column ─────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Photo gallery */}
            <PhotoGallery photos={listing.photos} emoji={listing.emoji} accent={accent} />

            {/* Title + badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={isGaming ? 'tag-gaming' : 'tag-music'}>
                  {isGaming ? '🎮' : '🎵'} {listing.subcategory}
                </span>
                {listing.condition && (
                  <span className="text-xs font-display px-2.5 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.55)',
                    }}>
                    {listing.condition === 'like_new' ? '✨ Like New' : listing.condition === 'good' ? '👍 Good' : '🔧 Fair'}
                  </span>
                )}
                {listing.is_available ? (
                  <span className="text-xs font-display px-2.5 py-1 rounded-full flex items-center gap-1"
                    style={{ background: 'rgba(0,255,148,0.1)', border: '1px solid rgba(0,255,148,0.3)', color: '#00ff94' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Available
                  </span>
                ) : (
                  <span className="text-xs font-display px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,46,109,0.1)', border: '1px solid rgba(255,46,109,0.3)', color: '#ff6b9d' }}>
                    Booked
                  </span>
                )}
              </div>

              <h1 className="font-bungee text-3xl text-white mb-3" style={{ lineHeight: 1.2 }}>
                {listing.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4">
                {listing.rating > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star size={15} style={{ fill: '#ffd23f', color: '#ffd23f' }} />
                    <span className="font-bold text-sm" style={{ color: '#ffd23f' }}>{listing.rating}</span>
                    <span className="text-sm font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      ({listing.total_reviews} reviews)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} style={{ color: accent }} />
                  <span className="text-sm font-display" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {listing.location}, Bangalore
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Per Day', price: listing.price_day, color: accent },
                { label: 'Weekend', price: listing.price_weekend, color: '#ffd23f' },
                { label: 'Per Week', price: listing.price_week, color: '#00ff94' },
              ].filter(p => p.price).map(p => (
                <div key={p.label} className="glass rounded-2xl p-4 text-center"
                  style={{ border: `1px solid ${p.color}20` }}>
                  <div className="font-bungee text-2xl mb-1" style={{ color: p.color }}>₹{p.price}</div>
                  <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>{p.label}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div className="glass rounded-2xl p-5">
                <h3 className="font-bungee text-base mb-3" style={{ color: accent, fontSize: '0.85rem' }}>
                  ABOUT THIS ITEM
                </h3>
                <p className="font-display text-sm leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8 }}>
                  {listing.description}
                </p>
              </div>
            )}

            {/* Details grid */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bungee text-base mb-4" style={{ color: accent, fontSize: '0.85rem' }}>
                ITEM DETAILS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Category',  value: listing.category === 'gaming' ? '🎮 Gaming' : '🎵 Music' },
                  { label: 'Type',      value: listing.subcategory },
                  { label: 'Brand',     value: listing.brand || '—' },
                  { label: 'Model',     value: listing.model || '—' },
                  { label: 'Condition', value: listing.condition === 'like_new' ? 'Like New' : listing.condition === 'good' ? 'Good' : 'Fair' },
                  { label: 'Deposit',   value: `₹${listing.deposit_amount || 5000}` },
                ].map(d => (
                  <div key={d.label}>
                    <div className="text-xs font-display mb-0.5" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                      {d.label.toUpperCase()}
                    </div>
                    <div className="text-sm font-display font-semibold text-white">{d.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lister profile */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bungee text-base mb-4" style={{ color: accent, fontSize: '0.85rem' }}>
                LISTED BY
              </h3>
              <div className="flex items-center gap-4">
                {lister?.avatar_url ? (
                  <img src={lister.avatar_url} alt={lister.full_name}
                    className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bungee text-xl text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #ff2e6d, #00e5ff)' }}>
                    {lister?.full_name?.[0]?.toUpperCase() || <User size={20} />}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-bold text-white text-lg">
                      {lister?.full_name || 'Anonymous'}
                    </span>
                    {lister?.kyc_status === 'verified' && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#00ff94' }}>
                        <Shield size={11} /> Verified
                      </span>
                    )}
                  </div>
                  {lister?.rating > 0 && (
                    <div className="flex items-center gap-1 mb-1">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} size={11}
                          style={{ fill: i < Math.round(lister.rating) ? '#ffd23f' : 'transparent', color: '#ffd23f' }} />
                      ))}
                      <span className="text-xs font-display ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {lister.rating} · {lister.total_reviews} reviews
                      </span>
                    </div>
                  )}
                  <p className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Member since {new Date(listing.created_at).getFullYear()}
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews placeholder */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-bungee text-base mb-3" style={{ color: accent, fontSize: '0.85rem' }}>
                REVIEWS
              </h3>
              {listing.total_reviews > 0 ? (
                <p className="text-sm font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Reviews coming soon...
                </p>
              ) : (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">⭐</div>
                  <p className="text-sm font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    No reviews yet — be the first to rent this!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column — Booking widget ── */}
          <div>
            <BookingWidget listing={listing} accent={accent} />
          </div>
        </div>
      </div>
    </div>
  )
}
