import { useState } from 'react'
import {
  Tag, ExternalLink, Clock, Flame, Sparkles, Gamepad2, ArrowRight,
} from 'lucide-react'

const STORE_STYLES = {
  PlayStation: {
    bg: 'rgba(0, 112, 209, 0.15)',
    border: 'rgba(0, 112, 209, 0.4)',
    text: '#60a5fa',
    label: 'PlayStation Store',
    icon: '🎮',
  },
  Steam: {
    bg: 'rgba(102, 192, 244, 0.15)',
    border: 'rgba(102, 192, 244, 0.4)',
    text: '#93c5fd',
    label: 'Steam Store',
    icon: '💨',
  },
  Xbox: {
    bg: 'rgba(16, 124, 16, 0.15)',
    border: 'rgba(16, 124, 16, 0.4)',
    text: '#4ade80',
    label: 'Xbox Store',
    icon: '🟢',
  },
  'Epic Games': {
    bg: 'rgba(147, 51, 234, 0.15)',
    border: 'rgba(147, 51, 234, 0.4)',
    text: '#c084fc',
    label: 'Epic Games Store',
    icon: '⚡',
  },
}

export default function DealCard({ deal, onRentDiscClick }) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const storeInfo = STORE_STYLES[deal.store] || {
    bg: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.2)',
    text: '#fff',
    label: deal.store || 'Game Store',
    icon: '🎮',
  }

  const isFree = deal.salePrice === 0 || deal.discountPercent === 100
  const displayCover = !imgError && deal.cover ? deal.cover : '/hero/ps5.png'

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 group"
      style={{
        background: 'linear-gradient(180deg, rgba(20, 24, 38, 0.85) 0%, rgba(10, 12, 20, 0.95) 100%)',
        border: hovered ? '1px solid rgba(255, 75, 43, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: hovered ? '0 16px 40px rgba(255, 75, 43, 0.15)' : '0 4px 20px rgba(0, 0, 0, 0.4)',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Banner Cover */}
      <div className="relative w-full h-44 overflow-hidden bg-black/60">
        <img
          src={displayCover}
          alt={deal.title}
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md flex items-center gap-1"
            style={{
              backgroundColor: storeInfo.bg,
              borderColor: storeInfo.border,
              color: storeInfo.text,
            }}
          >
            <span>{storeInfo.icon}</span>
            <span>{deal.store}</span>
          </span>

          {deal.isBlackFriday && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-600/30 text-red-300 border border-red-500/50 backdrop-blur-md flex items-center gap-1">
              <Flame size={10} className="fill-red-400 text-red-400" />
              Black Friday
            </span>
          )}
        </div>

        {/* Discount Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono tracking-wider shadow-lg flex items-center gap-1 ${
              isFree
                ? 'bg-emerald-500 text-gray-950 animate-pulse'
                : 'bg-gradient-to-r from-red-600 to-pink-600 text-white'
            }`}
          >
            {isFree ? '100% FREE' : `-${deal.discountPercent}%`}
          </span>
        </div>

        {/* Expiry label */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/70">
          <span className="text-[10px] font-mono text-amber-300 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md">
            <Clock size={10} /> {deal.endsIn || 'Limited Time'}
          </span>
          <span className="text-[10px] text-white/50">{deal.platform}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] font-mono text-white/40 block mb-0.5 uppercase">
            {deal.saleName || 'Special Sale Event'}
          </span>
          <h3 className="font-display font-bold text-base text-white leading-snug line-clamp-1 mb-2">
            {deal.title}
          </h3>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2 mb-3">
            {isFree ? (
              <div className="flex items-baseline gap-2">
                <span className="font-bungee text-2xl text-emerald-400">FREE</span>
                <span className="text-xs line-through text-white/40 font-mono">₹{deal.originalPrice}</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="font-bungee text-2xl text-white">₹{deal.salePrice}</span>
                <span className="text-xs line-through text-white/40 font-mono">₹{deal.originalPrice}</span>
                <span className="text-[10px] text-emerald-400 font-bold font-mono">
                  Save ₹{deal.originalPrice - deal.salePrice}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Links */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          {/* Direct Store Link */}
          <a
            href={deal.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
          >
            <span>Claim on {deal.store}</span>
            <ExternalLink size={12} />
          </a>

          {/* LocalDen Hub Physical Disc Option */}
          {deal.localDenRentDay && (
            <button
              type="button"
              onClick={() => onRentDiscClick && onRentDiscClick(deal)}
              className="w-full text-center text-[11px] font-mono text-cyan-300 hover:text-cyan-200 transition-colors flex items-center justify-center gap-1 py-1"
            >
              <span>Or rent physical disc on LocalDen for</span>
              <strong className="text-cyan-400 font-bold">₹{deal.localDenRentDay}/day →</strong>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

