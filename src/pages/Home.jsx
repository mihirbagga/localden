import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Gamepad2, Music, ChevronRight, Shield, Star, Leaf, Wallet,
  ArrowRight, MapPin, Search, CalendarDays, ChevronsDown,
} from 'lucide-react'
import GameBackground from '../components/GameBackground'
import ListingCard from '../components/ListingCard'
import { supabase } from '../lib/supabase'
import { usePlatformFee } from '../hooks/usePlatformFee'
import { platformFeeCopy } from '../lib/platformFee'
import { shiftIso, todayIso } from '../lib/bookingDates'
import './home.css'

const AREAS = ['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield', 'BTM Layout']
const ALL_AREAS = ['Bangalore', ...AREAS, 'Marathahalli', 'Electronic City', 'Jayanagar']

const HERO_GEAR = [
  { src: '/hero/guitar.png', className: 'is-guitar' },
  { src: '/hero/vr.png', className: 'is-vr' },
  { src: '/hero/dj.png', className: 'is-dj' },
  { src: '/hero/ps5.png', className: 'is-ps5' },
  { src: '/hero/xbox.png', className: 'is-xbox' },
  { src: '/hero/mic.png', className: 'is-mic' },
]

const LANES = [
  {
    to: '/browse?cat=gaming&sub=Console',
    kicker: 'Play',
    title: 'Consoles',
    desc: 'PS5, Xbox, Switch — FIFA night without the ₹50k hit.',
    photo: '/hero/xbox-pack.png',
    tone: 'magenta',
    items: ['PS5', 'Xbox', 'Switch'],
  },
  {
    to: '/browse?cat=gaming&sub=VR Headset',
    kicker: 'Immerse',
    title: 'VR & racing',
    desc: 'Headsets, wheels, chairs. Host the whole squad.',
    photo: '/hero/vr.png',
    tone: 'gold',
    items: ['VR', 'Wheel', 'Chair'],
  },
  {
    to: '/browse?cat=music&sub=Guitar',
    kicker: 'Jam',
    title: 'Guitars',
    desc: 'One song or a full set. Borrow the axe, not the EMI.',
    photo: '/hero/guitar.png',
    tone: 'cyan',
    items: ['Guitar', 'Bass', 'Amp'],
  },
  {
    to: '/browse?cat=music&sub=DJ Controller',
    kicker: 'Stage',
    title: 'DJ & keys',
    desc: 'Controllers, mics, keys. Farewell, house party, gig.',
    photo: '/hero/dj.png',
    tone: 'green',
    items: ['DJ', 'Mic', 'Keys'],
  },
]

const STEPS = [
  { n: '01', title: 'Pick the night', desc: 'Area + dates. Grey days on listings are already taken.' },
  { n: '02', title: 'Book & KYC', desc: 'Coupon, UPI / QR / wallet. Verified people only.' },
  { n: '03', title: 'Handover', desc: 'Pickup or drop. Check-in photos. Play.' },
  { n: '04', title: 'Return & earn', desc: 'Check-out. Deposit back. Idle gear can list next.' },
]

const QUOTES = [
  { name: 'Arjun S', area: 'Koramangala', role: 'Lister', quote: 'My PS5 earns extra every month while I am at work.' },
  { name: 'Priya K', area: 'Indiranagar', role: 'Renter', quote: 'DDJ-400 for college farewell. On time, mint.' },
  { name: 'Rohan M', area: 'HSR Layout', role: 'Renter', quote: 'Full GTA night. Next time I list my Switch.' },
]

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

function Planner() {
  const navigate = useNavigate()
  const today = todayIso()
  const [area, setArea] = useState('Bangalore')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(shiftIso(today, 2))

  const go = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (area && area !== 'Bangalore') params.set('loc', area)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    try {
      sessionStorage.setItem('ldPlan', JSON.stringify({ loc: area, from, to }))
    } catch { /* ignore */ }
    navigate(`/browse?${params.toString()}`)
  }

  return (
    <form className="home-plan" onSubmit={go} aria-label="Plan a rental">
      <label className="home-plan__cell">
        <MapPin size={14} aria-hidden="true" />
        <span>Area</span>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          aria-label="Bangalore area"
        >
          {ALL_AREAS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="home-plan__cell">
        <CalendarDays size={14} aria-hidden="true" />
        <span>From</span>
        <input type="date" value={from} min={today} onChange={(e) => {
          setFrom(e.target.value)
          if (to && to <= e.target.value) setTo(shiftIso(e.target.value, 1))
        }} aria-label="Rental start date" />
      </label>
      <label className="home-plan__cell">
        <CalendarDays size={14} aria-hidden="true" />
        <span>To</span>
        <input type="date" value={to} min={from || today} onChange={(e) => setTo(e.target.value)} aria-label="Rental end date" />
      </label>
      <button type="submit" className="btn-primary home-plan__go" aria-label="Find gear for these dates">
        <Search size={16} /> Find gear
      </button>
    </form>
  )
}

