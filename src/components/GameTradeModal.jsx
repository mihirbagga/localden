import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Gamepad2, Sparkles, DollarSign, Wallet, ArrowRight,
  ShieldCheck, Check, Repeat,
} from 'lucide-react'
import { calculateGameValuation } from '../lib/gamesMarketService'

const SUGGESTED_TITLES = [
  "Marvel's Spider-Man 2",
  "God of War Ragnarök",
  "EA Sports FC 25",
  "Tekken 8",
  "Elden Ring",
  "The Last of Us Part I",
  "Hogwarts Legacy",
  "Grand Theft Auto V",
  "Gran Turismo 7",
]

export default function GameTradeModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('PS5')
  const [condition, setCondition] = useState('mint') // 'mint' | 'good' | 'disc_only'

  const valuation = useMemo(() => {
    return calculateGameValuation({
      title: title || 'Game Disc',
      platform,
      condition,
    })
  }, [title, platform, condition])

  if (!isOpen) return null

  const handleListOnLocalDen = () => {
    onClose()
    const query = new URLSearchParams({
      cat: 'gaming',
      type: 'Game Disc',
      title: `${title.trim() || 'PlayStation Game Disc'} (${platform} Disc)`,
      rent: String(valuation.recommendedRentPerDay),
      sale: String(valuation.recommendedSalePrice),
    }).toString()
    navigate(`/list-item?${query}`)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-gray-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-cyan-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300">
              <Repeat size={18} />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">Game Valuation &amp; Listing</h2>
              <p className="text-xs text-white/50">Check fair market value and list your disc to rent or sell on LocalDen.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Game Title Input */}
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5 uppercase font-mono">
              Game Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Marvel's Spider-Man 2 or FC 25"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none"
            />
            {/* Quick Pills */}
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] text-white/40 mr-1 self-center">Popular:</span>
              {SUGGESTED_TITLES.slice(0, 5).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTitle(t)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    title.toLowerCase() === t.toLowerCase()
                      ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Platform & Condition row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5 uppercase font-mono">
                Platform
              </label>
              <div className="flex rounded-xl p-1 bg-white/5 border border-white/10">
                {['PS5', 'PS4'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      platform === p
                        ? 'bg-cyan-500 text-gray-950 shadow-md'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {p} Disc
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5 uppercase font-mono">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="mint">✨ Mint (With Original Box)</option>
                <option value="good">👍 Good (Minor Wear)</option>
                <option value="disc_only">📦 Disc Only (No Box)</option>
              </select>
            </div>
          </div>

          {/* Fair Value Recommendation Card */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-pink-950/30 via-purple-950/20 to-cyan-950/30 border border-pink-500/20">
            <span className="text-[10px] uppercase font-mono tracking-wider text-pink-300 block mb-2 font-bold flex items-center gap-1">
              <Sparkles size={12} /> Fair Market Valuation
            </span>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5">
                <span className="text-[10px] text-white/50 block font-mono">Suggested Sale Price</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-bungee text-2xl text-emerald-400">₹{valuation.recommendedSalePrice}</span>
                </div>
                <span className="text-[9px] text-white/40">Outright resale on LocalDen</span>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-pink-500/20 relative overflow-hidden">
                <span className="text-[10px] text-pink-300 block font-mono font-bold">
                  Recommended Daily Rent
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-bungee text-2xl text-pink-400">₹{valuation.recommendedRentPerDay}</span>
                  <span className="text-[10px] text-white/40">/day</span>
                </div>
                <span className="text-[9px] text-pink-200/60">Passive rental income</span>
              </div>
            </div>

            <div className="text-[11px] text-white/60 bg-black/40 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
              <span>Trade-In Den Credits Valuation:</span>
              <strong className="text-cyan-300 font-mono">₹{valuation.denCreditPayout} credits</strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-gray-900/60">
          <button
            type="button"
            onClick={handleListOnLocalDen}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Proceed to List Game (Rent or Sell)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

