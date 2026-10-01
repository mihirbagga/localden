import { useState, useRef, useEffect } from 'react'
import { Disc, Zap, Gamepad2, Sparkles, CheckCircle2, MoreHorizontal, X, Layers } from 'lucide-react'

export default function ListingGamesDisplay({ games = [] }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef(null)

  if (!games || games.length === 0) return null

  const VISIBLE_COUNT = 5
  const visibleGames = games.slice(0, VISIBLE_COUNT)
  const remainingCount = Math.max(0, games.length - VISIBLE_COUNT)

  // Close tooltip when clicking outside or pressing Escape
  useEffect(() => {
    if (!showTooltip) return
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setShowTooltip(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowTooltip(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showTooltip])

  return (
    <div className="ld-card p-5 rounded-3xl bg-gradient-to-br from-cyan-950/25 via-slate-900/60 to-purple-950/20 border border-cyan-500/30 space-y-4 my-5 shadow-xl shadow-cyan-950/20 animate-fade-in relative">
      {/* Header without numbers */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Gamepad2 size={20} />
          </div>
          <div>
            <h3 className="font-bungee text-base sm:text-lg text-white leading-tight flex items-center gap-2 flex-wrap">
              <span>Included Games</span>
              <span className="text-cyan-400 font-sans font-bold text-xs sm:text-sm tracking-wide bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full shadow-sm">
                + Many More
              </span>
            </h3>
            <p className="text-[11px] text-white/50 font-display">
              Top featured titles ready-to-play + pre-loaded console library
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-display flex items-center gap-1.5 shadow-sm">
          <CheckCircle2 size={13} /> Tested & Working
        </span>
      </div>

      {/* Games Grid: Shows top 5 + Ellipsis Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {visibleGames.map((game, idx) => {
          const isDisc = game.format === 'Disc'
          return (
            <div
              key={`${game.title}-${idx}`}
              className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-950/20 transition-all duration-300 flex items-center justify-between gap-2 group shadow-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold transition-transform group-hover:scale-110 duration-200 ${
                    isDisc
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/10'
                      : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/10'
                  }`}
                >
                  {isDisc ? <Disc size={16} /> : <Zap size={16} />}
                </div>
                <div className="min-w-0">
                  <h4
                    className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors"
                    title={game.title}
                  >
                    {game.title}
                  </h4>
                  <span className="text-[10px] text-white/40 font-display block">
                    {game.genre || 'Action / Adventure'}
                  </span>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex-shrink-0 uppercase tracking-wider ${
                  isDisc
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {isDisc ? 'Disc' : 'Digital'}
              </span>
            </div>
          )
        })}

        {/* 6th Card: Interactive Ellipsis & Tooltip for All Games */}
        <div
          ref={tooltipRef}
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            type="button"
            onClick={() => setShowTooltip((prev) => !prev)}
            className="w-full h-full min-h-[58px] p-3 rounded-2xl bg-cyan-950/30 border border-dashed border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all duration-300 flex items-center justify-between gap-2 group text-left cursor-pointer"
            aria-label="View all included games"
            aria-expanded={showTooltip}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-200">
                <MoreHorizontal size={17} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-cyan-300 group-hover:text-white transition-colors truncate">
                  {remainingCount > 0 ? `+${remainingCount} More Games` : '+ Many More Games'}
                </h4>
                <span className="text-[10px] text-white/50 font-display block">
                  Hover to view all titles
                </span>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex-shrink-0 uppercase tracking-wider bg-white/10 text-cyan-200 group-hover:bg-cyan-500/30 group-hover:text-cyan-300 border border-white/10">
              ··· All
            </span>
          </button>

          {/* Floating Glass Tooltip / Popover showing ALL games */}
          {showTooltip && (
            <div
              role="tooltip"
              className="absolute right-0 bottom-full mb-2 w-72 sm:w-84 max-w-[90vw] max-h-84 overflow-hidden rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-cyan-500/40 p-4 shadow-2xl shadow-cyan-950/80 z-50 animate-fade-in"
              style={{ minWidth: '280px' }}
            >
              {/* Tooltip Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-cyan-400" />
                  <span className="font-bungee text-xs text-white tracking-wide">
                    All Included Games
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTooltip(false)
                  }}
                  className="sm:hidden text-white/50 hover:text-white p-1"
                  aria-label="Close games popup"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Scrollable list of ALL games */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {games.map((g, i) => {
                  const isDisc = g.format === 'Disc'
                  return (
                    <div
                      key={`tooltip-game-${g.title}-${i}`}
                      className="p-2 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={isDisc ? 'text-amber-400' : 'text-cyan-400'}>
                          {isDisc ? <Disc size={13} /> : <Zap size={13} />}
                        </span>
                        <span className="font-semibold text-white/90 truncate">{g.title}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0 ${
                          isDisc
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {isDisc ? 'Disc' : 'Digital'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Tooltip Footer Note */}
              <div className="mt-3 pt-2.5 border-t border-white/10 text-[10px] text-white/60 font-display flex items-start gap-1.5">
                <Sparkles size={12} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>
                  Plus preloaded free-to-play & subscription titles (Fortnite, Warzone, Apex, Rocket League & more).
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trust & Policy Footer */}
      <div className="pt-1 flex items-center justify-between text-[11px] text-white/40 font-display border-t border-white/5">
        <span>🎮 All save data can be stored on your PSN account</span>
        <span className="text-cyan-400 flex items-center gap-1 font-semibold">
          <Sparkles size={11} /> Zero extra fee
        </span>
      </div>
    </div>
  )
}
