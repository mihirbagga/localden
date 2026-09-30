import { Disc, Zap, Gamepad2, Sparkles, CheckCircle2 } from 'lucide-react'

export default function ListingGamesDisplay({ games = [] }) {
  if (!games || games.length === 0) return null

  return (
    <div className="ld-card p-5 rounded-3xl bg-gradient-to-br from-cyan-950/25 via-slate-900/60 to-purple-950/20 border border-cyan-500/30 space-y-4 my-5 shadow-xl shadow-cyan-950/20 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Gamepad2 size={18} />
          </div>
          <div>
            <h3 className="font-bungee text-base sm:text-lg text-white leading-tight">
              Included Games ({games.length})
            </h3>
            <p className="text-[11px] text-white/50 font-display">
              Ready to play instantly upon physical delivery or pickup
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-display flex items-center gap-1.5">
          <CheckCircle2 size={13} /> Tested & Working
        </span>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {games.map((game, idx) => {
          const isDisc = game.format === 'Disc'
          return (
            <div
              key={`${game.title}-${idx}`}
              className="p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-2 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    isDisc
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  }`}
                >
                  {isDisc ? <Disc size={16} /> : <Zap size={16} />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                    {game.title}
                  </h4>
                  <span className="text-[10px] text-white/40 font-display block">
                    {game.genre || 'Action / Adventure'}
                  </span>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex-shrink-0 uppercase ${
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

      <div className="pt-1 flex items-center justify-between text-[11px] text-white/40 font-display border-t border-white/5">
        <span>🎮 All save data can be stored on your PSN account</span>
        <span className="text-cyan-400 flex items-center gap-1 font-semibold">
          <Sparkles size={11} /> Zero extra fee
        </span>
      </div>
    </div>
  )
}
