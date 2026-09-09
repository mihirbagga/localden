import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Gamepad2, Music, ChevronRight, Shield, Star, Zap,
  ArrowRight, CheckCircle, MapPin
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import { supabase } from '../lib/supabase'

/* ── Animated Counter ─────────────────────────────── */
function Counter({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref     = useRef(null)
  const started = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const step = end / (duration / 16)
        let cur = 0
        const t = setInterval(() => {
          cur = Math.min(cur + step, end)
          setCount(Math.floor(cur))
          if (cur >= end) clearInterval(t)
        }, 16)
      }
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [end, duration])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ── How It Works Step ────────────────────────────── */
function Step({ num, icon, title, desc, color, isLast }) {
  return (
    <div className="relative flex flex-col items-center text-center group">
      {!isLast && (
        <div className="hidden lg:block absolute top-8 left-[calc(50%+44px)] right-[calc(-50%+44px)] h-px"
          style={{ background: 'linear-gradient(90deg, rgba(255,46,109,0.5), rgba(0,229,255,0.5))' }} />
      )}
      <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${color}25, ${color}10)`,
          border:     `1px solid ${color}40`,
          boxShadow:  `0 0 20px ${color}18`,
        }}>
        <div style={{ color }}>{icon}</div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center font-bungee text-xs text-white"
          style={{ background: `linear-gradient(135deg, #ff2e6d, #00e5ff)` }}>
          {num}
        </div>
      </div>
      <h3 className="font-display font-bold text-lg text-white mb-2">{title}</h3>
      <p className="text-sm leading-relaxed max-w-[200px]"
        style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
    </div>
  )
}

