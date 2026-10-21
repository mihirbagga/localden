import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, Gamepad2, Music, X, RefreshCw, AlertCircle, LayoutGrid, List, CalendarDays } from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import { useListings } from '../hooks/useListings'
import SEOHead from '../components/SEOHead'
import { supabase } from '../lib/supabase'
import { todayIso, shiftIso, formatDayLabel } from '../lib/bookingDates'
import {
  BENGALURU_LOCALITIES,
  GURUGRAM_LOCALITIES,
  ALL_LOCALITIES,
  getCityForLocation,
} from '../lib/cities'

const LOCATIONS = ['All Locations', 'Bengaluru', ...BENGALURU_LOCALITIES, 'Gurugram', ...GURUGRAM_LOCALITIES]
const SORT_OPTIONS = ['Newest','Price: Low to High','Price: High to Low','Top Rated', 'Most Popular']
const GAMING_SUBS  = ['All','Console','Controller','VR Headset','Gaming Mouse','Racing Wheel','Gaming Chair','Monitor','Headset']
const MUSIC_SUBS   = ['All','Guitar','Bass','Piano / Keyboard','Drums','DJ Controller','Microphone','Amplifier','Synthesizer','Violin','Saxophone']

export default function Browse() {
  const [params] = useSearchParams()
  const today = todayIso()
  const [activeCategory, setActiveCategory] = useState(params.get('cat') || 'all')
  const [activeSub, setActiveSub]     = useState('All')
  const [location, setLocation]       = useState('All Locations')
  const [sortBy, setSortBy]           = useState('Newest')
  const [search, setSearch]           = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [maxPrice, setMaxPrice]       = useState(5000)
  const [viewMode, setViewMode]       = useState('grid') // 'grid' | 'list'
  const [fulfillment, setFulfillment] = useState('All Fulfillment')
  const [inStockOnly, setInStockOnly] = useState(false)

  // Date-wise filtering
  const [fromDate, setFromDate] = useState(() => {
    const f = params.get('from')
    if (f) return f
    try {
      const saved = sessionStorage.getItem('ldPlan')
      if (saved) return JSON.parse(saved).from || ''
    } catch {}
    return ''
  })
  const [toDate, setToDate] = useState(() => {
    const t = params.get('to')
    if (t) return t
    try {
      const saved = sessionStorage.getItem('ldPlan')
      if (saved) return JSON.parse(saved).to || ''
    } catch {}
    return ''
  })
  const [availableOnlyOnDates, setAvailableOnlyOnDates] = useState(true)
  const [bookedListingIds, setBookedListingIds] = useState(new Set())

  useEffect(() => {
    const cat = params.get('cat')
    const loc = params.get('loc')
    const sub = params.get('sub')
    const q = params.get('q')
    const f = params.get('from')
    const t = params.get('to')
    if (cat) setActiveCategory(cat)
    if (loc && LOCATIONS.includes(loc)) setLocation(loc)
    if (sub) setActiveSub(sub)
    if (q) setSearch(q)
    if (f) setFromDate(f)
    if (t) setToDate(t)
  }, [params])

  /* ── Real data from Supabase ────────────────── */
  const isCityFilter = location === 'Bengaluru' || location === 'Gurugram'
  const { listings, loading, error } = useListings({
    category: activeCategory,
    location: (location !== 'All Locations' && !isCityFilter) ? location : undefined,
    maxPrice,
  })

  // Date-wise busy listings calculation
  useEffect(() => {
    if (!fromDate || !toDate || toDate <= fromDate) {
      setBookedListingIds(new Set())
      return
    }

    let cancelled = false
    supabase
      .from('bookings')
      .select('listing_id, start_date, end_date')
      .in('status', ['pending', 'confirmed', 'active'])
      .lt('start_date', toDate)
      .gt('end_date', fromDate)
      .then(({ data, error: bErr }) => {
        if (!cancelled && !bErr && data) {
          const counts = {}
          for (const b of data) {
            if (b.listing_id) {
              counts[b.listing_id] = (counts[b.listing_id] || 0) + 1
            }
          }
          const busyIds = new Set()
          for (const [id, count] of Object.entries(counts)) {
            const l = listings.find((item) => item.id === id)
            const cap = Math.max(1, Number(l?.stock_total || l?.stock_qty || 1))
            if (count >= cap) {
              busyIds.add(id)
            }
          }
          setBookedListingIds(busyIds)
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [fromDate, toDate, listings])

  /* ── Client-side filtering & sorting ────────── */
  const filtered = useMemo(() => {
    let result = listings

    if (location === 'Bengaluru') {
      result = result.filter(l => getCityForLocation(l.location) === 'Bengaluru')
    } else if (location === 'Gurugram') {
      result = result.filter(l => getCityForLocation(l.location) === 'Gurugram')
    } else if (location !== 'All Locations') {
      result = result.filter(l => (l.location || '').toLowerCase().includes(location.toLowerCase()))
    }

    if (activeSub !== 'All') {
      result = result.filter(l => l.subcategory === activeSub)
    }

    if (fulfillment === '🏠 Direct Handover') {
      result = result.filter(l => l.fulfillment_type === 'direct')
    } else if (fulfillment === '🏬 Hub Stored') {
      result = result.filter(l => l.fulfillment_type === 'warehouse')
    }

    if (inStockOnly) {
      result = result.filter(l => l.is_available !== false)
    }

    if (fromDate && toDate && availableOnlyOnDates) {
      result = result.filter(l => !bookedListingIds.has(l.id))
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l => {
        const str = [l.title, l.brand, l.model, l.description, l.subcategory, l.category, l.location]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return str.includes(q)
      })
    }

    const sorted = [...result]
    if (fromDate && toDate && !availableOnlyOnDates) {
      sorted.sort((a, b) => {
        const aBooked = bookedListingIds.has(a.id) ? 1 : 0
        const bBooked = bookedListingIds.has(b.id) ? 1 : 0
        return aBooked - bBooked
      })
    }

    switch (sortBy) {
      case 'Price: Low to High':
        sorted.sort((a, b) => (a.price_day || 0) - (b.price_day || 0)); break
      case 'Price: High to Low':
        sorted.sort((a, b) => (b.price_day || 0) - (a.price_day || 0)); break
      case 'Top Rated':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break
      case 'Most Popular':
        sorted.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0)); break
      case 'Newest':
      default:
        sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break
    }

    return sorted
  }, [listings, activeSub, fulfillment, inStockOnly, fromDate, toDate, availableOnlyOnDates, bookedListingIds, search, sortBy])

  const subcats = activeCategory === 'gaming' ? GAMING_SUBS
    : activeCategory === 'music'  ? MUSIC_SUBS
    : ['All']

  /* ── Active filter chips data ─────────────── */
  const activeFilters = [
    activeCategory !== 'all'        && { key: 'cat',      label: activeCategory === 'gaming' ? '🎮 Gaming' : '🎵 Music',  clear: () => { setActiveCategory('all'); setActiveSub('All') } },
    activeSub !== 'All'             && { key: 'sub',      label: activeSub,                                                clear: () => setActiveSub('All') },
    location  !== 'All Locations'  && { key: 'loc',      label: `📍 ${location}`,                                         clear: () => setLocation('All Locations') },
    (fromDate && toDate)            && { key: 'dates',    label: `📅 ${formatDayLabel(fromDate)} → ${formatDayLabel(toDate)}`, clear: () => { setFromDate(''); setToDate('') } },
    maxPrice  < 5000                && { key: 'price',    label: `Max ₹${maxPrice}/day`,                                   clear: () => setMaxPrice(5000) },
    search                          && { key: 'search',   label: `"${search}"`,                                            clear: () => setSearch('') },
    fulfillment !== 'All Fulfillment' && { key: 'fulfillment', label: fulfillment,                                         clear: () => setFulfillment('All Fulfillment') },
    inStockOnly                     && { key: 'instock',  label: 'In Stock Only',                                          clear: () => setInStockOnly(false) },
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
    <div className="relative min-h-screen pt-nav pb-20">
      <SEOHead title="Browse Listings" description="Find gaming consoles, guitars, DJ equipment and more for rent in Bengaluru and Gurugram. Browse by city, location, category and price." />
      <div className="grid-floor" />
      <GameBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <p className="section-label mb-2">Bengaluru & Gurugram Gear Marketplace</p>
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
          <select
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="select-dark text-sm h-10 flex-shrink-0"
            style={{ minWidth: 175 }}
            aria-label="Filter by City or Location"
          >
            <option value="All Locations">All Cities & Locations</option>
            <optgroup label="🏙️ Bengaluru">
              <option value="Bengaluru">Entire Bengaluru</option>
              {BENGALURU_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </optgroup>
            <optgroup label="🏢 Gurugram (NCR)">
              <option value="Gurugram">Entire Gurugram</option>
              {GURUGRAM_LOCALITIES.map(l => <option key={l} value={l}>{l}</option>)}
            </optgroup>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="select-dark text-sm h-10 flex-shrink-0" style={{ minWidth: 150 }}>
            {SORT_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={fulfillment} onChange={e => setFulfillment(e.target.value)}
            className="select-dark text-sm h-10 flex-shrink-0" style={{ minWidth: 160 }}>
            <option>All Fulfillment</option>
            <option>🏠 Direct Handover</option>
            <option>🏬 Hub Stored</option>
          </select>

          {/* Date range picker */}
          <div
            className="flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-display font-semibold flex-shrink-0"
            style={{
              background: fromDate && toDate ? 'rgba(255,46,109,0.12)' : 'var(--surface)',
              border: `1px solid ${fromDate && toDate ? 'rgba(255,46,109,0.35)' : 'var(--border)'}`,
              color: fromDate && toDate ? '#ff6b9d' : 'var(--text-muted)',
            }}
          >
            <CalendarDays size={14} className="text-white/60" />
            <span className="text-xs text-white/50 hidden sm:inline">From</span>
            <input
              type="date"
              value={fromDate}
              min={today}
              onChange={(e) => {
                const val = e.target.value
                setFromDate(val)
                if (toDate && toDate <= val) setToDate(shiftIso(val, 1))
              }}
              className="bg-transparent text-xs font-display outline-none text-white cursor-pointer"
              aria-label="Rental start date"
            />
            <span className="text-xs text-white/40">→</span>
            <span className="text-xs text-white/50 hidden sm:inline">To</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || today}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-xs font-display outline-none text-white cursor-pointer"
              aria-label="Rental end date"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => { setFromDate(''); setToDate('') }}
                className="text-white/40 hover:text-white ml-1 p-0.5 rounded"
                aria-label="Clear dates"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {fromDate && toDate && (
            <button
              type="button"
              onClick={() => setAvailableOnlyOnDates(!availableOnlyOnDates)}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-display font-semibold flex-shrink-0 transition-all duration-300"
              style={{
                background: availableOnlyOnDates ? 'rgba(0,229,255,0.12)' : 'var(--surface)',
                border: `1px solid ${availableOnlyOnDates ? 'rgba(0,229,255,0.4)' : 'var(--border)'}`,
                color: availableOnlyOnDates ? '#00e5ff' : 'var(--text-muted)',
              }}
            >
              {availableOnlyOnDates ? '✓ Available only' : 'Showing all gear'}
            </button>
          )}

          <button onClick={() => setInStockOnly(!inStockOnly)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-display font-semibold transition-all duration-300 flex-shrink-0 whitespace-nowrap"
            style={{
              background: inStockOnly ? 'rgba(255,46,109,0.12)' : 'var(--surface)',
              border:     `1px solid ${inStockOnly ? 'rgba(255,46,109,0.35)' : 'var(--border)'}`,
              color:      inStockOnly ? '#ff6b9d' : 'var(--text-muted)',
            }}>
            In Stock Only
          </button>
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
                onClick={() => { setActiveCategory('all'); setActiveSub('All'); setLocation('All Locations'); setMaxPrice(5000); setSearch(''); setFulfillment('All Fulfillment'); setInStockOnly(false); setFromDate(''); setToDate(''); }}
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
            <input type="range" min={50} max={5000} step={50} value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full cursor-pointer" style={{ accentColor: '#ff2e6d' }} />
            <div className="flex justify-between text-xs mt-1 font-display"
              style={{ color: 'var(--text-dim)' }}>
              <span>₹50</span><span>₹5,000</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="glass rounded-2xl p-5 mb-6 flex items-center justify-between gap-3 flex-wrap"
            style={{ border: '1px solid rgba(255,46,109,0.3)' }}>
            <div className="flex items-center gap-3">
              <AlertCircle size={18} style={{ color: '#ff6b9d', flexShrink: 0 }} />
              <p className="text-sm font-display" style={{ color: 'var(--text-muted)' }}>
                We had trouble loading the latest catalog. Please check your connection and try refreshing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-outline text-xs py-1.5 px-3"
            >
              Retry
            </button>
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
              {filtered.map(l => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  selectedDates={fromDate && toDate ? { from: fromDate, to: toDate } : null}
                  isBookedForDates={bookedListingIds.has(l.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(l => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  listView
                  selectedDates={fromDate && toDate ? { from: fromDate, to: toDate } : null}
                  isBookedForDates={bookedListingIds.has(l.id)}
                />
              ))}
            </div>
          )
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16 px-4 rounded-3xl max-w-3xl mx-auto mt-8 glass" style={{ border: '1px solid var(--border)' }}>
            <div className="text-5xl mb-5">🔍</div>
            <h3 className="font-bungee text-3xl mb-3">No matching gear right now</h3>
            <p className="font-display mb-8" style={{ color: 'var(--text-muted)' }}>
              We couldn't find gear matching all of your current filters. <br className="hidden sm:block" />
              Try adjusting your dates or location, or jump into a popular category below:
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[
                { icon: '🎮', label: 'PS5 Consoles', query: 'PS5' },
                { icon: '🎸', label: 'Guitars & Amps', query: 'Guitar' },
                { icon: '💻', label: 'RTX 4090 GPUs', query: '4090' },
                { icon: '🥽', label: 'VR Headsets', query: 'VR' },
                { icon: '🎹', label: 'Keyboards & Pianos', query: 'Keyboard' },
                { icon: '🎤', label: 'Microphones', query: 'Microphone' }
              ].map(chip => (
                <button
                  key={chip.label}
                  onClick={() => {
                    setSearch(chip.query);
                    setActiveCategory('all');
                    setActiveSub('All');
                    setLocation('All Locations');
                    setMaxPrice(5000);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-display font-semibold transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,46,109,0.1)'
                    e.currentTarget.style.border = '1px solid rgba(255,46,109,0.4)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--card)'
                    e.currentTarget.style.border = '1px solid var(--border)'
                  }}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {activeFilters.length > 0 && (
                <button
                  onClick={() => { setActiveCategory('all'); setActiveSub('All'); setSearch(''); setMaxPrice(5000); setLocation('All Locations'); setFulfillment('All Fulfillment'); setInStockOnly(false); setFromDate(''); setToDate(''); }}
                  className="btn-outline flex items-center gap-2">
                  <RefreshCw size={14} /> Reset all filters
                </button>
              )}
              <a href="/list-item" className="btn-primary">+ List Your Gear & Earn</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
