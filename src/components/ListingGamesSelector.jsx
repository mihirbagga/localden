import { useState } from 'react'
import { Plus, X, Disc, Zap, Gamepad2, Check } from 'lucide-react'
import { POPULAR_PS5_GAMES } from '../lib/gamesService'

export default function ListingGamesSelector({ games = [], onChange }) {
  const [customTitle, setCustomTitle] = useState('')
  const [format, setFormat] = useState('Digital')

  const handleAddCustom = (e) => {
    e?.preventDefault()
    const clean = customTitle.trim()
    if (!clean) return

    // Avoid duplicates
    if (games.some((g) => g.title.toLowerCase() === clean.toLowerCase())) {
      setCustomTitle('')
      return
    }

    const next = [...games, { title: clean, format, genre: 'Action' }]
    onChange(next)
    setCustomTitle('')
  }

  const handleTogglePopular = (popularGame) => {
    const exists = games.some((g) => g.title.toLowerCase() === popularGame.title.toLowerCase())
    if (exists) {
      onChange(games.filter((g) => g.title.toLowerCase() !== popularGame.title.toLowerCase()))
    } else {
      onChange([...games, popularGame])
    }
  }

  const handleRemove = (indexToRemove) => {
    onChange(games.filter((_, idx) => idx !== indexToRemove))
  }

  return (
    <div className="list-field p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="field-label text-cyan-300 font-bold flex items-center gap-1.5 uppercase tracking-wider text-xs">
            <Gamepad2 size={15} /> Available Games Included with System
          </label>
          <p className="text-[11px] text-white/50 font-display">
            Select or type games included with your PS5 (disc or installed digitally). Renters love gaming bundles!
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold">
          {games.length} {games.length === 1 ? 'Game' : 'Games'}
        </span>
      </div>

      {/* Quick 1-Tap Popular Suggestions */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-white/40 uppercase font-semibold block">
          Quick 1-Tap Add (Popular PS5 Titles):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_PS5_GAMES.map((pg) => {
            const isSelected = games.some((g) => g.title.toLowerCase() === pg.title.toLowerCase())
            return (
              <button
                key={pg.title}
                type="button"
                onClick={() => handleTogglePopular(pg)}
                className={`px-2.5 py-1 rounded-lg text-xs font-display flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                }`}
              >
                {isSelected ? <Check size={11} /> : <Plus size={11} />}
                <span>{pg.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom Game Input */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <input
          type="text"
          placeholder="Add custom game (e.g. Elden Ring, Mortal Kombat)..."
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddCustom()
            }
          }}
          className="input-dark text-xs flex-1 py-2"
        />
        <div className="flex gap-2">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="select-dark text-xs py-2 px-2.5 w-28"
          >
            <option value="Digital">⚡ Digital</option>
            <option value="Disc">💿 Disc</option>
          </select>
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customTitle.trim()}
            className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1 disabled:opacity-40"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {/* Selected Games List */}
      {games.length > 0 && (
        <div className="pt-2 border-t border-white/10 space-y-2">
          <span className="text-[10px] text-white/50 uppercase font-semibold block">
            Included in this Rental ({games.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {games.map((g, idx) => (
              <div
                key={`${g.title}-${idx}`}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-cyan-500/30 text-white text-xs flex items-center gap-2 shadow-sm animate-fade-in"
              >
                <span className="flex items-center gap-1 font-semibold">
                  {g.format === 'Disc' ? (
                    <Disc size={11} className="text-amber-400" />
                  ) : (
                    <Zap size={11} className="text-cyan-400" />
                  )}
                  {g.title}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] text-white/60 font-mono">
                  {g.format}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-white/40 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${g.title}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
