import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Gamepad2, Search, SlidersHorizontal, Sparkles, Plus,
  ShieldCheck, Repeat, ArrowRight, Star, ExternalLink,
  Flame, CheckCircle2, Download, Package, Info, Tag, PlusCircle,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import SEOHead from '../components/SEOHead'
import GameCard from '../components/GameCard'
import DealCard from '../components/DealCard'
import GameTradeModal from '../components/GameTradeModal'
import AddGameModal from '../components/AddGameModal'
import {
  fetchAllMarketGames,
  getSonyFreeGames,
  fetchGamingDeals,
} from '../lib/gamesMarketService'
import { buildWhatsAppLink } from '../lib/whatsappSmsService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const GENRES = [
  'All Genres',
  'Action',
  'Open World',
  'Sports',
  'Shooter',
  'RPG',
  'Fighting',
  'Racing',
]

const PLATFORMS = ['All Platforms', 'PS5', 'PS4', 'Xbox', 'PC']
const STORES = ['All Stores', 'PlayStation', 'Steam', 'Xbox', 'Epic Games', 'Black Friday']

export default function Games() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState(params.get('tab') || 'all') // 'all' | 'rent' | 'buy' | 'deals' | 'free_sony'
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All Genres')
  const [selectedPlatform, setSelectedPlatform] = useState('All Platforms')
  const [selectedStore, setSelectedStore] = useState('All Stores')
  const [sortBy, setSortBy] = useState('Featured')

  const [marketGames, setMarketGames] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  const [tradeModalOpen, setTradeModalOpen] = useState(false)
  const [addGameModalOpen, setAddGameModalOpen] = useState(false)

  // Official scraped Sony free games
  const sonyFreeGames = useMemo(() => getSonyFreeGames(), [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [gamesList, dealsList] = await Promise.all([
        fetchAllMarketGames(),
        fetchGamingDeals(),
      ])
      setMarketGames(gamesList)
      setDeals(dealsList)
    } catch (err) {
      console.warn('Load games data error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Sync tab with URL
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setParams({ tab })
  }

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    let list = deals
    if (selectedStore === 'Black Friday') {
      list = list.filter((d) => d.isBlackFriday)
    } else if (selectedStore !== 'All Stores') {
      list = list.filter((d) => d.store === selectedStore)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        (d.store && d.store.toLowerCase().includes(q)) ||
        (d.saleName && d.saleName.toLowerCase().includes(q))
      )
    }

    return list
  }, [deals, selectedStore, search])

  // Filtered Games
  const filteredGames = useMemo(() => {
    if (activeTab === 'free_sony') {
      let list = sonyFreeGames
      if (search.trim()) {
        const q = search.toLowerCase()
        list = list.filter((g) =>
          g.title.toLowerCase().includes(q) ||
          g.developer.toLowerCase().includes(q) ||
          g.genre.toLowerCase().includes(q)
        )
      }
      if (selectedPlatform !== 'All Platforms') {
        list = list.filter((g) => g.platforms?.includes(selectedPlatform))
      }
      if (selectedGenre !== 'All Genres') {
        list = list.filter((g) => g.genre.toLowerCase().includes(selectedGenre.toLowerCase()))
      }
      return list
    }

    let list = marketGames
    if (activeTab === 'rent') {
      list = list.filter((g) => g.isAvailableForRent !== false && g.rentPriceDay)
    } else if (activeTab === 'buy') {
      list = list.filter((g) => g.isAvailableForBuy !== false && g.buyPrice)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((g) =>
        g.title.toLowerCase().includes(q) ||
        (g.publisher && g.publisher.toLowerCase().includes(q)) ||
        (g.genre && g.genre.toLowerCase().includes(q))
      )
    }

    if (selectedPlatform !== 'All Platforms') {
      list = list.filter((g) => (g.platform || 'PS5').toUpperCase().includes(selectedPlatform.toUpperCase()))
    }

    if (selectedGenre !== 'All Genres') {
      list = list.filter((g) => (g.genre || '').toLowerCase().includes(selectedGenre.toLowerCase()))
    }

    if (sortBy === 'Price: Low to High') {
      list = [...list].sort((a, b) => {
        const pa = activeTab === 'buy' ? a.buyPrice : a.rentPriceDay
        const pb = activeTab === 'buy' ? b.buyPrice : b.rentPriceDay
        return pa - pb
      })
    } else if (sortBy === 'Price: High to Low') {
      list = [...list].sort((a, b) => {
        const pa = activeTab === 'buy' ? a.buyPrice : a.rentPriceDay
        const pb = activeTab === 'buy' ? b.buyPrice : b.rentPriceDay
        return pb - pa
      })
    } else if (sortBy === 'Top Rated') {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0))
    }

    return list
  }, [activeTab, marketGames, sonyFreeGames, search, selectedGenre, selectedPlatform, sortBy])

  // Order actions
  const handleRentGame = (game) => {
    const text = `Hi LocalDen! 🎮 I want to RENT the game disc:
• *Game:* ${game.title}
• *Platform:* ${game.platform || 'PS5'}
• *Daily Rental:* ₹${game.rentPriceDay}/day
• *Deposit:* ₹${game.deposit || 1000}
• *Hub Location:* ${game.hubLocation}

Please confirm readiness for Same-Day Hub Pickup or Doorstep Handover!`

    window.open(buildWhatsAppLink(text), '_blank')
  }

  const handleBuyGame = (game) => {
    const text = `Hi LocalDen! 🎮 I want to BUY pre-owned game disc:
• *Game:* ${game.title}
• *Platform:* ${game.platform || 'PS5'}
• *Buy Price:* ₹${game.buyPrice} (Tested & Scratch-Free)
• *Hub Location:* ${game.hubLocation}

Please send checkout payment link & delivery details!`

    window.open(buildWhatsAppLink(text), '_blank')
  }

  const handleOpenAddGame = () => {
    if (!user) {
      showToast('Please log in to list your games on LocalDen.', 'info')
      navigate('/login?redirect=/games')
      return
    }
    setAddGameModalOpen(true)
  }

  return (
    <div className="relative min-h-screen pt-nav pb-24 text-white">
      <SEOHead
        title="Game Vault & Deals — Rent, Buy, Sell & Major Sales Tracker | LocalDen"
        description="LocalDen Games Hub: Rent top PS5 game discs from ₹59/day, buy verified pre-owned discs, track Black Friday & major sales across PlayStation, Steam, Xbox & Epic, or add your games."
      />
      <div className="grid-floor" />
      <GameBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Hero Section ───────────────────────────── */}
        <div className="mt-4 mb-8 rounded-3xl p-6 sm:p-10 relative overflow-hidden bg-gradient-to-r from-purple-950/40 via-gray-900/60 to-cyan-950/40 border border-white/10 shadow-2xl">
          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <Sparkles size={12} /> LocalDen Game Vault &amp; Live Deals
            </div>
            <h1 className="font-bungee text-3xl sm:text-5xl text-white leading-tight mb-3">
              Rent, Buy, <span className="gradient-text">Sell &amp; Track Deals</span>
            </h1>
            <p className="text-sm sm:text-base text-white/70 leading-relaxed mb-6">
              100% scratch-tested physical PS5 &amp; PS4 discs, plus a real-time aggregator for **Black Friday sales**, **Sony PlayStation discounts**, **Steam specials**, **Xbox sales**, and **Epic Games free weekly drops**.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleOpenAddGame}
                className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2 shadow-lg active:scale-95"
              >
                <PlusCircle size={16} />
                <span>{isAdmin ? '+ Add Game / Sale Deal' : '+ Add / List a Game'}</span>
              </button>

              <button
                type="button"
                onClick={() => setTradeModalOpen(true)}
                className="btn-outline py-2.5 px-4 text-sm flex items-center gap-2 active:scale-95"
              >
                <Repeat size={15} className="text-pink-400" />
                <span>Sell or Trade In a Game</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('deals')}
                className="py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Flame size={15} className="fill-red-400 text-red-400" />
                <span>Black Friday &amp; Store Sales</span>
              </button>
            </div>
          </div>

          {/* Quick value badges */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>Tested &amp; Scratch-Free Discs</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-red-400 shrink-0" />
              <span>Live Sales: Sony · Steam · Xbox · Epic</span>
            </div>
            <div className="flex items-center gap-2">
              <Repeat size={16} className="text-cyan-400 shrink-0" />
              <span>Fair Disc Valuation &amp; Listing</span>
            </div>
            <div className="flex items-center gap-2">
              <Package size={16} className="text-pink-400 shrink-0" />
              <span>Same-Day Hub Delivery</span>
            </div>
          </div>
        </div>

        {/* ── Mode Filter Tabs ────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'All Discs', icon: Gamepad2 },
              { id: 'rent', label: 'Rent Discs', icon: Sparkles },
              { id: 'buy', label: 'Buy Pre-Owned', icon: Tag },
              { id: 'deals', label: '🔥 Sales & Deals (Sony/Steam/Xbox/Epic)', icon: Flame },
              { id: 'free_sony', label: '🆓 Sony Free-to-Play', icon: Download },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === id
                    ? 'bg-gradient-to-r from-pink-500 to-cyan-500 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddGame}
              className="text-xs font-mono font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 py-1.5 px-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 transition-all hover:bg-cyan-500/20"
            >
              <Plus size={13} />
              <span>Add a Game</span>
            </button>
            <button
              type="button"
              onClick={() => setTradeModalOpen(true)}
              className="text-xs font-mono font-bold text-pink-300 hover:text-pink-200 flex items-center gap-1 py-1.5 px-3 rounded-xl bg-pink-500/10 border border-pink-500/30 transition-all hover:bg-pink-500/20"
            >
              <Repeat size={13} />
              <span>Valuation Calculator</span>
            </button>
          </div>
        </div>

        {/* ── Deals Store Pills (Only when activeTab === 'deals') ── */}
        {activeTab === 'deals' && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-950/30 via-purple-950/20 to-blue-950/30 border border-red-500/20">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-red-400 fill-red-400" />
                <h3 className="font-display font-bold text-sm text-white">
                  Multi-Store Live Sales Tracker
                </h3>
              </div>
              <span className="text-xs font-mono text-white/50">
                PlayStation Store · Steam · Xbox Store · Epic Games Store
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {STORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedStore(s)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    selectedStore === s
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-white/5 border-white/10 text-white/65 hover:border-white/20'
                  }`}
                >
                  {s === 'Black Friday' ? '🖤 Black Friday Specials' : s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Search & Filter Controls ───────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'deals'
                  ? 'Search deals by game title or store…'
                  : 'Search by game title, publisher…'
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Platform */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Genre */}
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
          >
            <option>Featured</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Top Rated</option>
          </select>
        </div>

        {/* ── Games / Deals Grid ─────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : activeTab === 'deals' ? (
          /* Deals Grid View */
          filteredDeals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onRentDiscClick={(d) => {
                    handleRentGame({
                      title: d.title,
                      platform: d.platform,
                      rentPriceDay: d.localDenRentDay || 79,
                      deposit: 1000,
                      hubLocation: 'LocalDen Hub, Bengaluru & Gurugram',
                    })
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5">
              <Flame size={48} className="mx-auto text-white/30 mb-3" />
              <h3 className="font-display font-bold text-lg text-white mb-1">
                {deals.length === 0 ? 'No Active Store Deals Tracked' : 'No Deals Found'}
              </h3>
              <p className="text-xs text-white/50 max-w-sm mx-auto mb-4">
                {deals.length === 0
                  ? 'No store sales currently registered in the live tracker.'
                  : 'No active sales match your selected store or search criteria.'}
              </p>
              {deals.length === 0 && isAdmin ? (
                <button
                  type="button"
                  onClick={() => setAddGameModalOpen(true)}
                  className="btn-primary text-xs py-2.5 px-5"
                >
                  + Add Live Store Deal
                </button>
              ) : deals.length > 0 ? (
                <button
                  onClick={() => {
                    setSearch('')
                    setSelectedStore('All Stores')
                  }}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Reset Store Filter
                </button>
              ) : null}
            </div>
          )
        ) : (
          /* Normal Discs or Free Sony Grid View */
          filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isFreeSonyGame={activeTab === 'free_sony'}
                  onRentClick={handleRentGame}
                  onBuyClick={handleBuyGame}
                  onTradeClick={() => setTradeModalOpen(true)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5">
              <Gamepad2 size={48} className="mx-auto text-white/30 mb-3" />
              <h3 className="font-display font-bold text-lg text-white mb-1">
                {activeTab !== 'free_sony' && marketGames.length === 0
                  ? 'No Game Discs Listed Yet'
                  : 'No Games Found'}
              </h3>
              <p className="text-xs text-white/50 max-w-sm mx-auto mb-4">
                {activeTab !== 'free_sony' && marketGames.length === 0
                  ? 'Be the first to list a physical PS5, PS4, or Xbox game disc to rent or sell on LocalDen!'
                  : 'Try adjusting your search query, genre, or platform filter to see available titles.'}
              </p>
              {activeTab !== 'free_sony' && marketGames.length === 0 ? (
                <button
                  type="button"
                  onClick={handleOpenAddGame}
                  className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>List Your Game Disc</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearch('')
                    setSelectedGenre('All Genres')
                    setSelectedPlatform('All Platforms')
                  }}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )
        )}

        {/* ── Innovative Feature Highlights / Suggestion Banner ── */}
        <div className="mt-16 rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-gray-950 via-purple-950/30 to-gray-900 border border-white/10 shadow-2xl">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={14} /> LocalDen Vault Innovations
          </div>
          <h2 className="font-display font-bold text-2xl text-white mb-2">
            Game Smarter with LocalDen
          </h2>
          <p className="text-xs sm:text-sm text-white/60 mb-6 max-w-2xl">
            Why spend ₹4,999 on every new release when you can rotate and trade games on demand?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold mb-3">
                🔄
              </div>
              <h4 className="font-display font-bold text-sm text-white mb-1">P2P Game Swap ("GameTrade")</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Finished playing Spider-Man 2? Swap it with a neighbour's God of War Ragnarok for just ₹49 hub verification fee. Zero cash wasted on new purchases.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold mb-3">
                💎
              </div>
              <h4 className="font-display font-bold text-sm text-white mb-1">Rent-to-Own Guarantee</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Rent any disc for 2 weeks. If you fall in love with it, 100% of your rental payments deduct directly from the buy price so you can keep it forever.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-3">
                ⚡
              </div>
              <h4 className="font-display font-bold text-sm text-white mb-1">PS5 Console + Disc Bundle</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Renting a PS5 console for the weekend? Add any 2 game discs for an extra ₹99/day combo discount. Handed over together in one verified travel bag.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User / Admin Add Game Modal */}
      <AddGameModal
        isOpen={addGameModalOpen}
        onClose={() => setAddGameModalOpen(false)}
        onGameAdded={loadData}
      />

      {/* Trade-in / Sell Game Modal */}
      <GameTradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
      />
    </div>
  )
}