/* ── Category Card ────────────────────────────────── */
function CategoryCard({ emoji, label, count, color, gradient, to, desc }) {
  const [hov, setHov] = useState(false)
  return (
    <Link to={to}
      className="relative block rounded-3xl overflow-hidden p-8 group"
      style={{
        background:  hov ? gradient : 'rgba(14,14,28,0.8)',
        border:      `1px solid ${hov ? color + '50' : 'rgba(255,255,255,0.06)'}`,
        boxShadow:   hov ? `0 30px 80px ${color}28, 0 0 0 1px ${color}18` : 'none',
        transform:   hov ? 'translateY(-8px)' : 'none',
        transition:  'all 0.35s cubic-bezier(0.22,1,0.36,1)',
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(ellipse at 30% 30%, ${color}12, transparent 70%)` }} />

      <div className="relative z-10">
        <div className="text-7xl mb-5 transition-transform duration-500 select-none"
          style={{
            transform: hov ? 'scale(1.18) rotate(8deg)' : 'scale(1)',
            filter:    `drop-shadow(0 0 24px ${color}80)`,
          }}>
          {emoji}
        </div>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bungee text-2xl text-white" style={{ lineHeight: 1.2 }}>{label}</h3>
          <ArrowRight size={20} className="mt-1 transition-transform duration-300 group-hover:translate-x-1"
            style={{ color: color + '80' }} />
        </div>
        <p className="text-sm mb-5 font-display" style={{ color: 'rgba(255,255,255,0.45)' }}>{desc}</p>
        <div className="flex items-center gap-2">
          <span className="font-bungee text-2xl" style={{ color }}>{count}+</span>
          <span className="text-sm font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>
            listings in Bangalore
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Trust Badge ──────────────────────────────────── */
function TrustBadge({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 glass rounded-2xl px-5 py-4">
      <div style={{ color: '#00e5ff' }}>{icon}</div>
      <div>
        <div className="text-xs font-bold text-white font-display">{value}</div>
        <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════ */
export default function Home() {
  const [featured, setFeatured]         = useState([])
  const [loadingFeatured, setLoading]   = useState(true)
  const [stats, setStats]               = useState({ total: 0, gaming: 0, music: 0, listers: 0 })

  useEffect(() => {
    // Fetch featured listings (6 newest available)
    supabase
      .from('listings')
      .select('*, profiles(full_name, rating, kyc_status)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setFeatured(data || [])
        setLoading(false)
      })

    // Fetch live stats
    Promise.all([
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('is_available', true),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('category', 'gaming').eq('is_available', true),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('category', 'music').eq('is_available', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_lister', true),
    ]).then(([total, gaming, music, listers]) => {
      setStats({
        total:   total.count   || 0,
        gaming:  gaming.count  || 0,
        music:   music.count   || 0,
        listers: listers.count || 0,
      })
    })
  }, [])

  return (
    <div className="relative">
      {/* Grid floor */}
      <div className="grid-floor" />
      <GameBackground />

      {/* ══ HERO ══════════════════════════════════ */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-20">

        {/* Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-display font-bold"
          style={{
            background: 'rgba(255,46,109,0.08)',
            border:     '1px solid rgba(255,46,109,0.25)',
            color:      '#ff6b9d',
            letterSpacing: '0.08em',
          }}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          🎮 GAMING &amp; 🎵 MUSIC RENTALS · BANGALORE
        </div>

        {/* Headline */}
        <h1 className="font-bungee leading-none mb-6"
          style={{ fontSize: 'clamp(2.8rem, 8vw, 6rem)' }}>
          <span className="block text-white neon-headline">लोकल Den</span>
          <span className="block gradient-text" style={{ fontSize: '55%', marginTop: 8, letterSpacing: '0.04em' }}>
            Rent. Play. Earn. Repeat.
          </span>
        </h1>

        {/* Sub */}
        <p className="max-w-xl mx-auto text-lg mb-10 font-display"
          style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
          Bangalore's first P2P marketplace to rent{' '}
          <strong style={{ color: '#ff2e6d' }}>gaming consoles</strong> &amp;{' '}
          <strong style={{ color: '#00e5ff' }}>music instruments</strong>{' '}
          from real people. Affordable, verified, doorstep delivery.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link to="/browse" className="btn-primary text-base px-8 py-4">
            <Gamepad2 size={18} /> Browse Gear <ChevronRight size={15} />
          </Link>
          <Link to="/list-item" className="btn-secondary text-base px-8 py-4">
            <Music size={18} /> List Your Item
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-3">
          <TrustBadge icon={<Shield size={16}/>} value="KYC Verified"      label="All renters verified" />
          <TrustBadge icon={<Star size={16}/>}   value="4.9★ Avg Rating"   label="200+ completed rentals" />
          <TrustBadge icon={<Zap size={16}/>}    value="Same-day Delivery" label="Across Bangalore" />
        </div>
      </section>

      {/* ══ STATS ══════════════════════════════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { end: Math.max(stats.total,   1),  suffix: '+', label: 'Active Listings',   color: '#ff2e6d' },
            { end: Math.max(stats.listers, 1),  suffix: '+', label: 'Verified Listers',  color: '#00e5ff' },
            { end: 200,                          suffix: '+', label: 'Rentals Completed', color: '#ffd23f' },
            { end: 4.9,                          suffix: '★', label: 'Average Rating',    color: '#00ff94' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="font-bungee text-4xl mb-1" style={{ color: s.color }}>
                <Counter end={s.end} suffix={s.suffix} />
              </div>
              <div className="text-sm font-display" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CATEGORIES ═════════════════════════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label mb-3">What We Offer</p>
            <h2 className="font-bungee text-4xl text-white">
              Two Categories.{' '}
              <span className="gradient-text">Endless Fun.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <CategoryCard emoji="🎮" label="Gaming Gear" count={Math.max(stats.gaming, 1)} color="#ff2e6d"
              gradient="linear-gradient(135deg, rgba(255,46,109,0.14), rgba(0,229,255,0.04))"
              to="/browse?cat=gaming"
              desc="PS5, Xbox, Nintendo Switch, VR Headsets, Controllers, Racing Wheels and more." />
            <CategoryCard emoji="🎸" label="Music Gear" count={Math.max(stats.music, 1)} color="#00e5ff"
              gradient="linear-gradient(135deg, rgba(0,229,255,0.12), rgba(255,46,109,0.04))"
              to="/browse?cat=music"
              desc="Guitars, Pianos, Synths, Drum Kits, DJ Controllers, Mics, Amplifiers and more." />
          </div>
        </div>
      </section>

      {/* ══ FEATURED ════════════════════════════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="section-label mb-3">Hot Right Now</p>
              <h2 className="font-bungee text-4xl text-white">
                Featured <span className="gradient-text">Listings</span>
              </h2>
            </div>
            <Link to="/browse" className="btn-outline hidden sm:flex">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {/* Loading skeletons */}
          {loadingFeatured && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(14,14,28,0.85)', border: '1px solid rgba(255,255,255,0.06)', height: 300 }}>
                  <div className="h-44 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <div className="p-4 space-y-3">
                    <div className="h-4 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', width: '70%' }} />
                    <div className="h-3 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Real listings */}
          {!loadingFeatured && featured.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}

          {/* Empty state — no listings yet */}
          {!loadingFeatured && featured.length === 0 && (
            <div className="text-center py-16 glass rounded-3xl">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="font-bungee text-2xl text-white mb-2">Be the First!</h3>
              <p className="font-display mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                No listings yet — list your gear and start Bangalore's rental revolution.
              </p>
              <Link to="/list-item" className="btn-primary inline-flex">+ List Your Gear</Link>
            </div>
          )}

          <div className="text-center mt-8 sm:hidden">
            <Link to="/browse" className="btn-outline inline-flex">
              View All <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Simple Process</p>
            <h2 className="font-bungee text-4xl text-white">
              How It <span className="gradient-text">Works</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <Step num="01" color="#ff2e6d" title="Browse"  isLast={false}
              icon={<Gamepad2 size={28}/>}
              desc="Find gaming or music gear near you in Bangalore" />
            <Step num="02" color="#00e5ff" title="Book"    isLast={false}
              icon={<Zap size={28}/>}
              desc="Pick dates, pay securely with UPI or card" />
            <Step num="03" color="#ffd23f" title="Play"    isLast={false}
              icon={<Music size={28}/>}
              desc="Get it delivered or pick up from the lister" />
            <Step num="04" color="#00ff94" title="Earn"    isLast={true}
              icon={<Star size={28}/>}
              desc="List your own gear and earn passive income" />
          </div>
        </div>
      </section>

      {/* ══ EARN CTA ════════════════════════════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-border p-10 text-center">
            <div className="text-6xl mb-5">💰</div>
            <p className="section-label mb-4">For Console &amp; Instrument Owners</p>
            <h2 className="font-bungee text-4xl text-white mb-4">
              Your Gear is{' '}
              <span className="gradient-text">Sitting Idle.</span>
            </h2>
            <p className="text-lg mb-8 font-display"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              Earn{' '}
              <strong style={{ color: '#ffd23f' }}>₹5,000–₹15,000/month</strong>{' '}
              by renting your unused PS5, Guitar, or any gear to verified Bangaloreans.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {[
                'Free listing — always',
                'You keep 80% of revenue',
                '₹10,000 deposit protection',
                'KYC-verified renters only',
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm font-display"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <CheckCircle size={14} style={{ color: '#00ff94', flexShrink: 0 }} /> {f}
                </div>
              ))}
            </div>

            <Link to="/list-item" className="btn-primary text-lg px-10 py-4 inline-flex">
              <MapPin size={18} /> List My Gear in Bangalore
            </Link>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ════════════════════════════ */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Real People, Real Stories</p>
            <h2 className="font-bungee text-4xl text-white">
              What They <span className="gradient-text">Say</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Arjun S', area: 'Koramangala', emoji: '🎮', role: 'Lister',
                quote: "My PS5 earns me ₹8,000 every month while I'm at work. Best decision ever." },
              { name: 'Priya K', area: 'Indiranagar',  emoji: '🎸', role: 'Renter',
                quote: "Rented a Fender Strat for my college jam. Perfect condition, delivered on time!" },
              { name: 'Rohan M', area: 'HSR Layout',   emoji: '🥁', role: 'Lister',
                quote: "My drum kit pays for itself. Got 6 bookings in the first month. So easy." },
            ].map((t, i) => (
              <div key={i} className="glass rounded-2xl p-6 card-hover">
                <div className="flex items-center gap-1 mb-4">
                  {Array(5).fill(0).map((_, j) => (
                    <Star key={j} size={13} style={{ fill: '#ffd23f', color: '#ffd23f' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-6 italic font-display"
                  style={{ color: 'rgba(255,255,255,0.6)' }}>
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'rgba(255,46,109,0.1)', border: '1px solid rgba(255,46,109,0.2)' }}>
                    {t.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white font-display">{t.name}</div>
                    <div className="text-xs font-display" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {t.role} · {t.area}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