export default function Home() {
  const { fee } = usePlatformFee()
  const [featured, setFeatured] = useState([])
  const [loadingFeatured, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, gaming: 0, music: 0, listers: 0 })
  const [path, setPath] = useState('rent')
  const [featFilter, setFeatFilter] = useState('all')

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

  const visibleFeatured = useMemo(() => {
    if (featFilter === 'all') return featured
    return featured.filter((row) => row.category === featFilter)
  }, [featured, featFilter])

  return (
    <div className="home">
      <div className="grid-floor" />
      <GameBackground />

      <section className="home-hero">
        <div className="home-rings" aria-hidden="true" />
        <div className="home-orbit" aria-hidden="true">
          {HERO_GEAR.map((item) => (
            <div key={item.className} className={`home-float ${item.className}`}>
              <img src={item.src} alt="" />
            </div>
          ))}
        </div>

        <div className="home-hero__copy">
          <h1 className="home-title">
            Own the <em>night</em>.
            <span>Rent the gear.</span>
          </h1>

          <div className="home-pills" aria-label="Why rent">
            <span><Leaf size={12} /> Kind on the planet</span>
            <span><Wallet size={12} /> Kinder on the pocket</span>
          </div>

          <p className="home-lead">
            Peer-to-peer <strong className="magenta">consoles</strong> and{' '}
            <strong className="cyan">instruments</strong> across Bangalore.
            KYC, calendar, photos at handover.
          </p>

          <Planner />

          <div className="home-paths" role="tablist" aria-label="Choose a path">
            <button
              type="button"
              className={`home-path is-rent${path === 'rent' ? ' is-on' : ''}`}
              role="tab"
              aria-selected={path === 'rent'}
              onClick={() => setPath('rent')}
            >
              I want to rent
            </button>
            <button
              type="button"
              className={`home-path is-earn${path === 'earn' ? ' is-on' : ''}`}
              role="tab"
              aria-selected={path === 'earn'}
              onClick={() => setPath('earn')}
            >
              I want to earn
            </button>
          </div>

          <div className="home-cta">
            {path === 'rent' ? (
              <Link to="/browse" className="btn-primary" aria-label="Browse gear">
                <Gamepad2 size={18} /> Browse the Den <ChevronRight size={15} />
              </Link>
            ) : (
              <Link to="/list-item" className="btn-primary" aria-label="List your gear">
                <Music size={18} /> List idle gear <ChevronRight size={15} />
              </Link>
            )}
            <Link to="/how-it-works" className="btn-outline">How it works</Link>
          </div>
        </div>

        <div className="home-lanes" id="lanes">
          {LANES.map((lane) => (
            <Link key={lane.title} to={lane.to} className={`home-lane is-${lane.tone}`} aria-label={`Browse ${lane.title}`}>
              <p className="home-lane__kicker">{lane.kicker}</p>
              <h3>{lane.title}</h3>
              <p>{lane.desc}</p>
              <ul>
                {lane.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="home-lane__shot">
                <img src={lane.photo} alt="" />
              </div>
            </Link>
          ))}
        </div>

        <div className="home-areas" aria-label="Browse by area">
          {AREAS.map((area) => (
            <Link key={area} to={`/browse?loc=${encodeURIComponent(area)}`} className="home-chip" aria-label={`Browse ${area}`}>
              <MapPin size={12} /> {area}
            </Link>
          ))}
        </div>

        <a href="#store" className="home-scroll" aria-label="Scroll to live listings">
          Scroll <ChevronsDown size={14} />
        </a>
      </section>

      <section className="home-section home-section--tight">
        <div className="home-stats">
          <div className="stat-card home-stat is-magenta">
            <div className="font-bungee text-4xl mb-1"><Counter end={Math.max(stats.total, 1)} suffix="+" /></div>
            <p>Live listings</p>
          </div>
          <div className="stat-card home-stat is-cyan">
            <div className="font-bungee text-4xl mb-1"><Counter end={Math.max(stats.listers, 1)} suffix="+" /></div>
            <p>Verified listers</p>
          </div>
          <div className="stat-card home-stat is-gold">
            <div className="font-bungee text-4xl mb-1"><Counter end={187} /></div>
            <p>Weekends hosted</p>
          </div>
          <div className="stat-card home-stat is-green">
            <div className="font-bungee text-4xl mb-1"><Counter end={4.9} suffix="★" decimals={1} /></div>
            <p>Community rating</p>
          </div>
        </div>
      </section>

      <section className="home-section" id="store">
        <div className="home-feat-wrap">
          <div className="home-feat-head">
            <div>
              <p className="section-label mb-3">In the Den now</p>
              <h2>Gear you can <span className="gradient-text">hold tonight</span></h2>
            </div>
            <div className="home-feat-tabs" role="tablist" aria-label="Filter featured listings">
              {['all', 'gaming', 'music'].map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`home-chip${featFilter === id ? ' is-on' : ''}`}
                  onClick={() => setFeatFilter(id)}
                  aria-pressed={featFilter === id}
                >
                  {id === 'all' ? 'All' : id === 'gaming' ? '🎮 Gaming' : '🎸 Music'}
                </button>
              ))}
              <Link to="/browse" className="home-chip">View all</Link>
            </div>
          </div>

          {loadingFeatured ? (
            <div className="home-feat-grid">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="home-skel" />)}
            </div>
          ) : null}

          {!loadingFeatured && visibleFeatured.length > 0 ? (
            <div className="home-feat-grid">
              {visibleFeatured.map((row) => <ListingCard key={row.id} listing={row} />)}
            </div>
          ) : null}

          {!loadingFeatured && visibleFeatured.length === 0 ? (
            <div className="home-empty">
              <div className="text-6xl" aria-hidden="true">🎮</div>
              <h3>Nothing live yet</h3>
              <p>Be first in Bangalore. List a console or a guitar.</p>
              <Link to="/list-item" className="btn-primary">+ List Your Gear</Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <p className="section-label mb-3">Four beats</p>
          <h2>How the <span className="gradient-text">Den works</span></h2>
        </div>
        <div className="home-beats">
          {STEPS.map((item) => (
            <article key={item.n} className="home-beat">
              <span>{item.n}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
        <div className="home-beats__more">
          <Link to="/how-it-works" className="btn-outline">
            Full walkthrough <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="home-earn">
          <p className="section-label">For owners</p>
          <h2>Your gear is <span className="gradient-text">sitting idle.</span></h2>
          <p>{platformFeeCopy(fee)} Deposit stays on the booking. Wallet pays out after return.</p>
          <div className="home-cta is-center">
            <Link to="/list-item" className="btn-primary" aria-label="List my gear in Bangalore">
              <MapPin size={16} /> List My Gear
            </Link>
            <Link to="/dashboard?tab=wallet" className="btn-outline">See wallet</Link>
          </div>
        </div>
      </section>

      <section className="home-section home-section--last">
        <div className="home-section__head">
          <p className="section-label mb-3">From the floor</p>
          <h2>What they <span className="gradient-text">played</span></h2>
        </div>
        <div className="home-quotes">
          {QUOTES.map((item) => (
            <blockquote key={item.name} className="home-quote">
              <div className="home-quote__stars" aria-hidden="true">
                <Star size={12} /><Star size={12} /><Star size={12} /><Star size={12} /><Star size={12} />
              </div>
              <p>“{item.quote}”</p>
              <footer>
                <strong>{item.name}</strong> · {item.role} · {item.area}
              </footer>
            </blockquote>
          ))}
        </div>
        <div className="home-trust-row">
          <div className="home-trust-card">
            <Shield size={16} />
            <div><strong>KYC first</strong><span>No anonymous bookings</span></div>
          </div>
          <div className="home-trust-card">
            <Star size={16} />
            <div><strong>Photos both ways</strong><span>Check-in and check-out</span></div>
          </div>
          <div className="home-trust-card">
            <MapPin size={16} />
            <div><strong>Bangalore local</strong><span>Pickup or drop</span></div>
          </div>
        </div>
      </section>
    </div>
  )
}
