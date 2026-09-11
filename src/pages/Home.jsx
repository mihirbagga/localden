import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gamepad2, Music, ChevronRight, Shield, Star, Zap, ArrowRight, MapPin,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import { supabase } from '../lib/supabase'
import { usePlatformFee } from '../hooks/usePlatformFee'
import { platformFeeCopy } from '../lib/platformFee'
import './home.css'

const HOOKS = {
  rent: [
    'Weekend FIFA night. No ₹50k console.',
    'Need a guitar for one song? Rent it.',
    'Squad night. We bring the gear.',
  ],
  earn: [
    'Idle PS5? Make it pay rent.',
    'That guitar from 2022 can earn again.',
    'List once. Get booked on weekends.',
  ],
}

const STEPS = [
  { title: 'Browse', desc: 'Gaming or music. Filter by area in Bangalore. Pick dates.' },
  { title: 'Book', desc: 'Pay with QR, UPI, Razorpay, or cash — whatever admin enabled.' },
  { title: 'Play', desc: 'Pickup or delivery. Jam, game, host. Return on time.' },
  { title: 'Earn', desc: 'List your own gear. Verified renters. Deposit on the booking.' },
]

const QUOTES = [
  { name: 'Arjun S', area: 'Koramangala', role: 'Lister', quote: 'My PS5 earns me extra every month while I am at work.' },
  { name: 'Priya K', area: 'Indiranagar', role: 'Renter', quote: 'Rented a DDJ-400 for college farewell. On time, mint condition.' },
  { name: 'Rohan M', area: 'HSR Layout', role: 'Renter', quote: 'Full GTA night. Next time I am listing my own Switch.' },
]

