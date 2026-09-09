import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, MapPin, Shield, Heart } from 'lucide-react'

/**
 * Works with both Supabase format (snake_case) and legacy mock format.
 * Supabase: price_day, is_available, total_reviews, profiles.full_name
 * Legacy:   price.day, available, reviews, lister
 */
export default function ListingCard({ listing, listView = false }) {
  const [hovered, setHovered] = useState(false)
  const [saved,   setSaved]   = useState(false)
  const isGaming = listing.category === 'gaming'

  const accent   = isGaming ? '#ff2e6d' : '#00e5ff'
  const tagClass = isGaming ? 'tag-gaming' : 'tag-music'

  /* ── Normalise Supabase vs mock format ── */
  const priceDay     = listing.price_day     ?? listing.price?.day     ?? 0
  const priceWeekend = listing.price_weekend ?? listing.price?.weekend ?? 0
  const priceWeek    = listing.price_week    ?? listing.price?.week    ?? 0
  const available    = listing.is_available  ?? listing.available      ?? true
  const verified     = listing.is_verified   ?? listing.verified       ?? false
  const reviewCount  = listing.total_reviews ?? listing.reviews        ?? 0
  const rating       = listing.rating        ?? 0
  const listerName   = listing.profiles?.full_name ?? listing.lister   ?? 'Lister'
  const subcat       = listing.subcategory   ?? ''
  const heroPhoto    = listing.photos?.[0]   ?? null
  const emoji        = listing.emoji         ?? (isGaming ? '🎮' : '🎵')

  /* ──────────── LIST VIEW ──────────────── */
  if (listView) {
    return (
      <Link to={`/listing/${listing.id}`} style={{ textDecoration: 'none' }}>
        <div
          className="flex items-center gap-4 rounded-2xl p-3 transition-all duration-300"
          style={{
            background:     hovered ? 'rgba(255,255,255,0.05)' : 'rgba(14,14,28,0.8)',
            border:         `1px solid ${hovered ? accent + '40' : 'rgba(255,255,255,0.07)'}`,
            boxShadow:      hovered ? `0 8px 30px ${accent}15` : 'none',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${accent}18, rgba(10,10,20,0.6))` }}>
            {heroPhoto
              ? <img src={heroPhoto} alt={listing.title} className="w-full h-full object-cover" />
              : emoji}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={tagClass} style={{ fontSize: '0.62rem', padding: '2px 8px' }}>{subcat}</span>
              {available
                ? <span className="text-xs" style={{ color: '#00ff94' }}>● Available</span>
                : <span className="text-xs" style={{ color: '#ff6b9d' }}>● Booked</span>}
            </div>
            <h3 className="font-display font-bold text-white text-sm leading-snug truncate">{listing.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              {rating > 0 && (
                <div className="flex items-center gap-0.5">
                  <Star size={10} style={{ fill: '#ffd23f', color: '#ffd23f' }} />
                  <span className="text-xs font-bold" style={{ color: '#ffd23f' }}>{rating}</span>
                </div>
              )}
              {listing.location && (
                <div className="flex items-center gap-0.5">
                  <MapPin size={10} style={{ color: accent }} />
                  <span className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>{listing.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <div className="font-bungee text-xl" style={{ color: accent }}>₹{priceDay}</div>
            <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>/day</div>
          </div>
        </div>
      </Link>
    )
  }

  /* ──────────── GRID VIEW (default) ───── */
  return (
    <Link to={`/listing/${listing.id}`} className="block" style={{ textDecoration: 'none' }}>
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-400"
        style={{
          height:     360,
          border:     `1px solid ${hovered ? accent + '50' : 'rgba(255,255,255,0.07)'}`,
          boxShadow:  hovered ? `0 24px 70px ${accent}25, 0 0 0 1px ${accent}18` : 'none',
          transform:  hovered ? 'translateY(-4px)' : 'none',
          transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── Full background photo / emoji ── */}
        {heroPhoto ? (
          <img src={heroPhoto} alt={listing.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
            style={{ transform: hovered ? 'scale(1.06)' : 'scale(1)' }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accent}22 0%, rgba(10,10,20,0.95) 100%)`,
            }}>
            <span className="text-8xl select-none transition-transform duration-500"
              style={{
                transform: hovered ? 'scale(1.18) rotate(6deg)' : 'scale(1)',
                filter:    `drop-shadow(0 0 30px ${accent}99)`,
              }}>
              {emoji}
            </span>
          </div>
        )}

        {/* ── Dark gradient overlay (always) ── */}
        <div className="absolute inset-0"
          style={{
            background: heroPhoto
              ? `linear-gradient(to top, rgba(6,6,16,0.97) 0%, rgba(6,6,16,0.55) 50%, rgba(6,6,16,0.1) 100%)`
              : `linear-gradient(to top, rgba(6,6,16,0.98) 0%, rgba(6,6,16,0.3) 60%, transparent 100%)`,
          }} />

        {/* ── Top badges ──────────────────── */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <span className={tagClass}>{subcat}</span>

          <div className="flex items-center gap-1.5">
            {/* Save button */}
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); setSaved(s => !s) }}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: saved ? 'rgba(255,46,109,0.8)' : 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
              }}>
              <Heart size={13} style={{ color: 'white' }} fill={saved ? 'white' : 'none'} />
            </button>
            {/* Availability dot */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-display font-semibold"
              style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                color: available ? '#00ff94' : '#ff6b9d',
              }}>
              <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: available ? '#00ff94' : '#ff6b9d' }} />
              {available ? 'Available' : 'Booked'}
            </div>
          </div>
        </div>

        {/* ── Bottom content ──────────────── */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">

          {/* Rating row */}
          {rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              {Array(5).fill(0).map((_, i) => (
                <Star key={i} size={10}
                  style={{ fill: i < Math.round(rating) ? '#ffd23f' : 'rgba(255,255,255,0.2)', color: 'transparent' }} />
              ))}
              <span className="text-xs font-display ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                ({reviewCount})
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="font-display font-bold text-white text-base leading-snug mb-1.5 line-clamp-1">
            {listing.title}
          </h3>

          {/* Location + lister */}
          <div className="flex items-center gap-3 mb-3">
            {listing.location && (
              <div className="flex items-center gap-1">
                <MapPin size={11} style={{ color: accent }} />
                <span className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {listing.location}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #ff2e6d, #00e5ff)', fontSize: '0.55rem' }}>
                {listerName?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {listerName}
              </span>
              {(verified || listing.profiles?.kyc_status === 'verified') && (
                <Shield size={9} style={{ color: '#00ff94' }} />
              )}
            </div>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between pt-3"
            style={{ borderTop: `1px solid rgba(255,255,255,0.1)` }}>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="font-bungee text-xl" style={{ color: accent }}>₹{priceDay}</span>
                <span className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>/day</span>
              </div>
              {priceWeekend > 0 && (
                <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Wknd ₹{priceWeekend}
                </div>
              )}
            </div>

            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-display font-bold transition-all duration-300"
              style={{
                background: hovered
                  ? `linear-gradient(90deg, ${accent}, ${isGaming ? '#00e5ff' : '#ff2e6d'})`
                  : 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                color:     hovered ? '#0a0a14' : 'rgba(255,255,255,0.7)',
                boxShadow: hovered ? `0 0 20px ${accent}50` : 'none',
              }}>
              Rent Now →
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
