import { useState } from 'react'
import {
  X, Gamepad2, Plus, Upload, Sparkles, Tag, DollarSign,
  ShieldCheck, Check, Building2, Flame, MapPin,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { createGameListing, createGamingDeal } from '../lib/gamesMarketService'

const PRESET_COVERS = [
  { name: 'PS5 Disc Generic', url: '/hero/ps5.png' },
  { name: 'GTA 6 Special', url: '/banners/gta6_ps5_setup_800.jpg' },
  { name: "Spider-Man 2", url: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1219/1c7b75d8b43f9a7d3ef5f2a1b9b68cb2f43cf071676f62e8.png' },
  { name: 'God of War Ragnarök', url: 'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png' },
  { name: 'FC 25', url: 'https://image.api.playstation.com/vulcan/ap/rnd/202407/0416/9df713b190f89839b8bc44ca2be1a48c66ba164c0fc8d504.png' },
  { name: 'Tekken 8', url: 'https://image.api.playstation.com/vulcan/ap/rnd/202308/1109/88e89426f8d076d54cf8e3eec1c4c360be1c48483ba68097.png' },
]

export default function AddGameModal({ isOpen, onClose, onGameAdded }) {
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()

  // Mode: 'listing' (user or admin listing a game disc) vs 'deal' (admin posting a store sale deal)
  const [modalMode, setModalMode] = useState('listing')

  // Listing fields
  const [title, setTitle] = useState('')
  const [platform, setPlatform] = useState('PS5')
  const [condition, setCondition] = useState('like_new')
  const [rentPriceDay, setRentPriceDay] = useState('79')
  const [buyPrice, setBuyPrice] = useState('2499')
  const [deposit, setDeposit] = useState('1000')
  const [location, setLocation] = useState('Koramangala, Bengaluru')
  const [cover, setCover] = useState('/hero/ps5.png')
  const [stockQty, setStockQty] = useState('1')
  const [isHubStored, setIsHubStored] = useState(isAdmin)

  // Deal fields (for admin)
  const [dealStore, setDealStore] = useState('PlayStation')
  const [saleName, setSaleName] = useState('Black Friday Mega Sale')
  const [dealOriginalPrice, setDealOriginalPrice] = useState('4999')
  const [dealSalePrice, setDealSalePrice] = useState('1999')
  const [dealStoreUrl, setDealStoreUrl] = useState('https://store.playstation.com')
  const [isBlackFriday, setIsBlackFriday] = useState(true)

  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      showToast('Please sign in first to add a game.', 'error')
      return
    }

    if (!title.trim()) {
      showToast('Game title is required.', 'error')
      return
    }

    setSaving(true)
    try {
      if (modalMode === 'deal' && isAdmin) {
        await createGamingDeal({
          title,
          store: dealStore,
          platform,
          saleName,
          originalPrice: dealOriginalPrice,
          salePrice: dealSalePrice,
          storeUrl: dealStoreUrl,
          cover,
          isBlackFriday,
          genre: 'Action',
        })
        showToast(`Sale deal for ${title} added to Deals Tracker!`, 'success')
      } else {
        await createGameListing(
          {
            title,
            platform,
            condition,
            rentPriceDay,
            buyPrice,
            deposit,
            location,
            cover,
            stockQty,
            fulfillmentType: isHubStored ? 'warehouse' : 'direct',
          },
          user,
          isAdmin
        )
        showToast(`Game disc "${title}" is now live in LocalDen Game Vault!`, 'success')
      }

      onClose()
      if (onGameAdded) onGameAdded()
    } catch (err) {
      showToast(err.message || 'Failed to save game.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-gray-950 border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-gray-900 to-cyan-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Gamepad2 size={18} />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                {modalMode === 'deal' ? 'Add Store Sale Deal' : 'Add Game to LocalDen'}
              </h2>
              <p className="text-xs text-white/50">
                {modalMode === 'deal'
                  ? 'Feature Sony, Steam, Xbox, or Epic Games sale deals'
                  : 'List a physical game disc for other gamers to rent or buy'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector for Admins */}
        {isAdmin && (
          <div className="px-5 pt-3 pb-0 flex gap-2">
            <button
              type="button"
              onClick={() => setModalMode('listing')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                modalMode === 'listing'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
            >
              💿 Physical Game Disc (Rent / Buy)
            </button>
            <button
              type="button"
              onClick={() => setModalMode('deal')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                modalMode === 'deal'
                  ? 'bg-pink-500/20 border-pink-400 text-pink-300'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
            >
              🔥 Store Sale Deal (Sony / Steam / Xbox / Epic)
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Game Title */}
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5 uppercase font-mono">
              Game Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Marvel's Spider-Man 2 or EA Sports FC 25"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {modalMode === 'listing' ? (
            <>
              {/* Platform & Condition row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1.5 uppercase font-mono">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="PS5">PlayStation 5 (PS5)</option>
                    <option value="PS4">PlayStation 4 (PS4)</option>
                    <option value="Xbox">Xbox Series X / One</option>
                    <option value="Switch">Nintendo Switch</option>
                  </select>
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
                    <option value="like_new">✨ Like New (Scratch-Free with Box)</option>
                    <option value="good">👍 Good (Normal Wear, Tested)</option>
                    <option value="fair">🔧 Fair (Disc Only / Scratches)</option>
                  </select>
                </div>
              </div>

              {/* Pricing: Rent & Buy */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Rent / Day (₹) *
                  </label>
                  <input
                    type="number"
                    min="20"
                    required
                    value={rentPriceDay}
                    onChange={(e) => setRentPriceDay(e.target.value)}
                    placeholder="79"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Buy Price (₹)
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="2499"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="1000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Location & Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Hub / City Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Koramangala, Bengaluru"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Hub Fulfillment toggle (admin only) */}
              {isAdmin && (
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHubStored}
                    onChange={(e) => setIsHubStored(e.target.checked)}
                    className="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs text-white/80">
                    Store as Official LocalDen Hub Inventory (Verified & Same-day dispatch)
                  </span>
                </label>
              )}
            </>
          ) : (
            /* Admin Store Deal Form */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Store / Platform
                  </label>
                  <select
                    value={dealStore}
                    onChange={(e) => setDealStore(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="PlayStation">PlayStation Store (Sony)</option>
                    <option value="Steam">Steam (PC)</option>
                    <option value="Xbox">Xbox Store</option>
                    <option value="Epic Games">Epic Games Store</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Sale Name
                  </label>
                  <input
                    type="text"
                    value={saleName}
                    onChange={(e) => setSaleName(e.target.value)}
                    placeholder="e.g. Black Friday Mega Sale"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={dealOriginalPrice}
                    onChange={(e) => setDealOriginalPrice(e.target.value)}
                    placeholder="4999"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                    Sale Price (₹) (0 for Free)
                  </label>
                  <input
                    type="number"
                    required
                    value={dealSalePrice}
                    onChange={(e) => setDealSalePrice(e.target.value)}
                    placeholder="1999"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1 uppercase font-mono">
                  Store Link URL *
                </label>
                <input
                  type="url"
                  required
                  value={dealStoreUrl}
                  onChange={(e) => setDealStoreUrl(e.target.value)}
                  placeholder="https://store.playstation.com/..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-red-950/20 border border-red-500/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBlackFriday}
                  onChange={(e) => setIsBlackFriday(e.target.checked)}
                  className="rounded bg-black/40 border-red-500/40 text-red-500 focus:ring-0"
                />
                <span className="text-xs text-red-200 font-bold flex items-center gap-1">
                  <Flame size={12} className="text-red-400" />
                  Tag as Black Friday Major Sale
                </span>
              </label>
            </>
          )}

          {/* Cover Art selection */}
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5 uppercase font-mono">
              Game Cover Artwork URL
            </label>
            <input
              type="text"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://image.api.playstation.com/... or /hero/ps5.png"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none font-mono"
            />
            {/* Quick Cover Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-white/40 mr-1 self-center">Presets:</span>
              {PRESET_COVERS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setCover(p.url)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                    cover === p.url
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-white/10 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-2 py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-400 hover:to-cyan-400 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Publishing…' : modalMode === 'deal' ? 'Publish Sale Deal' : 'Publish Game Disc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