const AREAS = ['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'BTM Layout']

function Counter({ end, suffix = '', duration = 1600, decimals = 0 }) {
  const [count, setCount] = useState(decimals ? Number(end).toFixed(decimals) : 0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return
      started.current = true
      const frames = Math.max(1, Math.round(duration / 16))
      let frame = 0
      const timer = setInterval(() => {
        frame += 1
        const next = (end * frame) / frames
        setCount(decimals ? next.toFixed(decimals) : Math.floor(next))
        if (frame >= frames) clearInterval(timer)
      }, 16)
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [end, duration, decimals])

  return <span ref={ref}>{decimals ? count : Number(count).toLocaleString()}{suffix}</span>
}

export default function Home() {
  const { fee } = usePlatformFee()
  const [featured, setFeatured] = useState([])
  const [loadingFeatured, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, gaming: 0, music: 0, listers: 0 })
  const [path, setPath] = useState('rent')
  const [hook, setHook] = useState(0)
  const [step, setStep] = useState(0)
  const [featFilter, setFeatFilter] = useState('all')
  const [quote, setQuote] = useState(0)

  useEffect(() => {
    supabase
      .from('listings')
      .select('*, profiles(full_name, rating, kyc_status)')
      .eq('is_available', true)
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(9)
      .then(({ data }) => {
        setFeatured(data || [])
        setLoading(false)
      })

    Promise.all([
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('is_available', true).eq('is_published', true),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('category', 'gaming').eq('is_available', true).eq('is_published', true),
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('category', 'music').eq('is_available', true).eq('is_published', true),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_lister', true),
    ]).then(([total, gaming, music, listers]) => {
      setStats({
        total: total.count || 0,
        gaming: gaming.count || 0,
        music: music.count || 0,
        listers: listers.count || 0,
      })
    })
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      setHook((n) => (n + 1) % HOOKS[path].length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [path])

  const visibleFeatured = useMemo(() => {
    if (featFilter === 'all') return featured
    return featured.filter((row) => row.category === featFilter)
  }, [featured, featFilter])

  const currentQuote = QUOTES[quote]
  const currentStep = STEPS[step]

  return (
    <div className="relative">
      <div className="grid-floor" />
      <GameBackground />

      <section className="home-hero">
        <div className="hero-pill inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-display font-bold">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
          Gaming &amp; music rentals · Bangalore
        </div>

        <h1 className="home-title">
          <span className="block text-white neon-headline">लोकल Den</span>
          <span className="home-title__sub gradient-text">Rent. Play. Earn. Repeat.</span>
        </h1>

        <p className="home-hook" aria-live="polite">{HOOKS[path][hook]}</p>

        <p className="home-lead">
          Peer-to-peer <strong className="magenta">consoles</strong> and{' '}
          <strong className="cyan">instruments</strong> from people near you.
          Verified. Affordable. Back for the weekend.
        </p>

        <div className="home-paths" role="tablist" aria-label="Choose a path">
          <button
            type="button"
            className={`home-path is-rent${path === 'rent' ? ' is-on' : ''}`}
            role="tab"
            aria-selected={path === 'rent'}
            onClick={() => { setPath('rent'); setHook(0) }}
          >
            <strong>🎮 I want to rent</strong>
            <span>Find gear for the weekend</span>
          </button>
          <button
            type="button"
            className={`home-path is-earn${path === 'earn' ? ' is-on' : ''}`}
            role="tab"
            aria-selected={path === 'earn'}
            onClick={() => { setPath('earn'); setHook(0) }}
          >
            <strong>💰 I want to earn</strong>
            <span>List idle gear, get booked</span>
          </button>
        </div>

        <div className="home-cta">
          {path === 'rent' ? (
            <Link to="/browse" className="btn-primary" aria-label="Browse gear">
              <Gamepad2 size={18} aria-hidden="true" /> Browse Gear <ChevronRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            <Link to="/list-item" className="btn-primary" aria-label="List your gear">
              <Music size={18} aria-hidden="true" /> List Your Gear <ChevronRight size={15} aria-hidden="true" />
            </Link>
          )}
          <Link to={path === 'rent' ? '/how-it-works' : '/browse'} className="btn-outline" aria-label={path === 'rent' ? 'How it works' : 'See listings'}>
            {path === 'rent' ? 'How it works' : 'See what people rent'}
          </Link>
        </div>

        <div className="home-trust">
          <div className="home-trust-card">
            <Shield size={16} aria-hidden="true" />
            <div><strong>KYC verified</strong><span>Renters checked first</span></div>
          </div>
          <div className="home-trust-card">
            <Star size={16} aria-hidden="true" />
            <div><strong>4.9★ community</strong><span>Two-way reviews</span></div>
          </div>
          <div className="home-trust-card">
            <Zap size={16} aria-hidden="true" />
            <div><strong>Bangalore local</strong><span>Pickup or drop</span></div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-stats">
          <div className="stat-card home-stat is-magenta">
            <div className="font-bungee text-4xl mb-1"><Counter end={Math.max(stats.total, 1)} suffix="+" /></div>
            <p>Active listings</p>
          </div>
          <div className="stat-card home-stat is-cyan">
            <div className="font-bungee text-4xl mb-1"><Counter end={Math.max(stats.listers, 1)} suffix="+" /></div>
            <p>Verified listers</p>
          </div>
          <div className="stat-card home-stat is-gold">
            <div className="font-bungee text-4xl mb-1"><Counter end={187} /></div>
            <p>Rentals completed</p>
          </div>
          <div className="stat-card home-stat is-green">
            <div className="font-bungee text-4xl mb-1"><Counter end={4.9} suffix="★" decimals={1} /></div>
            <p>Average rating</p>
          </div>
        </div>
        <div className="home-areas" aria-label="Browse by area">
          {AREAS.map((area) => (
            <Link key={area} to={`/browse?loc=${encodeURIComponent(area)}`} className="home-chip" aria-label={`Browse ${area}`}>
              <MapPin size={12} aria-hidden="true" /> {area}
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <p className="section-label mb-3">Pick a lane</p>
          <h2>Two categories. <span className="gradient-text">Endless weekends.</span></h2>
        </div>
        <div className="home-cats">
          <Link to="/browse?cat=gaming" className="home-cat home-cat--gaming" aria-label="Browse gaming gear">
            <div className="home-cat__emoji" aria-hidden="true">🎮</div>
            <h3>Gaming Gear</h3>
            <p>PS5, Xbox, Switch, VR, wheels, chairs.</p>
            <strong>{Math.max(stats.gaming, 1)}+</strong>
            <small>listings</small>
          </Link>
          <Link to="/browse?cat=music" className="home-cat home-cat--music" aria-label="Browse music gear">
            <div className="home-cat__emoji" aria-hidden="true">🎸</div>
            <h3>Music Gear</h3>
            <p>Guitars, keys, drums, DJ, mics, amps.</p>
            <strong>{Math.max(stats.music, 1)}+</strong>
            <small>listings</small>
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="home-feat-wrap">
          <div className="home-feat-head">
            <div>
              <p className="section-label mb-3">Hot right now</p>
              <h2>Featured <span className="gradient-text">Listings</span></h2>
            </div>
            <div className="home-feat-tabs" role="tablist" aria-label="Filter featured listings">
              {['all', 'gaming', 'music'].map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`home-chip${featFilter === id ? ' is-on' : ''}`}
                  onClick={() => setFeatFilter(id)}
                  aria-pressed={featFilter === id}
                  aria-label={`Show ${id} listings`}
                >
                  {id === 'all' ? 'All' : id === 'gaming' ? '🎮 Gaming' : '🎸 Music'}
                </button>
              ))}
              <Link to="/browse" className="home-chip" aria-label="View all listings">View all</Link>
            </div>
          </div>

          {loadingFeatured ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="home-skel" />)}
            </div>
          ) : null}

          {!loadingFeatured && visibleFeatured.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleFeatured.map((row) => <ListingCard key={row.id} listing={row} />)}
            </div>
          ) : null}

          {!loadingFeatured && visibleFeatured.length === 0 ? (
            <div className="home-empty">
              <div className="text-6xl" aria-hidden="true">🎮</div>
              <h3>Nothing here yet</h3>
              <p>Be first in this lane. List your gear.</p>
              <Link to="/list-item" className="btn-primary" aria-label="List your gear">+ List Your Gear</Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <p className="section-label mb-3">Simple process</p>
          <h2>How it <span className="gradient-text">works</span></h2>
        </div>
        <div className="home-steps">
          <div className="home-step-dots" role="group" aria-label="Process steps">
            {STEPS.map((item, i) => (
              <button
                key={item.title}
                type="button"
                className={`home-step-dot${step === i ? ' is-on' : ''}`}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}: ${item.title}`}
                aria-current={step === i ? 'step' : undefined}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
          <div className="home-step-card">
            <h3>{currentStep.title}</h3>
            <p>{currentStep.desc}</p>
            <Link to="/how-it-works" className="btn-outline" aria-label="Open full how it works">
              Full walkthrough <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-earn">
          <p className="section-label">For owners</p>
          <h2>Your gear is <span className="gradient-text">sitting idle.</span></h2>
          <p>{platformFeeCopy(fee)} Deposit stays on the booking.</p>
          <Link to="/list-item" className="btn-primary" aria-label="List my gear in Bangalore">
            <MapPin size={16} aria-hidden="true" /> List My Gear
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <p className="section-label mb-3">From the Den</p>
          <h2>What they <span className="gradient-text">say</span></h2>
        </div>
        <div className="home-quotes">
          <div className="home-quote-nav" role="tablist" aria-label="Quotes">
            {QUOTES.map((item, i) => (
              <button
                key={item.name}
                type="button"
                className={`home-step-dot${quote === i ? ' is-on' : ''}`}
                onClick={() => setQuote(i)}
                aria-label={`Quote from ${item.name}`}
                aria-selected={quote === i}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <blockquote className="home-quote">
            <p>“{currentQuote.quote}”</p>
            <footer>
              <strong>{currentQuote.name}</strong> · {currentQuote.role} · {currentQuote.area}
            </footer>
          </blockquote>
        </div>
      </section>
    </div>
  )
}
