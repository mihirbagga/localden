import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ChevronRight, LogOut, User, Shield } from 'lucide-react'
import LogoMark from './LogoMark'
import { useAuth } from '../contexts/AuthContext'

const navLinks = [
  { to: '/',             label: 'Home'         },
  { to: '/browse',       label: 'Browse'       },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/list-item',    label: 'List Gear'    },
]

function NavbarAuth() {
  const { isAuthenticated, profile, signOut, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)

  if (isAuthenticated) {
    return (
      <div className="hidden md:flex items-center gap-3 relative">
        <Link to="/list-item" className="btn-primary text-sm py-2 px-5">
          + List Gear
        </Link>
        {/* Avatar dropdown */}
        <button onClick={() => setOpen(!open)}
          className="w-9 h-9 rounded-full flex items-center justify-center font-bungee text-sm text-white flex-shrink-0 transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #ff2e6d, #00e5ff)' }}
          aria-label="Open account menu"
          aria-expanded={open}>
          {profile?.full_name?.[0]?.toUpperCase() || <User size={16} />}
        </button>
        {open && (
          <div className="absolute top-12 right-0 glass rounded-2xl p-3 min-w-[180px] z-50"
            style={{ border: '1px solid rgba(255,46,109,0.2)' }}>
            <p className="text-xs font-display px-2 pb-2 mb-2 font-semibold text-white"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {profile?.full_name || 'My Account'}
            </p>
            <Link to="/dashboard"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-display transition-colors hover:bg-white/5 text-white">
              <User size={14} /> My Dashboard
            </Link>
            {isAdmin ? (
              <Link to="/admin"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-display transition-colors hover:bg-white/5 text-white"
                aria-label="Open admin panel">
                <Shield size={14} /> Admin Panel
              </Link>
            ) : null}
            <button onClick={() => { signOut(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-display transition-colors hover:bg-red-500/10"
              style={{ color: '#ff6b9d' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="hidden md:flex items-center gap-3">
      <Link to="/login" className="btn-outline text-sm py-2 px-4">
        Sign In
      </Link>
      <Link to="/signup" className="btn-primary text-sm py-2 px-5">
        Sign Up Free
      </Link>
    </div>
  )
}

export default function Navbar() {
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname }            = useLocation()
  const { isAuthenticated, isAdmin } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(10,10,20,0.92)' : 'rgba(10,10,20,0.3)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: scrolled
          ? '1px solid rgba(255,46,109,0.18)'
          : '1px solid transparent',
        boxShadow: scrolled
          ? '0 2px 30px rgba(255,46,109,0.08), 0 0 0 1px rgba(0,229,255,0.04)'
          : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ───────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <LogoMark size={36} />
            {/* Brand name */}
            <div className="flex items-baseline gap-0">
              <span className="font-bungee text-lg leading-none"
                style={{ color: '#ff2e6d', textShadow: '0 0 12px rgba(255,46,109,0.6)' }}>
                लोकल
              </span>
              <span className="font-bungee text-lg leading-none"
                style={{ color: '#00e5ff', textShadow: '0 0 12px rgba(0,229,255,0.6)' }}>
                &nbsp;Den
              </span>
            </div>
          </Link>

          {/* ── Desktop Links ──────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-250"
                  style={{
                    color:      active ? '#ff2e6d' : 'rgba(255,255,255,0.55)',
                    background: active ? 'rgba(255,46,109,0.08)' : 'transparent',
                    letterSpacing: '0.04em',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'white'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, #ff2e6d, #00e5ff)' }} />
                  )}
                  {label}
                </Link>
              )
            })}
          </div>

          {/* ── CTA (auth-aware) ────────────────────── */}
          <NavbarAuth />

          {/* ── Mobile toggle ──────────────────────── */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ──────────────────────────── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '400px' : '0', opacity: open ? 1 : 0 }}
      >
        <div className="px-4 pb-4 pt-2 space-y-1"
          style={{ borderTop: '1px solid rgba(255,46,109,0.12)' }}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-display font-semibold transition-all duration-200"
              style={{
                color:      pathname === to ? '#ff2e6d' : 'rgba(255,255,255,0.65)',
                background: pathname === to ? 'rgba(255,46,109,0.08)' : 'transparent',
              }}>
              {label}
              <ChevronRight size={14} style={{ opacity: 0.4 }} />
            </Link>
          ))}
          {isAuthenticated ? (
            <Link to="/dashboard"
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-display font-semibold"
              style={{ color: pathname === '/dashboard' ? '#ff2e6d' : 'rgba(255,255,255,0.65)' }}>
              My Dashboard
              <ChevronRight size={14} style={{ opacity: 0.4 }} />
            </Link>
          ) : null}
          {isAdmin ? (
            <Link to="/admin"
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-display font-semibold"
              style={{ color: pathname === '/admin' ? '#ff2e6d' : 'rgba(255,255,255,0.65)' }}
              aria-label="Open admin panel">
              Admin Panel
              <ChevronRight size={14} style={{ opacity: 0.4 }} />
            </Link>
          ) : null}
          <div className="pt-2">
            <Link to="/list-item" className="btn-primary w-full text-sm py-3 text-center block">
              + List Your Gear
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
