import { useState } from 'react'
import {
  Gamepad2, Star, ShieldCheck, Download, ExternalLink,
  Tag, MapPin, Zap, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { buildWhatsAppLink } from '../lib/whatsappSmsService'

export default function GameCard({
  game,
  isFreeSonyGame = false,
  onRentClick,
  onBuyClick,
  onTradeClick,
}) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Fallback cover if image fails
  const displayCover = !imgError && game.cover ? game.cover : '/hero/ps5.png'

  if (isFreeSonyGame) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 group"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 24, 38, 0.85) 0%, rgba(10, 12, 20, 0.95) 100%)',
          border: hovered ? '1px solid rgba(0, 229, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: hovered ? '0 16px 40px rgba(0, 229, 255, 0.15)' : '0 4px 20px rgba(0, 0, 0, 0.4)',
          transform: hovered ? 'translateY(-3px)' : 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Cover Image banner */}
        <div className="relative w-full h-44 overflow-hidden bg-black/60">
          <img
            src={displayCover}
            alt={game.title}
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 backdrop-blur-md">
              FREE TO PLAY
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600/40 text-blue-200 border border-blue-400/40 backdrop-blur-md">
              {game.platforms?.join(' · ') || 'PS5'}
            </span>
          </div>

          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/70 text-amber-300 border border-amber-400/30 flex items-center gap-1 backdrop-blur-md">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              {game.rating || '4.8'}
            </span>
          </div>

          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/70">
            <span className="font-medium text-cyan-300 truncate">{game.developer}</span>
            <span className="text-[10px] font-mono text-white/50">{game.size}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-white leading-snug line-clamp-1 mb-1">
              {game.title}
            </h3>
            <p className="text-xs text-white/60 line-clamp-2 leading-relaxed mb-3">
              {game.description}
            </p>

            {/* Feature tags */}
            {game.features && (
              <div className="flex flex-wrap gap-1 mb-3">
                {game.features.slice(0, 3).map((f) => (
                  <span
                    key={f}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/70 border border-white/10 font-mono"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={11} /> 0 PS Plus Needed
            </span>
            <a
              href={game.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all active:scale-95"
            >
              <span>Sony Store</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Rent / Buy Market Game Card
  const canRent = game.isAvailableForRent !== false && game.rentPriceDay
  const canBuy = game.isAvailableForBuy !== false && game.buyPrice

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col transition-all duration-300 group"
      style={{
        background: 'linear-gradient(180deg, rgba(20, 24, 38, 0.85) 0%, rgba(10, 12, 20, 0.95) 100%)',
        border: hovered ? '1px solid rgba(255, 46, 109, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: hovered ? '0 16px 40px rgba(255, 46, 109, 0.15)' : '0 4px 20px rgba(0, 0, 0, 0.4)',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Cover Image banner */}
      <div className="relative w-full h-48 overflow-hidden bg-black/60">
        <img
          src={displayCover}
          alt={game.title}
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-400/40 backdrop-blur-md">
            {game.platform || 'PS5 Disc'}
          </span>
          {game.badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-400/40 backdrop-blur-md">
              {game.badge}
            </span>
          )}
        </div>

        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-black/70 text-amber-300 border border-amber-400/30 flex items-center gap-1 backdrop-blur-md">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            {game.rating || '5.0'}
          </span>
        </div>

        {/* Condition tag */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/70">
          <span className="font-mono text-emerald-400 flex items-center gap-1">
            <ShieldCheck size={12} /> {game.condition === 'like_new' ? 'Like-New (Mint)' : 'Tested Disc'}
          </span>
          <span className="text-[10px] text-white/50">{game.genre}</span>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-white leading-snug line-clamp-1 mb-1">
            {game.title}
          </h3>
          <div className="flex items-center gap-1 text-[11px] text-white/50 mb-3 truncate">
            <MapPin size={11} className="text-cyan-400 shrink-0" />
            <span className="truncate">{game.hubLocation}</span>
          </div>

          {/* Pricing Grid: Rent vs Buy */}
          <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/5 mb-3">
            {canRent && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-white/45">Rent Daily</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="font-bungee text-base text-cyan-400">₹{game.rentPriceDay}</span>
                  <span className="text-[10px] text-white/40">/day</span>
                </div>
                <span className="text-[9px] text-white/40 font-mono">Dep ₹{game.deposit || 1000}</span>
              </div>
            )}
            {canBuy && (
              <div className="flex flex-col border-l border-white/10 pl-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-white/45">Buy Pre-Owned</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="font-bungee text-base text-pink-400">₹{game.buyPrice}</span>
                  <span className="text-[9px] text-emerald-400 font-bold ml-1">Own it</span>
                </div>
                <span className="text-[9px] text-white/40 font-mono">100% Tested</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-white/5 flex items-center gap-2">
          {canRent && (
            <button
              type="button"
              onClick={() => onRentClick && onRentClick(game)}
              className="flex-1 py-2 px-2.5 rounded-xl text-xs font-bold text-white bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 transition-all flex items-center justify-center gap-1 active:scale-95"
            >
              <span>Rent</span>
              <span className="font-mono text-[11px] text-cyan-300">₹{game.rentPriceDay}/d</span>
            </button>
          )}
          {canBuy && (
            <button
              type="button"
              onClick={() => onBuyClick && onBuyClick(game)}
              className="flex-1 py-2 px-2.5 rounded-xl text-xs font-bold text-white bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 transition-all flex items-center justify-center gap-1 active:scale-95"
            >
              <span>Buy</span>
              <span className="font-mono text-[11px] text-pink-300">₹{game.buyPrice}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

