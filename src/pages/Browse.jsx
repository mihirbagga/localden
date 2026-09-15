import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, Gamepad2, Music, X, RefreshCw, AlertCircle, LayoutGrid, List } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import { useListings } from '../hooks/useListings'

const LOCATIONS    = ['All Locations','Koramangala','Indiranagar','HSR Layout','Whitefield','BTM Layout','Marathahalli','Electronic City','Jayanagar','Sadashivanagar','Malleshwaram','Hebbal']
const SORT_OPTIONS = ['Newest','Price: Low to High','Price: High to Low','Top Rated']
const GAMING_SUBS  = ['All','Console','Controller','VR Headset','Gaming Mouse','Racing Wheel','Gaming Chair','Monitor','Headset']
const MUSIC_SUBS   = ['All','Guitar','Bass','Piano / Keyboard','Drums','DJ Controller','Microphone','Amplifier','Synthesizer','Violin','Saxophone']

export default function Browse() {
  const [params] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(params.get('cat') || 'all')
  const [activeSub, setActiveSub]     = useState('All')
  const [location, setLocation]       = useState('All Locations')
  const [sortBy, setSortBy]           = useState('Newest')
  const [search, setSearch]           = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [maxPrice, setMaxPrice]       = useState(1000)
  const [viewMode, setViewMode]       = useState('grid') // 'grid' | 'list'

  useEffect(() => {
    const cat = params.get('cat')
    const loc = params.get('loc')
    const sub = params.get('sub')
    const q = params.get('q')
    if (cat) setActiveCategory(cat)
    if (loc && LOCATIONS.includes(loc)) setLocation(loc)
    if (sub) setActiveSub(sub)
    if (q) setSearch(q)
  }, [params])

  /* ── Real data from Supabase ────────────────── */
  const { listings, loading, error } = useListings({
    category: activeCategory,
    location: location !== 'All Locations' ? location : undefined,
    search:   search || undefined,
    maxPrice,
    sortBy,
  })

  /* ── Client-side subcategory filter ────────── */
  const filtered = useMemo(() => {
    if (activeSub === 'All') return listings
    return listings.filter(l => l.subcategory === activeSub)
  }, [listings, activeSub])

  const subcats = activeCategory === 'gaming' ? GAMING_SUBS
    : activeCategory === 'music'  ? MUSIC_SUBS
    : ['All']

  /* ── Active filter chips data ─────────────── */
  const activeFilters = [
    activeCategory !== 'all'        && { key: 'cat',      label: activeCategory === 'gaming' ? '🎮 Gaming' : '🎵 Music',  clear: () => { setActiveCategory('all'); setActiveSub('All') } },
    activeSub !== 'All'             && { key: 'sub',      label: activeSub,                                                clear: () => setActiveSub('All') },
    location  !== 'All Locations'  && { key: 'loc',      label: `📍 ${location}`,                                         clear: () => setLocation('All Locations') },
    maxPrice  < 1000                && { key: 'price',    label: `Max ₹${maxPrice}/day`,                                   clear: () => setMaxPrice(1000) },
    search                          && { key: 'search',   label: `"${search}"`,                                            clear: () => setSearch('') },
  ].filter(Boolean)

  /* ── Category button ─────────────────────── */
  const catBtn = (cat, label, icon, color) => {
    const active = activeCategory === cat
    return (
      <button key={cat} onClick={() => { setActiveCategory(cat); setActiveSub('All') }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-bold transition-all duration-300"
        style={{
          background: active ? `linear-gradient(90deg, ${color}22, ${color}10)` : 'var(--surface)',
          border:     `1px solid ${active ? color + '55' : 'var(--border)'}`,
          color:      active ? color : 'var(--text-muted)',
          boxShadow:  active ? `0 0 18px ${color}28` : 'none',
          letterSpacing: '0.04em',
        }}>
        {icon} {label}
      </button>
    )
  }

  return (
    <div className="relative min-h-screen pt-24 pb-20">
      <div className="grid-floor" />
      <GameBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <p className="section-label mb-2">Bangalore's Gear Marketplace</p>
          <div className="flex items-end justify-between">
            <h1 className="font-bungee text-4xl">
              Browse <span className="gradient-text">Listings</span>
            </h1>
            {/* Grid / List toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <button onClick={() => setViewMode('grid')}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{
                  background: viewMode === 'grid' ? 'rgba(255,46,109,0.15)' : 'transparent',
                  color: viewMode === 'grid' ? '#ff2e6d' : 'var(--text-dim)',
                }}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode('list')}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{
                  background: viewMode === 'list' ? 'rgba(255,46,109,0.15)' : 'transparent',
                  color: viewMode === 'list' ? '#ff2e6d' : 'var(--text-dim)',
                }}>
                <List size={16} />
              </button>
            </div>
          </div>
          <p className="font-display mt-1" style={{ color: 'var(--text-dim)' }}>
            {loading ? 'Loading...' : `${filtered.length} items available · Updated live`}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-dim)' }} />
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search PS5, Guitar, Roland, Fender..."
            className="input-dark input-icon-both h-14 text-base"
            aria-label="Search listings" />
          {search && (
            <button type="button" onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-dim)' }}
              aria-label="Clear search">
              <X size={16}/>
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-3 mb-5">
          {catBtn('all',    'All Gear',  <SlidersHorizontal size={14}/>, '#ffd23f')}
          {catBtn('gaming', '🎮 Gaming', <Gamepad2 size={14}/>,          '#ff2e6d')}
          {catBtn('music',  '🎵 Music',  <Music size={14}/>,              '#00e5ff')}
        </div>

        {/* Subcategory chips */}
        {activeCategory !== 'all' && (
          <div className="flex flex-wrap gap-2 mb-5">
            {subcats.map(s => (
              <button key={s} onClick={() => setActiveSub(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-all duration-200"
                style={{
                  background: activeSub === s ? 'rgba(255,46,109,0.15)' : 'var(--surface)',
                  border:     `1px solid ${activeSub === s ? 'rgba(255,46,109,0.4)' : 'var(--border)'}`,
                  color:      activeSub === s ? '#ff6b9d' : 'var(--text-muted)',
                }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Filters row */}
        <div className="flex gap-3 mb-4 items-center overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          <select value={location} onChange={e => setLocation(e.target.value)}
            className="select-dark text-sm h-10 flex-shrink-0" style={{ minWidth: 140 }}>
            {LOCATIONS.map(l => <option key={l}>{l}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="select-dark text-sm h-10 flex-shrink-0" style={{ minWidth: 150 }}>
            {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-display font-semibold transition-all duration-300 flex-shrink-0 whitespace-nowrap"
            style={{
              background: showFilters ? 'rgba(255,46,109,0.12)' : 'var(--surface)',
              border:     `1px solid ${showFilters ? 'rgba(255,46,109,0.35)' : 'var(--border)'}`,
              color:      showFilters ? '#ff6b9d' : 'var(--text-muted)',
            }}>
            <SlidersHorizontal size={14} /> Price
          </button>
          <div className="ml-auto text-sm font-display" style={{ color: 'var(--text-dim)' }}>
            {!loading && `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* ── Active filter chips ─────────────────── */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs font-display" style={{ color: 'var(--text-dim)' }}>Filters:</span>
            {activeFilters.map(f => (
              <button key={f.key} onClick={f.clear}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-semibold transition-all duration-200 group"
                style={{
                  background: 'rgba(255,46,109,0.1)',
                  border:     '1px solid rgba(255,46,109,0.3)',
                  color:      '#ff6b9d',
                }}>
                {f.label}
                <X size={10} className="group-hover:scale-110 transition-transform" />
              </button>
            ))}
            {activeFilters.length > 1 && (
              <button
                onClick={() => { setActiveCategory('all'); setActiveSub('All'); setLocation('All Locations'); setMaxPrice(1000); setSearch('') }}
                className="text-xs font-display transition-colors"
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Price slider */}
        {showFilters && (
          <div className="glass rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-display font-semibold">Max price per day</span>
              <span className="font-bungee text-sm" style={{ color: '#ff2e6d' }}>₹{maxPrice}</span>
            </div>
            <input type="range" min={50} max={1000} step={50} value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full cursor-pointer" style={{ accentColor: '#ff2e6d' }} />
            <div className="flex justify-between text-xs mt-1 font-display"
              style={{ color: 'var(--text-dim)' }}>
              <span>₹50</span><span>₹1,000</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="glass rounded-2xl p-5 mb-6 flex items-center gap-3"
            style={{ border: '1px solid rgba(255,46,109,0.3)' }}>
            <AlertCircle size={18} style={{ color: '#ff6b9d', flexShrink: 0 }} />
            <p className="text-sm font-display" style={{ color: 'var(--text-muted)' }}>
              Could not connect to database. Check your <code>.env.local</code> file.
            </p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className={viewMode === 'grid'
            ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
            : 'space-y-3'}>
            {Array(viewMode === 'grid' ? 8 : 5).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  height: viewMode === 'grid' ? 360 : 84,
                }} />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && filtered.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(l => <ListingCard key={l.id} listing={l} listView />)}
            </div>
          )
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="font-bungee text-2xl mb-2">No listings yet</h3>
            <p className="font-display mb-2" style={{ color: 'var(--text-dim)' }}>
              {activeFilters.length > 0
                ? 'Try adjusting your filters'
                : 'Be the first to list your gear in Bangalore!'}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {activeFilters.length > 0 && (
                <button
                  onClick={() => { setActiveCategory('all'); setActiveSub('All'); setSearch(''); setMaxPrice(1000); setLocation('All Locations') }}
                  className="btn-outline flex items-center gap-2">
                  <RefreshCw size={14} /> Clear all filters
                </button>
              )}
              <a href="/list-item" className="btn-primary">+ List Your Gear</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
